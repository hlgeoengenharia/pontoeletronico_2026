const fs = require('fs');

try {
    let html = fs.readFileSync('screens/diario_funcionario.html', 'utf8');

    const targetPattern = /const isCiente = localStorage\.getItem\(`ciente_\$\{item\.id\}`\);/;
    const replacement = `const isCiente = item.lido === true || localStorage.getItem(\`ciente_\${item.id}\`);`;

    if (targetPattern.test(html)) {
        html = html.replace(targetPattern, replacement);
        console.log("isCiente logic updated.");
        fs.writeFileSync('screens/diario_funcionario.html', html);
    } else {
        console.log("Could not find isCiente line!");
    }
} catch (e) {
    console.error(e);
}
