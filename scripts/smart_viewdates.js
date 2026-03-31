const fs = require('fs');
let html = fs.readFileSync('screens/diario_funcionario.html', 'utf8');

const regexViewDates = /const viewDates = historyExpanded \? sortedDates : \(grouped\[todayDateStr\] \? \[todayDateStr\] \: \[\]\);/g;

const replViewDates = `
            const viewDates = historyExpanded ? sortedDates : sortedDates.filter(d => {
                if (d === todayDateStr) return true;
                // Mostrar dias que possuem pendências (mesmo que no passado/futuro)
                return grouped[d].some(item => {
                    const config = EventManager.getConfig(item);
                    if (item.itemType === 'FERIAS_FOLGA_GROUP') {
                        return !item.list.every(f => f.lido === true || localStorage.getItem('visto_feriado_' + f.id));
                    }
                    if (item.itemType === 'COMUNICADO') {
                        return !(item.lido === true || localStorage.getItem('ciente_' + item.id));
                    }
                    if (item.itemType === 'SISTEMA') {
                        return !localStorage.getItem('visto_' + item.id) && !config.autoClear;
                    }
                    if (item.itemType === 'JUSTIFICATIVA') {
                        return !localStorage.getItem('visto_justificativa_' + item.id) && item.status !== 'pendente';
                    }
                    return false;
                });
            });
`;

if (regexViewDates.test(html)) {
    html = html.replace(regexViewDates, replViewDates);
    fs.writeFileSync('screens/diario_funcionario.html', html);
    console.log("Smart ViewDates injected.");
} else {
    console.error("ViewDates regex mismatch.");
}
