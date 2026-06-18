document.addEventListener('click', async (e) => {

    const btn = e.target.closest('.add-to-cart-btn, .btn-add-cart, [data-add-to-cart]');
    if (!btn) return;

    if (btn.getAttribute('onclick')?.includes('addToCartFromDetails')) return;

    e.preventDefault();

    const produtoId = parseInt(btn.dataset.productId || btn.dataset.produtoId);
    if (!produtoId) return;

    const quantidadeInput = document.querySelector(`[data-quantity-for="${produtoId}"]`);
    const quantidade = quantidadeInput ? parseInt(quantidadeInput.value) || 1 : 1;

    const utilizador = await verificarAuth();
    if (!utilizador) {
        redirectToLogin('Precisas de fazer login para adicionar produtos ao carrinho.');
        return;
    }

    try {
        const response = await fetch(`${getApiUrl()}/carrinho/adicionar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ produto_id: produtoId, quantidade })
        });

        const contentType = response.headers.get('content-type');
        const data = contentType?.includes('application/json') ? await response.json() : {};

        if (response.ok) {
            mostrarNotificacao('Produto adicionado ao carrinho!', 'success');
            atualizarContadorCarrinho();
        } else if (response.status === 401) {
            redirectToLogin('A tua sessão expirou.');
        } else {
            mostrarNotificacao(data.erro || data.mensagem || 'Erro ao adicionar produto', 'error');
        }
    } catch {
        mostrarNotificacao('Erro de ligação ao servidor', 'error');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    atualizarContadorCarrinho();
});

console.log('✅ add-to-cart.js carregado');