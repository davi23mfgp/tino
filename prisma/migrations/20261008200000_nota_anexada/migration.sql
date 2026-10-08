-- A nota que o dono anexa a uma venda marcada "com nota" (passo 41).
CREATE TABLE "NotaAnexada" (
    "id" TEXT NOT NULL,
    "vendaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaAnexada_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotaAnexada_vendaId_key" ON "NotaAnexada"("vendaId");

ALTER TABLE "NotaAnexada" ADD CONSTRAINT "NotaAnexada_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "VendaLoja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
