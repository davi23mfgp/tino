-- CreateEnum
CREATE TYPE "BandeiraCartao" AS ENUM ('VISA', 'MASTERCARD', 'ELO', 'AMERICAN_EXPRESS', 'HIPERCARD', 'OUTRA');

-- AlterTable
ALTER TABLE "Conta" ADD COLUMN     "bandeira" "BandeiraCartao";
