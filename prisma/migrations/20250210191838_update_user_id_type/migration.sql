/*
  Warnings:

  - The primary key for the `AdminTask` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `completed` on the `AdminTask` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `AdminTask` table. All the data in the column will be lost.
  - You are about to drop the column `taskType` on the `AdminTask` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `AdminTask` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `nom` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `prenom` on the `User` table. All the data in the column will be lost.
  - You are about to alter the column `role` on the `User` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(0))`.
  - Added the required column `title` to the `AdminTask` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `AdminTask` DROP FOREIGN KEY `AdminTask_completedBy_fkey`;

-- DropForeignKey
ALTER TABLE `Document` DROP FOREIGN KEY `Document_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `Note` DROP FOREIGN KEY `Note_createdBy_fkey`;

-- DropIndex
DROP INDEX `AdminTask_chantierId_taskType_key` ON `AdminTask`;

-- AlterTable
ALTER TABLE `AdminTask` DROP PRIMARY KEY,
    DROP COLUMN `completed`,
    DROP COLUMN `completedAt`,
    DROP COLUMN `taskType`,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `dueDate` DATETIME(3) NULL,
    ADD COLUMN `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    ADD COLUMN `title` VARCHAR(191) NOT NULL,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `completedBy` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `Document` MODIFY `createdBy` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Note` MODIFY `createdBy` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `User` DROP PRIMARY KEY,
    DROP COLUMN `nom`,
    DROP COLUMN `prenom`,
    ADD COLUMN `name` VARCHAR(191) NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `role` ENUM('ADMIN', 'MANAGER', 'USER') NOT NULL DEFAULT 'USER',
    ADD PRIMARY KEY (`id`);

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminTask` ADD CONSTRAINT `AdminTask_completedBy_fkey` FOREIGN KEY (`completedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
