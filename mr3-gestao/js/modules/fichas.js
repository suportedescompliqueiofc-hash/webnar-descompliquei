/* =========================================================================
   Módulo: Fichas de cadastro — enviar o link da ficha pelo WhatsApp,
   importar fichas recebidas (código MR3FICHA1), preencher presencialmente
   e transformar a ficha em cadastro de atleta.
   Rota: #/fichas
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const { U, UI, Store, Ficha } = MR3;
  const esc = U.esc;
  MR3.modules = MR3.modules || {};

  /** Link público da ficha, com os dados do profissional embutidos. */
  function linkFicha(nomeAtleta) {
    const cfg = Store.getConfig();
    let base = cfg.fichaUrl;
    if (!base && /^https?:/.test(location.protocol)) base = new URL('ficha.html', location.href).href.split('#')[0];
    if (!base) return '';
    const u = new URL(base, location.href);
    if (cfg.telefone) u.searchParams.set('w', U.phoneToWa(cfg.telefone));
    u.searchParams.set('n', cfg.nomeProfissional);
    u.searchParams.set('e', cfg.empresa);
    if (nomeAtleta) u.searchParams.set('a', nomeAtleta);
    return u.href;
  }

  /** Puxa fichas salvas pelo ficha.html neste navegador (preenchimento presencial). */
  function consumirFila() {
    let fila = [];
    try { fila = JSON.parse(localStorage.getItem('mr3:fichas-entrada') || '[]'); } catch (e) { return 0; }
    if (!fila.length) return 0;
    Store.batch(() => fila.forEach((d) => salvarFicha(d, 'presencial')));
    try { localStorage.removeItem('mr3:fichas-entrada'); } catch (e) { /* ignore */ }
    return fila.length;
  }

  function salvarFicha(d, origem) {
    const dup = Store.query('fichas', (f) => U.norm(f.dados.nome) === U.norm(d.nome) && f.dados.enviadaEm === d.enviadaEm && U.onlyDigits(f.dados.telefone) === U.onlyDigits(d.telefone));
    if (dup.length) return null;
    return Store.create('fichas', { dados: d, origem, status: 'pendente', atletaId: null, recebidaEm: U.today() });
  }

  /* ---------------- Tela ---------------- */
  function render(el) {
    const novas = consumirFila();
    if (novas) setTimeout(() => UI.toast(`${U.plural(novas, 'ficha nova recebida', 'fichas novas recebidas')}.`), 200);
    const fichas = U.sortBy(Store.getAll('fichas'), (f) => f.criadoEm, -1);
    const pend = fichas.filter((f) => f.status === 'pendente');
    const feitas = fichas.filter((f) => f.status !== 'pendente');

    el.innerHTML = `
      <div class="page-head">
        <div class="titles"><div class="eyebrow">Cadastro</div><h1>Fichas de cadastro</h1>
          <p class="subtitle">O atleta ou responsável preenche no celular e devolve pelo WhatsApp. Você importa com um colar.</p></div>
        <div class="actions">
          <button class="btn" id="fi-aqui">${UI.icon('clipboard-pen')}Preencher aqui</button>
          <button class="btn" id="fi-import">${UI.icon('clipboard-paste')}Importar ficha</button>
          <button class="btn btn-gold" id="fi-enviar">${UI.icon('send')}Enviar ficha</button>
        </div>
      </div>

      <ol class="steps card card-pad mb-3" aria-label="Como funciona">
        <li><span>1</span><div><b>Envie o link</b><p class="muted small">“Enviar ficha” abre o WhatsApp com a mensagem pronta.</p></div></li>
        <li><span>2</span><div><b>Atleta preenche</b><p class="muted small">No celular, em uns 5 minutos, e toca em “Enviar pelo WhatsApp”.</p></div></li>
        <li><span>3</span><div><b>Você importa</b><p class="muted small">Copie a mensagem recebida, toque em “Importar ficha” e cole.</p></div></li>
      </ol>

      <div class="section-title"><h2>Aguardando cadastro</h2>${pend.length ? UI.badge(String(pend.length), 'gold no-dot') : ''}</div>
      ${pend.length ? `<div class="grid grid-3 mb-4">${pend.map(cardFicha).join('')}</div>` : `<div class="card mb-4">${UI.empty({ icon: 'inbox', title: 'Nenhuma ficha aguardando', text: 'Fichas importadas aparecem aqui até virarem cadastro de atleta.', compact: true })}</div>`}
      ${feitas.length ? `<div class="section-title"><h2>Já cadastradas</h2></div><div class="card"><ul class="list">${feitas.map((f) => {
        const a = Store.getById('atletas', f.atletaId);
        return `<li class="list-item">${UI.avatar(a || { nome: f.dados.nome }, 'sm')}<div class="grow"><div class="title truncate">${a ? `<a href="#/atletas/${esc(a.id)}/ficha">${esc(a.nome)}</a>` : esc(f.dados.nome)}</div><div class="muted small">Recebida em ${U.fmtDate(f.recebidaEm)}${f.status === 'descartada' ? ' · descartada' : ''}</div></div>
          <button class="btn btn-sm btn-ghost" data-ver="${esc(f.id)}">${UI.icon('eye')}<span class="hide-mobile">Ver</span></button></li>`;
      }).join('')}</ul></div>` : ''}`;

    el.querySelector('#fi-enviar').onclick = () => enviar();
    el.querySelector('#fi-import').onclick = importar;
    el.querySelector('#fi-aqui').onclick = preencherAqui;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ver],[data-criar],[data-vincular],[data-descartar]');
      if (!b) return;
      if (b.dataset.ver) ver(b.dataset.ver);
      else if (b.dataset.criar) criarAtleta(b.dataset.criar);
      else if (b.dataset.vincular) vincular(b.dataset.vincular);
      else if (b.dataset.descartar) descartar(b.dataset.descartar);
    });
  }

  function cardFicha(f) {
    const d = f.dados;
    const idade = d.dataNascimento ? U.age(d.dataNascimento) : null;
    const alerta = (d.condicoes || []).filter((c) => c !== 'Nenhuma').length || d.lesoes || d.dores;
    return `<article class="card ficha-card">
      <div class="row">${UI.avatar({ nome: d.nome })}<div class="grow" style="min-width:0"><h3 class="truncate">${esc(d.nome)}</h3><p class="muted small">${[idade != null ? `${idade} anos` : '', d.modalidade, d.posicao].filter(Boolean).map(esc).join(' · ')}</p></div></div>
      <div class="row-wrap mt-2">${idade != null && idade < 18 ? UI.badge('Menor · ' + (d.respNome ? esc(U.firstName(d.respNome)) : 'sem responsável'), 'info no-dot') : ''}${alerta ? UI.badge('Atenção à saúde', 'warning') : ''}${UI.badge(f.origem === 'presencial' ? 'Presencial' : 'WhatsApp', 'no-dot')}</div>
      ${d.objetivo ? `<p class="small mt-2 clamp-2">${esc(d.objetivo)}</p>` : ''}
      <div class="row mt-3"><button class="btn btn-sm btn-gold" data-criar="${esc(f.id)}">${UI.icon('user-plus')}Criar atleta</button><button class="btn btn-sm" data-ver="${esc(f.id)}">Ver</button><span class="spacer"></span>
        <button class="icon-btn sm ghost" data-vincular="${esc(f.id)}" aria-label="Vincular a atleta existente" title="Vincular a atleta existente">${UI.icon('link')}</button>
        <button class="icon-btn sm ghost" data-descartar="${esc(f.id)}" aria-label="Descartar ficha" title="Descartar">${UI.icon('trash-2')}</button></div>
    </article>`;
  }

  /* ---------------- Ações ---------------- */
  function enviar(atleta) {
    const cfg = Store.getConfig();
    const link = linkFicha(atleta && atleta.nome);
    if (!link) {
      UI.modal({
        title: 'Falta o link público da ficha', size: 'sm',
        body: `<p>Para enviar a ficha, ela precisa estar num endereço da internet (ex.: Netlify, Vercel ou GitHub Pages).</p>
          <p class="muted mt-2">Publique a pasta do sistema e informe o endereço do <b>ficha.html</b> em Configurações → Ficha de cadastro.</p>
          <p class="muted mt-2">Enquanto isso, use <b>Preencher aqui</b> para preencher junto com o atleta.</p>`,
        footer: `<button class="btn" data-close>Fechar</button><a class="btn btn-gold" href="#/config" data-close>Ir para Configurações</a>`,
      });
      return;
    }
    const msg = U.fillTemplate(cfg.mensagens.ficha, { link, profissional: cfg.nomeProfissional, empresa: cfg.empresa, nome: atleta ? U.firstName(atleta.nome) : '' });
    UI.whatsapp({ telefone: atleta ? atleta.telefone || (atleta.responsavel && atleta.responsavel.telefone) : '', titulo: 'Enviar ficha de cadastro', mensagem: msg, nome: atleta ? atleta.nome : '', permitirSemNumero: true });
  }

  /** Preenchimento presencial: a ficha abre dentro do sistema (não depende do ficha.html). */
  function preencherAqui() {
    UI.modal({
      title: 'Ficha de cadastro', size: 'lg',
      body: `<p class="muted mb-3">Preencha junto com o atleta ou responsável. Campos com <span class="req">*</span> são obrigatórios.</p><form id="fp-form" class="ficha-inline" novalidate>${Ficha.formHtml({}, 'fp-')}</form>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-gold" id="fp-ok">${UI.icon('check')}Salvar ficha</button>`,
      onOpen(el, close) {
        const form = el.querySelector('#fp-form');
        Ficha.bind(form);
        el.querySelector('#fp-ok').onclick = () => {
          const d = Ficha.read(form);
          if (!Ficha.showErrors(form, Ficha.validate(d))) { UI.toast('Confira os campos destacados.', 'error'); return; }
          const rec = salvarFicha(Object.assign({ v: 1, enviadaEm: U.today() }, d), 'presencial');
          close();
          if (!rec) { UI.toast('Esta ficha já estava salva.', 'info'); return; }
          UI.toast(`Ficha de ${U.firstName(d.nome)} salva. Agora é só criar o atleta.`);
          if (location.hash.startsWith('#/fichas')) MR3.refresh(); else location.hash = '#/fichas';
        };
      },
    });
  }

  function importar() {
    UI.modal({
      title: 'Importar ficha',
      body: `<p class="muted mb-3">No WhatsApp, toque e segure a mensagem da ficha → <b>Copiar</b>. Depois cole abaixo (só o código também funciona).</p>
        <div class="field"><label for="fi-txt">Mensagem da ficha</label><textarea id="fi-txt" class="input" rows="8" placeholder="*FICHA DE CADASTRO — ATLETA* … MR3FICHA1:…"></textarea></div>
        <div id="fi-prev" class="mt-3"></div>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-gold" id="fi-ok" disabled>${UI.icon('download')}Importar</button>`,
      onOpen(el, close) {
        const txt = el.querySelector('#fi-txt'), ok = el.querySelector('#fi-ok'), prev = el.querySelector('#fi-prev');
        let dados = null;
        const check = () => {
          dados = Ficha.decode(txt.value);
          ok.disabled = !dados;
          prev.innerHTML = !txt.value.trim() ? '' : dados
            ? `<div class="alert info">${UI.icon('check-circle-2')}<div>Ficha de <b>${esc(dados.nome)}</b>${dados.dataNascimento ? ` (${U.age(dados.dataNascimento)} anos)` : ''} · ${esc(dados.modalidade || '')} · enviada em ${U.fmtDate(dados.enviadaEm)}</div></div>`
            : `<div class="alert danger">${UI.icon('alert-octagon')}<div>Não encontrei o código da ficha. Confira se copiou a mensagem inteira, incluindo a linha que começa com MR3FICHA1.</div></div>`;
          UI.refreshIcons(prev);
        };
        txt.addEventListener('input', check);
        txt.addEventListener('paste', () => setTimeout(check, 0));
        ok.onclick = () => {
          const rec = salvarFicha(dados, 'whatsapp');
          close();
          if (!rec) { UI.toast('Esta ficha já tinha sido importada.', 'info'); return; }
          UI.toast(`Ficha de ${U.firstName(dados.nome)} importada.`);
          if (location.hash.startsWith('#/fichas')) MR3.refresh(); else location.hash = '#/fichas';
        };
      },
    });
  }

  function ver(id) {
    const f = Store.getById('fichas', id);
    const pend = f.status === 'pendente';
    UI.modal({
      title: `Ficha — ${f.dados.nome}`, size: 'lg',
      body: `<p class="muted small mb-3">Recebida em ${U.fmtDate(f.recebidaEm)} · enviada em ${U.fmtDate(f.dados.enviadaEm)}</p><div class="ficha-view">${Ficha.viewHtml(f.dados)}</div>`,
      footer: pend ? `<button class="btn" data-close>Fechar</button><button class="btn" id="fv-vinc">${UI.icon('link')}Vincular a existente</button><button class="btn btn-gold" id="fv-criar">${UI.icon('user-plus')}Criar atleta</button>` : '<button class="btn btn-gold" data-close>Fechar</button>',
      onOpen(el, close) {
        if (!pend) return;
        el.querySelector('#fv-criar').onclick = () => { close(); criarAtleta(id); };
        el.querySelector('#fv-vinc').onclick = () => { close(); vincular(id); };
      },
    });
  }

  function criarAtleta(id) {
    const f = Store.getById('fichas', id);
    MR3.Atletas.openForm(null, (atleta) => {
      Store.update('fichas', id, { status: 'importada', atletaId: atleta.id });
      Store.update('atletas', atleta.id, { fichaId: id });
      location.hash = `#/atletas/${atleta.id}/ficha`;
    }, Ficha.toAtleta(f.dados));
  }

  function vincular(id) {
    const f = Store.getById('fichas', id);
    const atletas = U.sortBy(Store.getAll('atletas'), (a) => a.nome);
    const sugestao = atletas.find((a) => U.norm(a.nome) === U.norm(f.dados.nome));
    UI.modal({
      title: 'Vincular ficha a um atleta', size: 'sm',
      body: `<div class="stack"><div class="field"><label for="fv-at">Atleta</label><select id="fv-at" class="input">${UI.options(atletas.map((a) => ({ value: a.id, label: a.nome })), sugestao && sugestao.id, { empty: 'Selecione…' })}</select></div>
        <label class="check"><input type="checkbox" id="fv-comp" checked> Preencher campos vazios do cadastro com os dados da ficha</label></div>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-gold" id="fv-ok">${UI.icon('link')}Vincular</button>`,
      onOpen(el, close) {
        el.querySelector('#fv-ok').onclick = () => {
          const aid = el.querySelector('#fv-at').value;
          if (!aid) { UI.toast('Selecione o atleta.', 'error'); return; }
          const a = Store.getById('atletas', aid);
          const patch = { fichaId: id };
          if (el.querySelector('#fv-comp').checked) {
            const novo = Ficha.toAtleta(f.dados);
            Object.keys(novo).forEach((k) => { if (k !== 'nome' && (a[k] == null || a[k] === '') && novo[k]) patch[k] = novo[k]; });
          }
          Store.batch(() => { Store.update('atletas', aid, patch); Store.update('fichas', id, { status: 'importada', atletaId: aid }); });
          UI.toast(`Ficha vinculada a ${U.firstName(a.nome)}.`);
          close(); location.hash = `#/atletas/${aid}/ficha`;
        };
      },
    });
  }

  async function descartar(id) {
    if (!(await UI.confirm({ title: 'Descartar ficha', message: 'A ficha sai da lista de pendentes. Deseja continuar?', confirmText: 'Descartar', danger: true }))) return;
    Store.remove('fichas', id);
    UI.toast('Ficha descartada.');
    MR3.refresh();
  }

  MR3.modules.fichas = { title: 'Fichas', render };
  MR3.Fichas = { enviar, importar, ver, consumirFila, linkFicha, preencherAqui };
})();
