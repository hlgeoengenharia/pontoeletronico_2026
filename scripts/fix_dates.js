const fs = require('fs');
let html = fs.readFileSync('screens/diario_funcionario.html', 'utf8');

const regexFer = /\/\/ 5\. Unificar e Agrupar Feriados\/Folgas por Data de Envio \(created_at\)[\s\S]*?const feriadoItems = Object\.entries\(groupedFerRes\)\.map\(\(\[key, list\]\) => \(\{[\s\S]*?\}\)\);/g;

const replFer = `// 5. Unificar e Agrupar Feriados/Folgas por Data Alvo (data)
                const ferRes = await supabase.from('feriados_folgas').select('*').or(\`funcionario_id.eq.\${targetId},setor_id.eq.\${sId},escopo.eq.geral\`);
                const groupedFerRes = (ferRes.data || []).reduce((acc, f) => {
                    const key = f.data; 
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(f);
                    return acc;
                }, {});

                const feriadoItems = Object.entries(groupedFerRes).map(([key, list]) => ({
                    id: 'group_' + key.replace(/[:.-]/g, ''),
                    created_at: list[0].created_at,
                    data_item: key,
                    itemType: 'FERIAS_FOLGA_GROUP',
                    list: list,
                    conteudo: list.map(f => \`\${f.data.split('-').reverse().slice(0,2).join('/')}: \${f.tipo.replace('_', ' ').toUpperCase()}\`).join(' | ')
                }));`;

html = html.replace(regexFer, replFer);

const regexItemsRaw = /const itemsRaw = \[[\s\S]*?\.\.\.feriadoItems\s*\];/g;
const replItemsRaw = `const getLocalISO = (dStr) => {
                    if (!dStr) return '';
                    const d = new Date(dStr);
                    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                };

                const itemsRaw = [
                    ...(resAnot.data || []).map(a => ({ ...a, itemType: 'ATIVIDADE', data_item: a.data, conteudo: a.conteudo })),
                    ...(resJust.data || []).map(j => ({ ...j, itemType: 'JUSTIFICATIVA', data_item: j.data_incidente, conteudo: j.descricao })),
                    ...(resCom.data || []).map(c => ({ ...c, itemType: 'COMUNICADO', data_item: getLocalISO(c.created_at), conteudo: c.conteudo })),
                    ...(resLogs.data || []).map(l => ({ ...l, itemType: 'SISTEMA', data_item: getLocalISO(l.data_hora), conteudo: l.mensagem_padrao })),
                    ...(groupedFerias ? [groupedFerias] : []),
                    ...feriadoItems
                ];`;

html = html.replace(regexItemsRaw, replItemsRaw);

fs.writeFileSync('screens/diario_funcionario.html', html);
console.log("Diário Date Sync fixed.");
