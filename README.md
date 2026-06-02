# SantoPet — Sistema de Gestão de Pet Shop

Stack: **GitHub Pages** (frontend) + **Google Apps Script** (backend/API) + **Google Sheets** (banco de dados)

---

## Estrutura do Projeto

```
santopet/
├── frontend/
│   ├── index.html          ← Aplicação principal
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js          ← Comunicação com o GAS
│       ├── utils.js        ← Utilitários (toast, modal, etc.)
│       ├── auth.js         ← Autenticação e roteamento
│       └── modules/
│           ├── dashboard.js
│           ├── clientes.js
│           ├── servicos.js
│           ├── financeiro.js
│           ├── estoque.js
│           └── relatorios.js
└── gas/
    └── Code.gs             ← Backend (Google Apps Script)
```

---

## Deploy — Passo a Passo

### ETAPA 1 — Criar o Google Sheets

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma nova planilha
2. Renomeie-a para `SantoPet - Banco de Dados`
3. Crie as seguintes abas (clique no + no canto inferior):

| Aba | Colunas (na linha 1) |
|-----|----------------------|
| `Usuarios` | id, nome, usuario, senha_hash, perfil, ativo, data_cadastro, ultimo_acesso |
| `Clientes` | id, nome_cliente, nome_animal, especie, raca, telefone, whatsapp, observacoes, data_cadastro, ativo, usuario_cadastro |
| `Servicos` | id, data, id_cliente, nome_cliente, nome_animal, tipo_servico, descricao, valor, forma_pagamento, observacoes, usuario_responsavel, data_registro |
| `Receitas` | id, data, id_cliente, nome_cliente, id_servico, descricao, valor, forma_pagamento, usuario_registro, data_registro |
| `Despesas` | id, data, categoria, descricao, valor, observacao, usuario_registro, data_registro |
| `Estoque` | id, produto, categoria, quantidade_atual, quantidade_minima, valor_compra, valor_venda, fornecedor, ativo, data_cadastro |
| `MovimentacoesEstoque` | id, data, id_produto, nome_produto, tipo, quantidade, motivo, usuario, data_registro |
| `Logs` | id, data_hora, usuario, acao, modulo, descricao, dado_anterior, dado_novo |
| `Configuracoes` | chave, valor |

4. Na aba `Configuracoes`, adicione na linha 2: `nome_empresa` | `SantoPet`
5. Copie o **ID da planilha** da URL: `https://docs.google.com/spreadsheets/d/`**`SEU_ID_AQUI`**`/edit`

### ETAPA 2 — Configurar o Google Apps Script

1. Acesse [script.google.com](https://script.google.com)
2. Clique em **Novo projeto**
3. Apague o código padrão e cole o conteúdo de `gas/Code.gs`
4. Na linha 4 do código, preencha o ID da planilha:
   ```javascript
   var SPREADSHEET_ID = 'SEU_ID_DA_PLANILHA_AQUI';
   ```
5. Altere a `SECRET_KEY` para uma chave sua (qualquer texto):
   ```javascript
   var SECRET_KEY = 'minha-chave-secreta-2026';
   ```

### ETAPA 3 — Criar usuário administrador inicial

No editor do GAS, cole este código temporário e **execute uma vez**:

```javascript
function criarAdminInicial() {
  var ss = SpreadsheetApp.openById('SEU_ID_AQUI');
  var sheet = ss.getSheetByName('Usuarios');
  
  // SHA-256 de "admin123" + sua SECRET_KEY
  var senha = 'admin123';
  var secretKey = 'minha-chave-secreta-2026';
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    senha + secretKey,
    Utilities.Charset.UTF_8
  );
  var hash = bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
  
  sheet.appendRow(['USR001', 'Administrador', 'admin', hash, 'ADMIN', 'TRUE', new Date(), '']);
  Logger.log('Usuário admin criado. Senha: admin123');
}
```

> Após executar, **remova este código** e altere a senha no sistema.

### ETAPA 4 — Publicar o GAS como Web App

1. No editor do GAS, clique em **Implantar > Nova implantação**
2. Tipo: **App da Web**
3. Configurações:
   - Executar como: **Eu (seu e-mail)**
   - Quem pode acessar: **Qualquer pessoa**
4. Clique em **Implantar**
5. Copie a **URL do Web App** gerada (algo como `https://script.google.com/macros/s/XXXX/exec`)

### ETAPA 5 — Configurar o Frontend

Abra `frontend/js/api.js` e preencha:

```javascript
var GAS_URL = 'https://script.google.com/macros/s/SEU_ID_AQUI/exec';
```

### ETAPA 6 — Publicar no GitHub Pages

```bash
# No terminal
cd santopet
git init
git add .
git commit -m "Primeiro deploy SantoPet"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/santopet.git
git push -u origin main
```

No repositório GitHub:
1. Vá em **Settings > Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** | Folder: **/frontend**
4. Clique em **Save**

A aplicação ficará disponível em: `https://SEU_USUARIO.github.io/santopet`

---

## Configurar Backup Automático

No GAS, configure um trigger semanal:

1. Clique no ícone de **Relógio (Triggers)** no menu lateral
2. Adicione trigger:
   - Função: `backupSemanal`
   - Evento: **Baseado em tempo > Semana > Domingo > 02:00-03:00**

---

## Acesso Padrão

| Campo | Valor |
|-------|-------|
| URL | `https://SEU_USUARIO.github.io/santopet` |
| Usuário | `admin` |
| Senha | `admin123` (altere após o primeiro acesso) |

---

## Atualizar o Sistema

Para atualizar o frontend:
```bash
git add .
git commit -m "Atualização"
git push
```

Para atualizar o backend (GAS):
1. Edite o `Code.gs` no editor do GAS
2. **Implantar > Gerenciar implantações > Editar > Nova versão > Implantar**

---

## Suporte a Windows 7

O sistema foi testado e funciona com:
- **Chrome 88** (última versão compatível com Win7)
- Conexão de internet básica (3G ou superior)
- Sem instalação necessária — só abrir o navegador

---

## Limites do Google Sheets (referência)

| Recurso | Limite |
|---------|--------|
| Células totais | 10.000.000 |
| Requisições GAS/dia | 20.000 (gratuito) |
| Tamanho max por célula | 50.000 caracteres |
| Execução por request | 6 minutos |

Para um pet shop pequeno (50-200 atendimentos/mês), esses limites **nunca serão atingidos**.
