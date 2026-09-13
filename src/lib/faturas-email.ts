import {createHmac,timingSafeEqual} from "node:crypto"
export function emailConfigurado(){return Boolean(process.env.RESEND_API_KEY&&process.env.RESEND_WEBHOOK_SECRET&&process.env.FATURAS_EMAIL_DOMINIO&&process.env.FATURAS_EMAIL_SEGREDO)}
function assinatura(id:string){return createHmac("sha256",process.env.FATURAS_EMAIL_SEGREDO??"").update(id).digest("hex").slice(0,24)}
export function enderecoFaturas(id:string){return emailConfigurado()?`${id}+${assinatura(id)}@${process.env.FATURAS_EMAIL_DOMINIO}`:null}
export function contaDoEndereco(endereco:string){if(!emailConfigurado())return null;const m=/^([a-z0-9]+)\+([a-f0-9]{24})@([^@]+)$/i.exec(endereco.trim());if(!m||m[3].toLowerCase()!==process.env.FATURAS_EMAIL_DOMINIO?.toLowerCase())return null;return timingSafeEqual(Buffer.from(m[2].toLowerCase()),Buffer.from(assinatura(m[1].toLowerCase())))?m[1].toLowerCase():null}

/** Teto por anexo. O webhook corta o download ao ultrapassar. */
export const LIMITE_ANEXO_BYTES=10*1024*1024
/** Só fatura: PDF, CSV e OFX. Nome ausente ou outra extensão não entra. */
export function anexoAceito(nome?:string|null):nome is string{return Boolean(nome&&/\.(pdf|csv|ofx)$/i.test(nome))}
