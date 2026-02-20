const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.jsx') && !fullPath.includes('BounceButton')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes('<button') || content.includes('</button>')) {
                // Determine correct relative path to components
                const relativePathToSrc = path.relative(path.dirname(fullPath), srcDir);
                // If in src directly, relativePathToSrc is ''
                let importPath = '';
                if (relativePathToSrc === '') {
                    importPath = './components/BounceButton';
                } else if (relativePathToSrc === '..') {
                    // e.g. src/pages -> src -> src/components
                    importPath = '../components/BounceButton';
                } else if (relativePathToSrc === '..\\..') {
                    importPath = '../../components/BounceButton';
                } else {
                    // Fallback to absolute alias if set, else relative
                    importPath = path.join(relativePathToSrc, 'components/BounceButton').replace(/\\/g, '/');
                }

                // Add import if not present
                if (!content.includes('BounceButton from')) {
                    // find last import or top of file
                    const lines = content.split('\n');
                    let lastImportIndex = -1;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].startsWith('import ')) {
                            lastImportIndex = i;
                        }
                    }
                    const importStmt = `import BounceButton from '${importPath}';`;
                    if (lastImportIndex !== -1) {
                        lines.splice(lastImportIndex + 1, 0, importStmt);
                    } else {
                        lines.unshift(importStmt);
                    }
                    content = lines.join('\n');
                }

                // Replace tags
                content = content.replace(/<button /g, '<BounceButton ');
                content = content.replace(/<button>/g, '<BounceButton>');
                content = content.replace(/<\/button>/g, '</BounceButton>');

                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDir(srcDir);
