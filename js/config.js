const CONFIG = {
    API_URL: window.location.hostname === "localhost"
        ? "http://localhost:3000/api"
        : "/api",
    CURRENCY: "€",
    LOCALE: "pt-PT",
    PRODUCTS_PER_PAGE: 15,

    CATEGORIAS: [
        { id: 1, slug: "processadores",  nome: "Processadores",  icone: "🖥️" },
        { id: 2, slug: "placas-graficas",nome: "Placas Gráficas", icone: "🎮" },
        { id: 3, slug: "memoria-ram",    nome: "Memórias RAM",     icone: "💾" },
        { id: 4, slug: "armazenamento",  nome: "Armazenamento",   icone: "💿" },
        { id: 5, slug: "motherboards",   nome: "Motherboards",    icone: "🔧" },
        { id: 6, slug: "fontes-de-alimentacao", nome: "Fontes de Alimentação", icone: "⚡" },
        { id: 7, slug: "caixas-pc",      nome: "Caixas de PC",    icone: "🖥️" },
        { id: 8, slug: "refrigeracao",   nome: "Coolers",         icone: "❄️" },
        { id: 9, slug: "acessorios",     nome: "Acessórios",      icone: "📦" },
    ],
};

const API_BASE_URL = CONFIG.API_URL;

const CATEGORIA_MAP = {
    1: "processadores",
    2: "placas-graficas",
    3: "memoria-ram",
    4: "armazenamento",
    5: "motherboards",
    6: "fontes-de-alimentacao",
    7: "caixas-pc",
    8: "refrigeracao",
    9: "acessorios",
};

let produtosCache   = null;
let cacheTimestamp  = null;
const CACHE_DURATION = 5 * 60 * 1000; 

function limparCache() {
    produtosCache  = null;
    cacheTimestamp = null;
}

function cacheValido() {
    if (!produtosCache || !cacheTimestamp) return false;
    return (Date.now() - cacheTimestamp) < CACHE_DURATION;
}

async function fetchAPI(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        console.log('🌐 Chamando API:', url);

        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            throw new Error("Erro na API: " + response.status);
        }

        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar " + endpoint + ":", error);
        throw error;
    }
}

async function obterTodosProdutos(forcarAtualizacao = false) {
    if (!forcarAtualizacao && cacheValido()) {
        return produtosCache;
    }

    try {
        const produtos = await fetchAPI('/produtos');
        produtosCache  = produtos;
        cacheTimestamp = Date.now();
        return produtos;
    } catch (error) {
        console.error('Erro ao obter produtos:', error);
        if (produtosCache) return produtosCache;
        return [];
    }
}

async function obterProdutoPorId(id) {
    try {
        const produto = await fetchAPI('/produtos/' + id);
        return produto;
    } catch (error) {
        console.error('Erro ao obter produto ' + id + ':', error);
        if (produtosCache) {
            return produtosCache.find(p => p.id === parseInt(id));
        }
        return null;
    }
}

async function obterProdutoPorSlug(slug) {
    try {
        const produto = await fetchAPI('/produtos/slug/' + slug);
        return produto;
    } catch (error) {
        console.error('Erro ao obter produto por slug ' + slug + ':', error);
        if (produtosCache) {
            return produtosCache.find(p => p.slug === slug);
        }
        return null;
    }
}

async function obterProdutosPorCategoria(categoriaSlug) {
    try {
        const produtos = await fetchAPI('/produtos/categoria/' + categoriaSlug);
        return produtos;
    } catch (error) {
        console.error('Erro ao obter produtos da categoria ' + categoriaSlug + ':', error);
        if (produtosCache) {
            return produtosCache.filter(p => p.categoria_slug === categoriaSlug);
        }
        return [];
    }
}

async function obterProdutosPorCategoriaId(categoriaId) {
    try {
        const produtos = await fetchAPI('/produtos/categoria-id/' + categoriaId);
        return produtos;
    } catch (error) {
        console.error('Erro ao obter produtos da categoria ID ' + categoriaId + ':', error);
        if (produtosCache) {
            return produtosCache.filter(p => p.categoria_id === parseInt(categoriaId));
        }
        return [];
    }
}

async function obterProdutosDestaque() {
    try {
        const produtos = await fetchAPI('/produtos/destaque');
        return produtos;
    } catch (error) {
        console.error('Erro ao obter produtos em destaque:', error);
        if (produtosCache) {
            return produtosCache.filter(p => p.destaque && p.ativo);
        }
        return [];
    }
}

async function obterProdutosPromocao() {
    try {
        const produtos = await fetchAPI('/produtos/promocao');
        return produtos;
    } catch (error) {
        console.error('Erro ao obter produtos em promoção:', error);
        if (produtosCache) {
            return produtosCache.filter(p => p.preco_promocional && p.ativo);
        }
        return [];
    }
}

async function obterProdutosAtivos() {
    try {
        const produtos = await fetchAPI('/produtos/ativos');
        return produtos;
    } catch (error) {
        console.error('Erro ao obter produtos ativos:', error);
        const todosProdutos = await obterTodosProdutos();
        return todosProdutos.filter(p => p.ativo);
    }
}

async function pesquisarProdutos(filtros = {}) {
    try {
        const params = new URLSearchParams();
        if (filtros.pesquisa)  params.append('q',          filtros.pesquisa);
        if (filtros.categoria) params.append('categoria',  filtros.categoria);
        if (filtros.precoMin)  params.append('precoMin',   filtros.precoMin);
        if (filtros.precoMax)  params.append('precoMax',   filtros.precoMax);
        if (filtros.ordenacao) params.append('ordenacao',  filtros.ordenacao);
        if (filtros.pagina)    params.append('pagina',     filtros.pagina);
        if (filtros.limite)    params.append('limite',     filtros.limite);

        const queryString = params.toString();
        const endpoint    = queryString ? '/produtos/pesquisa?' + queryString : '/produtos';

        return await fetchAPI(endpoint);
    } catch (error) {
        console.error('Erro ao pesquisar produtos:', error);
        return [];
    }
}

if (typeof window !== 'undefined') {
    window.CONFIG                     = CONFIG;
    window.API_BASE_URL               = API_BASE_URL;
    window.CATEGORIA_MAP              = CATEGORIA_MAP;
    window.obterTodosProdutos         = obterTodosProdutos;
    window.obterProdutoPorId          = obterProdutoPorId;
    window.obterProdutoPorSlug        = obterProdutoPorSlug;
    window.obterProdutosPorCategoria  = obterProdutosPorCategoria;
    window.obterProdutosPorCategoriaId = obterProdutosPorCategoriaId;
    window.obterProdutosDestaque      = obterProdutosDestaque;
    window.obterProdutosPromocao      = obterProdutosPromocao;
    window.obterProdutosAtivos        = obterProdutosAtivos;
    window.pesquisarProdutos          = pesquisarProdutos;
    window.limparCache                = limparCache;
}

function filtrarPorCategoria(categoria) {
    window.location.href = 'produtos.html?categoria=' + categoria;
}