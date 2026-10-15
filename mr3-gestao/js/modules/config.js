/* =========================================================================
   Módulo: Configurações — dados do profissional, Pix, mensagens de
   WhatsApp, horário, locais, regras, tema, backup (JSON/CSV),
   apagar tudo e dados de demonstração.
   ========================================================================= */
(function () {
  'use strict';
  const MR3 = (window.MR3 = window.MR3 || {});
  const { U, UI, Store } = MR3;
  const esc = U.esc;
  MR3.modules = MR3.modules || {};

  function render(el) {
    const cfg = Store.getConfig();
    const meta = Store.getMeta();
    const h = cfg.horarioAtendimento;
    const kb = Store.sizeBytes() / 1024;
    const temDemo = MR3.Demo.temDemo();

    el.innerHTML = `
      <div class="page-head"><div class="titles"><div class="eyebrow">Sistema</div><h1>Configurações</h1></div></div>
      <form id="cfg-form" novalidate>
      <div class="grid grid-2">
        <div class="card"><div class="card-head"><h2>${UI.icon('id-card')}Profissional</h2></div><div class="card-body"><div class="form-grid">
          <div class="field"><label for="c-nome">Nome do profissional</label><input id="c-nome" class="input" name="nomeProfissional" value="${esc(cfg.nomeProfissional)}"></div>
          <div class="field"><label for="c-emp">Empresa</label><input id="c-emp" class="input" name="empresa" value="${esc(cfg.empresa)}"></div>
          <div class="field"><label for="c-doc">CPF/CNPJ (sai no recibo)</label><input id="c-doc" class="input" name="documento" value="${esc(cfg.documento)}"></div>
          <div class="field"><label for="c-cid">Cidade</label><input id="c-cid" class="input" name="cidade" value="${esc(cfg.cidade)}"></div>
          <div class="field"><label for="c-tel">Telefone</label><input id="c-tel" class="input" name="telefone" data-mask="phone" value="${esc(cfg.telefone)}"></div>
          <div class="field"><label for="c-email">E-mail</label><input id="c-email" type="email" class="input" name="email" value="${esc(cfg.email)}"></div>
          <div class="field full"><label for="c-pix">Chave Pix</label><input id="c-pix" class="input" name="chavePix" value="${esc(cfg.chavePix)}" placeholder="CPF, e-mail, telefone ou chave aleatória"><span class="hint">Usada nas mensagens de cobrança.</span></div>
        </div></div></div>

        <div class="card"><div class="card-head"><h2>${UI.icon('clock')}Atendimento</h2></div><div class="card-body"><div class="form-grid">
          <div class="field"><label for="c-hi">Início do expediente</label><input id="c-hi" type="time" class="input" name="hInicio" value="${esc(h.inicio)}"></div>
          <div class="field"><label for="c-hf">Fim do expediente</label><input id="c-hf" type="time" class="input" name="hFim" value="${esc(h.fim)}"></div>
          <div class="field full"><span class="field-label">Dias de atendimento</span><div class="chips">${U.DIAS_CURTOS.map((d, i) => `<label class="chip"><input type="checkbox" name="dias" value="${i}" ${h.dias.includes(i) ? 'checked' : ''}>${d}</label>`).join('')}</div></div>
          <div class="field"><label for="c-dur">Duração padrão (min)</label><input id="c-dur" type="number" min="15" step="5" class="input" name="duracaoSessao" value="${esc(cfg.valoresPadrao.duracaoSessao)}"></div>
          <div class="field"><label for="c-venc">Vencimento padrão (dia)</label><input id="c-venc" type="number" min="1" max="31" class="input" name="diaVencimento" value="${esc(cfg.valoresPadrao.diaVencimento)}"></div>
          <div class="field"><label for="c-av">Valor padrão sessão avulsa</label>${UI.moneyInput('sessaoAvulsa', cfg.valoresPadrao.sessaoAvulsa, 'id="c-av"')}</div>
          <div class="field"><label for="c-alerta">Alertar saldo de pacote ≤</label><input id="c-alerta" type="number" min="0" class="input" name="alertaSaldoPacote" value="${esc(cfg.alertaSaldoPacote)}"></div>
          <div class="field full"><label class="check"><input type="checkbox" name="faltaDescontaPacote" ${cfg.faltaDescontaPacote ? 'checked' : ''}> Falta sem aviso desconta do saldo do pacote</label><span class="hint">Cancelamentos (com aviso) nunca descontam.</span></div>
        </div></div></div>

        <div class="card"><div class="card-head"><h2>${UI.icon('map-pin')}Listas</h2></div><div class="card-body"><div class="form-grid">
          <div class="field"><label for="c-loc">Locais de atendimento</label><textarea id="c-loc" class="input" name="locais" rows="5">${esc(cfg.locais.join('\n'))}</textarea><span class="hint">Um por linha.</span></div>
          <div class="field"><label for="c-tip">Tipos de sessão</label><textarea id="c-tip" class="input" name="tiposSessao" rows="5">${esc(cfg.tiposSessao.join('\n'))}</textarea><span class="hint">Um por linha.</span></div>
          <div class="field full"><label for="c-mod">Modalidades</label><textarea id="c-mod" class="input" name="modalidades" rows="3">${esc(cfg.modalidades.join('\n'))}</textarea></div>
        </div></div></div>

        <div class="card"><div class="card-head"><h2>${UI.icon('message-circle')}Mensagens de WhatsApp</h2></div><div class="card-body stack">
          <p class="muted small">Variáveis: <code>{nome}</code> <code>{valor}</code> <code>{vencimento}</code> <code>{referencia}</code> <code>{pix}</code> <code>{data}</code> <code>{hora}</code> <code>{local}</code> <code>{profissional}</code> <code>{empresa}</code></p>
          <div class="field"><label for="c-m1">Cobrança (antes do vencimento)</label><textarea id="c-m1" class="input" name="msgCobranca" rows="5">${esc(cfg.mensagens.cobranca)}</textarea></div>
          <div class="field"><label for="c-m2">Cobrança em atraso</label><textarea id="c-m2" class="input" name="msgAtraso" rows="5">${esc(cfg.mensagens.atraso)}</textarea></div>
          <div class="field"><label for="c-m3">Lembrete de sessão</label><textarea id="c-m3" class="input" name="msgLembrete" rows="3">${esc(cfg.mensagens.lembrete)}</textarea></div>
        </div></div>
      </div>
      <div class="row mt-3" style="justify-content:flex-end"><button type="submit" class="btn btn-gold">${UI.icon('save')}Salvar configurações</button></div>
      </form>

      <div class="grid grid-2 mt-4">
        <div class="card"><div class="card-head"><h2>${UI.icon('palette')}Aparência</h2></div><div class="card-body">
          <div class="segmented" role="group" aria-label="Tema">
            <button type="button" data-theme-set="dark" class="${MR3.getTheme() === 'dark' ? 'active' : ''}">${UI.icon('moon')} Escuro</button>
            <button type="button" data-theme-set="light" class="${MR3.getTheme() === 'light' ? 'active' : ''}">${UI.icon('sun')} Claro</button>
          </div></div></div>

        <div class="card"><div class="card-head"><h2>${UI.icon('wand-2')}Dados de demonstração</h2></div><div class="card-body">
          <p class="muted mb-3">Gera ~26 atletas fictícios, 6 meses de sessões, cobranças, pagamentos, saídas com motivos, avaliações e despesas — para testar todas as telas e gráficos.</p>
          <div class="row-wrap"><button class="btn btn-gold" id="demo-load">${UI.icon('wand-2')}${temDemo ? 'Recarregar demonstração' : 'Carregar demonstração'}</button>
            <button class="btn" id="demo-clear" ${temDemo ? '' : 'disabled'}>${UI.icon('eraser')}Limpar demonstração</button></div></div></div>

        <div class="card span-2"><div class="card-head"><h2>${UI.icon('database-backup')}Backup e dados</h2></div><div class="card-body">
          <div class="alert ${meta.ultimoBackup && U.diffDays(U.tsToDate(meta.ultimoBackup), U.today()) <= 7 ? 'info' : 'warning'} mb-3">${UI.icon('shield')}<div>
            Os dados ficam salvos <b>somente neste navegador</b>. Faça backups regulares.
            Último backup: <b>${meta.ultimoBackup ? `${U.fmtDate(U.tsToDate(meta.ultimoBackup))} (há ${U.plural(U.diffDays(U.tsToDate(meta.ultimoBackup), U.today()), 'dia', 'dias')})` : 'nunca'}</b>.
            Espaço usado: <b>${U.fmtNum(kb, 0)} KB</b> · schema v${Store.SCHEMA_VERSION} · armazenamento: ${esc(Store.adapterName())}.</div></div>
          <div class="grid grid-3">
            <div class="stack"><div class="field-label">Backup completo (JSON)</div>
              <button class="btn btn-gold btn-block" id="bk-export">${UI.icon('download')}Exportar backup</button>
              <label class="btn btn-block" for="bk-file">${UI.icon('upload')}Importar backup</label><input type="file" id="bk-file" accept=".json,application/json" class="sr-only"></div>
            <div class="stack"><div class="field-label">Planilhas (CSV)</div>
              <button class="btn btn-block" id="csv-at">${UI.icon('users')}Atletas</button>
              <button class="btn btn-block" id="csv-pg">${UI.icon('banknote')}Pagamentos</button>
              <button class="btn btn-block" id="csv-se">${UI.icon('calendar')}Sessões</button></div>
            <div class="stack"><div class="field-label">Zona de perigo</div>
              <button class="btn btn-danger btn-block" id="bk-wipe">${UI.icon('trash-2')}Apagar todos os dados</button>
              <p class="muted tiny">Exige dupla confirmação. Exporte um backup antes.</p></div>
          </div></div></div>
      </div>`;

    /* ---------- Salvar configurações ---------- */
    el.querySelector('#cfg-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const f = UI.formData(form);
      const errs = {};
      if (!f.nomeProfissional) errs.nomeProfissional = 'Obrigatório.';
      if (!f.empresa) errs.empresa = 'Obrigatório.';
      if (f.email && !U.validEmail(f.email)) errs.email = 'E-mail inválido.';
      if (!f.hInicio || !f.hFim || f.hFim <= f.hInicio) errs.hFim = 'O fim deve ser depois do início.';
      if (!f.dias.length) errs.dias = 'Selecione ao menos um dia.';
      if (!UI.showErrors(form, errs)) { if (errs.dias) UI.toast(errs.dias, 'error'); return; }
      const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
      Store.setConfig({
        nomeProfissional: f.nomeProfissional, empresa: f.empresa, documento: f.documento, cidade: f.cidade, telefone: f.telefone, email: f.email, chavePix: f.chavePix,
        horarioAtendimento: { inicio: f.hInicio, fim: f.hFim, dias: f.dias.map(Number).sort() },
        valoresPadrao: { duracaoSessao: Number(f.duracaoSessao) || 60, diaVencimento: U.clamp(Number(f.diaVencimento) || 10, 1, 31), sessaoAvulsa: f.sessaoAvulsa || 0 },
        alertaSaldoPacote: Math.max(0, Number(f.alertaSaldoPacote) || 0), faltaDescontaPacote: !!f.faltaDescontaPacote,
        mensagens: { cobranca: f.msgCobranca, atraso: f.msgAtraso, lembrete: f.msgLembrete },
        // listas (arrays) são substituídas por inteiro no merge
        locais: lines(f.locais), tiposSessao: lines(f.tiposSessao), modalidades: lines(f.modalidades),
      });
      UI.toast('Configurações salvas.');
      MR3.refresh();
    });

    el.querySelectorAll('[data-theme-set]').forEach((b) => (b.onclick = () => MR3.setTheme(b.dataset.themeSet)));
    el.querySelector('#demo-load').onclick = () => MR3.Demo.carregarComConfirmacao();
    el.querySelector('#demo-clear').onclick = async () => {
      if (!(await UI.confirm({ title: 'Limpar demonstração', message: 'Remover todos os registros de demonstração? Seus dados reais não serão afetados.', confirmText: 'Limpar', danger: true }))) return;
      const n = MR3.Demo.limpar();
      UI.toast(`${n} registros de demonstração removidos.`);
      MR3.refresh();
    };
    el.querySelector('#bk-export').onclick = exportJSON;
    el.querySelector('#bk-file').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importJSON(f); });
    el.querySelector('#csv-at').onclick = () => MR3.Atletas.exportCSV();
    el.querySelector('#csv-pg').onclick = () => MR3.Fin.exportPagamentosCSV();
    el.querySelector('#csv-se').onclick = () => MR3.Sessoes.exportCSV();
    el.querySelector('#bk-wipe').onclick = apagarTudo;
  }

  function exportJSON() {
    const data = Store.exportData();
    U.download(`mr3-backup-${U.today()}.json`, JSON.stringify(data, null, 2), 'application/json');
    Store.setMeta({ ultimoBackup: U.nowISO() });
    UI.toast('Backup exportado. Guarde o arquivo em local seguro (ex.: Google Drive).');
    MR3.renderBanner && MR3.renderBanner();
    if (location.hash.startsWith('#/config')) MR3.refresh();
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      let obj;
      try { obj = JSON.parse(reader.result); } catch (e) { UI.toast('Arquivo inválido: não é um JSON.', 'error'); return; }
      const errs = Store.validateBackup(obj);
      if (errs.length) {
        UI.modal({ title: 'Backup inválido', size: 'sm', body: `<div class="alert danger">${UI.icon('alert-octagon')}<div><ul style="margin:0;padding-left:16px">${errs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`, footer: '<button class="btn" data-close>Fechar</button>' });
        return;
      }
      const cont = Store.COLLECTIONS.map((c) => `<tr><td>${c}</td><td class="right num">${(obj[c] || []).length}</td><td class="right num muted">${Store.getAll(c).length}</td></tr>`).join('');
      const ok = await UI.confirm({
        title: 'Importar backup', danger: true, html: true, confirmText: 'Substituir meus dados',
        message: `<p class="mb-3">Backup de <b>${obj.exportadoEm ? U.fmtDate(U.tsToDate(obj.exportadoEm)) : 'data desconhecida'}</b>. Os dados atuais serão <b>substituídos</b>.</p>
          <table class="table"><thead><tr><th>Coleção</th><th class="right">No backup</th><th class="right">Atual</th></tr></thead><tbody>${cont}</tbody></table>`,
      });
      if (!ok) return;
      try {
        Store.importData(obj);
        UI.toast('Backup importado com sucesso.');
        MR3.go('#/dashboard');
      } catch (e) { UI.toast('Falha ao importar: ' + e.message, 'error', 6000); }
    };
    reader.onerror = () => UI.toast('Não foi possível ler o arquivo.', 'error');
    reader.readAsText(file);
  }

  async function apagarTudo() {
    const ok1 = await UI.confirm({ title: 'Apagar todos os dados', message: 'Isso remove TODOS os atletas, sessões, cobranças, despesas e avaliações deste navegador. Não há como desfazer sem um backup.', confirmText: 'Continuar', danger: true });
    if (!ok1) return;
    UI.modal({
      title: 'Confirmação final', size: 'sm',
      body: `<p class="mb-3">Digite <b>APAGAR</b> para confirmar.</p><div class="field"><label for="wipe-in" class="sr-only">Confirmação</label><input id="wipe-in" class="input" autocomplete="off" autofocus></div>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-danger-solid" id="wipe-ok" disabled>${UI.icon('trash-2')}Apagar tudo</button>`,
      onOpen(el, close) {
        const inp = el.querySelector('#wipe-in'), btn = el.querySelector('#wipe-ok');
        inp.addEventListener('input', () => (btn.disabled = inp.value.trim().toUpperCase() !== 'APAGAR'));
        btn.onclick = () => { Store.clearAll(); close(); UI.toast('Todos os dados foram apagados.'); MR3.go('#/dashboard'); };
      },
    });
  }

  MR3.modules.config = { title: 'Configurações', render, exportJSON };
})();
