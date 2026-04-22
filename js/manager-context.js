(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const employeeId = urlParams.get('id');
    const roleParam = urlParams.get('role');

    // Auth Session (Logged In)
    const loggedInId = localStorage.getItem('userId');
    const loggedInRoleRaw = localStorage.getItem('userRole');
    const loggedInRole = String(loggedInRoleRaw || '').toLowerCase();

    // UI State Role (Role to show/determine UI mode)
    // We normalize role display but we DON'T overwrite session storage
    let currentContextRole = roleParam || loggedInRole;
    if (currentContextRole === 'gestor') currentContextRole = 'manager';

    // normalizar IDs para comparação segura (remover espaços, converter para string)
    const normalizedLoggedInId = String(loggedInId || '').trim();
    const normalizedEmployeeId = String(employeeId || '').trim();

    const isGestorSession = (loggedInRole === 'admin' || loggedInRole === 'manager' || loggedInRole === 'gestor' || loggedInRole === 'comandante');
    // Só é inspeção se houver um ID na URL e esse ID for DIFERENTE do ID logado
    const isInspecting = normalizedEmployeeId && normalizedEmployeeId !== normalizedLoggedInId;
    console.log(`[ManagerContext V2.9] Inicializado. Session: ${loggedInRole}, Mode: ${isInspecting ? 'INSPECT' : 'SELF'}`);

    // Activation logic (UI Context Header & Bottom Nav Repurpose)
    if (isGestorSession) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('[ManagerContext] DOMContentLoaded - Gestor Session. Initializing UI elements.');
                if (isInspecting) injectManagerHeader();
                repurposeBottomNavToManager();
            });
        } else {
            console.log('[ManagerContext] Document ready - Gestor Session. Initializing UI elements.');
            if (isInspecting) injectManagerHeader();
            repurposeBottomNavToManager();
        }
    } else if (isInspecting) {
        // Fallback para inspeção mesmo sem ser gestor session (raro)
        console.log('[ManagerContext] Inspecting without Gestor Session. Injecting Manager Header.');
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectManagerHeader);
        } else {
            injectManagerHeader();
        }
    } else {
        // Regular employee mode (Self-mode for employees)
        console.log('[ManagerContext] Self-mode for employee. Cleaning up UI.');
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                cleanupUIForSelfMode();
            });
        } else {
            cleanupUIForSelfMode();
        }
    }

    // Always intercept links to pass ID/Role context
    interceptAllEmployeeLinks();

    async function injectManagerHeader() {
        if (!document.body || document.getElementById('manager-mode-bar')) return;

        // Fetch Employee Data for Header
        let employeeName = 'Carregando...';
        let employeePhoto = 'https://ui-avatars.com/api/?name=User&background=020617&color=fff';
        
        try {
            // Check if supabase instance is available, otherwise import it
            let supabaseClient = window.supabase;
            if (!supabaseClient || typeof supabaseClient.from !== 'function') {
                const config = await import('./supabase-config.js');
                supabaseClient = config.supabase;
            }

            if (supabaseClient && employeeId) {
                const { data, error } = await supabaseClient
                    .from('vw_funcionarios_gestao')
                    .select('nome_completo, nickname, foto_url')
                    .eq('id', employeeId)
                    .single();
                
                if (!error && data) {
                    employeeName = data.nickname || data.nome_completo || 'Tripulante';
                    if (data.foto_url) employeePhoto = data.foto_url;
                }
            }
        } catch (e) {
            console.warn('[ManagerContext] Erro ao buscar dados do funcionário:', e);
        }

        const style = document.createElement('style');
        style.id = 'manager-context-styles';
        style.textContent = `
            nav.fixed.bottom-0,
            header,
            #openSidebar,
            #sidebarMenu,
            #sidebarOverlay {
                ${isInspecting ? 'display: none !important;' : ''}
            }
            #manager-mode-bar {
                background: rgba(10, 14, 23, 0.98);
                border-bottom: 2px solid #f59e0b;
                padding: 12px 0;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 10001;
                display: flex;
                flex-direction: column;
                gap: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.8);
                backdrop-filter: blur(10px);
            }
            .manager-container {
                width: 100%;
                padding: 0 24px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            /* Garantir que o conteúdo não seja coberto e esconder elementos nativos */
            body { padding-top: ${isInspecting ? '140px !important' : '0'}; }
            
            .manager-tabs {
                display: flex; gap: 8px; background: rgba(255, 255, 255, 0.05);
                padding: 4px; border-radius: 12px;
                max-width: 500px;
                margin: 0 auto;
                width: 100%;
            }
            .manager-tab {
                flex: 1; display: flex; flex-direction: column; align-items: center;
                gap: 4px; padding: 8px 2px; border-radius: 8px;
                color: rgba(255, 255, 255, 0.4); text-decoration: none; transition: all 0.2s;
            }
            .manager-tab.active { background: #0d59f2; color: #fff; }
            .manager-tab span { font-size: 20px; }
            .manager-tab font { font-size: 8px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; }
            .manager-info-row { display: flex; justify-content: space-between; align-items: center; }
            .m-badge { background: #f59e0b; color: #000; font-size: 8px; font-weight: 950; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; }
            .m-label { color: rgba(255,255,255,0.5); font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
            .m-name { color: #f59e0b; font-size: 10px; font-weight: 900; text-transform: uppercase; }
            .m-photo { width: 24px; height: 24px; border-radius: 6px; border: 1px solid #f59e0b; object-cover: cover; }
            .m-close { color: #ef4444; font-size: 10px; font-weight: 900; cursor: pointer; background: rgba(239, 68, 68, 0.1); padding: 5px 12px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.2); }
            .m-pdf-btn { color: #fff; background: rgba(255, 255, 255, 0.1); padding: 5px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255, 255, 255, 0.2); }
            .m-pdf-btn:hover { background: rgba(255, 255, 255, 0.2); }

            @media print {
                #manager-mode-bar { display: none !important; }
                body { padding-top: 0 !important; }
                .no-print { display: none !important; }
            }
        `;
        document.head.appendChild(style);

        const header = document.createElement('div');
        header.id = 'manager-mode-bar';
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const tabs = [
            { id: 'dashboard.html', label: 'Painel', icon: 'dashboard' },
            { id: 'estatistica_funcionario.html', label: 'Estatística', icon: 'bar_chart' },
            { id: 'diario_funcionario.html', label: 'Diário', icon: 'edit_note' },
            { id: 'perfil_funcionario.html', label: 'Perfil', icon: 'person' }
        ];

        const roleQuery = currentContextRole ? `&role=${currentContextRole}` : '';
        header.innerHTML = `
            <div class="manager-container">
                <div class="manager-info-row">
                    <div class="flex items-center gap-3">
                        <img src="${employeePhoto}" class="m-photo" alt="Avatar">
                        <div class="flex flex-col">
                            <span class="m-label">INSPECIONANDO</span>
                            <span class="m-name">${employeeName}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        ${(currentPage === 'estatistica_funcionario.html' || currentPage === 'historico_mensal.html') ? `
                            <div class="m-pdf-btn" onclick="window.print()" title="Gerar PDF">
                                <span class="material-symbols-outlined !text-lg">picture_as_pdf</span>
                            </div>
                        ` : ''}
                        <div class="m-close" onclick="closeInspection()">FECHAR X</div>
                    </div>
                </div>
                <div class="manager-tabs">
                    ${tabs.map(tab => `
                        <a href="${tab.id}?id=${employeeId}${roleQuery}" class="manager-tab ${currentPage === tab.id ? 'active' : ''}">
                            <span class="material-symbols-outlined">${tab.icon}</span>
                            <font>${tab.label}</font>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.prepend(header);

        // Add the close function to the global scope so the onclick works
        window.closeInspection = function () {
            const role = String(localStorage.getItem('userRole') || '').toLowerCase();
            if (role === 'admin') {
                window.location.href = 'relacao_setores.html';
            } else if (role === 'manager' || role === 'gestor' || role === 'comandante') {
                window.location.href = 'relacao_funcionarios.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        };
    }

    function repurposeBottomNavToManager() {
        console.log('[ManagerContext] Applying persistence to Bottom Nav.');

        const bottomNav = document.querySelector('nav.fixed.bottom-0');
        if (!bottomNav) return;

        // The ID to use is either the inspected employee or the logged-in user
        const targetId = isInspecting ? employeeId : normalizedLoggedInId;
        if (!targetId) return;

        const links = bottomNav.querySelectorAll('a');
        links.forEach(link => {
            let href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.includes('id=')) {
                // Se for #, tentamos inferir pelo ID do elemento
                // ALWAYS override specific links based on logged-in role
                if (link.id === 'nav-inicio' || (link.querySelector('span:last-child') && link.querySelector('span:last-child').textContent.trim().toUpperCase() === 'INÍCIO')) {
                    href = 'dashboard.html';
                } else if (href === '#') {
                    // Fallback for other icons if still #
                    if (link.id === 'nav-perfil-link' || link.innerText.toLowerCase().includes('perfil')) {
                        href = 'perfil_funcionario.html';
                    } else if (link.innerText.toLowerCase().includes('estatística')) {
                        href = 'estatistica_funcionario.html';
                    } else if (link.innerText.toLowerCase().includes('histórico') || link.innerText.toLowerCase().includes('diário')) {
                        href = 'diario_funcionario.html';
                    }
                }

                if (href && href !== '#') {
                    const separator = href.includes('?') ? '&' : '?';
                    const roleQuery = loggedInRoleRaw ? `&role=${loggedInRoleRaw}` : '';
                    link.setAttribute('href', `${href}${separator}id=${targetId}${roleQuery}`);
                }
            }
        });
    }

    function cleanupUIForSelfMode() {
        // Remove any existing manager UI if we switch back to self
        const bar = document.getElementById('manager-mode-bar');
        if (bar) bar.remove();
        document.body.style.paddingTop = '';
    }

    function interceptAllEmployeeLinks() {
        const employeePages = [
            'dashboard.html',
            'estatistica_funcionario.html',
            'diario_funcionario.html',
            'historico_mensal.html',
            'perfil_funcionario.html',
            'justificativa.html',
            'anotacao_diaria.html',
            'resumo_dia.html',
            'historico_abonos.html'
        ];

        document.addEventListener('click', (e) => {
            let target = e.target.closest('a') || e.target.closest('button') || e.target.closest('div[onclick]');
            if (!target) return;

            let href = '';
            if (target.tagName === 'A') {
                href = target.getAttribute('href');
            } else {
                const onclick = target.getAttribute('onclick');
                if (onclick && onclick.includes('window.location.href')) {
                    const match = onclick.match(/window\.location\.href\s*=\s*(['"])(.*?)\1/);
                    if (match) href = match[2];
                }
            }

            if (!href || href.startsWith('http') || href.startsWith('#') || href.includes('javascript:')) return;

            const isEmployeePage = employeePages.some(page => href.includes(page));
            const hasId = href.includes('id=');

            // Determine the ID to preserve: inspection ID if inspecting, else logged-in ID
            const currentLoggedInId = localStorage.getItem('userId');
            const targetId = isInspecting ? employeeId : currentLoggedInId;

            if (isEmployeePage && !hasId && targetId) {
                console.log(`[ManagerContext] Intercepting link to ${href}. Passing ID: ${targetId}`);
                e.preventDefault();
                e.stopImmediatePropagation();
                const separator = href.includes('?') ? '&' : '?';
                const roleQuery = loggedInRole ? `&role=${loggedInRole}` : '';
                window.location.href = `${href}${separator}id=${targetId}${roleQuery}`;
            }
        }, true);
    }
})();
