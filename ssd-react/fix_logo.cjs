const fs = require('fs');
const path = require('path');

const logoPath = path.join('Logo', 'boq_header_logo.png');
const utilsPath = path.join('src', 'utils', 'exportUtils.js');

if (!fs.existsSync(logoPath)) {
    console.error('Logo file not found: ' + logoPath);
    process.exit(1);
}

const imgData = fs.readFileSync(logoPath);
const base64Str = 'data:image/png;base64,' + imgData.toString('base64');

let utilsStr = fs.readFileSync(utilsPath, 'utf8');
const regex = /const BRAND_LOGO_BASE64 = 'data:image\/png;base64,[^']+';/g;

if (regex.test(utilsStr)) {
    utilsStr = utilsStr.replace(regex, `const BRAND_LOGO_BASE64 = '${base64Str}';`);
    fs.writeFileSync(utilsPath, utilsStr);
    console.log('Fixed exportUtils.js with complete Base64 string!');
} else {
    console.error('BRAND_LOGO_BASE64 variable not found in ' + utilsPath);
    process.exit(1);
}
