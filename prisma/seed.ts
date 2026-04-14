import { PrismaClient } from '../generated/prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function generateApiKey(): { rawKey: string; prefix: string; keyHash: string } {
  const rawBytes = crypto.randomBytes(32);
  const rawKey = `octo_odoo_${rawBytes.toString('base64url')}`;
  const prefix = rawKey.substring(0, 8);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return { rawKey, prefix, keyHash };
}

async function main() {
  const systems = [
    { systemName: 'platform-admin', scopes: ['admin', 'read', 'write'] },
    { systemName: 'octohealth', scopes: ['read', 'write'] },
    { systemName: 'octodoc', scopes: ['read', 'write'] },
  ];

  const keyOutput: string[] = [];

  for (const system of systems) {
    const { rawKey, prefix, keyHash } = generateApiKey();

    await prisma.apiKey.upsert({
      where: { systemName: system.systemName },
      update: {
        prefix,
        keyHash,
        scopes: system.scopes,
        revokedAt: null,
        isActive: true,
      },
      create: {
        prefix,
        keyHash,
        systemName: system.systemName,
        scopes: system.scopes,
        rateLimitTier: 'default',
      },
    });

    keyOutput.push(`${system.systemName}=${rawKey}`);
    const maskedKey =
      rawKey.substring(0, 16) + '...' + rawKey.substring(rawKey.length - 4);
    console.log(`Seeded "${system.systemName}" — key: ${maskedKey}`);
  }

  // Write full keys to a gitignored file for local dev use
  const keysFile = path.join(__dirname, '..', '.seed-keys');
  fs.writeFileSync(keysFile, keyOutput.join('\n') + '\n', { mode: 0o600 });
  console.log(`Full keys written to .seed-keys (gitignored, mode 0600)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
