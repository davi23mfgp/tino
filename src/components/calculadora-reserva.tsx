"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SelectNative } from "@/components/ui/select-native"
import { Checkbox } from "@/components/ui/checkbox"
import { enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { mesesDeReservaSugeridos, alvoEmCentavos, type TipoDeRenda } from "@/lib/tino/reserva"
import estilos from "./calculadora-reserva.module.css"

/**
 * Quanto guardar, de acordo com a vida de quem pergunta.
 *
 * A tela mostrava um alvo pronto, sem dizer de onde vinha — e "seis meses" não
 * serve para todo mundo. Três perguntas mudam o número, e a conta aparece
 * parcela por parcela: quem entende o alvo persegue o alvo.
 */
export function CalculadoraReserva({
  custoEssencialCentavos,
  mesesAtuais,
  reservadoCentavos,
}: {
  custoEssencialCentavos: number
  mesesAtuais: number
  reservadoCentavos: number
}) {
  const router = useRouter()
  const [tipoDeRenda, setTipoDeRenda] = useState<TipoDeRenda>("ASSALARIADO")
  const [dependentes, setDependentes] = useState(0)
  const [rendaUnica, setRendaUnica] = useState(false)
  const [planoDeSaude, setPlanoDeSaude] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  const sugestao = mesesDeReservaSugeridos({ tipoDeRenda, dependentes, rendaUnica, planoDeSaude })
  const alvo = alvoEmCentavos(custoEssencialCentavos, sugestao.meses)
  const falta = Math.max(0, alvo - reservadoCentavos)
  const cobertura = custoEssencialCentavos > 0 ? reservadoCentavos / custoEssencialCentavos : 0

  async function aplicar() {
    setSalvando(true); setErro("")
    try {
      await enviar("/api/reserva", { meses: sugestao.meses, custoEssencialCentavos }, "PUT")
      router.refresh()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o alvo.")
    } finally { setSalvando(false) }
  }

  return (
    <section className={estilos.painel}>
      <header>
        <p className={estilos.rotulo}>Quanto você precisa guardar</p>
        <h2>
          {custoEssencialCentavos > 0
            ? <><em>{sugestao.meses} meses</em> do seu custo essencial, ou {formatarMoeda(alvo)}.</>
            : <>Registre um mês de gastos para calcularmos seu alvo.</>}
        </h2>
        {custoEssencialCentavos > 0 && (
          <p className={estilos.apoio}>
            Seu essencial é {formatarMoeda(custoEssencialCentavos)} por mês. Hoje a reserva cobre {cobertura.toFixed(1)} {cobertura === 1 ? "mês" : "meses"}
            {falta > 0 ? <> e faltam <b>{formatarMoeda(falta)}</b> para chegar no alvo.</> : <> — você já passou do alvo.</>}
          </p>
        )}
      </header>

      <div className={estilos.perguntas}>
        <label>
          Como entra o seu dinheiro
          <SelectNative value={tipoDeRenda} onChange={(evento) => setTipoDeRenda(evento.target.value as TipoDeRenda)}>
            <option value="ASSALARIADO">Salário fixo todo mês</option>
            <option value="MISTA">Uma parte fixa, outra variável</option>
            <option value="VARIAVEL">Tudo variável — autônomo, MEI, comissão</option>
          </SelectNative>
        </label>

        <label>
          Quantas pessoas dependem de você
          <SelectNative value={String(dependentes)} onChange={(evento) => setDependentes(Number(evento.target.value))}>
            <option value="0">Ninguém além de mim</option>
            <option value="1">1 pessoa</option>
            <option value="2">2 pessoas</option>
            <option value="3">3 pessoas</option>
            <option value="4">4 ou mais</option>
          </SelectNative>
        </label>

        <label className={estilos.marcavel}>
          <Checkbox checked={rendaUnica} onChange={(evento) => setRendaUnica(evento.target.checked)} />
          A casa vive de uma renda só
        </label>

        <label className={estilos.marcavel}>
          <Checkbox checked={planoDeSaude} onChange={(evento) => setPlanoDeSaude(evento.target.checked)} />
          Tenho plano de saúde pago
        </label>
      </div>

      {/* A conta aberta: cada linha diz por que o alvo subiu ou desceu. */}
      <ul className={estilos.conta}>
        {sugestao.partes.map((parte) => (
          <li key={parte.rotulo}>
            <span>{parte.rotulo}</span>
            <b data-negativo={parte.meses < 0}>{parte.meses > 0 ? "+" : ""}{parte.meses} {Math.abs(parte.meses) === 1 ? "mês" : "meses"}</b>
          </li>
        ))}
        <li className={estilos.somatorio}>
          <span>Seu alvo</span>
          <b>{sugestao.meses} meses{custoEssencialCentavos > 0 ? ` · ${formatarMoeda(alvo)}` : ""}</b>
        </li>
      </ul>

      <footer className={estilos.rodape}>
        <span>{mesesAtuais === sugestao.meses ? "É o alvo que já está valendo." : `Hoje seu alvo é de ${mesesAtuais} meses.`}</span>
        <Button onClick={() => void aplicar()} disabled={salvando || mesesAtuais === sugestao.meses}>
          {salvando ? "Salvando…" : "Usar este alvo"}
        </Button>
      </footer>
      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
    </section>
  )
}
