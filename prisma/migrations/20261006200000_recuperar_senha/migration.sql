ALTER TABLE "Usuario" ADD COLUMN "redefinicaoSenhaHash" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "redefinicaoSenhaExpiraEm" TIMESTAMP(3);
CREATE UNIQUE INDEX "Usuario_redefinicaoSenhaHash_key" ON "Usuario"("redefinicaoSenhaHash");
