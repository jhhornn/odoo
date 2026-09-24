const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'nestjs-odoo-package-'));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) {
    throw new Error([result.stdout, result.stderr].filter(Boolean).join('\n'));
  }
  return result.stdout;
}

try {
  const packOutput = JSON.parse(
    run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temporaryDirectory]),
  );
  const tarball = path.join(temporaryDirectory, packOutput[0].filename);
  const consumer = path.join(temporaryDirectory, 'consumer');
  fs.mkdirSync(consumer);
  fs.writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify({ private: true, dependencies: { '@nestjs-odoo/core': 'file:' + tarball } }, null, 2),
  );
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: consumer });

  const library = require(path.join(consumer, 'node_modules/@nestjs-odoo/core'));
  const requiredExports = [
    'OdooModule', 'RedisModule', 'DatabaseModule', 'AuthModule', 'WebhookModule',
    'PartnerModule', 'ProductModule', 'InvoiceModule', 'PaymentModule', 'TaxModule',
    'OdooService', 'PaymentService', 'TaxService', 'ApiKeyService', 'WebhookEmitterService',
  ];
  for (const name of requiredExports) {
    assert.ok(library[name], 'Missing public export: ' + name);
  }

  const packageRoot = path.join(consumer, 'node_modules/@nestjs-odoo/core');
  assert.ok(fs.existsSync(path.join(packageRoot, 'dist/index.js')));
  assert.ok(fs.existsSync(path.join(packageRoot, 'dist/index.d.ts')));
  assert.ok(fs.existsSync(path.join(packageRoot, 'prisma/schema.prisma')));
  assert.ok(
    fs.readdirSync(path.join(packageRoot, 'dist/generated/prisma')).some((name) => name.endsWith('.node')),
    'The Prisma query engine is missing from the package.',
  );
  console.log('Package consumer smoke test passed.');
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
