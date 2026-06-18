document.addEventListener('DOMContentLoaded', async function() {
    await carregarDadosUtilizador();
    await carregarPedidos();
    setupToggles();
});

async function carregarDadosUtilizador() {
    try {
        const authResponse = await fetch(`${getApiUrl()}/auth/verificar`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!authResponse.ok || authResponse.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        const authData = await authResponse.json();
        if (!authData.autenticado) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`${getApiUrl()}/utilizador`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Erro ao carregar dados');

        const dados = await response.json();

        if (document.getElementById('nome')) document.getElementById('nome').value = dados.nome || '';
        if (document.getElementById('email')) document.getElementById('email').value = dados.email || '';
        if (document.getElementById('telefone')) document.getElementById('telefone').value = dados.telefone || '';
        if (document.getElementById('nif')) document.getElementById('nif').value = dados.nif || '';

    } catch (error) {
        console.error('❌ Erro ao carregar perfil:', error);
        mostrarNotificacao('Erro ao carregar dados do perfil', 'erro');
    }
}

async function atualizarPerfil(e) {
    e.preventDefault();

    const dados = {
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        telefone: document.getElementById('telefone').value,
        nif: document.getElementById('nif').value
    };

    try {
        const response = await fetch(`${getApiUrl()}/utilizador/atualizar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(dados)
        });

        const resultado = await response.json();

        if (response.ok) {
            mostrarNotificacao('Perfil atualizado com sucesso!', 'sucesso');
        } else {
            mostrarNotificacao(resultado.mensagem || 'Erro ao atualizar perfil', 'erro');
        }
    } catch (error) {
        mostrarNotificacao('Erro ao atualizar perfil', 'erro');
    }
}

async function alterarPassword(e) {
    e.preventDefault();

    const passwordAtual = document.getElementById('passwordAtual').value;
    const passwordNova = document.getElementById('passwordNova').value;
    const passwordConfirmar = document.getElementById('passwordConfirmar').value;

    if (passwordNova.length < 8) {
        mostrarNotificacao('A password deve ter pelo menos 8 caracteres', 'erro');
        return;
    }
    if (passwordNova !== passwordConfirmar) {
        mostrarNotificacao('As passwords não coincidem', 'erro');
        return;
    }

    try {
        const response = await fetch(`${getApiUrl()}/utilizador/alterar-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ passwordAtual, passwordNova })
        });

        const resultado = await response.json();

        if (response.ok) {
            mostrarNotificacao('Password alterada com sucesso!', 'sucesso');
            document.getElementById('passwordAtual').value = '';
            document.getElementById('passwordNova').value = '';
            document.getElementById('passwordConfirmar').value = '';
        } else {
            mostrarNotificacao(resultado.mensagem || 'Erro ao alterar password', 'erro');
        }
    } catch (error) {
        mostrarNotificacao('Erro ao alterar password', 'erro');
    }
}

function mostrarSeccao(seccaoId, link) {
    document.querySelectorAll('.profile-main .profile-card').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(seccaoId);
    if (target) target.classList.remove('hidden');
    if (link) {
        document.querySelectorAll('.profile-nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

function setupToggles() {
    const toggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
    toggles.forEach(function(toggle) {
        const span = toggle.nextElementSibling;
        if (toggle.checked) span.style.background = 'var(--accent-color, #00bfa6)';
        span.innerHTML = '';
        const circle = document.createElement('span');
        circle.style.cssText = 'position:absolute;height:20px;width:20px;left:3px;bottom:3px;background:white;border-radius:50%;transition:0.3s;';
        if (toggle.checked) circle.style.transform = 'translateX(22px)';
        span.appendChild(circle);
        toggle.addEventListener('change', function() {
            if (this.checked) {
                circle.style.transform = 'translateX(22px)';
                span.style.background = 'var(--accent-color, #00bfa6)';
            } else {
                circle.style.transform = 'translateX(0)';
                span.style.background = '#444';
            }
        });
    });
}

function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        padding: 15px 25px;
        background: ${tipo === 'sucesso' ? '#00bfa6' : '#e74c3c'};
        color: white; border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000; font-weight: 500;
        animation: slideIn 0.3s ease;
    `;
    notif.textContent = mensagem;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }

    /* === TABELA DE COMPRAS === */
    .orders-table { width: 100%; border-collapse: collapse; }
    .orders-table thead th {
        padding: 0.9rem 1rem;
        text-align: left;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.4);
        border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .orders-table tbody tr {
        border-bottom: 1px solid rgba(255,255,255,0.06);
        transition: background 0.18s;
        cursor: default;
    }
    .orders-table tbody tr:hover { background: rgba(255,255,255,0.04); }
    .orders-table tbody td { padding: 1rem; vertical-align: middle; font-size: 0.92rem; }
    .orders-table tbody tr:last-child { border-bottom: none; }

    .order-number { font-weight: 700; font-family: monospace; font-size: 0.85rem; color: rgba(255,255,255,0.7); }
    .order-total { font-weight: 700; color: var(--accent-color, #00bfa6); font-size: 1rem; }

    .status-badge {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 4px 10px; border-radius: 99px;
        font-size: 0.78rem; font-weight: 700; letter-spacing: 0.02em;
    }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

    .btn-detalhes {
        background: none;
        border: 1px solid rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.7);
        padding: 6px 14px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.82rem;
        font-weight: 500;
        transition: all 0.18s;
        display: inline-flex; align-items: center; gap: 6px;
    }
    .btn-detalhes:hover {
        border-color: var(--accent-color, #00bfa6);
        color: var(--accent-color, #00bfa6);
        background: rgba(0,191,166,0.06);
    }

    .orders-empty {
        padding: 3rem 1rem; text-align: center; color: rgba(255,255,255,0.4);
    }
    .orders-empty svg { opacity: 0.25; margin-bottom: 1rem; }
    .orders-empty p { font-size: 0.95rem; margin-bottom: 1rem; }
    .orders-empty a {
        display: inline-block; padding: 10px 22px;
        background: var(--accent-color, #00bfa6); color: #000;
        border-radius: 6px; text-decoration: none; font-weight: 700;
        font-size: 0.9rem;
    }

    /* === MODAL DE DETALHES === */
    .modal-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.75);
        display: flex; align-items: center; justify-content: center;
        z-index: 10000; padding: 20px;
        animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .modal-box {
        background: #161616;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 14px;
        max-width: 640px; width: 100%;
        max-height: 88vh; overflow-y: auto;
        position: relative;
        animation: slideUp 0.25s ease;
    }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .modal-header {
        padding: 1.6rem 1.8rem 1rem;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        display: flex; align-items: flex-start; justify-content: space-between;
    }
    .modal-header h2 { font-size: 1.15rem; font-weight: 700; margin: 0 0 0.3rem; }
    .modal-header .modal-date { font-size: 0.82rem; color: rgba(255,255,255,0.4); }

    .modal-close {
        background: rgba(255,255,255,0.06); border: none;
        color: rgba(255,255,255,0.6); width: 32px; height: 32px;
        border-radius: 8px; cursor: pointer; font-size: 1.2rem;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s; flex-shrink: 0;
    }
    .modal-close:hover { background: rgba(255,255,255,0.12); color: #fff; }

    .modal-body { padding: 1.4rem 1.8rem 1.8rem; }

    .modal-section { margin-bottom: 1.5rem; }
    .modal-section-title {
        font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em;
        text-transform: uppercase; color: rgba(255,255,255,0.35);
        margin-bottom: 0.8rem;
    }
    .modal-section-box {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 10px; padding: 1rem 1.1rem;
    }

    /* Itens do pedido */
    .modal-product-list { display: flex; flex-direction: column; gap: 0.7rem; }
    .modal-product-item {
        display: flex; align-items: center; gap: 0.9rem;
        padding: 0.7rem; background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;
    }
    .modal-product-img {
        width: 46px; height: 46px; object-fit: contain;
        border-radius: 6px; background: rgba(255,255,255,0.05);
        flex-shrink: 0;
    }
    .modal-product-img-placeholder {
        width: 46px; height: 46px; border-radius: 6px;
        background: rgba(255,255,255,0.07);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; font-size: 1.2rem;
    }
    .modal-product-info { flex: 1; min-width: 0; }
    .modal-product-name { font-size: 0.88rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .modal-product-qty { font-size: 0.78rem; color: rgba(255,255,255,0.45); margin-top: 2px; }
    .modal-product-price { font-weight: 700; font-size: 0.9rem; color: var(--accent-color, #00bfa6); flex-shrink: 0; }

    /* Totais */
    .modal-totals { display: flex; flex-direction: column; gap: 0.5rem; }
    .modal-total-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; }
    .modal-total-row.final {
        border-top: 1px solid rgba(255,255,255,0.1); margin-top: 0.4rem;
        padding-top: 0.7rem; font-size: 1rem; font-weight: 700;
        color: var(--accent-color, #00bfa6);
    }
    .modal-total-row span:first-child { color: rgba(255,255,255,0.55); }

    /* Morada */
    .modal-address { font-size: 0.88rem; line-height: 1.8; color: rgba(255,255,255,0.75); }
    .modal-address strong { color: #fff; font-weight: 600; }

    /* Método pagamento */
    .modal-payment {
        display: inline-flex; align-items: center; gap: 8px;
        font-size: 0.9rem; font-weight: 600;
    }
`;
document.head.appendChild(style);

const STATUS_CONFIG = {
    'pendente':     { label: 'Pendente',      cor: '#f59e0b', icon: '⏳' },
    'processando':  { label: 'A processar',   cor: '#3b82f6', icon: '⚙️' },
    'enviado':      { label: 'Enviado',        cor: '#8b5cf6', icon: '📦' },
    'entregue':     { label: 'Entregue',       cor: '#22c55e', icon: '✓' },
    'cancelado':    { label: 'Cancelado',      cor: '#ef4444', icon: '✗' }
};

function getStatus(estado) {
    return STATUS_CONFIG[estado] || STATUS_CONFIG['pendente'];
}

async function carregarPedidos() {
    const tbody = document.getElementById('pedidos-list');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.35); font-size: 0.88rem;">
                A carregar...
            </td>
        </tr>`;

    try {
        const response = await fetch(`${getApiUrl()}/pedidos`, { credentials: 'include' });
        if (!response.ok) throw new Error('Erro');

        const pedidos = await response.json();

        if (!pedidos.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="orders-empty">
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M9 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"/>
                                <path d="M9 2v7h7"/>
                            </svg>
                            <p>Ainda não tens nenhuma compra.</p>
                            <a href="produtos.html">Ver Produtos</a>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = pedidos.map(p => {
            const data = new Date(p.data_criacao).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const total = parseFloat(p.total || 0).toFixed(2);
            const estado = p.estado || 'pendente';
            const s = getStatus(estado);
            const numero = p.numero_pedido || `#${p.id}`;
            const nItems = p.total_items || '—';

            return `<tr>
                <td>
                    <span class="order-number">${numero}</span>
                </td>
                <td style="color: rgba(255,255,255,0.6); font-size: 0.88rem;">${data}</td>
                <td>
                    <span class="status-badge" style="background: ${s.cor}18; color: ${s.cor};">
                        <span class="status-dot" style="background: ${s.cor};"></span>
                        ${s.label}
                    </span>
                </td>
                <td class="order-total">€${total}</td>
                <td>
                    <button class="btn-detalhes" onclick="verDetalhesPedido(${p.id})">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        Detalhes
                    </button>
                </td>
            </tr>`;
        }).join('');

    } catch (e) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding: 1.5rem; text-align: center; color: #ef4444; font-size: 0.88rem;">
                    Erro ao carregar compras.
                    <button onclick="carregarPedidos()" style="margin-left: 8px; background: none; border: 1px solid #ef4444; color: #ef4444; padding: 4px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">Tentar de novo</button>
                </td>
            </tr>`;
    }
}

async function verDetalhesPedido(pedidoId) {
    try {
        const response = await fetch(`${getApiUrl()}/pedidos/${pedidoId}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Erro ao carregar detalhes');
        const pedido = await response.json();
        mostrarModalDetalhes(pedido);
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao('Erro ao carregar detalhes do pedido', 'erro');
    }
}

function mostrarModalDetalhes(pedido) {
    document.getElementById('modal-pedido')?.remove();

    const s = getStatus(pedido.estado);
    const data = new Date(pedido.data_criacao).toLocaleDateString('pt-PT', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const numero = pedido.numero_pedido || `#${pedido.id}`;

    const itensHTML = pedido.items && pedido.items.length
        ? `<div class="modal-product-list">
            ${pedido.items.map(item => {
                const preco = parseFloat(item.preco_unitario || item.subtotal / item.quantidade || 0).toFixed(2);
                const subtotal = parseFloat(item.subtotal || 0).toFixed(2);
                return `
                    <div class="modal-product-item">
                        ${item.imagem
                            ? `<img src="${item.imagem}" alt="${item.nome}" class="modal-product-img">`
                            : `<div class="modal-product-img-placeholder">🖥️</div>`
                        }
                        <div class="modal-product-info">
                            <div class="modal-product-name">${item.nome}</div>
                            <div class="modal-product-qty">Qtd: ${item.quantidade} × €${preco}</div>
                        </div>
                        <div class="modal-product-price">€${subtotal}</div>
                    </div>`;
            }).join('')}
          </div>`
        : `<p style="font-size: 0.85rem; color: rgba(255,255,255,0.4);">Sem produtos registados.</p>`;

    const metodoPagamentoLabel = {
        'card': '💳 Cartão de Crédito',
        'mbway': '📱 MB Way',
        'multibanco': '🏧 Multibanco',
        'klarna': '🛒 Klarna'
    };

    const modal = document.createElement('div');
    modal.id = 'modal-pedido';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box" onclick="event.stopPropagation()">
            <div class="modal-header">
                <div>
                    <h2>Pedido ${numero}</h2>
                    <div class="modal-date">${data}</div>
                </div>
                <button class="modal-close" onclick="fecharModalPedido()">×</button>
            </div>
            <div class="modal-body">

                <!-- Estado -->
                <div class="modal-section">
                    <div class="modal-section-title">Estado da Encomenda</div>
                    <div class="modal-section-box">
                        <span class="status-badge" style="background: ${s.cor}18; color: ${s.cor}; font-size: 0.9rem; padding: 6px 14px;">
                            <span class="status-dot" style="background: ${s.cor};"></span>
                            ${s.label}
                        </span>
                    </div>
                </div>

                <!-- Produtos -->
                <div class="modal-section">
                    <div class="modal-section-title">Produtos</div>
                    ${itensHTML}
                </div>

                <!-- Resumo de valores -->
                <div class="modal-section">
                    <div class="modal-section-title">Resumo</div>
                    <div class="modal-section-box">
                        <div class="modal-totals">
                            <div class="modal-total-row">
                                <span>Subtotal</span>
                                <span>€${parseFloat(pedido.subtotal || 0).toFixed(2)}</span>
                            </div>
                            <div class="modal-total-row">
                                <span>IVA (23%)</span>
                                <span>€${parseFloat(pedido.iva || 0).toFixed(2)}</span>
                            </div>
                            <div class="modal-total-row final">
                                <span>Total</span>
                                <span>€${parseFloat(pedido.total || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Morada de envio -->
                <div class="modal-section">
                    <div class="modal-section-title">Morada de Envio</div>
                    <div class="modal-section-box">
                        <div class="modal-address">
                            <strong>${pedido.nome_envio || '—'}</strong><br>
                            ${pedido.morada_envio || '—'}<br>
                            ${pedido.codigo_postal_envio || ''} ${pedido.cidade_envio || ''}<br>
                            Tel: ${pedido.telefone_envio || '—'}
                        </div>
                    </div>
                </div>

                <!-- Método de pagamento -->
                <div class="modal-section">
                    <div class="modal-section-title">Método de Pagamento</div>
                    <div class="modal-section-box">
                        <span class="modal-payment">
                            ${metodoPagamentoLabel[pedido.metodo_pagamento] || pedido.metodo_pagamento || '—'}
                        </span>
                    </div>
                </div>

            </div>
        </div>
    `;

    modal.addEventListener('click', fecharModalPedido);
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function fecharModalPedido() {
    document.getElementById('modal-pedido')?.remove();
    document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharModalPedido();
});

async function logout() {
    try {
        await fetch(`${getApiUrl()}/auth/logout`, { method: 'POST', credentials: 'include' });
        window.location.href = 'index.html';
    } catch (error) {
        window.location.href = 'index.html';
    }
}