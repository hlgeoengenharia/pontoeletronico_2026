/**
 * UI Utils - Projeto V01
 * Utilitários para feedback visual (Toasts, Modais, etc).
 */

const UI = {
    /**
     * Exibe um toast (notificação flutuante)
     * @param {string} message Mensagem a ser exibida
     * @param {string} type Tipo: 'success', 'error', 'warning', 'info'
     */
    toast(message, type = 'info') {
        this.showToast(message, type);
    },

    showToast(message, type = 'info') {
        const existingToast = document.querySelector('.custom-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `custom-toast fixed top-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs z-[1000] border-2 shadow-2xl transition-all duration-300 transform scale-0 opacity-0 flex items-center gap-3`;

        const colors = {
            success: 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-emerald-500/20',
            error: 'bg-red-950/80 border-red-500 text-red-400 shadow-red-500/20',
            warning: 'bg-amber-950/80 border-amber-500 text-amber-400 shadow-amber-500/20',
            info: 'bg-primary/20 border-primary text-slate-100 shadow-primary/20'
        };

        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        toast.classList.add(...colors[type].split(' '));

        toast.innerHTML = `
            <span class="material-symbols-outlined text-lg">${icons[type]}</span>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        // Animação de entrada
        setTimeout(() => {
            toast.classList.remove('scale-0', 'opacity-0');
            toast.classList.add('scale-100', 'opacity-100');
        }, 10);

        // Auto-remove
        setTimeout(() => {
            toast.classList.remove('scale-100', 'opacity-100');
            toast.classList.add('scale-90', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    /**
     * Mostra um loader overlay
     */
    showLoader() {
        if (document.getElementById('ui-loader')) return;
        const loader = document.createElement('div');
        loader.id = 'ui-loader';
        loader.className = 'fixed inset-0 bg-background-dark/80 backdrop-blur-md z-[2000] flex flex-col items-center justify-center gap-4';
        loader.innerHTML = `
            <div class="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p class="text-xs font-bold text-primary animate-pulse tracking-widest uppercase">Processando Dados...</p>
        `;
        document.body.appendChild(loader);
    },

    /**
     * Esconde o loader overlay
     */
    hideLoader() {
        const loader = document.getElementById('ui-loader');
        if (loader) loader.remove();
    },

    /**
     * Atualiza os links de navegação do rodapé baseado no cargo do usuário
     */
    updateFooterNavigation(userRole) {
        const role = String(userRole || '').toLowerCase();
        const urlParams = new URLSearchParams(window.location.search);
        const employeeId = urlParams.get('id');
        const roleParam = urlParams.get('role');

        const navInicios = document.querySelectorAll('#nav-inicio');
        navInicios.forEach(navInicio => {
            let href = '';
            if (role === 'admin') href = 'painel_admin.html';
            else if (role === 'gestor' || role === 'manager') href = 'painel_gestor.html';
            else href = 'painel_funcionario.html';

            // Preserve context if in inspection mode
            if (employeeId) {
                const separator = href.includes('?') ? '&' : '?';
                const roleQuery = roleParam ? `&role=${roleParam}` : '';
                href = `${href}${separator}id=${employeeId}${roleQuery}`;
            }
            navInicio.href = href;
        });
    },

    /**
     * Redireciona para o painel inicial baseado no cargo
     */
    voltarInicio() {
        const urlParams = new URLSearchParams(window.location.search);
        const employeeId = urlParams.get('id');
        const roleParam = urlParams.get('role');
        const role = String(localStorage.getItem('userRole') || '').toLowerCase();

        // Se estamos inspecionando e clicar em voltar, volta para o PAINEL do funcionário
        if (employeeId && (role === 'admin' || role === 'manager' || role === 'gestor')) {
            const roleQuery = roleParam ? `&role=${roleParam}` : '';
            window.location.href = `painel_funcionario.html?id=${employeeId}${roleQuery}`;
            return;
        }

        if (role === 'admin') window.location.href = 'painel_admin.html';
        else if (role === 'gestor' || role === 'manager') window.location.href = 'painel_gestor.html';
        else window.location.href = 'painel_funcionario.html';
    },

    /**
     * Inicializa o menu lateral baseado no cargo do usuário
     * @param {string} userRole Cargo do usuário
     */
    initSidebar(userRole) {
        const role = String(userRole || '').toLowerCase();
        console.log(`[UI.initSidebar] Inicializando menu para: ${role}`);
        const sidebarNav = document.getElementById('sidebarNav');
        if (!sidebarNav) {
            console.warn('[UI.initSidebar] Elemento #sidebarNav não encontrado.');
            return;
        }

        // Recuperar contexto para manter inspeção se houver
        const urlParams = new URLSearchParams(window.location.search);
        const employeeId = urlParams.get('id');
        const roleParam = urlParams.get('role');
        const contextQuery = employeeId ? `?id=${employeeId}${roleParam ? `&role=${roleParam}` : ''}` : '';

        let menuHtml = '';

        // Definir itens por papel
        const items = [];

        // Itens Básicos (Comuns a todos no menu lateral se logados)
        if (role === 'admin') {
            items.push({ href: 'painel_admin.html', icon: 'dashboard', label: 'Painel Admin' });
            items.push({ href: 'relacao_setores.html', icon: 'group', label: 'Relação Funcionários' });
            items.push({ href: 'autorizacoes_abono.html', icon: 'pending_actions', label: 'Pendências' });
            items.push({ href: 'cadastro_setores.html', icon: 'domain_add', label: 'Cadastro Setores' });
            items.push({ href: 'cadastro_escalas.html', icon: 'calendar_month', label: 'Cadastro Escalas' });
            items.push({ href: 'cadastro_cargos.html', icon: 'work', label: 'Cadastro Cargo/Função' });
            items.push({ href: 'cadastro_especialidades.html', icon: 'school', label: 'CADASTRAR GRADUAÇÕES' });
            items.push({ href: 'online.html', icon: 'satellite_alt', label: 'Monitoramento Online' });
            items.push({ href: 'cadastro_funcionario.html', icon: 'person_add', label: 'Cadastro Funcionários' });
        } else if (role === 'manager' || role === 'gestor' || role === 'comandante') {
            items.push({ href: 'painel_gestor.html', icon: 'dashboard', label: 'Início (Gestor)' });
            items.push({ href: 'relacao_funcionarios.html', icon: 'group', label: 'Funcionários' });
            items.push({ href: 'autorizacoes_abono.html', icon: 'pending_actions', label: 'Pendências' });
            items.push({ href: 'online.html', icon: 'satellite_alt', label: 'Monitoramento Online' });
            items.push({ href: 'perfil_funcionario.html', icon: 'person', label: 'Meu Perfil' });
        } else {
            // Funcionário comum
            items.push({ href: 'painel_funcionario.html', icon: 'home', label: 'Início' });
            items.push({ href: 'perfil_funcionario.html', icon: 'person', label: 'Meu Perfil' });
            items.push({ href: 'historico_anual.html', icon: 'history', label: 'Meu Histórico' });
        }

        menuHtml = items.map(item => {
            // Não propagar contexto para páginas de "Novo Cadastro"
            const skipContext = (item.href === 'cadastro_funcionario.html' || item.href === 'cadastro_setores.html' || item.href === 'cadastro_escalas.html' || item.href === 'cadastro_cargos.html');
            const finalHref = skipContext ? item.href : `${item.href}${item.href === 'perfil_funcionario.html' && !employeeId ? '' : contextQuery}`;
            
            return `
            <a href="${finalHref}" class="flex items-center gap-4 p-3 rounded-lg hover:bg-primary/10 text-slate-600 dark:text-slate-300 hover:text-primary transition-all group">
                <span class="material-symbols-outlined text-slate-400 group-hover:text-primary">${item.icon}</span>
                <span class="text-sm font-bold uppercase tracking-tight">${item.label}</span>
            </a>
            `;
        }).join('');

        sidebarNav.innerHTML = menuHtml;

        // Adicionar listener de logout se houver botão
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn && !logoutBtn.dataset.listenerAdded) {
            logoutBtn.addEventListener('click', async () => {
                const { Auth } = await import('./auth.js');
                Auth.logout();
            });
            logoutBtn.dataset.listenerAdded = 'true';
        }
    }
};

export { UI };
window.UI = UI;

// Auto-inicialização para evitar travamento de menu
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const role = localStorage.getItem('userRole');
        if (role && document.getElementById('sidebarNav')) {
            UI.initSidebar(role);
        }
    });
} else {
    const role = localStorage.getItem('userRole');
    if (role && document.getElementById('sidebarNav')) {
        UI.initSidebar(role);
    }
}
