-- Aditiva: coluna opcional, sem default, sem toque em linha existente.
-- Guarda quando a pessoa usou "Limpar tudo" no painel de notificacoes.
-- Sem ela, limpar apagava a linha e o proximo GET recriava tudo pela chave
-- estavel: o botao parecia quebrado.
--
-- IF NOT EXISTS porque o banco de desenvolvimento ja recebeu a coluna por um
-- `migrate dev` que caiu antes de gravar o arquivo. Em banco limpo o efeito
-- e o mesmo.
ALTER TABLE "Alerta" ADD COLUMN IF NOT EXISTS "dispensadoEm" TIMESTAMP(3);
