-- AddForeignKey
ALTER TABLE `soustraitant_etat_avancement` ADD CONSTRAINT `soustraitant_etat_avancement_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
