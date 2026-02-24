const fs = require('fs');
const imgData = fs.readFileSync('Logo/boq_header_logo.png');
const base64Str = 'data:image/png;base64,' + imgData.toString('base64');

let utilsStr = fs.readFileSync('src/utils/exportUtils.js', 'utf8');
const regex = /const BRAND_LOGO_BASE64 = 'data:image\/png;base64,[^']+';/g;

if (regex.test(utilsStr)) {
    utilsStr = utilsStr.replace(regex, `const BRAND_LOGO_BASE64 = '${base64Str}';`);
    fs.writeFileSync('src/utils/exportUtils.js', utilsStr);
    console.log('Fixed exportUtils.js with complete Base64 string!');
} else {
    console.log('Regex not found!');
}
