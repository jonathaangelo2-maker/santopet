// ============================================================
// SANTOPET — Módulo Financeiro (Receitas e Despesas)
// ============================================================

// ── RECEITAS ──────────────────────────────────────────────
var Receitas = (function() {

  function carregar() {
    var di = (document.getElementById('rec-data-inicio') || {}).value || Utils.primeiroDiaMes();
    var df = (document.getElementById('rec-data-fim')    || {}).value || Utils.dataHoje();

    Utils.loading(true);
    API.get('listarReceitas', { dataInicio: di, dataFim: df }).then(function(res) {
      Utils.loading(false);
      if (!res.ok) { Utils.toast(res.erro, 'error'); return; }
      renderTabela(res.dados);
      var el = document.getElementById('rec-total');
      if (el) el.textContent = Utils.moeda(res.total);
    });
  }

  function renderTabela(dados) {
    var tbody = document.getElementById('rec-tbody');
    if (!tbody) return;
    if (!dados.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:20px">Nenhuma receita encontrada.</td></tr>';
      return;
    }
    tbody.innerHTML = dados.map(function(r) {
      return '<tr>' +
        '<td>' + Utils.data(r.data) + '</td>' +
        '<td>' + (r.nome_cliente   || '') + '</td>' +
        '<td>' + (r.descricao      || '') + '</td>' +
        '<td>' + (r.forma_pagamento|| '') + '</td>' +
        '<td class="text-right fw-bold text-green">' + Utils.moeda(r.valor) + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-danger" onclick="Receitas.excluir(\'' + r.id + '\')">Excluir</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function novo() {
    Utils.limparForm('form-receita');
    document.getElementById('rec-form-data').value = Utils.dataHoje();
    Utils.abrirModal('modal-receita');
  }

  function salvar() {
    var dados = Utils.getDadosForm('form-receita');
    if (!dados.valor || !dados.data) { Utils.toast('Data e valor são obrigatórios.', 'error'); return; }
    Utils.loading(true);
    API.post('salvarReceita', dados).then(function(res) {
      Utils.loading(false);
      if (res.ok) { Utils.toast(res.mensagem); Utils.fecharModal('modal-receita'); carregar(); }
      else Utils.toast(res.erro, 'error');
    });
  }

  function excluir(id) {
    Utils.confirmar('Confirma a exclusão desta receita?', function() {
      Utils.loading(true);
      var body = JSON.stringify({ action: 'excluirReceita', token: API.getToken(), usuario: API.getUsuario(), id: id });
      fetch(sessionStorage.getItem('sp_gas_url') || '', { method: 'POST', body: body })
        .then(function(r) { return r.json(); })
        .then(function(res) {
          Utils.loading(false);
          if (res.ok) { Utils.toast('Receita removida.'); carregar(); }
          else Utils.toast(res.erro, 'error');
        });
    });
  }

  return { carregar: carregar, novo: novo, salvar: salvar, excluir: excluir };
})();

// ── DESPESAS ──────────────────────────────────────────────
var Despesas = (function() {

  function carregar() {
    var di = (document.getElementById('desp-data-inicio') || {}).value || Utils.primeiroDiaMes();
    var df = (document.getElementById('desp-data-fim')    || {}).value || Utils.dataHoje();

    Utils.loading(true);
    API.get('listarDespesas', { dataInicio: di, dataFim: df }).then(function(res) {
      Utils.loading(false);
      if (!res.ok) { Utils.toast(res.erro, 'error'); return; }
      renderTabela(res.dados);
      var el = document.getElementById('desp-total');
      if (el) el.textContent = Utils.moeda(res.total);
    });
  }

  function renderTabela(dados) {
    var tbody = document.getElementById('desp-tbody');
    if (!tbody) return;
    if (!dados.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:20px">Nenhuma despesa encontrada.</td></tr>';
      return;
    }
    tbody.innerHTML = dados.map(function(d) {
      return '<tr>' +
        '<td>' + Utils.data(d.data) + '</td>' +
        '<td><span class="badge badge-orange">' + (d.categoria || '') + '</span></td>' +
        '<td>' + (d.descricao  || '') + '</td>' +
        '<td>' + (d.observacao || '') + '</td>' +
        '<td class="text-right fw-bold text-red">' + Utils.moeda(d.valor) + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-secondary" onclick="Despesas.editar(\'' + d.id + '\')">Editar</button> ' +
          '<button class="btn btn-sm btn-danger"    onclick="Despesas.excluir(\'' + d.id + '\')">Excluir</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  var _dadosCache = {};

  function novo() {
    _dadosCache = {};
    Utils.limparForm('form-despesa');
    document.getElementById('desp-form-id').value = '';
    document.getElementById('desp-form-data').value = Utils.dataHoje();
    document.getElementById('modal-desp-titulo').textContent = 'Nova Despesa';
    Utils.abrirModal('modal-despesa');
  }

  function editar(id) {
    Utils.loading(true);
    API.get('listarDespesas', { dataInicio: '2000-01-01', dataFim: '2099-12-31' }).then(function(res) {
      Utils.loading(false);
      if (!res.ok) { Utils.toast(res.erro, 'error'); return; }
      var item = (res.dados || []).filter(function(d) { return d.id === id; })[0];
      if (!item) { Utils.toast('Despesa não encontrada.', 'error'); return; }
      document.getElementById('modal-desp-titulo').textContent = 'Editar Despesa';
      Utils.preencherForm('form-despesa', item);
      document.getElementById('desp-form-id').value = id;
      Utils.abrirModal('modal-despesa');
    });
  }

  function salvar() {
    var dados = Utils.getDadosForm('form-despesa');
    dados.id = document.getElementById('desp-form-id').value;
    if (!dados.valor || !dados.data || !dados.categoria) {
      Utils.toast('Data, categoria e valor são obrigatórios.', 'error'); return;
    }
    Utils.loading(true);
    API.post('salvarDespesa', dados).then(function(res) {
      Utils.loading(false);
      if (res.ok) { Utils.toast(res.mensagem); Utils.fecharModal('modal-despesa'); carregar(); }
      else Utils.toast(res.erro, 'error');
    });
  }

  function excluir(id) {
    Utils.confirmar('Confirma a exclusão desta despesa?', function() {
      Utils.loading(true);
      var body = JSON.stringify({ action: 'excluirDespesa', token: API.getToken(), usuario: API.getUsuario(), id: id });
      fetch(sessionStorage.getItem('sp_gas_url') || '', { method: 'POST', body: body })
        .then(function(r) { return r.json(); })
        .then(function(res) {
          Utils.loading(false);
          if (res.ok) { Utils.toast('Despesa removida.'); carregar(); }
          else Utils.toast(res.erro, 'error');
        });
    });
  }

  return { carregar: carregar, novo: novo, editar: editar, salvar: salvar, excluir: excluir };
})();
