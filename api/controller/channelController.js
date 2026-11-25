const channelService = require('../service/channelService');
const { criarErro } = require('../util/youtubeClient');

const REGEX_ID = /^[A-Za-z0-9_-]{1,64}$/;
const PARTES_ATUALIZAVEIS = new Set(['brandingSettings', 'localizations', 'snippet']);

function lerId(valor) {
  if (typeof valor !== 'string' || !REGEX_ID.test(valor)) {
    throw criarErro('ID de canal inválido.', 400);
  }
  return valor;
}

function lerToken(req) {
  const correspondencia = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') || '');
  return correspondencia ? correspondencia[1] : undefined;
}

function lerDadosAtualizacao(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw criarErro('Envie um JSON com as configurações do canal.', 400);
  }

  const partes = Object.keys(dados);
  const invalidas = partes.filter((parte) => !PARTES_ATUALIZAVEIS.has(parte));
  if (partes.length === 0 || invalidas.length > 0) {
    throw criarErro(`Envie apenas as partes: ${[...PARTES_ATUALIZAVEIS].join(', ')}.`, 400);
  }

  for (const parte of partes) {
    if (!dados[parte] || typeof dados[parte] !== 'object' || Array.isArray(dados[parte])) {
      throw criarErro(`${parte} deve ser um objeto.`, 400);
    }
  }
  return dados;
}

async function buscarDados(req, res) {
  try {
    const idCanal = lerId(req.params.id);
    return res.json(await channelService.buscarDadosCanal(idCanal, lerToken(req)));
  } catch (erro) {
    const status = Number.isInteger(erro.status)
      ? erro.status
      : erro.name === 'TimeoutError' ? 504 : 502;
    return res.status(status).json({ error: erro.message });
  }
}

async function atualizarDados(req, res) {
  try {
    const idCanal = lerId(req.params.id);
    const tokenAcesso = lerToken(req);
    if (!tokenAcesso) {
      throw criarErro(
        'Esta operação exige um token OAuth 2.0 do YouTube no cabeçalho Authorization: Bearer <token>.',
        401
      );
    }
    const dados = lerDadosAtualizacao(req.body);
    return res.json(await channelService.atualizarDadosCanal(idCanal, dados, tokenAcesso));
  } catch (erro) {
    const status = Number.isInteger(erro.status)
      ? erro.status
      : erro.name === 'TimeoutError' ? 504 : 502;
    return res.status(status).json({ error: erro.message });
  }
}

module.exports = { buscarDados, atualizarDados };
