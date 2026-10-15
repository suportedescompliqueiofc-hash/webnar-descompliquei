/* =========================================================================
   store.js — camada única de dados.

   Os módulos NUNCA acessam o localStorage diretamente: usam apenas
   MR3.Store.getAll / getById / create / update / remove / query (+ config).

   Arquitetura pensada para migrar para Supabase (ou outra API):
   - Os dados vivem em memória (cache) e as leituras são síncronas.
   - A persistência é delegada a um "adapter" com dois métodos:
       load()            -> Promise<objeto completo | null>
       save(data, change)-> Promise<void>   (change = {op, col, id, record})
   - Para usar Supabase basta criar um SupabaseAdapter (load = selects por
     tabela após login; save = upsert/delete do registro em `change`) e
     chamar MR3.Store.init(SupabaseAdapter). Nenhum módulo precisa mudar.
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const U = MR3.U;

  const STORAGE_KEY = 'mr3:data';
  const SCHEMA_VERSION = 3;
  const COLLECTIONS = ['atletas', 'planos', 'sessoes', 'cobrancas', 'avaliacoes', 'materiais', 'fichas'];

  const DEFAULT_CONFIG = {
    nomeProfissional: 'Fabio Nascimento',
    empresa: 'MR3',
    documento: '',
    telefone: '',
    email: '',
    cidade: '',
    chavePix: '',
    valoresPadrao: { sessaoAvulsa: 120, duracaoSessao: 60, diaVencimento: 10 },
    horarioAtendimento: { inicio: '06:00', fim: '22:00', dias: [0, 1, 2, 3, 4, 5] }, // seg..sáb
    locais: ['Academia', 'Quadra', 'Campo', 'Online'],
    tiposSessao: ['Treino', 'Avaliação', 'Recuperação', 'Técnico', 'Físico', 'Tático'],
    modalidades: ['Futebol', 'Vôlei', 'Basquete', 'Tênis', 'Corrida', 'Natação', 'Futsal', 'Beach Tennis'],
    faltaDescontaPacote: true,
    alertaSaldoPacote: 2,
    fichaUrl: '', // endereço público do ficha.html (para enviar aos atletas)
    mensagens: {
      ficha: 'Olá! Para começarmos os treinos, preencha sua ficha de cadastro (leva uns 5 minutos):\n{link}\n\nAo terminar, toque em "Enviar pelo WhatsApp". Obrigado!\n{profissional} — {empresa}',
      cobranca: 'Olá, {nome}! Tudo bem? 😊\nPassando para lembrar da sua mensalidade *{referencia}* no valor de *{valor}*, com vencimento em *{vencimento}*.\n\nChave Pix: {pix}\n\nQualquer dúvida estou à disposição. Obrigado!\n{profissional} — {empresa}',
      atraso: 'Olá, {nome}! Tudo bem?\nIdentifiquei que o pagamento *{referencia}* no valor de *{valor}*, vencido em *{vencimento}*, ainda está em aberto.\n\nChave Pix: {pix}\n\nSe já pagou, por favor me envie o comprovante. Obrigado!\n{profissional}',
      lembrete: 'Olá, {nome}! Lembrete da sua sessão *{data}* às *{hora}* — {local}. Até lá! 💪\n{profissional}',
    },
    tema: 'dark',
  };

  const emptyData = () => ({
    schemaVersion: SCHEMA_VERSION,
    atletas: [], planos: [], sessoes: [], cobrancas: [], avaliacoes: [], materiais: [], fichas: [],
    config: JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
    meta: { ultimoBackup: null, criadoEm: U.nowISO(), demo: false },
  });

  /* ---------------- Migrações de schema ----------------
     Cada função recebe os dados na versão N-1 e devolve na versão N. */
  const MIGRATIONS = {
    // v0 (sem versionamento) -> v1: garante coleções e config
    1(d) {
      COLLECTIONS.forEach((c) => { if (!Array.isArray(d[c])) d[c] = []; });
      d.config = Object.assign({}, DEFAULT_CONFIG, d.config || {});
      d.meta = Object.assign({ ultimoBackup: null, demo: false }, d.meta || {});
      return d;
    },
    // v1 -> v2: sessões passam a usar sempre `atletaIds` (suporte a grupo)
    // e atletas ganham `historicoStatus` se não tiverem.
    2(d) {
      d.sessoes.forEach((s) => {
        if (!Array.isArray(s.atletaIds)) s.atletaIds = s.atletaId ? [s.atletaId] : [];
        delete s.atletaId;
      });
      d.atletas.forEach((a) => {
        if (!Array.isArray(a.historicoStatus) || !a.historicoStatus.length) {
          a.historicoStatus = [{ status: 'ativo', data: a.dataInicio || U.tsToDate(a.criadoEm) || U.today(), motivo: 'cadastro', observacao: '' }];
          if (a.status === 'inativo') a.historicoStatus.push({ status: 'inativo', data: U.tsToDate(a.atualizadoEm) || U.today(), motivo: 'outro', observacao: 'Migrado' });
        }
      });
      return d;
    },
    // v2 -> v3: remove despesas; adiciona materiais e fichas de cadastro
    3(d) {
      delete d.despesas;
      if (!Array.isArray(d.materiais)) d.materiais = [];
      if (!Array.isArray(d.fichas)) d.fichas = [];
      return d;
    },
  };

  function migrate(d) {
    let v = Number(d.schemaVersion) || 0;
    while (v < SCHEMA_VERSION) {
      v++;
      if (MIGRATIONS[v]) d = MIGRATIONS[v](d);
      d.schemaVersion = v;
    }
    // Completa chaves novas de config sem sobrescrever as do usuário
    d.config = deepMerge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), d.config || {});
    return d;
  }

  function deepMerge(base, over) {
    Object.keys(over || {}).forEach((k) => {
      const v = over[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = deepMerge(base[k], v);
      else if (v !== undefined) base[k] = v;
    });
    return base;
  }

  /* ---------------- Adapter padrão: localStorage ---------------- */
  const LocalStorageAdapter = {
    name: 'localStorage',
    async load() {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    },
    async save(data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },
  };

  /* ---------------- Estado em memória ---------------- */
  let data = emptyData();
  let adapter = LocalStorageAdapter;
  let batchDepth = 0;
  let dirty = false;
  const listeners = new Set();

  function persist(change) {
    if (batchDepth > 0) { dirty = true; return; }
    try {
      const r = adapter.save(data, change);
      if (r && r.catch) r.catch(onSaveError);
    } catch (e) { onSaveError(e); }
    listeners.forEach((fn) => { try { fn(change); } catch (e) { console.error(e); } });
  }
  function onSaveError(e) {
    console.error('[Store] Falha ao salvar', e);
    const quota = e && (e.name === 'QuotaExceededError' || /quota/i.test(e.message));
    MR3.UI && MR3.UI.toast(quota ? 'Espaço de armazenamento cheio. Exporte um backup e remova fotos grandes.' : 'Não foi possível salvar os dados.', 'error');
  }
  function assertCol(col) {
    if (!COLLECTIONS.includes(col)) throw new Error(`Coleção desconhecida: ${col}`);
  }

  const Store = {
    SCHEMA_VERSION, COLLECTIONS, DEFAULT_CONFIG,

    /** Carrega os dados via adapter e aplica migrações. */
    async init(customAdapter) {
      if (customAdapter) adapter = customAdapter;
      try {
        const loaded = await adapter.load();
        data = loaded ? migrate(loaded) : emptyData();
      } catch (e) {
        console.error('[Store] Dados corrompidos; iniciando vazio.', e);
        try { localStorage.setItem(STORAGE_KEY + ':corrompido:' + Date.now(), localStorage.getItem(STORAGE_KEY) || ''); } catch (_) { /* ignore */ }
        data = emptyData();
      }
      await adapter.save(data, { op: 'init' });
      return data;
    },

    /* ----- API CRUD ----- */
    getAll(col) { assertCol(col); return data[col].slice(); },
    getById(col, id) { assertCol(col); return data[col].find((x) => x.id === id) || null; },
    /** filtro: função (item => bool) ou objeto { campo: valor } */
    query(col, filter) {
      assertCol(col);
      if (!filter) return data[col].slice();
      if (typeof filter === 'function') return data[col].filter(filter);
      const keys = Object.keys(filter);
      return data[col].filter((x) => keys.every((k) => x[k] === filter[k]));
    },
    create(col, obj) {
      assertCol(col);
      const now = U.nowISO();
      const rec = Object.assign({}, obj, { id: obj.id || U.uid(col.slice(0, 2) + '_'), criadoEm: obj.criadoEm || now, atualizadoEm: now });
      data[col].push(rec);
      persist({ op: 'create', col, id: rec.id, record: rec });
      return rec;
    },
    update(col, id, patch) {
      assertCol(col);
      const i = data[col].findIndex((x) => x.id === id);
      if (i < 0) throw new Error(`Registro não encontrado: ${col}/${id}`);
      data[col][i] = Object.assign({}, data[col][i], patch, { id, atualizadoEm: U.nowISO() });
      persist({ op: 'update', col, id, record: data[col][i] });
      return data[col][i];
    },
    remove(col, id) {
      assertCol(col);
      const before = data[col].length;
      data[col] = data[col].filter((x) => x.id !== id);
      if (data[col].length !== before) persist({ op: 'remove', col, id });
      return data[col].length !== before;
    },
    /** Remove vários registros que satisfazem o predicado. */
    removeWhere(col, pred) {
      assertCol(col);
      const removed = data[col].filter(pred);
      if (!removed.length) return 0;
      data[col] = data[col].filter((x) => !pred(x));
      persist({ op: 'removeMany', col, ids: removed.map((r) => r.id) });
      return removed.length;
    },
    /** Agrupa várias operações numa única gravação (ex.: recorrência, demonstração). */
    batch(fn) {
      batchDepth++;
      try { return fn(); } finally {
        batchDepth--;
        if (batchDepth === 0 && dirty) { dirty = false; persist({ op: 'batch' }); }
      }
    },

    /* ----- Configuração e metadados ----- */
    getConfig() { return JSON.parse(JSON.stringify(data.config)); },
    setConfig(patch) {
      data.config = deepMerge(data.config, patch);
      persist({ op: 'config' });
      return Store.getConfig();
    },
    getMeta() { return Object.assign({}, data.meta); },
    setMeta(patch) { data.meta = Object.assign({}, data.meta, patch); persist({ op: 'meta' }); },

    /* ----- Backup ----- */
    exportData() {
      return Object.assign({ app: 'mr3-gestao', exportadoEm: U.nowISO() }, JSON.parse(JSON.stringify(data)));
    },
    /** Valida a estrutura de um backup. Retorna lista de erros (vazia = válido). */
    validateBackup(obj) {
      const errs = [];
      if (!obj || typeof obj !== 'object') return ['Arquivo não contém um objeto JSON.'];
      if (obj.app && obj.app !== 'mr3-gestao') errs.push('O arquivo não é um backup do MR3 Gestão.');
      if (obj.schemaVersion > SCHEMA_VERSION) errs.push(`Backup de versão mais nova (${obj.schemaVersion}). Atualize o sistema.`);
      const anyCol = COLLECTIONS.some((c) => Array.isArray(obj[c]));
      if (!anyCol) errs.push('Nenhuma coleção de dados encontrada.');
      COLLECTIONS.forEach((c) => {
        if (obj[c] != null && !Array.isArray(obj[c])) errs.push(`"${c}" deveria ser uma lista.`);
        else (obj[c] || []).forEach((r, i) => { if (!r || !r.id) errs.push(`${c}[${i}] sem id.`); });
      });
      return errs.slice(0, 8);
    },
    importData(obj) {
      const errs = Store.validateBackup(obj);
      if (errs.length) throw new Error(errs.join('\n'));
      const clone = JSON.parse(JSON.stringify(obj));
      delete clone.app; delete clone.exportadoEm;
      data = migrate(clone);
      data.meta = Object.assign({}, data.meta, { ultimoBackup: data.meta.ultimoBackup || null });
      persist({ op: 'import' });
    },
    clearAll() {
      const tema = data.config.tema;
      data = emptyData();
      data.config.tema = tema;
      persist({ op: 'clear' });
    },
    /** Tamanho aproximado ocupado (bytes). */
    sizeBytes() { try { return new Blob([JSON.stringify(data)]).size; } catch (e) { return 0; } },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    adapterName() { return adapter.name || 'custom'; },
  };

  MR3.Store = Store;
})();
