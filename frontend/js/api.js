// ============================================================
// SANTOPET — API Client (comunicação com Google Apps Script)
// ============================================================

var API = (function() {
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbwkV_d8hnFLaCdVeaXh1PjTjT6UerEMiikbz3EsuwNH5Xg6mFDH_5I9dRZiqAnWbmX-9A/exec'; // <<< Preencher após publicar o GAS

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
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body)
    })
    .then(function(r) { return r.json(); })
    .catch(function() { return { ok: false, erro: 'Erro de conexão.' }; });
  }

  function setUrl(url) { GAS_URL = url; }

  return { get: get, post: post, setUrl: setUrl, getToken: getToken, getUsuario: getUsuario };
})();
