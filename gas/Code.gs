// ============================================================
// SANTOPET — Google Apps Script Backend
// Versão: 1.0.0
// ============================================================

var SPREADSHEET_ID = '1cLFMxnBN6eZFEn14KVzFRyiFs2FwfIpnzkyTm49w0co';
// SECRET_KEY lido das Propriedades do Script (Configurações do projeto → Propriedades do script)
// Para definir: no GAS, vá em Projeto → Configurações → Propriedades do script → adicione SECRET_KEY
var SECRET_KEY = PropertiesService.getScriptProperties().getProperty('SECRET_KEY') || 'santopet2026secretkey';

// ============================================================
// ROTEADOR PRINCIPAL
// ============================================================

function doGet(e) {
  var params = e.parameter;
  var action = params.action || '';
  var token  = params.token  || '';

  try {
    if (action === 'login') return respond(handleLogin(params));

    if (!validarToken(token)) return respond({ ok: false, erro: 'Sessão inválida ou expirada.' });

    switch (action) {
      // Clientes
      case 'listarClientes':       return respond(listarClientes(params));
      case 'buscarCliente':        return respond(buscarCliente(params));
      // Serviços
      case 'listarServicos':       return respond(listarServicos(params));
      // Financeiro
      case 'listarReceitas':       return respond(listarReceitas(params));
      case 'listarDespesas':       return respond(listarDespesas(params));
      case 'resumoFinanceiro':     return respond(resumoFinanceiro(params));
      // Estoque
      case 'listarEstoque':        return respond(listarEstoque(params));
      case 'listarMovimentacoes':  return respond(listarMovimentacoes(params));
      // Relatórios
      case 'relatorioServicos':    return respond(relatorioServicos(params));
      case 'relatorioFinanceiro':  return respond(relatorioFinanceiro(params));
      case 'relatorioEstoque':     return respond(relatorioEstoque(params));
      // Dashboard
      case 'dashboard':            return respond(getDashboard(params));
      // Config
      case 'getConfig':            return respond(getConfig());
      default:                     return respond({ ok: false, erro: 'Ação inválida.' });
    }
  } catch (err) {
    registrarLog('SISTEMA', 'ERROR', 'doGet', err.toString(), '', '');
    return respond({ ok: false, erro: 'Erro interno: ' + err.toString() });
  }
}

function doPost(e) {
  var dados;
  try {
    dados = JSON.parse(e.postData.contents);
  } catch (err) {
    return respond({ ok: false, erro: 'JSON inválido.' });
  }

  var action = dados.action || '';
  var token  = dados.token  || '';

  try {
    if (action === 'login') return respond(handleLogin(dados));

    if (!validarToken(token)) return respond({ ok: false, erro: 'Sessão inválida ou expirada.' });

    var usuario = dados.usuario || '';

    switch (action) {
      // Clientes
      case 'salvarCliente':        return respond(salvarCliente(dados, usuario));
      case 'excluirCliente':       return respond(excluirCliente(dados, usuario));
      // Serviços
      case 'salvarServico':        return respond(salvarServico(dados, usuario));
      case 'excluirServico':       return respond(excluirServico(dados, usuario));
      // Financeiro
      case 'salvarReceita':        return respond(salvarReceita(dados, usuario));
      case 'excluirReceita':       return respond(excluirReceita(dados, usuario));
      case 'salvarDespesa':        return respond(salvarDespesa(dados, usuario));
      case 'excluirDespesa':       return respond(excluirDespesa(dados, usuario));
      // Estoque
      case 'salvarProduto':        return respond(salvarProduto(dados, usuario));
      case 'excluirProduto':       return respond(excluirProduto(dados, usuario));
      case 'movimentarEstoque':    return respond(movimentarEstoque(dados, usuario));
      // Usuários (admin)
      case 'listarUsuarios':       return respond(listarUsuarios(dados, usuario));
      case 'salvarUsuario':        return respond(salvarUsuario(dados, usuario));
      default:                     return respond({ ok: false, erro: 'Ação inválida.' });
    }
  } catch (err) {
    registrarLog('SISTEMA', 'ERROR', 'doPost:' + action, err.toString(), '', '');
    return respond({ ok: false, erro: 'Erro interno: ' + err.toString() });
  }
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// UTILITÁRIOS
// ============================================================

function getSheet(nome) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(nome);
  if (!sh) throw new Error('Aba não encontrada: ' + nome);
  return sh;
}

function gerarId(prefixo) {
  return prefixo + new Date().getTime().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
}

function agora() {
  return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm:ss');
}

function hoje() {
  return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
}

function sheetParaObjetos(sheet) {
  var dados = sheet.getDataRange().getValues();
  if (dados.length < 2) return [];
  var cabecalho = dados[0];
  var resultado = [];
  for (var i = 1; i < dados.length; i++) {
    var obj = {};
    for (var j = 0; j < cabecalho.length; j++) {
      var val = dados[i][j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, 'America/Sao_Paulo', 'yyyy-MM-dd');
      }
      obj[cabecalho[j]] = val;
    }
    resultado.push(obj);
  }
  return resultado;
}

function encontrarLinha(sheet, colIndex, valor) {
  var dados = sheet.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][colIndex]) === String(valor)) return i + 1;
  }
  return -1;
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================

function hashSenha(senha) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    senha + SECRET_KEY,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function gerarToken(usuario, perfil) {
  var payload = usuario + '|' + perfil + '|' + new Date().getTime();
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    payload + SECRET_KEY,
    Utilities.Charset.UTF_8
  );
  var hash = bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
  var token = Utilities.base64Encode(payload) + '.' + hash.substr(0, 16);
  var cache = CacheService.getScriptCache();
  cache.put('token_' + token, JSON.stringify({ usuario: usuario, perfil: perfil }), 28800); // 8h
  return token;
}

function validarToken(token) {
  if (!token) return false;
  var cache = CacheService.getScriptCache();
  var dados = cache.get('token_' + token);
  return dados !== null;
}

function getDadosToken(token) {
  var cache = CacheService.getScriptCache();
  var dados = cache.get('token_' + token);
  if (!dados) return null;
  return JSON.parse(dados);
}

function handleLogin(params) {
  var usuario = (params.usuario || '').trim().toLowerCase();
  var senha    = params.senha || '';

  if (!usuario || !senha) return { ok: false, erro: 'Usuário e senha são obrigatórios.' };

  // Rate limiting: máx 5 tentativas em 15 minutos por usuário
  var cache = CacheService.getScriptCache();
  var chaveRl = 'rl_' + usuario;
  var tentativas = parseInt(cache.get(chaveRl) || '0');
  if (tentativas >= 5) {
    return { ok: false, erro: 'Conta bloqueada temporariamente. Tente novamente em 15 minutos.' };
  }

  var sheet = getSheet('Usuarios');
  var registros = sheetParaObjetos(sheet);
  var hash = hashSenha(senha);

  for (var i = 0; i < registros.length; i++) {
    var u = registros[i];
    if (String(u.usuario).toLowerCase() === usuario && String(u.senha_hash) === hash && String(u.ativo).toUpperCase() === 'TRUE') {
      cache.remove(chaveRl); // Limpa contador de falhas
      var token = gerarToken(u.usuario, u.perfil);
      // Atualiza último acesso
      var linha = encontrarLinha(sheet, 2, u.usuario); // col C = índice 2
      if (linha > 0) sheet.getRange(linha, 8).setValue(agora()); // col H
      registrarLog(u.usuario, 'LOGIN', 'Autenticacao', 'Login realizado', '', '');
      return { ok: true, token: token, usuario: u.usuario, nome: u.nome, perfil: u.perfil };
    }
  }

  // Incrementa contador de falhas
  cache.put(chaveRl, String(tentativas + 1), 900); // 15 minutos
  registrarLog(usuario, 'LOGIN_FALHA', 'Autenticacao', 'Tentativa ' + (tentativas + 1) + ' inválida', '', '');
  return { ok: false, erro: 'Usuário ou senha inválidos.' };
}

// ============================================================
// LOGS
// ============================================================

function registrarLog(usuario, acao, modulo, descricao, dadoAnterior, dadoNovo) {
  try {
    var sheet = getSheet('Logs');
    sheet.appendRow([
      gerarId('LOG'),
      agora(),
      usuario,
      acao,
      modulo,
      descricao,
      dadoAnterior,
      dadoNovo
    ]);
  } catch(e) { /* silencioso */ }
}

// ============================================================
// CLIENTES
// ============================================================

function listarClientes(params) {
  var sheet = getSheet('Clientes');
  var todos = sheetParaObjetos(sheet);
  var ativos = todos.filter(function(c) { return String(c.ativo).toUpperCase() === 'TRUE'; });

  var busca = (params.busca || '').toLowerCase();
  if (busca) {
    ativos = ativos.filter(function(c) {
      return String(c.nome_cliente).toLowerCase().indexOf(busca) >= 0 ||
             String(c.nome_animal).toLowerCase().indexOf(busca) >= 0 ||
             String(c.telefone).toLowerCase().indexOf(busca) >= 0;
    });
  }

  var pagina = parseInt(params.pagina || '1');
  var porPagina = parseInt(params.porPagina || '20');
  var inicio = (pagina - 1) * porPagina;
  var total = ativos.length;
  var resultado = ativos.slice(inicio, inicio + porPagina);

  return { ok: true, dados: resultado, total: total, pagina: pagina, porPagina: porPagina };
}

function buscarCliente(params) {
  var id = params.id || '';
  var sheet = getSheet('Clientes');
  var todos = sheetParaObjetos(sheet);
  var cliente = todos.filter(function(c) { return c.id === id; })[0];
  if (!cliente) return { ok: false, erro: 'Cliente não encontrado.' };
  return { ok: true, dados: cliente };
}

function salvarCliente(dados, usuario) {
  var sheet = getSheet('Clientes');
  var d = dados.dados;

  if (!d.nome_cliente) return { ok: false, erro: 'Nome do cliente é obrigatório.' };

  if (d.id) {
    // Edição
    var linha = encontrarLinha(sheet, 0, d.id);
    if (linha < 0) return { ok: false, erro: 'Cliente não encontrado.' };
    var anterior = sheet.getRange(linha, 1, 1, 11).getValues()[0].join('|');
    sheet.getRange(linha, 2).setValue(d.nome_cliente);
    sheet.getRange(linha, 3).setValue(d.nome_animal || '');
    sheet.getRange(linha, 4).setValue(d.especie || '');
    sheet.getRange(linha, 5).setValue(d.raca || '');
    sheet.getRange(linha, 6).setValue(d.telefone || '');
    sheet.getRange(linha, 7).setValue(d.whatsapp || '');
    sheet.getRange(linha, 8).setValue(d.observacoes || '');
    registrarLog(usuario, 'UPDATE', 'Clientes', 'Editou cliente ' + d.id, anterior, JSON.stringify(d));
    return { ok: true, mensagem: 'Cliente atualizado.' };
  } else {
    // Novo
    var id = gerarId('CLI');
    sheet.appendRow([
      id, d.nome_cliente, d.nome_animal || '', d.especie || '',
      d.raca || '', d.telefone || '', d.whatsapp || '',
      d.observacoes || '', hoje(), 'TRUE', usuario
    ]);
    registrarLog(usuario, 'INSERT', 'Clientes', 'Novo cliente ' + id, '', JSON.stringify(d));
    return { ok: true, mensagem: 'Cliente cadastrado.', id: id };
  }
}

function excluirCliente(dados, usuario) {
  var id = dados.id;
  var sheet = getSheet('Clientes');
  var linha = encontrarLinha(sheet, 0, id);
  if (linha < 0) return { ok: false, erro: 'Cliente não encontrado.' };
  sheet.getRange(linha, 10).setValue('FALSE'); // col J = ativo
  registrarLog(usuario, 'DELETE', 'Clientes', 'Excluiu cliente ' + id, '', '');
  return { ok: true, mensagem: 'Cliente removido.' };
}

// ============================================================
// SERVIÇOS
// ============================================================

function listarServicos(params) {
  var sheet = getSheet('Servicos');
  var todos = sheetParaObjetos(sheet);

  var dataInicio = params.dataInicio || '';
  var dataFim    = params.dataFim    || '';
  var idCliente  = params.idCliente  || '';
  var busca      = (params.busca || '').toLowerCase();

  var filtrado = todos.filter(function(s) {
    if (dataInicio && s.data < dataInicio) return false;
    if (dataFim    && s.data > dataFim)    return false;
    if (idCliente  && s.id_cliente !== idCliente) return false;
    if (busca && String(s.nome_cliente).toLowerCase().indexOf(busca) < 0 &&
                 String(s.nome_animal).toLowerCase().indexOf(busca) < 0) return false;
    return true;
  });

  // Ordena por data desc
  filtrado.sort(function(a, b) { return b.data > a.data ? 1 : -1; });

  var pagina = parseInt(params.pagina || '1');
  var porPagina = parseInt(params.porPagina || '20');
  var inicio = (pagina - 1) * porPagina;
  var total = filtrado.length;

  return { ok: true, dados: filtrado.slice(inicio, inicio + porPagina), total: total };
}

function salvarServico(dados, usuario) {
  var sheet = getSheet('Servicos');
  var d = dados.dados;

  if (!d.id_cliente || !d.tipo_servico || !d.valor)
    return { ok: false, erro: 'Cliente, tipo de serviço e valor são obrigatórios.' };

  if (d.id) {
    var linha = encontrarLinha(sheet, 0, d.id);
    if (linha < 0) return { ok: false, erro: 'Serviço não encontrado.' };
    var cols = [d.data, d.id_cliente, d.nome_cliente, d.nome_animal,
                d.tipo_servico, d.descricao, parseFloat(d.valor),
                d.forma_pagamento, d.observacoes, usuario, agora()];
    for (var i = 0; i < cols.length; i++) {
      sheet.getRange(linha, i + 2).setValue(cols[i]);
    }
    registrarLog(usuario, 'UPDATE', 'Servicos', 'Editou serviço ' + d.id, '', JSON.stringify(d));
    return { ok: true, mensagem: 'Serviço atualizado.' };
  } else {
    var id = gerarId('SVC');
    sheet.appendRow([
      id, d.data, d.id_cliente, d.nome_cliente, d.nome_animal,
      d.tipo_servico, d.descricao || '', parseFloat(d.valor),
      d.forma_pagamento || '', d.observacoes || '', usuario, agora()
    ]);
    // Gera receita automaticamente
    salvarReceitaInterna({
      data: d.data, id_cliente: d.id_cliente, nome_cliente: d.nome_cliente,
      id_servico: id, descricao: d.tipo_servico + (d.nome_animal ? ' - ' + d.nome_animal : ''),
      valor: parseFloat(d.valor), forma_pagamento: d.forma_pagamento || ''
    }, usuario);
    registrarLog(usuario, 'INSERT', 'Servicos', 'Novo serviço ' + id, '', JSON.stringify(d));
    return { ok: true, mensagem: 'Serviço registrado.', id: id };
  }
}

function excluirServico(dados, usuario) {
  var id = dados.id;
  var sheet = getSheet('Servicos');
  var linha = encontrarLinha(sheet, 0, id);
  if (linha < 0) return { ok: false, erro: 'Serviço não encontrado.' };
  sheet.deleteRow(linha);
  registrarLog(usuario, 'DELETE', 'Servicos', 'Excluiu serviço ' + id, '', '');
  return { ok: true, mensagem: 'Serviço removido.' };
}

// ============================================================
// FINANCEIRO — RECEITAS
// ============================================================

function salvarReceitaInterna(d, usuario) {
  var sheet = getSheet('Receitas');
  var id = gerarId('REC');
  sheet.appendRow([
    id, d.data, d.id_cliente, d.nome_cliente, d.id_servico || '',
    d.descricao, parseFloat(d.valor), d.forma_pagamento, usuario, agora()
  ]);
  return id;
}

function listarReceitas(params) {
  var sheet = getSheet('Receitas');
  var todos = sheetParaObjetos(sheet);
  var dataInicio = params.dataInicio || '';
  var dataFim    = params.dataFim    || '';

  var filtrado = todos.filter(function(r) {
    if (dataInicio && r.data < dataInicio) return false;
    if (dataFim    && r.data > dataFim)    return false;
    return true;
  });
  filtrado.sort(function(a, b) { return b.data > a.data ? 1 : -1; });

  var total = filtrado.reduce(function(s, r) { return s + (parseFloat(r.valor) || 0); }, 0);
  return { ok: true, dados: filtrado, total: total };
}

function salvarReceita(dados, usuario) {
  var d = dados.dados;
  if (!d.valor || !d.data) return { ok: false, erro: 'Data e valor são obrigatórios.' };
  var id = salvarReceitaInterna(d, usuario);
  registrarLog(usuario, 'INSERT', 'Receitas', 'Nova receita ' + id, '', JSON.stringify(d));
  return { ok: true, mensagem: 'Receita salva.', id: id };
}

function excluirReceita(dados, usuario) {
  var id = dados.id;
  var sheet = getSheet('Receitas');
  var linha = encontrarLinha(sheet, 0, id);
  if (linha < 0) return { ok: false, erro: 'Receita não encontrada.' };
  sheet.deleteRow(linha);
  registrarLog(usuario, 'DELETE', 'Receitas', 'Excluiu receita ' + id, '', '');
  return { ok: true, mensagem: 'Receita removida.' };
}

// ============================================================
// FINANCEIRO — DESPESAS
// ============================================================

function listarDespesas(params) {
  var sheet = getSheet('Despesas');
  var todos = sheetParaObjetos(sheet);
  var dataInicio = params.dataInicio || '';
  var dataFim    = params.dataFim    || '';

  var filtrado = todos.filter(function(d) {
    if (dataInicio && d.data < dataInicio) return false;
    if (dataFim    && d.data > dataFim)    return false;
    return true;
  });
  filtrado.sort(function(a, b) { return b.data > a.data ? 1 : -1; });

  var total = filtrado.reduce(function(s, d) { return s + (parseFloat(d.valor) || 0); }, 0);
  return { ok: true, dados: filtrado, total: total };
}

function salvarDespesa(dados, usuario) {
  var sheet = getSheet('Despesas');
  var d = dados.dados;
  if (!d.valor || !d.data || !d.categoria) return { ok: false, erro: 'Data, categoria e valor são obrigatórios.' };

  if (d.id) {
    var linha = encontrarLinha(sheet, 0, d.id);
    if (linha < 0) return { ok: false, erro: 'Despesa não encontrada.' };
    sheet.getRange(linha, 2).setValue(d.data);
    sheet.getRange(linha, 3).setValue(d.categoria);
    sheet.getRange(linha, 4).setValue(d.descricao || '');
    sheet.getRange(linha, 5).setValue(parseFloat(d.valor));
    sheet.getRange(linha, 6).setValue(d.observacao || '');
    registrarLog(usuario, 'UPDATE', 'Despesas', 'Editou despesa ' + d.id, '', JSON.stringify(d));
    return { ok: true, mensagem: 'Despesa atualizada.' };
  } else {
    var id = gerarId('DSP');
    sheet.appendRow([id, d.data, d.categoria, d.descricao || '',
                     parseFloat(d.valor), d.observacao || '', usuario, agora()]);
    registrarLog(usuario, 'INSERT', 'Despesas', 'Nova despesa ' + id, '', JSON.stringify(d));
    return { ok: true, mensagem: 'Despesa salva.', id: id };
  }
}

function excluirDespesa(dados, usuario) {
  var id = dados.id;
  var sheet = getSheet('Despesas');
  var linha = encontrarLinha(sheet, 0, id);
  if (linha < 0) return { ok: false, erro: 'Despesa não encontrada.' };
  sheet.deleteRow(linha);
  registrarLog(usuario, 'DELETE', 'Despesas', 'Excluiu despesa ' + id, '', '');
  return { ok: true, mensagem: 'Despesa removida.' };
}

function resumoFinanceiro(params) {
  var dataInicio = params.dataInicio || '';
  var dataFim    = params.dataFim    || '';
  var rec = listarReceitas({ dataInicio: dataInicio, dataFim: dataFim });
  var desp = listarDespesas({ dataInicio: dataInicio, dataFim: dataFim });
  var lucro = rec.total - desp.total;
  return { ok: true, receitas: rec.total, despesas: desp.total, lucro: lucro };
}

// ============================================================
// ESTOQUE
// ============================================================

function listarEstoque(params) {
  var sheet = getSheet('Estoque');
  var todos = sheetParaObjetos(sheet);
  var ativos = todos.filter(function(p) { return String(p.ativo).toUpperCase() === 'TRUE'; });

  var busca = (params.busca || '').toLowerCase();
  if (busca) {
    ativos = ativos.filter(function(p) {
      return String(p.produto).toLowerCase().indexOf(busca) >= 0 ||
             String(p.categoria).toLowerCase().indexOf(busca) >= 0;
    });
  }

  var alertas = ativos.filter(function(p) {
    return parseFloat(p.quantidade_atual) <= parseFloat(p.quantidade_minima);
  });

  return { ok: true, dados: ativos, alertas: alertas.length };
}

function salvarProduto(dados, usuario) {
  var sheet = getSheet('Estoque');
  var d = dados.dados;
  if (!d.produto) return { ok: false, erro: 'Nome do produto é obrigatório.' };

  if (d.id) {
    var linha = encontrarLinha(sheet, 0, d.id);
    if (linha < 0) return { ok: false, erro: 'Produto não encontrado.' };
    sheet.getRange(linha, 2).setValue(d.produto);
    sheet.getRange(linha, 3).setValue(d.categoria || '');
    sheet.getRange(linha, 5).setValue(parseFloat(d.quantidade_minima) || 0);
    sheet.getRange(linha, 6).setValue(parseFloat(d.valor_compra) || 0);
    sheet.getRange(linha, 7).setValue(parseFloat(d.valor_venda) || 0);
    sheet.getRange(linha, 8).setValue(d.fornecedor || '');
    registrarLog(usuario, 'UPDATE', 'Estoque', 'Editou produto ' + d.id, '', JSON.stringify(d));
    return { ok: true, mensagem: 'Produto atualizado.' };
  } else {
    var id = gerarId('PRD');
    sheet.appendRow([
      id, d.produto, d.categoria || '', parseFloat(d.quantidade_atual) || 0,
      parseFloat(d.quantidade_minima) || 0, parseFloat(d.valor_compra) || 0,
      parseFloat(d.valor_venda) || 0, d.fornecedor || '', 'TRUE', hoje()
    ]);
    registrarLog(usuario, 'INSERT', 'Estoque', 'Novo produto ' + id, '', JSON.stringify(d));
    return { ok: true, mensagem: 'Produto cadastrado.', id: id };
  }
}

function excluirProduto(dados, usuario) {
  var id = dados.id;
  var sheet = getSheet('Estoque');
  var linha = encontrarLinha(sheet, 0, id);
  if (linha < 0) return { ok: false, erro: 'Produto não encontrado.' };
  sheet.getRange(linha, 9).setValue('FALSE');
  registrarLog(usuario, 'DELETE', 'Estoque', 'Excluiu produto ' + id, '', '');
  return { ok: true, mensagem: 'Produto removido.' };
}

function movimentarEstoque(dados, usuario) {
  var d = dados.dados;
  if (!d.id_produto || !d.tipo || !d.quantidade)
    return { ok: false, erro: 'Produto, tipo e quantidade são obrigatórios.' };

  var sheetEstoque = getSheet('Estoque');
  var linhaEstoque = encontrarLinha(sheetEstoque, 0, d.id_produto);
  if (linhaEstoque < 0) return { ok: false, erro: 'Produto não encontrado.' };

  var qtdAtual = parseFloat(sheetEstoque.getRange(linhaEstoque, 4).getValue()) || 0;
  var qtd = parseFloat(d.quantidade);
  var novaQtd;

  if (d.tipo === 'ENTRADA') {
    novaQtd = qtdAtual + qtd;
  } else if (d.tipo === 'SAIDA') {
    if (qtdAtual < qtd) return { ok: false, erro: 'Quantidade insuficiente em estoque.' };
    novaQtd = qtdAtual - qtd;
  } else if (d.tipo === 'AJUSTE') {
    novaQtd = qtd;
  } else {
    return { ok: false, erro: 'Tipo inválido. Use ENTRADA, SAIDA ou AJUSTE.' };
  }

  sheetEstoque.getRange(linhaEstoque, 4).setValue(novaQtd);

  var sheetMov = getSheet('MovimentacoesEstoque');
  sheetMov.appendRow([
    gerarId('MOV'), hoje(), d.id_produto, d.nome_produto || '',
    d.tipo, qtd, d.motivo || '', usuario, agora()
  ]);

  registrarLog(usuario, 'ESTOQUE_' + d.tipo, 'Estoque', d.id_produto + ' qtd: ' + qtdAtual + ' -> ' + novaQtd, '', '');
  return { ok: true, mensagem: 'Estoque atualizado.', quantidade_atual: novaQtd };
}

function listarMovimentacoes(params) {
  var sheet = getSheet('MovimentacoesEstoque');
  var todos = sheetParaObjetos(sheet);
  var idProduto = params.idProduto || '';
  if (idProduto) {
    todos = todos.filter(function(m) { return m.id_produto === idProduto; });
  }
  todos.sort(function(a, b) { return b.data > a.data ? 1 : -1; });
  return { ok: true, dados: todos };
}

// ============================================================
// DASHBOARD
// ============================================================

function getDashboard() {
  var hojeStr = hoje();
  var primeiroDiaMes = hojeStr.substr(0, 7) + '-01';

  // Serviços de hoje
  var shSvc = getSheet('Servicos');
  var servicos = sheetParaObjetos(shSvc);
  var svcHoje = servicos.filter(function(s) { return s.data === hojeStr; });

  // Resumo financeiro do mês
  var resumo = resumoFinanceiro({ dataInicio: primeiroDiaMes, dataFim: hojeStr });

  // Alertas de estoque
  var estoque = listarEstoque({});

  // Últimos 5 atendimentos
  var ultimos = servicos.sort(function(a, b) { return b.data_registro > a.data_registro ? 1 : -1; }).slice(0, 5);

  return {
    ok: true,
    servicos_hoje: svcHoje.length,
    receita_hoje: svcHoje.reduce(function(s, r) { return s + (parseFloat(r.valor) || 0); }, 0),
    receita_mes: resumo.receitas,
    despesas_mes: resumo.despesas,
    lucro_mes: resumo.lucro,
    alertas_estoque: estoque.alertas,
    ultimos_atendimentos: ultimos
  };
}

// ============================================================
// RELATÓRIOS
// ============================================================

function relatorioServicos(params) {
  var sheet = getSheet('Servicos');
  var todos = sheetParaObjetos(sheet);
  var dataInicio = params.dataInicio || '';
  var dataFim    = params.dataFim    || '';

  var filtrado = todos.filter(function(s) {
    if (dataInicio && s.data < dataInicio) return false;
    if (dataFim    && s.data > dataFim)    return false;
    return true;
  });

  var totalValor = filtrado.reduce(function(s, r) { return s + (parseFloat(r.valor) || 0); }, 0);

  // Agrupado por tipo
  var porTipo = {};
  filtrado.forEach(function(s) {
    var t = s.tipo_servico || 'Outros';
    if (!porTipo[t]) porTipo[t] = { quantidade: 0, valor: 0 };
    porTipo[t].quantidade++;
    porTipo[t].valor += parseFloat(s.valor) || 0;
  });

  return { ok: true, dados: filtrado, total_valor: totalValor, por_tipo: porTipo, total_registros: filtrado.length };
}

function relatorioFinanceiro(params) {
  var dataInicio = params.dataInicio || '';
  var dataFim    = params.dataFim    || '';
  var rec  = listarReceitas({ dataInicio: dataInicio, dataFim: dataFim });
  var desp = listarDespesas({ dataInicio: dataInicio, dataFim: dataFim });

  // Despesas por categoria
  var porCategoria = {};
  (desp.dados || []).forEach(function(d) {
    var c = d.categoria || 'Outros';
    if (!porCategoria[c]) porCategoria[c] = 0;
    porCategoria[c] += parseFloat(d.valor) || 0;
  });

  return {
    ok: true,
    receitas: rec.total,
    despesas: desp.total,
    lucro: rec.total - desp.total,
    dados_receitas: rec.dados,
    dados_despesas: desp.dados,
    despesas_por_categoria: porCategoria
  };
}

function relatorioEstoque(params) {
  var sheet = getSheet('Estoque');
  var todos = sheetParaObjetos(sheet).filter(function(p) { return String(p.ativo).toUpperCase() === 'TRUE'; });
  var abaixoMinimo = todos.filter(function(p) {
    return parseFloat(p.quantidade_atual) <= parseFloat(p.quantidade_minima);
  });
  var valorTotalEstoque = todos.reduce(function(s, p) {
    return s + (parseFloat(p.quantidade_atual) * parseFloat(p.valor_compra) || 0);
  }, 0);
  return { ok: true, dados: todos, abaixo_minimo: abaixoMinimo, valor_total: valorTotalEstoque };
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================

function getConfig() {
  try {
    var sheet = getSheet('Configuracoes');
    var dados = sheet.getDataRange().getValues();
    var config = {};
    for (var i = 0; i < dados.length; i++) {
      config[dados[i][0]] = dados[i][1];
    }
    return { ok: true, config: config };
  } catch(e) {
    return { ok: true, config: {} };
  }
}

// ============================================================
// USUÁRIOS (somente ADMIN)
// ============================================================

function listarUsuarios(dados, usuario) {
  var tokenData = getDadosToken(dados.token);
  if (!tokenData || tokenData.perfil !== 'ADMIN')
    return { ok: false, erro: 'Acesso negado.' };
  var sheet = getSheet('Usuarios');
  var todos = sheetParaObjetos(sheet);
  // Remove senha_hash da resposta
  todos.forEach(function(u) { delete u.senha_hash; });
  return { ok: true, dados: todos };
}

function salvarUsuario(dados, usuario) {
  var tokenData = getDadosToken(dados.token);
  if (!tokenData || tokenData.perfil !== 'ADMIN')
    return { ok: false, erro: 'Acesso negado.' };

  var sheet = getSheet('Usuarios');
  var d = dados.dados;
  if (!d.usuario || !d.nome || !d.perfil)
    return { ok: false, erro: 'Nome, usuário e perfil são obrigatórios.' };

  if (d.id) {
    var linha = encontrarLinha(sheet, 0, d.id);
    if (linha < 0) return { ok: false, erro: 'Usuário não encontrado.' };
    sheet.getRange(linha, 2).setValue(d.nome);
    sheet.getRange(linha, 3).setValue(d.usuario.toLowerCase());
    if (d.senha) sheet.getRange(linha, 4).setValue(hashSenha(d.senha));
    sheet.getRange(linha, 5).setValue(d.perfil);
    sheet.getRange(linha, 6).setValue(d.ativo !== false ? 'TRUE' : 'FALSE');
    registrarLog(usuario, 'UPDATE', 'Usuarios', 'Editou usuário ' + d.id, '', '');
    return { ok: true, mensagem: 'Usuário atualizado.' };
  } else {
    if (!d.senha) return { ok: false, erro: 'Senha é obrigatória para novo usuário.' };
    var id = gerarId('USR');
    sheet.appendRow([id, d.nome, d.usuario.toLowerCase(), hashSenha(d.senha),
                     d.perfil, 'TRUE', hoje(), '']);
    registrarLog(usuario, 'INSERT', 'Usuarios', 'Novo usuário ' + id, '', '');
    return { ok: true, mensagem: 'Usuário criado.', id: id };
  }
}

// ============================================================
// BACKUP AUTOMÁTICO (agendar via Triggers no GAS)
// ============================================================

function backupSemanal() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var nome = 'Backup_SantoPet_' + hoje();
  ss.copy(nome);
  registrarLog('SISTEMA', 'BACKUP', 'Sistema', 'Backup criado: ' + nome, '', '');
}
