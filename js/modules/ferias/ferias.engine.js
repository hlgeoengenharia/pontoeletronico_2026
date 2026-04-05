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
        sectorRule: 1,
        monthNames: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    },

    async init(options = {}) {
        this.state.userRole = options.role || 'employee';
        this.state.userId = options.userId || localStorage.getItem('userId');
        
        if (options.targetEmployee) {
            // Reaproveitar objeto já carregado (Gestor ou Funcionário)
            this.state.targetEmployee = options.targetEmployee;
            this.state.sectorRule = options.targetEmployee.setores?.regra_ferias || 1;
        } else {
            // Busca defensiva se não fornecido
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
                supabase.from('ferias').select('*').eq('funcionario_id', empId).order('parcela_numero', { ascending: true })
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
        // Prev/Next Month
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

        // Gravar Parcela
        const btnGravar = document.getElementById('btn-gravar-parcela');
        if (btnGravar) btnGravar.onclick = () => this.handleGravarParcela();

        // Ações de Gestor
        const btnAprovar = document.getElementById('btn-aprovar-ferias');
        const btnRejeitar = document.getElementById('btn-rejeitar-ferias');
        if (btnAprovar) btnAprovar.onclick = () => this.submitAction('aprovado');
        if (btnRejeitar) btnRejeitar.onclick = () => this.submitAction('rejeitado');

        // Ação de Funcionário
        const btnConfirmarTudo = document.getElementById('btn-confirmar-tudo-ferias');
        if (btnConfirmarTudo) btnConfirmarTudo.onclick = () => this.submitAction('pendente');
    },

    renderAll() {
        this.renderCalendar();
        this.renderPhotoCards();
        this.updateProgress();
        this.updateSelectionPanel();
        this.updateProfileInfo();
    },

    updateProfileInfo() {
        const foto = document.getElementById('ferias-foto');
        const nome = document.getElementById('ferias-nome');
        const cargo = document.getElementById('ferias-cargo');
        const regra = document.getElementById('ferias-regras-info');

        if (nome) nome.innerText = this.state.targetEmployee.nome_completo.toUpperCase();
        if (cargo) cargo.innerText = `${this.state.targetEmployee.cargo_nome || 'TRIPULANTE'}`;
        if (foto) {
            // Reforço no carregamento da foto com fallback robusto e detecção de perfis_tripulantes
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

            const isMarked = this.state.currentParcelas.find(p => date >= p.start && date <= p.end);
            if (isMarked) dayEl.classList.add('marked');

            if (this.state.selection.start && this.state.selection.end) {
                if (date >= this.state.selection.start && date <= this.state.selection.end) dayEl.classList.add('selected');
            } else if (this.state.selection.start && date.getTime() === this.state.selection.start.getTime()) {
                dayEl.classList.add('selected');
            }

            dayEl.onclick = () => this.handleDayClick(date);
            grid.appendChild(dayEl);
        }

        this.updateMonthlyCounters();
    },

    handleDayClick(date) {
        if (this.state.currentParcelas.find(p => date >= p.start && date <= p.end)) return;

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

        // Validação de Regra
        let isValid = false;
        if (this.state.sectorRule == 1) isValid = (days === 30);
        else if (this.state.sectorRule == 2) isValid = (days >= 10 && days <= 20);
        else isValid = (days === 10);

        btn.disabled = !isValid;
        btn.innerText = isValid ? `Gravar Parcela (${days} dias)` : 'Regra Inválida';
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

        container.innerHTML = this.state.currentParcelas.map((p, i) => `
            <div onclick="FeriasEngine.focarParcela(${i})" class="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center mb-2 cursor-pointer hover:bg-white/10 hover:border-blue-500/30 transition-all group">
                <div>
                    <p class="text-[10px] font-black text-white group-hover:text-blue-400 transition-colors">${i+1}ª PARCELA (${p.days}d)</p>
                    <p class="text-[8px] text-slate-500">${p.start.toLocaleDateString('pt-BR')} - ${p.end.toLocaleDateString('pt-BR')}</p>
                </div>
                <button onclick="event.stopPropagation(); FeriasEngine.removerParcela(${i})" class="size-10 flex items-center justify-center rounded-xl bg-rose-500/5 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all">
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                </button>
            </div>
        `).join('');
    },

    focarParcela(i) {
        const p = this.state.currentParcelas[i];
        this.state.currentMonth = p.start.getMonth();
        this.state.currentYear = p.start.getFullYear();
        this.renderCalendar();
    },

    removerParcela(i) {
        this.state.currentParcelas.splice(i, 1);
        this.renderAll();
    },

    updateProgress() {
        const total = this.state.currentParcelas.reduce((acc, p) => acc + p.days, 0);
        const txtDias = document.getElementById('txt-dias-marcados');
        const txtParcelas = document.getElementById('parcela-count');
        const finalStatus = document.getElementById('final-status-display') || document.getElementById('final-control-panel');

        if (txtDias) txtDias.innerText = total;
        if (txtParcelas) txtParcelas.innerText = `${this.state.currentParcelas.length}/${this.state.sectorRule === 3 ? 3 : (this.state.sectorRule === 2 ? 2 : 1)} PARCELAS`;
        if (finalStatus) finalStatus.classList.toggle('hidden', total < 30);
    },

    async submitAction(status) {
        UI.showLoader();
        try {
            const empId = this.state.targetEmployee.id;
            const { data: currentItems } = await supabase.from('ferias').select('*').eq('funcionario_id', empId);
            const hasProposto = currentItems && currentItems.some(i => i.status === 'proposto' || i.status === 'pendente');

            if (status === 'rejeitado') {
                if (!confirm('Rejeitar este planejamento?')) { UI.hideLoader(); return; }
                
                if (hasProposto && currentItems.some(i => i.status === 'aprovado')) {
                    // Rejeição de uma EDIÇÃO: Remove propostas e congela as aprovadas
                    await supabase.from('ferias').delete().eq('funcionario_id', empId).or('status.eq.proposto,status.eq.pendente');
                    await supabase.from('ferias').update({ status: 'congelado' }).eq('funcionario_id', empId).eq('status', 'aprovado');
                    UI.showToast('Edição rejeitada. Plano original congelado.', 'info');
                } else {
                    // Primeira análise ou rejeição total
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
                }
            } else {
                // Aprovação (Manager) ou Proposição (Employee)
                // Limpeza total para garantir integridade do novo cronograma
                await supabase.from('ferias').delete().eq('funcionario_id', empId);
                
                const toInsert = this.state.currentParcelas.map((p, i) => ({
                    funcionario_id: empId,
                    data_inicio: p.start.toISOString().split('T')[0],
                    data_fim: p.end.toISOString().split('T')[0],
                    parcela_numero: i + 1,
                    status: status // 'aprovado' ou 'pendente/proposto'
                }));
                await supabase.from('ferias').insert(toInsert);
                UI.showToast(status === 'aprovado' ? 'Férias abonadas!' : 'Cronograma enviado!', 'success');
            }

            // Central de Eventos: Notificar Funcionário
            await supabase.from('diario_logs').insert([{
                funcionario_id: empId,
                tipo: 'aviso_ferias',
                mensagem_padrao: status === 'aprovado' ? 'Suas férias foram abonadas pelo gestor!' : (status === 'rejeitado' ? 'Seu planejamento de férias foi analisado. Revise o status.' : 'Seu novo cronograma foi enviado para análise.'),
                status_pendencia: 'pendente'
            }]);

            if (window.fecharModalFerias) window.fecharModalFerias();
            if (window.fecharCardFerias) window.fecharCardFerias();
            
            // Recarregar se necessário
            if (typeof init === 'function') await init();
            else if (this.state.userRole === 'employee') location.reload();

        } catch (err) {
            console.error('[FeriasEngine] Erro no submit:', err);
            UI.showToast('Erro ao processar ação.', 'error');
        } finally {
            UI.hideLoader();
        }
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
            nacional: currentMonthHolidays.filter(h => (h.tipo || '').includes('nacional') || h.escopo === 'geral').length,
            regional: currentMonthHolidays.filter(h => (h.tipo || '').includes('regional') || h.escopo === 'setorial').length,
            folga: currentMonthHolidays.filter(h => (h.tipo || '').includes('folga') || (!h.escopo)).length
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
