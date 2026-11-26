// Operações da conta autenticada na YouTube Data API v3.
const { criarErro, montarUrl, autenticacao, requisitar, lerJson } = require('../util/youtubeClient');

function exigirAutenticacao(tokenAcesso) {
  if (!tokenAcesso) {
    throw criarErro(
      'Esta operação exige um token OAuth 2.0 do YouTube no cabeçalho Authorization: Bearer <token>.',
      401
    );
  }
  return autenticacao(tokenAcesso);
}

function parametrosPaginacao({ maxResults, pageToken } = {}) {
  return { maxResults, pageToken };
}

async function consultar(recurso, parametros, tokenAcesso) {
  const cabecalhos = exigirAutenticacao(tokenAcesso);
  const resposta = await requisitar(montarUrl(recurso, parametros), { cabecalhos });
  return lerJson(resposta);
}

async function alterar(recurso, metodo, corpo, tokenAcesso, parametros = {}) {
  const cabecalhos = exigirAutenticacao(tokenAcesso);
  const resposta = await requisitar(montarUrl(recurso, parametros), {
    metodo,
    cabecalhos: {
      ...cabecalhos,
      'Content-Type': 'application/json; charset=UTF-8'
    },
    corpo: corpo === undefined ? undefined : JSON.stringify(corpo)
  });
  if (resposta.status === 204) {
    return;
  }
  return lerJson(resposta);
}
function buscarCanal(tokenAcesso) {
  return consultar('channels', {
    part: 'snippet,statistics,contentDetails',
    mine: true
  }, tokenAcesso);
}

function listarInscricoes(tokenAcesso, paginacao) {
  return consultar('subscriptions', {
    part: 'snippet,contentDetails',
    mine: true,
    ...parametrosPaginacao(paginacao)
  }, tokenAcesso);
}

function inscrever(channelId, tokenAcesso) {
  return alterar('subscriptions', 'POST', {
    snippet: { resourceId: { kind: 'youtube#channel', channelId } }
  }, tokenAcesso, { part: 'snippet' });
}

function cancelarInscricao(id, tokenAcesso) {
  return alterar('subscriptions', 'DELETE', undefined, tokenAcesso, { id });
}

function listarInscritos(tokenAcesso, paginacao) {
  return consultar('subscriptions', {
    part: 'snippet',
    mySubscribers: true,
    ...parametrosPaginacao(paginacao)
  }, tokenAcesso);
}

function listarVideosAvaliados(rating, tokenAcesso, paginacao) {
  return consultar('videos', {
    part: 'snippet,contentDetails,statistics',
    myRating: rating,
    ...parametrosPaginacao(paginacao)
  }, tokenAcesso);
}

function listarPlaylists(tokenAcesso, paginacao) {
  return consultar('playlists', {
    part: 'snippet,status,contentDetails',
    mine: true,
    ...parametrosPaginacao(paginacao)
  }, tokenAcesso);
}

function listarAtividades(tokenAcesso, paginacao) {
  return consultar('activities', {
    part: 'snippet,contentDetails',
    mine: true,
    ...parametrosPaginacao(paginacao)
  }, tokenAcesso);
}

async function listarUploads(tokenAcesso, paginacao) {
  const canais = await buscarCanal(tokenAcesso);
  const playlistId = canais.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) {
    throw criarErro('A conta autenticada não possui uma playlist de envios disponível.', 404);
  }
  return consultar('playlistItems', {
    part: 'snippet,contentDetails',
    playlistId,
    ...parametrosPaginacao(paginacao)
  }, tokenAcesso);
}

function listarMembros(tokenAcesso, paginacao) {
  return consultar('members', {
    part: 'snippet',
    mode: 'all_current',
    ...parametrosPaginacao(paginacao)
  }, tokenAcesso);
}

function publicarComentario(videoId, texto, tokenAcesso) {
  return alterar('commentThreads', 'POST', {
    snippet: {
      videoId,
      topLevelComment: { snippet: { textOriginal: texto } }
    }
  }, tokenAcesso, { part: 'snippet' });
}

function responderComentario(parentId, texto, tokenAcesso) {
  return alterar('comments', 'POST', {
    snippet: { parentId, textOriginal: texto }
  }, tokenAcesso, { part: 'snippet' });
}

function editarComentario(id, texto, tokenAcesso) {
  return alterar('comments', 'PUT', {
    id,
    snippet: { textOriginal: texto }
  }, tokenAcesso, { part: 'snippet' });
}

function excluirComentario(id, tokenAcesso) {
  return alterar('comments', 'DELETE', undefined, tokenAcesso, { id });
}

module.exports = {
  buscarCanal,
  listarInscricoes,
  inscrever,
  cancelarInscricao,
  listarInscritos,
  listarVideosAvaliados,
  listarPlaylists,
  listarAtividades,
  listarUploads,
  listarMembros,
  publicarComentario,
  responderComentario,
  editarComentario,
  excluirComentario
};