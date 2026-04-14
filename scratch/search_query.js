const fs = require('fs');
const path = require('path');

function searchFiles(dir, query) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                searchFiles(fullPath, query);
            }
        } else if (stats.isFile()) {
            if (file.endsWith('.js') || file.endsWith('.html')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes(query)) {
                    console.log(`FOUND in ${fullPath}`);
                    const lines = content.split('\n');
                    lines.forEach((line, index) => {
                        if (line.includes(query)) {
                            console.log(`  L${index + 1}: ${line.trim()}`);
                        }
                    });
                }
            }
        }
    }
}

searchFiles('.', 'subtipo.eq.hora_extra');
