(() => {
  const getConfig = () => {
    const g = typeof window !== 'undefined' ? window.CONFIG : undefined;
    if (g && Array.isArray(g.CATEGORIAS)) return g;
    return { API_URL: 'http://localhost:3000', PRODUCTS_PER_PAGE: 12, CATEGORIAS: [] };
  };

  const CONFIG = getConfig();
  const POR_PAGINA = CONFIG.PRODUCTS_PER_PAGE || 12;
  const API = CONFIG.API_URL || 'http://localhost:3000';
  const fmt = p => `€${Number(p || 0).toFixed(2)}`;

  let paginaAtual = 1;
  let totalPaginas = 1;
  let todosProdutos = [];
  let _listaFiltrada = [];
  const filtrosURL = {};

  function lerURL() {
    const p = new URLSearchParams(window.location.search);
    const titulo = document.getElementById('pageTitle');
    const search = document.getElementById('searchInput');
    if (p.get('categoria')) {
      filtrosURL.categoria = p.get('categoria');
      if (titulo) titulo.textContent = p.get('categoria').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    }
    if (p.get('pesquisa')) {
      filtrosURL.pesquisa = p.get('pesquisa');
      if (search) search.value = filtrosURL.pesquisa;
      if (titulo) titulo.textContent = `Resultados para "${filtrosURL.pesquisa}"`;
    }
    if (p.get('promocao')) { filtrosURL.promocao = true; if (titulo) titulo.textContent = 'Promoções'; }
    if (p.get('destaque'))  { filtrosURL.destaque  = true; if (titulo) titulo.textContent = 'Destaques'; }
  }

  function construirCategorias(produtos) {
    const container = document.getElementById('filtroCategorias');
    if (!container) return;
    const contagem = {};
    produtos.forEach(p => { const c = p.categoria || 'Outros'; contagem[c] = (contagem[c]||0)+1; });
    container.innerHTML = `<label class="fopt"><input type="radio" name="cat" value="" checked onchange="aplicarFiltros()"> Todas <span style="color:#9ca3af;font-size:0.75rem">(${produtos.length})</span></label>`;
    Object.entries(contagem).sort((a,b)=>b[1]-a[1]).forEach(([cat,n]) => {
      const slug = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-');
      container.innerHTML += `<label class="fopt"><input type="radio" name="cat" value="${slug}" onchange="aplicarFiltros()"> ${cat} <span style="color:#9ca3af;font-size:0.75rem">(${n})</span></label>`;
    });
    if (filtrosURL.categoria) {
      const r = container.querySelector(`input[value="${filtrosURL.categoria}"]`);
      if (r) r.checked = true;
    }
  }

  function configurarSlider(produtos) {
    const precos = produtos.map(p => Number(p.preco_promocional||p.preco||0)).filter(Boolean);
    if (!precos.length) return;
    const maxV = Math.ceil(Math.max(...precos));
    const slider = document.getElementById('filtroPrecoMax');
    const label  = document.getElementById('precoMaxVal');
    if (!slider) return;
    slider.max = maxV; slider.value = maxV;
    if (label) label.textContent = `€${maxV}`;
  }

  function aplicarFiltros() {
    paginaAtual = 1;
    const catSel  = document.querySelector('input[name="cat"]:checked')?.value || '';
    const ordem   = document.getElementById('filtroOrdem')?.value || '';
    const precoMax = parseInt(document.getElementById('filtroPrecoMax')?.value || 999999);
    const stock   = document.getElementById('filtroStock')?.checked || false;
    const promo   = document.getElementById('filtroPromo')?.checked || false;

    const temFiltro = catSel || ordem || stock || promo;
    const btnLimpar = document.getElementById('btnLimparFiltros');
    if (btnLimpar) btnLimpar.style.display = temFiltro ? 'block' : 'none';

    let lista = [...todosProdutos];
    if (filtrosURL.pesquisa) {
      const t = filtrosURL.pesquisa.toLowerCase();
      lista = lista.filter(p => p.nome?.toLowerCase().includes(t) || (p.especificacoes_tecnicas||p.especificacoes||'').toLowerCase().includes(t));
    }
    if (filtrosURL.promocao) lista = lista.filter(p => p.preco_promocional || p.em_promocao);
    if (filtrosURL.destaque)  lista = lista.filter(p => p.destaque);

    if (catSel) {
      lista = lista.filter(p => {
        const s = (p.categoria||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-');
        return s === catSel;
      });
    }
    if (stock) lista = lista.filter(p => Number(p.stock) > 0);
    if (promo) lista = lista.filter(p => p.preco_promocional || p.em_promocao);
    lista = lista.filter(p => Number(p.preco_promocional||p.preco||0) <= precoMax);

    if (ordem === 'preco_asc')  lista.sort((a,b) => Number(a.preco_promocional||a.preco)-Number(b.preco_promocional||b.preco));
    if (ordem === 'preco_desc') lista.sort((a,b) => Number(b.preco_promocional||b.preco)-Number(a.preco_promocional||a.preco));
    if (ordem === 'nome_asc')   lista.sort((a,b) => (a.nome||'').localeCompare(b.nome||''));

    _listaFiltrada = lista;
    renderizar(lista);
  }

  function renderizar(lista) {
    const container = document.getElementById('productsGrid');
    if (!container) return;
    totalPaginas = Math.max(1, Math.ceil(lista.length/POR_PAGINA));
    paginaAtual  = Math.min(paginaAtual, totalPaginas);
    const inicio = (paginaAtual-1)*POR_PAGINA;
    const pagina = lista.slice(inicio, inicio+POR_PAGINA);
    atualizarContador(lista.length);

    if (!pagina.length) {
      container.innerHTML = `<div class="empty-state"><h3>Nenhum produto encontrado</h3><p>Tente ajustar os filtros.</p><button onclick="limparFiltros()" class="btn btn-primary">Limpar Filtros</button></div>`;
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    container.innerHTML = pagina.map(p => `
      <div class="product-card">
        <div class="product-image">
          ${p.preco_promocional ? '<span class="product-badge">Promoção</span>' : ''}
          <a href="produto-detalhes.html?id=${p.id}">
            <img src="${p.imagem || 'imagens/placeholder.jpg'}" alt="${p.nome}" onerror="this.src='imagens/placeholder.jpg'">
          </a>
        </div>
        <div class="product-info">
          <span class="product-category">${p.categoria || ''}</span>
          <h3 class="product-name"><a href="produto-detalhes.html?id=${p.id}">${p.nome}</a></h3>
          <p class="product-specs" style="font-size:0.78rem;color:#6b7280;margin:4px 0 8px;line-height:1.4">${p.especificacoes || p.especificacoes_tecnicas || ''}</p>
          <div class="product-footer">
            <div class="product-price">
              ${p.preco_promocional ? `<span class="old-price">${fmt(p.preco)}</span>` : ''}
              <span class="current-price">${fmt(p.preco_promocional || p.preco)}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    renderizarPaginacao();
  }

  function atualizarContador(n) {
    const el = document.getElementById('resultsCount');
    if (el) el.textContent = `${n} produto${n !== 1 ? 's' : ''}`;
  }

  function renderizarPaginacao() {
    const container = document.getElementById('pagination');
    if (!container || totalPaginas <= 1) { if(container) container.innerHTML=''; return; }
    let html = '';
    const svgAnterior = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 4 6 8 10 12"/></svg>`;
    const svgProxima  = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 4 10 8 6 12"/></svg>`;
    if (paginaAtual > 1) html += `<button class="page-prev" onclick="mudarPagina(${paginaAtual-1})" aria-label="Anterior">${svgAnterior}</button>`;
    for (let i=1; i<=totalPaginas; i++) html += `<button class="${i===paginaAtual?'active':''}" onclick="mudarPagina(${i})">${i}</button>`;
    if (paginaAtual < totalPaginas) html += `<button class="page-next" onclick="mudarPagina(${paginaAtual+1})" aria-label="Próxima">${svgProxima}</button>`;
    container.innerHTML = html;
  }

  async function carregarProdutos() {
    const container = document.getElementById('productsGrid');
    if (!container) return;
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const res = await fetch(`${API}/produtos`);
      if (!res.ok) throw new Error('Erro ao carregar produtos');
      todosProdutos = await res.json();
      construirCategorias(todosProdutos);
      configurarSlider(todosProdutos);
      aplicarFiltros();
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><h3>Erro ao carregar produtos</h3><p>${err.message}</p><button onclick="carregarProdutos()" class="btn btn-primary">Tentar Novamente</button></div>`;
    }
  }

  function mudarPagina(n) {
    paginaAtual = n;
    renderizar(_listaFiltrada);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function limparFiltros() {
    const r = document.querySelectorAll('input[name="cat"]'); if (r[0]) r[0].checked = true;
    const o = document.getElementById('filtroOrdem'); if (o) o.value = '';
    const s = document.getElementById('filtroStock'); if (s) s.checked = false;
    const pr = document.getElementById('filtroPromo'); if (pr) pr.checked = false;
    const sl = document.getElementById('filtroPrecoMax');
    if (sl) { sl.value = sl.max; document.getElementById('precoMaxVal').textContent = `€${sl.max}`; }
    const btn = document.getElementById('btnLimparFiltros'); if (btn) btn.style.display = 'none';
    paginaAtual = 1;
    aplicarFiltros();
  }

  function inicializarPesquisa() {
    const input = document.getElementById('searchInput');
    const btn   = document.getElementById('searchBtn');
    const go = () => { const v = input?.value.trim(); if (v?.length >= 2) window.location.href = `produtos.html?pesquisa=${encodeURIComponent(v)}`; };
    input?.addEventListener('keyup', e => { if (e.key === 'Enter') go(); });
    btn?.addEventListener('click', go);
  }

  window.aplicarFiltros   = aplicarFiltros;
  window.mudarPagina      = mudarPagina;
  window.limparFiltros    = limparFiltros;
  window.carregarProdutos = carregarProdutos;
  window.ordenarProdutos  = aplicarFiltros;
  window.aplicarFiltroPeco= aplicarFiltros;
  window.searchProducts   = () => { const i = document.getElementById('searchInput'); if (i?.value.trim().length >= 2) window.location.href = `produtos.html?pesquisa=${encodeURIComponent(i.value.trim())}`; };

  document.addEventListener('DOMContentLoaded', () => {
    lerURL();
    carregarProdutos();
    inicializarPesquisa();
  });
})();