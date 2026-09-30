export function lerChaveBackup(texto: string | undefined): Buffer
export function ambientePostgres(endereco: string): NodeJS.ProcessEnv
export function criarCopia(opcoes: { destino: string; chave: Buffer; ambiente: NodeJS.ProcessEnv; programa?: string; argumentos?: string[] }): Promise<void>
export function verificarCopia(origem: string, chave: Buffer): Promise<void>
export function restaurarCopia(opcoes: { origem: string; chave: Buffer; ambiente: NodeJS.ProcessEnv; programa?: string }): Promise<void>
