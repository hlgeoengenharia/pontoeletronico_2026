import { supabase } from '../../supabase-config.js';
import { UI } from '../../ui-utils.js';

/**
 * FeriasEngine - ChronoSync Vacation Core
 * Unifica a inteligência de planejamento de férias para Gestores e Funcionários.
 */
export const FeriasEngine = {
    state: {
        userId: null,
        userRole: 'employee', // 'manager' ou 'employee'
        targetEmployee: null,
        holidays: [],
        currentParcelas: [],
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear(),
        selection: { start: null, end: null },
        focusedParcelIndex: null, // Índice da parcela sendo visualizada/focada
        selectionIsValid: false,
        isEmergencyMode: false, // Flag para edição de planos aprovados
        sectorRule: 1,
        monthNames: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    },

    async init(options = {}) {
        this.state.userRole = options.role || 'employee';
        this.state.userId = options.userId || localStorage.getItem('userId');
        this.state.isEmergencyMode = false; // Reset sempre ao iniciar
        
        if (options.targetEmployee) {
            this.state.targetEmployee = options.targetEmployee;
            this.state.sectorRule = options.targetEmployee.setores?.regra_ferias || 1;
        } else {
            if (!this.state.userId) {
                console.error('[FeriasEngine] UserID não encontrado.');
                UI.hideLoader();
                return;
            }
            const { data: user, error } = await supabase.from('funcionarios').select('*, setores!funcionarios_setor_id_fkey(id, regra_ferias)').eq('id', this.state.userId).single();
            if (error || !user) {
                console.error('[FeriasEngine] Erro crítico de inicialização:', error || 'User not found');
                UI.hideLoader();
                UI.showToast('Erro ao carregar perfil de férias.', 'error');
                return;
            }
            this.state.targetEmployee = user;
            this.state.sectorRule = user.setores?.regra_ferias || 1;
        }

        await this.fetchData();
        this.setupListeners();
        this.renderAll();
    },

    async fetchData() {
        if (!this.state.targetEmployee) return;
        const empId = this.state.targetEmployee.id;
        try {
            const [resH, resF] = await Promise.all([
                supabase.from('feriados_folgas').select('*').or(`funcionario_id.eq.${empId},escopo.eq.geral,setor_id.eq.${this.state.targetEmployee.setor_id}`),
                supabase.from('ferias').select('*').eq('funcionario_id', empId).order('data_inicio', { ascending: true })
            ]);

            this.state.holidays = resH.data || [];
            this.state.currentParcelas = (resF.data || []).map(f => ({
                id: f.id,
                start: new Date(f.data_inicio + 'T12:00:00'),
                end: new Date(f.data_fim + 'T12:00:00'),
                days: this.calculateDays(new Date(f.data_inicio), new Date(f.data_fim)),
                status: f.status
            }));
        } catch (err) {
            console.error('[FeriasEngine] Erro ao carregar dados:', err);
        }
    },

    setupListeners() {
        const btnPrev = document.getElementById('btn-prev-month');
        const btnNext = document.getElementById('btn-next-month');
        if (btnPrev) btnPrev.onclick = () => {
            this.state.currentMonth--;
            if (this.state.currentMonth < 0) { this.state.currentMonth = 11; this.state.currentYear--; }
            this.renderCalendar();
        };
        if (btnNext) btnNext.onclick = () => {
            this.state.currentMonth++;
            if (this.state.currentMonth > 11) { this.state.currentMonth = 0; this.state.currentYear++; }
            this.renderCalendar();
        };

        const btnGravar = document.getElementById('btn-gravar-parcela');
        if (btnGravar) btnGravar.onclick = () => this.handleGravarParcela();

        const btnAprovar = document.getElementById('btn-aprovar-ferias');
        const btnRejeitar = document.getElementById('btn-rejeitar-ferias');
        if (btnAprovar) btnAprovar.onclick = () => this.submitAction('aprovado');
        if (btnRejeitar) btnRejeitar.onclick = () => this.submitAction('rejeitado');

        const btnConfirmarTudo = document.getElementById('btn-confirmar-tudo-ferias');
        if (btnConfirmarTudo) btnConfirmarTudo.onclick = () => this.submitAction('pendente');
    },

    renderAll() {
        // Ordenação Cronológica Obrigatória
        this.state.currentParcelas.sort((a, b) => a.start - b.start);
        
        this.renderCalendar();
        this.renderPhotoCards();
        this.updateProgress();
        this.updateSelectionPanel();
        this.updateProfileInfo();
        this.updateControlVisibility();
    },

    updateControlVisibility() {
        const isManager = this.state.userRole === 'manager';
        const employeeActions = document.getElementById('employee-actions');
        const managerActions = document.getElementById('manager-actions');
        
        if (isManager) {
            if (employeeActions) employeeActions.classList.add('hidden');
            if (managerActions) managerActions.classList.remove('hidden');
        } else {
            if (employeeActions) employeeActions.classList.remove('hidden');
            if (managerActions) managerActions.classList.add('hidden');
        }
    },

    updateProfileInfo() {
        const foto = document.getElementById('ferias-foto-admin') || document.getElementById('ferias-foto');
        const nome = document.getElementById('ferias-nome-admin') || document.getElementById('ferias-nome');
        const cargo = document.getElementById('ferias-cargo-admin') || document.getElementById('ferias-cargo');
        const regra = document.getElementById('ferias-regras-info-admin') || document.getElementById('ferias-regras-info');

        if (nome) nome.innerText = this.state.targetEmployee.nome_completo.toUpperCase();
        if (cargo) cargo.innerText = `${this.state.targetEmployee.cargo_nome || 'TRIPULANTE'}`;
        if (foto) {
            const profileFoto = this.state.targetEmployee.perfis_tripulantes?.[0]?.foto_url || this.state.targetEmployee.foto_url;
            foto.src = profileFoto || `https://ui-avatars.com/api/?name=${this.state.targetEmployee.nome_completo}&background=0D59F2&color=fff`;
        }

        if (regra) {
            const ruleTxt = { 1: "Integral: 30 dias.", 2: "2 Parcelas (mín. 10 dias).", 3: "3 Parcelas fixas." };
            regra.innerText = `REGRA DO SETOR: ${ruleTxt[this.state.sectorRule]}`;
        }
    },

    renderCalendar() {
        const grid = document.getElementById('grid-calendar-ferias');
        const txtMonth = document.getElementById('txt-month-year');
        if (!grid) return;

        grid.innerHTML = '';
        txtMonth.innerText = `${this.state.monthNames[this.state.currentMonth]} ${this.state.currentYear}`;

        const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
        dayNames.forEach(name => {
            const head = document.createElement('div');
            head.className = 'text-[8px] font-black text-slate-500 text-center uppercase tracking-widest pb-2';
            head.innerText = name;
            grid.appendChild(head);
        });

        const firstDay = new Date(this.state.currentYear, this.state.currentMonth, 1).getDay();
        const daysInMonth = new Date(this.state.currentYear, this.state.currentMonth + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(this.state.currentYear, this.state.currentMonth, d);
            const dateISO = date.toISOString().split('T')[0];
            const dayEl = document.createElement('div');
            dayEl.className = 'glass-calendar-day';
            dayEl.innerText = d;

            const h = this.state.holidays.find(h => h.data === dateISO);
            if (h) {
                const t = (h.tipo || '').toLowerCase();
                if (t.includes('nacional')) dayEl.classList.add('holiday-national');
                else if (t.includes('regional')) dayEl.classList.add('holiday-regional');
                else if (t.includes('folga')) dayEl.classList.add('day-off');
            }

            const parcel = this.state.currentParcelas.find(p => date >= p.start && date <= p.end);
            const isMarked = !!parcel;

            if (parcel) {
                dayEl.classList.add('marked');
                const pIndex = this.state.currentParcelas.indexOf(parcel);
                if (this.state.focusedParcelIndex === pIndex) {
                    dayEl.classList.add('focused-day');
                }
            }

            const today = new Date();
            today.setHours(0,0,0,0);
            const minAnticipation = new Date(today);
            minAnticipation.setDate(minAnticipation.getDate() + 30);

            const isInGap = this.state.currentParcelas.some(p => {
                // Bloqueio Bidirecional (60 dias antes e 60 dias depois)
                const gapBefore = new Date(p.start); gapBefore.setDate(gapBefore.getDate() - 60);
                const gapAfter = new Date(p.end); gapAfter.setDate(gapAfter.getDate() + 60);
                return (date >= gapBefore && date < p.start) || (date > p.end && date <= gapAfter);
            });

            const isPast = date < today;
            const isTooSoon = date < minAnticipation;
            const status = this.state.currentParcelas[0]?.status?.toLowerCase();
            const isAprovado = status === 'aprovado';
            const isManager = this.state.userRole === 'manager';
            const lockingAprovado = isAprovado && !isManager && !this.state.isEmergencyMode;

            // Só congela se NÃO estiver marcado como parcela
            if (!isMarked && (isPast || isTooSoon || isInGap || lockingAprovado)) {
                dayEl.classList.add('day-congelado');
            }

            if (this.state.selection.start && this.state.selection.end) {
                if (date >= this.state.selection.start && date <= this.state.selection.end) {
                    dayEl.classList.add('selected');
                    if (this.state.selectionIsValid) dayEl.classList.add('selected-valid');
                }
            } else if (this.state.selection.start && date.getTime() === this.state.selection.start.getTime()) {
                dayEl.classList.add('selected');
            }

            dayEl.onclick = () => {
                if (!dayEl.classList.contains('day-congelado')) {
                    this.handleDayClick(date);
                }
            };
            grid.appendChild(dayEl);
        }
        this.updateMonthlyCounters();
    },

    handleDayClick(date) {
        const dayOfWeek = date.getDay();
        const isCurrentlyStarting = !this.state.selection.start || (this.state.selection.start && this.state.selection.end);
        
        if (isCurrentlyStarting && (dayOfWeek === 0 || dayOfWeek === 6)) {
            UI.showToast("A parcela não pode iniciar em um Sábado ou Domingo.", "warning");
            return;
        }

        const today = new Date(); today.setHours(0,0,0,0);
        const minAnt = new Date(today); minAnt.setDate(minAnt.getDate() + 30);
        const isInGap = this.state.currentParcelas.some(p => {
            const gapBefore = new Date(p.start); gapBefore.setDate(gapBefore.getDate() - 60);
            const gapAfter = new Date(p.end); gapAfter.setDate(gapAfter.getDate() + 60);
            return (date >= gapBefore && date < p.start) || (date > p.end && date <= gapAfter);
        });

        if (date < minAnt || isInGap || this.state.currentParcelas.find(p => date >= p.start && date <= p.end)) return;

        if (!this.state.selection.start || (this.state.selection.start && this.state.selection.end)) {
            this.state.selection.start = date;
            this.state.selection.end = null;
        } else {
            this.state.selection.end = date < this.state.selection.start ? this.state.selection.start : date;
            this.state.selection.start = date < this.state.selection.start ? date : this.state.selection.start;
        }
        this.updateSelectionPanel();
        this.renderCalendar();
    },

    updateSelectionPanel() {
        const panel = document.getElementById('current-selection-panel');
        const btn = document.getElementById('btn-gravar-parcela');
        if (!panel || !btn) return;

        if (!this.state.selection.start || !this.state.selection.end) {
            panel.classList.add('hidden');
            btn.disabled = true;
            btn.innerText = 'Selecione o Período';
            return;
        }

        panel.classList.remove('hidden');
        const days = this.calculateDays(this.state.selection.start, this.state.selection.end);
        document.getElementById('selection-start').innerText = this.state.selection.start.toLocaleDateString('pt-BR');
        document.getElementById('selection-end').innerText = this.state.selection.end.toLocaleDateString('pt-BR');
        document.getElementById('selection-days').innerText = days;

        let isValid = false;
        if (this.state.sectorRule == 1) {
            isValid = (days === 30);
            btn.innerText = isValid ? `Gravar 30 Dias` : `Selecione 30 Dias`;
        } else if (this.state.sectorRule == 2) {
            isValid = (days === 15);
            btn.innerText = isValid ? `Gravar 15 Dias` : `Selecione 15 Dias`;
        } else {
            isValid = (days === 10);
            btn.innerText = isValid ? `Gravar 10 Dias` : `Selecione 10 Dias`;
        }

        btn.disabled = !isValid;
        if (isValid) btn.classList.add('btn-gravar-ativo');
        else btn.classList.remove('btn-gravar-ativo');
    },

    handleGravarParcela() {
        const days = this.calculateDays(this.state.selection.start, this.state.selection.end);
        const already = this.state.currentParcelas.reduce((acc, p) => acc + p.days, 0);
        if (already + days > 30) { UI.showToast('Limite de 30 dias excedido', 'error'); return; }

        this.state.currentParcelas.push({ start: this.state.selection.start, end: this.state.selection.end, days: days, status: 'pendente' });
        this.state.selection = { start: null, end: null };
        this.renderAll();
    },

    renderPhotoCards() {
        const container = document.getElementById('photo-cards-container');
        if (!container) return;

        if (this.state.currentParcelas.length === 0) {
            container.innerHTML = `<div class="p-8 border border-dashed border-white/5 rounded-2xl opacity-20 text-center"><p class="text-[9px] font-black uppercase tracking-widest text-slate-500">Nenhuma parcela gravada</p></div>`;
            return;
        }

        container.innerHTML = this.state.currentParcelas.map((p, i) => {
            const isApproved = p.status === 'aprovado' || p.status === 'congelado';
            const accentClass = isApproved ? 'border-emerald-500/30 shadow-emerald-500/10' : 'border-blue-500/30 shadow-blue-500/10';
            const textAccent = isApproved ? 'text-emerald-400' : 'text-blue-400';

            return `
            <div onclick="FeriasEngine.focarParcela(${i})" class="bg-gradient-to-br from-white/[0.08] to-transparent p-6 rounded-3xl border ${accentClass} flex justify-between items-center mb-5 cursor-pointer hover:from-white/[0.12] hover:border-blue-500/60 transition-all active:scale-[0.98] group shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <div class="flex flex-col gap-1.5">
                    <p class="text-[10px] font-black ${textAccent} uppercase tracking-[0.3em] ml-1 mb-1 text-shadow-sm">${i+1}ª PARCELA CONQUISTADA</p>
                    <div class="flex items-baseline gap-2">
                         <span class="text-[32px] font-black text-white leading-none tracking-tighter italic">${p.days}</span>
                         <span class="text-[12px] font-black text-white/40 uppercase tracking-widest">DIAS DISPONÍVEIS</span>
                    </div>
                    <p class="text-[18px] text-white font-black tracking-tight mt-1 bg-white/5 py-1 px-3 rounded-lg border border-white/5 w-fit shadow-inner">
                        ${new Date(p.start).toLocaleDateString('pt-BR')} <span class="mx-2 text-white/20">➔</span> ${new Date(p.end).toLocaleDateString('pt-BR')}
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    ${(!isApproved || this.state.isEmergencyMode) ? `
                    <button onclick="event.stopPropagation(); FeriasEngine.editarParcela(${i})" class="size-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 hover:bg-cyan-500 hover:text-white transition-all flex items-center justify-center shadow-lg group/edit" title="Editar Parcela">
                        <span class="material-symbols-outlined text-2xl group-hover/edit:rotate-12 transition-transform">edit_calendar</span>
                    </button>
                    <button onclick="event.stopPropagation(); FeriasEngine.removerParcela(${i})" class="size-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-lg group/del" title="Excluir Parcela">
                        <span class="material-symbols-outlined text-2xl group-hover/del:scale-110 transition-transform">delete_sweep</span>
                    </button>
                    ` : `
                    <div class="size-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-sm opacity-60">
                        <span class="material-symbols-outlined text-2xl font-variation-settings-fill">verified</span>
                    </div>
                    `}
                </div>
            </div>`;
        }).join('');
    },

    focarParcela(i) {
        const p = this.state.currentParcelas[i];
        this.state.currentMonth = p.start.getMonth();
        this.state.currentYear = p.start.getFullYear();
        this.state.focusedParcelIndex = i;
        this.renderCalendar();
        const grid = document.getElementById('grid-calendar-ferias');
        if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { this.state.focusedParcelIndex = null; this.renderCalendar(); }, 3000);
    },

    editarParcela(i) {
        const p = this.state.currentParcelas[i];
        if (p.status === 'aprovado' && !this.state.isEmergencyMode) return;
        
        // Reabre a seleção no calendário
        this.state.selection = { start: p.start, end: p.end };
        this.state.currentMonth = p.start.getMonth();
        this.state.currentYear = p.start.getFullYear();
        
        // Remove a parcela para que possa ser regravada
        this.state.currentParcelas.splice(i, 1);
        this.renderAll();
        
        UI.showToast("Parcela aberta para edição no calendário", "info");
    },

    removerParcela(i) {
        const p = this.state.currentParcelas[i];
        if (p.status === 'aprovado' && !this.state.isEmergencyMode) return;
        
        if (!confirm('Deseja remover esta parcela?')) return;
        this.state.currentParcelas.splice(i, 1);
        this.renderAll();
    },

    updateProgress() {
        const total = this.state.currentParcelas.reduce((acc, p) => acc + p.days, 0);
        const txtDias = document.getElementById('txt-dias-marcados');
        const txtParcelas = document.getElementById('parcela-count');
        const finalStatus = document.getElementById('final-status-display');
        const controlPanel = document.getElementById('final-control-panel');
        const managerActions = document.getElementById('manager-actions');
        const employeeActions = document.getElementById('employee-actions');

        if (txtDias) txtDias.innerText = total;
        if (txtParcelas) txtParcelas.innerText = `${this.state.currentParcelas.length}/${this.state.sectorRule === 3 ? 3 : (this.state.sectorRule === 2 ? 2 : 1)} PARCELAS`;

        const isComplete = total >= 30;
        if (finalStatus) finalStatus.classList.toggle('hidden', !isComplete);
        
        const status = this.state.currentParcelas[0]?.status?.toLowerCase();
        const isAprovado = status === 'aprovado';
        const isManager = this.state.userRole === 'manager';
        
        if (managerActions) managerActions.classList.toggle('hidden', !isManager);
        if (employeeActions) employeeActions.classList.toggle('hidden', isManager || !isComplete || (isAprovado && !this.state.isEmergencyMode));

        const btnEditarEmergencia = document.getElementById('btn-editar-emergencia');
        if (btnEditarEmergencia) {
            btnEditarEmergencia.classList.toggle('hidden', !isManager || !isAprovado || this.state.isEmergencyMode);
            btnEditarEmergencia.onclick = () => {
                this.state.isEmergencyMode = true;
                UI.showToast('Modo de Edição Emergencial Ativado', 'warning');
                this.renderAll();
            };
        }

        const btnAprovar = document.getElementById('btn-aprovar-ferias');
        if (btnAprovar) {
            if (this.state.isEmergencyMode) {
                btnAprovar.innerHTML = `<span class="material-symbols-outlined text-lg">save</span> Atualizar`;
                btnAprovar.classList.replace('bg-emerald-500/10', 'bg-blue-500/10');
                btnAprovar.classList.replace('text-emerald-500', 'text-blue-500');
            } else {
                btnAprovar.innerHTML = `<span class="material-symbols-outlined text-lg font-variation-settings-fill">check_circle</span> Abonar`;
                btnAprovar.classList.replace('bg-blue-500/10', 'bg-emerald-500/10');
                btnAprovar.classList.replace('text-blue-500', 'text-emerald-500');
            }
        }

        if (controlPanel) {
            controlPanel.classList.toggle('hidden', !isManager && (!isComplete || (isAprovado && !this.state.isEmergencyMode)));
        }
    },

    async submitAction(status) {
        UI.showLoader();
        try {
            const empId = this.state.targetEmployee.id;
            if (status === 'rejeitado') {
                if (!confirm('Rejeitar este planejamento?')) { UI.hideLoader(); return; }
                await supabase.from('ferias').delete().eq('funcionario_id', empId);
                const toInsert = this.state.currentParcelas.map((p, i) => ({
                    funcionario_id: empId,
                    data_inicio: p.start.toISOString().split('T')[0],
                    data_fim: p.end.toISOString().split('T')[0],
                    parcela_numero: i + 1,
                    status: 'rejeitado'
                }));
                await supabase.from('ferias').insert(toInsert);
                UI.showToast('Planejamento rejeitado.', 'warning');
            } else {
                await supabase.from('ferias').delete().eq('funcionario_id', empId);
                const toInsert = this.state.currentParcelas.map((p, i) => ({
                    funcionario_id: empId,
                    data_inicio: p.start.toISOString().split('T')[0],
                    data_fim: p.end.toISOString().split('T')[0],
                    parcela_numero: i + 1,
                    status: status
                }));
                await supabase.from('ferias').insert(toInsert);
                UI.showToast(status === 'aprovado' ? 'Férias abonadas!' : 'Cronograma enviado!', 'success');
            }

            await supabase.from('diario_logs').insert([{
                funcionario_id: empId,
                tipo: 'aviso_ferias',
                mensagem_padrao: status === 'aprovado' ? 'Suas férias foram abonadas pelo gestor!' : (status === 'rejeitado' ? 'Seu planejamento de férias foi analisado.' : 'Seu cronograma foi enviado para análise.'),
                status_pendencia: 'pendente'
            }]);

            if (typeof window.fecharModalFerias === 'function') window.fecharModalFerias();
            if (typeof window.fecharCardFerias === 'function') window.fecharCardFerias();
            
            if (typeof window.init === 'function') await window.init();
            else if (this.state.userRole === 'employee') location.reload();

        } catch (err) {
            console.error('[FeriasEngine] Erro no submit:', err);
            UI.showToast('Erro ao processar ação.', 'error');
        } finally { UI.hideLoader(); }
    },

    calculateDays(start, end) {
        const diff = Math.abs(end - start);
        return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    },

    updateMonthlyCounters() {
        const panel = document.getElementById('monthly-stats-panel-admin') || document.getElementById('monthly-stats-panel');
        if (!panel) return;
        const currentMonthHolidays = this.state.holidays.filter(h => {
            const d = new Date(h.data + 'T12:00:00');
            return d.getMonth() === this.state.currentMonth && d.getFullYear() === this.state.currentYear;
        });
        const counts = {
            nacional: currentMonthHolidays.filter(h => (h.tipo || '').includes('nacional')).length,
            regional: currentMonthHolidays.filter(h => (h.tipo || '').includes('regional')).length,
            folga: currentMonthHolidays.filter(h => (h.tipo || '').includes('folga')).length
        };
        const txtN = document.getElementById('count-nacionais-admin') || document.getElementById('count-nacionais');
        const txtR = document.getElementById('count-regionais-admin') || document.getElementById('count-regionais');
        const txtF = document.getElementById('count-folgas-admin') || document.getElementById('count-folgas');
        if (txtN) txtN.innerText = counts.nacional;
        if (txtR) txtR.innerText = counts.regional;
        if (txtF) txtF.innerText = counts.folga;
        panel.classList.toggle('hidden', (counts.nacional + counts.regional + counts.folga) === 0);
    }
};

window.FeriasEngine = FeriasEngine;
