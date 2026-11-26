// Cliente HTTP compartilhado para a YouTube Data API v3.
// Centraliza configuração (.env), autenticação, timeout e tradução de erros.

const TIMEOUT_PADRAO_MS = 10000;

/**
 * Cria um Error com status HTTP a ser devolvido ao cliente da nossa API.
 * @param {string} mensagem
 * @param {number} status
 * @param {object} [detalhes]
 */
function criarErro(mensagem, status, detalhes) {
  const erro = new Error(mensagem);
  erro.status = status;
  if (detalhes !== undefined) {
    erro.detalhes = detalhes;
  }
  return erro;
}

function obterUrlBase() {
  const urlBase = process.env.YOUTUBE_API_BASE_URL?.trim();
  if (!urlBase) {
    throw criarErro('Configure YOUTUBE_API_BASE_URL no .env.', 503);
  }

  try {
    // Garante a barra final para que new URL('videos', base) não descarte o último segmento.
    return new URL(urlBase.endsWith('/') ? urlBase : `${urlBase}/`);
  } catch {
    throw criarErro('YOUTUBE_API_BASE_URL no .env não é uma URL válida.', 503);
  }
}

/**
 * Monta a URL de um recurso a partir de YOUTUBE_API_BASE_URL.
 * Com `upload: true`, usa o endpoint de mídia (/upload/youtube/v3/...).
 * Parâmetros vazios (undefined, null, '') são ignorados.
 */
function montarUrl(recurso, parametros = {}, { upload = false } = {}) {
  const base = obterUrlBase();
  if (upload) {
    base.pathname = `/upload${base.pathname}`;
  }

  const url = new URL(recurso, base);
  for (const [nome, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(nome, String(valor));
    }
  }
  return url;
}

/**
 * Cabeçalhos de autenticação: token OAuth 2.0 quando informado,
 * senão a chave de API (suficiente apenas para leituras públicas).
 */
function autenticacao(tokenAcesso) {
  if (tokenAcesso) {
    return { Authorization: `Bearer ${tokenAcesso}` };
  }

  const chave = process.env.YOUTUBE_API_KEY?.trim();
  if (!chave) {
    throw criarErro('Configure YOUTUBE_API_KEY no .env.', 503);
  }
  return { 'x-goog-api-key': chave };
}

function erroDeRede(erro) {
  if (erro.name === 'TimeoutError') {
    return criarErro('Tempo esgotado ao chamar a API do YouTube.', 504);
  }
  return criarErro('Falha de comunicação com a API do YouTube.', 502, { cause: erro.message });
}

// Converte uma resposta não-2xx do YouTube ({ error: { code, message, errors: [{ reason }] } }).
async function erroDaResposta(resposta) {
  let corpo = null;
  try {
    corpo = await resposta.json();
  } catch {
    // corpo ausente ou não-JSON: segue com a mensagem genérica
  }

  const erroApi = corpo?.error;
  const detalhes = { youtubeStatus: resposta.status };
  if (erroApi?.errors?.[0]?.reason) {
    detalhes.reason = erroApi.errors[0].reason;
  }

  // Erros 5xx do YouTube viram 502 (falha do serviço upstream); 4xx são repassados.
  const status = resposta.status >= 500 ? 502 : resposta.status;
  const mensagem = erroApi?.message || `A API do YouTube respondeu com HTTP ${resposta.status}.`;
  return criarErro(mensagem, status, detalhes);
}

/**
 * Executa uma requisição à API do YouTube e lança erro (com .status) em falhas.
 * @returns {Promise<Response>} resposta 2xx
 */
async function requisitar(url, { metodo = 'GET', cabecalhos = {}, corpo, timeoutMs = TIMEOUT_PADRAO_MS } = {}) {
  const opcoes = {
    method: metodo,
    headers: cabecalhos,
    body: corpo,
    signal: AbortSignal.timeout(timeoutMs)
  };

  // Corpos em stream (ex.: upload de vídeo) exigem duplex 'half' no fetch do Node.
  if (corpo && typeof corpo[Symbol.asyncIterator] === 'function') {
    opcoes.duplex = 'half';
  }

  let resposta;
  try {
    resposta = await fetch(url, opcoes);
  } catch (erro) {
    throw erroDeRede(erro);
  }

  if (!resposta.ok) {
    throw await erroDaResposta(resposta);
  }
  return resposta;
}

async function lerJson(resposta) {
  try {
    return await resposta.json();
  } catch (erro) {
    if (erro.name === 'TimeoutError') {
      throw erroDeRede(erro);
    }
    throw criarErro('Resposta inválida da API do YouTube.', 502);
  }
}

module.exports = { criarErro, montarUrl, autenticacao, requisitar, lerJson };
