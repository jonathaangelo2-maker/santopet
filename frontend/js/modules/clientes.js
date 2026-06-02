// ============================================================
// SANTOPET — Módulo Clientes
// ============================================================

var Clientes = (function() {
  var _pagina = 1;
  var _busca  = '';
  var _editandoId = '';

  function carregar(pagina) {
    _pagina = pagina || 1;
    _busca  = document.getElementById('cli-busca') ? document.getElementById('cli-busca').value : '';
    Utils.loading(true);
    API.get('listarClientes', { pagina: _pagina, porPagina: 20, busca: _busca }).then(function(res) {
      Utils.loading(false);
      if (!res.ok) { Utils.toast(res.erro, 'error'); return; }
      renderTabela(res.dados);
      Utils.renderPaginacao('cli-paginacao', res.pagina, res.total, res.porPagina, function(p) { Clientes.carregar(p); });
    });
  }

  function renderTabela(dados) {
    var tbody = document.getElementById('cli-tbody');
    if (!tbody) return;
    if (!dados.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:20px">Nenhum cliente encontrado.</td></tr>';
      return;
    }
    tbody.innerHTML = dados.map(function(c) {
      return '<tr>' +
        '<td>' + (c.nome_cliente || '') + '</td>' +
        '<td>' + (c.nome_animal  || '') + '</td>' +
        '<td>' + (c.especie      || '') + '</td>' +
        '<td>' + (c.raca         || '') + '</td>' +
        '<td>' + (c.telefone     || '') + '</td>' +
        '<td>' + (c.whatsapp     || '') + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-secondary" onclick="Clientes.editar(\'' + c.id + '\')">Editar</button> ' +
          '<button class="btn btn-sm btn-danger"    onclick="Clientes.excluir(\'' + c.id + '\')">Excluir</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function novo() {
    _editandoId = '';
    Utils.limparForm('form-cliente');
    document.getElementById('modal-cliente-titulo').textContent = 'Novo Cliente';
    document.getElementById('form-cliente-id').value = '';
    Utils.abrirModal('modal-cliente');
  }

  function editar(id) {
    Utils.loading(true);
    API.get('buscarCliente', { id: id }).then(function(res) {
      Utils.loading(false);
      if (!res.ok) { Utils.toast(res.erro, 'error'); return; }
      _editandoId = id;
      document.getElementById('modal-cliente-titulo').textContent = 'Editar Cliente';
      Utils.preencherForm('form-cliente', res.dados);
      document.getElementById('form-cliente-id').value = id;
      Utils.abrirModal('modal-cliente');
    });
  }

  function excluir(id) {
    Utils.confirmar('Confirma a exclusão deste cliente?', function() {
      Utils.loading(true);
      API.post('excluirCliente', null).then(function() {}); // precisa do id direto
      // Monta o post correto:
      var body = { action: 'excluirCliente', token: API.getToken(), usuario: API.getUsuario(), id: id };
      fetch('', { method: 'POST', body: JSON.stringify(body) }); // placeholder
      // Usar API.post customizado:
      _excluirReal(id);
    });
  }

  function _excluirReal(id) {
    Utils.loading(true);
    var body = JSON.stringify({ action: 'excluirCliente', token: API.getToken(), usuario: API.getUsuario(), id: id });
    fetch(_gasUrl(), { method: 'POST', body: body })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        Utils.loading(false);
        if (res.ok) { Utils.toast('Cliente removido.'); carregar(_pagina); }
        else Utils.toast(res.erro, 'error');
      });
  }

  function _gasUrl() {
    // Mesma URL do API — exposta via closure
    return API.get.toString().match(/'([^']+)'\s*\+\s*'\?'/)?.[1] || '';
  }

  function salvar() {
    var dados = Utils.getDadosForm('form-cliente');
    if (!dados.nome_cliente) { Utils.toast('Nome do cliente é obrigatório.', 'error'); return; }
    dados.id = document.getElementById('form-cliente-id').value;

    Utils.loading(true);
    API.post('salvarCliente', dados).then(function(res) {
      Utils.loading(false);
      if (res.ok) {
        Utils.toast(res.mensagem);
        Utils.fecharModal('modal-cliente');
        carregar(_pagina);
      } else {
        Utils.toast(res.erro, 'error');
      }
    });
  }

  function buscar() {
    carregar(1);
  }

  return { carregar: carregar, novo: novo, editar: editar, excluir: excluir, salvar: salvar, buscar: buscar };
})();
