// ============================================================
// SANTOPET — Módulo Serviços
// ============================================================

var Servicos = (function() {
  var _pagina = 1;
  var _clientes = [];

  function carregar(pagina) {
    _pagina = pagina || 1;
    var dataInicio = (document.getElementById('svc-data-inicio') || {}).value || '';
    var dataFim    = (document.getElementById('svc-data-fim')    || {}).value || '';
    var busca      = (document.getElementById('svc-busca')       || {}).value || '';

    Utils.loading(true);
    API.get('listarServicos', { pagina: _pagina, porPagina: 20, dataInicio: dataInicio, dataFim: dataFim, busca: busca }).then(function(res) {
      Utils.loading(false);
      if (!res.ok) { Utils.toast(res.erro, 'error'); return; }
      renderTabela(res.dados);
      Utils.renderPaginacao('svc-paginacao', _pagina, res.total, 20, function(p) { Servicos.carregar(p); });
    });
  }

  function renderTabela(dados) {
    var tbody = document.getElementById('svc-tbody');
    if (!tbody) return;
    if (!dados.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:20px">Nenhum serviço encontrado.</td></tr>';
      return;
    }
    tbody.innerHTML = dados.map(function(s) {
      return '<tr>' +
        '<td>' + Utils.data(s.data) + '</td>' +
        '<td>' + (s.nome_cliente || '') + '</td>' +
        '<td>' + (s.nome_animal  || '') + '</td>' +
        '<td>' + (s.tipo_servico || '') + '</td>' +
        '<td>' + (s.forma_pagamento || '') + '</td>' +
        '<td class="text-right fw-bold">' + Utils.moeda(s.valor) + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-danger" onclick="Servicos.excluir(\'' + s.id + '\')">Excluir</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function carregarClientes(callback) {
    API.get('listarClientes', { porPagina: 500 }).then(function(res) {
      if (res.ok) {
        _clientes = res.dados || [];
        var sel = document.getElementById('svc-id-cliente');
        if (sel) {
          sel.innerHTML = '<option value="">— Selecione o cliente —</option>' +
            _clientes.map(function(c) {
              return '<option value="' + c.id + '" data-animal="' + (c.nome_animal || '') + '">' + c.nome_cliente + (c.nome_animal ? ' (' + c.nome_animal + ')' : '') + '</option>';
            }).join('');
        }
      }
      if (callback) callback();
    });
  }

  function novo() {
    carregarClientes(function() {
      Utils.limparForm('form-servico');
      document.getElementById('svc-data').value = Utils.dataHoje();
      Utils.abrirModal('modal-servico');
    });
  }

  function onClienteChange() {
    var sel = document.getElementById('svc-id-cliente');
    var opt = sel ? sel.options[sel.selectedIndex] : null;
    var animal = document.getElementById('svc-nome-animal');
    if (animal && opt) animal.value = opt.getAttribute('data-animal') || '';
  }

  function salvar() {
    var dados = Utils.getDadosForm('form-servico');
    if (!dados.id_cliente || !dados.tipo_servico || !dados.valor) {
      Utils.toast('Preencha cliente, tipo de serviço e valor.', 'error');
      return;
    }
    // preencher nome_cliente
    var sel = document.getElementById('svc-id-cliente');
    var opt = sel ? sel.options[sel.selectedIndex] : null;
    dados.nome_cliente = opt ? opt.textContent.split('(')[0].trim() : '';
    dados.nome_animal  = document.getElementById('svc-nome-animal') ? document.getElementById('svc-nome-animal').value : '';

    Utils.loading(true);
    API.post('salvarServico', dados).then(function(res) {
      Utils.loading(false);
      if (res.ok) {
        Utils.toast(res.mensagem);
        Utils.fecharModal('modal-servico');
        carregar(_pagina);
      } else {
        Utils.toast(res.erro, 'error');
      }
    });
  }

  function excluir(id) {
    Utils.confirmar('Atenção: excluir o serviço NÃO remove a receita gerada. Confirma?', function() {
      Utils.loading(true);
      var body = JSON.stringify({ action: 'excluirServico', token: API.getToken(), usuario: API.getUsuario(), id: id });
      fetch(_gasUrl(), { method: 'POST', body: body })
        .then(function(r) { return r.json(); })
        .then(function(res) {
          Utils.loading(false);
          if (res.ok) { Utils.toast('Serviço removido.'); carregar(_pagina); }
          else Utils.toast(res.erro, 'error');
        });
    });
  }

  function _gasUrl() {
    var cfg = sessionStorage.getItem('sp_gas_url') || '';
    return cfg;
  }

  return { carregar: carregar, novo: novo, salvar: salvar, excluir: excluir, onClienteChange: onClienteChange };
})();
