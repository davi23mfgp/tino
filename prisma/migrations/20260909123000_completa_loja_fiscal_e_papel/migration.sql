-- CreateEnum
CREATE TYPE "StatusNotaFiscal" AS ENUM ('PENDENTE', 'EMITIDA', 'REJEITADA', 'CANCELADA');

-- AlterEnum
ALTER TYPE "PapelMembro" ADD VALUE 'FUNCIONARIO_LOJA';

-- AlterTable
ALTER TABLE "Loja" ADD COLUMN     "certificadoConfiguradoEm" TIMESTAMP(3),
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "inscricaoEstadual" TEXT;

-- AlterTable
ALTER TABLE "ProdutoLoja" ADD COLUMN     "ncm" TEXT;

-- CreateTable
CREATE TABLE "NotaFiscalVenda" (
    "id" TEXT NOT NULL,
    "vendaId" TEXT NOT NULL,
    "status" "StatusNotaFiscal" NOT NULL DEFAULT 'PENDENTE',
    "chaveAcesso" TEXT,
    "numero" INTEGER,
    "serie" INTEGER,
    "xml" TEXT,
    "motivoRejeicao" TEXT,
    "emitidaEm" TIMESTAMP(3),
    "canceladaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaFiscalVenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotaFiscalVenda_vendaId_key" ON "NotaFiscalVenda"("vendaId");

-- CreateIndex
CREATE INDEX "NotaFiscalVenda_vendaId_idx" ON "NotaFiscalVenda"("vendaId");

-- CreateIndex
CREATE INDEX "NotaFiscalVenda_status_idx" ON "NotaFiscalVenda"("status");

-- AddForeignKey
ALTER TABLE "NotaFiscalVenda" ADD CONSTRAINT "NotaFiscalVenda_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "VendaLoja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
