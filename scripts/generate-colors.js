const fs = require('fs');
const path = require('path');
const ase = require('ase-util');

const aseFilePath = path.join(__dirname, '..', 'src', 'colors.ase');
const outputCssPath = path.join(__dirname, '..', 'src', 'generated-colors.css');

try {
  const buffer = fs.readFileSync(aseFilePath);
  const data = ase.read(buffer);

  let css = '/* Generated from colors.ase */\n:root {\n';

  function processEntries(entries) {
    entries.forEach(entry => {
      if (entry.type === 'color' && entry.color.hex) {
        const name = entry.name.toLowerCase().replace(/\s+/g, '-');
        const rgb = entry.color.hex.match(/.{2}/g).map(x => parseInt(x, 16)).join(',');
        css += `  --${name}-rgb: ${rgb};\n`;
      } else if (entry.type === 'group') {
        processEntries(entry.entries);
      }
    });
  }

  processEntries(data);

  css += '}\n';

  fs.writeFileSync(outputCssPath, css);
  console.log('Generated CSS variables in src/generated-colors.css');
} catch (error) {
  console.error('Error generating colors:', error);
  process.exit(1);
}