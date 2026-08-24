export type StatusAtleta = 'ativo' | 'inativo'
export type StatusPagamento = 'pago' | 'pendente'
export type StatusSessao = 'agendada' | 'realizada' | 'cancelada'

export interface Atleta {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  modalidade: string | null
  data_inicio: string
  status: StatusAtleta
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface Produto {
  id: string
  nome: string
  descricao: string | null
  qtd_sessoes: 1 | 2
  valor: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface PacoteVendido {
  id: string
  atleta_id: string
  produto_id: string
  produto_nome_snapshot: string
  qtd_sessoes_snapshot: number
  data_venda: string
  valor: number
  status_pagamento: StatusPagamento
  data_pagamento: string | null
  created_at: string
  updated_at: string
}

export interface Sessao {
  id: string
  pacote_id: string
  atleta_id: string
  data: string
  horario: string
  status: StatusSessao
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface PacoteComRelacoes extends PacoteVendido {
  atleta?: Atleta
  produto?: Produto
  sessoes?: Sessao[]
}

export interface SessaoComRelacoes extends Sessao {
  atleta?: Atleta
  pacote?: PacoteVendido
}
