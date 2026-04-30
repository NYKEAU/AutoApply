/*
  Warnings:

  - Added the required column `updatedAt` to the `Candidature` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Candidature" ADD COLUMN     "applicationLink" TEXT,
ADD COLUMN     "hrDetails" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "nextDeadline" TEXT,
ADD COLUMN     "salary" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
