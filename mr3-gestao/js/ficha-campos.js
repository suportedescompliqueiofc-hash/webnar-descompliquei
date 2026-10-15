/* =========================================================================
   ficha-campos.js — definição única da Ficha de Cadastro / Anamnese.
   Usada por ficha.html (preenchida pelo atleta ou responsável) e pelo
   sistema (importar, visualizar e preencher presencialmente).

   Sem servidor, a ficha volta para o Fabio pelo WhatsApp: a mensagem leva
   um resumo legível + um código "MR3FICHA1:..." (JSON em base64) que o
   sistema importa com um colar.
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const U = MR3.U;
  const esc = U.esc;
  const PREFIX = 'MR3FICHA1:';

  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const SECOES = [
    { id: 'atleta', titulo: 'Dados do atleta', icone: 'user', campos: [
      { n: 'nome', l: 'Nome completo', t: 'text', req: true, full: true, ac: 'name' },
      { n: 'dataNascimento', l: 'Data de nascimento', t: 'date', req: true },
      { n: 'sexo', l: 'Sexo', t: 'select', op: ['Masculino', 'Feminino', 'Prefiro não informar'] },
      { n: 'telefone', l: 'WhatsApp do atleta', t: 'tel', req: true, hint: 'Se não tiver, use o do responsável.' },
      { n: 'email', l: 'E-mail', t: 'email' },
      { n: 'cpf', l: 'CPF (opcional)', t: 'text', im: 'numeric' },
      { n: 'cidade', l: 'Cidade / bairro', t: 'text' },
      { n: 'escola', l: 'Escola ou clube atual', t: 'text', full: true },
    ] },
    { id: 'responsavel', titulo: 'Responsável', icone: 'users', menor: true, sub: 'Obrigatório para menores de 18 anos.', campos: [
      { n: 'respNome', l: 'Nome do responsável', t: 'text', req: true, full: true },
      { n: 'respParentesco', l: 'Parentesco', t: 'select', op: ['Mãe', 'Pai', 'Avó', 'Avô', 'Tio(a)', 'Outro'] },
      { n: 'respTelefone', l: 'WhatsApp do responsável', t: 'tel', req: true },
      { n: 'respEmail', l: 'E-mail do responsável', t: 'email' },
      { n: 'respCpf', l: 'CPF do responsável', t: 'text', im: 'numeric' },
    ] },
    { id: 'esporte', titulo: 'Esporte', icone: 'trophy', campos: [
      { n: 'modalidade', l: 'Modalidade', t: 'text', req: true, dl: ['Futebol', 'Futsal', 'Vôlei', 'Basquete', 'Tênis', 'Beach Tennis', 'Corrida', 'Natação'] },
      { n: 'posicao', l: 'Posição / prova', t: 'text' },
      { n: 'nivel', l: 'Nível', t: 'select', op: [['iniciante', 'Iniciante'], ['intermediario', 'Intermediário'], ['avancado', 'Avançado'], ['profissional', 'Profissional / federado']] },
      { n: 'tempoPratica', l: 'Há quanto tempo pratica', t: 'select', op: ['Menos de 1 ano', '1 a 3 anos', '3 a 5 anos', 'Mais de 5 anos'] },
      { n: 'treinosSemana', l: 'Treinos por semana no clube/escola', t: 'select', op: ['Nenhum', '1 a 2', '3 a 4', '5 ou mais'] },
      { n: 'dominancia', l: 'Lado dominante', t: 'radio', op: ['Destro', 'Canhoto', 'Ambidestro'] },
      { n: 'objetivo', l: 'Principal objetivo com os treinos', t: 'textarea', req: true, full: true, ph: 'Ex.: ganhar velocidade, voltar de lesão, passar na peneira…' },
      { n: 'competicoes', l: 'Próximas competições ou peneiras', t: 'text', full: true },
    ] },
    { id: 'saude', titulo: 'Saúde', icone: 'heart-pulse', campos: [
      { n: 'peso', l: 'Peso aproximado (kg)', t: 'text', im: 'decimal' },
      { n: 'altura', l: 'Altura aproximada (cm)', t: 'text', im: 'numeric' },
      { n: 'condicoes', l: 'Possui alguma destas condições?', t: 'chips', op: ['Asma', 'Diabetes', 'Problema cardíaco', 'Pressão alta', 'Epilepsia', 'Nenhuma'], full: true },
      { n: 'lesoes', l: 'Lesões anteriores', t: 'textarea', full: true, ph: 'Qual, quando e se ainda incomoda' },
      { n: 'cirurgias', l: 'Cirurgias', t: 'text', full: true },
      { n: 'dores', l: 'Sente alguma dor hoje? Onde?', t: 'text', full: true },
      { n: 'medicamentos', l: 'Medicamentos de uso contínuo', t: 'text' },
      { n: 'alergias', l: 'Alergias', t: 'text' },
      { n: 'planoSaude', l: 'Plano de saúde', t: 'text' },
      { n: 'tipoSanguineo', l: 'Tipo sanguíneo', t: 'select', op: ['Não sei', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'] },
      { n: 'emergNome', l: 'Contato de emergência', t: 'text', req: true },
      { n: 'emergTelefone', l: 'Telefone de emergência', t: 'tel', req: true },
    ] },
    { id: 'agenda', titulo: 'Disponibilidade', icone: 'calendar-days', campos: [
      { n: 'dias', l: 'Dias que prefere treinar', t: 'chips', op: DIAS.slice(0, 6), full: true },
      { n: 'periodos', l: 'Períodos', t: 'chips', op: ['Manhã', 'Tarde', 'Noite'], full: true },
      { n: 'comoConheceu', l: 'Como conheceu o trabalho', t: 'select', op: ['Indicação', 'Instagram', 'Clube / escola', 'Outro'] },
      { n: 'observacoes', l: 'Algo mais que devemos saber?', t: 'textarea', full: true },
    ] },
    { id: 'termos', titulo: 'Autorizações', icone: 'file-check', campos: [
      { n: 'autorizaImagem', l: 'Autoriza o uso de fotos e vídeos dos treinos nas redes sociais?', t: 'radio', op: ['Sim', 'Não'], req: true, full: true },
      { n: 'aceite', l: 'Declaro que as informações acima são verdadeiras e que o atleta está apto a praticar atividade física (ou apresentará atestado médico quando solicitado).', t: 'check', req: true, full: true },
    ] },
  ];
  const CAMPOS = SECOES.flatMap((s) => s.campos.map((c) => Object.assign({ secao: s.id }, c)));

  const isMenor = (d) => d.dataNascimento && U.age(d.dataNascimento) < 18;
  const optVal = (o) => (Array.isArray(o) ? o[0] : o);
  const optLbl = (o) => (Array.isArray(o) ? o[1] : o);

  /* ---------------- Formulário ---------------- */
  function campoHtml(c, v, pre) {
    const id = `${pre}${c.n}`;
    const val = v[c.n];
    const req = c.req ? ' <span class="req" aria-hidden="true">*</span>' : '';
    const cls = `field${c.full ? ' full' : ''}`;
    const hint = c.hint ? `<span class="hint">${esc(c.hint)}</span>` : '';
    if (c.t === 'select') {
      return `<div class="${cls}"><label for="${id}">${esc(c.l)}${req}</label><select id="${id}" name="${c.n}" class="input"><option value="">Selecione…</option>${c.op.map((o) => `<option value="${esc(optVal(o))}"${String(val ?? '') === String(optVal(o)) ? ' selected' : ''}>${esc(optLbl(o))}</option>`).join('')}</select>${hint}</div>`;
    }
    if (c.t === 'textarea') return `<div class="${cls}"><label for="${id}">${esc(c.l)}${req}</label><textarea id="${id}" name="${c.n}" class="input" rows="3" placeholder="${esc(c.ph || '')}">${esc(val)}</textarea>${hint}</div>`;
    if (c.t === 'chips' || c.t === 'radio') {
      const multi = c.t === 'chips';
      const sel = multi ? (Array.isArray(val) ? val : []) : val;
      return `<fieldset class="${cls} field-set" data-group="${c.n}"><legend class="field-label">${esc(c.l)}${req}</legend><div class="chips">${c.op.map((o, i) => `<label class="chip"><input type="${multi ? 'checkbox' : 'radio'}" name="${c.n}" value="${esc(o)}" id="${id}-${i}" ${multi ? (sel.includes(o) ? 'checked' : '') : (sel === o ? 'checked' : '')}>${esc(o)}</label>`).join('')}</div>${hint}</fieldset>`;
    }
    if (c.t === 'check') return `<div class="${cls}"><label class="check check-terms"><input type="checkbox" id="${id}" name="${c.n}" ${val ? 'checked' : ''}><span>${esc(c.l)}${req}</span></label></div>`;
    const type = c.t === 'tel' ? 'tel' : c.t;
    return `<div class="${cls}"><label for="${id}">${esc(c.l)}${req}</label><input id="${id}" name="${c.n}" class="input" type="${type}" value="${esc(val)}"${c.t === 'tel' ? ' data-mask="phone"' : ''}${c.im ? ` inputmode="${c.im}"` : ''}${c.ac ? ` autocomplete="${c.ac}"` : ''}${c.t === 'date' ? ` max="${U.today()}"` : ''}${c.dl ? ` list="${id}-dl"` : ''} placeholder="${esc(c.ph || '')}">${c.dl ? `<datalist id="${id}-dl">${c.dl.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}${hint}</div>`;
  }

  const F = {
    PREFIX, SECOES, CAMPOS,

    /** HTML do formulário completo (seções numeradas). */
    formHtml(v = {}, pre = 'fc-') {
      return SECOES.map((s, i) => `
        <section class="ficha-sec" data-sec="${s.id}"${s.menor ? ' data-menor' : ''}>
          <header class="ficha-sec-head"><span class="ficha-step">${i + 1}</span><div><h2>${esc(s.titulo)}</h2>${s.sub ? `<p class="muted small">${esc(s.sub)}</p>` : ''}</div></header>
          <div class="form-grid">${s.campos.map((c) => campoHtml(c, v, pre)).join('')}</div>
        </section>`).join('');
    },
    /** Mostra/esconde a seção do responsável conforme a idade. */
    bind(form) {
      const nasc = form.querySelector('[name=dataNascimento]');
      const sec = form.querySelector('[data-menor]');
      const upd = () => { if (sec) sec.hidden = !(nasc.value && U.age(nasc.value) < 18); };
      nasc.addEventListener('change', upd); nasc.addEventListener('input', upd); upd();
      // "Nenhuma" desmarca as demais condições (e vice-versa)
      const cond = form.querySelectorAll('[name=condicoes]');
      cond.forEach((cb) => cb.addEventListener('change', () => {
        if (!cb.checked) return;
        cond.forEach((o) => { if (o !== cb && (cb.value === 'Nenhuma' || o.value === 'Nenhuma')) o.checked = false; });
      }));
    },
    read(form) {
      const d = {};
      CAMPOS.forEach((c) => {
        if (c.t === 'chips') d[c.n] = [...form.querySelectorAll(`[name="${c.n}"]:checked`)].map((x) => x.value);
        else if (c.t === 'radio') { const x = form.querySelector(`[name="${c.n}"]:checked`); d[c.n] = x ? x.value : ''; }
        else if (c.t === 'check') d[c.n] = !!(form.querySelector(`[name="${c.n}"]`) || {}).checked;
        else { const el = form.querySelector(`[name="${c.n}"]`); d[c.n] = el ? el.value.trim() : ''; }
      });
      return d;
    },
    validate(d) {
      const e = {};
      CAMPOS.forEach((c) => {
        if (!c.req) return;
        if (c.secao === 'responsavel' && !isMenor(d)) return;
        const v = d[c.n];
        if (v === '' || v === false || v == null || (Array.isArray(v) && !v.length)) e[c.n] = c.t === 'check' ? 'É preciso aceitar para enviar.' : 'Campo obrigatório.';
      });
      if (d.nome && d.nome.length < 3) e.nome = 'Informe o nome completo.';
      ['telefone', 'respTelefone', 'emergTelefone'].forEach((k) => { if (d[k] && !U.validPhone(d[k])) e[k] = 'Telefone com DDD, ex.: (11) 98765-4321.'; });
      ['email', 'respEmail'].forEach((k) => { if (d[k] && !U.validEmail(d[k])) e[k] = 'E-mail inválido.'; });
      if (d.dataNascimento && d.dataNascimento > U.today()) e.dataNascimento = 'Data no futuro.';
      return e;
    },
    /** Marca erros num formulário de ficha (inclui grupos de chips). */
    showErrors(form, errs) {
      form.querySelectorAll('.invalid').forEach((x) => x.classList.remove('invalid'));
      form.querySelectorAll('.error-msg').forEach((x) => x.remove());
      Object.entries(errs).forEach(([k, msg]) => {
        const grp = form.querySelector(`[data-group="${k}"]`);
        const el = grp || form.querySelector(`[name="${k}"]`);
        if (!el) return;
        (grp || el).classList.add('invalid');
        const m = document.createElement('span'); m.className = 'error-msg'; m.textContent = msg;
        (el.closest('.field') || el).appendChild(m);
      });
      const first = form.querySelector('.invalid');
      if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); const f = first.matches('input,select,textarea') ? first : first.querySelector('input'); f && f.focus({ preventScroll: true }); }
      return !Object.keys(errs).length;
    },

    /* ---------------- Código para o WhatsApp ---------------- */
    encode(d) {
      const json = JSON.stringify(Object.assign({ v: 1, enviadaEm: U.today() }, d));
      const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return PREFIX + b64;
    },
    /** Procura o código dentro de qualquer texto colado. Retorna os dados ou null. */
    decode(text) {
      const m = String(text || '').replace(/\s+/g, '').match(/MR3FICHA1:([A-Za-z0-9_-]+)/);
      if (!m) return null;
      try {
        let b = m[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b.length % 4) b += '=';
        const bytes = Uint8Array.from(atob(b), (ch) => ch.charCodeAt(0));
        const d = JSON.parse(new TextDecoder().decode(bytes));
        return d && d.nome ? d : null;
      } catch (e) { return null; }
    },
    /** Texto legível que acompanha o código na mensagem. */
    resumo(d) {
      const L = [];
      L.push('*FICHA DE CADASTRO — ATLETA*');
      L.push(`*${d.nome}*${d.dataNascimento ? ` · ${U.fmtDate(d.dataNascimento)} (${U.age(d.dataNascimento)} anos)` : ''}`);
      if (d.telefone) L.push(`WhatsApp: ${d.telefone}`);
      if (isMenor(d) && d.respNome) L.push(`Responsável: ${d.respNome}${d.respParentesco ? ` (${d.respParentesco})` : ''} · ${d.respTelefone || ''}`);
      L.push(`Esporte: ${[d.modalidade, d.posicao].filter(Boolean).join(' · ')}`);
      if (d.objetivo) L.push(`Objetivo: ${d.objetivo}`);
      const saude = [d.condicoes && d.condicoes.length && !d.condicoes.includes('Nenhuma') ? d.condicoes.join(', ') : '', d.lesoes && `Lesões: ${d.lesoes}`, d.dores && `Dores: ${d.dores}`].filter(Boolean);
      if (saude.length) L.push(`Saúde: ${saude.join(' | ')}`);
      if ((d.dias || []).length || (d.periodos || []).length) L.push(`Disponibilidade: ${[(d.dias || []).join(', '), (d.periodos || []).join(', ')].filter(Boolean).join(' — ')}`);
      L.push('');
      L.push('Código para o sistema (não altere):');
      L.push(F.encode(d));
      return L.join('\n');
    },

    /* ---------------- Integração com o cadastro ---------------- */
    /** Converte a ficha em campos de Atleta. */
    toAtleta(d) {
      const obs = [
        d.condicoes && d.condicoes.length && !d.condicoes.includes('Nenhuma') ? `Condições: ${d.condicoes.join(', ')}` : '',
        d.lesoes && `Lesões: ${d.lesoes}`, d.cirurgias && `Cirurgias: ${d.cirurgias}`, d.dores && `Dores atuais: ${d.dores}`,
        d.medicamentos && `Medicamentos: ${d.medicamentos}`, d.alergias && `Alergias: ${d.alergias}`,
      ].filter(Boolean).join('\n');
      return {
        nome: d.nome, dataNascimento: d.dataNascimento || '', telefone: d.telefone ? U.maskPhone(d.telefone) : '', email: d.email || '',
        modalidade: d.modalidade || '', posicao: d.posicao || '', nivel: d.nivel || 'intermediario', objetivo: d.objetivo || '',
        observacoesMedicas: obs,
        responsavel: d.respNome ? { nome: d.respNome, telefone: d.respTelefone ? U.maskPhone(d.respTelefone) : '' } : null,
      };
    },
    /** Visualização completa da ficha (perfil do atleta / caixa de entrada). */
    viewHtml(d) {
      const fmt = (c, v) => {
        if (Array.isArray(v)) return v.join(', ');
        if (c.t === 'check') return v ? 'Sim, aceito' : 'Não';
        if (c.t === 'date') return U.fmtDate(v);
        if (c.t === 'select') { const o = (c.op || []).find((x) => String(optVal(x)) === String(v)); return o ? optLbl(o) : v; }
        return v;
      };
      return SECOES.filter((s) => !s.menor || isMenor(d) || d.respNome).map((s) => {
        const rows = s.campos.filter((c) => d[c.n] !== '' && d[c.n] != null && !(Array.isArray(d[c.n]) && !d[c.n].length));
        if (!rows.length) return '';
        return `<section class="ficha-view-sec"><h3>${MR3.UI ? MR3.UI.icon(s.icone) : ''}${esc(s.titulo)}</h3><dl class="dl">${rows.map((c) => `<dt>${esc(c.l.replace(/\?$/, ''))}</dt><dd style="white-space:pre-wrap">${esc(fmt(c, d[c.n]))}</dd>`).join('')}</dl></section>`;
      }).join('');
    },
    isMenor,
  };

  MR3.Ficha = F;
})();
