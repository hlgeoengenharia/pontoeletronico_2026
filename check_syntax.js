const fs = require('fs');
const path = require('path');

const files = [
    'screens/painel_funcionario.html',
    'screens/estatistica_funcionario.html',
    'screens/historico_mensal.html',
    'screens/historico_anual.html'
];

files.forEach(file => {
    const fullPath = path.join('c:/Users/Windows 11/Documents/Projetos/Projeto_V01', file);
    if (!fs.existsSync(fullPath)) {
        console.log(`File not found: ${file}`);
        return;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const scripts = content.match(/<script type="module">([\s\S]*?)<\/script>/g);

    if (!scripts) {
        console.log(`No module scripts found in ${file}`);
        return;
    }

    scripts.forEach((script, i) => {
        const code = script.replace(/<script type="module">/, '').replace(/<\/script>/, '');
        try {
            // Very basic check: just see if it's not totally broken
            new Function(code);
            console.log(`Script ${i} in ${file} parsed successfully.`);
        } catch (e) {
            console.log(`Syntax error in script ${i} of ${file}: ${e.message}`);
        }
    });

    // Check for double tags
    const doubleClose = content.match(/<\/script>\s*<\/script>/);
    if (doubleClose) {
        console.log(`WARNING: Double script close tag found in ${file}`);
    }
});
