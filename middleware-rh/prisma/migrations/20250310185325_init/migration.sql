/*
  Warnings:

  - The primary key for the `Candidature` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `applicationLink` on the `Candidature` table. All the data in the column will be lost.
  - You are about to drop the column `hrDetails` on the `Candidature` table. All the data in the column will be lost.
  - You are about to drop the column `nextDeadline` on the `Candidature` table. All the data in the column will be lost.
  - The `id` column on the `Candidature` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Candidature" DROP CONSTRAINT "Candidature_pkey",
DROP COLUMN "applicationLink",
DROP COLUMN "hrDetails",
DROP COLUMN "nextDeadline",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "link" TEXT,
ADD COLUMN     "userId" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "statut" SET DEFAULT 'Postulé',
ADD CONSTRAINT "Candidature_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "photoURL" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_uid_key" ON "User"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Candidature" ADD CONSTRAINT "Candidature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uid") ON DELETE SET NULL ON UPDATE CASCADE;
