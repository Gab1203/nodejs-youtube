const feedService = require('../service/feedService');

async function buscarVideos(req, res) {
  const { q } = req.query;

  if (typeof q !== 'string' || !q.trim()) {
    return res.status(400).json({ error: 'Informe um termo de busca em q.' });
  }

  try {
    return res.json(await feedService.buscarVideos(q.trim()));
  } catch (error) {
    return responderErro(error, res);
  }
}

async function listarPopulares(_req, res) {
  try {
    return res.json(await feedService.listarPopulares());
  } catch (error) {
    return responderErro(error, res);
  }
}

function responderErro(error, res) {
  // Se a falha vier do YouTube, a rota responde com 502 por padrão.
  let status = 502;

  if (error.name === 'TimeoutError') {
    status = 504;
  } else if (typeof error.status === 'number') {
    status = error.status;
  }

  return res.status(status).json({ error: error.message });
}

module.exports = { buscarVideos, listarPopulares };