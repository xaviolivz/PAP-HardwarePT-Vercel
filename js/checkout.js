let checkoutData = { items: [], subtotal: 0, iva: 0, total: 0 };

let isProcessing = false;

function garantirNumero(valor, padrao = 0) {
    const num = parseFloat(valor);
    return isNaN(num) || !isFinite(num) ? padrao : num;
}

function updateTotals() {
    checkoutData.subtotal = checkoutData.items.reduce(
        (sum, item) => sum + (garantirNumero(item.preco) * garantirNumero(item.quantidade, 1)), 0
    );
    checkoutData.iva      = Math.round(checkoutData.subtotal * 0.23 * 100) / 100;
    checkoutData.subtotal = Math.round(checkoutData.subtotal * 100) / 100;
    checkoutData.total    = Math.round((checkoutData.subtotal + checkoutData.iva) * 100) / 100;
}

async function loadCheckoutData() {
    try {
        const utilizador = await verificarAuth();
        if (!utilizador) {
            redirectToLogin('Precisas de fazer login para finalizar a compra.');
            return;
        }

        const response = await fetch(`${getApiUrl()}/carrinho`, { credentials: 'include' });
        if (!response.ok) {
            if (response.status === 401) { redirectToLogin('A tua sessão expirou.'); }
            else mostrarNotificacao('Erro ao carregar o carrinho', 'error');
            return;
        }

        const items = normalizeApiItems(await response.json());

        if (items.length === 0) { window.location.href = 'carrinho.html'; return; }

        checkoutData.items = items;
        updateTotals();
        renderCheckoutSummary();
        await loadUserData();
    } catch {
        mostrarNotificacao('Erro ao carregar dados. Verifica a tua ligação.', 'error');
    }
}

function renderCheckoutSummary() {
    const container = document.getElementById('summaryItems');
    if (!container) return;

    container.innerHTML = checkoutData.items.map(item => {
        const preco      = garantirNumero(item.preco);
        const quantidade = garantirNumero(item.quantidade, 1);
        return `
            <div class="summary-item">
                <img src="${item.imagem}" alt="${item.nome}">
                <div class="summary-item-info">
                    <h4>${item.nome}</h4>
                    <p>Qtd: ${quantidade}</p>
                </div>
                <span class="summary-item-price">€${(preco * quantidade).toFixed(2)}</span>
            </div>`;
    }).join('');

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = `€${val.toFixed(2)}`; };
    set('subtotal', checkoutData.subtotal);
    set('iva',      checkoutData.iva);
    set('total',    checkoutData.total);

    const klarnaEl = document.getElementById('klarnaInstallment');
    if (klarnaEl) klarnaEl.textContent = `€${(checkoutData.total / 3).toFixed(2)} / mês`;
}

async function loadUserData() {
    try {
        const utilizador = await verificarAuth();
        if (!utilizador) return;

        if (utilizador.nome)     { const el = document.getElementById('fullName'); if (el) el.value = utilizador.nome; }
        if (utilizador.email)    { const el = document.getElementById('email');    if (el) el.value = utilizador.email; }
        if (utilizador.telefone) { const el = document.getElementById('phone');    if (el) el.value = utilizador.telefone; }
        if (utilizador.nif)      { const el = document.getElementById('nif');      if (el) el.value = utilizador.nif; }
    } catch {
        console.warn('Erro ao pré-preencher dados do utilizador');
    }
}

function validatePaymentMethod(method) {
    if (method === 'card') {
        const numero   = document.getElementById('cardNumber')?.value?.replace(/\s/g, '') || '';
        const nome     = document.getElementById('cardName')?.value?.trim() || '';
        const validade = document.getElementById('cardExpiry')?.value?.trim() || '';
        const cvv      = document.getElementById('cardCVV')?.value?.trim() || '';

        if (!numero || !/^\d{16}$/.test(numero)) {
            mostrarNotificacao('Número do cartão inválido. Deve ter 16 dígitos.', 'error');
            return false;
        }

        if (!nome) {
            mostrarNotificacao('Introduz o nome como está no cartão.', 'error');
            return false;
        }

        if (!/^\d{2}\/\d{2}$/.test(validade)) {
            mostrarNotificacao('Validade inválida. Formato: MM/AA', 'error');
            return false;
        }

        const [mm, aa] = validade.split('/').map(Number);
        if (mm < 1 || mm > 12) {
            mostrarNotificacao('Mês da validade inválido.', 'error');
            return false;
        }

        const agora    = new Date();
        const anoAtual = agora.getFullYear() % 100; 
        const mesAtual = agora.getMonth() + 1;       
        if (aa < anoAtual || (aa === anoAtual && mm < mesAtual)) {
            mostrarNotificacao('O cartão está expirado. Verifica a validade.', 'error');
            return false;
        }

        if (!cvv || !/^\d{3,4}$/.test(cvv)) {
            mostrarNotificacao('CVV inválido. Deve ter 3 dígitos.', 'error');
            return false;
        }

        return true;
    }

    if (method === 'mbway') {
        const telMBWay = document.getElementById('mbwayPhone')?.value?.replace(/\s/g, '') || '';

        if (!telMBWay) {
            mostrarNotificacao('Introduz o número de telemóvel para MB WAY.', 'error');
            return false;
        }

        if (!/^9\d{8}$/.test(telMBWay)) {
            mostrarNotificacao('Número de telemóvel inválido. Deve ser um número português com 9 dígitos.', 'error');
            return false;
        }

        return true;
    }

    return true;
}

async function processCheckout(event) {
    event.preventDefault();

    if (isProcessing) return;
    isProcessing = true;

    const form          = event.target;
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;

    if (!paymentMethod) {
        mostrarNotificacao('Seleciona um método de pagamento', 'error');
        isProcessing = false;
        return;
    }

    if (!validatePaymentMethod(paymentMethod)) {
        isProcessing = false;
        return;
    }

    const cpValor  = document.getElementById('postalCode')?.value?.trim();
    const nifValor = document.getElementById('nif')?.value?.trim();

    if (!validarCodigoPostal(cpValor)) {
        mostrarNotificacao('Código postal inválido. Formato: XXXX-XXX', 'error');
        isProcessing = false;
        return;
    }

    if (nifValor && !validarNIF(nifValor)) {
        mostrarNotificacao('NIF inválido. Deve ter 9 dígitos e ser um NIF português válido.', 'error');
        isProcessing = false;
        return;
    }

    const formData = {
        nome_envio:          form.fullName.value,
        email_envio:         form.email.value,
        telefone_envio:      form.phone.value,
        nif_envio:           nifValor || null,
        morada_envio:        form.address.value,
        cidade_envio:        form.city.value,
        codigo_postal_envio: cpValor,
        metodo_pagamento:    paymentMethod,
        subtotal:            checkoutData.subtotal,
        iva:                 checkoutData.iva,
        total:               checkoutData.total,
        items: checkoutData.items.map(item => ({
            produto_id: parseInt(item.id, 10) || 0,
            quantidade: garantirNumero(item.quantidade, 1)
        }))
    };

    const invalidos = formData.items.filter(i => !i.produto_id || i.quantidade <= 0);
    if (invalidos.length > 0) {
        mostrarNotificacao('Erro: dados do carrinho inválidos', 'error');
        isProcessing = false;
        return;
    }

    const submitBtn     = form.querySelector('button[type="submit"]');
    const textoOriginal = submitBtn.textContent;
    submitBtn.disabled    = true;
    submitBtn.textContent = 'A processar...';

    try {
        const response = await fetch(`${getApiUrl()}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.mensagem || err.message || `Erro ${response.status}`);
        }

        const result = await response.json();

        if (!result.id && !result.pedido_id && !result.pedidoId) {
            throw new Error('Resposta sem ID válido');
        }

        sessionStorage.setItem('lastOrder', JSON.stringify({
            id:               result.id || result.pedido_id || result.pedidoId,
            numero:           result.numero_pedido || result.numero,
            email:            formData.email_envio,
            total:            checkoutData.total,
            subtotal:         checkoutData.subtotal,
            iva:              checkoutData.iva,
            data:             new Date().toISOString(),
            metodo_pagamento: paymentMethod,
            itens:            checkoutData.items
        }));

        window.location.href = 'confirmacao.html';
    } catch (error) {
        mostrarNotificacao(error.message || 'Erro ao processar pedido', 'error');
        submitBtn.disabled    = false;
        submitBtn.textContent = textoOriginal;
        isProcessing = false;
    }
}

function updatePaymentFields(method) {
    const fields = ['cardFields', 'mbwayFields', 'multibancoFields', 'klarnaFields'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const map = {
        card:       'cardFields',
        mbway:      'mbwayFields',
        multibanco: 'multibancoFields',
        klarna:     'klarnaFields'
    };

    const target = document.getElementById(map[method]);
    if (target) target.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    loadCheckoutData();

    const form = document.getElementById('checkoutForm');
    if (form) form.addEventListener('submit', processCheckout);

    const cpInput = document.getElementById('postalCode');
    if (cpInput) {
        cpInput.addEventListener('input', (e) => {
            e.target.value = formatarCodigoPostal(e.target.value);
        });
    }

    const cardInput = document.getElementById('cardNumber');
    if (cardInput) {
        cardInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '').slice(0, 16);
            e.target.value = val.replace(/(.{4})/g, '$1 ').trim();
        });
    }

    const expiryInput = document.getElementById('cardExpiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '').slice(0, 4);
            if (val.length >= 3) {
                val = val.slice(0, 2) + '/' + val.slice(2);
            }
            e.target.value = val;
        });
    }

    const cvvInput = document.getElementById('cardCVV');
    if (cvvInput) {
        cvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
        });
    }

    const mbwayInput = document.getElementById('mbwayPhone');
    if (mbwayInput) {
        mbwayInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
        });
    }
});

console.log('✅ checkout.js carregado');