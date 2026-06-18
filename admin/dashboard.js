const API = (typeof CONFIG !== 'undefined' && CONFIG.API_URL)
  ? CONFIG.API_URL.replace('/api', '')
  : 'http://localhost:3000';

const ADMIN_API = `${API}/api/admin`;

let produtos     = [];
let utilizadores = [];
let encomendas   = [];
let encomendaAtual = null;

const CATEGORIAS = (typeof CONFIG !== 'undefined' && CONFIG.CATEGORIAS) ? CONFIG.CATEGORIAS : [
  { id: 1, slug: 'processadores',  nome: 'Processadores'  },
  { id: 2, slug: 'placas-graficas', nome: 'Placas Gráficas' },
  { id: 3, slug: 'memoria-ram',    nome: 'Memórias RAM'    },
  { id: 4, slug: 'armazenamento',  nome: 'Armazenamento'  },
  { id: 5, slug: 'motherboards',   nome: 'Motherboards'   },
  { id: 6, slug: 'fontes-de-alimentacao', nome: 'Fontes de Alimentação' },
  { id: 7, slug: 'caixas-pc',            nome: 'Caixas de PC'         },
  { id: 8, slug: 'refrigeracao',         nome: 'Coolers'              },
  { id: 9, slug: 'acessorios',     nome: 'Acessórios'     },
];

async function verificarAdmin() {
  try {
    const r = await fetch(`${API}/api/auth/verificar`, { credentials: 'include' });
    const d = await r.json();
    if (!d.autenticado) { window.location.href = '../login.html'; return; }
    if (d.utilizador.role !== 'admin') {
      alert('Acesso negado!');
      window.location.href = '../index.html';
    }
  } catch (e) {
    console.warn('Não foi possível verificar sessão:', e);
  }
}

const sectionTitles = {
  overview:     'Visão Geral',
  produtos:     'Produtos',
  promocoes:    'Promoções',
  encomendas:   'Encomendas',
  utilizadores: 'Utilizadores',
};

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`sec-${name}`).classList.add('active');
  document.querySelector(`[onclick="showSection('${name}')"]`)?.classList.add('active');
  document.getElementById('topbarTitle').textContent = sectionTitles[name] || name;

  if (name === 'overview')     carregarOverview();
  if (name === 'produtos')     carregarProdutos();
  if (name === 'promocoes')    { carregarProdutos().then(renderPromocoes); }
  if (name === 'encomendas')   carregarEncomendas();
  if (name === 'utilizadores') carregarUtilizadores();
  if (name === 'mensagens')    carregarMensagens();
}

function notify(msg, type = 'success') {
  const el = document.getElementById('notification');
  el.textContent = msg;
  el.className = `notification show ${type}`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

function openModal(type) {
  document.getElementById(`modal-${type}`).classList.add('open');

  if (type === 'produto') {
    document.getElementById('modal-produto-title').textContent = 'Novo Produto';
    document.getElementById('p-id').value         = '';
    document.getElementById('p-nome').value       = '';
    document.getElementById('p-specs').value      = '';
    kvLoad('p-specs-tecnicas-editor', null);
    listLoad('p-caracteristicas-editor', null);
    document.getElementById('p-preco').value      = '';
    document.getElementById('p-stock').value      = '';
    document.getElementById('p-imagem').value     = '';
    popularSelectCategorias('p-categoria');
  }

  if (type === 'promocao') {
    popularSelectProdutos('promo-produto');
    document.getElementById('promo-preco').value                    = '';
    document.getElementById('promo-desconto').value                 = '';
    document.getElementById('promo-preco-atual').style.display      = 'none';
    document.getElementById('promo-produto').onchange = calcularDesconto;
    document.getElementById('promo-preco').oninput    = calcularDesconto;
  }
}

function closeModal(type) {
  document.getElementById(`modal-${type}`).classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-backdrop').forEach(b => {
    b.addEventListener('click', e => { if (e.target === b) b.classList.remove('open'); });
  });
});

function popularSelectCategorias(id) {
  const sel = document.getElementById(id);
  sel.innerHTML = CATEGORIAS.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
}

function popularSelectProdutos(id) {
  const sel = document.getElementById(id);
  sel.innerHTML = produtos.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
}

function calcularDesconto() {
  const pid        = parseInt(document.getElementById('promo-produto').value);
  const promoPreco = parseFloat(document.getElementById('promo-preco').value);
  const p = produtos.find(x => x.id === pid);

  const indicador    = document.getElementById('promo-preco-atual');
  const indicadorVal = document.getElementById('promo-preco-atual-val');
  if (p) {
    indicador.style.display = 'block';
    indicadorVal.textContent = `${parseFloat(p.preco).toFixed(2)}€`;
  } else {
    indicador.style.display = 'none';
  }

  if (p && promoPreco > 0 && promoPreco < p.preco) {
    const desc = ((p.preco - promoPreco) / p.preco * 100).toFixed(0);
    document.getElementById('promo-desconto').value = `${desc}% de desconto`;
  } else {
    document.getElementById('promo-desconto').value = '';
  }
}

async function carregarOverview() {
  try {
    const r = await fetch(`${ADMIN_API}/stats`, { credentials: 'include' });
    if (!r.ok) throw new Error('Erro stats');
    const d = await r.json();

    document.getElementById('stat-produtos').textContent   = d.total_produtos    || 0;
    document.getElementById('stat-users').textContent      = d.total_utilizadores || 0;
    document.getElementById('stat-encomendas').textContent = d.total_encomendas  || 0;
    document.getElementById('stat-promo').textContent      = d.total_promocoes   || 0;

    const stockBaixo = d.stock_baixo || [];
    document.getElementById('overview-stock-table').innerHTML = stockBaixo.length
      ? `<table><thead><tr><th>Produto</th><th>Stock</th></tr></thead><tbody>
          ${stockBaixo.map(p => `
            <tr>
              <td>${p.nome}</td>
              <td><span class="badge ${p.stock <= 5 ? 'badge-red' : 'badge-orange'}">${p.stock} un.</span></td>
            </tr>`).join('')}
         </tbody></table>`
      : `<div class="empty-state"><p>Sem produtos em stock baixo ✅</p></div>`;

    const ultimas = d.ultimas_encomendas || [];
    document.getElementById('overview-encomendas-table').innerHTML = ultimas.length
      ? `<table><thead><tr><th>#</th><th>Cliente</th><th>Estado</th></tr></thead><tbody>
          ${ultimas.map(e => `
            <tr>
              <td class="mono">#${e.id}</td>
              <td>${e.cliente_nome || '—'}</td>
              <td>${estadoBadge(e.estado)}</td>
            </tr>`).join('')}
         </tbody></table>`
      : `<div class="empty-state"><p>Sem encomendas ainda</p></div>`;

  } catch (e) {
    console.error('Erro ao carregar overview:', e);
    document.getElementById('stat-produtos').textContent   = produtos.filter(p => p.ativo).length;
    document.getElementById('stat-users').textContent      = utilizadores.length || '—';
    document.getElementById('stat-encomendas').textContent = encomendas.length  || '—';
    document.getElementById('stat-promo').textContent      = produtos.filter(p => p.preco_promocional).length;
  }
}

async function carregarProdutos() {
  try {
    const r = await fetch(`${ADMIN_API}/produtos`, { credentials: 'include' });
    if (r.ok) produtos = await r.json();
  } catch (e) {
    console.warn('Erro ao carregar produtos da BD:', e);
  }
  renderProdutos();
}

function renderProdutos(lista) {
  const arr = lista || produtos;

  const catSel = document.getElementById('cat-filter');
  if (catSel && catSel.options.length <= 1) {
    CATEGORIAS.forEach(c => catSel.add(new Option(c.nome, c.slug)));
  }

  const tbody = document.getElementById('produtos-tbody');
  if (!arr.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Sem produtos</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = arr.map(p => {
    const catNome = CATEGORIAS.find(c => c.id === p.categoria_id)?.nome || p.categoria || '—';
    return `
    <tr data-search="${(p.nome + (p.categoria || '')).toLowerCase()}" data-cat="${p.categoria_slug || ''}">
      <td style="display:flex;align-items:center;gap:10px;">
        <div>
          <div style="font-weight:500;">${p.nome}</div>
          <div style="font-size:.72rem;color:var(--text3);">${(typeof p.especificacoes === 'object' ? JSON.stringify(p.especificacoes) : (p.especificacoes || '')).substring(0, 40)}</div>
        </div>
      </td>
      <td><span class="badge badge-gray">${catNome}</span></td>
      <td class="mono">€${parseFloat(p.preco).toFixed(2)}</td>
      <td><span class="badge ${p.stock <= 5 ? 'badge-red' : p.stock <= 10 ? 'badge-orange' : 'badge-green'}">${p.stock}</span></td>
      <td><span class="badge ${p.ativo ? 'badge-green' : 'badge-gray'}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td style="display:flex;gap:6px;">
        <button class="btn-icon" title="Editar" onclick="editarProduto(${p.id})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon" title="Gerir Imagens" onclick="abrirModalImagens(${p.id}, '${(p.nome||'').replace(/'/g,'')}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <button class="btn-icon" title="${p.ativo ? 'Desativar' : 'Ativar'}" onclick="toggleAtivo(${p.id})">
          ${p.ativo
            ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
            : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/></svg>'
          }
        </button>
      </td>
    </tr>`;
  }).join('');
}

function filtrarTabela(tbodyId, termo) {
  document.querySelectorAll(`#${tbodyId} tr`).forEach(r => {
    const search = r.dataset.search || r.textContent.toLowerCase();
    r.style.display = search.includes(termo.toLowerCase()) ? '' : 'none';
  });
}

function filtrarPorCategoria(slug) {
  document.querySelectorAll('#produtos-tbody tr').forEach(r => {
    r.style.display = (!slug || r.dataset.cat === slug) ? '' : 'none';
  });
}

function editarProduto(id) {
  const p = produtos.find(x => x.id === id);
  if (!p) return;
  openModal('produto');
  document.getElementById('modal-produto-title').textContent = 'Editar Produto';
  document.getElementById('p-id').value         = p.id;
  document.getElementById('p-nome').value       = p.nome;
  document.getElementById('p-specs').value      = typeof p.especificacoes === 'object' ? JSON.stringify(p.especificacoes) : (p.especificacoes || '');
  kvLoad('p-specs-tecnicas-editor', p.especificacoes_tecnicas);
  listLoad('p-caracteristicas-editor', p.caracteristicas);
  document.getElementById('p-preco').value      = p.preco;
  document.getElementById('p-stock').value      = p.stock ?? 0;
  document.getElementById('p-imagem').value     = p.imagem || '';
  popularSelectCategorias('p-categoria');
  document.getElementById('p-categoria').value  = p.categoria_id;
}

async function toggleAtivo(id) {
  const p = produtos.find(x => x.id === id);
  if (!p) return;
  const novoAtivo = !(p.ativo == 1 || p.ativo === true);

  try {
    const r = await fetch(`${ADMIN_API}/produtos/${id}/ativo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ativo: novoAtivo }),
    });
    if (!r.ok) throw new Error();
    p.ativo = novoAtivo;
    renderProdutos();
    notify(`Produto ${novoAtivo ? 'ativado' : 'desativado'}`);
  } catch (e) {
    notify('Erro ao atualizar produto', 'error');
  }
}

function kvAddRow(editorId, key = '', value = '') {
  const editor = document.getElementById(editorId);
  const row = document.createElement('div');
  row.className = 'kv-row';
  row.innerHTML = `
    <input class="kv-row-key" type="text" placeholder="Campo (ex: Socket)" value="${key.replace(/"/g,'&quot;')}">
    <input class="kv-row-val" type="text" placeholder="Valor (ex: AM5)" value="${value.replace(/"/g,'&quot;')}">
    <button type="button" class="kv-del" onclick="this.parentElement.remove()" title="Remover">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  editor.appendChild(row);
}

function kvLoad(editorId, obj) {
  const editor = document.getElementById(editorId);
  editor.innerHTML = '';
  if (obj && typeof obj === 'object') {
    Object.entries(obj).forEach(([k, v]) => kvAddRow(editorId, k, String(v)));
  }
}

function kvRead(editorId) {
  const editor = document.getElementById(editorId);
  const rows = editor.querySelectorAll('.kv-row');
  const result = {};
  rows.forEach(row => {
    const key = row.querySelector('.kv-row-key').value.trim();
    const val = row.querySelector('.kv-row-val').value.trim();
    if (key) result[key] = val;
  });
  return Object.keys(result).length ? result : null;
}

function listAddRow(editorId, value = '') {
  const editor = document.getElementById(editorId);
  const row = document.createElement('div');
  row.className = 'kv-row';
  row.innerHTML = `
    <input class="list-row-val" type="text" placeholder="Ex: Design premium" value="${value.replace(/"/g,'&quot;')}" style="flex:1;">
    <button type="button" class="kv-del" onclick="this.parentElement.remove()" title="Remover">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  editor.appendChild(row);
}

function listLoad(editorId, arr) {
  const editor = document.getElementById(editorId);
  editor.innerHTML = '';
  if (Array.isArray(arr)) {
    arr.forEach(v => listAddRow(editorId, String(v)));
  }
}

function listRead(editorId) {
  const editor = document.getElementById(editorId);
  const result = Array.from(editor.querySelectorAll('.list-row-val'))
    .map(i => i.value.trim())
    .filter(Boolean);
  return result.length ? result : null;
}

function parseJSON(str) {
  if (!str || !str.trim()) return null;
  try { return JSON.parse(str); } catch { return null; }
}

async function guardarProduto() {
  const id    = document.getElementById('p-id').value;
  const nome  = document.getElementById('p-nome').value.trim();
  const catId = parseInt(document.getElementById('p-categoria').value);
  const preco = parseFloat(document.getElementById('p-preco').value);
  const stock = parseInt(document.getElementById('p-stock').value);

  if (!nome || isNaN(preco) || isNaN(stock)) {
    notify('Preenche todos os campos obrigatórios', 'error');
    return;
  }

  const cat = CATEGORIAS.find(c => c.id === catId);
  const payload = {
    nome,
    slug:           nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    categoria_id:   catId,
    categoria:      cat?.nome || '',
    categoria_slug: cat?.slug || '',
    especificacoes:          document.getElementById('p-specs').value,
    especificacoes_tecnicas: kvRead('p-specs-tecnicas-editor'),
    caracteristicas:         listRead('p-caracteristicas-editor'),
    preco,
    stock,
    imagem:   document.getElementById('p-imagem').value || 'imagens/placeholder.jpg',
  };

  try {
    const url    = id ? `${ADMIN_API}/produtos/${id}` : `${ADMIN_API}/produtos`;
    const method = id ? 'PUT' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.erro || 'Erro desconhecido');
    }
    closeModal('produto');
    await carregarProdutos();
    notify(id ? 'Produto atualizado!' : 'Produto criado!');
  } catch (e) {
    notify('Erro: ' + e.message, 'error');
  }
}

function renderPromocoes() {
  const lista = produtos.filter(p => p.preco_promocional);
  const tbody = document.getElementById('promocoes-tbody');

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>Sem promoções ativas</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const desc = ((p.preco - p.preco_promocional) / p.preco * 100).toFixed(0);
    return `
    <tr>
      <td style="font-weight:500;">${p.nome}</td>
      <td class="mono" style="text-decoration:line-through;color:var(--text3);">€${parseFloat(p.preco).toFixed(2)}</td>
      <td class="mono" style="color:var(--red);font-weight:600;">€${parseFloat(p.preco_promocional).toFixed(2)}</td>
      <td><span class="badge badge-orange">-${desc}%</span></td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="removerPromocao(${p.id})">Remover</button>
      </td>
    </tr>`;
  }).join('');
}

async function guardarPromocao() {
  const pid        = parseInt(document.getElementById('promo-produto').value);
  const precoPromo = parseFloat(document.getElementById('promo-preco').value);
  const p = produtos.find(x => x.id === pid);

  if (!p || !precoPromo || precoPromo >= p.preco) {
    notify('Preço promocional deve ser menor que o preço original', 'error');
    return;
  }

  try {
    const r = await fetch(`${ADMIN_API}/produtos/${pid}/promocao`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ preco_promocional: precoPromo }),
    });
    if (!r.ok) throw new Error();
    p.preco_promocional = precoPromo;
    closeModal('promocao');
    renderPromocoes();
    notify('Promoção aplicada!');
  } catch (e) {
    notify('Erro ao aplicar promoção', 'error');
  }
}

async function removerPromocao(id) {
  if (!confirm('Tens a certeza que queres remover esta promoção?')) return;
  try {
    const r = await fetch(`${ADMIN_API}/produtos/${id}/promocao`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ preco_promocional: null }),
    });
    if (!r.ok) throw new Error();
    const p = produtos.find(x => x.id === id);
    if (p) p.preco_promocional = null;
    renderPromocoes();
    notify('Promoção removida');
  } catch (e) {
    notify('Erro ao remover promoção', 'error');
  }
}

async function carregarEncomendas() {
  try {
    const r = await fetch(`${ADMIN_API}/encomendas`, { credentials: 'include' });
    if (r.ok) encomendas = await r.json();
  } catch (e) {
    console.warn('Erro ao carregar encomendas:', e);
  }
  renderEncomendas(encomendas);
}

function estadoBadge(estado) {
  const mapa = {
    pendente:    ['badge-orange', 'Pendente'],
    processando: ['badge-blue',   'A processar'],
    enviado:     ['badge-blue',   'Enviado'],
    entregue:    ['badge-green',  'Entregue'],
    cancelado:   ['badge-red',    'Cancelado'],
  };
  const [cls, txt] = mapa[estado] || ['badge-gray', estado || '—'];
  return `<span class="badge ${cls}">${txt}</span>`;
}

function renderEncomendas(lista) {
  const tbody = document.getElementById('encomendas-tbody');
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Sem encomendas</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(e => `
    <tr>
      <td class="mono">#${e.id}</td>
      <td>${e.cliente_nome || e.email || '—'}</td>
      <td style="color:var(--text2);">${e.data_criacao ? new Date(e.data_criacao).toLocaleDateString('pt-PT') : '—'}</td>
      <td class="mono">€${parseFloat(e.total || 0).toFixed(2)}</td>
      <td>${estadoBadge(e.estado)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick='verEncomenda(${JSON.stringify(e).replace(/'/g, "&#39;")})'>Ver</button>
      </td>
    </tr>`).join('');
}

function filtrarEncomendas(estado) {
  renderEncomendas(estado ? encomendas.filter(e => e.estado === estado) : encomendas);
}

async function verEncomenda(e) {
  encomendaAtual = e;
  document.getElementById('modal-encomenda').classList.add('open');
  document.getElementById('modal-encomenda-body').innerHTML = '<div style="padding:20px;color:var(--text3);font-size:.85rem;">A carregar...</div>';

  try {
    const r = await fetch(`${ADMIN_API}/encomendas/${e.id}`, { credentials: 'include' });
    if (r.ok) {
      const detalhe = await r.json();
      e = { ...e, itens: detalhe.items || detalhe.itens || [] };
      encomendaAtual = e;
    }
  } catch (_) {}

  const itens = (e.itens || []).map(i =>
    `<tr>
      <td>${i.nome || '—'}</td>
      <td>${i.quantidade}</td>
      <td class="mono">€${parseFloat(i.preco_unitario || i.preco || 0).toFixed(2)}</td>
    </tr>`
  ).join('');

  document.getElementById('modal-encomenda-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <div><div class="form-label">Nº Encomenda</div><div class="mono">#${e.id}</div></div>
      <div><div class="form-label">Data</div><div>${e.data_criacao ? new Date(e.data_criacao).toLocaleDateString('pt-PT') : '—'}</div></div>
      <div><div class="form-label">Cliente</div><div>${e.cliente_nome || e.email || '—'}</div></div>
      <div><div class="form-label">Total</div><div class="mono" style="font-weight:700;">€${parseFloat(e.total || 0).toFixed(2)}</div></div>
    </div>
    <div class="form-group">
      <label class="form-label">Estado</label>
      <select class="form-select" id="encomenda-estado-sel">
        ${['pendente', 'processando', 'enviado', 'entregue', 'cancelado'].map(s =>
          `<option value="${s}" ${e.estado === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
        ).join('')}
      </select>
    </div>
    ${itens ? `
      <div class="form-label" style="margin-bottom:8px;">Produtos</div>
      <table>
        <thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th></tr></thead>
        <tbody>${itens}</tbody>
      </table>` : ''}
  `;
}

async function atualizarEstadoEncomenda() {
  if (!encomendaAtual) return;
  const novoEstado = document.getElementById('encomenda-estado-sel').value;

  try {
    const r = await fetch(`${ADMIN_API}/encomendas/${encomendaAtual.id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ estado: novoEstado }),
    });
    if (!r.ok) throw new Error();
    const idx = encomendas.findIndex(x => x.id === encomendaAtual.id);
    if (idx > -1) encomendas[idx].estado = novoEstado;
    closeModal('encomenda');
    renderEncomendas(encomendas);
    notify('Estado atualizado!');
  } catch (e) {
    notify('Erro ao atualizar estado', 'error');
  }
}

async function carregarUtilizadores() {
  try {
    const r = await fetch(`${ADMIN_API}/utilizadores`, { credentials: 'include' });
    if (r.ok) utilizadores = await r.json();
  } catch (e) {
    console.warn('Erro ao carregar utilizadores:', e);
  }
  renderUtilizadores();
}

function renderUtilizadores() {
  const tbody = document.getElementById('utilizadores-tbody');
  if (!utilizadores.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>Sem utilizadores</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = utilizadores.map(u => `<tr data-search="${((u.nome || '') + (u.email || '')).toLowerCase()}">
      <td style="font-weight:500;">${u.nome || '—'}</td>
      <td style="color:var(--text2);">${u.email || '—'}</td>
      <td style="color:var(--text3);">${u.data_registo ? new Date(u.data_registo).toLocaleDateString('pt-PT') : '—'}</td>
      <td><span class="badge ${u.role === 'admin' ? 'badge-blue' : 'badge-gray'}">${u.role === 'admin' ? 'Admin' : 'Cliente'}</span></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-secondary" onclick="alterarRole(${u.id}, '${u.role === 'admin' ? 'user' : 'admin'}')">${u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}</button>
          <button class="btn btn-sm btn-danger" onclick="removerUtilizador(${u.id})">Remover</button>
        </div>
      </td>
    </tr>`).join('');
}

async function removerUtilizador(id) {
  if (!confirm('Tens a certeza que queres remover este utilizador?')) return;
  try {
    const r = await fetch(`${ADMIN_API}/utilizadores/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.erro || 'Erro');
    }
    utilizadores = utilizadores.filter(u => u.id !== id);
    renderUtilizadores();
    notify('Utilizador removido');
  } catch (e) {
    notify('Erro: ' + e.message, 'error');
  }
}

async function alterarRole(id, novoRole) {
  const label = novoRole === 'admin' ? 'tornar administrador' : 'remover como administrador';
  if (!confirm(`Tens a certeza que queres ${label} este utilizador?`)) return;
  try {
    const r = await fetch(`${ADMIN_API}/utilizadores/${id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role: novoRole }),
    });
    if (!r.ok) throw new Error();
    const u = utilizadores.find(x => x.id === id);
    if (u) u.role = novoRole;
    renderUtilizadores();
    notify(`Role atualizado para ${novoRole === 'admin' ? 'Admin' : 'Cliente'}`);
  } catch (e) {
    notify('Erro ao alterar role', 'error');
  }
}

let mensagens = [];
let mensagemAtual = null;

async function carregarMensagens() {
  try {
    const r = await fetch(`${ADMIN_API}/contactos`, { credentials: 'include' });
    mensagens = await r.json();
    renderMensagens(mensagens);
    const novas = mensagens.filter(m => m.estado === 'novo').length;
    const badge = document.getElementById('badge-mensagens');
    if (novas > 0) { badge.textContent = novas; badge.style.display = 'inline'; }
    else badge.style.display = 'none';
  } catch { notify('Erro ao carregar mensagens', 'error'); }
}

function renderMensagens(lista) {
  const assuntoLabel = { duvida: 'Dúvida', suporte: 'Suporte', encomenda: 'Encomenda', devolucao: 'Devolução', outro: 'Outro' };
  const estadoBadgeMap  = { Novo: 'badge-red', Lido: 'badge-blue', Respondido: 'badge-green', Fechado: 'badge-gray' };
  const tbody = document.getElementById('mensagens-tbody');
  if (!lista.length) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:32px;">Sem mensagens</td></tr>`; return; }
  tbody.innerHTML = lista.map(m => `
    <tr>
      <td style="font-weight:500;">${m.nome}</td>
      <td style="color:var(--text2);font-size:.82rem;">${m.email}</td>
      <td><span class="badge badge-gray">${assuntoLabel[m.assunto] || m.assunto}</span></td>
      <td style="color:var(--text3);font-size:.82rem;">${new Date(m.data_criacao).toLocaleDateString('pt-PT')}</td>
      <td><span class="badge ${estadoBadgeMap[m.estado] || 'badge-gray'}">${m.estado}</span></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-secondary" onclick="verMensagem(${m.id})">Ver</button>
          <button class="btn btn-sm btn-danger" onclick="eliminarMensagem(${m.id})">Eliminar</button>
        </div>
      </td>
    </tr>`).join('');
}

function filtrarMensagens(estado) {
  const lista = estado ? mensagens.filter(m => m.estado === estado) : mensagens;
  renderMensagens(lista);
}

function verMensagem(id) {
  mensagemAtual = mensagens.find(m => m.id === id);
  if (!mensagemAtual) return;
  const assuntoLabel = { duvida: 'Dúvida sobre Produto', suporte: 'Suporte Técnico', encomenda: 'Estado da Encomenda', devolucao: 'Devolução/Reembolso', outro: 'Outro' };
  document.getElementById('modal-mensagem-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <div><div class="form-label">Nome</div><div style="font-weight:500;">${mensagemAtual.nome}</div></div>
      <div><div class="form-label">Email</div><div>${mensagemAtual.email}</div></div>
      <div><div class="form-label">Telefone</div><div>${mensagemAtual.telefone || '—'}</div></div>
      <div><div class="form-label">Assunto</div><div>${assuntoLabel[mensagemAtual.assunto] || mensagemAtual.assunto}</div></div>
      <div><div class="form-label">Data</div><div>${new Date(mensagemAtual.data_criacao).toLocaleString('pt-PT')}</div></div>
      ${mensagemAtual.data_resposta ? `<div><div class="form-label">Respondido em</div><div>${new Date(mensagemAtual.data_resposta).toLocaleString('pt-PT')}</div></div>` : ''}
    </div>
    <div class="form-label">Mensagem</div>
    <div style="background:var(--surface2);border-radius:8px;padding:14px;line-height:1.6;white-space:pre-wrap;">${mensagemAtual.mensagem}</div>
  `;
  document.getElementById('msg-estado').value = mensagemAtual.estado;
  document.getElementById('modal-mensagem').classList.add('open');
  if (mensagemAtual.estado === 'novo') atualizarEstadoMensagem(id, 'lido', false);
}

async function guardarEstadoMensagem() {
  if (!mensagemAtual) return;
  const estado = document.getElementById('msg-estado').value;
  await atualizarEstadoMensagem(mensagemAtual.id, estado, true);
  closeModal('mensagem');
}

async function atualizarEstadoMensagem(id, estado, notificar) {
  try {
    await fetch(`${ADMIN_API}/contactos/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ estado }),
    });
    const m = mensagens.find(x => x.id === id);
    if (m) m.estado = estado;
    renderMensagens(mensagens);
    const novas = mensagens.filter(x => x.estado === 'novo').length;
    const badge = document.getElementById('badge-mensagens');
    if (novas > 0) { badge.textContent = novas; badge.style.display = 'inline'; }
    else badge.style.display = 'none';
    if (notificar) notify('Estado atualizado');
  } catch { if (notificar) notify('Erro ao atualizar estado', 'error'); }
}

async function eliminarMensagem(id) {
  if (!confirm('Tens a certeza que queres eliminar esta mensagem?')) return;
  try {
    await fetch(`${ADMIN_API}/contactos/${id}`, { method: 'DELETE', credentials: 'include' });
    mensagens = mensagens.filter(m => m.id !== id);
    renderMensagens(mensagens);
    notify('Mensagem eliminada');
  } catch { notify('Erro ao eliminar mensagem', 'error'); }
}

async function logout() {
  try {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (e) {}
  window.location.href = '../login.html';
}

function checkMobile() {
  const toggle = document.getElementById('menuToggle');
  if (window.innerWidth <= 900) {
    toggle.style.display = 'flex';
  } else {
    toggle.style.display = 'none';
    document.getElementById('sidebar').classList.remove('open');
  }
}
window.addEventListener('resize', checkMobile);

let imagensProdutoAtualId = null;

async function abrirModalImagens(produtoId, nomeProduto) {
  imagensProdutoAtualId = produtoId;
  document.getElementById('modal-imagens-title').textContent = `Imagens — ${nomeProduto}`;
  document.getElementById('img-nova-url').value = '';
  document.getElementById('modal-imagens').classList.add('open');
  await renderizarImagens();
}

async function renderizarImagens() {
  const grid = document.getElementById('imagens-grid');
  grid.innerHTML = '<div style="color:var(--text3);font-size:.8rem;grid-column:1/-1;">A carregar...</div>';

  try {
    const produto = produtos.find(p => p.id === imagensProdutoAtualId);
    const r = await fetch(`${API}/api/produtos/${imagensProdutoAtualId}/imagens`, { credentials: 'include' });
    const imagensExtra = r.ok ? await r.json() : [];

    const todasImagens = [];

    if (produto?.imagem) {
      todasImagens.push({ id: null, url: produto.imagem, principal: true });
    }

    imagensExtra.forEach(img => todasImagens.push({ id: img.id, url: img.url, principal: false }));

    if (!todasImagens.length) {
      grid.innerHTML = '<div style="color:var(--text3);font-size:.8rem;grid-column:1/-1;">Sem imagens</div>';
      return;
    }

    grid.innerHTML = todasImagens.map(img => `
      <div class="img-card">
        <img src="${img.url.startsWith('http') ? img.url : `${API}/${img.url}`}" onerror="this.src='https://via.placeholder.com/100x100/f2f2ef/aaa?text=?'">
      ${img.principal
          ? '<div class="img-card-label">Principal</div>'
          : `<button class="img-card-del" onclick="removerImagem(${img.id})" title="Remover">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
             </button>`
        }
      </div>
    `).join('');

  } catch (e) {
    grid.innerHTML = '<div style="color:var(--red);font-size:.8rem;grid-column:1/-1;">Erro ao carregar imagens</div>';
  }
}

async function adicionarImagem() {
  const url = document.getElementById('img-nova-url').value.trim();
  if (!url) { notify('Introduz um URL válido', 'error'); return; }

  try {
    const r = await fetch(`${ADMIN_API}/produtos/${imagensProdutoAtualId}/imagens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ url }),
    });
    if (!r.ok) throw new Error();
    document.getElementById('img-nova-url').value = '';
    await renderizarImagens();
    notify('Imagem adicionada!');
  } catch (e) {
    notify('Erro ao adicionar imagem', 'error');
  }
}

async function removerImagem(imagemId) {
  if (!confirm('Remover esta imagem?')) return;
  try {
    const r = await fetch(`${ADMIN_API}/imagens/${imagemId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!r.ok) throw new Error();
    await renderizarImagens();
    notify('Imagem removida');
  } catch (e) {
    notify('Erro ao remover imagem', 'error');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await verificarAdmin();
  checkMobile();
  await carregarProdutos();
  carregarOverview();
});