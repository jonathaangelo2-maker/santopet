// ============================================================
// SANTOPET — Módulo Estoque
// ============================================================

var Estoque = (function() {
  var _produtos = [];

  function carregar() {
    var busca = (document.getElementById('est-busca') || {}).value || '';
    Utils.loading(true);
    API.get('listarEstoque', { busca: busca }).then(function(res) {
      Utils.loading(false);
      if (!res.ok) { Utils.toast(res.erro, 'error'); return; }
      _produtos = res.dados || [];
      renderTabela(_produtos);

      var alertEl = document.getElementById('est-alertas');
      if (alertEl) {
        if (res.alertas > 0) {
          alertEl.textContent = '⚠ ' + res.alertas + ' produto(s) abaixo do estoque mínimo!';
          alertEl.className = 'alert alert-warning';
          alertEl.style.display = 'block';
        } else {
          alertEl.style.display = 'none';
        }
      }
    });
  }

  function renderTabela(dados) {
    var tbody = document.getElementById('est-tbody');
    if (!tbody) return;
    if (!dados.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:20px">Nenhum produto encontrado.</td></tr>';
      return;
    }
    tbody.innerHTML = dados.map(function(p) {
      var baixo = parseFloat(p.quantidade_atual) <= parseFloat(p.quantidade_minima);
      var badgeQtd = baixo
        ? '<span class="badge badge-red">' + p.quantidade_atual + '</span>'
        : '<span class="badge badge-green">' + p.quantidade_atual + '</span>';
      return '<tr>' +
        '<td>' + (p.produto   || '') + '</td>' +
        '<td>' + (p.categoria || '') + '</td>' +
        '<td class="text-center">' + badgeQtd + '</td>' +
        '<td class="text-center">' + (p.quantidade_minima || 0) + '</td>' +
        '<td>' + Utils.moeda(p.valor_compra) + '</td>' +
        '<td>' + Utils.moeda(p.valor_venda)  + '</td>' +
        '<td>' + (p.fornecedor || '') + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-secondary" onclick="Estoque.editarProduto(\'' + p.id + '\')">Editar</button> ' +
          '<button class="btn btn-sm btn-primary"   onclick="Estoque.abrirMovimentacao(\'' + p.id + '\',\'' + p.produto + '\')">Mov.</button> ' +
          '<button class="btn btn-sm btn-danger"    onclick="Estoque.excluirProduto(\'' + p.id + '\')">Excluir</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function novoProduto() {
    Utils.limparForm('form-produto');
    document.getElementById('prod-form-id').value = '';
    document.getElementById('modal-prod-titulo').textContent = 'Novo Produto';
    Utils.abrirModal('modal-produto');
  }

  function editarProduto(id) {
    var p = _produtos.filter(function(x) { return x.id === id; })[0];
    if (!p) { Utils.toast('Produto não encontrado.', 'error'); return; }
    document.getElementById('modal-prod-titulo').textContent = 'Editar Produto';
    Utils.preencherForm('form-produto', p);
    document.getElementById('prod-form-id').value = id;
    Utils.abrirModal('modal-produto');
  }

  function salvarProduto() {
    var dados = Utils.getDadosForm('form-produto');
    dados.id  = document.getElementById('prod-form-id').value;
    if (!dados.produto) { Utils.toast('Nome do produto é obrigatório.', 'error'); return; }
    Utils.loading(true);
    API.post('salvarProduto', dados).then(function(res) {
      Utils.loading(false);
      if (res.ok) { Utils.toast(res.mensagem); Utils.fecharModal('modal-produto'); carregar(); }
      else Utils.toast(res.erro, 'error');
    });
  }

  function excluirProduto(id) {
    Utils.confirmar('Confirma a exclusão deste produto?', function() {
      Utils.loading(true);
      var body = JSON.stringify({ action: 'excluirProduto', token: API.getToken(), usuario: API.getUsuario(), id: id });
      fetch(sessionStorage.getItem('sp_gas_url') || '', { method: 'POST', body: body })
        .then(function(r) { return r.json(); })
        .then(function(res) {
          Utils.loading(false);
          if (res.ok) { Utils.toast('Produto removido.'); carregar(); }
          else Utils.toast(res.erro, 'error');
        });
    });
  }

  function abrirMovimentacao(id, nome) {
    document.getElementById('mov-id-produto').value   = id;
    document.getElementById('mov-nome-produto').value = nome;
    document.getElementById('mov-quantidade').value   = '';
    document.getElementById('mov-tipo').value         = 'ENTRADA';
    document.getElementById('mov-motivo').value       = '';
    Utils.abrirModal('modal-movimentacao');
  }

  function salvarMovimentacao() {
    var dados = {
      id_produto:   document.getElementById('mov-id-produto').value,
      nome_produto: document.getElementById('mov-nome-produto').value,
      tipo:         document.getElementById('mov-tipo').value,
      quantidade:   document.getElementById('mov-quantidade').value,
      motivo:       document.getElementById('mov-motivo').value
    };
    if (!dados.quantidade || parseFloat(dados.quantidade) <= 0) {
      Utils.toast('Quantidade deve ser maior que zero.', 'error'); return;
    }
    Utils.loading(true);
    API.post('movimentarEstoque', dados).then(function(res) {
      Utils.loading(false);
      if (res.ok) {
        Utils.toast('Estoque atualizado. Quantidade atual: ' + res.quantidade_atual);
        Utils.fecharModal('modal-movimentacao');
        carregar();
      } else {
        Utils.toast(res.erro, 'error');
      }
    });
  }

  return {
    carregar: carregar, novoProduto: novoProduto,
    editarProduto: editarProduto, salvarProduto: salvarProduto, excluirProduto: excluirProduto,
    abrirMovimentacao: abrirMovimentacao, salvarMovimentacao: salvarMovimentacao
  };
})();
