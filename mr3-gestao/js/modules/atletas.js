/* =========================================================================
   Módulo: Atletas — lista, cadastro/edição, ativar/desativar (com motivo)
   e ficha completa (perfil 360º) com abas.
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const { U, UI, Store, D } = MR3;
  const esc = U.esc;
  MR3.modules = MR3.modules || {};

  // Estado dos filtros da lista (persiste entre re-renderizações)
  const filtros = { q: '', status: 'ativo', modalidade: '', plano: '', inadimplente: false, sort: 'nome', dir: 1 };
  let tlLimite = 60;

  /* =====================================================================
     LISTA
     ===================================================================== */
  function renderLista(el) {
    const atletas = Store.getAll('atletas');
    const planos = Store.getAll('planos');
    const inad = new Set(D.inadimplenciaAtual().cobrancas.map((c) => c.atletaId));
    const modalidades = [...new Set(atletas.map((a) => a.modalidade).filter(Boolean))].sort();

    el.innerHTML = `
      <div class="page-head">
        <div class="titles"><div class="eyebrow">Cadastro</div><h1>Atletas</h1>
          <p class="subtitle">${U.plural(atletas.filter((a) => a.status === 'ativo').length, 'ativo', 'ativos')} · ${U.plural(atletas.filter((a) => a.status !== 'ativo').length, 'inativo', 'inativos')}</p></div>
        <div class="actions">
          <button class="btn hide-mobile" id="at-csv">${UI.icon('file-spreadsheet')}Exportar CSV</button>
          <a class="btn" href="#/fichas">${UI.icon('clipboard-list')}Fichas${(() => { const n = Store.query('fichas', { status: 'pendente' }).length; return n ? ` <span class="count-pill">${n}</span>` : ''; })()}</a>
          <button class="btn btn-gold" id="at-novo">${UI.icon('user-plus')}Novo atleta</button>
        </div>
      </div>
      <div class="card">
        <div class="toolbar">
          <div class="search input-group"><span class="prefix">${UI.icon('search')}</span>
            <label class="sr-only" for="f-q">Buscar</label><input id="f-q" class="input" placeholder="Buscar por nome, telefone, posição…" value="${esc(filtros.q)}"></div>
          <label class="sr-only" for="f-status">Status</label>
          <select id="f-status" class="input">${UI.options({ '': 'Todos os status', ativo: 'Ativos', inativo: 'Inativos' }, filtros.status)}</select>
          <label class="sr-only" for="f-mod">Modalidade</label>
          <select id="f-mod" class="input">${UI.options(modalidades, filtros.modalidade, { empty: 'Todas as modalidades' })}</select>
          <label class="sr-only" for="f-plano">Plano</label>
          <select id="f-plano" class="input">${UI.options(planos.map((p) => ({ value: p.id, label: p.nome })).concat([{ value: '_sem', label: 'Sem plano' }]), filtros.plano, { empty: 'Todos os planos' })}</select>
          <label class="check"><input type="checkbox" id="f-inad" ${filtros.inadimplente ? 'checked' : ''}> Inadimplentes</label>
        </div>
        <div id="at-table"></div>
      </div>`;

    const drawTable = () => {
      const q = U.norm(filtros.q);
      let rows = atletas.filter((a) =>
        (!filtros.status || a.status === filtros.status) &&
        (!filtros.modalidade || a.modalidade === filtros.modalidade) &&
        (!filtros.plano || (filtros.plano === '_sem' ? !a.planoId : a.planoId === filtros.plano)) &&
        (!filtros.inadimplente || inad.has(a.id)) &&
        (!q || U.norm([a.nome, a.posicao, a.modalidade, a.email].join(' ')).includes(q) || (U.onlyDigits(q) && U.onlyDigits(a.telefone).includes(U.onlyDigits(q)))));
      const keyFn = {
        nome: (a) => a.nome, modalidade: (a) => a.modalidade || '', plano: (a) => (D.plano(a) || {}).nome || '',
        status: (a) => a.status, inicio: (a) => a.dataInicio || '', valor: (a) => D.valorPlano(a),
      }[filtros.sort];
      rows = U.sortBy(rows, keyFn, filtros.dir);
      const th = (k, label, cls = '') => `<th class="sortable ${cls}" data-sort="${k}" aria-sort="${filtros.sort === k ? (filtros.dir === 1 ? 'ascending' : 'descending') : 'none'}">${label}${filtros.sort === k ? (filtros.dir === 1 ? ' ↑' : ' ↓') : ''}</th>`;
      const box = el.querySelector('#at-table');
      if (!atletas.length) {
        box.innerHTML = UI.empty({ icon: 'users', title: 'Nenhum atleta cadastrado', text: 'Cadastre seu primeiro atleta ou carregue os dados de demonstração em Configurações.', action: `<button class="btn btn-gold" data-novo>${UI.icon('user-plus')}Cadastrar atleta</button>` });
      } else if (!rows.length) {
        box.innerHTML = UI.empty({ icon: 'search-x', title: 'Nenhum resultado', text: 'Ajuste os filtros para ver mais atletas.', compact: true });
      } else {
        box.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr>
          ${th('nome', 'Atleta')}${th('modalidade', 'Modalidade', 'hide-mobile')}${th('plano', 'Plano', 'hide-mobile')}${th('valor', 'Valor', 'hide-mobile right')}${th('inicio', 'Desde', 'hide-mobile')}${th('status', 'Status')}<th class="hide-mobile">Financeiro</th>
          </tr></thead><tbody>${rows.map((a) => {
            const p = D.plano(a);
            return `<tr class="clickable" data-id="${esc(a.id)}">
              <td>${UI.personLink(a, esc([a.posicao, D.NIVEIS[a.nivel]].filter(Boolean).join(' · ')))}</td>
              <td class="hide-mobile">${esc(a.modalidade || '—')}</td>
              <td class="hide-mobile">${p ? esc(p.nome) : '<span class="muted">—</span>'}</td>
              <td class="hide-mobile right num">${p ? U.fmtMoney(D.valorPlano(a)) : '—'}</td>
              <td class="hide-mobile num">${U.fmtDate(a.dataInicio)}</td>
              <td>${UI.badgeAtleta(a)}</td>
              <td class="hide-mobile">${inad.has(a.id) ? UI.badge('Em atraso', 'danger') : UI.badge('Em dia', 'success')}</td>
            </tr>`;
          }).join('')}</tbody></table></div>
          <div class="card-pad muted small">${U.plural(rows.length, 'atleta', 'atletas')} na lista</div>`;
      }
      UI.refreshIcons(box);
    };
    drawTable();

    const on = (id, ev, fn) => el.querySelector(id).addEventListener(ev, fn);
    on('#f-q', 'input', U.debounce((e) => { filtros.q = e.target.value; drawTable(); }, 150));
    on('#f-status', 'change', (e) => { filtros.status = e.target.value; drawTable(); });
    on('#f-mod', 'change', (e) => { filtros.modalidade = e.target.value; drawTable(); });
    on('#f-plano', 'change', (e) => { filtros.plano = e.target.value; drawTable(); });
    on('#f-inad', 'change', (e) => { filtros.inadimplente = e.target.checked; drawTable(); });
    on('#at-novo', 'click', () => openForm());
    on('#at-csv', 'click', exportCSV);
    el.querySelector('#at-table').addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (th) { const k = th.dataset.sort; filtros.dir = filtros.sort === k ? -filtros.dir : 1; filtros.sort = k; drawTable(); return; }
      if (e.target.closest('[data-novo]')) { openForm(); return; }
      const tr = e.target.closest('tr[data-id]');
      if (tr && !e.target.closest('a')) location.hash = `#/atletas/${tr.dataset.id}`;
    });
  }

  function exportCSV() {
    const rows = Store.getAll('atletas');
    if (!rows.length) { UI.toast('Não há atletas para exportar.', 'warning'); return; }
    const csv = U.toCSV(rows, [
      { label: 'Nome', value: (a) => a.nome },
      { label: 'Status', value: (a) => a.status },
      { label: 'Nascimento', value: (a) => U.fmtDate(a.dataNascimento) },
      { label: 'Telefone', value: (a) => a.telefone },
      { label: 'E-mail', value: (a) => a.email },
      { label: 'Modalidade', value: (a) => a.modalidade },
      { label: 'Posição', value: (a) => a.posicao },
      { label: 'Nível', value: (a) => D.NIVEIS[a.nivel] || '' },
      { label: 'Plano', value: (a) => (D.plano(a) || {}).nome || '' },
      { label: 'Valor', value: (a) => U.fmtMoneyInput(D.valorPlano(a)) },
      { label: 'Dia vencimento', value: (a) => a.diaVencimento || '' },
      { label: 'Início', value: (a) => U.fmtDate(a.dataInicio) },
      { label: 'LTV (total pago)', value: (a) => U.fmtMoneyInput(D.ltv(a.id)) },
      { label: 'Objetivo', value: (a) => a.objetivo },
      { label: 'Observações médicas', value: (a) => a.observacoesMedicas },
    ]);
    U.download(`mr3-atletas-${U.today()}.csv`, csv, 'text/csv;charset=utf-8');
    UI.toast('CSV de atletas exportado.');
  }

  /* =====================================================================
     FORMULÁRIO (novo / editar)
     ===================================================================== */
  function openForm(id, onSaved, preset) {
    const a = id ? Store.getById('atletas', id) : null;
    const cfg = Store.getConfig();
    const planos = Store.getAll('planos').filter((p) => p.ativo !== false || (a && a.planoId === p.id));
    const v = a || Object.assign({ nivel: 'intermediario', dataInicio: U.today(), diaVencimento: cfg.valoresPadrao.diaVencimento, status: 'ativo' }, preset || {});
    const resp = v.responsavel || {};
    let foto = v.foto || '';

    const body = `
      <form id="atleta-form" novalidate>
        <div class="row mb-3" style="gap:14px">
          <span id="foto-prev">${UI.avatar({ nome: v.nome || '?', foto }, 'lg')}</span>
          <div class="row-wrap">
            <label class="btn btn-sm" for="foto-in">${UI.icon('camera')}Foto</label>
            <input id="foto-in" type="file" accept="image/*" class="sr-only">
            <button type="button" class="btn btn-sm btn-ghost" id="foto-rm" ${foto ? '' : 'hidden'}>Remover</button>
          </div>
        </div>
        <div class="form-grid">
          <div class="field full"><label for="a-nome">Nome completo <span class="req">*</span></label><input id="a-nome" class="input" name="nome" value="${esc(v.nome)}" autocomplete="off" required></div>
          <div class="field"><label for="a-nasc">Data de nascimento</label><input id="a-nasc" type="date" class="input" name="dataNascimento" value="${esc(v.dataNascimento)}" max="${U.today()}"></div>
          <div class="field"><label for="a-tel">WhatsApp</label><input id="a-tel" class="input" name="telefone" data-mask="phone" value="${esc(v.telefone)}" placeholder="(11) 98765-4321"></div>
          <div class="field"><label for="a-email">E-mail</label><input id="a-email" type="email" class="input" name="email" value="${esc(v.email)}"></div>
          <div class="field"><label for="a-mod">Modalidade / esporte</label><input id="a-mod" class="input" name="modalidade" list="dl-mod" value="${esc(v.modalidade)}">
            <datalist id="dl-mod">${cfg.modalidades.map((m) => `<option value="${esc(m)}">`).join('')}</datalist></div>
          <div class="field"><label for="a-pos">Posição</label><input id="a-pos" class="input" name="posicao" value="${esc(v.posicao)}"></div>
          <div class="field"><label for="a-niv">Nível</label><select id="a-niv" class="input" name="nivel">${UI.options(D.NIVEIS, v.nivel)}</select></div>
          <div class="field full"><label for="a-obj">Objetivo</label><input id="a-obj" class="input" name="objetivo" value="${esc(v.objetivo)}" placeholder="Ex.: ganho de explosão, retorno pós-lesão…"></div>
          <div class="field full"><label for="a-med">Observações médicas (lesões, restrições)</label><textarea id="a-med" class="input" name="observacoesMedicas" rows="2">${esc(v.observacoesMedicas)}</textarea></div>
        </div>
        <fieldset class="mt-3" id="resp-box">
          <legend>Responsável (obrigatório para menores de 18 anos)</legend>
          <div class="form-grid">
            <div class="field"><label for="a-rnome">Nome do responsável</label><input id="a-rnome" class="input" name="respNome" value="${esc(resp.nome)}"></div>
            <div class="field"><label for="a-rtel">Telefone do responsável</label><input id="a-rtel" class="input" name="respTelefone" data-mask="phone" value="${esc(resp.telefone)}"></div>
          </div>
        </fieldset>
        <fieldset class="mt-3">
          <legend>Plano e cobrança</legend>
          <div class="form-grid">
            <div class="field"><label for="a-plano">Plano</label><select id="a-plano" class="input" name="planoId">${UI.options(planos.map((p) => ({ value: p.id, label: `${p.nome} — ${U.fmtMoney(p.valor)}` })), v.planoId, { empty: 'Sem plano' })}</select>
              ${!planos.length ? '<span class="hint">Cadastre planos em “Planos e sessões”.</span>' : ''}</div>
            <div class="field"><label for="a-valor">Valor personalizado</label>${UI.moneyInput('valorPersonalizado', v.valorPersonalizado, 'id="a-valor"')}<span class="hint">Deixe vazio para usar o valor do plano.</span></div>
            <div class="field"><label for="a-venc">Dia de vencimento</label><input id="a-venc" type="number" min="1" max="31" class="input" name="diaVencimento" value="${esc(v.diaVencimento)}"></div>
            <div class="field"><label for="a-ini">Data de início <span class="req">*</span></label><input id="a-ini" type="date" class="input" name="dataInicio" value="${esc(v.dataInicio)}" ${a ? 'readonly title="Altere pelo histórico de status"' : ''}></div>
            <div class="field full" id="pacote-opt" hidden><label class="check"><input type="checkbox" name="lancarPacote" checked> Lançar a cobrança do pacote agora (inicia o saldo de sessões)</label></div>
          </div>
        </fieldset>
      </form>`;

    UI.modal({
      title: a ? 'Editar atleta' : preset ? 'Novo atleta a partir da ficha' : 'Novo atleta', size: 'lg', body,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-gold" id="a-save">${UI.icon('check')}Salvar</button>`,
      onOpen(el, close) {
        const form = el.querySelector('#atleta-form');
        const nasc = form.querySelector('[name=dataNascimento]');
        const respBox = el.querySelector('#resp-box');
        const toggleResp = () => { const idade = U.age(nasc.value); respBox.style.display = nasc.value && idade < 18 ? '' : (resp.nome ? '' : 'none'); };
        nasc.addEventListener('change', toggleResp); toggleResp();
        const planoSel = form.querySelector('[name=planoId]');
        const togglePacote = () => {
          const p = Store.getById('planos', planoSel.value);
          el.querySelector('#pacote-opt').hidden = !(p && p.tipo === 'pacote' && (!a || a.planoId !== p.id));
        };
        planoSel.addEventListener('change', togglePacote); togglePacote();

        el.querySelector('#foto-in').addEventListener('change', async (e) => {
          const f = e.target.files[0]; if (!f) return;
          try { foto = await U.resizeImage(f); el.querySelector('#foto-prev').innerHTML = UI.avatar({ nome: form.nome.value || '?', foto }, 'lg'); el.querySelector('#foto-rm').hidden = false; }
          catch (err) { UI.toast(err.message, 'error'); }
        });
        el.querySelector('#foto-rm').addEventListener('click', (e) => { foto = ''; el.querySelector('#foto-prev').innerHTML = UI.avatar({ nome: form.nome.value || '?' }, 'lg'); e.target.hidden = true; });

        const save = () => {
          const f = UI.formData(form);
          const errs = {};
          if (f.nome.length < 3) errs.nome = 'Informe o nome completo.';
          if (!U.isISODate(f.dataInicio)) errs.dataInicio = 'Informe a data de início.';
          if (f.telefone && !U.validPhone(f.telefone)) errs.telefone = 'Telefone inválido (use DDD).';
          if (f.email && !U.validEmail(f.email)) errs.email = 'E-mail inválido.';
          if (f.diaVencimento && (f.diaVencimento < 1 || f.diaVencimento > 31)) errs.diaVencimento = 'Entre 1 e 31.';
          if (f.dataNascimento && f.dataNascimento > U.today()) errs.dataNascimento = 'Data no futuro.';
          if (f.dataNascimento && U.age(f.dataNascimento) < 18 && !f.respNome) errs.respNome = 'Obrigatório para menores.';
          if (f.respTelefone && !U.validPhone(f.respTelefone)) errs.respTelefone = 'Telefone inválido.';
          if (!UI.showErrors(form, errs)) return;
          const dup = Store.getAll('atletas').find((x) => x.id !== (a && a.id) && U.norm(x.nome) === U.norm(f.nome));
          const rec = {
            nome: f.nome, foto, dataNascimento: f.dataNascimento, telefone: f.telefone, email: f.email,
            modalidade: f.modalidade, posicao: f.posicao, nivel: f.nivel, objetivo: f.objetivo, observacoesMedicas: f.observacoesMedicas,
            responsavel: f.respNome || f.respTelefone ? { nome: f.respNome, telefone: f.respTelefone } : null,
            planoId: f.planoId || null, valorPersonalizado: f.valorPersonalizado === '' ? null : f.valorPersonalizado,
            diaVencimento: f.diaVencimento ? Number(f.diaVencimento) : null,
          };
          const finish = () => {
            let saved;
            if (a) saved = Store.update('atletas', a.id, rec);
            else saved = Store.create('atletas', Object.assign(rec, { dataInicio: f.dataInicio, status: 'ativo', historicoStatus: [{ status: 'ativo', data: f.dataInicio, motivo: 'cadastro', observacao: '' }] }));
            const p = Store.getById('planos', saved.planoId);
            if (f.lancarPacote && p && p.tipo === 'pacote' && !el.querySelector('#pacote-opt').hidden) MR3.Fin.criarCobrancaPacote(saved, p, U.today());
            UI.toast(a ? 'Atleta atualizado.' : 'Atleta cadastrado.');
            close();
            if (onSaved) onSaved(saved); else if (!a) location.hash = `#/atletas/${saved.id}`; else MR3.refresh();
          };
          if (dup) UI.confirm({ title: 'Nome repetido', message: `Já existe um atleta chamado "${dup.nome}". Salvar mesmo assim?`, confirmText: 'Salvar' }).then((ok) => ok && finish());
          else finish();
        };
        el.querySelector('#a-save').addEventListener('click', save);
        form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
      },
    });
  }

  /* =====================================================================
     ATIVAR / DESATIVAR
     ===================================================================== */
  function openDesativar(id) {
    const a = Store.getById('atletas', id);
    const futuras = D.sessoesDoAtleta(id).filter((s) => s.status === 'agendada' && s.data >= U.today());
    UI.modal({
      title: `Desativar ${U.firstName(a.nome)}`,
      body: `<form id="des-form" novalidate class="stack">
        <p class="muted">A saída fica registrada no histórico e entra no cálculo de churn do mês.</p>
        <div class="field"><label for="d-mot">Motivo <span class="req">*</span></label><select id="d-mot" class="input" name="motivo">${UI.options(D.MOTIVOS_SAIDA, '', { empty: 'Selecione…' })}</select></div>
        <div class="field"><label for="d-data">Data da saída <span class="req">*</span></label><input id="d-data" type="date" class="input" name="data" value="${U.today()}"></div>
        <div class="field"><label for="d-obs">Observação</label><textarea id="d-obs" class="input" name="observacao" rows="3" placeholder="Detalhes que ajudem a entender a saída"></textarea></div>
        ${futuras.length ? `<label class="check"><input type="checkbox" name="cancelarFuturas" checked> Cancelar ${U.plural(futuras.length, 'sessão agendada', 'sessões agendadas')} a partir da data de saída</label>` : ''}
      </form>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-danger-solid" id="d-ok">${UI.icon('user-x')}Desativar</button>`,
      onOpen(el, close) {
        el.querySelector('#d-ok').addEventListener('click', () => {
          const form = el.querySelector('#des-form');
          const f = UI.formData(form);
          const errs = {};
          if (!f.motivo) errs.motivo = 'Selecione o motivo.';
          const ultimo = D.historico(a).slice(-1)[0];
          if (!U.isISODate(f.data)) errs.data = 'Data inválida.';
          else if (ultimo && f.data < ultimo.data) errs.data = `Deve ser igual ou posterior a ${U.fmtDate(ultimo.data)}.`;
          if (!UI.showErrors(form, errs)) return;
          Store.batch(() => {
            Store.update('atletas', id, { status: 'inativo', historicoStatus: (a.historicoStatus || []).concat([{ status: 'inativo', data: f.data, motivo: f.motivo, observacao: f.observacao }]) });
            if (f.cancelarFuturas) futuras.filter((s) => s.data >= f.data).forEach((s) => {
              if ((s.atletaIds || []).length > 1) Store.update('sessoes', s.id, { atletaIds: s.atletaIds.filter((x) => x !== id) });
              else Store.update('sessoes', s.id, { status: 'cancelada', anotacoes: (s.anotacoes ? s.anotacoes + '\n' : '') + 'Cancelada: atleta desativado.' });
            });
          });
          UI.toast(`${U.firstName(a.nome)} foi desativado.`);
          close(); MR3.refresh();
        });
      },
    });
  }
  function openReativar(id) {
    const a = Store.getById('atletas', id);
    UI.modal({
      title: `Reativar ${U.firstName(a.nome)}`, size: 'sm',
      body: `<form id="re-form" novalidate class="stack">
        <div class="field"><label for="r-data">Data de retorno <span class="req">*</span></label><input id="r-data" type="date" class="input" name="data" value="${U.today()}"></div>
        <div class="field"><label for="r-obs">Observação</label><input id="r-obs" class="input" name="observacao"></div></form>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-gold" id="r-ok">${UI.icon('user-check')}Reativar</button>`,
      onOpen(el, close) {
        el.querySelector('#r-ok').addEventListener('click', () => {
          const form = el.querySelector('#re-form');
          const f = UI.formData(form);
          const ultimo = D.historico(a).slice(-1)[0];
          const errs = {};
          if (!U.isISODate(f.data)) errs.data = 'Data inválida.';
          else if (ultimo && f.data < ultimo.data) errs.data = `Deve ser igual ou posterior a ${U.fmtDate(ultimo.data)}.`;
          if (!UI.showErrors(form, errs)) return;
          Store.update('atletas', id, { status: 'ativo', historicoStatus: (a.historicoStatus || []).concat([{ status: 'ativo', data: f.data, motivo: 'reativacao', observacao: f.observacao }]) });
          UI.toast(`${U.firstName(a.nome)} foi reativado.`);
          close(); MR3.refresh();
        });
      },
    });
  }

  async function excluir(id) {
    const a = Store.getById('atletas', id);
    const ok = await UI.confirm({
      title: 'Excluir atleta', danger: true, confirmText: 'Excluir definitivamente',
      message: `Excluir "${a.nome}" apaga também as sessões, cobranças e avaliações dele. Isso altera relatórios históricos.\n\nPara registrar uma saída, prefira “Desativar”.`,
    });
    if (!ok) return;
    Store.batch(() => {
      Store.getAll('sessoes').filter((s) => (s.atletaIds || []).includes(id)).forEach((s) => {
        if (s.atletaIds.length > 1) Store.update('sessoes', s.id, { atletaIds: s.atletaIds.filter((x) => x !== id) });
        else Store.remove('sessoes', s.id);
      });
      Store.removeWhere('cobrancas', (c) => c.atletaId === id);
      Store.removeWhere('avaliacoes', (x) => x.atletaId === id);
      Store.remove('atletas', id);
    });
    UI.toast('Atleta excluído.');
    location.hash = '#/atletas';
  }

  /* =====================================================================
     PERFIL 360º
     ===================================================================== */
  const ABAS = [
    { id: 'resumo', label: 'Resumo', icon: 'user' },
    { id: 'sessoes', label: 'Sessões', icon: 'dumbbell' },
    { id: 'financeiro', label: 'Financeiro', icon: 'wallet' },
    { id: 'avaliacoes', label: 'Avaliações', icon: 'activity' },
    { id: 'ficha', label: 'Ficha', icon: 'clipboard-list' },
    { id: 'materiais', label: 'Materiais', icon: 'folder-open' },
    { id: 'timeline', label: 'Linha do tempo', icon: 'history' },
  ];

  function renderPerfil(el, id, aba = 'resumo') {
    const a = Store.getById('atletas', id);
    if (!a) {
      el.innerHTML = UI.empty({ icon: 'user-x', title: 'Atleta não encontrado', text: 'Ele pode ter sido excluído.', action: '<a class="btn" href="#/atletas">Voltar para atletas</a>' });
      return;
    }
    if (!ABAS.some((x) => x.id === aba)) aba = 'resumo';
    const p = D.plano(a);
    const idade = U.age(a.dataNascimento);
    const ultimoEv = D.historico(a).slice(-1)[0];

    el.innerHTML = `
      <div class="row mb-3"><a href="#/atletas" class="btn btn-sm btn-ghost">${UI.icon('arrow-left')}Atletas</a></div>
      <div class="card profile-card mb-3">
        <div class="profile-head">
          ${UI.avatar(a, 'lg')}
          <div class="info">
            <h1>${esc(a.nome)} ${UI.badgeAtleta(a)} ${a.nivel ? UI.badge(D.NIVEIS[a.nivel], 'gold no-dot') : ''}</h1>
            <div class="profile-meta">
              ${a.modalidade ? `<span>${UI.icon('trophy')}${esc(a.modalidade)}${a.posicao ? ' · ' + esc(a.posicao) : ''}</span>` : ''}
              ${idade != null ? `<span>${UI.icon('cake')}${idade} anos</span>` : ''}
              ${a.telefone ? `<span>${UI.icon('phone')}${esc(a.telefone)}</span>` : ''}
              <span>${UI.icon('credit-card')}${p ? esc(p.nome) : 'Sem plano'}</span>
              ${a.status !== 'ativo' && ultimoEv ? `<span class="text-danger">${UI.icon('log-out')}Saiu em ${U.fmtDate(ultimoEv.data)} · ${esc(D.MOTIVOS_SAIDA[ultimoEv.motivo] || '')}</span>` : ''}
            </div>
          </div>
          <div class="row-wrap">
            <button class="btn btn-wa" id="p-wa">${UI.icon('message-circle')}WhatsApp</button>
            <button class="btn" id="p-sess">${UI.icon('calendar-plus')}Sessão</button>
            <button class="btn" id="p-edit">${UI.icon('pencil')}Editar</button>
            ${a.status === 'ativo' ? `<button class="btn btn-danger" id="p-des">${UI.icon('user-x')}Desativar</button>` : `<button class="btn btn-success" id="p-re">${UI.icon('user-check')}Reativar</button>`}
            <button class="icon-btn" id="p-del" aria-label="Excluir atleta" title="Excluir atleta">${UI.icon('trash-2')}</button>
          </div>
        </div>
      </div>
      <nav class="tabs" aria-label="Seções do perfil">${ABAS.map((t) => `<a href="#/atletas/${esc(a.id)}/${t.id}" class="${t.id === aba ? 'active' : ''}" ${t.id === aba ? 'aria-current="page"' : ''}>${t.label}</a>`).join('')}</nav>
      <div id="aba"></div>`;

    const box = el.querySelector('#aba');
    ({ resumo: abaResumo, sessoes: abaSessoes, financeiro: abaFinanceiro, avaliacoes: abaAvaliacoes, ficha: abaFicha, materiais: abaMateriais, timeline: abaTimeline })[aba](box, a);

    el.querySelector('#p-wa').onclick = () => UI.whatsapp({ telefone: a.telefone, nome: a.nome, mensagem: `Olá, ${U.firstName(a.nome)}! ` });
    el.querySelector('#p-sess').onclick = () => MR3.Agenda.openSessao({ atletaIds: [a.id] });
    el.querySelector('#p-edit').onclick = () => openForm(a.id);
    el.querySelector('#p-del').onclick = () => excluir(a.id);
    const des = el.querySelector('#p-des'); if (des) des.onclick = () => openDesativar(a.id);
    const re = el.querySelector('#p-re'); if (re) re.onclick = () => openReativar(a.id);
  }

  /* ---------- Aba: Resumo ---------- */
  function abaResumo(box, a) {
    const p = D.plano(a);
    const sess = D.sessoesDoAtleta(a.id);
    const pres = D.presenca(sess.filter((s) => s.data <= U.today()));
    const saldoDev = U.sum(Store.query('cobrancas', { atletaId: a.id }), D.saldoDevedor);
    const pacote = D.saldoPacote(a.id);
    const proxima = U.sortBy(sess.filter((s) => s.status === 'agendada' && s.data >= U.today()), (s) => s.data + s.horaInicio)[0];
    const cfg = Store.getConfig();

    box.innerHTML = `
      <div class="mini-stats mb-3">
        <div class="mini-stat"><div class="lbl">Tempo de casa</div><div class="val">${U.fmtDuration(D.diasAtivo(a))}</div></div>
        <div class="mini-stat"><div class="lbl">LTV (total pago)</div><div class="val gold">${U.fmtMoney(D.ltv(a.id))}</div></div>
        <div class="mini-stat"><div class="lbl">Frequência média</div><div class="val">${U.fmtNum(D.frequenciaSemanal(a), 1)}<span class="muted small"> /sem</span></div></div>
        <div class="mini-stat"><div class="lbl">Presença</div><div class="val ${pres.taxa != null && pres.taxa < 0.8 ? 'text-warning' : ''}">${U.fmtPct(pres.taxa)}</div></div>
        <div class="mini-stat"><div class="lbl">Saldo devedor</div><div class="val ${saldoDev > 0 ? 'text-danger' : ''}">${U.fmtMoney(saldoDev)}</div></div>
        ${pacote ? `<div class="mini-stat"><div class="lbl">Saldo do pacote</div><div class="val ${pacote.saldo <= cfg.alertaSaldoPacote ? 'text-warning' : ''}">${pacote.saldo}<span class="muted small"> de ${pacote.creditos}</span></div></div>` : ''}
      </div>
      ${pacote && pacote.saldo <= cfg.alertaSaldoPacote ? `<div class="alert warning mb-3">${UI.icon('alert-triangle')}<div>${pacote.saldo <= 0 ? 'O pacote acabou.' : `Restam apenas ${U.plural(pacote.saldo, 'sessão', 'sessões')} no pacote.`} <a href="#" id="p-renovar">Lançar novo pacote</a></div></div>` : ''}
      <div class="grid grid-2">
        <div class="card"><div class="card-head"><h3>${UI.icon('id-card')}Dados pessoais</h3></div><div class="card-body">
          <dl class="dl">
            <dt>Nascimento</dt><dd>${U.fmtDate(a.dataNascimento)}${a.dataNascimento ? ` (${U.age(a.dataNascimento)} anos)` : ''}</dd>
            <dt>WhatsApp</dt><dd>${esc(a.telefone || '—')}</dd>
            <dt>E-mail</dt><dd>${a.email ? `<a href="mailto:${esc(a.email)}">${esc(a.email)}</a>` : '—'}</dd>
            <dt>Modalidade</dt><dd>${esc(a.modalidade || '—')}</dd>
            <dt>Posição</dt><dd>${esc(a.posicao || '—')}</dd>
            <dt>Nível</dt><dd>${esc(D.NIVEIS[a.nivel] || '—')}</dd>
            <dt>Objetivo</dt><dd>${esc(a.objetivo || '—')}</dd>
            ${a.responsavel && a.responsavel.nome ? `<dt>Responsável</dt><dd>${esc(a.responsavel.nome)}${a.responsavel.telefone ? ' · ' + esc(a.responsavel.telefone) : ''}</dd>` : ''}
          </dl></div></div>
        <div class="stack">
          <div class="card"><div class="card-head"><h3>${UI.icon('credit-card')}Plano</h3></div><div class="card-body">
            <dl class="dl">
              <dt>Plano</dt><dd>${p ? `${esc(p.nome)} ${UI.badge(D.TIPOS_PLANO[p.tipo], 'no-dot')}` : '—'}</dd>
              <dt>Valor</dt><dd class="num">${p ? U.fmtMoney(D.valorPlano(a)) + (a.valorPersonalizado != null ? ' <span class="muted small">(personalizado)</span>' : '') : '—'}</dd>
              <dt>Vencimento</dt><dd>${a.diaVencimento ? `Todo dia ${a.diaVencimento}` : '—'}</dd>
              <dt>Início</dt><dd>${U.fmtDate(a.dataInicio)}</dd>
              ${pacote ? `<dt>Pacote</dt><dd>${pacote.usadas} de ${pacote.creditos} usadas${pacote.validade ? ` · válido até ${U.fmtDate(pacote.validade)}${pacote.vencido ? ' ' + UI.badge('Vencido', 'danger') : ''}` : ''}</dd>` : ''}
              <dt>Próxima sessão</dt><dd>${proxima ? `${U.fmtDateDow(proxima.data)} às ${proxima.horaInicio}` : '—'}</dd>
            </dl></div></div>
          <div class="card"><div class="card-head"><h3>${UI.icon('heart-pulse')}Saúde e restrições</h3></div><div class="card-body">
            ${a.observacoesMedicas ? `<p style="white-space:pre-wrap">${esc(a.observacoesMedicas)}</p>` : '<p class="muted">Nenhuma observação registrada.</p>'}
          </div></div>
        </div>
      </div>
      <div class="card mt-3"><div class="card-head"><h3>${UI.icon('repeat')}Histórico de status</h3></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Status</th><th>Motivo</th><th>Observação</th></tr></thead><tbody>
        ${D.historico(a).slice().reverse().map((h) => `<tr><td class="num">${U.fmtDate(h.data)}</td><td>${h.status === 'ativo' ? UI.badge('Ativo', 'success') : UI.badge('Inativo', 'danger')}</td>
          <td>${h.motivo === 'cadastro' ? 'Cadastro' : h.motivo === 'reativacao' ? 'Reativação' : esc(D.MOTIVOS_SAIDA[h.motivo] || h.motivo || '—')}</td><td class="muted">${esc(h.observacao || '')}</td></tr>`).join('')}
        </tbody></table></div></div>`;
    const ren = box.querySelector('#p-renovar');
    if (ren) ren.onclick = (e) => { e.preventDefault(); MR3.Fin.openCobranca({ atletaId: a.id, tipo: 'pacote' }); };
  }

  /* ---------- Aba: Sessões ---------- */
  function abaSessoes(box, a) {
    const sess = U.sortBy(D.sessoesDoAtleta(a.id), (s) => s.data + s.horaInicio, -1);
    const passadas = sess.filter((s) => s.data <= U.today());
    const pres = D.presenca(passadas);
    const comPse = U.sortBy(sess.filter((s) => s.status === 'realizada' && s.pse != null && s.pse !== ''), (s) => s.data).slice(-30);
    box.innerHTML = `
      <div class="mini-stats mb-3">
        <div class="mini-stat"><div class="lbl">Realizadas</div><div class="val text-success">${pres.realizadas}</div></div>
        <div class="mini-stat"><div class="lbl">Faltas</div><div class="val text-danger">${pres.faltas}</div></div>
        <div class="mini-stat"><div class="lbl">Taxa de presença</div><div class="val gold">${U.fmtPct(pres.taxa)}</div></div>
        <div class="mini-stat"><div class="lbl">Agendadas (futuras)</div><div class="val">${sess.filter((s) => s.status === 'agendada' && s.data >= U.today()).length}</div></div>
      </div>
      ${comPse.length >= 2 ? `<div class="card mb-3"><div class="card-head"><h3>${UI.icon('trending-up')}PSE nas últimas sessões</h3></div><div class="card-body"><div class="chart-box sm" id="pse-chart"></div></div></div>` : ''}
      <div class="card"><div class="card-head"><h3>${UI.icon('list')}Histórico de sessões</h3><button class="btn btn-sm btn-gold" id="s-nova">${UI.icon('plus')}Nova sessão</button></div>
      ${sess.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Horário</th><th class="hide-mobile">Tipo</th><th class="hide-mobile">Local</th><th>Status</th><th>PSE</th><th>Anotações / evolução</th></tr></thead><tbody>
        ${sess.map((s) => `<tr class="clickable" data-sid="${esc(s.id)}"><td class="num nowrap">${U.fmtDateDow(s.data)}</td><td class="num">${esc(s.horaInicio)}</td><td class="hide-mobile">${esc(s.tipo || '—')}${(s.atletaIds || []).length > 1 ? ' ' + UI.badge('Grupo', 'no-dot') : ''}</td>
          <td class="hide-mobile">${esc(s.local || '—')}</td><td>${UI.badgeSessao(s.status)}</td><td class="num">${s.pse != null && s.pse !== '' ? esc(s.pse) : '—'}</td>
          <td class="muted small" style="max-width:340px">${esc([s.anotacoes, s.evolucao].filter(Boolean).join(' — ')) || '—'}</td></tr>`).join('')}
      </tbody></table></div>` : UI.empty({ icon: 'calendar', title: 'Nenhuma sessão ainda', compact: true })}</div>`;
    box.querySelector('#s-nova').onclick = () => MR3.Agenda.openSessao({ atletaIds: [a.id] });
    box.querySelectorAll('[data-sid]').forEach((tr) => tr.addEventListener('click', () => MR3.Agenda.openDetalhe(tr.dataset.sid)));
    if (comPse.length >= 2) {
      const c = UI.chartColors();
      UI.chart(box.querySelector('#pse-chart'), {
        type: 'line',
        data: { labels: comPse.map((s) => U.fmtDateShort(s.data)), datasets: [{ label: 'PSE', data: comPse.map((s) => Number(s.pse)), borderColor: c.gold, backgroundColor: c.gold, tension: .3, pointRadius: 3 }] },
        options: { scales: { y: { max: 10, ticks: { stepSize: 2 } } }, plugins: { legend: { display: false } } },
      });
    }
  }

  /* ---------- Aba: Financeiro ---------- */
  function abaFinanceiro(box, a) {
    const cobs = U.sortBy(D.cobrancasComStatus({ atletaId: a.id }), (c) => c.vencimento, -1);
    const pags = U.sortBy(D.pagamentos({ atletaId: a.id }), (p) => p.data, -1);
    const saldoDev = U.sum(cobs, (c) => c._saldo);
    const pacote = D.saldoPacote(a.id);
    box.innerHTML = `
      <div class="mini-stats mb-3">
        <div class="mini-stat"><div class="lbl">LTV (total pago)</div><div class="val gold">${U.fmtMoney(D.ltv(a.id))}</div></div>
        <div class="mini-stat"><div class="lbl">Saldo devedor</div><div class="val ${saldoDev > 0 ? 'text-danger' : ''}">${U.fmtMoney(saldoDev)}</div></div>
        <div class="mini-stat"><div class="lbl">Em atraso</div><div class="val">${cobs.filter((c) => c._status === 'atrasado').length}</div></div>
        ${pacote ? `<div class="mini-stat"><div class="lbl">Saldo do pacote</div><div class="val">${pacote.saldo} <span class="muted small">sessões</span></div></div>` : ''}
      </div>
      <div class="card mb-3"><div class="card-head"><h3>${UI.icon('receipt')}Cobranças</h3>
        ${a.telefone && saldoDev > 0 ? `<button class="btn btn-sm btn-wa" id="f-cobrar">${UI.icon('message-circle')}Cobrar</button>` : ''}
        <button class="btn btn-sm btn-gold" id="f-nova">${UI.icon('plus')}Nova cobrança</button></div>
        <div id="f-cobs"></div></div>
      <div class="card"><div class="card-head"><h3>${UI.icon('banknote')}Pagamentos recebidos</h3></div>
        ${pags.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Referência</th><th>Forma</th><th class="right">Valor</th><th></th></tr></thead><tbody>
          ${pags.map((p) => `<tr><td class="num">${U.fmtDate(p.data)}</td><td>${esc(p.referencia)}</td><td>${esc(D.FORMAS_PAGAMENTO[p.forma] || p.forma)}</td><td class="right num strong">${U.fmtMoney(p.valor)}</td>
            <td class="actions-cell"><button class="btn btn-sm btn-ghost" data-recibo="${esc(p.cobrancaId)}" data-idx="${p.idx}">${UI.icon('printer')}Recibo</button></td></tr>`).join('')}
        </tbody></table></div>` : UI.empty({ icon: 'banknote', title: 'Nenhum pagamento registrado', compact: true })}</div>`;
    MR3.Fin.renderTabela(box.querySelector('#f-cobs'), cobs, { mostrarAtleta: false });
    box.querySelector('#f-nova').onclick = () => MR3.Fin.openCobranca({ atletaId: a.id });
    const cb = box.querySelector('#f-cobrar');
    if (cb) cb.onclick = () => { const c = cobs.find((x) => x._status === 'atrasado') || cobs.find((x) => x._saldo > 0); MR3.Fin.cobrarWhatsApp(c.id); };
    box.querySelectorAll('[data-recibo]').forEach((b) => b.addEventListener('click', () => MR3.Fin.recibo(b.dataset.recibo, +b.dataset.idx)));
  }

  /* ---------- Aba: Avaliações ---------- */
  function abaAvaliacoes(box, a) {
    const avs = U.sortBy(Store.query('avaliacoes', { atletaId: a.id }), (x) => x.data);
    const testes = [...new Set(avs.flatMap((x) => (x.testes || []).map((t) => t.nome)))];
    const metricas = ['Peso (kg)'].concat(testes);
    box.innerHTML = `
      <div class="card mb-3"><div class="card-head"><h3>${UI.icon('line-chart')}Evolução</h3>
        ${avs.length ? `<label class="sr-only" for="av-met">Métrica</label><select id="av-met" class="input input-sm" style="width:auto">${UI.options(metricas, metricas[testes.length ? 1 : 0])}</select>` : ''}</div>
        <div class="card-body">${avs.length >= 1 ? '<div class="chart-box sm" id="av-chart"></div>' : UI.empty({ icon: 'activity', title: 'Sem avaliações físicas', text: 'Registre avaliações para acompanhar a evolução dos testes.', compact: true })}</div></div>
      <div class="card"><div class="card-head"><h3>${UI.icon('clipboard-check')}Avaliações</h3><button class="btn btn-sm btn-gold" id="av-nova">${UI.icon('plus')}Nova avaliação</button></div>
        ${avs.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Peso</th><th>Altura</th><th class="hide-mobile">IMC</th><th>Testes</th><th></th></tr></thead><tbody>
          ${avs.slice().reverse().map((x) => {
            const imc = x.peso && x.altura ? x.peso / Math.pow(x.altura / 100, 2) : null;
            return `<tr><td class="num">${U.fmtDate(x.data)}</td><td class="num">${x.peso ? U.fmtNum(x.peso) + ' kg' : '—'}</td><td class="num">${x.altura ? U.fmtNum(x.altura, 0) + ' cm' : '—'}</td><td class="num hide-mobile">${imc ? U.fmtNum(imc) : '—'}</td>
              <td class="small">${(x.testes || []).map((t) => `${esc(t.nome)}: <b>${esc(String(t.valor).replace('.', ','))}</b> ${esc(t.unidade || '')}`).join('<br>') || '—'}${x.observacoes ? `<div class="muted">${esc(x.observacoes)}</div>` : ''}</td>
              <td class="actions-cell"><button class="icon-btn sm ghost" data-edit="${esc(x.id)}" aria-label="Editar">${UI.icon('pencil')}</button><button class="icon-btn sm ghost" data-del="${esc(x.id)}" aria-label="Excluir">${UI.icon('trash-2')}</button></td></tr>`;
          }).join('')}</tbody></table></div>` : ''}</div>`;
    box.querySelector('#av-nova').onclick = () => openAvaliacao(a.id);
    box.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openAvaliacao(a.id, b.dataset.edit)));
    box.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (await UI.confirm({ title: 'Excluir avaliação', message: 'Deseja excluir esta avaliação?', danger: true, confirmText: 'Excluir' })) { Store.remove('avaliacoes', b.dataset.del); UI.toast('Avaliação excluída.'); MR3.refresh(); }
    }));
    const draw = () => {
      const m = box.querySelector('#av-met').value;
      const pts = avs.map((x) => ({ d: x.data, v: m === 'Peso (kg)' ? x.peso : ((x.testes || []).find((t) => t.nome === m) || {}).valor })).filter((p) => p.v != null && p.v !== '');
      const un = m === 'Peso (kg)' ? 'kg' : ((avs.flatMap((x) => x.testes || []).find((t) => t.nome === m) || {}).unidade || '');
      const c = UI.chartColors();
      UI.chart(box.querySelector('#av-chart'), {
        type: 'line',
        data: { labels: pts.map((p) => U.fmtDate(p.d)), datasets: [{ label: `${m}${un && m !== 'Peso (kg)' ? ' (' + un + ')' : ''}`, data: pts.map((p) => Number(p.v)), borderColor: c.gold, backgroundColor: c.gold, tension: .3, pointRadius: 4 }] },
        options: { scales: { y: { beginAtZero: false } } },
      });
    };
    if (avs.length) { draw(); box.querySelector('#av-met').addEventListener('change', draw); }
  }

  function openAvaliacao(atletaId, id) {
    const x = id ? Store.getById('avaliacoes', id) : null;
    const anterior = U.sortBy(Store.query('avaliacoes', { atletaId }), (v) => v.data).slice(-1)[0];
    const testes = x ? x.testes || [] : (anterior ? (anterior.testes || []).map((t) => ({ nome: t.nome, unidade: t.unidade, valor: '' })) : [{ nome: 'Salto vertical', unidade: 'cm', valor: '' }, { nome: 'Sprint 20m', unidade: 's', valor: '' }]);
    const rowHtml = (t = {}) => `<div class="row test-row" style="gap:6px"><input class="input input-sm" placeholder="Teste" value="${esc(t.nome)}" data-k="nome" aria-label="Nome do teste">
      <input class="input input-sm" placeholder="Valor" value="${esc(t.valor != null ? String(t.valor).replace('.', ',') : '')}" data-k="valor" inputmode="decimal" style="max-width:90px" aria-label="Valor">
      <input class="input input-sm" placeholder="Unid." value="${esc(t.unidade)}" data-k="unidade" style="max-width:70px" aria-label="Unidade">
      <button type="button" class="icon-btn sm ghost" data-rm aria-label="Remover teste">${UI.icon('x')}</button></div>`;
    UI.modal({
      title: x ? 'Editar avaliação' : 'Nova avaliação física',
      body: `<form id="av-form" novalidate>
        <div class="form-grid form-grid-3">
          <div class="field"><label for="av-data">Data <span class="req">*</span></label><input id="av-data" type="date" class="input" name="data" value="${esc(x ? x.data : U.today())}"></div>
          <div class="field"><label for="av-peso">Peso (kg)</label><input id="av-peso" class="input" name="peso" inputmode="decimal" value="${x && x.peso ? String(x.peso).replace('.', ',') : ''}"></div>
          <div class="field"><label for="av-alt">Altura (cm)</label><input id="av-alt" class="input" name="altura" inputmode="decimal" value="${x && x.altura ? String(x.altura).replace('.', ',') : (anterior && anterior.altura ? String(anterior.altura).replace('.', ',') : '')}"></div>
        </div>
        <div class="field-label mt-3 mb-2">Testes</div>
        <div id="tests" class="stack">${testes.map(rowHtml).join('')}</div>
        <button type="button" class="btn btn-sm mt-2" id="add-test">${UI.icon('plus')}Adicionar teste</button>
        <div class="field mt-3"><label for="av-obs">Observações</label><textarea id="av-obs" class="input" name="observacoes" rows="2">${esc(x ? x.observacoes : '')}</textarea></div>
      </form>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-gold" id="av-save">${UI.icon('check')}Salvar</button>`,
      onOpen(el, close) {
        const tests = el.querySelector('#tests');
        el.querySelector('#add-test').onclick = () => { tests.insertAdjacentHTML('beforeend', rowHtml()); UI.refreshIcons(tests); tests.lastElementChild.querySelector('input').focus(); };
        tests.addEventListener('click', (e) => { if (e.target.closest('[data-rm]')) e.target.closest('.test-row').remove(); });
        el.querySelector('#av-save').onclick = () => {
          const form = el.querySelector('#av-form');
          const f = UI.formData(form);
          if (!UI.showErrors(form, U.isISODate(f.data) ? {} : { data: 'Informe a data.' })) return;
          const numOrNull = (s) => { const n = U.parseMoney(s); return String(s).trim() === '' ? null : n; };
          const rec = {
            atletaId, data: f.data, peso: numOrNull(f.peso), altura: numOrNull(f.altura), observacoes: f.observacoes,
            testes: [...tests.querySelectorAll('.test-row')].map((r) => ({ nome: r.querySelector('[data-k=nome]').value.trim(), valor: numOrNull(r.querySelector('[data-k=valor]').value), unidade: r.querySelector('[data-k=unidade]').value.trim() })).filter((t) => t.nome && t.valor != null),
          };
          if (x) Store.update('avaliacoes', x.id, rec); else Store.create('avaliacoes', rec);
          UI.toast('Avaliação salva.'); close(); MR3.refresh();
        };
      },
    });
  }

  /* ---------- Aba: Ficha de cadastro ---------- */
  function abaFicha(box, a) {
    const f = a.fichaId ? Store.getById('fichas', a.fichaId) : null;
    if (!f) {
      box.innerHTML = `<div class="card">${UI.empty({ icon: 'clipboard-list', title: 'Sem ficha de cadastro', text: 'Envie a ficha para o atleta ou responsável preencher no celular. Quando ela voltar pelo WhatsApp, importe e vincule a este atleta.',
        action: `<div class="row-wrap" style="justify-content:center"><button class="btn btn-gold" id="fa-env">${UI.icon('send')}Enviar ficha</button><button class="btn" id="fa-imp">${UI.icon('clipboard-paste')}Importar ficha</button></div>` })}</div>`;
      box.querySelector('#fa-env').onclick = () => MR3.Fichas.enviar(a);
      box.querySelector('#fa-imp').onclick = () => MR3.Fichas.importar();
      return;
    }
    box.innerHTML = `<div class="card card-pad"><div class="row mb-3" style="flex-wrap:wrap"><div class="grow"><b>Ficha preenchida em ${U.fmtDate(f.dados.enviadaEm)}</b><div class="muted small">${f.origem === 'presencial' ? 'Preenchida presencialmente' : 'Recebida pelo WhatsApp'}</div></div>
      <button class="btn btn-sm" id="fa-nova">${UI.icon('refresh-cw')}Pedir ficha atualizada</button></div><div class="ficha-view">${MR3.Ficha.viewHtml(f.dados)}</div></div>`;
    box.querySelector('#fa-nova').onclick = () => MR3.Fichas.enviar(a);
  }

  /* ---------- Aba: Materiais compartilhados ---------- */
  function abaMateriais(box, a) {
    const mats = U.sortBy(Store.query('materiais', (m) => (m.atletaIds || []).includes(a.id)), (m) => m.criadoEm, -1);
    box.innerHTML = `<div class="section-title"><h2>Materiais de ${esc(U.firstName(a.nome))}</h2><span class="spacer"></span><button class="btn btn-sm btn-gold" id="am-add">${UI.icon('plus')}Vincular material</button></div>
      ${mats.length ? `<div class="mat-grid" id="am-grid"></div>` : `<div class="card">${UI.empty({ icon: 'folder-open', title: 'Nenhum material vinculado', text: 'Vincule vídeos, PDFs e links da biblioteca de Materiais para este atleta.', compact: true })}</div>`}`;
    if (mats.length) MR3.Materiais.renderGrid(box.querySelector('#am-grid'), mats);
    box.querySelector('#am-add').onclick = () => MR3.Materiais.vincularAtleta(a.id);
  }

  /* ---------- Aba: Linha do tempo ---------- */
  function abaTimeline(box, a) {
    const ev = [];
    D.historico(a).forEach((h, i) => {
      if (h.status === 'ativo') ev.push({ d: h.data, ord: 0, icon: i === 0 ? 'user-plus' : 'user-check', cls: 'success', t: i === 0 ? 'Cadastro / início' : 'Reativado', s: h.observacao });
      else ev.push({ d: h.data, ord: 0, icon: 'user-x', cls: 'danger', t: `Desativado — ${D.MOTIVOS_SAIDA[h.motivo] || h.motivo}`, s: h.observacao });
    });
    D.pagamentos({ atletaId: a.id }).forEach((p) => ev.push({ d: p.data, ord: 1, icon: 'banknote', cls: 'gold', t: `Pagamento de ${U.fmtMoney(p.valor)}`, s: `${p.referencia} · ${D.FORMAS_PAGAMENTO[p.forma] || p.forma}${p.observacao ? ' · ' + p.observacao : ''}` }));
    Store.query('cobrancas', { atletaId: a.id }).forEach((c) => ev.push({ d: U.tsToDate(c.criadoEm) <= c.vencimento ? U.tsToDate(c.criadoEm) : c.vencimento, ord: 2, icon: 'receipt', cls: '', t: `Cobrança gerada: ${c.referencia}`, s: `${U.fmtMoney(D.valorLiquido(c))} · vence ${U.fmtDate(c.vencimento)}${c.status === 'cancelado' ? ' · cancelada' : ''}` }));
    D.sessoesDoAtleta(a.id).filter((s) => s.data <= U.today() && s.status !== 'agendada').forEach((s) => ev.push({
      d: s.data, ord: 3, icon: s.status === 'realizada' ? 'check' : s.status === 'falta' ? 'x' : 'calendar-x',
      cls: s.status === 'realizada' ? 'info' : s.status === 'falta' ? 'danger' : '',
      t: `Sessão ${D.STATUS_SESSAO[s.status].label.toLowerCase()} — ${s.tipo || 'Treino'} às ${s.horaInicio}`,
      s: [s.pse != null && s.pse !== '' ? `PSE ${s.pse}` : '', s.anotacoes, s.evolucao].filter(Boolean).join(' · '),
    }));
    Store.query('avaliacoes', { atletaId: a.id }).forEach((x) => ev.push({ d: x.data, ord: 1, icon: 'activity', cls: 'gold', t: 'Avaliação física', s: (x.testes || []).map((t) => `${t.nome}: ${String(t.valor).replace('.', ',')}${t.unidade}`).join(' · ') }));
    ev.sort((x, y) => (x.d === y.d ? x.ord - y.ord : x.d < y.d ? 1 : -1));
    const shown = ev.slice(0, tlLimite);
    box.innerHTML = `<div class="card card-pad">${ev.length ? `<ul class="timeline">${shown.map((e) => `<li class="tl-item"><span class="tl-dot ${e.cls}">${UI.icon(e.icon)}</span>
      <div class="tl-body"><div class="tl-date">${U.fmtDate(e.d)}</div><div class="strong">${esc(e.t)}</div>${e.s ? `<div class="muted small">${esc(e.s)}</div>` : ''}</div></li>`).join('')}</ul>
      ${ev.length > shown.length ? `<div class="center mt-3"><button class="btn btn-sm" id="tl-more">Mostrar mais (${ev.length - shown.length})</button></div>` : ''}` : UI.empty({ icon: 'history', title: 'Sem eventos', compact: true })}</div>`;
    const more = box.querySelector('#tl-more');
    if (more) more.onclick = () => { tlLimite += 100; abaTimeline(box, a); UI.refreshIcons(box); };
  }

  /* ===================================================================== */
  MR3.modules.atletas = {
    title: 'Atletas',
    render(el, params) {
      if (params[0]) { if (MR3._lastPerfil !== params[0]) tlLimite = 60; MR3._lastPerfil = params[0]; renderPerfil(el, params[0], params[1]); }
      else renderLista(el);
    },
  };
  MR3.Atletas = { openForm, openDesativar, openReativar, exportCSV };
})();
