// ============================================================
// SANTOPET — Autenticação e Roteamento
// ============================================================

var Auth = (function() {

  function isLogado() {
    return !!sessionStorage.getItem('sp_token');
  }

  function getPerfil() {
    return sessionStorage.getItem('sp_perfil') || '';
  }

  function login(usuario, senha, callback) {
    Utils.loading(true);
    API.get('login', { usuario: usuario, senha: senha }).then(function(res) {
      Utils.loading(false);
      if (res.ok) {
        sessionStorage.setItem('sp_token',   res.token);
        sessionStorage.setItem('sp_usuario', res.usuario);
        sessionStorage.setItem('sp_nome',    res.nome);
        sessionStorage.setItem('sp_perfil',  res.perfil);
        callback(true, res);
      } else {
        callback(false, res);
      }
    });
  }

  function logout() {
    sessionStorage.clear();
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-page').style.display = 'flex';
  }

  function verificarAcesso() {
    if (!isLogado()) {
      logout();
      return false;
    }
    return true;
  }

  return { isLogado: isLogado, getPerfil: getPerfil, login: login, logout: logout, verificarAcesso: verificarAcesso };
})();

// ============================================================
// ROTEADOR DE PÁGINAS
// ============================================================

var Router = (function() {
  var paginaAtual = '';

  function ir(pagina) {
    if (!Auth.verificarAcesso()) return;

    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('#sidebar nav a').forEach(function(a) { a.classList.remove('active'); });

    var pEl = document.getElementById('page-' + pagina);
    if (pEl) pEl.classList.add('active');

    var aEl = document.querySelector('#sidebar nav a[data-page="' + pagina + '"]');
    if (aEl) aEl.classList.add('active');

    paginaAtual = pagina;

    // Carregar dados da página
    switch(pagina) {
      case 'dashboard':   Dashboard.carregar();   break;
      case 'clientes':    Clientes.carregar();    break;
      case 'servicos':    Servicos.carregar();    break;
      case 'receitas':    Receitas.carregar();    break;
      case 'despesas':    Despesas.carregar();    break;
      case 'estoque':     Estoque.carregar();     break;
      case 'relatorios':  Relatorios.carregar();  break;
      case 'config':      Config.carregar();      break;
    }
  }

  return { ir: ir, atual: function() { return paginaAtual; } };
})();
