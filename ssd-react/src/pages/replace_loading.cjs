const fs = require('fs');
const path = require('path');

const p = 'e:/My software Projects/SSD Constructions - react app/Custom software Main Functions/MainFunctions/ssd-react/src/pages/';

const files = fs.readdirSync(p).filter(f => f.endsWith('.jsx'));
let removedCount = 0;

files.forEach(file => {
    const fullPath = path.join(p, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // The exact regex to replace
    const regex = /\s*\{isLoading && <div style=\{\{\s*padding:\s*'20px',\s*textAlign:\s*'center',\s*color:\s*'#64748b'\s*\}\}>Loading database\.\.\.<\/div>\}/g;

    if (regex.test(content)) {
        content = content.replace(regex, '');
        fs.writeFileSync(fullPath, content);
        removedCount++;
        console.log(`Removed from ${file}`);
    }
});

console.log(`Total files modified: ${removedCount}`);
