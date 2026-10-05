-- CreateEnum
CREATE TYPE "EtapaOrdemServico" AS ENUM ('RECEBIDO', 'FAZENDO', 'ESPERANDO_PECA', 'PRONTO', 'ENTREGUE');

-- CreateTable
CREATE TABLE "CompromissoLoja" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalhe" TEXT,
    "inicioEm" TIMESTAMP(3) NOT NULL,
    "diaInteiro" BOOLEAN NOT NULL DEFAULT false,
    "feitoEm" TIMESTAMP(3),
    "clienteId" TEXT,
    "ordemId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompromissoLoja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdemServicoLoja" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteId" TEXT NOT NULL,
    "objeto" TEXT NOT NULL,
    "servico" TEXT NOT NULL,
    "naEntrada" TEXT,
    "etapa" "EtapaOrdemServico" NOT NULL DEFAULT 'RECEBIDO',
    "etapasEm" JSONB NOT NULL DEFAULT '{}',
    "prazoEm" TIMESTAMP(3),
    "valorCentavos" INTEGER,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "orcamentoId" TEXT,
    "vendaId" TEXT,
    "linkToken" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdemServicoLoja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvisoLoja" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "rota" TEXT,
    "acao" TEXT,
    "lidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvisoLoja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompromissoLoja_lojaId_inicioEm_idx" ON "CompromissoLoja"("lojaId", "inicioEm");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServicoLoja_orcamentoId_key" ON "OrdemServicoLoja"("orcamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServicoLoja_vendaId_key" ON "OrdemServicoLoja"("vendaId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServicoLoja_linkToken_key" ON "OrdemServicoLoja"("linkToken");

-- CreateIndex
CREATE INDEX "OrdemServicoLoja_lojaId_etapa_idx" ON "OrdemServicoLoja"("lojaId", "etapa");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServicoLoja_lojaId_numero_key" ON "OrdemServicoLoja"("lojaId", "numero");

-- CreateIndex
CREATE INDEX "AvisoLoja_lojaId_criadoEm_idx" ON "AvisoLoja"("lojaId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "AvisoLoja_lojaId_chave_key" ON "AvisoLoja"("lojaId", "chave");

-- AddForeignKey
ALTER TABLE "CompromissoLoja" ADD CONSTRAINT "CompromissoLoja_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompromissoLoja" ADD CONSTRAINT "CompromissoLoja_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "ClienteLoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompromissoLoja" ADD CONSTRAINT "CompromissoLoja_ordemId_fkey" FOREIGN KEY ("ordemId") REFERENCES "OrdemServicoLoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemServicoLoja" ADD CONSTRAINT "OrdemServicoLoja_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemServicoLoja" ADD CONSTRAINT "OrdemServicoLoja_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "ClienteLoja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemServicoLoja" ADD CONSTRAINT "OrdemServicoLoja_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "OrcamentoLoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemServicoLoja" ADD CONSTRAINT "OrdemServicoLoja_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "VendaLoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoLoja" ADD CONSTRAINT "AvisoLoja_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
