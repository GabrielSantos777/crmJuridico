/*
  Warnings:

  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[code]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_leadId_fkey";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "code" TEXT NOT NULL;

-- DropTable
DROP TABLE "Client";

-- CreateIndex
CREATE UNIQUE INDEX "Lead_code_key" ON "Lead"("code");
