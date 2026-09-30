ALTER TABLE "Lar" ADD COLUMN "objetivosFinanceiros" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], ADD COLUMN "perfilDeRisco" TEXT;
CREATE TABLE "ConviteLar" (
 "id" TEXT NOT NULL, "larId" TEXT NOT NULL, "emissorId" TEXT NOT NULL, "email" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiraEm" TIMESTAMP(3) NOT NULL, "aceitoEm" TIMESTAMP(3),
 CONSTRAINT "ConviteLar_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ConviteLar_larId_fkey" FOREIGN KEY ("larId") REFERENCES "Lar"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ConviteLar_tokenHash_key" ON "ConviteLar"("tokenHash");
CREATE INDEX "ConviteLar_larId_email_idx" ON "ConviteLar"("larId", "email");
