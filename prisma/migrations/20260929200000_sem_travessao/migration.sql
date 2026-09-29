-- Sem travessão nos nomes que o próprio app gerou (Davi, 29/09/2026: "não
-- quero nenhum texto com travessão"). Até hoje o cadastro inicial criava a
-- dívida do cheque especial como "<conta> — cheque especial". Só esse padrão
-- muda: nome que a pessoa digitou fica como ela escreveu.
UPDATE "Divida" SET "credor" = replace("credor", ' — cheque especial', ', cheque especial')
WHERE "credor" LIKE '% — cheque especial';
