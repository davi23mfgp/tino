/** Uma identidade compartilhada mantém o assistente reconhecível no painel e na navegação. */
export function TinoLeao({ className, retrato = false }: { className?: string; retrato?: boolean }) {
  return <span role="img" aria-label="Tino, leão de óculos espiando" className={className} style={{ display: "block", flexShrink: 0, backgroundColor: "currentColor", maskImage: "url('/mascote/tino-transparente.png')", WebkitMaskImage: "url('/mascote/tino-transparente.png')", maskRepeat: "no-repeat", maskPosition: "center", maskSize: retrato ? "auto 100%" : "contain" }} />
}



