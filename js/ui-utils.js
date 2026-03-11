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
    }
};

export { UI };
