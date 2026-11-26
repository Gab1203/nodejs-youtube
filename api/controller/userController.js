const userService = require('../service/userService');
const { criarErro } = require('../util/youtubeClient');

const REGEX_ID = /^[A-Za-z0-9_-]{1,100}$/;
const AVALIACOES = new Set(['like', 'dislike']);

function lerId(valor, nome = 'ID') {
  if (typeof valor !== 'string' || !REGEX_ID.test(valor)) {
    throw criarErro(`${nome} inválido.`, 400);
  }
  return valor;
}

function lerToken(req) {
  const correspondencia = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') || '');
  return correspondencia ? correspondencia[1] : undefined;
}

function lerPaginacao(query) {
  const paginacao = {};
  if (query.maxResults !== undefined) {
    const maxResults = Number(query.maxResults);
    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 50) {
      throw criarErro('maxResults deve ser um inteiro entre 1 e 50.', 400);
    }
    paginacao.maxResults = maxResults;
  }
  if (query.pageToken !== undefined) {
    if (typeof query.pageToken !== 'string' || !query.pageToken.trim()) {
      throw criarErro('pageToken deve ser um texto não vazio.', 400);
    }
    paginacao.pageToken = query.pageToken;
  }
  return paginacao;
}

function lerTexto(valor, campo) {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw criarErro(`${campo} deve ser um texto não vazio.`, 400);
  }
  return valor;
}

function responderErro(res, erro) {
  if (!Number.isInteger(erro.status)) {
    console.error(erro);
    return res.status(500).json({ error: 'Erro interno.' });
  }
  const corpo = { error: erro.message };
  if (erro.detalhes) {
    corpo.details = erro.detalhes;
  }
  return res.status(erro.status).json(corpo);
}

function rota(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (erro) {
      responderErro(res, erro);
    }
  };
}

const token = (req) => lerToken(req);
const pagina = (req) => lerPaginacao(req.query);

module.exports = {
  channels: rota(async (req, res) => res.json(await userService.buscarCanal(token(req)))),
  subscriptions: rota(async (req, res) => res.json(await userService.listarInscricoes(token(req), pagina(req)))),
  inscrever: rota(async (req, res) => {
    const channelId = lerId(req.body?.channelId, 'channelId');
    res.status(201).json(await userService.inscrever(channelId, token(req)));
  }),
  cancelarInscricao: rota(async (req, res) => {
    await userService.cancelarInscricao(lerId(req.params.id), token(req));
    res.status(204).end();
  }),
  inscritos: rota(async (req, res) => res.json(await userService.listarInscritos(token(req), pagina(req)))),
  videosAvaliados: rota(async (req, res) => {
    const rating = req.query.myRating;
    if (!AVALIACOES.has(rating)) {
      throw criarErro('myRating deve ser like ou dislike.', 400);
    }
    res.json(await userService.listarVideosAvaliados(rating, token(req), pagina(req)));
  }),
  playlists: rota(async (req, res) => res.json(await userService.listarPlaylists(token(req), pagina(req)))),
  activities: rota(async (req, res) => res.json(await userService.listarAtividades(token(req), pagina(req)))),
  uploads: rota(async (req, res) => res.json(await userService.listarUploads(token(req), pagina(req)))),
  members: rota(async (req, res) => res.json(await userService.listarMembros(token(req), pagina(req)))),
  publicarComentario: rota(async (req, res) => {
    const videoId = lerId(req.params.id, 'ID do vídeo');
    const texto = lerTexto(req.body?.textOriginal, 'textOriginal');
    res.status(201).json(await userService.publicarComentario(videoId, texto, token(req)));
  }),
  responderComentario: rota(async (req, res) => {
    const parentId = lerId(req.params.id, 'ID do comentário');
    const texto = lerTexto(req.body?.textOriginal, 'textOriginal');
    res.status(201).json(await userService.responderComentario(parentId, texto, token(req)));
  }),
  editarComentario: rota(async (req, res) => {
    const id = lerId(req.params.id, 'ID do comentário');
    const texto = lerTexto(req.body?.textOriginal, 'textOriginal');
    res.json(await userService.editarComentario(id, texto, token(req)));
  }),
  excluirComentario: rota(async (req, res) => {
    await userService.excluirComentario(lerId(req.params.id, 'ID do comentário'), token(req));
    res.status(204).end();
  })
};