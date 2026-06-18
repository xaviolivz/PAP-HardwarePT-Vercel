async function carregarPromocoes() {
    const API_URL = (typeof CONFIG !== 'undefined') ? CONFIG.API_URL : 'http://localhost:3000';
    const grid = document.getElementById('dealsGrid');
    if (!grid) return;

    try {
        const res = await fetch(`${API_URL}/produtos/promocao`, { credentials: 'include' });
        const contentType = res.headers.get('content-type');

        if (!contentType || !contentType.includes('application/json')) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#e74c3c">Erro ao carregar promoções.</div>';
            return;
        }

        const produtos = await res.json();

        if (!Array.isArray(produtos) || !produtos.length) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#737373">Sem promoções de momento.</div>';
            return;
        }

        grid.innerHTML = produtos.slice(0, 4).map(p => {
            const precoFinal    = parseFloat(p.preco_promocional || p.preco).toFixed(2);
            const precoOriginal = parseFloat(p.preco).toFixed(2);
            const desconto      = p.preco_promocional ? Math.round((1 - p.preco_promocional / p.preco) * 100) : 0;

            return `
                <div class="deal-card" onclick="window.location.href='produto-detalhes.html?id=${p.id}'" style="cursor:pointer;">
                    <div class="deal-badge">-${desconto}%</div>
                    <img src="${p.imagem || 'imagens/placeholder.jpg'}" alt="${p.nome}"
                         onerror="this.src='imagens/placeholder.jpg'">
                    <div class="deal-info">
                        <span class="deal-category">${p.categoria || ''}</span>
                        <h3 class="deal-name">${p.nome}</h3>
                        <div class="deal-price">
                            <span class="deal-price-new">€${precoFinal}</span>
                            <span class="deal-price-old">€${precoOriginal}</span>
                        </div>
                    </div>
                </div>`;
        }).join('');

    } catch (e) {
        console.error('Erro ao carregar promoções:', e);
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#737373">Erro ao carregar promoções.</div>';
    }
}

async function carregarTopVendas() {
    const API_URL = (typeof CONFIG !== 'undefined') ? CONFIG.API_URL : 'http://localhost:3000';
    const grid = document.getElementById('topVendasGrid');
    if (!grid) return;

    try {
        let produtos = [];

        const resDestaque  = await fetch(`${API_URL}/produtos/destaque`, { credentials: 'include' });
        const contentType  = resDestaque.headers.get('content-type');

        if (!contentType || !contentType.includes('application/json')) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#e74c3c">Erro ao carregar produtos.</div>';
            return;
        }

        const destaques = await resDestaque.json();

        if (Array.isArray(destaques) && destaques.length >= 4) {
            produtos = destaques;
        } else {
            const resTodos     = await fetch(`${API_URL}/produtos`, { credentials: 'include' });
            const contentType2 = resTodos.headers.get('content-type');
            if (contentType2 && contentType2.includes('application/json')) {
                produtos = await resTodos.json();
            }
        }

        const top = produtos.slice(0, 4);

        if (!top.length) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#737373">Sem produtos disponíveis.</div>';
            return;
        }

        grid.innerHTML = top.map(p => {
            const precoFinal    = parseFloat(p.preco_promocional || p.preco).toFixed(2);
            const precoOriginal = parseFloat(p.preco).toFixed(2);
            const desconto      = p.preco_promocional ? Math.round((1 - p.preco_promocional / p.preco) * 100) : 0;

            return `
                <div class="deal-card" onclick="window.location.href='produto-detalhes.html?id=${p.id}'" style="cursor:pointer;">
                    ${desconto > 0 ? `<div class="deal-badge">-${desconto}%</div>` : ''}
                    <img src="${p.imagem || 'imagens/placeholder.jpg'}" alt="${p.nome}"
                         onerror="this.src='imagens/placeholder.jpg'">
                    <div class="deal-info">
                        <span class="deal-category">${p.categoria || ''}</span>
                        <h3 class="deal-name">${p.nome}</h3>
                        <div class="deal-price">
                            <span class="deal-price-new">€${precoFinal}</span>
                            ${p.preco_promocional ? '<span class="deal-price-old">€' + precoOriginal + '</span>' : ''}
                        </div>
                    </div>
                </div>`;
        }).join('');

    } catch (e) {
        console.error('Erro ao carregar top vendas:', e);
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#737373">Erro ao carregar produtos.</div>';
    }
}

const NOTICIAS = {
    rtx5080: {
        titulo: 'NVIDIA RTX 5080 Super: A nova série que vai redefinir o gaming em 4K',
        data:   '12 de maio de 2026',
        img:    'imagens/rtx5080super.png',
        texto: `
            <p>A NVIDIA anunciou oficialmente a nova linha <strong>RTX 5080 Super</strong>, o próximo grande salto na arquitetura Blackwell. Com <strong>24 GB de GDDR7</strong> e um barramento de memória de 384-bit, esta GPU promete ser a escolha definitiva para quem joga em 4K com ray tracing ativado.</p>
            <p>Em comparação direta com a RTX 4080, a nova 5080 Super apresenta um aumento de desempenho de até <strong>40% em rasterização</strong> e mais de <strong>60% em cargas de ray tracing</strong>, graças ao novo motor RT de 4ª geração e aos Tensor Cores melhorados para DLSS 4.</p>
            <h4 style="margin:1.2rem 0 0.5rem;">Especificações principais</h4>
            <ul style="padding-left:1.2rem; line-height:2;">
                <li>Arquitetura: Blackwell GB203 (aperfeiçoado)</li>
                <li>CUDA Cores: 10.752</li>
                <li>Memória: 24 GB GDDR7 @ 384-bit</li>
                <li>TDP: 320W</li>
                <li>Conectividade: PCIe 5.0 x16, HDMI 2.1, DisplayPort 2.1</li>
            </ul>
            <p style="margin-top:1rem;">A disponibilidade está prevista para o terceiro trimestre de 2026, com um preço de lançamento estimado de <strong>€1.099</strong>. A HardwarePT já está a receber pré-encomendas.</p>
        `
    },
    ryzen9950x3d: {
        titulo: 'AMD Ryzen 9 9950X3D: O Processador mais rápido para gaming chega ao mercado',
        data:   '3 de maio de 2026',
        img:    'imagens/ryzen99950x3d.png',
        texto: `
            <p>A AMD lançou o <strong>Ryzen 9 9950X3D</strong>, o processador desktop mais rápido para gaming já produzido pela empresa. Com a segunda geração de <strong>3D V-Cache</strong> empilhada sobre núcleos <strong>Zen 5</strong>, os resultados em benchmarks são simplesmente impressionantes.</p>
            <p>O 9950X3D conta com <strong>16 núcleos e 32 threads</strong>, um cache L3 total de <strong>144 MB</strong> (com a camada 3D V-Cache incluída) e frequências base/boost de 4,3/5,7 GHz. Em jogos como Cyberpunk 2077, Starfield e Microsoft Flight Simulator, supera consistentemente qualquer rival Intel ou AMD atual.</p>
            <h4 style="margin:1.2rem 0 0.5rem;">Especificações principais</h4>
            <ul style="padding-left:1.2rem; line-height:2;">
                <li>Arquitetura: Zen 5 + 3D V-Cache Gen 2</li>
                <li>Núcleos / Threads: 16C / 32T</li>
                <li>Cache L3 total: 144 MB</li>
                <li>Frequência boost: até 5,7 GHz</li>
                <li>Socket: AM5 | TDP: 170W</li>
            </ul>
            <p style="margin-top:1rem;">Disponível agora em stock na HardwarePT. Compatível com todas as motherboards AM5 com BIOS atualizado.</p>
        `
    },
    ddr6: {
        titulo: 'DDR6: O que esperar da nova geração de memórias RAM e quando chega',
        data:   '24 de abril de 2026',
        img:    'imagens/ddr6.png',
        texto: `
            <p>A <strong>JEDEC</strong> (Joint Electron Device Engineering Council) finalizou oficialmente as especificações do padrão <strong>DDR6</strong>, marcando o início de uma nova era para as memórias RAM de consumidor. Mas afinal, o que muda e quando podemos esperar os primeiros produtos?</p>
            <p>O DDR6 chega com velocidades de transferência a partir de <strong>8.800 MT/s</strong>, podendo atingir <strong>17.600 MT/s</strong> nas versões mais rápidas — mais do dobro do DDR5 atual. A tensão de operação desce para <strong>1,0V</strong>, tornando as memórias mais eficientes.</p>
            <h4 style="margin:1.2rem 0 0.5rem;">DDR5 vs DDR6 — comparação rápida</h4>
            <ul style="padding-left:1.2rem; line-height:2;">
                <li>Velocidade base: DDR5 4800 MT/s → DDR6 8800 MT/s</li>
                <li>Velocidade máxima: DDR5 ~8000 MT/s → DDR6 ~17600 MT/s</li>
                <li>Tensão: DDR5 1,1V → DDR6 1,0V</li>
                <li>Largura de banda por pino: aumenta ~2×</li>
            </ul>
            <p style="margin-top:1rem;">Os primeiros módulos DDR6 estão previstos para <strong>finais de 2026</strong>, mas a adoção massiva só deverá ocorrer em 2027, quando as plataformas Intel Arrow Lake-S e AMD AM6 chegarem ao mercado.</p>
        `
    }
};

function abrirNoticia(id) {
    const n = NOTICIAS[id];
    if (!n) return;
    document.getElementById('noticiaModalTitulo').textContent = n.titulo;
    document.getElementById('noticiaModalData').textContent   = n.data;
    document.getElementById('noticiaModalImg').src            = n.img;
    document.getElementById('noticiaModalImg').alt            = n.titulo;
    document.getElementById('noticiaModalTexto').innerHTML    = n.texto;
    document.getElementById('noticiaModal').style.display     = 'block';
    document.body.style.overflow = 'hidden';
}

function fecharNoticiaBtn() {
    document.getElementById('noticiaModal').style.display = 'none';
    document.body.style.overflow = '';
}

function fecharNoticia(e) {
    if (e.target === document.getElementById('noticiaModal')) {
        fecharNoticiaBtn();
    }
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fecharNoticiaBtn();
});

document.addEventListener('DOMContentLoaded', () => {
    carregarPromocoes();
    carregarTopVendas();
});