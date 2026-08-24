import { useEffect, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Produto } from '../lib/types'
import { formatCurrency } from '../lib/format'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Label,
  Modal,
  PageHeader,
  Spinner,
  Textarea,
} from '../components/ui'

const emptyForm = { nome: '', descricao: '', qtd_sessoes: '1', valor: '' }

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('produtos').select('*').order('ativo', { ascending: false }).order('nome')
    setProdutos(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  function abrirNovo() {
    setEditando(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function abrirEdicao(p: Produto) {
    setEditando(p)
    setForm({
      nome: p.nome,
      descricao: p.descricao ?? '',
      qtd_sessoes: String(p.qtd_sessoes),
      valor: String(p.valor),
    })
    setModalOpen(true)
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      qtd_sessoes: Number(form.qtd_sessoes),
      valor: Number(form.valor),
    }
    if (editando) {
      await supabase.from('produtos').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('produtos').insert({ ...payload, ativo: true })
    }
    setSalvando(false)
    setModalOpen(false)
    carregar()
  }

  async function alternarAtivo(p: Produto) {
    await supabase.from('produtos').update({ ativo: !p.ativo }).eq('id', p.id)
    carregar()
  }

  return (
    <div>
      <PageHeader
        title="Produtos"
        description="Tipos de pacote de sessão tática que você vende."
        actions={
          <Button onClick={abrirNovo}>
            <Plus size={16} /> Novo produto
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner />
        ) : produtos.length === 0 ? (
          <EmptyState title="Nenhum produto cadastrado" description="Cadastre os pacotes que você oferece." />
        ) : (
          <div className="divide-y divide-gray-100">
            {produtos.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{p.nome}</p>
                    <Badge tone={p.ativo ? 'green' : 'gray'}>{p.ativo ? 'Ativo' : 'Desativado'}</Badge>
                  </div>
                  {p.descricao && <p className="text-sm text-gray-500">{p.descricao}</p>}
                  <p className="mt-0.5 text-xs text-gray-400">
                    {p.qtd_sessoes} sessão{p.qtd_sessoes > 1 ? 'ões' : ''} · {formatCurrency(p.valor)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => abrirEdicao(p)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => alternarAtivo(p)}>
                    {p.ativo ? 'Desativar' : 'Reativar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar produto' : 'Novo produto'}>
        <form onSubmit={salvar}>
          <Field>
            <Label>Nome</Label>
            <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field>
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Label>Sessões no pacote</Label>
              <select
                required
                value={form.qtd_sessoes}
                onChange={(e) => setForm({ ...form, qtd_sessoes: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="1">1 sessão</option>
                <option value="2">2 sessões</option>
              </select>
            </Field>
            <Field>
              <Label>Valor do pacote (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
