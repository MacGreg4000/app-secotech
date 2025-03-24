/*
  Warnings:

  - You are about to drop the column `description` on the `AdminTask` table. All the data in the column will be lost.
  - You are about to drop the column `dueDate` on the `AdminTask` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `AdminTask` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `AdminTask` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[chantierId,taskType]` on the table `AdminTask` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `taskType` to the `AdminTask` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `AdminTask` DROP COLUMN `description`,
    DROP COLUMN `dueDate`,
    DROP COLUMN `priority`,
    DROP COLUMN `status`,
    ADD COLUMN `completed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `taskType` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `AdminTask_chantierId_taskType_key` ON `AdminTask`(`chantierId`, `taskType`);
