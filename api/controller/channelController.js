const channelService = require('../service/channelService');
const { criarErro } = require('../util/youtubeClient');

const REGEX_ID = /^[A-Za-z0-9_-]{1,64}$/;

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

module.exports = { buscarDados };
