const youtube = require('../..');

function consultarUsuario(metodo, id, parametros, callback) {
  if (typeof parametros === 'function') {
    callback = parametros;
    parametros = {};
  }

  if (typeof callback !== 'function') {
    throw new TypeError('callback must be a function');
  }

  const chave = process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.trim();
  if (!chave) {
    const erro = new Error('developer key missing');
    erro.origin = 'api';
    callback(erro);
    return;
  }

  const campos = {};
  if (parametros && typeof parametros === 'object' && !Array.isArray(parametros)) {
    Object.keys(parametros).forEach(function (campo) {
      if (campo !== 'key') {
        campos[campo] = parametros[campo];
      }
    });
  }

  const chaveOriginal = youtube.developerKey;
  const protocoloOriginal = youtube.httpProtocol;
  youtube.developerKey = chave;
  youtube.httpProtocol = 'https';

  try {
    const usuario = youtube.user(id);

    if (metodo === 'profile') {
      usuario.profile(callback);
    } else {
      usuario[metodo](campos, callback);
    }
  } finally {
    youtube.developerKey = chaveOriginal;
    youtube.httpProtocol = protocoloOriginal;
  }
}

function profile(id, parametros, callback) {
  consultarUsuario('profile', id, parametros, callback);
}

function favorites(id, parametros, callback) {
  consultarUsuario('favorites', id, parametros, callback);
}

function playlists(id, parametros, callback) {
  consultarUsuario('playlists', id, parametros, callback);
}

function uploads(id, parametros, callback) {
  consultarUsuario('uploads', id, parametros, callback);
}

function newSubscriptionVideos(id, parametros, callback) {
  consultarUsuario('newsubscriptionvideos', id, parametros, callback);
}

module.exports = {
  profile,
  favorites,
  playlists,
  uploads,
  newSubscriptionVideos
};
