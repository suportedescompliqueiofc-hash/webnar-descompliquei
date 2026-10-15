/* =========================================================================
   Módulo: Financeiro — cobranças (mensalidades, pacotes, avulsas),
   pagamentos totais/parciais, visão mensal e recibos.
   Rota: #/financeiro[/cobrancas|resumo]?m=AAAA-MM
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const { U, UI, Store, D } = MR3;
  const esc = U.esc;
  MR3.modules = MR3.modules || {};

  const filtros = { status: '', atleta: '', forma: '', tipo: '', periodo: 'mes' };

  function render(el, params, query) {
    const aba = ['cobrancas', 'resumo'].includes(params[0]) ? params[0] : 'cobrancas';
    const mes = /^\d{4}-\d{2}$/.test(query.m || '') ? query.m : U.monthKey(U.today());
    const link = (a, m = mes) => `#/financeiro/${a}?m=${m}`;
    el.innerHTML = `
      <div class="page-head">
        <div class="titles"><div class="eyebrow">Financeiro</div><h1>Financeiro</h1></div>
        <div class="actions">
          <div class="row">
            <a class="icon-btn sm" href="${link(aba, U.addMonthKey(mes, -1))}" aria-label="Mês anterior">${UI.icon('chevron-left')}</a>
            <span class="strong" style="min-width:130px;text-align:center;text-transform:capitalize">${U.monthLong(mes)}</span>
            <a class="icon-btn sm" href="${link(aba, U.addMonthKey(mes, 1))}" aria-label="Próximo mês">${UI.icon('chevron-right')}</a>
          </div>
          <div id="fin-actions" class="row-wrap"></div>
        </div>
      </div>
      <nav class="tabs" aria-label="Seções">${[['cobrancas', 'Cobranças'], ['resumo', 'Visão mensal']].map(([k, l]) => `<a href="${link(k)}" class="${k === aba ? 'active' : ''}" ${k === aba ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
      <div id="fin-body"></div>`;
    const body = el.querySelector('#fin-body');
    const actions = el.querySelector('#fin-actions');
    if (aba === 'cobrancas') renderCobrancas(body, actions, mes);
    else renderResumo(body, actions, mes);
  }

  /* =====================================================================
     COBRANÇAS
     ===================================================================== */
  function renderCobrancas(body, actions, mes) {
    actions.innerHTML = `
      <button class="btn" id="c-csv">${UI.icon('file-spreadsheet')}CSV pagamentos</button>
      <button class="btn" id="c-gerar">${UI.icon('calendar-check')}Gerar mensalidades de ${U.MESES_CURTOS[+mes.slice(5) - 1]}</button>
      <button class="btn btn-gold" id="c-nova">${UI.icon('plus')}Nova cobrança</button>`;
    actions.querySelector('#c-gerar').onclick = () => gerarMensalidades(mes);
    actions.querySelector('#c-nova').onclick = () => openCobranca({});
    actions.querySelector('#c-csv').onclick = exportPagamentosCSV;

    const r = D.resumoMes(mes);
    const atletas = U.sortBy(Store.getAll('atletas'), (a) => a.nome);
    body.innerHTML = `
      <div class="grid grid-kpi mb-3">
        ${UI.kpi({ label: 'Previsto no mês', value: U.fmtMoney(r.previsto), icon: 'target', sub: U.plural(r.qtdCobrancas, 'cobrança', 'cobranças') })}
        ${UI.kpi({ label: 'Recebido no mês', value: U.fmtMoney(r.recebido), icon: 'banknote', sub: U.plural(r.qtdPagamentos, 'pagamento', 'pagamentos') })}
        ${UI.kpi({ label: 'Pendente', value: U.fmtMoney(r.pendente), icon: 'clock' })}
        ${UI.kpi({ label: 'Atrasado', value: U.fmtMoney(r.atrasado), icon: 'alert-triangle', sub: U.plural(r.atletasAtraso, 'atleta', 'atletas') })}
      </div>
      <div class="card">
        <div class="toolbar">
          <label class="sr-only" for="c-per">Período</label><select id="c-per" class="input">${UI.options({ mes: 'Vencimento no mês', todos: 'Todos os períodos', aberto: 'Tudo em aberto' }, filtros.periodo)}</select>
          <label class="sr-only" for="c-st">Status</label><select id="c-st" class="input">${UI.options({ pendente: 'Pendente', atrasado: 'Atrasado', pago: 'Pago', cancelado: 'Cancelado' }, filtros.status, { empty: 'Todos os status' })}</select>
          <label class="sr-only" for="c-at">Atleta</label><select id="c-at" class="input">${UI.options(atletas.map((a) => ({ value: a.id, label: a.nome })), filtros.atleta, { empty: 'Todos os atletas' })}</select>
          <label class="sr-only" for="c-tp">Tipo</label><select id="c-tp" class="input">${UI.options({ mensalidade: 'Mensalidade', pacote: 'Pacote', avulso: 'Avulsa' }, filtros.tipo, { empty: 'Todos os tipos' })}</select>
          <label class="sr-only" for="c-fp">Forma de pagamento</label><select id="c-fp" class="input">${UI.options(D.FORMAS_PAGAMENTO, filtros.forma, { empty: 'Qualquer forma' })}</select>
        </div>
        <div id="c-table"></div>
      </div>`;
    const draw = () => {
      const ini = mes + '-01', fim = U.endOfMonth(ini);
      let rows = D.cobrancasComStatus().filter((c) =>
        (filtros.periodo !== 'mes' || (c.vencimento >= ini && c.vencimento <= fim)) &&
        (filtros.periodo !== 'aberto' || c._status === 'pendente' || c._status === 'atrasado') &&
        (!filtros.status || c._status === filtros.status) && (!filtros.atleta || c.atletaId === filtros.atleta) &&
        (!filtros.tipo || (c.tipo || (c.pacote ? 'pacote' : 'avulso')) === filtros.tipo) &&
        (!filtros.forma || (c.pagamentos || []).some((p) => p.forma === filtros.forma)));
      const ordem = { atrasado: 0, pendente: 1, pago: 2, cancelado: 3 };
      rows = rows.sort((a, b) => ordem[a._status] - ordem[b._status] || (a.vencimento < b.vencimento ? -1 : 1));
      renderTabela(body.querySelector('#c-table'), rows, { mostrarAtleta: true, vazio: Store.getAll('cobrancas').length ? null : 'inicial', mes });
    };
    draw();
    [['#c-per', 'periodo'], ['#c-st', 'status'], ['#c-at', 'atleta'], ['#c-tp', 'tipo'], ['#c-fp', 'forma']].forEach(([id, k]) => body.querySelector(id).addEventListener('change', (e) => { filtros[k] = e.target.value; draw(); }));
  }

  /** Tabela de cobranças reutilizada no perfil do atleta e no financeiro. */
  function renderTabela(box, rows, { mostrarAtleta = true, vazio = null, mes } = {}) {
    if (!rows.length) {
      box.innerHTML = vazio === 'inicial'
        ? UI.empty({ icon: 'receipt', title: 'Nenhuma cobrança ainda', text: 'Gere as mensalidades do mês para os atletas com plano mensal ou lance uma cobrança avulsa/pacote.', action: mes ? `<button class="btn btn-gold" data-gerar>${UI.icon('calendar-check')}Gerar mensalidades</button>` : '' })
        : UI.empty({ icon: 'receipt', title: 'Nenhuma cobrança encontrada', compact: true });
      UI.refreshIcons(box);
      const g = box.querySelector('[data-gerar]'); if (g) g.onclick = () => gerarMensalidades(mes);
      return;
    }
    box.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr>
      ${mostrarAtleta ? '<th>Atleta</th>' : ''}<th>Referência</th><th>Vencimento</th><th class="right">Valor</th><th class="right hide-mobile">Pago</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map((c) => {
        const a = Store.getById('atletas', c.atletaId);
        const aberto = c._status === 'pendente' || c._status === 'atrasado';
        return `<tr>
          ${mostrarAtleta ? `<td>${UI.personLink(a)}</td>` : ''}
          <td><a href="#" data-det="${esc(c.id)}">${esc(c.referencia)}</a>${c.desconto ? `<br><span class="muted tiny">desconto ${U.fmtMoney(c.desconto)}</span>` : ''}</td>
          <td class="num nowrap">${U.fmtDate(c.vencimento)}</td>
          <td class="right num strong">${U.fmtMoney(D.valorLiquido(c))}</td>
          <td class="right num hide-mobile">${c._pago ? U.fmtMoney(c._pago) : '—'}</td>
          <td>${UI.badgeCobranca(c)}</td>
          <td class="actions-cell">
            ${aberto ? `<button class="btn btn-sm btn-gold" data-pagar="${esc(c.id)}">${UI.icon('banknote')}<span class="hide-mobile">Pagar</span></button>` : ''}
            ${aberto && a && a.telefone ? `<button class="icon-btn sm" data-wa="${esc(c.id)}" aria-label="Cobrar no WhatsApp" title="Cobrar no WhatsApp">${UI.icon('message-circle')}</button>` : ''}
            ${c._pago ? `<button class="icon-btn sm" data-rec="${esc(c.id)}" aria-label="Recibo" title="Recibo">${UI.icon('printer')}</button>` : ''}
            <button class="icon-btn sm ghost" data-det="${esc(c.id)}" aria-label="Detalhes" title="Detalhes">${UI.icon('more-horizontal')}</button>
          </td></tr>`;
      }).join('')}</tbody></table></div>`;
    UI.refreshIcons(box);
    box.onclick = (e) => {
      const b = e.target.closest('[data-pagar],[data-wa],[data-rec],[data-det]');
      if (!b) return;
      e.preventDefault();
      if (b.dataset.pagar) pagar(b.dataset.pagar);
      else if (b.dataset.wa) cobrarWhatsApp(b.dataset.wa);
      else if (b.dataset.rec) recibo(b.dataset.rec);
      else if (b.dataset.det) detalhe(b.dataset.det);
    };
  }

  /* ---------- Gerar mensalidades ---------- */
  function gerarMensalidades(mes) {
    const cfg = Store.getConfig();
    const candidatos = Store.query('atletas', (a) => a.status === 'ativo' && (D.plano(a) || {}).tipo === 'mensal');
    const existentes = new Set(Store.query('cobrancas', (c) => c.tipo === 'mensalidade' && c.competencia === mes).map((c) => c.atletaId));
    const novos = candidatos.filter((a) => !existentes.has(a.id));
    if (!candidatos.length) { UI.toast('Nenhum atleta ativo com plano mensal.', 'warning'); return; }
    if (!novos.length) { UI.toast(`As mensalidades de ${U.monthLong(mes)} já foram geradas para todos.`, 'info'); return; }
    const venc = (a) => { const dia = U.clamp(Number(a.diaVencimento) || cfg.valoresPadrao.diaVencimento || 10, 1, U.daysInMonth(mes)); return `${mes}-${String(dia).padStart(2, '0')}`; };
    const total = U.sum(novos, D.valorPlano);
    UI.modal({
      title: `Gerar mensalidades — ${U.monthLong(mes)}`,
      body: `<p class="mb-3">Serão geradas <b>${novos.length}</b> cobranças, totalizando <b class="gold">${U.fmtMoney(total)}</b>.${existentes.size ? ` <span class="muted">(${existentes.size} já existiam e serão ignoradas.)</span>` : ''}</p>
        <div class="table-wrap" style="max-height:320px"><table class="table"><thead><tr><th>Atleta</th><th>Vencimento</th><th class="right">Valor</th></tr></thead><tbody>
        ${U.sortBy(novos, (a) => a.nome).map((a) => `<tr><td>${esc(a.nome)}</td><td class="num">${U.fmtDate(venc(a))}</td><td class="right num">${U.fmtMoney(D.valorPlano(a))}</td></tr>`).join('')}</tbody></table></div>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-gold" id="g-ok">${UI.icon('check')}Gerar ${novos.length} cobranças</button>`,
      onOpen(el, close) {
        el.querySelector('#g-ok').onclick = () => {
          Store.batch(() => novos.forEach((a) => Store.create('cobrancas', {
            atletaId: a.id, tipo: 'mensalidade', competencia: mes, referencia: `Mensalidade ${U.monthRef(mes)}`,
            valor: D.valorPlano(a), desconto: 0, vencimento: venc(a), status: 'pendente', pagamentos: [],
          })));
          UI.toast(`${novos.length} mensalidades geradas.`); close(); MR3.refresh();
        };
      },
    });
  }

  /** Cria a cobrança de um pacote (inicia o saldo de sessões). */
  function criarCobrancaPacote(atleta, plano, inicio = U.today(), extra = {}) {
    return Store.create('cobrancas', Object.assign({
      atletaId: atleta.id, tipo: 'pacote', referencia: `${plano.nome} (${plano.quantidadeSessoes} sessões)`,
      valor: atleta.planoId === plano.id && atleta.valorPersonalizado != null ? Number(atleta.valorPersonalizado) : Number(plano.valor),
      desconto: 0, vencimento: inicio, status: 'pendente', pagamentos: [],
      pacote: { planoId: plano.id, sessoes: Number(plano.quantidadeSessoes), validadeDias: Number(plano.validadeDias) || 0, inicio },
    }, extra));
  }

  /* ---------- Nova / editar cobrança ---------- */
  function openCobranca(preset = {}, editId) {
    const c = editId ? Store.getById('cobrancas', editId) : null;
    const atletas = U.sortBy(Store.query('atletas', (a) => a.status === 'ativo' || a.id === preset.atletaId || (c && a.id === c.atletaId)), (a) => a.nome);
    const pacotes = Store.query('planos', (p) => p.tipo === 'pacote' && p.ativo !== false);
    const tipo = c ? c.tipo || (c.pacote ? 'pacote' : 'avulso') : preset.tipo || 'avulso';
    const v = c || { atletaId: preset.atletaId || '', valor: '', desconto: 0, vencimento: U.today(), referencia: '' };
    const atletaPre = Store.getById('atletas', v.atletaId);
    const pacotePre = c && c.pacote ? c.pacote.planoId : (atletaPre && (D.plano(atletaPre) || {}).tipo === 'pacote' ? atletaPre.planoId : (pacotes[0] || {}).id);

    UI.modal({
      title: c ? 'Editar cobrança' : 'Nova cobrança',
      body: `<form id="cb-form" novalidate><div class="form-grid">
        <div class="field full"><label for="cb-at">Atleta <span class="req">*</span></label><select id="cb-at" class="input" name="atletaId" ${c ? 'disabled' : ''}>${UI.options(atletas.map((a) => ({ value: a.id, label: a.nome })), v.atletaId, { empty: 'Selecione…' })}</select></div>
        <div class="field"><label for="cb-tipo">Tipo</label><select id="cb-tipo" class="input" name="tipo" ${c ? 'disabled' : ''}>${UI.options({ avulso: 'Avulsa / outra', pacote: 'Pacote de sessões', mensalidade: 'Mensalidade' }, tipo)}</select></div>
        <div class="field" data-for="pacote"><label for="cb-pac">Pacote</label><select id="cb-pac" class="input" name="pacotePlano" ${c ? 'disabled' : ''}>${UI.options(pacotes.map((p) => ({ value: p.id, label: `${p.nome} — ${p.quantidadeSessoes} sessões` })), pacotePre, { empty: pacotes.length ? null : 'Nenhum plano de pacote cadastrado' })}</select></div>
        <div class="field" data-for="mensalidade"><label for="cb-comp">Competência (mês)</label><input id="cb-comp" type="month" class="input" name="competencia" value="${esc(c && c.competencia ? c.competencia : U.monthKey(U.today()))}" ${c ? 'disabled' : ''}></div>
        <div class="field full"><label for="cb-ref">Referência <span class="req">*</span></label><input id="cb-ref" class="input" name="referencia" value="${esc(v.referencia)}" placeholder="Ex.: Avaliação física, Pacote 10 sessões…"></div>
        <div class="field"><label for="cb-val">Valor <span class="req">*</span></label>${UI.moneyInput('valor', v.valor, 'id="cb-val"')}</div>
        <div class="field"><label for="cb-desc">Desconto</label>${UI.moneyInput('desconto', v.desconto || '', 'id="cb-desc"')}</div>
        <div class="field"><label for="cb-venc">Vencimento <span class="req">*</span></label><input id="cb-venc" type="date" class="input" name="vencimento" value="${esc(v.vencimento)}"></div>
        ${!c ? `<div class="field" style="justify-content:flex-end"><label class="check"><input type="checkbox" name="jaPago"> Já foi pago (registrar pagamento)</label></div>` : ''}
      </div></form>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-gold" id="cb-save">${UI.icon('check')}Salvar</button>`,
      onOpen(el, close) {
        const form = el.querySelector('#cb-form');
        const ref = form.referencia, val = form.valor;
        let refAuto = !v.referencia;
        ref.addEventListener('input', () => (refAuto = false));
        const sugerir = () => {
          const t = form.tipo.value;
          el.querySelectorAll('[data-for]').forEach((x) => (x.hidden = x.dataset.for !== t));
          if (c) return;
          const a = Store.getById('atletas', form.atletaId.value);
          if (t === 'pacote') {
            const p = Store.getById('planos', form.pacotePlano.value);
            if (p) { if (refAuto) ref.value = `${p.nome} (${p.quantidadeSessoes} sessões)`; val.value = U.fmtMoneyInput(a && a.planoId === p.id && a.valorPersonalizado != null ? a.valorPersonalizado : p.valor); }
          } else if (t === 'mensalidade') {
            if (refAuto) ref.value = `Mensalidade ${U.monthRef(form.competencia.value || U.monthKey(U.today()))}`;
            if (a) { val.value = U.fmtMoneyInput(D.valorPlano(a)); const dia = U.clamp(Number(a.diaVencimento) || 10, 1, U.daysInMonth(form.competencia.value)); form.vencimento.value = `${form.competencia.value}-${String(dia).padStart(2, '0')}`; }
          } else if (refAuto) ref.value = '';
        };
        form.addEventListener('change', (e) => { if (e.target.name !== 'valor' && e.target.name !== 'desconto' && e.target.name !== 'referencia' && e.target.name !== 'vencimento') sugerir(); });
        sugerir();
        el.querySelector('#cb-save').onclick = () => {
          const f = UI.formData(form);
          const errs = {};
          if (!c && !f.atletaId) errs.atletaId = 'Selecione o atleta.';
          if (!f.referencia) errs.referencia = 'Informe a referência.';
          if (!(f.valor > 0)) errs.valor = 'Informe o valor.';
          if (f.desconto && f.desconto >= f.valor) errs.desconto = 'Desconto maior que o valor.';
          if (!U.isISODate(f.vencimento)) errs.vencimento = 'Data inválida.';
          if (!c && f.tipo === 'pacote' && !f.pacotePlano) errs.pacotePlano = 'Cadastre um plano de pacote.';
          if (!UI.showErrors(form, errs)) return;
          if (c) {
            const novo = Store.update('cobrancas', c.id, { referencia: f.referencia, valor: f.valor, desconto: f.desconto || 0, vencimento: f.vencimento });
            Store.update('cobrancas', c.id, { status: c.status === 'cancelado' ? 'cancelado' : D.saldoDevedor(novo) <= 0.004 ? 'pago' : 'pendente' });
            UI.toast('Cobrança atualizada.'); close(); MR3.refresh(); return;
          }
          if (f.tipo === 'mensalidade' && Store.query('cobrancas', (x) => x.atletaId === f.atletaId && x.tipo === 'mensalidade' && x.competencia === f.competencia).length) {
            UI.showErrors(form, { competencia: 'Já existe mensalidade deste mês para o atleta.' }); return;
          }
          const a = Store.getById('atletas', f.atletaId);
          let rec;
          const base = { referencia: f.referencia, valor: f.valor, desconto: f.desconto || 0, vencimento: f.vencimento };
          if (f.tipo === 'pacote') rec = criarCobrancaPacote(a, Store.getById('planos', f.pacotePlano), f.vencimento, base);
          else rec = Store.create('cobrancas', Object.assign({ atletaId: a.id, tipo: f.tipo, status: 'pendente', pagamentos: [] }, base, f.tipo === 'mensalidade' ? { competencia: f.competencia } : {}));
          UI.toast('Cobrança criada.'); close();
          if (f.jaPago) pagar(rec.id); else MR3.refresh();
        };
      },
    });
  }

  /* ---------- Registrar pagamento ---------- */
  function pagar(id) {
    const c = Store.getById('cobrancas', id);
    const saldo = D.saldoDevedor(c);
    const a = Store.getById('atletas', c.atletaId);
    UI.modal({
      title: 'Registrar pagamento',
      body: `<p class="mb-3"><b>${esc(a ? a.nome : '')}</b> · ${esc(c.referencia)}<br><span class="muted">Valor ${U.fmtMoney(D.valorLiquido(c))} · já pago ${U.fmtMoney(D.totalPago(c))} · <b>saldo ${U.fmtMoney(saldo)}</b></span></p>
        <form id="pg-form" novalidate><div class="form-grid">
          <div class="field"><label for="pg-val">Valor recebido <span class="req">*</span></label>${UI.moneyInput('valor', saldo, 'id="pg-val"')}<span class="hint">Valor menor que o saldo = pagamento parcial.</span></div>
          <div class="field"><label for="pg-data">Data <span class="req">*</span></label><input id="pg-data" type="date" class="input" name="data" value="${U.today()}" max="${U.today()}"></div>
          <div class="field full"><span class="field-label">Forma de pagamento</span><div class="chips" role="radiogroup" aria-label="Forma de pagamento">${Object.entries(D.FORMAS_PAGAMENTO).map(([k, l], i) => `<label class="chip"><input type="radio" name="forma" value="${k}" ${i === 0 ? 'checked' : ''}>${l}</label>`).join('')}</div></div>
          <div class="field"><label for="pg-desc">Desconto concedido agora</label>${UI.moneyInput('desconto', '', 'id="pg-desc"')}</div>
          <div class="field"><label for="pg-obs">Observação</label><input id="pg-obs" class="input" name="observacao"></div>
          <div class="field full"><label class="check"><input type="checkbox" name="abrirRecibo"> Abrir recibo após salvar</label></div>
        </div></form>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-gold" id="pg-ok">${UI.icon('check')}Confirmar pagamento</button>`,
      onOpen(el, close) {
        el.querySelector('#pg-ok').onclick = async () => {
          const form = el.querySelector('#pg-form');
          const f = UI.formData(form);
          const errs = {};
          const desconto = f.desconto || 0;
          const saldoComDesc = U.round2(saldo - desconto);
          if (!(f.valor > 0) && !(desconto > 0)) errs.valor = 'Informe o valor.';
          if (!U.isISODate(f.data)) errs.data = 'Data inválida.';
          if (desconto > saldo) errs.desconto = 'Desconto maior que o saldo.';
          if (!UI.showErrors(form, errs)) return;
          if (f.valor > saldoComDesc + 0.004 && !(await UI.confirm({ title: 'Valor acima do saldo', message: `O valor informado (${U.fmtMoney(f.valor)}) é maior que o saldo (${U.fmtMoney(saldoComDesc)}). Registrar mesmo assim?`, confirmText: 'Registrar' }))) return;
          const pagamentos = (c.pagamentos || []).slice();
          if (f.valor > 0) pagamentos.push({ data: f.data, valor: f.valor, forma: f.forma || 'pix', observacao: f.observacao });
          const atualizado = Store.update('cobrancas', c.id, { pagamentos, desconto: U.round2((Number(c.desconto) || 0) + desconto) });
          const quitado = D.saldoDevedor(atualizado) <= 0.004;
          Store.update('cobrancas', c.id, { status: quitado ? 'pago' : 'pendente' });
          UI.toast(quitado ? 'Pagamento registrado. Cobrança quitada.' : `Pagamento parcial registrado. Restam ${U.fmtMoney(D.saldoDevedor(atualizado))}.`);
          close(); MR3.refresh();
          if (f.abrirRecibo && f.valor > 0) recibo(c.id, pagamentos.length - 1);
        };
      },
    });
  }

  /* ---------- Detalhe da cobrança ---------- */
  function detalhe(id) {
    const c = Object.assign({}, Store.getById('cobrancas', id));
    c._status = D.statusCobranca(c);
    const a = Store.getById('atletas', c.atletaId);
    UI.modal({
      title: 'Cobrança',
      body: `<div class="row mb-3" style="justify-content:space-between;flex-wrap:wrap"><div><div class="strong" style="font-size:16px">${esc(c.referencia)}</div><div class="muted">${a ? esc(a.nome) : 'Atleta removido'}</div></div>${UI.badgeCobranca(c)}</div>
        <dl class="dl mb-3">
          <dt>Valor</dt><dd class="num">${U.fmtMoney(c.valor)}${c.desconto ? ` − desconto ${U.fmtMoney(c.desconto)} = <b>${U.fmtMoney(D.valorLiquido(c))}</b>` : ''}</dd>
          <dt>Vencimento</dt><dd>${U.fmtDate(c.vencimento)}</dd>
          <dt>Pago</dt><dd class="num">${U.fmtMoney(D.totalPago(c))}</dd>
          <dt>Saldo</dt><dd class="num strong">${U.fmtMoney(D.saldoDevedor(c))}</dd>
          ${c.pacote ? `<dt>Pacote</dt><dd>${c.pacote.sessoes} sessões a partir de ${U.fmtDate(c.pacote.inicio)}${c.pacote.validadeDias ? ` · validade ${c.pacote.validadeDias} dias` : ''}</dd>` : ''}
        </dl>
        <div class="field-label mb-2">Pagamentos</div>
        ${(c.pagamentos || []).length ? `<ul class="list card">${c.pagamentos.map((p, i) => `<li class="list-item"><div class="grow"><b class="num">${U.fmtMoney(p.valor)}</b> · ${esc(D.FORMAS_PAGAMENTO[p.forma] || p.forma)}<br><span class="muted small">${U.fmtDate(p.data)}${p.observacao ? ' · ' + esc(p.observacao) : ''}</span></div>
          <button class="icon-btn sm" data-rec="${i}" aria-label="Recibo">${UI.icon('printer')}</button><button class="icon-btn sm ghost" data-rmp="${i}" aria-label="Estornar pagamento">${UI.icon('undo-2')}</button></li>`).join('')}</ul>` : '<p class="muted">Nenhum pagamento registrado.</p>'}`,
      footer: `<button class="btn btn-danger" id="cd-del">${UI.icon('trash-2')}Excluir</button>
        ${c.status !== 'cancelado' ? `<button class="btn" id="cd-cancel">${UI.icon('ban')}Cancelar cobrança</button>` : `<button class="btn" id="cd-reabrir">${UI.icon('rotate-ccw')}Reabrir</button>`}
        <span class="spacer"></span><button class="btn" id="cd-edit">${UI.icon('pencil')}Editar</button>
        ${c._status === 'pendente' || c._status === 'atrasado' ? `<button class="btn btn-gold" id="cd-pagar">${UI.icon('banknote')}Pagar</button>` : ''}`,
      onOpen(el, close) {
        const $ = (s) => el.querySelector(s);
        $('#cd-edit').onclick = () => { close(); openCobranca({}, id); };
        if ($('#cd-pagar')) $('#cd-pagar').onclick = () => { close(); pagar(id); };
        if ($('#cd-cancel')) $('#cd-cancel').onclick = async () => {
          close();
          if (await UI.confirm({ title: 'Cancelar cobrança', message: 'A cobrança deixa de contar como prevista e em atraso. Pagamentos já registrados continuam no histórico.' + (c.pacote ? '\n\nAs sessões deste pacote deixam de contar no saldo.' : ''), confirmText: 'Cancelar cobrança', danger: true })) { Store.update('cobrancas', id, { status: 'cancelado' }); UI.toast('Cobrança cancelada.'); MR3.refresh(); }
        };
        if ($('#cd-reabrir')) $('#cd-reabrir').onclick = () => { Store.update('cobrancas', id, { status: 'pendente' }); const n = Store.getById('cobrancas', id); if (D.saldoDevedor(n) <= 0.004) Store.update('cobrancas', id, { status: 'pago' }); close(); UI.toast('Cobrança reaberta.'); MR3.refresh(); };
        $('#cd-del').onclick = async () => { close(); if (await UI.confirm({ title: 'Excluir cobrança', message: 'Excluir esta cobrança e seus pagamentos? Isso altera os relatórios. Para manter o histórico, prefira cancelar.', danger: true, confirmText: 'Excluir' })) { Store.remove('cobrancas', id); UI.toast('Cobrança excluída.'); MR3.refresh(); } };
        el.querySelectorAll('[data-rec]').forEach((b) => (b.onclick = () => recibo(id, +b.dataset.rec)));
        el.querySelectorAll('[data-rmp]').forEach((b) => (b.onclick = async () => {
          const i = +b.dataset.rmp;
          close();
          if (!(await UI.confirm({ title: 'Estornar pagamento', message: `Remover o pagamento de ${U.fmtMoney(c.pagamentos[i].valor)} de ${U.fmtDate(c.pagamentos[i].data)}?`, danger: true, confirmText: 'Estornar' }))) return;
          const pags = c.pagamentos.filter((_, j) => j !== i);
          const n = Store.update('cobrancas', id, { pagamentos: pags });
          if (n.status !== 'cancelado') Store.update('cobrancas', id, { status: D.saldoDevedor(n) <= 0.004 ? 'pago' : 'pendente' });
          UI.toast('Pagamento estornado.'); MR3.refresh();
        }));
      },
    });
  }

  /* ---------- WhatsApp ---------- */
  function cobrarWhatsApp(id) {
    const c = Store.getById('cobrancas', id);
    const a = Store.getById('atletas', c.atletaId);
    const cfg = Store.getConfig();
    const atrasado = D.statusCobranca(c) === 'atrasado';
    const msg = U.fillTemplate(atrasado ? cfg.mensagens.atraso : cfg.mensagens.cobranca, {
      nome: U.firstName(a.nome), valor: U.fmtMoney(D.saldoDevedor(c)), vencimento: U.fmtDate(c.vencimento), referencia: c.referencia,
      pix: cfg.chavePix || '(chave Pix não configurada)', profissional: cfg.nomeProfissional, empresa: cfg.empresa,
    });
    const tel = a.telefone || (a.responsavel && a.responsavel.telefone);
    UI.whatsapp({ telefone: tel, nome: a.nome, titulo: atrasado ? 'Cobrança em atraso' : 'Lembrete de pagamento', mensagem: msg });
  }

  /* ---------- Recibo ---------- */
  function recibo(cobrancaId, idx) {
    const c = Store.getById('cobrancas', cobrancaId);
    const pags = c.pagamentos || [];
    if (!pags.length) { UI.toast('Esta cobrança não tem pagamentos.', 'warning'); return; }
    const p = pags[idx == null ? pags.length - 1 : idx];
    const a = Store.getById('atletas', c.atletaId) || { nome: 'Atleta' };
    const cfg = Store.getConfig();
    const numero = `${p.data.replace(/-/g, '')}-${c.id.slice(-4).toUpperCase()}${idx != null ? '-' + (idx + 1) : ''}`;
    const html = `<div class="receipt">
      <div class="r-head"><div><div class="r-logo">${esc(cfg.empresa.replace(/3$/, ''))}${/3$/.test(cfg.empresa) ? '<span>3</span>' : ''}</div><div style="color:#5B6785">${esc(cfg.nomeProfissional)}${cfg.documento ? ' · ' + esc(cfg.documento) : ''}</div>
        ${cfg.telefone || cfg.email ? `<div style="color:#5B6785;font-size:12px">${esc([cfg.telefone, cfg.email].filter(Boolean).join(' · '))}</div>` : ''}</div>
        <div style="text-align:right"><h2>Recibo</h2><div style="color:#5B6785;font-size:12px">Nº ${esc(numero)}</div><div class="r-value">${U.fmtMoney(p.valor)}</div></div></div>
      <p>Recebi de <b>${esc(a.nome)}</b>${a.responsavel && a.responsavel.nome && U.age(a.dataNascimento) < 18 ? ` (responsável: ${esc(a.responsavel.nome)})` : ''} a importância de <b>${U.fmtMoney(p.valor)}</b>, referente a <b>${esc(c.referencia)}</b>.</p>
      <table><tr><td>Data do pagamento</td><td style="text-align:right">${U.fmtDate(p.data)}</td></tr>
        <tr><td>Forma de pagamento</td><td style="text-align:right">${esc(D.FORMAS_PAGAMENTO[p.forma] || p.forma)}</td></tr>
        <tr><td>Valor da cobrança</td><td style="text-align:right">${U.fmtMoney(D.valorLiquido(c))}</td></tr>
        <tr><td>Saldo restante</td><td style="text-align:right">${U.fmtMoney(D.saldoDevedor(c))}</td></tr>
        ${p.observacao ? `<tr><td>Observação</td><td style="text-align:right">${esc(p.observacao)}</td></tr>` : ''}</table>
      <p style="margin-top:16px">${esc(cfg.cidade ? cfg.cidade + ', ' : '')}${U.fmtDate(U.today())}.</p>
      <div class="r-sign"><div>${esc(cfg.nomeProfissional)}</div></div></div>`;
    UI.modal({
      title: 'Recibo', size: 'lg', body: html,
      footer: `<button class="btn" data-close>Fechar</button><button class="btn btn-gold" id="rc-print">${UI.icon('printer')}Imprimir / salvar PDF</button>`,
      onOpen(el) { el.querySelector('#rc-print').onclick = () => UI.print(html); },
    });
  }

  function exportPagamentosCSV() {
    const rows = U.sortBy(D.pagamentos(), (p) => p.data);
    if (!rows.length) { UI.toast('Não há pagamentos para exportar.', 'warning'); return; }
    U.download(`mr3-pagamentos-${U.today()}.csv`, U.toCSV(rows, [
      { label: 'Data', value: (p) => U.fmtDate(p.data) }, { label: 'Atleta', value: (p) => D.nomeAtleta(p.atletaId) }, { label: 'Referência', value: (p) => p.referencia },
      { label: 'Forma', value: (p) => D.FORMAS_PAGAMENTO[p.forma] || p.forma }, { label: 'Valor', value: (p) => U.fmtMoneyInput(p.valor) }, { label: 'Observação', value: (p) => p.observacao },
    ]), 'text/csv;charset=utf-8');
    UI.toast('CSV de pagamentos exportado.');
  }

  /* =====================================================================
     VISÃO MENSAL
     ===================================================================== */
  function renderResumo(body, actions, mes) {
    const r = D.resumoMes(mes);
    const ant = D.resumoMes(U.addMonthKey(mes, -1));
    const varPct = (a, b) => (b ? `${a >= b ? '▲' : '▼'} ${U.fmtPct(Math.abs(a - b) / b)} vs. mês anterior` : '');
    const inad = D.inadimplenciaAtual();
    body.innerHTML = `
      <div class="grid grid-kpi mb-3">
        ${UI.kpi({ label: 'Previsto', value: U.fmtMoney(r.previsto), icon: 'target', sub: U.plural(r.qtdCobrancas, 'cobrança', 'cobranças') })}
        ${UI.kpi({ label: 'Recebido', value: U.fmtMoney(r.recebido), icon: 'banknote', sub: varPct(r.recebido, ant.recebido) })}
        ${UI.kpi({ label: 'Pendente', value: U.fmtMoney(r.pendente), icon: 'clock' })}
        ${UI.kpi({ label: 'Atrasado no mês', value: U.fmtMoney(r.atrasado), icon: 'alert-triangle', sub: U.plural(r.atletasAtraso, 'atleta', 'atletas') })}
        ${UI.kpi({ label: 'Ticket médio', value: U.fmtMoney(r.ticketMedio), icon: 'user-round', sub: 'recebido ÷ atletas pagantes' })}
        ${UI.kpi({ label: 'Taxa de recebimento', value: U.fmtPct(r.previsto ? Math.min(1, r.recebido / r.previsto) : null), icon: 'percent', sub: 'recebido ÷ previsto' })}
        ${UI.kpi({ label: 'Cobranças pagas', value: `${r.pagas}<span class="kpi-of"> / ${r.qtdCobrancas}</span>`, icon: 'check-check' })}
        ${UI.kpi({ label: 'Inadimplência total', value: U.fmtMoney(inad.valor), icon: 'shield-alert', sub: 'todas as cobranças vencidas' })}
      </div>
      <div class="grid grid-2">
        <div class="card"><div class="card-head"><h3>${UI.icon('pie-chart')}Recebido por forma de pagamento</h3></div><div class="card-body">${r.recebido ? '<div class="chart-box sm" id="ch-forma"></div>' : UI.empty({ icon: 'pie-chart', title: 'Sem recebimentos no mês', compact: true })}</div></div>
        <div class="card"><div class="card-head"><h3>${UI.icon('layers')}Recebido por tipo</h3></div><div class="card-body">${r.recebido ? '<div class="chart-box sm" id="ch-tipo"></div>' : UI.empty({ icon: 'layers', title: 'Sem recebimentos no mês', compact: true })}</div></div>
      </div>
      <div class="card mt-3"><div class="card-head"><h3>${UI.icon('table')}Recebido por forma</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Forma</th><th class="right">Valor</th><th class="right">%</th></tr></thead><tbody>
        ${Object.entries(D.FORMAS_PAGAMENTO).map(([k, l]) => `<tr><td>${l}</td><td class="right num">${U.fmtMoney(r.porForma[k])}</td><td class="right num">${U.fmtPct(r.recebido ? r.porForma[k] / r.recebido : null)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
    const c = UI.chartColors();
    if (r.recebido) {
      UI.chart(body.querySelector('#ch-forma'), { type: 'doughnut', data: { labels: Object.values(D.FORMAS_PAGAMENTO), datasets: [{ data: Object.keys(D.FORMAS_PAGAMENTO).map((k) => r.porForma[k]), backgroundColor: c.series, borderColor: c.surface, borderWidth: 2 }] }, options: { cutout: '62%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (x) => ` ${x.label}: ${U.fmtMoney(x.raw)}` } } } } });
      const tipos = Object.keys(D.TIPOS_COBRANCA);
      UI.chart(body.querySelector('#ch-tipo'), { type: 'bar', data: { labels: tipos.map((k) => D.TIPOS_COBRANCA[k]), datasets: [{ label: 'Recebido', data: tipos.map((k) => r.porTipo[k] || 0), backgroundColor: [c.gold, c.primary, c.muted], borderRadius: 8, maxBarThickness: 44 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => ' ' + U.fmtMoney(x.raw) } } }, scales: { x: { ticks: { callback: UI.moneyTick } } } } });
    }
  }

  MR3.modules.financeiro = { title: 'Financeiro', render };
  MR3.Fin = { renderTabela, openCobranca, criarCobrancaPacote, pagar, recibo, cobrarWhatsApp, gerarMensalidades, detalhe, exportPagamentosCSV };
})();
