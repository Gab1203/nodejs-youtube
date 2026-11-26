# nodejs-youtube

API em Node.js para consultar e gerenciar recursos da YouTube Data API v3.

O projeto oferece rotas para buscas, canais, vídeos, comentários, inscrições e dados da conta autenticada. A documentação das rotas pode ser acessada pelo Swagger.

## Requisitos

- Node.js 20.12 ou mais recente
- Uma chave da YouTube Data API v3
- Um token OAuth 2.0 do Google para rotas privadas

## Instalação

```powershell
npm install
```

## Configuração

Copie o arquivo de exemplo:

```powershell
Copy-Item env-example .env
```

Configure as variáveis no `.env`:

```env
YOUTUBE_API_KEY=sua_chave_da_api
YOUTUBE_API_BASE_URL=https://www.googleapis.com/youtube/v3/
```

Não publique a chave ou o token OAuth no repositório.

## Executar

```powershell
npm start
```

A aplicação ficará disponível em:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs/`

## Uso rápido

Buscar vídeos:

```powershell
curl "http://localhost:3000/api/search?q=nodejs"
```

Consultar um vídeo:

```powershell
curl "http://localhost:3000/api/videos/dQw4w9WgXcQ"
```

Consultar vídeos populares:

```powershell
curl "http://localhost:3000/api/feed/popular"
```

## Autenticação OAuth

As rotas públicas usam `YOUTUBE_API_KEY`.

As rotas privadas exigem um token OAuth no cabeçalho:

```text
Authorization: Bearer SEU_ACCESS_TOKEN
```

Exemplo:

```powershell
curl -H "Authorization: Bearer SEU_ACCESS_TOKEN" `
  "http://localhost:3000/api/users/me/channels"
```

O token precisa possuir os escopos correspondentes às operações solicitadas no Google Cloud.

## Estrutura

- `api/server.js`: configuração do Express e registro das rotas
- `api/controller/`: validação das requisições e respostas HTTP
- `api/service/`: integração com a YouTube Data API
- `api/util/`: cliente HTTP e configuração do Swagger

## Testes

```powershell
npm test
```

## Observação

O módulo legado `youtube-feeds.js` utiliza a API v2 antiga e não é a implementação usada pela API atual em `api/`.