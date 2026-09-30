ALTER TABLE "Usuario" ADD COLUMN "googleId" TEXT;
CREATE UNIQUE INDEX "Usuario_googleId_key" ON "Usuario"("googleId");
