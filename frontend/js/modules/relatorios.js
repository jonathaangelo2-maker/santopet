// ============================================================
// SANTOPET — Módulo Relatórios
// ============================================================

var Relatorios = (function() {

  function carregar() {
    // Preenche datas padrão se vazias
    var campos = ['rel-svc-di','rel-svc-df','rel-fin-di','rel-fin-df','rel-est-di','rel-est-df'];
    campos.forEach(function(id) {
      var el = document.getElementById(id);
      if (el && !el.value) {
        el.value = id.indexOf('-df') >= 0 ? Utils.dataHoje() : Utils.primeiroDiaMes();
      }
    });
    mostrarAba('servicos');
  }

  function mostrarAba(aba) {
    document.querySelectorAll('.report-tabs button').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.report-tab-content').forEach(function(c) { c.classList.remove('active'); });

    var btn = document.getElementById('tab-btn-' + aba);
    var cont = document.getElementById('tab-' + aba);
    if (btn)  btn.classList.add('active');
    if (cont) cont.classList.add('active');
  }

  // ── RELATÓRIO SERVIÇOS ────────────────────────────────────
  function gerarServicos() {
    var di = (document.getElementById('rel-svc-di') || {}).value || Utils.primeiroDiaMes();
    var df = (document.getElementById('rel-svc-df') || {}).value || Utils.dataHoje();

    Utils.loading(true);
    API.get('relatorioServicos', { dataInicio: di, dataFim: df }).then(function(res) {
      Utils.loading(false);
      if (!res.ok) { Utils.toast(res.erro, 'error'); return; }

      var tbody = document.getElementById('rel-svc-tbody');
      if (!res.dados.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:20px">Nenhum registro no período.</td></tr>';
      } else {
        tbody.innerHTML = res.dados.map(function(s) {
          return '<tr>' +
            '<td>' + Utils.data(s.data) + '</td>' +
            '<td>' + (s.nome_cliente || '') + '</td>' +
            '<td>' + (s.nome_animal  || '') + '</td>' +
            '<td>' + (s.tipo_servico || '') + '</td>' +
            '<td>' + (s.forma_pagamento || '') + '</td>' +
            '<td class="text-right">' + Utils.moeda(s.valor) + '</td>' +
          '</tr>';
        }).join('');
      }

      // Resumo por tipo
      var resumoEl = document.getElementById('rel-svc-resumo');
      if (resumoEl) {
        var html = '<table><thead><tr><th>Tipo</th><th>Qtd</th><th>Total</th></tr></thead><tbody>';
        Object.keys(res.por_tipo || {}).forEach(function(t) {
          html += '<tr><td>' + t + '</td><td>' + res.por_tipo[t].quantidade + '</td><td>' + Utils.moeda(res.por_tipo[t].valor) + '</td></tr>';
        });
        html += '</tbody></table>';
        html += '<p class="mt-8"><strong>Total geral: ' + Utils.moeda(res.total_valor) + ' | ' + res.total_registros + ' atendimentos</strong></p>';
        resumoEl.innerHTML = html;
      }
    });
  }

  // ── RELATÓRIO FINANCEIRO ──────────────────────────────────
  function gerarFinanceiro() {
    var di = (document.getElementById('rel-fin-di') || {}).value || Utils.primeiroDiaMes();
    var df = (document.getElementById('rel-fin-df') || {}).value || Utils.dataHoje();

    Utils.loading(true);
    API.get('relatorioFinanceiro', { dataInicio: di, dataFim: df }).then(function(res) {
      Utils.loading(false);
      if (!res.ok) { Utils.toast(res.erro, 'error'); return; }

      // KPIs
      var setEl = function(id, val) { var e = document.getElementById(id); if(e) e.textContent = val; };
      setEl('rel-fin-receitas', Utils.moeda(res.receitas));
      setEl('rel-fin-despesas', Utils.moeda(res.despesas));
      setEl('rel-fin-lucro',    Utils.moeda(res.lucro));
      var lucroEl = document.getElementById('rel-fin-lucro');
      if (lucroEl) lucroEl.className = 'kpi-value ' + (res.lucro >= 0 ? 'green' : 'red');

      // Despesas por categoria
      var catEl = document.getElementById('rel-fin-categorias');
      if (catEl) {
        var html = '<table><thead><tr><th>Categoria</th><th>Total</th></tr></thead><tbody>';
        Object.keys(res.despesas_por_categoria || {}).forEach(function(c) {
          html += '<tr><td>' + c + '</td><td class="text-right">' + Utils.moeda(res.despesas_por_categoria[c]) + '</td></tr>';
        });
        html += '</tbody></table>';
        catEl.innerHTML = html;
      }

      // Tabela receitas
      var recTbody = document.getElementById('rel-rec-tbody');
      if (recTbody) {
        if (!res.dados_receitas || !res.dados_receitas.length) {
          recTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sem receitas no período.</td></tr>';
        } else {
          recTbody.innerHTML = res.dados_receitas.map(function(r) {
            return '<tr><td>' + Utils.data(r.data) + '</td><td>' + (r.nome_cliente||'') + '</td><td>' + (r.descricao||'') + '</td><td class="text-right">' + Utils.moeda(r.valor) + '</td></tr>';
          }).join('');
        }
      }
    });
  }

  // ── RELATÓRIO ESTOQUE ─────────────────────────────────────
  function gerarEstoque() {
    Utils.loading(true);
    API.get('relatorioEstoque').then(function(res) {
      Utils.loading(false);
      if (!res.ok) { Utils.toast(res.erro, 'error'); return; }

      var tbody = document.getElementById('rel-est-tbody');
      if (tbody) {
        if (!res.dados.length) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:20px">Nenhum produto.</td></tr>';
        } else {
          tbody.innerHTML = res.dados.map(function(p) {
            var baixo = parseFloat(p.quantidade_atual) <= parseFloat(p.quantidade_minima);
            return '<tr' + (baixo ? ' style="background:#fff8e1"' : '') + '>' +
              '<td>' + (p.produto   || '') + '</td>' +
              '<td>' + (p.categoria || '') + '</td>' +
              '<td class="text-center">' + p.quantidade_atual + '</td>' +
              '<td class="text-center">' + p.quantidade_minima + '</td>' +
              '<td>' + Utils.moeda(p.valor_compra) + '</td>' +
              '<td>' + Utils.moeda(p.valor_venda)  + '</td>' +
            '</tr>';
          }).join('');
        }
      }

      var setEl = function(id, val) { var e = document.getElementById(id); if(e) e.textContent = val; };
      setEl('rel-est-total',   Utils.moeda(res.valor_total));
      setEl('rel-est-alertas', res.abaixo_minimo ? res.abaixo_minimo.length : 0);
    });
  }

  return { carregar: carregar, mostrarAba: mostrarAba, gerarServicos: gerarServicos, gerarFinanceiro: gerarFinanceiro, gerarEstoque: gerarEstoque };
})();

// ── CONFIGURAÇÕES ─────────────────────────────────────────
var Config = (function() {

  function carregar() {
    if (Auth.getPerfil() !== 'ADMIN') {
      var p = document.getElementById('page-config');
      if (p) p.innerHTML = '<div class="section"><p class="text-muted">Acesso restrito ao administrador.</p></div>';
      return;
    }
    Utils.loading(true);
    API.post('listarUsuarios', {}).then(function(res) {
      Utils.loading(false);
      if (!res.ok) return;
      renderUsuarios(res.dados || []);
    });
  }

  function renderUsuarios(dados) {
    var tbody = document.getElementById('usr-tbody');
    if (!tbody) return;
    tbody.innerHTML = dados.map(function(u) {
      return '<tr>' +
        '<td>' + (u.nome    || '') + '</td>' +
        '<td>' + (u.usuario || '') + '</td>' +
        '<td><span class="badge badge-' + (u.perfil === 'ADMIN' ? 'blue' : 'green') + '">' + (u.perfil || '') + '</span></td>' +
        '<td><span class="badge badge-' + (String(u.ativo) === 'TRUE' ? 'green' : 'red') + '">' + (String(u.ativo) === 'TRUE' ? 'Ativo' : 'Inativo') + '</span></td>' +
        '<td>' + (u.ultimo_acesso || '') + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-secondary" onclick="Config.editarUsuario(\'' + u.id + '\')">Editar</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function novoUsuario() {
    Utils.limparForm('form-usuario');
    document.getElementById('usr-form-id').value = '';
    document.getElementById('modal-usr-titulo').textContent = 'Novo Usuário';
    Utils.abrirModal('modal-usuario');
  }

  function editarUsuario(id) {
    Utils.loading(true);
    API.post('listarUsuarios', {}).then(function(res) {
      Utils.loading(false);
      if (!res.ok) return;
      var u = (res.dados || []).filter(function(x) { return x.id === id; })[0];
      if (!u) return;
      document.getElementById('modal-usr-titulo').textContent = 'Editar Usuário';
      Utils.preencherForm('form-usuario', u);
      document.getElementById('usr-form-id').value = id;
      Utils.abrirModal('modal-usuario');
    });
  }

  function salvarUsuario() {
    var dados = Utils.getDadosForm('form-usuario');
    dados.id = document.getElementById('usr-form-id').value;
    if (!dados.nome || !dados.usuario || !dados.perfil) {
      Utils.toast('Nome, usuário e perfil são obrigatórios.', 'error'); return;
    }
    Utils.loading(true);
    API.post('salvarUsuario', dados).then(function(res) {
      Utils.loading(false);
      if (res.ok) { Utils.toast(res.mensagem); Utils.fecharModal('modal-usuario'); carregar(); }
      else Utils.toast(res.erro, 'error');
    });
  }

  return { carregar: carregar, novoUsuario: novoUsuario, editarUsuario: editarUsuario, salvarUsuario: salvarUsuario };
})();
