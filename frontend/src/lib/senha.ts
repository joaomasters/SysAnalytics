/** Espelha a política do backend (PoliticaSenha) para dar retorno imediato enquanto o usuário digita. */
export interface RegraSenha {
  rotulo: string
  ok: boolean
}

export function regrasDeSenha(senha: string): RegraSenha[] {
  return [
    { rotulo: 'Pelo menos 8 caracteres', ok: senha.length >= 8 },
    { rotulo: 'Uma letra maiúscula', ok: /\p{Lu}/u.test(senha) },
    { rotulo: 'Uma letra minúscula', ok: /\p{Ll}/u.test(senha) },
    { rotulo: 'Um número', ok: /\d/.test(senha) },
  ]
}

export const senhaValida = (senha: string) => regrasDeSenha(senha).every((r) => r.ok)
