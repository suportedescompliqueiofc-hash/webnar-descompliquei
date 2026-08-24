import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Atleta, StatusAtleta } from '../lib/types'
import { formatDate, STATUS_ATLETA_LABEL, todayISO } from '../lib/format'
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
  Select,
  Spinner,
  Textarea,
} from '../components/ui'

const emptyForm = {
  nome: '',
  telefone: '',
  email: '',
  modalidade: '',
  data_inicio: todayISO(),
  status: 'ativo' as StatusAtleta,
  observacoes: '',
}

export function Atletas() {
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusAtleta>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Atleta | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('atletas').select('*').order('nome')
    setAtletas(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const filtrados = useMemo(() => {
    return atletas.filter((a) => {
      if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false
      if (busca && !a.nome.toLowerCase().includes(busca.toLowerCase())) return false
      return true
    })
  }, [atletas, busca, filtroStatus])

  const ativos = atletas.filter((a) => a.status === 'ativo').length
  const inativos = atletas.length - ativos

  function abrirNovo() {
    setEditando(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function abrirEdicao(a: Atleta) {
    setEditando(a)
    setForm({
      nome: a.nome,
      telefone: a.telefone ?? '',
      email: a.email ?? '',
      modalidade: a.modalidade ?? '',
      data_inicio: a.data_inicio,
      status: a.status,
      observacoes: a.observacoes ?? '',
    })
    setModalOpen(true)
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const payload = {
      nome: form.nome.trim(),
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      modalidade: form.modalidade.trim() || null,
      data_inicio: form.data_inicio,
      status: form.status,
      observacoes: form.observacoes.trim() || null,
    }
    if (editando) {
      await supabase.from('atletas').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('atletas').insert(payload)
    }
    setSalvando(false)
    setModalOpen(false)
    carregar()
  }

  async function alternarStatus(a: Atleta) {
    const novo = a.status === 'ativo' ? 'inativo' : 'ativo'
    await supabase.from('atletas').update({ status: novo }).eq('id', a.id)
    carregar()
  }

  return (
    <div>
      <PageHeader
        title="Atletas"
        description={`${ativos} ativos · ${inativos} inativos`}
        actions={
          <Button onClick={abrirNovo}>
            <Plus size={16} /> Novo atleta
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as 'todos' | StatusAtleta)}
          className="sm:w-44"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner />
        ) : filtrados.length === 0 ? (
          <EmptyState title="Nenhum atleta encontrado" description="Cadastre um novo atleta para começar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Modalidade</th>
                  <th className="px-4 py-3 font-medium">Início</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/atletas/${a.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                        {a.nome}
                      </Link>
                      {a.telefone && <p className="text-xs text-gray-400">{a.telefone}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.modalidade || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(a.data_inicio)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={a.status === 'ativo' ? 'green' : 'gray'}>
                        {STATUS_ATLETA_LABEL[a.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => abrirEdicao(a)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => alternarStatus(a)}>
                          {a.status === 'ativo' ? 'Marcar inativo' : 'Marcar ativo'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar atleta' : 'Novo atleta'}>
        <form onSubmit={salvar}>
          <Field>
            <Label>Nome</Label>
            <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </Field>
            <Field>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <Label>Modalidade / posição</Label>
              <Input
                value={form.modalidade}
                onChange={(e) => setForm({ ...form, modalidade: e.target.value })}
              />
            </Field>
            <Field>
              <Label>Data de início</Label>
              <Input
                type="date"
                required
                value={form.data_inicio}
                onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
              />
            </Field>
          </div>
          <Field>
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusAtleta })}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </Select>
          </Field>
          <Field>
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </Field>
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
