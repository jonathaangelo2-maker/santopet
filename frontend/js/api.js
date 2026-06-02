// ============================================================
// SANTOPET — API Client (comunicação com Google Apps Script)
// ============================================================

var API = (function() {
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbwskFDW8Swt_BWaZjPOK26eB1YTHikG1IZBe8B0mq3HbY_kfjrm9JUTk3pjFz299rby6w/exec'; // <<< Preencher após publicar o GAS

  function getToken() {
    return sessionStorage.getItem('sp_token') || '';
  }

  function getUsuario() {
    return sessionStorage.getItem('sp_usuario') || '';
  }

  function get(action, params) {
    params = params || {};
    params.action = action;
    params.token  = getToken();

    var query = Object.keys(params).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');

    return fetch(GAS_URL + '?' + query)
      .then(function(r) { return r.json(); })
      .catch(function() { return { ok: false, erro: 'Erro de conexão.' }; });
  }

  function post(action, dados) {
    var body = { action: action, token: getToken(), usuario: getUsuario() };
    if (dados) body.dados = dados;

    return fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    .then(function(r) { return r.json(); })
    .catch(function() { return { ok: false, erro: 'Erro de conexão.' }; });
  }

  function setUrl(url) { GAS_URL = url; }

  return { get: get, post: post, setUrl: setUrl, getToken: getToken, getUsuario: getUsuario };
})();
