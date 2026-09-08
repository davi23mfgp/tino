/**
 * Os seis bancos da grade de convite.
 *
 * SEM LOGO. O repositório não tem asset de marca licenciado, e usar a marca de
 * um banco sem direito de imagem — ou pior, desenhar um logo "parecido" — é
 * risco jurídico e engana quem olha. Cada quadrado mostra a inicial do banco na
 * cor que já é a dele no mundo real, que identifica sem copiar marca.
 *
 * Quando o Davi tiver os arquivos oficiais (ou o catálogo de conectores da
 * Pluggy, que já vem com `imageUrl` por instituição), é só trocar aqui: a tela
 * não muda.
 */

export interface BancoVitrine {
  nome: string
  /** O que aparece no quadrado enquanto não há logo licenciado. */
  inicial: string
  /** Cor de marca, usada só como fundo do quadrado. */
  cor: string
}

export const BANCOS_VITRINE: BancoVitrine[] = [
  { nome: "Nubank", inicial: "nu", cor: "#820ad1" },
  { nome: "Itaú", inicial: "it", cor: "#ec7000" },
  { nome: "Bradesco", inicial: "br", cor: "#cc092f" },
  { nome: "Santander", inicial: "sa", cor: "#ea1d25" },
  { nome: "C6 Bank", inicial: "c6", cor: "#1d1d1b" },
  { nome: "Inter", inicial: "in", cor: "#ff7a00" },
]
