/* =========================================================================
   Módulo: Materiais — biblioteca de PDFs, vídeos, imagens e links (YouTube)
   para apresentar aos atletas. Arquivos ficam no IndexedDB (MR3.Files);
   o Store guarda os metadados. Visualizador com modo apresentação,
   compartilhamento (WhatsApp / compartilhar do celular) e vínculo a atletas.
   Rota: #/materiais
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const { U, UI, Store, D } = MR3;
  const esc = U.esc;
  MR3.modules = MR3.modules || {};

  const TIPOS = {
    video: { label: 'Vídeo', icon: 'play', plural: 'Vídeos' },
    youtube: { label: 'YouTube', icon: 'youtube', plural: 'YouTube' },
    pdf: { label: 'PDF', icon: 'file-text', plural: 'PDFs' },
    imagem: { label: 'Imagem', icon: 'image', plural: 'Imagens' },
    audio: { label: 'Áudio', icon: 'audio-lines', plural: 'Áudios' },
    link: { label: 'Link', icon: 'link', plural: 'Links' },
    arquivo: { label: 'Arquivo', icon: 'file', plural: 'Arquivos' },
  };
  const FILTROS = [['', 'Todos'], ['videos', 'Vídeos'], ['pdf', 'PDFs'], ['imagem', 'Imagens'], ['link', 'Links']];
  const filtros = { tipo: '', categoria: '', q: '' };

  function tipoDoArquivo(file) {
    const t = file.type || '';
    if (t === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
    if (t.startsWith('video/')) return 'video';
    if (t.startsWith('image/')) return 'imagem';
    if (t.startsWith('audio/')) return 'audio';
    return 'arquivo';
  }
  function youtubeId(url) {
    const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  function fmtBytes(n) {
    if (!n) return '';
    if (n < 1024 * 1024) return `${U.fmtNum(n / 1024, 0)} KB`;
    if (n < 1024 * 1024 * 1024) return `${U.fmtNum(n / 1024 / 1024, 1)} MB`;
    return `${U.fmtNum(n / 1024 / 1024 / 1024, 1)} GB`;
  }
  const casaFiltro = (m) => !filtros.tipo || (filtros.tipo === 'videos' ? m.tipo === 'video' || m.tipo === 'youtube' : filtros.tipo === 'link' ? m.tipo === 'link' || m.tipo === 'youtube' : m.tipo === filtros.tipo);

  /* =====================================================================
     TELA
     ===================================================================== */
  function render(el) {
    const todos = Store.getAll('materiais');
    el.innerHTML = `
      <div class="page-head">
        <div class="titles"><div class="eyebrow">Biblioteca</div><h1>Materiais</h1>
          <p class="subtitle">Vídeos, PDFs e links para apresentar aos atletas no treino ou mandar pelo WhatsApp.</p></div>
        <div class="actions"><button class="btn btn-gold" id="mt-add">${UI.icon('upload')}Adicionar material</button></div>
      </div>
      ${todos.length ? `
      <div class="card mb-3">
        <div class="toolbar">
          <div class="search input-group"><span class="prefix">${UI.icon('search')}</span><label class="sr-only" for="mt-q">Buscar</label><input id="mt-q" class="input" placeholder="Buscar material…" value="${esc(filtros.q)}"></div>
          <div class="chips" role="group" aria-label="Tipo">${FILTROS.map(([k, l]) => `<button type="button" class="chip${filtros.tipo === k ? ' active' : ''}" data-tipo="${k}" aria-pressed="${filtros.tipo === k}">${l}</button>`).join('')}</div>
          <label class="sr-only" for="mt-cat">Categoria</label><select id="mt-cat" class="input">${UI.options(D.CATEGORIAS_MATERIAL, filtros.categoria, { empty: 'Todas as categorias' })}</select>
        </div>
      </div>
      <div class="mat-grid" id="mt-grid"></div>
      <p class="muted tiny mt-3" id="mt-uso"></p>` : `<div class="card">${UI.empty({ icon: 'folder-open', title: 'Sua biblioteca está vazia', text: 'Adicione vídeos de exercícios, PDFs de planos de treino, imagens e links do YouTube. Depois é só abrir no celular e mostrar para o atleta.', action: `<button class="btn btn-gold" id="mt-add2">${UI.icon('upload')}Adicionar o primeiro material</button>` })}</div>`}`;

    el.querySelector('#mt-add').onclick = () => openForm();
    const add2 = el.querySelector('#mt-add2'); if (add2) add2.onclick = () => openForm();
    if (!todos.length) return;

    const draw = () => {
      const q = U.norm(filtros.q);
      const rows = U.sortBy(todos.filter((m) => casaFiltro(m) && (!filtros.categoria || m.categoria === filtros.categoria) && (!q || U.norm([m.titulo, m.descricao, D.CATEGORIAS_MATERIAL[m.categoria]].join(' ')).includes(q))), (m) => (m.destaque ? '0' : '1') + m.criadoEm, 1);
      rows.sort((a, b) => (a.destaque === b.destaque ? (a.criadoEm < b.criadoEm ? 1 : -1) : a.destaque ? -1 : 1));
      const g = el.querySelector('#mt-grid');
      if (rows.length) renderGrid(g, rows);
      else { g.innerHTML = `<div class="card" style="grid-column:1/-1">${UI.empty({ icon: 'search-x', title: 'Nada encontrado', compact: true })}</div>`; UI.refreshIcons(g); }
    };
    draw();
    el.querySelector('#mt-q').addEventListener('input', U.debounce((e) => { filtros.q = e.target.value; draw(); }, 150));
    el.querySelector('#mt-cat').addEventListener('change', (e) => { filtros.categoria = e.target.value; draw(); });
    el.querySelectorAll('[data-tipo]').forEach((b) => b.addEventListener('click', () => {
      filtros.tipo = b.dataset.tipo;
      el.querySelectorAll('[data-tipo]').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b); });
      draw();
    }));
    const arquivos = todos.filter((m) => m.arquivoId);
    MR3.Files.uso().then((u) => {
      const tot = U.sum(arquivos, (m) => m.tamanho);
      const box = el.querySelector('#mt-uso');
      if (box) box.textContent = `${U.plural(todos.length, 'material', 'materiais')} · arquivos ocupam ${fmtBytes(tot) || '0 KB'} neste aparelho${u && u.cota ? ` (espaço livre aprox. ${fmtBytes(Math.max(0, u.cota - u.usado))})` : ''}. Arquivos não entram no backup JSON: guarde os originais.`;
    });
  }

  /** Grade de cards (reutilizada no perfil do atleta). */
  function renderGrid(container, mats) {
    container.innerHTML = mats.map((m) => {
      const t = TIPOS[m.tipo] || TIPOS.arquivo;
      const yt = m.tipo === 'youtube' ? youtubeId(m.url) : null;
      return `<article class="mat-card" data-id="${esc(m.id)}">
        <button type="button" class="mat-thumb t-${m.tipo}" data-abrir="${esc(m.id)}" aria-label="Abrir ${esc(m.titulo)}">
          ${yt ? `<img src="https://i.ytimg.com/vi/${yt}/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()">` : ''}
          ${m.arquivoId && (m.tipo === 'imagem' || m.tipo === 'video') ? `<span class="mat-media" data-file="${esc(m.arquivoId)}" data-kind="${m.tipo}"></span>` : ''}
          <span class="mat-type-icon">${UI.icon(t.icon)}</span>
          ${m.tipo === 'video' || m.tipo === 'youtube' ? `<span class="mat-play">${UI.icon('play')}</span>` : ''}
          <span class="mat-kind">${t.label}</span>
          ${m.destaque ? `<span class="mat-star" title="Destaque">${UI.icon('star')}</span>` : ''}
        </button>
        <div class="mat-body">
          <h3 class="clamp-2">${esc(m.titulo)}</h3>
          <p class="muted tiny">${esc(D.CATEGORIAS_MATERIAL[m.categoria] || 'Outros')}${m.tamanho ? ' · ' + fmtBytes(m.tamanho) : ''}${(m.atletaIds || []).length ? ` · ${U.plural(m.atletaIds.length, 'atleta', 'atletas')}` : ''}</p>
        </div>
        <div class="mat-actions">
          <button class="btn btn-sm btn-ghost" data-abrir="${esc(m.id)}">${UI.icon('maximize-2')}Abrir</button>
          <button class="btn btn-sm btn-ghost" data-share="${esc(m.id)}">${UI.icon('share-2')}Enviar</button>
          <button class="icon-btn sm ghost" data-menu="${esc(m.id)}" aria-label="Editar ${esc(m.titulo)}" title="Editar">${UI.icon('pencil')}</button>
        </div>
      </article>`;
    }).join('');
    UI.refreshIcons(container);
    // Miniaturas de arquivos locais
    container.querySelectorAll('.mat-media[data-file]').forEach(async (sp) => {
      const url = await MR3.Files.url(sp.dataset.file).catch(() => null);
      if (!url) return;
      sp.innerHTML = sp.dataset.kind === 'imagem' ? `<img src="${url}" alt="">` : `<video src="${url}#t=0.5" muted playsinline preload="metadata"></video>`;
      sp.closest('.mat-thumb').classList.add('has-media');
    });
    container.onclick = (e) => {
      const b = e.target.closest('[data-abrir],[data-share],[data-menu]');
      if (!b) return;
      if (b.dataset.abrir) abrir(b.dataset.abrir);
      else if (b.dataset.share) compartilhar(b.dataset.share);
      else if (b.dataset.menu) openForm(b.dataset.menu);
    };
  }

  /* =====================================================================
     ADICIONAR / EDITAR
     ===================================================================== */
  function atletasChecklist(sel) {
    const ativos = U.sortBy(Store.query('atletas', (a) => a.status === 'ativo' || sel.includes(a.id)), (a) => a.nome);
    if (!ativos.length) return '<p class="muted small">Nenhum atleta cadastrado.</p>';
    return `<div class="check-list">${ativos.map((a) => `<label class="check"><input type="checkbox" name="atletaIds" value="${esc(a.id)}" ${sel.includes(a.id) ? 'checked' : ''}> ${esc(a.nome)}</label>`).join('')}</div>`;
  }

  function openForm(id, preset = {}) {
    const m = id ? Store.getById('materiais', id) : null;
    const v = m || Object.assign({ categoria: 'treino', atletaIds: [], modo: 'arquivo' }, preset);
    let arquivo = null;
    let modo = m ? (m.arquivoId ? 'arquivo' : 'link') : v.modo;
    UI.modal({
      title: m ? 'Editar material' : 'Adicionar material', size: 'lg',
      body: `<form id="mt-form" novalidate class="stack">
        ${!m ? `<div class="segmented" role="group" aria-label="Origem"><button type="button" data-modo="arquivo" class="${modo === 'arquivo' ? 'active' : ''}">${UI.icon('upload')} Arquivo do aparelho</button><button type="button" data-modo="link" class="${modo === 'link' ? 'active' : ''}">${UI.icon('link')} Link / YouTube</button></div>` : ''}
        <div id="mt-arq" ${modo === 'arquivo' ? '' : 'hidden'}>
          ${m ? `<p class="muted small">Arquivo: <b>${esc(m.nomeArquivo || '')}</b> ${m.tamanho ? '(' + fmtBytes(m.tamanho) + ')' : ''}</p>` : `
          <label class="dropzone" for="mt-file" id="mt-drop">${UI.icon('upload-cloud')}<b>Toque para escolher</b><span class="muted small">ou arraste aqui · PDF, vídeo, imagem ou áudio</span><span class="small strong" id="mt-fname"></span></label>
          <input type="file" id="mt-file" class="sr-only" accept="application/pdf,video/*,image/*,audio/*">`}
        </div>
        <div class="field" id="mt-lnk" ${modo === 'link' ? '' : 'hidden'}><label for="mt-url">Endereço (YouTube, Google Drive, Instagram…)</label><input id="mt-url" class="input" name="url" type="url" inputmode="url" placeholder="https://" value="${esc(v.url)}"></div>
        <div class="form-grid">
          <div class="field full"><label for="mt-tit">Título <span class="req">*</span></label><input id="mt-tit" class="input" name="titulo" value="${esc(v.titulo)}" placeholder="Ex.: Aquecimento dinâmico pré-jogo"></div>
          <div class="field"><label for="mt-catf">Categoria</label><select id="mt-catf" class="input" name="categoria">${UI.options(D.CATEGORIAS_MATERIAL, v.categoria)}</select></div>
          <div class="field" style="justify-content:flex-end"><label class="check"><input type="checkbox" name="destaque" ${v.destaque ? 'checked' : ''}> Mostrar em destaque</label></div>
          <div class="field full"><label for="mt-desc">Descrição / instruções</label><textarea id="mt-desc" class="input" name="descricao" rows="2" placeholder="Séries, repetições, pontos de atenção…">${esc(v.descricao)}</textarea></div>
        </div>
        <fieldset><legend>Vincular aos atletas (opcional)</legend>${atletasChecklist(v.atletaIds || [])}</fieldset>
      </form>`,
      footer: `${m ? `<button class="btn btn-danger" id="mt-del">${UI.icon('trash-2')}Excluir</button><span class="spacer"></span>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-gold" id="mt-save">${UI.icon('check')}Salvar</button>`,
      onOpen(el, close) {
        const form = el.querySelector('#mt-form');
        el.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => {
          modo = b.dataset.modo;
          el.querySelectorAll('[data-modo]').forEach((x) => x.classList.toggle('active', x === b));
          el.querySelector('#mt-arq').hidden = modo !== 'arquivo';
          el.querySelector('#mt-lnk').hidden = modo !== 'link';
        }));
        const fileIn = el.querySelector('#mt-file');
        const setFile = (f) => {
          if (!f) return;
          arquivo = f;
          el.querySelector('#mt-fname').textContent = `${f.name} · ${fmtBytes(f.size)}`;
          if (!form.titulo.value) form.titulo.value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
          if (f.size > 300 * 1024 * 1024) UI.toast('Arquivo grande (mais de 300 MB). Pode não caber no aparelho; prefira um link do YouTube ou Drive.', 'warning', 6000);
        };
        if (fileIn) {
          fileIn.addEventListener('change', () => setFile(fileIn.files[0]));
          const drop = el.querySelector('#mt-drop');
          drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
          drop.addEventListener('dragleave', () => drop.classList.remove('over'));
          drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); setFile(e.dataTransfer.files[0]); });
        }
        const urlIn = el.querySelector('#mt-url');
        urlIn.addEventListener('change', () => { if (!form.titulo.value && youtubeId(urlIn.value)) form.titulo.value = 'Vídeo do YouTube'; });

        el.querySelector('#mt-save').onclick = async () => {
          const f = UI.formData(form);
          const errs = {};
          if (!f.titulo) errs.titulo = 'Informe um título.';
          if (!m && modo === 'link' && !/^https?:\/\/\S+\.\S+/.test(f.url)) errs.url = 'Cole um endereço que comece com https://';
          if (m && !m.arquivoId && !/^https?:\/\/\S+\.\S+/.test(f.url)) errs.url = 'Endereço inválido.';
          if (!UI.showErrors(form, errs)) return;
          if (!m && modo === 'arquivo' && !arquivo) { UI.toast('Escolha um arquivo.', 'error'); return; }
          const rec = { titulo: f.titulo, categoria: f.categoria, descricao: f.descricao, destaque: !!f.destaque, atletaIds: [...form.querySelectorAll('[name=atletaIds]:checked')].map((x) => x.value) };
          if (modo === 'link' || (m && !m.arquivoId)) { rec.url = f.url; rec.tipo = youtubeId(f.url) ? 'youtube' : 'link'; }
          const btn = el.querySelector('#mt-save');
          try {
            if (!m && modo === 'arquivo') {
              btn.disabled = true; btn.textContent = 'Salvando…';
              rec.arquivoId = await MR3.Files.put(arquivo);
              Object.assign(rec, { tipo: tipoDoArquivo(arquivo), nomeArquivo: arquivo.name, mime: arquivo.type, tamanho: arquivo.size });
            }
            if (m) Store.update('materiais', m.id, rec); else Store.create('materiais', rec);
            UI.toast(m ? 'Material atualizado.' : 'Material adicionado.');
            close(); MR3.refresh();
          } catch (err) {
            btn.disabled = false; btn.innerHTML = 'Salvar';
            UI.toast('Não foi possível guardar o arquivo neste aparelho: ' + (err && err.message ? err.message : 'sem espaço'), 'error', 7000);
          }
        };
        const del = el.querySelector('#mt-del');
        if (del) del.onclick = async () => {
          close();
          if (!(await UI.confirm({ title: 'Excluir material', message: `Excluir "${m.titulo}"? ${m.arquivoId ? 'O arquivo também será apagado deste aparelho.' : ''}`, danger: true, confirmText: 'Excluir' }))) return;
          if (m.arquivoId) await MR3.Files.remove(m.arquivoId).catch(() => {});
          Store.remove('materiais', m.id);
          UI.toast('Material excluído.'); MR3.refresh();
        };
      },
    });
  }

  /* =====================================================================
     VISUALIZAR / APRESENTAR
     ===================================================================== */
  async function abrir(id) {
    const m = Store.getById('materiais', id);
    if (!m) return;
    let url = m.url || null;
    if (m.arquivoId) url = await MR3.Files.url(m.arquivoId).catch(() => null);
    const yt = m.tipo === 'youtube' ? youtubeId(m.url) : null;
    let media;
    if (m.arquivoId && !url) media = UI.empty({ icon: 'file-x', title: 'Arquivo não está neste aparelho', text: 'Este material veio de um backup ou de outro aparelho. Edite e envie o arquivo de novo.', compact: true });
    else if (m.tipo === 'video') media = `<video src="${url}" controls playsinline preload="metadata"></video>`;
    else if (m.tipo === 'imagem') media = `<img src="${url}" alt="${esc(m.titulo)}">`;
    else if (m.tipo === 'audio') media = `<div class="viewer-audio">${UI.icon('audio-lines')}<audio src="${url}" controls></audio></div>`;
    else if (m.tipo === 'pdf') media = `<iframe src="${url}#view=FitH" title="${esc(m.titulo)}"></iframe>`;
    else if (yt) media = `<iframe src="https://www.youtube-nocookie.com/embed/${yt}?rel=0" title="${esc(m.titulo)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    else media = `<div class="viewer-link">${UI.icon('link')}<p class="muted small" style="word-break:break-all">${esc(m.url)}</p><a class="btn btn-gold btn-lg" href="${esc(m.url)}" target="_blank" rel="noopener">${UI.icon('external-link')}Abrir link</a></div>`;
    const abrirFora = url && (m.tipo === 'pdf' || yt || m.tipo === 'link');
    UI.modal({
      title: m.titulo, size: 'xl',
      body: `<div class="viewer t-${m.tipo}" id="viewer">${media}</div>
        ${m.descricao ? `<p class="mt-3" style="white-space:pre-wrap">${esc(m.descricao)}</p>` : ''}
        <p class="muted tiny mt-2">${esc(D.CATEGORIAS_MATERIAL[m.categoria] || '')}${m.tamanho ? ' · ' + fmtBytes(m.tamanho) : ''}${(m.atletaIds || []).length ? ' · ' + esc(m.atletaIds.map(D.nomeAtleta).map(U.firstName).join(', ')) : ''}</p>`,
      footer: `${abrirFora ? `<a class="btn" href="${esc(yt ? m.url : url)}" target="_blank" rel="noopener">${UI.icon('external-link')}${yt ? 'Abrir no YouTube' : 'Abrir em nova aba'}</a>` : ''}
        ${m.arquivoId && url ? `<a class="btn hide-mobile" href="${url}" download="${esc(m.nomeArquivo || m.titulo)}">${UI.icon('download')}Baixar</a>` : ''}
        <span class="spacer"></span>
        <button class="btn" id="vw-share">${UI.icon('share-2')}Enviar</button>
        ${m.tipo !== 'link' ? `<button class="btn btn-gold" id="vw-full">${UI.icon('maximize')}Apresentar</button>` : ''}`,
      onOpen(el) {
        const full = el.querySelector('#vw-full');
        if (full) full.onclick = async () => {
          const box = el.querySelector('#viewer');
          try { await (box.requestFullscreen ? box.requestFullscreen() : box.webkitRequestFullscreen()); }
          catch (e) { const v = box.querySelector('video'); if (v && v.webkitEnterFullscreen) v.webkitEnterFullscreen(); else UI.toast('Tela cheia não disponível neste navegador.', 'info'); }
        };
        el.querySelector('#vw-share').onclick = () => compartilhar(m.id);
      },
    });
  }

  /* =====================================================================
     COMPARTILHAR
     ===================================================================== */
  async function compartilhar(id) {
    const m = Store.getById('materiais', id);
    const cfg = Store.getConfig();
    const vinc = (m.atletaIds || []).map((x) => Store.getById('atletas', x)).filter(Boolean);
    const outros = U.sortBy(Store.query('atletas', (a) => a.status === 'ativo' && !(m.atletaIds || []).includes(a.id)), (a) => a.nome);
    const temLink = !!m.url;
    let file = null;
    if (m.arquivoId) { const blob = await MR3.Files.get(m.arquivoId).catch(() => null); if (blob) file = new File([blob], m.nomeArquivo || m.titulo, { type: m.mime || blob.type }); }
    const podeShare = file && navigator.canShare && (() => { try { return navigator.canShare({ files: [file] }); } catch (e) { return false; } })();
    const texto = (nome) => `${nome ? `Olá, ${U.firstName(nome)}! ` : ''}Segue o material *${m.titulo}*${m.descricao ? `:\n${m.descricao}` : '.'}${temLink ? `\n\n${m.url}` : ''}\n\n${cfg.nomeProfissional} — ${cfg.empresa}`;
    UI.modal({
      title: 'Enviar material',
      body: `<p class="mb-3"><b>${esc(m.titulo)}</b></p>
        ${podeShare ? `<button class="btn btn-gold btn-block btn-lg mb-3" id="sh-native">${UI.icon('share-2')}Compartilhar arquivo (WhatsApp, e-mail…)</button>` : ''}
        ${file && !podeShare ? `<div class="alert info mb-3">${UI.icon('info')}<div>Este arquivo está guardado neste aparelho. No celular, o botão “Compartilhar arquivo” envia direto para o WhatsApp. No computador, baixe e anexe na conversa.</div></div>` : ''}
        ${temLink || !file ? `<div class="field-label mb-2">Enviar ${temLink ? 'o link' : 'aviso'} pelo WhatsApp para:</div>` : '<div class="field-label mb-2">Avisar pelo WhatsApp:</div>'}
        <ul class="list card">${vinc.concat(outros).slice(0, 60).map((a) => `<li class="list-item">${UI.avatar(a, 'sm')}<div class="grow truncate">${esc(a.nome)}${(m.atletaIds || []).includes(a.id) ? ` ${UI.badge('vinculado', 'gold no-dot')}` : ''}</div>
          ${a.telefone || (a.responsavel && a.responsavel.telefone) ? `<a class="btn btn-sm btn-wa" target="_blank" rel="noopener" href="https://wa.me/${U.phoneToWa(a.telefone || a.responsavel.telefone)}?text=${encodeURIComponent(texto(a.nome))}">${UI.icon('message-circle')}Enviar</a>` : '<span class="muted tiny">sem telefone</span>'}</li>`).join('') || '<li class="list-item muted">Nenhum atleta ativo.</li>'}</ul>
        <a class="btn btn-block mt-3" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(texto(''))}">${UI.icon('users')}Escolher contato ou grupo no WhatsApp</a>`,
      footer: '<button class="btn" data-close>Fechar</button>',
      onOpen(el) {
        const n = el.querySelector('#sh-native');
        if (n) n.onclick = async () => { try { await navigator.share({ files: [file], title: m.titulo, text: texto('') }); } catch (e) { if (e.name !== 'AbortError') UI.toast('Não foi possível compartilhar neste aparelho.', 'error'); } };
      },
    });
  }

  /** Vincula materiais da biblioteca a um atleta (aba Materiais do perfil). */
  function vincularAtleta(atletaId) {
    const mats = U.sortBy(Store.getAll('materiais'), (m) => m.titulo);
    if (!mats.length) { UI.toast('Adicione materiais na biblioteca primeiro.', 'info'); location.hash = '#/materiais'; return; }
    UI.modal({
      title: `Materiais de ${U.firstName(D.nomeAtleta(atletaId))}`,
      body: `<div class="check-list tall">${mats.map((m) => `<label class="check"><input type="checkbox" value="${esc(m.id)}" ${(m.atletaIds || []).includes(atletaId) ? 'checked' : ''}> ${UI.icon((TIPOS[m.tipo] || TIPOS.arquivo).icon)} ${esc(m.titulo)}</label>`).join('')}</div>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-gold" id="va-ok">${UI.icon('check')}Salvar</button>`,
      onOpen(el, close) {
        el.querySelector('#va-ok').onclick = () => {
          Store.batch(() => el.querySelectorAll('input[type=checkbox]').forEach((cb) => {
            const m = Store.getById('materiais', cb.value);
            const has = (m.atletaIds || []).includes(atletaId);
            if (cb.checked && !has) Store.update('materiais', m.id, { atletaIds: (m.atletaIds || []).concat(atletaId) });
            if (!cb.checked && has) Store.update('materiais', m.id, { atletaIds: m.atletaIds.filter((x) => x !== atletaId) });
          }));
          UI.toast('Materiais atualizados.'); close(); MR3.refresh();
        };
      },
    });
  }

  MR3.modules.materiais = { title: 'Materiais', render };
  MR3.Materiais = { renderGrid, openForm, abrir, compartilhar, vincularAtleta, youtubeId };
})();
