-- CreateEnum
CREATE TYPE "StatusOrcamento" AS ENUM ('RASCUNHO', 'ENVIADO', 'APROVADO', 'CONVERTIDO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "MotivoPerdaOrcamento" AS ENUM ('PRECO', 'PRAZO', 'ATENDIMENTO', 'DESISTIU', 'SEM_RESPOSTA', 'OUTRO');

-- AlterTable
ALTER TABLE "ClienteLoja" ADD COLUMN     "email" TEXT,
ADD COLUMN     "observacao" TEXT,
ADD COLUMN     "proximoPasso" TEXT,
ADD COLUMN     "proximoPassoEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OrcamentoLoja" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "status" "StatusOrcamento" NOT NULL DEFAULT 'RASCUNHO',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "totalCentavos" INTEGER NOT NULL DEFAULT 0,
    "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "entradaCentavos" INTEGER,
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "validoAte" TIMESTAMP(3),
    "observacao" TEXT,
    "linkToken" TEXT NOT NULL,
    "enviadoEm" TIMESTAMP(3),
    "aberturas" INTEGER NOT NULL DEFAULT 0,
    "primeiraAberturaEm" TIMESTAMP(3),
    "ultimaAberturaEm" TIMESTAMP(3),
    "aprovadoEm" TIMESTAMP(3),
    "aprovadoPeloCliente" BOOLEAN NOT NULL DEFAULT false,
    "perdidoEm" TIMESTAMP(3),
    "motivoPerda" "MotivoPerdaOrcamento",
    "motivoPerdaDetalhe" TEXT,
    "vendaId" TEXT,
    "convertidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrcamentoLoja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOrcamentoLoja" (
    "id" TEXT NOT NULL,
    "orcamentoId" TEXT NOT NULL,
    "produtoId" TEXT,
    "servicoId" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "precoUnitarioCentavos" INTEGER NOT NULL,
    "totalCentavos" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ItemOrcamentoLoja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersaoOrcamentoLoja" (
    "id" TEXT NOT NULL,
    "orcamentoId" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "dados" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersaoOrcamentoLoja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrcamentoLoja_linkToken_key" ON "OrcamentoLoja"("linkToken");

-- CreateIndex
CREATE UNIQUE INDEX "OrcamentoLoja_vendaId_key" ON "OrcamentoLoja"("vendaId");

-- CreateIndex
CREATE INDEX "OrcamentoLoja_lojaId_status_idx" ON "OrcamentoLoja"("lojaId", "status");

-- CreateIndex
CREATE INDEX "OrcamentoLoja_clienteId_idx" ON "OrcamentoLoja"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "OrcamentoLoja_lojaId_numero_key" ON "OrcamentoLoja"("lojaId", "numero");

-- CreateIndex
CREATE INDEX "ItemOrcamentoLoja_orcamentoId_idx" ON "ItemOrcamentoLoja"("orcamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "VersaoOrcamentoLoja_orcamentoId_versao_key" ON "VersaoOrcamentoLoja"("orcamentoId", "versao");

-- AddForeignKey
ALTER TABLE "OrcamentoLoja" ADD CONSTRAINT "OrcamentoLoja_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoLoja" ADD CONSTRAINT "OrcamentoLoja_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "ClienteLoja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoLoja" ADD CONSTRAINT "OrcamentoLoja_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "VendaLoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrcamentoLoja" ADD CONSTRAINT "ItemOrcamentoLoja_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "OrcamentoLoja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrcamentoLoja" ADD CONSTRAINT "ItemOrcamentoLoja_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "ProdutoLoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrcamentoLoja" ADD CONSTRAINT "ItemOrcamentoLoja_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "ServicoLoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersaoOrcamentoLoja" ADD CONSTRAINT "VersaoOrcamentoLoja_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "OrcamentoLoja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
