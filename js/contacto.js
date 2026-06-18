document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.contact-form');
    if (form) {
        form.addEventListener('submit', submitContactForm);
    } else {
        console.error('❌ Formulário de contacto não encontrado');
    }
});

async function submitContactForm(event) {
    event.preventDefault();

    const form          = event.target;
    const submitBtn     = form.querySelector('button[type="submit"]');
    const textoOriginal = submitBtn.textContent;

    const formData = {
        nome:     document.getElementById('nome').value.trim(),
        email:    document.getElementById('email').value.trim(),
        telefone: document.getElementById('telefone').value.trim(),
        assunto:  document.getElementById('assunto').value,
        mensagem: document.getElementById('mensagem').value.trim()
    };

    if (!formData.nome || !formData.email || !formData.assunto || !formData.mensagem) {
        mostrarToast('Por favor preencha todos os campos obrigatórios', 'erro');
        return;
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = 'A enviar...';

    try {
        const response = await fetch(`${getApiUrl()}/contacto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await response.json();

        if (response.ok && data.sucesso) {
            mostrarToast('Mensagem enviada com sucesso!', 'sucesso');
            form.reset();
        } else {
            mostrarToast(data.mensagem || 'Erro ao enviar mensagem', 'erro');
        }
    } catch {
        mostrarToast('Erro ao enviar mensagem. Verifique a sua conexão.', 'erro');
    } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = textoOriginal;
    }
}

function mostrarToast(mensagem, tipo) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
        <div class="toast-icon">${tipo === 'sucesso' ? '✅' : '❌'}</div>
        <div class="toast-content">
            <div class="toast-title">${tipo === 'sucesso' ? 'Mensagem enviada!' : 'Erro!'}</div>
            <div class="toast-message">${mensagem}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>`;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('toast-show'), 10);

    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

console.log('✅ contacto.js carregado');