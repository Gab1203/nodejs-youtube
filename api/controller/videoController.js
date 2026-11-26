const videoService = require('../service/videoService');
const { criarErro } = require('../util/youtubeClient');

const REGEX_ID = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_IDS = 50;

const PARTES_PADRAO = 'snippet,contentDetails,statistics,status';
const PARTES_LEITURA = new Set([
  'contentDetails', 'fileDetails', 'id', 'liveStreamingDetails', 'localizations', 'player',
  'processingDetails', 'recordingDetails', 'snippet', 'statistics', 'status', 'suggestions', 'topicDetails'
]);
const PARTES_ESCRITA = new Set(['snippet', 'status', 'recordingDetails', 'localizations']);
const PRIVACIDADES = new Set(['private', 'public', 'unlisted']);
const AVALIACOES = new Set(['like', 'dislike', 'none']);

// ---------- leitura e validação da requisição ----------

function lerId(valor) {
  if (typeof valor !== 'string' || !REGEX_ID.test(valor)) {
    throw criarErro('ID de vídeo inválido.', 400);
  }
  return valor;
}

function lerIds(valor) {
  const ids = String(valor).split(',').map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0 || ids.length > MAX_IDS) {
    throw criarErro(`Informe de 1 a ${MAX_IDS} IDs separados por vírgula.`, 400);
  }
  return ids.map(lerId);
}

function lerPartes(valor) {
  if (valor === undefined) {
    return PARTES_PADRAO;
  }

  const partes = typeof valor === 'string' ? valor.split(',').map((p) => p.trim()).filter(Boolean) : [];
  const invalidas = partes.filter((parte) => !PARTES_LEITURA.has(parte));
  if (partes.length === 0 || invalidas.length > 0) {
    throw criarErro(`part inválido. Valores aceitos: ${[...PARTES_LEITURA].join(', ')}.`, 400);
  }
  return partes.join(',');
}

function lerTexto(valor, nome, { obrigatorio = false } = {}) {
  if (valor === undefined || valor === '') {
    if (obrigatorio) {
      throw criarErro(`Informe ${nome}.`, 400);
    }
    return undefined;
  }
  if (typeof valor !== 'string') {
    throw criarErro(`${nome} deve ser um texto.`, 400);
  }
  return valor;
}

function validarPrivacidade(valor) {
  if (valor !== undefined && !PRIVACIDADES.has(valor)) {
    throw criarErro(`privacyStatus deve ser: ${[...PRIVACIDADES].join(', ')}.`, 400);
  }
}

// Token OAuth 2.0 repassado pelo cliente (Authorization: Bearer <token>).
function lerToken(req) {
  const correspondencia = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') || '');
  return correspondencia ? correspondencia[1] : undefined;
}

// Metadados do upload chegam pela query string, pois o corpo é o próprio arquivo.
function montarRecursoUpload(query) {
  const titulo = lerTexto(query.title, 'title', { obrigatorio: true });
  const descricao = lerTexto(query.description, 'description');
  const tags = lerTexto(query.tags, 'tags');
  const categoria = lerTexto(query.categoryId, 'categoryId') ?? '22';
  const privacidade = lerTexto(query.privacyStatus, 'privacyStatus') ?? 'private';
  validarPrivacidade(privacidade);

  const snippet = { title: titulo, categoryId: categoria };
  if (descricao !== undefined) {
    snippet.description = descricao;
  }
  if (tags !== undefined) {
    snippet.tags = tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return { snippet, status: { privacyStatus: privacidade } };
}

function lerRecursoAtualizacao(corpo) {
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
    throw criarErro('Envie um JSON (Content-Type: application/json) com as partes do vídeo.', 400);
  }

  const { id, ...partes } = corpo; // o ID vem da URL
  const nomes = Object.keys(partes);
  const invalidas = nomes.filter((nome) => !PARTES_ESCRITA.has(nome));
  if (nomes.length === 0 || invalidas.length > 0) {
    throw criarErro(`Envie apenas as partes: ${[...PARTES_ESCRITA].join(', ')}.`, 400);
  }

  for (const nome of nomes) {
    if (!partes[nome] || typeof partes[nome] !== 'object' || Array.isArray(partes[nome])) {
      throw criarErro(`${nome} deve ser um objeto.`, 400);
    }
  }

  // O YouTube exige title e categoryId sempre que snippet é atualizado.
  if (partes.snippet) {
    lerTexto(partes.snippet.title, 'snippet.title', { obrigatorio: true });
    lerTexto(partes.snippet.categoryId, 'snippet.categoryId', { obrigatorio: true });
  }
  if (partes.status) {
    validarPrivacidade(partes.status.privacyStatus);
  }
  return partes;
}

// ---------- tratamento de erros ----------

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

// ---------- handlers ----------

// GET /api/videos/:id  -> videos.list (somente por ID)
async function buscarPorId(req, res) {
  const ids = lerIds(req.params.id);
  const partes = lerPartes(req.query.part);
  res.json(await videoService.buscarPorId(ids, { partes, tokenAcesso: lerToken(req) }));
}

// POST /api/videos  -> videos.insert (corpo = arquivo de vídeo)
async function inserir(req, res) {
  const tipoConteudo = req.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!tipoConteudo || !(tipoConteudo.startsWith('video/') || tipoConteudo === 'application/octet-stream')) {
    throw criarErro('Envie o arquivo no corpo com Content-Type video/* ou application/octet-stream.', 415);
  }

  const tamanho = Number(req.get('content-length'));
  if (!Number.isSafeInteger(tamanho) || tamanho <= 0) {
    throw criarErro('Informe o cabeçalho Content-Length com o tamanho do arquivo.', 411);
  }

  const recurso = montarRecursoUpload(req.query);
  const video = await videoService.inserir({
    recurso,
    conteudo: req,
    tipoConteudo,
    tamanho,
    tokenAcesso: lerToken(req)
  });
  res.status(201).json(video);
}

// PUT /api/videos/:id  -> videos.update
async function atualizar(req, res) {
  const id = lerId(req.params.id);
  const recurso = lerRecursoAtualizacao(req.body);
  res.json(await videoService.atualizar(id, recurso, lerToken(req)));
}

// DELETE /api/videos/:id  -> videos.delete
async function excluir(req, res) {
  await videoService.excluir(lerId(req.params.id), lerToken(req));
  res.status(204).end();
}

// PUT /api/videos/:id/rating  -> videos.rate
async function avaliar(req, res) {
  const id = lerId(req.params.id);
  const avaliacao = req.body?.rating;
  if (!AVALIACOES.has(avaliacao)) {
    throw criarErro(`rating deve ser: ${[...AVALIACOES].join(', ')}.`, 400);
  }
  await videoService.avaliar(id, avaliacao, lerToken(req));
  res.status(204).end();
}

// GET /api/videos/:id/rating  -> videos.getRating
async function obterAvaliacao(req, res) {
  const ids = lerIds(req.params.id);
  res.json(await videoService.obterAvaliacao(ids, lerToken(req)));
}

module.exports = {
  buscarPorId: rota(buscarPorId),
  inserir: rota(inserir),
  atualizar: rota(atualizar),
  excluir: rota(excluir),
  avaliar: rota(avaliar),
  obterAvaliacao: rota(obterAvaliacao)
};
