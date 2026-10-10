-- "Não teve nota": a venda que o dono confirmou ter saído sem nota fiscal (passo 41).
ALTER TABLE "VendaLoja" ADD COLUMN "semNota" BOOLEAN NOT NULL DEFAULT false;
