function getApiUrl() {
    if (typeof CONFIG !== 'undefined' && CONFIG.API_URL) return CONFIG.API_URL;
    if (typeof API_BASE_URL !== 'undefined') return API_BASE_URL;
    return window.location.hostname === 'localhost'
        ? 'http://localhost:3000/api'
        : '/api';
}

async function verificarAuth() {
    try {
        const response = await fetch(`${getApiUrl()}/auth/verificar`, { credentials: 'include' });
        if (!response.ok) return null;
        const data = await response.json();
        return data.autenticado ? data.utilizador : null;
    } catch {
        return null;
    }
}

function redirectToLogin(message) {
    if (message) sessionStorage.setItem('authRedirectMessage', message);
    sessionStorage.setItem('authRedirectBack', window.location.href);
    window.location.href = 'login.html';
}

let _toastTimeout = null;
function mostrarNotificacao(mensagem, tipo = 'info') {
    const existente = document.querySelector('.notification-toast');
    if (existente) existente.remove();

    const notificacao = document.createElement('div');
    notificacao.className = 'notification-toast';
    notificacao.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: ${tipo === 'success' || tipo === 'sucesso' ? '#22c55e' : tipo === 'error' || tipo === 'erro' ? '#ef4444' : '#3b82f6'};
        color: white; padding: 1rem 1.5rem; border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000;
        font-weight: 500; font-size: 0.95rem;
        animation: slideInToast 0.3s ease;
    `;
    notificacao.textContent = mensagem;

    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = `
            @keyframes slideInToast { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notificacao);
    _toastTimeout = setTimeout(() => notificacao.remove(), 8000);
}

async function atualizarContadorCarrinho() {
    let total = 0;
    try {
        const utilizador = await verificarAuth();
        if (utilizador) {
            const response = await fetch(`${getApiUrl()}/carrinho`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                const itens = Array.isArray(data) ? data : (data.itens || data.items || []);
                total = itens.reduce((sum, item) => sum + (item.quantidade || 0), 0);
            }
        }
    } catch {
    }

    document.querySelectorAll('#cartCount, .cart-count, [data-cart-count]').forEach(el => {
        el.textContent = total;
        el.style.display = total > 0 ? 'inline-flex' : '';
    });
}

function normalizeApiItems(payload) {
    const arr = Array.isArray(payload)
        ? payload
        : (payload?.itens || payload?.items || payload?.carrinho || []);
    if (!Array.isArray(arr)) return [];
    return arr.map(item => ({
        carrinhoId: Number(item.id),
        id: Number(item.produto_id ?? item.id),
        nome: item.nome ?? 'Produto',
        preco: parseFloat(item.preco_promocional || item.preco || 0),
        imagem: item.imagem ?? 'imagens/placeholder.jpg',
        quantidade: parseInt(item.quantidade ?? 1, 10)
    })).filter(item => Number.isFinite(item.id));
}

function validarCodigoPostal(cp) {
    return /^\d{4}-\d{3}$/.test(cp) || /^\d{7}$/.test(cp);
}

function formatarCodigoPostal(valor) {
    const digits = valor.replace(/\D/g, '').substring(0, 7);
    return digits.length > 4 ? digits.substring(0, 4) + '-' + digits.substring(4) : digits;
}

function validarNIF(nif) {
    if (!nif) return true;
    const n = nif.replace(/\s/g, '');
    if (!/^\d{9}$/.test(n)) return false;

    const primeiros = ['1','2','3','5','6','7','8','9','45','70','71','72','75','77','79','90','91','98','99'];
    const p2 = n.substring(0, 2), p1 = n.charAt(0);
    if (!primeiros.some(p => p.length === 2 ? p2 === p : p1 === p)) return false;

    let soma = 0;
    for (let i = 0; i < 8; i++) soma += parseInt(n.charAt(i)) * (9 - i);
    const resto = soma % 11;
    return (resto < 2 ? 0 : 11 - resto) === parseInt(n.charAt(8));
}

function formatarPreco(preco) {
    return `€${parseFloat(preco || 0).toFixed(2)}`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

if (typeof window !== 'undefined') {
    window.getApiUrl              = getApiUrl;
    window.verificarAuth          = verificarAuth;
    window.redirectToLogin        = redirectToLogin;
    window.mostrarNotificacao     = mostrarNotificacao;
    window.atualizarContadorCarrinho = atualizarContadorCarrinho;
    window.normalizeApiItems      = normalizeApiItems;
    window.validarCodigoPostal    = validarCodigoPostal;
    window.formatarCodigoPostal   = formatarCodigoPostal;
    window.validarNIF             = validarNIF;
    window.formatarPreco          = formatarPreco;
    window.escapeHtml             = escapeHtml;
}

console.log('✅ utils.js carregado');