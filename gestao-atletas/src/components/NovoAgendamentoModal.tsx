import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Atleta, Produto } from '../lib/types'
import { formatCurrency, todayISO } from '../lib/format'
import { Button, Field, Input, Label, Modal, Select } from './ui'

interface SessaoSlot {
  data: string
  horario: string
}

export function NovoAgendamentoModal({
  open,
  onClose,
  onCriado,
  atletaFixo,
}: {
  open: boolean
  onClose: () => void
  onCriado: () => void
  atletaFixo?: string
}) {
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [atletaId, setAtletaId] = useState('')
  const [produtoId, setProdutoId] = useState('')
  const [valor, setValor] = useState('')
  const [dataVenda, setDataVenda] = useState(todayISO())
  const [slots, setSlots] = useState<SessaoSlot[]>([{ data: todayISO(), horario: '' }])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    async function carregar() {
      const [{ data: atletasData }, { data: produtosData }] = await Promise.all([
        supabase.from('atletas').select('*').order('nome'),
        supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
      ])
      setAtletas(atletasData ?? [])
      setProdutos(produtosData ?? [])
      setAtletaId(atletaFixo ?? '')
      setProdutoId('')
      setValor('')
      setDataVenda(todayISO())
      setSlots([{ data: todayISO(), horario: '' }])
      setErro(null)
    }
    carregar()
  }, [open, atletaFixo])

  const produtoSelecionado = produtos.find((p) => p.id === produtoId)

  function handleProdutoChange(id: string) {
    setProdutoId(id)
    const produto = produtos.find((p) => p.id === id)
    if (produto) {
      setValor(String(produto.valor))
      const qtd = produto.qtd_sessoes
      setSlots(
        Array.from({ length: qtd }, (_, i) => slots[i] ?? { data: todayISO(), horario: '' }),
      )
    }
  }

  function atualizarSlot(index: number, field: keyof SessaoSlot, value: string) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!atletaId || !produtoId) {
      setErro('Selecione o atleta e o produto.')
      return
    }
    if (slots.some((s) => !s.data || !s.horario)) {
      setErro('Preencha data e horário de todas as sessões.')
      return
    }
    setSalvando(true)

    const { data: pacote, error: pacoteError } = await supabase
      .from('pacotes_vendidos')
      .insert({
        atleta_id: atletaId,
        produto_id: produtoId,
        produto_nome_snapshot: produtoSelecionado?.nome ?? '',
        qtd_sessoes_snapshot: produtoSelecionado?.qtd_sessoes ?? slots.length,
        data_venda: dataVenda,
        valor: Number(valor),
        status_pagamento: 'pendente',
      })
      .select()
      .single()

    if (pacoteError || !pacote) {
      setErro('Erro ao registrar o pacote: ' + pacoteError?.message)
      setSalvando(false)
      return
    }

    const sessoesPayload = slots.map((s) => ({
      pacote_id: pacote.id,
      atleta_id: atletaId,
      data: s.data,
      horario: s.horario,
      status: 'agendada' as const,
    }))

    const { error: sessoesError } = await supabase.from('sessoes').insert(sessoesPayload)
    setSalvando(false)

    if (sessoesError) {
      setErro('Pacote criado, mas houve erro ao agendar as sessões: ' + sessoesError.message)
      return
    }

    onCriado()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo agendamento" width="lg">
      <form onSubmit={salvar}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <Label>Atleta</Label>
            <Select required value={atletaId} onChange={(e) => setAtletaId(e.target.value)} disabled={!!atletaFixo}>
              <option value="">Selecione...</option>
              {atletas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome} {a.status === 'inativo' ? '(inativo)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>Produto / pacote</Label>
            <Select required value={produtoId} onChange={(e) => handleProdutoChange(e.target.value)}>
              <option value="">Selecione...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.qtd_sessoes}x) — {formatCurrency(p.valor)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <Label>Data da venda</Label>
            <Input type="date" required value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} />
          </Field>
          <Field>
            <Label>Valor do pacote (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </Field>
        </div>

        {slots.length > 0 && (
          <div className="mb-2">
            <Label>Sessões do pacote</Label>
            <div className="space-y-2">
              {slots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2">
                  <span className="w-16 shrink-0 text-xs font-medium text-gray-400">Sessão {i + 1}</span>
                  <Input
                    type="date"
                    required
                    value={slot.data}
                    onChange={(e) => atualizarSlot(i, 'data', e.target.value)}
                  />
                  <Input
                    type="time"
                    required
                    value={slot.horario}
                    onChange={(e) => atualizarSlot(i, 'horario', e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {erro && <p className="mb-3 mt-2 text-sm text-red-600">{erro}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Agendar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
