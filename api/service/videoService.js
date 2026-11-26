// Operações do recurso "videos" da YouTube Data API v3.
// Leitura (videos.list) aceita chave de API; as demais exigem token OAuth 2.0 do usuário.

const { criarErro, montarUrl, autenticacao, requisitar, lerJson } = require('../util/youtubeClient');

const TIMEOUT_UPLOAD_MS = 60 * 60 * 1000;

function exigirToken(tokenAcesso) {
  if (!tokenAcesso) {
    throw criarErro(
      'Esta operação exige um token OAuth 2.0 do YouTube no cabeçalho Authorization: Bearer <token>.',
      401
    );
  }
  return autenticacao(tokenAcesso);
}

/**
 * videos.list filtrando apenas por ID.
 * @param {string[]} ids até 50 IDs
 * @param {{ partes: string, tokenAcesso?: string }} opcoes
 */
async function buscarPorId(ids, { partes, tokenAcesso } = {}) {
  const url = montarUrl('videos', { part: partes, id: ids.join(',') });
  const resposta = await requisitar(url, { cabecalhos: autenticacao(tokenAcesso) });
  const dados = await lerJson(resposta);

  if (!dados.items?.length) {
    throw criarErro('Vídeo não encontrado.', 404);
  }
  return dados;
}

/**
 * videos.insert via upload resumível: abre a sessão com os metadados
 * e depois envia o arquivo em stream, sem carregá-lo na memória.
 * @param {{ recurso: object, conteudo: AsyncIterable<Uint8Array>, tipoConteudo: string, tamanho: number, tokenAcesso: string }} dados
 */
async function inserir({ recurso, conteudo, tipoConteudo, tamanho, tokenAcesso }) {
  const cabecalhosAuth = exigirToken(tokenAcesso);

  const urlSessao = montarUrl(
    'videos',
    { uploadType: 'resumable', part: Object.keys(recurso).join(',') },
    { upload: true }
  );
  const sessao = await requisitar(urlSessao, {
    metodo: 'POST',
    cabecalhos: {
      ...cabecalhosAuth,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': tipoConteudo,
      'X-Upload-Content-Length': String(tamanho)
    },
    corpo: JSON.stringify(recurso)
  });

  const urlUpload = sessao.headers.get('location');
  await sessao.body?.cancel();
  if (!urlUpload) {
    throw criarErro('A API do YouTube não retornou a URL da sessão de upload.', 502);
  }

  const resposta = await requisitar(urlUpload, {
    metodo: 'PUT',
    cabecalhos: {
      ...cabecalhosAuth,
      'Content-Type': tipoConteudo,
      'Content-Length': String(tamanho)
    },
    corpo: conteudo,
    timeoutMs: TIMEOUT_UPLOAD_MS
  });
  return lerJson(resposta);
}

/**
 * videos.update. As partes enviadas (snippet, status...) substituem as atuais por completo.
 * @param {string} id
 * @param {object} recurso partes do vídeo a atualizar
 * @param {string} tokenAcesso
 */
async function atualizar(id, recurso, tokenAcesso) {
  const cabecalhosAuth = exigirToken(tokenAcesso);
  const url = montarUrl('videos', { part: Object.keys(recurso).join(',') });

  const resposta = await requisitar(url, {
    metodo: 'PUT',
    cabecalhos: { ...cabecalhosAuth, 'Content-Type': 'application/json; charset=UTF-8' },
    corpo: JSON.stringify({ ...recurso, id })
  });
  return lerJson(resposta);
}

/** videos.delete (YouTube responde 204 sem corpo). */
async function excluir(id, tokenAcesso) {
  const cabecalhosAuth = exigirToken(tokenAcesso);
  await requisitar(montarUrl('videos', { id }), { metodo: 'DELETE', cabecalhos: cabecalhosAuth });
}

/**
 * videos.rate (YouTube responde 204 sem corpo).
 * @param {'like'|'dislike'|'none'} avaliacao
 */
async function avaliar(id, avaliacao, tokenAcesso) {
  const cabecalhosAuth = exigirToken(tokenAcesso);
  await requisitar(montarUrl('videos/rate', { id, rating: avaliacao }), {
    metodo: 'POST',
    cabecalhos: cabecalhosAuth
  });
}

/** videos.getRating: avaliação do usuário autenticado para cada ID. */
async function obterAvaliacao(ids, tokenAcesso) {
  const cabecalhosAuth = exigirToken(tokenAcesso);
  const resposta = await requisitar(montarUrl('videos/getRating', { id: ids.join(',') }), {
    cabecalhos: cabecalhosAuth
  });
  return lerJson(resposta);
}

module.exports = { buscarPorId, inserir, atualizar, excluir, avaliar, obterAvaliacao };
