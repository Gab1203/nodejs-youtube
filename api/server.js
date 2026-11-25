const express = require('express');
const swaggerUi = require('swagger-ui-express');

const app = express();

app.get('/status', (_req, res) => {
  res.json({ status: 'ok' });
});

const swagger = {
  openapi: '3.0.3',
  info: { title: 'nodejs-youtube', version: '1.0.0' },
  paths: {'/status': {
      get: {
        summary: 'TESTE',
        responses: { '200': { description: 'ATIVO' } }
      }
    }
  }
};

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swagger));

app.listen(3000, '127.0.0.1', () => {
  console.log('ABERTO http://localhost:3000/docs/');
});