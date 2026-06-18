async function renderCartPage() {
    const container = document.getElementById('cartPageItems');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center;padding:3rem 1rem;color:#666;"><p>A carregar carrinho...</p></div>`;

    const utilizador = await verificarAuth();
    if (!utilizador) {
        redirectToLogin('Precisas de fazer login para ver o teu carrinho.');
        return;
    }

    let items = [];
    try {
        const response = await fetch(`${getApiUrl()}/carrinho`, { credentials: 'include' });
        if (response.ok) {
            items = normalizeApiItems(await response.json());
        } else if (response.status === 401) {
            redirectToLogin('A tua sessão expirou. Faz login novamente.');
            return;
        } else {
            throw new Error(`Erro ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Erro ao obter carrinho:', error);
        container.innerHTML = `<div style="text-align:center;padding:3rem 1rem;">
            <p style="color:#ef4444;">Erro ao carregar o carrinho. Tenta novamente.</p></div>`;
        return;
    }

    if (items.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:3rem 1rem;">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="opacity:0.3;margin-bottom:1rem;">
                    <circle cx="9" cy="21" r="1" stroke-width="2"/>
                    <circle cx="20" cy="21" r="1" stroke-width="2"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke-width="2"/>
                </svg>
                <h2>O teu carrinho está vazio</h2>
                <p style="color:#666;margin-bottom:1.5rem;">Adiciona produtos para começar a comprar</p>
                <a href="produtos.html" class="btn-primary">Ver Produtos</a>
            </div>`;
        updateCartSummary(0, 0, 0);
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="cart-item" data-product-id="${item.id}">
            <img src="${item.imagem}" alt="${item.nome}"
                 onerror="this.src='https://via.placeholder.com/88x88/f3f4f6/6b7280?text=Produto'">
            <div class="item-info">
                <h3>${item.nome}</h3>
                <p class="item-price">${formatarPreco(item.preco)}</p>
            </div>
            <div class="item-quantity">
                <button onclick="updateCartQuantity(${item.carrinhoId}, ${item.quantidade - 1})" class="qty-btn">-</button>
                <input type="number" value="${item.quantidade}" min="1"
                       onchange="updateCartQuantity(${item.carrinhoId}, parseInt(this.value))" class="qty-input">
                <button onclick="updateCartQuantity(${item.carrinhoId}, ${item.quantidade + 1})" class="qty-btn">+</button>
            </div>
            <div class="item-total">${formatarPreco(item.preco * item.quantidade)}</div>
            <button onclick="removeFromCart(${item.carrinhoId})" class="item-remove" title="Remover">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/>
                </svg>
            </button>
        </div>
    `).join('');

    const subtotal = items.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    const iva = subtotal * 0.23;
    updateCartSummary(subtotal, iva, subtotal + iva);
}

function updateCartSummary(subtotal, iva, total) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = formatarPreco(val); };
    set('subtotal', subtotal);
    set('iva', iva);
    set('totalFinal', total);
}

async function updateCartQuantity(carrinhoId, newQuantity) {
    carrinhoId   = Number(carrinhoId);
    newQuantity  = parseInt(newQuantity, 10);
    if (!Number.isFinite(carrinhoId)) return;

    if (newQuantity < 1) { removeFromCart(carrinhoId); return; }

    try {
        const response = await fetch(`${getApiUrl()}/carrinho/${carrinhoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ quantidade: newQuantity })
        });
        if (response.status === 401) { redirectToLogin('A tua sessão expirou.'); return; }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            mostrarNotificacao(data.erro || 'Erro ao atualizar quantidade', 'error');
            return;
        }
    } catch {
        mostrarNotificacao('Erro de ligação ao servidor', 'error');
        return;
    }

    await renderCartPage();
    atualizarContadorCarrinho();
}

async function removeFromCart(carrinhoId) {
    carrinhoId = Number(carrinhoId);
    if (!Number.isFinite(carrinhoId)) return;
    if (!confirm('Tens a certeza que queres remover este produto?')) return;

    try {
        const response = await fetch(`${getApiUrl()}/carrinho/${carrinhoId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (response.status === 401) { redirectToLogin('A tua sessão expirou.'); return; }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            mostrarNotificacao(data.erro || 'Erro ao remover produto', 'error');
            return;
        }
    } catch {
        mostrarNotificacao('Erro de ligação ao servidor', 'error');
        return;
    }

    mostrarNotificacao('Produto removido do carrinho', 'success');
    await renderCartPage();
    atualizarContadorCarrinho();
}

async function handleCheckout() {
    const utilizador = await verificarAuth();
    if (!utilizador) {
        redirectToLogin('Precisas de fazer login para finalizar a compra.');
        return;
    }
    window.location.href = 'checkout.html';
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (!sidebar) return;

    const isOpen = sidebar.classList.contains('active');

    if (isOpen) {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.classList.remove('cart-open');
    } else {
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
        document.body.classList.add('cart-open');
        renderCartSidebar();
    }
}

async function renderCartSidebar() {
    const container  = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl    = document.getElementById('cartTotal');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center;padding:2rem;color:#666;">A carregar...</div>`;

    const utilizador = await verificarAuth();
    if (!utilizador) {
        container.innerHTML = `
            <div class="empty-cart">
                <p>Faz <a href="login.html">login</a> para ver o teu carrinho.</p>
            </div>`;
        return;
    }

    let items = [];
    try {
        const response = await fetch(`${getApiUrl()}/carrinho`, { credentials: 'include' });
        if (response.ok) {
            items = normalizeApiItems(await response.json());
        } else {
            throw new Error();
        }
    } catch {
        container.innerHTML = `<div style="text-align:center;padding:2rem;color:#ef4444;">Erro ao carregar carrinho.</div>`;
        return;
    }

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <p>O seu carrinho está vazio</p>
            </div>`;
        if (subtotalEl) subtotalEl.textContent = '€0,00';
        if (totalEl) totalEl.textContent = '€0,00';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="cart-item-sidebar" data-id="${item.carrinhoId}">
            <img src="${item.imagem}" alt="${item.nome}"
                 onerror="this.src='https://via.placeholder.com/60x60/f3f4f6/6b7280?text=Produto'"
                 style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;">
            <div style="flex:1;min-width:0;">
                <p style="margin:0;font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.nome}</p>
                <p style="margin:0.25rem 0 0;font-size:0.8rem;color:#666;">${formatarPreco(item.preco)} × ${item.quantidade}</p>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.25rem;flex-shrink:0;">
                <span style="font-weight:700;font-size:0.9rem;">${formatarPreco(item.preco * item.quantidade)}</span>
                <button onclick="removeSidebarItem(${item.carrinhoId})"
                        style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:1.2rem;line-height:1;padding:0;"
                        title="Remover">×</button>
            </div>
        </div>
    `).join('');

    const subtotal = items.reduce((sum, i) => sum + i.preco * i.quantidade, 0);
    const formatted = subtotal.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
    if (subtotalEl) subtotalEl.textContent = formatted;
    if (totalEl) totalEl.textContent = formatted;
}

async function removeSidebarItem(carrinhoId) {
    try {
        const response = await fetch(`${getApiUrl()}/carrinho/${carrinhoId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) throw new Error();
    } catch {
        mostrarNotificacao('Erro ao remover produto', 'error');
        return;
    }

    mostrarNotificacao('Produto removido', 'success');
    renderCartSidebar();
    atualizarContadorCarrinho();
}


document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cartPageItems')) {
        console.log('🛒 Carregando página do carrinho...');
        renderCartPage();
    }
});

console.log('✅ carrinho.js carregado');