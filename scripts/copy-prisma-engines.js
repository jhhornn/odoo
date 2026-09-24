const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve('src/generated/prisma');
const destination = path.resolve(process.argv[2] || 'dist/generated/prisma');

if (!fs.existsSync(source)) {
  throw new Error('Prisma client is missing. Run npm run prisma:generate first.');
}

const engines = fs.readdirSync(source).filter((name) => name.endsWith('.node'));
if (engines.length === 0) {
  throw new Error('No generated Prisma query engine was found.');
}

fs.mkdirSync(destination, { recursive: true });
for (const engine of engines) {
  fs.copyFileSync(path.join(source, engine), path.join(destination, engine));
}
