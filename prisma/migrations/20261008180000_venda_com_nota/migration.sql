-- A venda saiu com nota fiscal? Nulo é "ainda não marcado" (passo 41, relatório do MEI).
ALTER TABLE "VendaLoja" ADD COLUMN "comNota" BOOLEAN;
