process.loadEnvFile();

const express = require('express');

const feedController = require('./controller/feedController');
const videoController = require('./controller/videoController');
const channelController = require('./controller/channelController');
const userController = require('./controller/userController');
const configSwagger = require('./util/swaggerConfig');

const app = express();
const json = express.json();

configSwagger(app);

// Rota de search
app.get('/api/search', feedController.buscarVideos);
app.get('/api/feed/popular', feedController.listarPopulares);

// Rota de canais (YouTube Data API v3 - recurso channels)
app.get('/api/channels/:id', channelController.buscarDados);
app.put('/api/channels/:id', json, channelController.atualizarDados);

// Rotas da conta autenticada (YouTube Data API v3)
app.get('/api/users/me/channels', userController.channels);
app.get('/api/users/me/subscriptions', userController.subscriptions);
app.post('/api/users/me/subscriptions', json, userController.inscrever);
app.delete('/api/users/me/subscriptions/:id', userController.cancelarInscricao);
app.get('/api/users/me/subscribers', userController.inscritos);
app.get('/api/users/me/videos', userController.videosAvaliados);
app.get('/api/users/me/playlists', userController.playlists);
app.get('/api/users/me/activities', userController.activities);
app.get('/api/users/me/uploads', userController.uploads);
app.get('/api/users/me/members', userController.members);

// Comentários: publicar, responder, editar e excluir.
app.post('/api/videos/:id/comments', json, userController.publicarComentario);
app.post('/api/comments/:id/replies', json, userController.responderComentario);
app.put('/api/comments/:id', json, userController.editarComentario);
app.delete('/api/comments/:id', userController.excluirComentario);

// Rotas de vídeos (YouTube Data API v3 - recurso videos)
app.get('/api/videos/:id', videoController.buscarPorId);              // videos.list
app.post('/api/videos', videoController.inserir);                    // videos.insert (corpo = arquivo, sem parser)
app.put('/api/videos/:id', json, videoController.atualizar);         // videos.update
app.delete('/api/videos/:id', videoController.excluir);              // videos.delete
app.put('/api/videos/:id/rating', json, videoController.avaliar);    // videos.rate
app.get('/api/videos/:id/rating', videoController.obterAvaliacao);   // videos.getRating

// Erros de middleware (ex.: JSON malformado) em JSON em vez de HTML
app.use((erro, req, res, next) => {
  const status = Number.isInteger(erro.status) ? erro.status : 500;
  if (status >= 500) {
    console.error(erro);
  }
  res.status(status).json({ error: status >= 500 ? 'Erro interno.' : erro.message });
});

app.listen(3000, '127.0.0.1', () => {
  console.log('ABERTO http://localhost:3000/docs/');
});
