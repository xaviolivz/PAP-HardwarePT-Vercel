document.addEventListener('DOMContentLoaded', async function() {
    await carregarCompras();
});

const STATUS_CONFIG = {
    'pendente':    { label: 'Pendente',     cor: '#f59e0b', bg: '#fef3c7' },
    'processando': { label: 'A Processar',  cor: '#3b82f6', bg: '#dbeafe' },
    'enviado':     { label: 'Enviado',      cor: '#8b5cf6', bg: '#ede9fe' },
    'entregue':    { label: 'Entregue',     cor: '#00bfa6', bg: '#ccfbf1' },
    'cancelado':   { label: 'Cancelado',    cor: '#ef4444', bg: '#fee2e2' }
};

function getStatus(estado) {
    return STATUS_CONFIG[estado] || STATUS_CONFIG['pendente'];
}

async function carregarCompras() {
    const tbody = document.getElementById('compras-list');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="padding:2rem;text-align:center;color:#bbb;font-size:0.88rem;">A carregar...</td></tr>`;

    try {
        const response = await fetch(`${getApiUrl()}/pedidos`, { credentials: 'include' });

        if (!response.ok) {
            if (response.status === 401) { window.location.href = 'login.html'; return; }
            throw new Error('Erro ao carregar compras');
        }

        const compras = await response.json();

        if (compras.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="5">
                    <div class="mc-empty">
                        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <path d="M16 10a4 4 0 0 1-8 0"/>
                        </svg>
                        <p>Ainda não realizaste nenhuma compra.</p>
                        <a href="produtos.html">Explorar Produtos</a>
                    </div>
                </td></tr>`;
            return;
        }

        tbody.innerHTML = compras.map(compra => {
            const s = getStatus(compra.estado);
            const data = new Date(compra.data_criacao).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const total = parseFloat(compra.total || 0).toFixed(2);
            const numero = compra.numero_pedido || `#${compra.id}`;

            return `<tr>
                <td><span class="mc-order-num">${numero}</span></td>
                <td><span class="mc-date">${data}</span></td>
                <td>
                    <span class="mc-badge" style="background:${s.bg};color:${s.cor};">
                        <span class="mc-dot" style="background:${s.cor};"></span>
                        ${s.label}
                    </span>
                </td>
                <td><span class="mc-total">€${total}</span></td>
                <td>
                    <button class="mc-btn" onclick="verDetalhesPedido(${compra.id})">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Ver Detalhes
                    </button>
                </td>
            </tr>`;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar compras:', error);
        tbody.innerHTML = `
            <tr><td colspan="5" style="padding:2rem;text-align:center;color:#ef4444;font-size:0.88rem;">
                Erro ao carregar as suas compras.
                <button onclick="carregarCompras()" style="margin-left:8px;background:none;border:1px solid #ef4444;color:#ef4444;padding:4px 10px;border-radius:5px;cursor:pointer;font-size:0.8rem;">
                    Tentar Novamente
                </button>
            </td></tr>`;
    }
}

async function verDetalhesPedido(pedidoId) {
    try {
        const response = await fetch(`${getApiUrl()}/pedidos/${pedidoId}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Erro');
        const pedido = await response.json();
        mostrarModal(pedido);
    } catch (error) {
        alert('Erro ao carregar detalhes do pedido.');
    }
}

function mostrarModal(pedido) {
    document.getElementById('mc-modal')?.remove();

    const s = getStatus(pedido.estado);
    const data = new Date(pedido.data_criacao).toLocaleDateString('pt-PT', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const numero = pedido.numero_pedido || `#${pedido.id}`;

    const itensHTML = pedido.items && pedido.items.length
        ? `<div class="mc-product-list">${pedido.items.map(item => {
            const preco = parseFloat(item.preco_unitario || 0).toFixed(2);
            const subtotal = parseFloat(item.subtotal || 0).toFixed(2);
            return `<div class="mc-product-item">
                ${item.imagem
                    ? `<img src="${item.imagem}" alt="${item.nome}" class="mc-product-img">`
                    : `<div class="mc-product-placeholder">🖥️</div>`}
                <div style="flex:1;min-width:0;">
                    <div class="mc-product-name">${item.nome}</div>
                    <div class="mc-product-qty">Qtd: ${item.quantidade} × €${preco}</div>
                </div>
                <div class="mc-product-price">€${subtotal}</div>
            </div>`;
        }).join('')}</div>`
        : `<p style="font-size:0.85rem;color:#aaa;">Sem produtos registados.</p>`;

    const metodosLabel = { card: 'Cartão', mbway: 'MB Way', multibanco: 'Multibanco', klarna: 'Klarna' };

    const modal = document.createElement('div');
    modal.id = 'mc-modal';
    modal.className = 'mc-modal-overlay';
    modal.innerHTML = `
        <div class="mc-modal" onclick="event.stopPropagation()">
            <div class="mc-modal-header">
                <div>
                    <h2>Pedido ${numero}</h2>
                    <div class="mc-modal-date">${data}</div>
                </div>
                <button class="mc-modal-close" onclick="fecharModal()">×</button>
            </div>
            <div class="mc-modal-body">
                <div class="mc-modal-section">
                    <div class="mc-modal-label">Estado</div>
                    <div class="mc-modal-box">
                        <span class="mc-badge" style="background:${s.bg};color:${s.cor};font-size:0.85rem;padding:5px 12px;">
                            <span class="mc-dot" style="background:${s.cor};"></span>
                            ${s.label}
                        </span>
                    </div>
                </div>
                <div class="mc-modal-section">
                    <div class="mc-modal-label">Produtos</div>
                    ${itensHTML}
                </div>
                <div class="mc-modal-section">
                    <div class="mc-modal-label">Resumo</div>
                    <div class="mc-modal-box">
                        <div class="mc-total-row"><span>Subtotal</span><span>€${parseFloat(pedido.subtotal||0).toFixed(2)}</span></div>
                        <div class="mc-total-row"><span>IVA (23%)</span><span>€${parseFloat(pedido.iva||0).toFixed(2)}</span></div>
                        <div class="mc-total-row final"><span>Total</span><span>€${parseFloat(pedido.total||0).toFixed(2)}</span></div>
                    </div>
                </div>
                <div class="mc-modal-section">
                    <div class="mc-modal-label">Morada de Envio</div>
                    <div class="mc-modal-box">
                        <div class="mc-address">
                            <strong>${pedido.nome_envio||'—'}</strong><br>
                            ${pedido.morada_envio||'—'}<br>
                            ${pedido.codigo_postal_envio||''} ${pedido.cidade_envio||''}<br>
                            Tel: ${pedido.telefone_envio||'—'}
                        </div>
                    </div>
                </div>
                <div class="mc-modal-section">
                    <div class="mc-modal-label">Pagamento</div>
                    <div class="mc-modal-box" style="font-size:0.9rem;font-weight:600;color:#333;">
                        ${metodosLabel[pedido.metodo_pagamento] || pedido.metodo_pagamento || '—'}
                    </div>
                </div>
            </div>
        </div>`;

    modal.addEventListener('click', fecharModal);
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function fecharModal() {
    document.getElementById('mc-modal')?.remove();
    document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModal(); });