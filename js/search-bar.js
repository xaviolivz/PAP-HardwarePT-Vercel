function inicializarPesquisaPCDiga() {
    const searchInput = document.getElementById('searchInput');
    const searchDropdown = document.getElementById('searchDropdown');
    const searchClear = document.getElementById('searchClear');
    
    if (!searchInput) return;

    let timeoutId = null;
    let todosOsProdutos = [];

    carregarTodosProdutos();

    async function carregarTodosProdutos() {
        const API_URL = (typeof CONFIG !== 'undefined') ? CONFIG.API_URL : 'http://localhost:3000';
        try {
            const res = await fetch(`${API_URL}/produtos`, { credentials: 'include' });
            const contentType = res.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                todosOsProdutos = await res.json();
            }
        } catch (e) {
            console.error('Erro ao carregar produtos para pesquisa:', e);
        }
    }

    searchInput.addEventListener('input', (e) => {
        const termo = e.target.value.trim();
        searchClear.style.display = termo ? 'flex' : 'none';
        
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        if (!termo) {
            searchDropdown.classList.remove('active');
            return;
        }

        timeoutId = setTimeout(() => {
            pesquisarProdutos(termo.toLowerCase());
        }, 200);
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.style.display = 'none';
        searchDropdown.classList.remove('active');
        searchInput.focus();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.header-search')) {
            searchDropdown.classList.remove('active');
        }
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
            searchDropdown.classList.add('active');
        }
    });

    function pesquisarProdutos(termo) {
        const resultados = todosOsProdutos.filter(p => {
            const nome = (p.nome || '').toLowerCase();
            const categoria = (p.categoria || '').toLowerCase();
            const descricao = (p.descricao || '').toLowerCase();
            
            return nome.includes(termo) || 
                   categoria.includes(termo) || 
                   descricao.includes(termo);
        });

        mostrarResultados(resultados, termo);
    }

    function mostrarResultados(produtos, termo) {
        if (!produtos || produtos.length === 0) {
            searchDropdown.innerHTML = `
                <div class="search-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <p>Nenhum resultado encontrado</p>
                    <small>Tente pesquisar com outros termos</small>
                </div>
            `;
            searchDropdown.classList.add('active');
            return;
        }

        const resultadosLimitados = produtos.slice(0, 6);
        
        searchDropdown.innerHTML = `
            <div class="search-header-drop">
                <span>${produtos.length} produto${produtos.length !== 1 ? 's' : ''} encontrado${produtos.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="search-list">
                ${resultadosLimitados.map(p => {
                    const precoFinal = parseFloat(p.preco_promocional || p.preco).toFixed(2);
                    const precoOriginal = parseFloat(p.preco).toFixed(2);
                    const desconto = p.preco_promocional
                        ? Math.round((1 - p.preco_promocional / p.preco) * 100)
                        : 0;

                    return `
                        <a href="produto-detalhes.html?id=${p.id}" class="search-item-drop">
                            <div class="search-item-img">
                                <img src="${p.imagem || 'imagens/placeholder.jpg'}" 
                                     alt="${p.nome}"
                                     onerror="this.src='https://via.placeholder.com/60x60/1d3557/ffffff?text=Img'">
                            </div>
                            <div class="search-item-details">
                                <span class="search-item-cat">${p.categoria || ''}</span>
                                <h4 class="search-item-title">${p.nome}</h4>
                                <div class="search-item-pricing">
                                    ${desconto > 0 ? `<span class="search-badge-disc">-${desconto}%</span>` : ''}
                                    <span class="search-price-now">€${precoFinal}</span>
                                    ${p.preco_promocional ? `<span class="search-price-before">€${precoOriginal}</span>` : ''}
                                </div>
                            </div>
                        </a>
                    `;
                }).join('')}
            </div>
            ${produtos.length > 6 ? `
                <div class="search-footer-drop">
                    <a href="produtos.html?search=${encodeURIComponent(termo)}" class="btn-ver-todos-drop">
                        Ver todos os ${produtos.length} resultados
                    </a>
                </div>
            ` : ''}
        `;
        
        searchDropdown.classList.add('active');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarPesquisaPCDiga);
} else {
    inicializarPesquisaPCDiga();
}