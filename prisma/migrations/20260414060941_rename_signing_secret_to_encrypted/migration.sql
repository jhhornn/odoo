/*
  Warnings:

  - You are about to drop the column `signingSecretHash` on the `webhook_registrations` table. All the data in the column will be lost.
  - Added the required column `encryptedSigningSecret` to the `webhook_registrations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Rename column (preserves existing data)
ALTER TABLE "webhook_registrations" RENAME COLUMN "signingSecretHash" TO "encryptedSigningSecret";
