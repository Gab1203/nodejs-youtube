const swaggerUi = require('swagger-ui-express');

const swagger = {
  openapi: '3.0.3',
  info: { title: 'nodejs-youtube', version: '1.0.0' },
  paths: {
    '/api/search': {
      get: {
        summary: 'Buscar vídeos no YouTube',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            example: 'Como se inscrever em um canal do YouTube'
          }
        ],
        responses: { '200': { description: 'Resultados da busca' } }
      }
    }
  }
};

function configSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swagger));
}

module.exports = configSwagger;