process.loadEnvFile();

const express = require('express');

const feedController = require('./controller/feedController');
const configSwagger = require('./util/swaggerConfig');

const app = express();

configSwagger(app);

// Rota de search
app.get('/api/search', feedController.buscarVideos);
app.get('/api/feed/popular', feedController.listarPopulares);


app.listen(3000, '127.0.0.1', () => {
  console.log('ABERTO http://localhost:3000/docs/');
});