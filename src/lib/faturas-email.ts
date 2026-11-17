import {createHmac,timingSafeEqual} from "node:crypto"
export function emailConfigurado(){return Boolean(process.env.RESEND_API_KEY&&process.env.RESEND_WEBHOOK_SECRET&&process.env.FATURAS_EMAIL_DOMINIO&&process.env.FATURAS_EMAIL_SEGREDO)}
function assinatura(id:string){return createHmac("sha256",process.env.FATURAS_EMAIL_SEGREDO??"").update(id).digest("hex").slice(0,24)}
export function enderecoFaturas(id:string){return emailConfigurado()?`${id}+${assinatura(id)}@${process.env.FATURAS_EMAIL_DOMINIO}`:null}
export function contaDoEndereco(endereco:string){if(!emailConfigurado())return null;const m=/^([a-z0-9]+)\+([a-f0-9]{24})@([^@]+)$/i.exec(endereco.trim());if(!m||m[3].toLowerCase()!==process.env.FATURAS_EMAIL_DOMINIO?.toLowerCase())return null;return timingSafeEqual(Buffer.from(m[2]),Buffer.from(assinatura(m[1])))?m[1]:null}

/**
 * Código que o Gmail manda ao endereço novo quando a pessoa cria o
 * encaminhamento automático. Sem ele o Gmail não encaminha nada, e o e-mail
 * cai num endereço que só o Tino lê: se o Tino não mostrar o código, a pessoa
 * fica presa no passo. Vem no assunto, "(#123456789) Confirmação de
 * encaminhamento do Gmail", e no corpo; o assunto basta quase sempre.
 */
export function codigoDoGmail(email:{from?:string|null;subject?:string|null;text?:string|null}):string|null{
 const remetente=(email.from??"").toLowerCase()
 // Só o remetente do Google: outro e-mail com "(#123)" no assunto não pode
 // virar um código na tela da pessoa.
 if(!/forwarding-noreply@google\.com/.test(remetente))return null
 const doAssunto=/\(#(\d{6,12})\)/.exec(email.subject??"")
 if(doAssunto)return doAssunto[1]
 const doCorpo=/(?:c[oó]digo de confirma[cç][aã]o|confirmation code)\s*:\s*(\d{6,12})/i.exec(email.text??"")
 return doCorpo?doCorpo[1]:null
}
