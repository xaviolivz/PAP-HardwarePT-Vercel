let carouselImagens = [];
let carouselIndex = 0;

function inicializarCarrossel(imagemPrincipal, imagensExtra) {
    carouselImagens = [imagemPrincipal, ...imagensExtra.map(i => i.url)].filter(Boolean);
    carouselIndex = 0;
    atualizarCarrossel();
}

function atualizarCarrossel() {
    const img = document.getElementById('productImage');
    const dots = document.getElementById('carouselDots');
    const btnPrev = document.querySelector('.carousel-prev');
    const btnNext = document.querySelector('.carousel-next');

    if (!img) return;

    img.classList.add('transitioning');
    setTimeout(() => {
        img.src = carouselImagens[carouselIndex];
        img.classList.remove('transitioning');
    }, 150);

    if (btnPrev) btnPrev.disabled = carouselIndex === 0;
    if (btnNext) btnNext.disabled = carouselIndex === carouselImagens.length - 1;

    const wrapper = document.querySelector('.carousel-wrapper');
    if (wrapper) {
        let counter = wrapper.querySelector('.carousel-counter');
        if (carouselImagens.length > 1) {
            if (!counter) {
                counter = document.createElement('div');
                counter.className = 'carousel-counter';
                wrapper.appendChild(counter);
            }
            counter.textContent = `${carouselIndex + 1} / ${carouselImagens.length}`;
        } else if (counter) {
            counter.remove();
        }
    }

    if (dots) {
        if (carouselImagens.length > 1) {
            dots.innerHTML = carouselImagens.map((_, i) =>
                `<button class="carousel-dot ${i === carouselIndex ? 'active' : ''}" onclick="carouselIrPara(${i})" aria-label="Imagem ${i+1}"></button>`
            ).join('');
        } else {
            dots.innerHTML = '';
        }
    }
}

function carouselNav(dir) {
    const novoIndex = carouselIndex + dir;
    if (novoIndex >= 0 && novoIndex < carouselImagens.length) {
        carouselIndex = novoIndex;
        atualizarCarrossel();
    }
}

function carouselIrPara(index) {
    carouselIndex = index;
    atualizarCarrossel();
}

(function() {
    let startX = 0;
    document.addEventListener('touchstart', e => {
        const gallery = e.target.closest('.product-gallery');
        if (gallery) startX = e.touches[0].clientX;
    });
    document.addEventListener('touchend', e => {
        const gallery = e.target.closest('.product-gallery');
        if (!gallery || !startX) return;
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) carouselNav(diff > 0 ? 1 : -1);
        startX = 0;
    });
})();

async function carregarDetalhesProduto() {
    const urlParams = new URLSearchParams(window.location.search);
    const produtoId = urlParams.get('id');
    if (!produtoId) { window.location.href = 'produtos.html'; return; }

    try {
        const produto = await obterProdutoPorId(produtoId);
        if (!produto) throw new Error('Produto não encontrado');

        document.getElementById('productName').textContent = produto.nome || 'Produto';
        document.getElementById('productBreadcrumb').textContent = produto.nome || 'Produto';
        document.getElementById('productCategory').textContent = produto.categoria || 'Produto';

        const breadcrumbCategory = document.getElementById('breadcrumbCategory');
        if (breadcrumbCategory) breadcrumbCategory.textContent = produto.categoria || 'Categoria';

        document.getElementById('productImage').src = produto.imagem || 'imagens/placeholder.jpg';
        document.getElementById('productImage').alt = produto.nome || 'Produto';

        try {
            const API_URL_IMG = (typeof getApiUrl === 'function') ? getApiUrl() : ((typeof CONFIG !== 'undefined' && CONFIG.API_URL) ? CONFIG.API_URL : 'http://localhost:3000/api');
            const imgResp = await fetch(`${API_URL_IMG}/produtos/${produtoId}/imagens`);
            const imagensExtra = imgResp.ok ? await imgResp.json() : [];
            inicializarCarrossel(produto.imagem || 'imagens/placeholder.jpg', imagensExtra);
        } catch (e) {
            inicializarCarrossel(produto.imagem || 'imagens/placeholder.jpg', []);
        }

        const precoAtual = parseFloat(produto.preco) || 0;
        const currentPriceEl = document.getElementById('currentPrice');
        if (currentPriceEl) currentPriceEl.textContent = `€${precoAtual.toFixed(2)}`;

        if (produto.preco_promocional && parseFloat(produto.preco_promocional) < precoAtual) {
            const precoPromo = parseFloat(produto.preco_promocional);
            const oldPriceEl = document.getElementById('oldPrice');
            if (oldPriceEl) { oldPriceEl.textContent = `€${precoAtual.toFixed(2)}`; oldPriceEl.style.display = 'inline'; }
            if (currentPriceEl) currentPriceEl.textContent = `€${precoPromo.toFixed(2)}`;

        }

        const stockInfo = document.getElementById('stockInfo');
        const stockText = document.getElementById('stockText');
        const stockSvg  = stockInfo?.querySelector('svg');
        if (stockInfo && stockText) {
            if (produto.stock && produto.stock > 0) {
                stockText.textContent = 'Em stock';
                stockInfo.classList.remove('out-stock');
                if (stockSvg) stockSvg.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
            } else {
                stockText.textContent = 'Sem stock';
                stockInfo.classList.add('out-stock');
                if (stockSvg) stockSvg.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
            }
        }

        carregarEspecificacoes(produto);
        carregarCaracteristicas(produto);

        window.currentProductId = produtoId;
        window.currentProduct = produto;

        const actionWrapper = document.querySelector('.product-actions-detailed');
        if (actionWrapper) actionWrapper.setAttribute('data-product-id', String(produtoId));

        await carregarReviews(produtoId);

    } catch (error) {
        console.error('❌ Erro ao carregar produto:', error);
        alert('Erro ao carregar detalhes do produto: ' + error.message);
        window.location.href = 'produtos.html';
    }
}

function carregarEspecificacoes(produto) {
    const specsTable = document.getElementById('specsTable');
    if (!specsTable) return;
    const especificacoes = produto.especificacoes_tecnicas || produto.especificacoes;
    if (!especificacoes) {
        specsTable.innerHTML = '<tr><td colspan="2" style="padding:1rem;text-align:center;color:#666;">Especificações não disponíveis</td></tr>';
        return;
    }
    let specs = especificacoes;
    if (typeof specs === 'string') {
        try { specs = JSON.parse(specs); } catch (e) {
            specsTable.innerHTML = `<tr><td colspan="2" style="padding:1rem;">${specs}</td></tr>`; return;
        }
    }
    if (typeof specs === 'object' && !Array.isArray(specs)) {
        let html = '';
        for (const [chave, valor] of Object.entries(specs)) {
            html += `<tr>
                <td style="padding:0.75rem;font-weight:600;border-bottom:1px solid #e5e7eb;">${chave}</td>
                <td style="padding:0.75rem;border-bottom:1px solid #e5e7eb;">${valor}</td>
            </tr>`;
        }
        specsTable.innerHTML = html;
    } else {
        specsTable.innerHTML = `<tr><td colspan="2" style="padding:1rem;">${specs}</td></tr>`;
    }
}

function carregarCaracteristicas(produto) {
    const featuresGrid = document.getElementById('featuresGrid');
    if (!featuresGrid) return;
    if (!produto.caracteristicas) {
        featuresGrid.innerHTML = '<p style="color:#666;padding:1rem;">Características não disponíveis</p>'; return;
    }
    let caracteristicas = produto.caracteristicas;
    if (typeof caracteristicas === 'string') {
        try { caracteristicas = JSON.parse(caracteristicas); } catch (e) {
            featuresGrid.innerHTML = `<p style="padding:1rem;">${caracteristicas}</p>`; return;
        }
    }
    if (!Array.isArray(caracteristicas)) caracteristicas = [caracteristicas];

    const rows = caracteristicas.map((c, i) => `
        <tr style="border-bottom:${i < caracteristicas.length - 1 ? '1px solid #e5e7eb' : 'none'};">
            <td style="width:48px;text-align:center;vertical-align:middle;padding:14px 8px;">
                <span style="color:#22c55e;font-size:1.25rem;">✓</span>
            </td>
            <td style="color:#374151;font-size:0.9rem;padding:14px 16px 14px 0;vertical-align:middle;">${c}</td>
        </tr>
    `).join('');

    featuresGrid.innerHTML = `
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff;">
            <table style="width:100%;border-collapse:collapse;"><tbody>${rows}</tbody></table>
        </div>
    `;
}

async function carregarReviews(produtoId) {
    const container = document.getElementById('reviewsContainer');
    if (!container) return;

    container.innerHTML = '<p style="color:#666;padding:1rem;">A carregar avaliações...</p>';

    try {
        const API_URL = (typeof getApiUrl === 'function') ? getApiUrl() : ((typeof CONFIG !== 'undefined' && CONFIG.API_URL) ? CONFIG.API_URL : 'http://localhost:3000/api');
        const response = await fetch(`${API_URL}/produtos/${produtoId}/reviews`, { credentials: 'include' });

        if (!response.ok) throw new Error('Erro ao carregar reviews');
        const { reviews, stats } = await response.json();

        atualizarRatingSummary(stats);

        const authResp = await fetch(`${API_URL}/auth/verificar`, { credentials: 'include' });
        const authData = await authResp.json();
        const estaAutenticado = authData.autenticado;
        const jaAvaliou = estaAutenticado && reviews.some(r => r.e_meu);

        renderizarReviews(reviews, stats, estaAutenticado, jaAvaliou, produtoId);

    } catch (error) {
        console.error('❌ Erro ao carregar reviews:', error);
        container.innerHTML = '<p style="color:#666;padding:1rem;">Erro ao carregar avaliações.</p>';
    }
}

function atualizarRatingSummary(stats) {
    const ratingText = document.getElementById('ratingText');
    if (!ratingText) return;
    if (stats.total > 0) {
        const estrelas = renderizarEstrelas(parseFloat(stats.media));
        ratingText.innerHTML = `${estrelas} <span style="margin-left:0.5rem;">${stats.media} de 5 — ${stats.total} avaliação${stats.total !== 1 ? 'ões' : ''}</span>`;
    } else {
        ratingText.innerHTML = `<span style="color:#888;">Ainda sem avaliações</span>`;
    }
}

function renderizarEstrelas(media, tamanho = 18) {
    const estrelas = [];
    for (let i = 1; i <= 5; i++) {
        const fill = i <= Math.round(media) ? '#f59e0b' : '#d1d5db';
        estrelas.push(`<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="${fill}" style="display:inline;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`);
    }
    return estrelas.join('');
}

function renderizarReviews(reviews, stats, estaAutenticado, jaAvaliou, produtoId) {
    const container = document.getElementById('reviewsContainer');
    if (!container) return;

    let html = '';

    if (stats.total > 0) {
        const barras = [5, 4, 3, 2, 1].map(n => {
            const count = stats[['cinco','quatro','tres','dois','um'][5 - n]] || 0;
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return `
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:4px;">
                    <span style="width:1rem;font-size:0.8rem;color:#888;">${n}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:#f59e0b;border-radius:4px;"></div>
                    </div>
                    <span style="width:2rem;font-size:0.8rem;color:#888;">${count}</span>
                </div>`;
        }).join('');

        html += `
            <div style="display:flex;gap:2rem;align-items:flex-start;padding:1.5rem;background:#f9fafb;border-radius:8px;margin-bottom:1.5rem;flex-wrap:wrap;">
                <div style="text-align:center;min-width:80px;">
                    <div style="font-size:3rem;font-weight:700;color:#111;">${stats.media}</div>
                    <div>${renderizarEstrelas(parseFloat(stats.media))}</div>
                    <div style="color:#888;font-size:0.85rem;margin-top:4px;">${stats.total} avaliações</div>
                </div>
                <div style="flex:1;min-width:200px;">${barras}</div>
            </div>`;
    }

    if (estaAutenticado && !jaAvaliou) {
        html += `
            <div id="formReview" style="border:1px solid #e5e7eb;border-radius:8px;padding:1.5rem;margin-bottom:1.5rem;background:#fff;">
                <h4 style="margin:0 0 1rem;font-size:1rem;">Escrever uma Avaliação</h4>
                <div style="margin-bottom:1rem;">
                    <label style="display:block;font-size:0.85rem;color:#555;margin-bottom:0.4rem;">Classificação *</label>
                    <div id="starSelector" style="display:flex;gap:4px;cursor:pointer;">
                        ${[1,2,3,4,5].map(n => `
                            <svg data-star="${n}" onclick="selecionarEstrela(${n})" onmouseover="destacarEstrelas(${n})" onmouseout="restaurarEstrelas()"
                                 width="28" height="28" viewBox="0 0 24 24" fill="#d1d5db" style="cursor:pointer;transition:fill 0.1s;" id="star-${n}">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>`).join('')}
                    </div>
                    <input type="hidden" id="classificacaoInput" value="0">
                </div>
                <div style="margin-bottom:1rem;">
                    <label style="display:block;font-size:0.85rem;color:#555;margin-bottom:0.4rem;">Título (opcional)</label>
                    <input type="text" id="tituloReview" maxlength="100" placeholder="Resumo da sua opinião"
                           style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;box-sizing:border-box;">
                </div>
                <div style="margin-bottom:1rem;">
                    <label style="display:block;font-size:0.85rem;color:#555;margin-bottom:0.4rem;">Comentário *</label>
                    <textarea id="comentarioReview" rows="4" minlength="10" placeholder="Partilhe a sua experiência com este produto (mínimo 10 caracteres)"
                              style="width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;resize:vertical;box-sizing:border-box;"></textarea>
                </div>
                <div id="reviewErro" style="color:#dc2626;font-size:0.85rem;min-height:1.2rem;margin-bottom:0.5rem;"></div>
                <button onclick="submeterReview('${produtoId}')"
                        style="background:#111;color:#fff;border:none;padding:0.65rem 1.5rem;border-radius:6px;cursor:pointer;font-size:0.9rem;font-weight:600;">
                    Publicar Avaliação
                </button>
            </div>`;
    } else if (!estaAutenticado) {
        html += `
            <div style="padding:1rem;background:#f9fafb;border-radius:8px;margin-bottom:1.5rem;text-align:center;color:#555;border:1px dashed #d1d5db;">
                <a href="login.html" style="color:#111;font-weight:600;">Inicie sessão</a> para avaliar este produto.
            </div>`;
    } else if (jaAvaliou) {
        html += `
            <div style="padding:1rem;background:#f0fdf4;border-radius:8px;margin-bottom:1.5rem;color:#166534;border:1px solid #bbf7d0;">
                ✓ Já avaliou este produto.
            </div>`;
    }

    if (reviews.length === 0) {
        html += '<p style="color:#888;padding:1rem 0;">Ainda não há avaliações. Seja o primeiro a avaliar!</p>';
    } else {
        html += reviews.map(r => `
            <div style="border-bottom:1px solid #e5e7eb;padding:1.2rem 0;">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div style="width:36px;height:36px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;color:#555;">
                            ${r.utilizador_nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight:600;font-size:0.9rem;">${escapeHtml(r.utilizador_nome)}</div>
                            <div style="font-size:0.75rem;color:#888;">${new Date(r.data_criacao).toLocaleDateString('pt-PT')}</div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div>${renderizarEstrelas(r.classificacao, 16)}</div>
                        ${r.e_meu ? `<button onclick="apagarReview(${r.id}, '${produtoId}')"
                            style="background:none;border:1px solid #fca5a5;color:#dc2626;padding:0.2rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.75rem;">
                            Apagar
                        </button>` : ''}
                    </div>
                </div>
                ${r.titulo ? `<div style="font-weight:600;margin:0.75rem 0 0.25rem;">${escapeHtml(r.titulo)}</div>` : '<div style="margin-top:0.75rem;"></div>'}
                <p style="color:#374151;font-size:0.9rem;line-height:1.6;margin:0;">${escapeHtml(r.comentario)}</p>
            </div>
        `).join('');
    }

    container.innerHTML = html;
}

let classificacaoSelecionada = 0;

function selecionarEstrela(n) {
    classificacaoSelecionada = n;
    document.getElementById('classificacaoInput').value = n;
    destacarEstrelas(n, true);
}

function destacarEstrelas(n, fixar = false) {
    for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`star-${i}`);
        if (star) star.setAttribute('fill', i <= n ? '#f59e0b' : '#d1d5db');
    }
}

function restaurarEstrelas() {
    destacarEstrelas(classificacaoSelecionada, true);
}

async function submeterReview(produtoId) {
    const classificacao = parseInt(document.getElementById('classificacaoInput').value);
    const titulo = document.getElementById('tituloReview').value.trim();
    const comentario = document.getElementById('comentarioReview').value.trim();
    const erroEl = document.getElementById('reviewErro');

    erroEl.textContent = '';

    if (!classificacao || classificacao < 1) { erroEl.textContent = 'Por favor selecione uma classificação.'; return; }
    if (comentario.length < 10) { erroEl.textContent = 'O comentário deve ter pelo menos 10 caracteres.'; return; }

    const btn = document.querySelector('#formReview button');
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'A publicar...';

    try {
        const API_URL = (typeof getApiUrl === 'function') ? getApiUrl() : ((typeof CONFIG !== 'undefined' && CONFIG.API_URL) ? CONFIG.API_URL : 'http://localhost:3000/api');
        const response = await fetch(`${API_URL}/produtos/${produtoId}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ classificacao, titulo, comentario })
        });
        const data = await response.json();
        if (response.ok) {
            await carregarReviews(produtoId);
        } else {
            erroEl.textContent = data.erro || 'Erro ao publicar avaliação.';
            btn.disabled = false;
            btn.textContent = textoOriginal;
        }
    } catch (error) {
        erroEl.textContent = 'Erro de ligação ao servidor.';
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
}

async function apagarReview(reviewId, produtoId) {
    if (!confirm('Tem a certeza que quer apagar esta avaliação?')) return;
    try {
        const API_URL = (typeof getApiUrl === 'function') ? getApiUrl() : ((typeof CONFIG !== 'undefined' && CONFIG.API_URL) ? CONFIG.API_URL : 'http://localhost:3000/api');
        const response = await fetch(`${API_URL}/reviews/${reviewId}`, { method: 'DELETE', credentials: 'include' });
        if (response.ok) {
            await carregarReviews(produtoId);
        } else {
            const data = await response.json();
            alert(data.erro || 'Erro ao apagar avaliação.');
        }
    } catch (error) {
        alert('Erro de ligação ao servidor.');
    }
}

async function addToCartFromDetails() {
    if (!window.currentProduct) {
        alert('Erro: produto não carregado. Recarregue a página.');
        return;
    }

    const stockDisponivel = parseInt(window.currentProduct.stock) || 0;
    if (stockDisponivel <= 0) {
        mostrarNotificacao('Produto sem stock disponível', 'error');
        return;
    }

    const quantityInput = document.getElementById('productQuantity');
    const quantidade = parseInt(quantityInput?.value) || 1;

    if (quantidade > stockDisponivel) {
        mostrarNotificacao(`Stock insuficiente. Disponível: ${stockDisponivel} unidades`, 'error');
        return;
    }

    const produtoId = Number(window.currentProduct.id);
    const botao = document.querySelector('.btn-add-to-cart');

    if (botao) {
        botao.disabled = true;
        botao.style.opacity = '0.7';
    }

    const API_URL = (typeof getApiUrl === 'function') ? getApiUrl() : ((typeof CONFIG !== 'undefined' && CONFIG.API_URL) ? CONFIG.API_URL : 'http://localhost:3000/api');
    let autenticado = false;

    try {
        const authResp = await fetch(`${API_URL}/auth/verificar`, { credentials: 'include' });
        const authData = await authResp.json();
        autenticado = authData.autenticado === true;
    } catch (e) {
        autenticado = false;
    }

    if (!autenticado) {
        sessionStorage.setItem('authRedirectMessage', 'Precisas de fazer login para adicionar produtos ao carrinho.');
        sessionStorage.setItem('authRedirectBack', window.location.href);
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/carrinho/adicionar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ produto_id: produtoId, quantidade: quantidade })
        });

        let data = {};
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }

        if (response.ok) {
            if (botao) {
                const textoOriginal = botao.innerHTML;
                botao.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Adicionado!`;
                botao.style.background = '#22c55e';
                botao.style.opacity = '1';
                setTimeout(() => {
                    botao.innerHTML = textoOriginal;
                    botao.style.background = '';
                    botao.disabled = false;
                }, 2000);
            }
            mostrarNotificacao('Produto adicionado ao carrinho!', 'success');

            if (typeof atualizarContadorCarrinho === 'function') {
                atualizarContadorCarrinho();
            }
        } else if (response.status === 401) {
            sessionStorage.setItem('authRedirectMessage', 'A tua sessão expirou. Faz login novamente.');
            window.location.href = 'login.html';
        } else {
            const erroMsg = data.erro || data.mensagem || `Erro ${response.status}`;
            console.error('❌ Erro da API ao adicionar ao carrinho:', erroMsg);
            mostrarNotificacao(erroMsg, 'error');
            if (botao) { botao.disabled = false; botao.style.opacity = '1'; }
        }
    } catch (error) {
        console.error('❌ Erro de ligação ao adicionar ao carrinho:', error);
        mostrarNotificacao('Erro de ligação ao servidor', 'error');
        if (botao) { botao.disabled = false; botao.style.opacity = '1'; }
    }
}

function increaseQuantity() {
    const quantityInput = document.getElementById('productQuantity');
    if (!quantityInput) return;
    let currentValue = parseInt(quantityInput.value) || 1;
    const maxStock = window.currentProduct?.stock || 99;
    if (currentValue < maxStock && currentValue < 99) { quantityInput.value = currentValue + 1; updateDecreaseButton(); }
}

function decreaseQuantity() {
    const quantityInput = document.getElementById('productQuantity');
    if (!quantityInput) return;
    let currentValue = parseInt(quantityInput.value) || 1;
    if (currentValue > 1) { quantityInput.value = currentValue - 1; updateDecreaseButton(); }
}

function updateDecreaseButton() {
    const quantityInput = document.getElementById('productQuantity');
    const decreaseBtn = document.getElementById('decreaseBtn');
    if (!decreaseBtn || !quantityInput) return;
    decreaseBtn.disabled = parseInt(quantityInput.value) <= 1;
}

function openTab(tabName, btn) {
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) selectedTab.classList.add('active');
    if (btn) btn.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    carregarDetalhesProduto();
    updateDecreaseButton();
});