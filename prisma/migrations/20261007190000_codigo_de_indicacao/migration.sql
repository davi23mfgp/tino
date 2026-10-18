-- Item 2.6: código de indicação de cada conta.
ALTER TABLE "Usuario" ADD COLUMN "codigoIndicacao" TEXT;
CREATE UNIQUE INDEX "Usuario_codigoIndicacao_key" ON "Usuario"("codigoIndicacao");
