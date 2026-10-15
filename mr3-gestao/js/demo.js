/* =========================================================================
   demo.js — gera dados de demonstração realistas (~26 atletas, 6 meses de
   sessões, cobranças, pagamentos, saídas com motivos, avaliações e despesas).
   Todos os registros recebem `_demo: true` para poderem ser removidos
   sem afetar dados reais.
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const { U, UI, Store, D } = MR3;

  const NOMES = [
    'Lucas Almeida', 'Gabriel Souza', 'Mariana Costa', 'Pedro Henrique Lima', 'Ana Beatriz Rocha', 'João Vitor Martins', 'Rafaela Nunes',
    'Matheus Oliveira', 'Larissa Ferreira', 'Thiago Ribeiro', 'Beatriz Carvalho', 'Enzo Gomes', 'Camila Barbosa', 'Felipe Araújo',
    'Isabela Mendes', 'Bruno Cardoso', 'Júlia Teixeira', 'Gustavo Pereira', 'Letícia Moreira', 'Rodrigo Santos', 'Vinícius Freitas',
    'Sofia Azevedo', 'Arthur Pinto', 'Manuela Correia', 'Diego Monteiro', 'Heloísa Duarte',
  ];
  const MODS = [
    ['Futebol', ['Atacante', 'Meia', 'Zagueiro', 'Lateral', 'Volante', 'Goleiro']],
    ['Vôlei', ['Levantador', 'Ponteiro', 'Central', 'Líbero', 'Oposto']],
    ['Basquete', ['Armador', 'Ala', 'Pivô']],
    ['Tênis', ['Simples']], ['Futsal', ['Fixo', 'Ala', 'Pivô', 'Goleiro']], ['Corrida', ['10 km', 'Meia maratona']], ['Beach Tennis', ['Duplas']],
  ];
  const OBJETIVOS = ['Ganho de explosão e velocidade', 'Retorno pós-lesão no joelho', 'Preparação para peneira', 'Melhorar resistência aeróbica', 'Força e prevenção de lesões', 'Agilidade e mudança de direção', 'Preparação para temporada', 'Condicionamento geral'];
  const MEDICAS = ['', '', '', 'Entorse de tornozelo direito (2025) — reforçar propriocepção', 'Condromalácia patelar leve', 'Asma controlada — tem bombinha', 'Pós-operatório LCA (liberado)', 'Lombalgia ocasional', ''];
  const ANOTACOES = ['Pliometria + sprints de 20m', 'Força de membros inferiores, agachamento búlgaro', 'Circuito de agilidade com cones e escada', 'Core e estabilidade, prevenção', 'Resistência intervalada (HIIT)', 'Técnica de corrida e aceleração', 'Mobilidade e recuperação ativa', 'Treino específico de mudança de direção', 'Saltos verticais e aterrissagem', 'Potência com medicine ball'];
  const EVOLUCOES = ['Boa evolução na aterrissagem', 'Relatou cansaço, reduzimos volume', 'Melhorou tempo no sprint', 'Executou bem, aumentar carga na próxima', 'Sem dores, liberado para progressão', '', '', ''];

  function gerar() {
    const rnd = U.seededRandom(20261015);
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const chance = (p) => rnd() < p;
    const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const hoje = U.today();
    const inicioJanela = U.addMonths(U.startOfMonth(hoje), -6); // sessões: 6 meses
    const inicioFin = U.addMonths(U.startOfMonth(hoje), -12); // financeiro: 12 meses (relatórios anuais)
    const fimFuturo = U.addDays(hoje, 21);
    const demo = { _demo: true };
    const cfg = Store.getConfig();
    const mk = (col, obj) => Store.create(col, Object.assign({}, obj, demo));

    Store.batch(() => {
      /* ---------- Planos ---------- */
      const P = {
        m1: mk('planos', { nome: 'Mensal 1x/semana', tipo: 'mensal', valor: 320, sessoesPorSemana: 1, ativo: true }),
        m2: mk('planos', { nome: 'Mensal 2x/semana', tipo: 'mensal', valor: 560, sessoesPorSemana: 2, ativo: true }),
        m3: mk('planos', { nome: 'Mensal 3x/semana', tipo: 'mensal', valor: 750, sessoesPorSemana: 3, ativo: true }),
        p10: mk('planos', { nome: 'Pacote 10 sessões', tipo: 'pacote', valor: 900, quantidadeSessoes: 10, validadeDias: 60, ativo: true }),
        p5: mk('planos', { nome: 'Pacote 5 sessões', tipo: 'pacote', valor: 480, quantidadeSessoes: 5, validadeDias: 45, ativo: true }),
        av: mk('planos', { nome: 'Sessão avulsa', tipo: 'avulso', valor: 130, ativo: true }),
      };
      const planoSeq = ['m2', 'm2', 'm3', 'm1', 'm2', 'p10', 'm2', 'm3', 'm1', 'm2', 'p5', 'm2', 'av', 'm3', 'm2', 'p10', 'm1', 'm2', 'm2', 'm3', 'av', 'm2', 'p10', 'm1', 'm2', 'm2'];

      /* ---------- Slots de horário únicos (evita conflitos) ---------- */
      const slots = [];
      [0, 1, 2, 3, 4].forEach((wd) => [6, 7, 8, 9, 10, 16, 17, 18, 19, 20].forEach((h) => slots.push({ wd, h })));
      [5].forEach((wd) => [7, 8, 9, 10, 11].forEach((h) => slots.push({ wd, h })));
      for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
      const takeSlots = (n) => {
        const out = [];
        for (let i = 0; i < slots.length && out.length < n; i++) {
          if (!out.some((s) => s.wd === slots[i].wd) && !slots[i].used) { slots[i].used = true; out.push(slots[i]); }
        }
        return out;
      };

      // Saídas: índices de atletas que saíram (com motivo e meses atrás)
      const saidas = { 3: ['financeiro', 4], 8: ['lesao', 2], 11: ['mudanca', 5], 16: ['fim_temporada', 1], 19: ['insatisfacao', 3], 23: ['financeiro', 0], 24: ['outro', 2] };
      const reativado = 8; // saiu por lesão e voltou
      const mesNum = Number(hoje.slice(5, 7));

      NOMES.forEach((nome, i) => {
        const [mod, posicoes] = pick(MODS);
        const menor = i % 5 === 1;
        const aniversarioMes = i % 6 === 0;
        const ano = menor ? int(2009, 2012) : int(1990, 2006);
        const mesNasc = aniversarioMes ? mesNum : int(1, 12);
        const dataNascimento = `${ano}-${String(mesNasc).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`;
        const mesesCasa = i < 8 ? int(9, 16) : i < 18 ? int(4, 9) : int(0, 4);
        let dataInicio = U.addDays(U.addMonths(hoje, -mesesCasa), -int(0, 25));
        if (dataInicio > U.addDays(hoje, -5)) dataInicio = U.addDays(hoje, -int(5, 20));
        const hist = [{ status: 'ativo', data: dataInicio, motivo: 'cadastro', observacao: '' }];
        let status = 'ativo';
        if (saidas[i]) {
          const [motivo, mAtras] = saidas[i];
          let dSaida = U.addDays(U.addMonths(hoje, -mAtras), -int(0, 20));
          if (dSaida <= U.addDays(dataInicio, 30)) dSaida = U.addDays(dataInicio, int(35, 60));
          if (dSaida >= hoje) dSaida = U.addDays(hoje, -2);
          hist.push({ status: 'inativo', data: dSaida, motivo, observacao: { financeiro: 'Apertou o orçamento', lesao: 'Lesão muscular na coxa', mudanca: 'Mudou para outra cidade', fim_temporada: 'Fim do campeonato', insatisfacao: 'Queria horário que não havia', outro: 'Sem retorno' }[motivo] });
          status = 'inativo';
          if (i === reativado) { const dVolta = U.addDays(dSaida, int(35, 50)); if (dVolta < hoje) { hist.push({ status: 'ativo', data: dVolta, motivo: 'reativacao', observacao: 'Liberado pelo fisioterapeuta' }); status = 'ativo'; } }
        }
        const plano = P[planoSeq[i]];
        const tel = `(11) 9${int(6000, 9999)}-${int(1000, 9999)}`;
        const atleta = mk('atletas', {
          nome, dataNascimento, telefone: tel, email: U.norm(nome).replace(/\s+/g, '.') + '@email.com',
          modalidade: mod, posicao: pick(posicoes), nivel: pick(['iniciante', 'intermediario', 'intermediario', 'avancado', 'avancado', 'profissional']),
          objetivo: pick(OBJETIVOS), observacoesMedicas: pick(MEDICAS),
          responsavel: menor ? { nome: `${pick(['Carla', 'Marcos', 'Patrícia', 'Ricardo', 'Fernanda'])} ${nome.split(' ').slice(-1)[0]}`, telefone: `(11) 9${int(6000, 9999)}-${int(1000, 9999)}` } : null,
          planoId: plano.id, valorPersonalizado: i === 6 ? 500 : null, diaVencimento: pick([5, 10, 10, 15, 20]),
          dataInicio, status, historicoStatus: hist,
        });
        const ativoEm = (d) => D.statusEm(atleta, d) === 'ativo';

        /* ---------- Sessões ---------- */
        const porSemana = plano.tipo === 'mensal' ? plano.sessoesPorSemana : plano.tipo === 'pacote' ? 2 : 1;
        const meusSlots = takeSlots(porSemana);
        const dur = pick([60, 60, 60, 45]); // ≤ 60 min: slots de hora cheia não se sobrepõem
        const local = pick(cfg.locais.slice(0, 3));
        const sessoes = [];
        const recId = U.uid('rec_');
        const ini = dataInicio > inicioJanela ? dataInicio : inicioJanela;
        for (let d = ini; d <= fimFuturo; d = U.addDays(d, 1)) {
          const sl = meusSlots.find((s) => s.wd === U.weekday(d));
          if (!sl || !ativoEm(d)) continue;
          if (plano.tipo === 'avulso' && chance(0.45)) continue;
          if (d > hoje && status !== 'ativo') continue;
          let st = 'agendada';
          if (d < hoje || (d === hoje && sl.h < Number(U.nowTime().slice(0, 2)))) { const r = rnd(); st = r < 0.84 ? 'realizada' : r < 0.92 ? 'falta' : r < 0.98 ? 'cancelada' : 'remarcada'; }
          const s = { atletaIds: [atleta.id], data: d, horaInicio: `${String(sl.h).padStart(2, '0')}:00`, duracaoMin: dur, local, tipo: pick(['Treino', 'Treino', 'Treino', 'Físico', 'Técnico', 'Recuperação']), status: st, recorrenciaId: d > hoje ? recId : null };
          if (st === 'realizada') { s.pse = int(4, 9); s.anotacoes = pick(ANOTACOES); s.evolucao = pick(EVOLUCOES); }
          sessoes.push(mk('sessoes', s));
        }

        /* ---------- Cobranças e pagamentos ---------- */
        const formaPag = () => { const r = rnd(); return r < 0.62 ? 'pix' : r < 0.77 ? 'transferencia' : r < 0.9 ? 'dinheiro' : 'cartao'; };
        const devedor = [2, 14, 21].includes(i);
        if (plano.tipo === 'mensal') {
          const valor = atleta.valorPersonalizado != null ? atleta.valorPersonalizado : plano.valor;
          let m = U.monthKey(dataInicio < inicioFin ? inicioFin : dataInicio);
          const mFim = U.monthKey(hoje);
          while (m <= mFim) {
            const venc = `${m}-${String(Math.min(atleta.diaVencimento, U.daysInMonth(m))).padStart(2, '0')}`;
            if (ativoEm(m + '-01') || (dataInicio.slice(0, 7) === m) || (hist[2] && hist[2].data.slice(0, 7) === m)) {
              const pags = [];
              const vencido = venc < hoje;
              const recente = U.diffDays(venc, hoje) < 45;
              if (devedor && recente && vencido) { /* fica em atraso */ }
              else if (vencido || chance(0.35)) {
                if (chance(0.06)) pags.push({ data: U.addDays(venc, int(-2, 6)) > hoje ? hoje : U.addDays(venc, int(-2, 6)), valor: Math.round(valor / 2), forma: formaPag(), observacao: 'Parcial' });
                else if (vencido || chance(0.9)) { let dp = U.addDays(venc, int(-5, 7)); if (dp > hoje) dp = hoje; pags.push({ data: dp, valor, forma: formaPag(), observacao: '' }); }
              }
              const pago = U.sum(pags, (p) => p.valor) >= valor;
              mk('cobrancas', { atletaId: atleta.id, tipo: 'mensalidade', competencia: m, referencia: `Mensalidade ${U.monthRef(m)}`, valor, desconto: 0, vencimento: venc, status: pago ? 'pago' : 'pendente', pagamentos: pags });
            }
            m = U.addMonthKey(m, 1);
          }
        } else if (plano.tipo === 'pacote') {
          // Compra novo pacote sempre que o saldo acaba
          const consumo = sessoes.filter((s) => s.status === 'realizada' || s.status === 'falta');
          let credito = 0, k = 0;
          const comprar = (data) => {
            const paga = data < U.addDays(hoje, -3) || chance(0.5);
            mk('cobrancas', { atletaId: atleta.id, tipo: 'pacote', referencia: `${plano.nome} (${plano.quantidadeSessoes} sessões)`, valor: plano.valor, desconto: 0, vencimento: data, status: paga ? 'pago' : 'pendente',
              pagamentos: paga ? [{ data, valor: plano.valor, forma: formaPag(), observacao: '' }] : [], pacote: { planoId: plano.id, sessoes: plano.quantidadeSessoes, validadeDias: plano.validadeDias, inicio: data } });
            credito += plano.quantidadeSessoes;
          };
          comprar(ini);
          consumo.forEach((s) => { k++; if (k > credito - 1 && s.data < hoje && k < consumo.length - 1) comprar(s.data); });
        } else {
          sessoes.filter((s) => s.status === 'realizada').forEach((s) => {
            const paga = s.data < U.addDays(hoje, -10) ? chance(0.95) : chance(0.5);
            mk('cobrancas', { atletaId: atleta.id, sessaoId: s.id, tipo: 'avulso', referencia: `Sessão avulsa ${U.fmtDate(s.data)}`, valor: plano.valor, desconto: 0, vencimento: s.data, status: paga ? 'pago' : 'pendente', pagamentos: paga ? [{ data: s.data, valor: plano.valor, forma: formaPag(), observacao: '' }] : [] });
          });
        }

        /* ---------- Avaliações ---------- */
        if (i % 2 === 0) {
          let peso = int(55, 88) + rnd(), salto = int(30, 48), sprint = 3.1 + rnd() * 0.6, yoyo = int(12, 17) + rnd();
          const altura = int(158, 192);
          for (let d = ini; d <= hoje && ativoEm(d); d = U.addDays(d, int(45, 65))) {
            mk('avaliacoes', { atletaId: atleta.id, data: d, peso: U.round2(peso), altura, observacoes: '', testes: [
              { nome: 'Salto vertical', valor: Math.round(salto), unidade: 'cm' },
              { nome: 'Sprint 20m', valor: U.round2(sprint), unidade: 's' },
              { nome: 'Yo-yo IR1', valor: Math.round(yoyo * 10) / 10, unidade: 'nível' },
            ] });
            peso += rnd() * 1.4 - 0.8; salto += rnd() * 2.5; sprint -= rnd() * 0.06; yoyo += rnd() * 0.6;
          }
        }
      });

      /* ---------- Sessão em grupo semanal (sábado 10h? usa slot livre) ---------- */
      const ativos = Store.query('atletas', (a) => a._demo && a.status === 'ativo').slice(0, 3);
      const grupoSlot = slots.find((s) => !s.used && s.wd === 5) || slots.find((s) => !s.used);
      if (ativos.length >= 2 && grupoSlot) {
        grupoSlot.used = true;
        const recG = U.uid('rec_');
        for (let d = U.addDays(hoje, -56); d <= fimFuturo; d = U.addDays(d, 1)) {
          if (U.weekday(d) !== grupoSlot.wd) continue;
          const passada = d < hoje;
          mk('sessoes', { atletaIds: ativos.slice(0, 2).map((a) => a.id), data: d, horaInicio: `${String(grupoSlot.h).padStart(2, '0')}:00`, duracaoMin: 90, local: 'Campo', tipo: 'Tático', status: passada ? (chance(0.9) ? 'realizada' : 'cancelada') : 'agendada', recorrenciaId: recG, anotacoes: passada ? 'Treino em dupla: tomada de decisão e transição' : '', pse: passada ? int(5, 8) : null });
        }
      }

      /* ---------- Despesas ---------- */
      for (let m = U.monthKey(inicioFin); m <= U.monthKey(hoje); m = U.addMonthKey(m, 1)) {
        mk('despesas', { data: `${m}-05`, descricao: 'Aluguel do espaço (academia parceira)', categoria: 'espaco', valor: 900 });
        mk('despesas', { data: `${m}-${String(Math.min(25, U.daysInMonth(m))).padStart(2, '0')}`, descricao: 'Combustível e estacionamento', categoria: 'deslocamento', valor: 180 + int(0, 140) });
        if (chance(0.5)) mk('despesas', { data: `${m}-${String(int(8, 20)).padStart(2, '0')}`, descricao: pick(['Cones e escada de agilidade', 'Elásticos e mini bands', 'Medicine ball', 'Reposição de coletes']), categoria: 'material', valor: int(80, 320) });
        if (chance(0.3)) mk('despesas', { data: `${m}-${String(int(1, 28)).padStart(2, '0')}`, descricao: 'Impulsionamento Instagram', categoria: 'marketing', valor: int(60, 150) });
      }
      // Remove despesas futuras do mês atual
      Store.removeWhere('despesas', (d) => d._demo && d.data > hoje);

      if (!cfg.chavePix) Store.setConfig({ chavePix: 'fabio.mr3@email.com', cidade: cfg.cidade || 'São Paulo' });
      Store.setMeta({ demo: true });
    });
  }

  function temDemo() { return Store.COLLECTIONS.some((c) => Store.query(c, (x) => x._demo).length); }

  function limpar() {
    let n = 0;
    Store.batch(() => { Store.COLLECTIONS.forEach((c) => { n += Store.removeWhere(c, (x) => x._demo); }); Store.setMeta({ demo: false }); });
    return n;
  }

  async function carregarComConfirmacao() {
    if (temDemo()) {
      if (!(await UI.confirm({ title: 'Recarregar demonstração', message: 'Os dados de demonstração já estão carregados. Deseja gerá-los de novo (os atuais de demonstração serão substituídos)?', confirmText: 'Recarregar' }))) return;
      limpar();
    } else if (Store.getAll('atletas').length) {
      if (!(await UI.confirm({ title: 'Carregar demonstração', message: 'Você já tem dados cadastrados. Os dados de demonstração serão ADICIONADOS aos seus e marcados para poderem ser removidos depois. Continuar?', confirmText: 'Adicionar demonstração' }))) return;
    }
    gerar();
    UI.toast('Dados de demonstração carregados.');
    MR3.go('#/dashboard');
  }

  MR3.Demo = { gerar, limpar, temDemo, carregarComConfirmacao };
})();
