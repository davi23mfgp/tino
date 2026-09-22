-- DropForeignKey
ALTER TABLE "FaturaRecebida" DROP CONSTRAINT "FaturaRecebida_larId_fkey";

-- DropForeignKey
ALTER TABLE "IdentidadeVisual" DROP CONSTRAINT "IdentidadeVisual_larId_fkey";

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "sessoesValidasDesde" TIMESTAMP(3),
ADD COLUMN     "termosAceitosEm" TIMESTAMP(3),
ADD COLUMN     "termosVersao" TEXT;

-- AddForeignKey
ALTER TABLE "IdentidadeVisual" ADD CONSTRAINT "IdentidadeVisual_larId_fkey" FOREIGN KEY ("larId") REFERENCES "Lar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaturaRecebida" ADD CONSTRAINT "FaturaRecebida_larId_fkey" FOREIGN KEY ("larId") REFERENCES "Lar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
