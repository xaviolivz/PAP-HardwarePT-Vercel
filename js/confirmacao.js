const METODO_LABELS = {
    card:       'Cartão de Crédito/Débito',
    mbway:      'MB WAY',
    multibanco: 'Multibanco',
    klarna:     'Klarna (3x sem juros)'
};

function loadOrderConfirmation() {
    const orderDataStr = sessionStorage.getItem('lastOrder');

    if (!orderDataStr) {
        console.error('❌ Sem dados no sessionStorage');
        showError('Sem dados de pedido. A redirecionar...');
        setTimeout(() => { window.location.href = 'index.html'; }, 3000);
        return;
    }

    let orderData;
    try {
        orderData = JSON.parse(orderDataStr);
    } catch (e) {
        console.error('❌ Erro ao fazer parse:', e);
        window.location.href = 'index.html';
        return;
    }

    if (!orderData.id && !orderData.numero) {
        console.error('❌ Pedido sem ID ou número:', orderData);
        window.location.href = 'index.html';
        return;
    }

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('orderNumber', orderData.numero || `#${orderData.id}`);
    set('orderEmail',  orderData.email  || '—');
    set('orderTotal',  `€${(parseFloat(orderData.total) || 0).toFixed(2)}`);

    const orderDateEl = document.getElementById('orderDate');
    if (orderDateEl) {
        try {
            orderDateEl.textContent = new Date(orderData.data).toLocaleDateString('pt-PT', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        } catch {
            orderDateEl.textContent = new Date().toLocaleDateString('pt-PT');
        }
    }

    preencherComprovativo(orderData);

    if (typeof atualizarContadorCarrinho === 'function') atualizarContadorCarrinho();

    console.log('✅ Confirmação carregada:', orderData.numero || orderData.id);
}

function preencherComprovativo(orderData) {
    const agora = new Date();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('printDate', 'Impresso em: ' + agora.toLocaleDateString('pt-PT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }));

    set('printOrderNumber', orderData.numero || ('#' + orderData.id) || '—');
    set('printOrderEmail',  orderData.email  || '—');

    const metodoBruto = orderData.metodo_pagamento || orderData.metodoPagamento || orderData.payment_method || '';
    set('printPaymentMethod', METODO_LABELS[metodoBruto] || metodoBruto || '—');

    try {
        set('printOrderDate', new Date(orderData.data).toLocaleDateString('pt-PT', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }));
    } catch { set('printOrderDate', agora.toLocaleDateString('pt-PT')); }

    const total    = parseFloat(orderData.total)    || 0;
    const subtotal = parseFloat(orderData.subtotal) || parseFloat((total / 1.23).toFixed(2));
    const iva      = parseFloat(orderData.iva)      || parseFloat((total - subtotal).toFixed(2));

    const fmt = v => '€' + parseFloat(v).toFixed(2);
    set('printSubtotal', fmt(subtotal));
    set('printIVA',      fmt(iva));
    set('printTotal',    fmt(total));
    set('printShipping', orderData.envio > 0 ? fmt(parseFloat(orderData.envio)) : 'Grátis');

    const tbody = document.getElementById('printItemsBody');
    if (!tbody) return;

    const itens = orderData.itens || orderData.items || orderData.produtos || [];

    if (itens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:1rem 0;">Sem itens detalhados disponíveis</td></tr>';
        return;
    }

    tbody.innerHTML = itens.map((item, i) => {
        const nome  = item.nome || item.name || 'Produto';
        const qty   = parseInt(item.quantidade || item.qty || 1);
        const preco = parseFloat(item.preco_unitario || item.preco || 0);
        return `<tr>
            <td>${i + 1}</td>
            <td>${nome}</td>
            <td style="text-align:center">${qty}</td>
            <td style="text-align:right">€${preco.toFixed(2)}</td>
            <td style="text-align:right">€${(preco * qty).toFixed(2)}</td>
        </tr>`;
    }).join('');
}

function showError(msg) {
    const box = document.querySelector('.confirmation-box');
    if (box) box.innerHTML = `<p style="color:#e74c3c;text-align:center;padding:2rem;">${msg}</p>`;
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('orderNumber')) {
        loadOrderConfirmation();
    }
});

console.log('✅ confirmacao.js carregado');