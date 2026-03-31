import os

file_path = "screens/diario_funcionario.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target1 = """                                const isHE = item.subtipo === 'hora_extra';
                                const isCiente = localStorage.getItem(`ciente_${item.id}`);
                                const btnStyle = isCiente ? 
                                    'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                                    'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/10';

                                return `
                                    <div class="card-history slim-mode ${sideBorder} ${isFerias ? 'bg-vacation-soft' : ''} shadow-lg relative">
                                        <div class="flex justify-between items-start mb-2">"""

replacement1 = """                                const isHE = item.subtipo === 'hora_extra';
                                const isCiente = localStorage.getItem(`ciente_${item.id}`);
                                const btnStyle = isCiente ? 
                                    'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                                    'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/10';

                                let bgClass = isFerias ? 'bg-vacation-soft' : '';
                                if (isHE) {
                                    if (!isCiente) { sideBorder = 'premium-border-amber'; bgClass = 'bg-amber-500/10'; }
                                    else { sideBorder = 'premium-border-emerald'; }
                                }

                                return `
                                    <div class="card-history slim-mode ${sideBorder} ${bgClass} shadow-lg relative">
                                        <div class="flex justify-between items-start mb-2">"""

target2 = "${isAtividade ? 'ATIVIDADE DO DIA' : config.title}"
replacement2 = "${item.itemType === 'COMUNICADO' ? (isHE ? 'HORA EXTRA SOLICITADA' : 'COMUNICADO INTERNO') : (isAtividade ? 'ATIVIDADE DO DIA' : config.title)}"

# Use regex for flexibility over whitespace
import re

pat1 = re.compile(r"const isHE = item\.subtipo === 'hora_extra';\s+const isCiente = localStorage\.getItem\(`ciente_\$\{item\.id\}`\);\s+const btnStyle = isCiente \?\s+'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :\s+'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/10';\s+return `\s+<div class=\"card-history slim-mode \$\{sideBorder\} \$\{isFerias \? 'bg-vacation-soft' : ''\} shadow-lg relative\">\s+<div class=\"flex justify-between items-start mb-2\">")

match1 = pat1.search(content)
if match1:
    content = content[:match1.start()] + replacement1 + content[match1.end():]
else:
    print("Could not match chunk 1")

content = content.replace(target2, replacement2)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
