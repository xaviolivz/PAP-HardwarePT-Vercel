document.addEventListener('DOMContentLoaded', () => {
    atualizarHeaderComSessao();
    inicializarFormRegisto();
    inicializarFormLogin();

    if (window.location.pathname.includes('dashboard.html')) {
        protegerPaginaAdmin();
    }
});

async function atualizarHeaderComSessao() {
    const utilizador = await verificarAuth();
    atualizarHeader(utilizador);
}

function atualizarHeader(user) {
    const userMenu = document.getElementById('userMenu');

    if (!userMenu) {
        const userNameEl = document.getElementById('userName');
        const userLink   = document.getElementById('user-link');
        if (user?.nome) {
            if (userNameEl) userNameEl.textContent = user.nome.split(' ')[0];
            if (userLink)   userLink.href = 'perfil.html';
        } else {
            if (userNameEl) userNameEl.textContent = 'Login';
            if (userLink)   userLink.href = 'login.html';
        }
        return;
    }

    if (!user) {
        userMenu.innerHTML = `
            <a href="login.html" class="login-btn" title="Entrar na conta">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
            </a>`;
        return;
    }

    const adminLink = user.role === 'admin'
        ? `<a href="admin/dashboard.html" class="dashboard-link">Dashboard</a>`
        : '';

    userMenu.innerHTML = `
        <div class="user-menu-content" style="display:flex;align-items:center;gap:10px;">
            ${adminLink}
            <a href="perfil.html" class="user-name-btn">${user.nome.split(' ')[0]}</a>
        </div>`;

    const userNameElement  = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    if (userNameElement)  userNameElement.textContent  = user.nome;
    if (userEmailElement) userEmailElement.textContent = user.email;
}

function toggleUserMenu() {
    document.getElementById('userDropdown')?.classList.toggle('active');
}

document.addEventListener('click', (e) => {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('userDropdown');
    if (dropdown && !userMenu?.contains(e.target)) dropdown.classList.remove('active');
});

function inicializarFormRegisto() {
    const form = document.getElementById('form-registo');
    if (!form) return;

    const errorEl   = document.getElementById('mensagem-erro')   || document.createElement('div');
    const successEl = document.getElementById('mensagem-sucesso') || document.createElement('div');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.textContent   = '';
        successEl.textContent = '';

        const nome      = document.getElementById('nome')?.value.trim();
        const email     = document.getElementById('email')?.value.trim();
        const password  = document.getElementById('password')?.value;
        const passwordc = document.getElementById('passwordconfirm')?.value;
        const telefone  = document.getElementById('telefone')?.value.trim() || null;
        const nif       = document.getElementById('nif')?.value.trim() || null;

        if (!nome || !email || !password) {
            errorEl.textContent = 'Preenche nome, email e password obrigatórios.';
            return;
        }
        if (password !== passwordc) {
            errorEl.textContent = 'As passwords não coincidem.';
            return;
        }
        if (nif && !validarNIF(nif)) {
            errorEl.textContent = 'NIF inválido. Deve ter 9 dígitos e ser um NIF português válido.';
            return;
        }

        try {
            const response = await fetch(`${getApiUrl()}/auth/registo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, password, telefone, nif }),
                credentials: 'include'
            });
            const data = await response.json();

            if (data.sucesso) {
                successEl.textContent = data.mensagem || 'Conta criada com sucesso!';
                atualizarHeader(data.utilizador);
                setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            } else {
                errorEl.textContent = data.mensagem || 'Erro ao criar conta.';
            }
        } catch {
            errorEl.textContent = 'Erro de ligação ao servidor.';
        }
    });
}

function inicializarFormLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const errorEl   = document.getElementById('error-message');
    const successEl = document.getElementById('success-message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorEl)   errorEl.textContent   = '';
        if (successEl) successEl.textContent = '';

        const email    = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;

        if (!email || !password) {
            if (errorEl) errorEl.textContent = 'Preenche email e palavra-passe.';
            return;
        }

        try {
            const response = await fetch(`${getApiUrl()}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });
            const data = await response.json();

            if (data.sucesso) {
                if (successEl) successEl.textContent = 'Login efetuado com sucesso!';
                atualizarHeader(data.utilizador);
                setTimeout(() => {
                    window.location.href = data.utilizador?.role === 'admin'
                        ? 'admin/dashboard.html'
                        : 'index.html';
                }, 1500);
            } else {
                if (errorEl) errorEl.textContent = data.mensagem || 'Email ou palavra-passe incorretos.';
            }
        } catch {
            if (errorEl) errorEl.textContent = 'Erro de ligação ao servidor.';
        }
    });
}

window.logout = async () => {
    try {
        await fetch(`${getApiUrl()}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
        console.warn('Erro no logout');
    }
    window.location.href = 'index.html';
};

async function protegerPaginaAdmin() {
    const utilizador = await verificarAuth();

    if (!utilizador) {
        alert('Por favor, faça login para aceder a esta página');
        window.location.href = '../login.html';
        return false;
    }

    if (utilizador.role !== 'admin') {
        alert('Acesso negado! Apenas administradores podem aceder a esta página.');
        window.location.href = '../index.html';
        return false;
    }

    console.log('✅ Acesso autorizado ao dashboard');
    return true;
}

console.log('🔐 auth.js carregado');