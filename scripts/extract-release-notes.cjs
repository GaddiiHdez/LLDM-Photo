const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(__dirname, '../package.json');
const changelogPath = path.resolve(__dirname, '../CHANGELOG.md');
const outputPath = path.resolve(__dirname, '../release_notes.md');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = process.env.APP_VER || pkg.version;

let notes = '';
try {
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const escapedVer = version.replace(/\./g, '\\.');
  const regex = new RegExp(`##\\s*\\[${escapedVer}\\][\\s\\S]*?(?=\\n##\\s*\\[|$)`, 'i');
  const match = changelog.match(regex);
  if (match) {
    notes = match[0].trim();
  }
} catch (err) {
  console.warn('Advertencia leyendo CHANGELOG.md:', err);
}

if (!notes) {
  notes = `## 📸 BereaSnap v${version}\n\nActualización de rendimiento y correcciones generales.`;
}

const fullBody = `${notes}

### 📥 Instrucciones de Instalación:
1. Descarga el archivo \`BereaSnap-v${version}.apk\` o \`BereaSnap.apk\`.
2. Ábrelo en tu dispositivo Android e instálalo sobre tu versión anterior.
3. ¡Listo! Todo tu estudio fotográfico offline al alcance de tu mano.`;

fs.writeFileSync(outputPath, fullBody, 'utf8');
console.log(`[Release Notes] Generado exitosamente para v${version}`);
