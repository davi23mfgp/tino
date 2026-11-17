-- Renda fixa pelo CDI e saldo de milhas informado pela pessoa.
ALTER TABLE "Conta" ADD COLUMN "percentualCdiBps" INTEGER;

CREATE TABLE "SaldoMilhas" (
    "id" TEXT NOT NULL,
    "larId" TEXT NOT NULL,
    "programa" TEXT NOT NULL,
    "pontos" INTEGER NOT NULL,
    "pontosQueVencem" INTEGER,
    "venceEm" TIMESTAMP(3),
    "custoCentavos" INTEGER,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaldoMilhas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SaldoMilhas_larId_programa_key" ON "SaldoMilhas"("larId", "programa");
ALTER TABLE "SaldoMilhas" ADD CONSTRAINT "SaldoMilhas_larId_fkey" FOREIGN KEY ("larId") REFERENCES "Lar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
