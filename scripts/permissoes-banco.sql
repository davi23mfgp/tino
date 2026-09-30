-- Aplicar com o proprietário das tabelas após revisar os usuários de conexão.
-- Grupos NÃO fazem login: senhas e associação dos usuários reais são definidas
-- no provedor, sem segredo versionado. Não concede papel ao usuário PUBLIC.
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tino_execucao') THEN
    CREATE ROLE tino_execucao NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tino_backup') THEN
    CREATE ROLE tino_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tino_atendimento') THEN
    CREATE ROLE tino_atendimento NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END $$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO tino_execucao, tino_backup;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tino_execucao;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tino_execucao;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tino_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tino_execucao;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO tino_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO tino_execucao;

CREATE SCHEMA IF NOT EXISTS administracao;
REVOKE ALL ON SCHEMA public FROM tino_atendimento;
GRANT USAGE ON SCHEMA administracao TO tino_atendimento;
CREATE OR REPLACE VIEW administracao.cadastro AS
  SELECT "id", "nome", "email", "criadoEm", "ultimoLogin" FROM public."Usuario";
CREATE OR REPLACE VIEW administracao.assinaturas AS
  SELECT "usuarioId", "status", "planoId", "ciclo", "valorCentavos", "proximaCobrancaEm" FROM public."Assinatura";
GRANT SELECT ON administracao.cadastro, administracao.assinaturas TO tino_atendimento;
-- Não dar SELECT nas tabelas financeiras ou no hash da senha ao atendimento.
-- Usuários de execução/backup não podem ser donos das tabelas ou membros do
-- papel de migração: propriedade/hierarquia de papéis pode furar esses limites.
COMMIT;
