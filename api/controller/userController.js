const userService = require('../service/userService');

function statusDoErro(erro) {
  if (!erro) {
    return 502;
  }

  if (erro.message === 'not found') {
    return 404;
  }

  if (erro.message === 'not allowed') {
    return 403;
  }

  if (erro.message === 'invalid id') {
    return 400;
  }

  if (erro.message === 'developer key missing') {
    return 503;
  }

  if (erro.message === 'request timeout') {
    return 504;
  }

  return 502;
}

function criarHandler(metodo) {
  return function (req, res) {
    userService[metodo](req.params.id, req.query, function (erro, dados) {
      if (erro) {
        return res.status(statusDoErro(erro)).json({
          error: erro.message,
          origin: erro.origin,
          details: erro.details
        });
      }

      return res.json(dados);
    });
  };
}

module.exports = {
  profile: criarHandler('profile'),
  favorites: criarHandler('favorites'),
  playlists: criarHandler('playlists'),
  uploads: criarHandler('uploads'),
  newSubscriptionVideos: criarHandler('newSubscriptionVideos')
};
