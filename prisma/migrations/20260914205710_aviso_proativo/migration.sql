-- O aviso que hoje morre na tela ganha um caminho de saida.
--
-- Silencio e o padrao: sem linha em "AvisoProativo", nenhum lar recebe
-- mensagem. Mensagem iniciada pela empresa e cobrada pela Meta, e ninguem
-- pode ser cobrado sem ter dito sim antes.

CREATE TYPE "CanalAviso" AS ENUM ('NENHUM', 'WHATSAPP', 'TELEGRAM');

-- Trava de envio, separada da chave que evita repetir dentro do app.
ALTER TABLE "Alerta" ADD COLUMN "avisadoEm" TIMESTAMP(3);

CREATE TABLE "AvisoProativo" (
    "id" TEXT NOT NULL,
    "larId" TEXT NOT NULL,
    "canal" "CanalAviso" NOT NULL DEFAULT 'NENHUM',
    "limiteDiario" INTEGER NOT NULL DEFAULT 3,
    "horaInicio" INTEGER NOT NULL DEFAULT 9,
    "horaFim" INTEGER NOT NULL DEFAULT 21,
    "severidadeMinima" "SeveridadeAlerta" NOT NULL DEFAULT 'ATENCAO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvisoProativo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AvisoProativo_larId_key" ON "AvisoProativo"("larId");

ALTER TABLE "AvisoProativo" ADD CONSTRAINT "AvisoProativo_larId_fkey"
  FOREIGN KEY ("larId") REFERENCES "Lar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
