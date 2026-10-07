-- O DAS deixa de ter valor padrão. R$ 75,80 não foi o DAS de ano nenhum e
-- aparecia como fato para quem nunca digitou o próprio. Vazio quer dizer "não
-- informado": a conta usa a tabela do ano pela atividade (`dasDoMes`).
ALTER TABLE "MeiPerfil" ALTER COLUMN "dasMensalCentavos" DROP NOT NULL;
ALTER TABLE "MeiPerfil" ALTER COLUMN "dasMensalCentavos" DROP DEFAULT;
UPDATE "MeiPerfil" SET "dasMensalCentavos" = NULL WHERE "dasMensalCentavos" = 7580;
