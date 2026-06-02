// ============================================================
// SANTOPET — Utilitários globais
// ============================================================

var Utils = (function() {

  // ── TOAST ─────────────────────────────────────────────────
  function toast(mensagem, tipo) {
    tipo = tipo || 'success';
    var container = document.getElementById('toast-container');
    var el = document.createElement('div');
    el.className = 'toast ' + tipo;
    el.textContent = mensagem;
    container.appendChild(el);
    setTimeout(function() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 3500);
  }

  // ── LOADING ────────────────────────────────────────────────
  function loading(show) {
    var el = document.getElementById('loading-overlay');
    if (show) el.classList.add('show');
    else       el.classList.remove('show');
  }

  // ── MODAL ──────────────────────────────────────────────────
  function abrirModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('open');
  }

  function fecharModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  // ── FORMATAÇÃO ────────────────────────────────────────────
  function moeda(valor) {
    valor = parseFloat(valor) || 0;
    return 'R$ ' + valor.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function data(str) {
    if (!str) return '';
    var p = str.split('-');
    if (p.length === 3) return p[2] + '/' + p[1] + '/' + p[0];
    return str;
  }

  function dataHoje() {
    var d = new Date();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var dia = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + dia;
  }

  function primeiroDiaMes() {
    var d = new Date();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    return d.getFullYear() + '-' + m + '-01';
  }

  // ── RENDERIZAÇÃO DE TABELA ─────────────────────────────────
  function renderTabela(tbodyId, colunas, dados, acoes) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    if (!dados || dados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="' + (colunas.length + (acoes ? 1 : 0)) + '" class="text-center text-muted" style="padding:20px">Nenhum registro encontrado.</td></tr>';
      return;
    }
    tbody.innerHTML = dados.map(function(item) {
      var tds = colunas.map(function(col) {
        var val = item[col.campo] !== undefined ? item[col.campo] : '';
        if (col.tipo === 'data')   val = data(val);
        if (col.tipo === 'moeda')  val = moeda(val);
        if (col.tipo === 'badge')  val = '<span class="badge badge-' + (col.cor ? col.cor(item) : 'blue') + '">' + val + '</span>';
        if (col.render)            val = col.render(item);
        return '<td>' + val + '</td>';
      }).join('');

      var acoesHtml = '';
      if (acoes) {
        acoesHtml = '<td>' + acoes.map(function(a) {
          return '<button class="btn btn-sm ' + (a.classe || 'btn-secondary') + '" onclick="' + a.onclick + '(\'' + item[a.idCampo || 'id'] + '\')">' + a.label + '</button>';
        }).join(' ') + '</td>';
      }

      return '<tr>' + tds + acoesHtml + '</tr>';
    }).join('');
  }

  // ── PAGINAÇÃO ──────────────────────────────────────────────
  function renderPaginacao(containerId, pagina, total, porPagina, callback) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var totalPags = Math.ceil(total / porPagina) || 1;
    var html = '<span class="pag-info">' + total + ' registros | Página ' + pagina + ' de ' + totalPags + '</span>';

    html += '<button ' + (pagina <= 1 ? 'disabled' : '') + ' onclick="(' + callback.toString() + ')(' + (pagina - 1) + ')">‹</button>';

    var inicio = Math.max(1, pagina - 2);
    var fim    = Math.min(totalPags, pagina + 2);
    for (var p = inicio; p <= fim; p++) {
      html += '<button class="' + (p === pagina ? 'active' : '') + '" onclick="(' + callback.toString() + ')(' + p + ')">' + p + '</button>';
    }

    html += '<button ' + (pagina >= totalPags ? 'disabled' : '') + ' onclick="(' + callback.toString() + ')(' + (pagina + 1) + ')">›</button>';
    container.innerHTML = html;
  }

  // ── FORMULÁRIO ────────────────────────────────────────────
  function getDadosForm(formId) {
    var form = document.getElementById(formId);
    if (!form) return {};
    var dados = {};
    var elementos = form.querySelectorAll('input, select, textarea');
    for (var i = 0; i < elementos.length; i++) {
      var el = elementos[i];
      if (el.name) dados[el.name] = el.value;
    }
    return dados;
  }

  function preencherForm(formId, dados) {
    var form = document.getElementById(formId);
    if (!form || !dados) return;
    Object.keys(dados).forEach(function(k) {
      var el = form.querySelector('[name="' + k + '"]');
      if (el) el.value = dados[k] || '';
    });
  }

  function limparForm(formId) {
    var form = document.getElementById(formId);
    if (form) form.reset();
  }

  // ── CONFIRM ────────────────────────────────────────────────
  function confirmar(mensagem, callback) {
    if (window.confirm(mensagem)) callback();
  }

  return {
    toast: toast, loading: loading,
    abrirModal: abrirModal, fecharModal: fecharModal,
    moeda: moeda, data: data, dataHoje: dataHoje, primeiroDiaMes: primeiroDiaMes,
    renderTabela: renderTabela, renderPaginacao: renderPaginacao,
    getDadosForm: getDadosForm, preencherForm: preencherForm, limparForm: limparForm,
    confirmar: confirmar
  };
})();
