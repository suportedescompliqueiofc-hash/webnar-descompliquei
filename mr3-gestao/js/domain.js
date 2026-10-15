/* =========================================================================
   domain.js — regras de negócio e indicadores (puros, sem DOM).
   Centraliza cálculos usados por dashboard, perfil, financeiro e relatórios
   para que todos mostrem exatamente os mesmos números.
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const U = MR3.U;
  const S = () => MR3.Store;

  const MOTIVOS_SAIDA = {
    financeiro: 'Financeiro',
    lesao: 'Lesão',
    mudanca: 'Mudou de cidade',
    fim_temporada: 'Fim de temporada',
    insatisfacao: 'Insatisfação',
    outro: 'Outro',
  };
  const STATUS_SESSAO = {
    agendada: { label: 'Agendada', cls: 'info' },
    realizada: { label: 'Realizada', cls: 'success' },
    falta: { label: 'Falta', cls: 'danger' },
    cancelada: { label: 'Cancelada', cls: '' },
    remarcada: { label: 'Remarcada', cls: 'warning' },
  };
  const STATUS_COBRANCA = {
    pendente: { label: 'Pendente', cls: 'info' },
    pago: { label: 'Pago', cls: 'success' },
    atrasado: { label: 'Atrasado', cls: 'danger' },
    cancelado: { label: 'Cancelado', cls: '' },
    parcial: { label: 'Parcial', cls: 'warning' },
  };
  const FORMAS_PAGAMENTO = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão', transferencia: 'Transferência' };
  const NIVEIS = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado', profissional: 'Profissional' };
  const TIPOS_PLANO = { mensal: 'Mensal', pacote: 'Pacote', avulso: 'Avulso' };
  const CATEGORIAS_DESPESA = { espaco: 'Aluguel de espaço', material: 'Material', deslocamento: 'Deslocamento', marketing: 'Marketing', impostos: 'Impostos/taxas', outro: 'Outro' };

  const D = {
    MOTIVOS_SAIDA, STATUS_SESSAO, STATUS_COBRANCA, FORMAS_PAGAMENTO, NIVEIS, TIPOS_PLANO, CATEGORIAS_DESPESA,

    /* ---------------- Atletas ---------------- */
    atleta(id) { return S().getById('atletas', id); },
    nomeAtleta(id) { const a = D.atleta(id); return a ? a.nome : 'Atleta removido'; },
    plano(atleta) { return atleta && atleta.planoId ? S().getById('planos', atleta.planoId) : null; },
    /** Valor mensal efetivo do atleta (personalizado tem prioridade). */
    valorPlano(atleta) {
      const p = D.plano(atleta);
      if (atleta && atleta.valorPersonalizado != null && atleta.valorPersonalizado !== '') return Number(atleta.valorPersonalizado);
      return p ? Number(p.valor) : 0;
    },
    /** Status do atleta numa data (usa historicoStatus — base do churn histórico). */
    statusEm(atleta, iso) {
      const h = D.historico(atleta);
      let st = null;
      for (const ev of h) { if (ev.data <= iso) st = ev.status; else break; }
      return st; // null = ainda não era atleta
    },
    historico(atleta) {
      return (atleta.historicoStatus || []).slice().sort((a, b) => (a.data === b.data ? 0 : a.data < b.data ? -1 : 1));
    },
    /** Dias totais como ativo (somando períodos), até hoje. */
    diasAtivo(atleta, ate = U.today()) {
      const h = D.historico(atleta);
      let total = 0, inicio = null;
      h.forEach((ev) => {
        if (ev.status === 'ativo' && inicio == null) inicio = ev.data;
        else if (ev.status === 'inativo' && inicio != null) { total += Math.max(0, U.diffDays(inicio, ev.data)); inicio = null; }
      });
      if (inicio != null) total += Math.max(0, U.diffDays(inicio, ate));
      return total;
    },
    isAniversarioNoMes(atleta, monthNum) {
      return atleta.dataNascimento && Number(atleta.dataNascimento.slice(5, 7)) === monthNum;
    },

    /* ---------------- Sessões ---------------- */
    sessoesDoAtleta(id) { return S().query('sessoes', (s) => (s.atletaIds || []).includes(id)); },
    fimSessao(s) { return U.addMinutes(s.horaInicio, Number(s.duracaoMin) || 60); },
    /** Sessões que ocupam a agenda (não canceladas/remarcadas). */
    ocupa(s) { return s.status !== 'cancelada' && s.status !== 'remarcada'; },
    /** Detecta sessões em conflito de horário com a proposta. */
    conflitos(proposta, ignorarIds = []) {
      const ini = U.timeToMin(proposta.horaInicio);
      const fim = ini + (Number(proposta.duracaoMin) || 60);
      return S().query('sessoes', (s) => s.data === proposta.data && D.ocupa(s) && !ignorarIds.includes(s.id) && (() => {
        const a = U.timeToMin(s.horaInicio), b = a + (Number(s.duracaoMin) || 60);
        return a < fim && ini < b;
      })());
    },
    /** A sessão consome crédito do pacote? (realizada ou falta, conforme regra) */
    consome(s, cfg = S().getConfig()) {
      return s.status === 'realizada' || (s.status === 'falta' && cfg.faltaDescontaPacote);
    },
    /** Presença = realizadas ÷ (realizadas + faltas) entre as sessões já ocorridas. */
    presenca(sessoes) {
      const r = sessoes.filter((s) => s.status === 'realizada').length;
      const f = sessoes.filter((s) => s.status === 'falta').length;
      return { realizadas: r, faltas: f, taxa: r + f ? r / (r + f) : null };
    },
    /** Frequência média semanal (sessões realizadas por semana ativa). */
    frequenciaSemanal(atleta) {
      const real = D.sessoesDoAtleta(atleta.id).filter((s) => s.status === 'realizada');
      const semanas = Math.max(1, D.diasAtivo(atleta) / 7);
      return real.length / semanas;
    },

    /* ---------------- Pacotes ---------------- */
    /** Saldo de sessões de pacote do atleta. */
    saldoPacote(atletaId) {
      const cfg = S().getConfig();
      const compras = S().query('cobrancas', (c) => c.atletaId === atletaId && c.pacote && c.status !== 'cancelado')
        .sort((a, b) => (a.pacote.inicio < b.pacote.inicio ? -1 : 1));
      if (!compras.length) return null;
      const inicio = compras[0].pacote.inicio;
      const creditos = U.sum(compras, (c) => c.pacote.sessoes);
      const usadas = D.sessoesDoAtleta(atletaId).filter((s) => s.data >= inicio && D.consome(s, cfg)).length;
      const ultima = compras[compras.length - 1];
      const validade = ultima.pacote.validadeDias ? U.addDays(ultima.pacote.inicio, ultima.pacote.validadeDias) : null;
      return { creditos, usadas, saldo: creditos - usadas, validade, vencido: validade ? validade < U.today() : false, inicio };
    },

    /* ---------------- Cobranças ---------------- */
    totalPago(c) { return U.round2(U.sum(c.pagamentos || [], (p) => p.valor)); },
    valorLiquido(c) { return U.round2((Number(c.valor) || 0) - (Number(c.desconto) || 0)); },
    saldoDevedor(c) { return c.status === 'cancelado' ? 0 : Math.max(0, U.round2(D.valorLiquido(c) - D.totalPago(c))); },
    /** Status calculado: "atrasado" quando vencido e não pago. */
    statusCobranca(c, hoje = U.today()) {
      if (c.status === 'cancelado') return 'cancelado';
      if (D.saldoDevedor(c) <= 0.004) return 'pago';
      if (c.vencimento < hoje) return 'atrasado';
      return 'pendente';
    },
    isParcial(c) { return D.totalPago(c) > 0 && D.saldoDevedor(c) > 0.004; },
    cobrancasComStatus(filter) {
      const hoje = U.today();
      return S().query('cobrancas', filter).map((c) => Object.assign({}, c, { _status: D.statusCobranca(c, hoje), _saldo: D.saldoDevedor(c), _pago: D.totalPago(c) }));
    },
    /** LTV = tudo que o atleta já pagou. */
    ltv(atletaId) {
      return U.round2(U.sum(S().query('cobrancas', { atletaId }), (c) => D.totalPago(c)));
    },
    /** Todos os pagamentos achatados (com referência à cobrança). */
    pagamentos(filter) {
      const out = [];
      S().query('cobrancas', filter).forEach((c) => (c.pagamentos || []).forEach((p, i) => out.push(Object.assign({}, p, { cobrancaId: c.id, atletaId: c.atletaId, referencia: c.referencia, idx: i }))));
      return out;
    },

    /* ---------------- Financeiro mensal ---------------- */
    resumoMes(key) {
      const hoje = U.today();
      const ini = key + '-01', fim = U.endOfMonth(ini);
      const cobs = S().query('cobrancas', (c) => c.status !== 'cancelado' && c.vencimento >= ini && c.vencimento <= fim);
      const previsto = U.sum(cobs, D.valorLiquido);
      const pagsMes = D.pagamentos().filter((p) => p.data >= ini && p.data <= fim);
      const recebido = U.sum(pagsMes, (p) => p.valor);
      let pendente = 0, atrasado = 0;
      const atletasAtraso = new Set();
      cobs.forEach((c) => {
        const st = D.statusCobranca(c, hoje);
        if (st === 'atrasado') { atrasado += D.saldoDevedor(c); atletasAtraso.add(c.atletaId); } else if (st === 'pendente') pendente += D.saldoDevedor(c);
      });
      const porForma = {};
      Object.keys(FORMAS_PAGAMENTO).forEach((f) => (porForma[f] = 0));
      pagsMes.forEach((p) => { porForma[p.forma] = (porForma[p.forma] || 0) + Number(p.valor || 0); });
      const pagantes = new Set(pagsMes.map((p) => p.atletaId));
      const despesas = U.sum(S().query('despesas', (d) => d.data >= ini && d.data <= fim), (d) => d.valor);
      return {
        previsto: U.round2(previsto), recebido: U.round2(recebido), pendente: U.round2(pendente), atrasado: U.round2(atrasado),
        atletasAtraso: atletasAtraso.size, porForma, despesas: U.round2(despesas), liquido: U.round2(recebido - despesas),
        ticketMedio: pagantes.size ? recebido / pagantes.size : 0, qtdCobrancas: cobs.length, qtdPagamentos: pagsMes.length,
      };
    },
    /** Inadimplência geral atual (todas as cobranças vencidas em aberto). */
    inadimplenciaAtual() {
      const hoje = U.today();
      const atrasadas = S().query('cobrancas', (c) => D.statusCobranca(c, hoje) === 'atrasado');
      return { valor: U.round2(U.sum(atrasadas, D.saldoDevedor)), atletas: new Set(atrasadas.map((c) => c.atletaId)).size, cobrancas: atrasadas };
    },
    /** Inadimplência histórica: saldo vencido em aberto ao fim de cada mês. */
    inadimplenciaEm(iso) {
      let total = 0;
      S().getAll('cobrancas').forEach((c) => {
        if (c.status === 'cancelado' || c.vencimento >= iso) return;
        const pagoAte = U.sum((c.pagamentos || []).filter((p) => p.data <= iso), (p) => p.valor);
        total += Math.max(0, D.valorLiquido(c) - pagoAte);
      });
      return U.round2(total);
    },

    /* ---------------- Retenção / churn ---------------- */
    /**
     * Churn do mês = saídas no mês ÷ ativos no início do mês.
     * Calculado a partir do historicoStatus, então reativações futuras
     * não alteram os números do passado.
     */
    churnMes(key) {
      const ini = key + '-01', fim = U.endOfMonth(ini);
      const vespera = U.addDays(ini, -1);
      let ativosInicio = 0, saidas = 0, novos = 0, reativacoes = 0;
      const motivos = {};
      S().getAll('atletas').forEach((a) => {
        if (D.statusEm(a, vespera) === 'ativo') ativosInicio++;
        const h = D.historico(a);
        h.forEach((ev, i) => {
          if (ev.data < ini || ev.data > fim) return;
          if (ev.status === 'inativo') { saidas++; motivos[ev.motivo || 'outro'] = (motivos[ev.motivo || 'outro'] || 0) + 1; }
          else if (ev.status === 'ativo') { if (i === 0) novos++; else reativacoes++; }
        });
      });
      return { key, ativosInicio, saidas, novos, reativacoes, liquido: novos + reativacoes - saidas, taxa: ativosInicio ? saidas / ativosInicio : (saidas ? 1 : 0), motivos };
    },
    ativosEm(iso) { return S().getAll('atletas').filter((a) => D.statusEm(a, iso) === 'ativo'); },
    /** MRR estimado ao fim do mês: soma do valor mensal dos ativos com plano mensal. */
    mrrEm(iso) {
      return U.round2(U.sum(D.ativosEm(iso), (a) => { const p = D.plano(a); return p && p.tipo === 'mensal' ? D.valorPlano(a) : 0; }));
    },
    /** Motivos de saída num intervalo de datas. */
    motivosSaida(ini, fim) {
      const m = {};
      S().getAll('atletas').forEach((a) => (a.historicoStatus || []).forEach((ev) => {
        if (ev.status === 'inativo' && ev.data >= ini && ev.data <= fim) m[ev.motivo || 'outro'] = (m[ev.motivo || 'outro'] || 0) + 1;
      }));
      return m;
    },

    /* ---------------- Agenda / ocupação ---------------- */
    /** Minutos disponíveis de atendimento num dia (0 se fechado). */
    minutosDisponiveis(iso, cfg = S().getConfig()) {
      const h = cfg.horarioAtendimento;
      if (!h.dias.includes(U.weekday(iso))) return 0;
      return Math.max(0, U.timeToMin(h.fim) - U.timeToMin(h.inicio));
    },
    /** Ocupação = minutos com sessão ÷ minutos disponíveis no período. */
    ocupacao(ini, fim) {
      const cfg = S().getConfig();
      let disp = 0;
      for (let d = ini; d <= fim; d = U.addDays(d, 1)) disp += D.minutosDisponiveis(d, cfg);
      const sess = S().query('sessoes', (s) => s.data >= ini && s.data <= fim && D.ocupa(s));
      const usados = U.sum(sess, (s) => Number(s.duracaoMin) || 60);
      return { disponivel: disp, usado: usados, taxa: disp ? Math.min(1, usados / disp) : null, livresHoras: Math.max(0, (disp - usados) / 60) };
    },
  };

  MR3.D = D;
})();
