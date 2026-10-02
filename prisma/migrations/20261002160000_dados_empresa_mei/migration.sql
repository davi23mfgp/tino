ALTER TABLE "MeiPerfil" ADD COLUMN "dadosConfirmadosEm" TIMESTAMP(3);
ALTER TABLE "Loja" ADD COLUMN "inscricaoEstadualIsenta" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "telefoneContato" TEXT;
CREATE TABLE "MetaDaLoja" (
  "id" TEXT NOT NULL,
  "lojaId" TEXT NOT NULL,
  "competencia" TEXT NOT NULL,
  "valorCentavos" INTEGER NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaDaLoja_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MetaDaLoja_lojaId_competencia_key" ON "MetaDaLoja"("lojaId", "competencia");
ALTER TABLE "MetaDaLoja" ADD CONSTRAINT "MetaDaLoja_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
