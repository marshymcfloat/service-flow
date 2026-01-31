/*
  Warnings:

  - Added the required column `initials` to the `Business` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "initials" CHAR(2) NOT NULL;
