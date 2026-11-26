process.loadEnvFile();

const express = require('express');

const feedController = require('./controller/feedController');
const videoController = require('./controller/videoController');
const configSwagger = require('./util/swaggerConfig');

const app = express();
const json = express.json();

configSwagger(app);

// Rota de search
app.get('/api/search', feedController.buscarVideos);

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
