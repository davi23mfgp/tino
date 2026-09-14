-- Conversa no WhatsApp deixa de ser gravada como TELEGRAM.
--
-- So acrescenta valor ao enum: nenhuma linha existente muda, e as que ja
-- estao como TELEGRAM ficam como estao — reescrever seria afirmar um canal
-- que ninguem registrou.
ALTER TYPE "OrigemCaptura" ADD VALUE IF NOT EXISTS 'WHATSAPP';
