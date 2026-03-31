const fs = require('fs');

try {
    let html = fs.readFileSync('screens/diario_funcionario.html', 'utf8');

    // 1. Fixing View Dates
    html = html.replace(
        'const viewDates = historyExpanded ? sortedDates : sortedDates.slice(0, 5);',
        'const todayDateStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split(\'T\')[0];\n            const viewDates = historyExpanded ? sortedDates : (grouped[todayDateStr] ? [todayDateStr] : []);\n            if(!historyExpanded && viewDates.length === 0) {\n                container.innerHTML = \'<div class="text-center py-10 opacity-30 text-[10px] uppercase font-bold tracking-widest text-slate-500">HOJE: Nenhum registro de eventos ou atividades</div>\';\n                return;\n            }'
    );

    // 2. Replacing FERIAS_FOLGA_GROUP UI
    const pattern = /<div class="bg-white\/5 border border-white\/5 rounded-2xl p-6 premium-border-purple shadow-lg relative">[\s\S]*?<\/div>\s*<\/div>\s*`;/;
    
    const replacement = `\${ (() => {
                                        const date = new Date(item.created_at);
                                        const cienteFlag = item.list.every(f => f.lido === true || localStorage.getItem('visto_feriado_' + f.id));
                                        
                                        return \`
                                            <div class="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3 group border-l-4 \${cienteFlag ? 'border-l-rose-500' : 'border-l-amber-500 bg-amber-500/5'} shadow-lg relative">
                                                <div class="flex justify-between items-start">
                                                    <div class="flex items-center gap-2">
                                                        <span class="material-symbols-outlined text-sm \${cienteFlag ? 'text-rose-500' : 'text-amber-500'}">event_note</span>
                                                        <span class="text-[9px] font-black uppercase tracking-widest \${cienteFlag ? 'text-rose-500' : 'text-amber-500'}">FERIADOS / FOLGAS</span>
                                                        <span class="text-[8px] font-bold text-slate-500 ml-2">
                                                            \${date.toLocaleDateString('pt-BR')} | \${date.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                                                        </span>
                                                    </div>
                                                    <div class="flex items-center gap-3">
                                                        \${!cienteFlag ? \`
                                                            <button onclick="window.marcarCiente('\${item.id}', 'FERIADO')" class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/10 hover:bg-amber-500/20 transition-all">
                                                                <span class="material-symbols-outlined text-[10px]">pending</span>
                                                                <span class="text-[7px] font-black uppercase tracking-tighter">ESTOU CIENTE</span>
                                                            </button>
                                                        \` : \`
                                                            <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                <span class="material-symbols-outlined text-[10px]">verified</span>
                                                                <span class="text-[7px] font-black uppercase tracking-tighter">CIENTE</span>
                                                            </div>
                                                        \`}
                                                    </div>
                                                </div>
                                                <p class="text-[11px] text-slate-300 leading-relaxed italic line-clamp-3">"\${item.conteudo}"</p>
                                            </div>
                                        \`;
                                    })() };`;

    if (pattern.test(html)) {
        html = html.replace(pattern, replacement);
        console.log("FERIAS_FOLGA_GROUP layout updated.");
    } else {
        console.log("Could not find FERIAS_FOLGA_GROUP block");
    }

    fs.writeFileSync('screens/diario_funcionario.html', html);
    console.log('Diary script applied successfully.');
} catch (e) {
    console.error(e);
}
