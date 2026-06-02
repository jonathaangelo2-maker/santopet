// ============================================================
// SANTOPET — Dashboard
// ============================================================

var Dashboard = (function() {

  function carregar() {
    Utils.loading(true);
    API.get('dashboard').then(function(res) {
      Utils.loading(false);
      if (!res.ok) { Utils.toast(res.erro, 'error'); return; }

      set('kpi-svc-hoje',   res.servicos_hoje);
      set('kpi-rec-hoje',   Utils.moeda(res.receita_hoje));
      set('kpi-rec-mes',    Utils.moeda(res.receita_mes));
      set('kpi-desp-mes',   Utils.moeda(res.despesas_mes));
      set('kpi-lucro-mes',  Utils.moeda(res.lucro_mes));
      set('kpi-alertas',    res.alertas_estoque);

      var el = document.getElementById('kpi-lucro-mes');
      if (el) el.className = 'kpi-value ' + (res.lucro_mes >= 0 ? 'green' : 'red');

      renderUltimosAtendimentos(res.ultimos_atendimentos || []);
    });
  }

  function set(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function renderUltimosAtendimentos(lista) {
    var tbody = document.getElementById('dash-atendimentos');
    if (!tbody) return;
    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum atendimento recente.</td></tr>';
      return;
    }
    tbody.innerHTML = lista.map(function(s) {
      return '<tr>' +
        '<td>' + Utils.data(s.data) + '</td>' +
        '<td>' + (s.nome_cliente || '') + '</td>' +
        '<td>' + (s.nome_animal  || '') + '</td>' +
        '<td>' + (s.tipo_servico || '') + '</td>' +
        '<td>' + Utils.moeda(s.valor) + '</td>' +
      '</tr>';
    }).join('');
  }

  return { carregar: carregar };
})();
