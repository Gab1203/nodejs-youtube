const swaggerUi = require('swagger-ui-express');

const parametroId = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  example: 'dQw4w9WgXcQ'
};

const parametroIds = {
  ...parametroId,
  description: 'Um ou mais IDs (até 50) separados por vírgula.'
};

const erro = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } }
});

const errosComuns = {
  '400': erro('Parâmetros inválidos'),
  '401': erro('Token OAuth ausente ou inválido'),
  '403': erro('Sem permissão no YouTube'),
  '404': erro('Vídeo não encontrado'),
  '502': erro('Falha na API do YouTube'),
  '503': erro('Configuração ausente no .env'),
  '504': erro('Tempo esgotado')
};

const comOAuth = [{ bearerAuth: [] }];

const swagger = {
  openapi: '3.0.3',
  info: { title: 'nodejs-youtube', version: '1.0.0' },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Access token OAuth 2.0 do Google com escopo do YouTube (ex.: https://www.googleapis.com/auth/youtube).'
      }
    },
    schemas: {
      Erro: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: {
            type: 'object',
            properties: { youtubeStatus: { type: 'integer' }, reason: { type: 'string' } }
          }
        }
      },
      Privacidade: { type: 'string', enum: ['private', 'public', 'unlisted'] }
    }
  },
  paths: {
    '/api/search': {
      get: {
        tags: ['feeds'],
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
    },
    '/api/videos': {
      post: {
        tags: ['videos'],
        summary: 'Enviar vídeo (videos.insert)',
        description: 'O corpo é o próprio arquivo de vídeo; os metadados vão na query string. Exige OAuth.',
        security: comOAuth,
        parameters: [
          { name: 'title', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'description', in: 'query', schema: { type: 'string' } },
          { name: 'tags', in: 'query', description: 'Separadas por vírgula.', schema: { type: 'string' } },
          { name: 'categoryId', in: 'query', schema: { type: 'string', default: '22' } },
          { name: 'privacyStatus', in: 'query', schema: { $ref: '#/components/schemas/Privacidade' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/octet-stream': { schema: { type: 'string', format: 'binary' } },
            'video/mp4': { schema: { type: 'string', format: 'binary' } }
          }
        },
        responses: {
          '201': { description: 'Vídeo criado (recurso video do YouTube)' },
          '411': erro('Content-Length ausente'),
          '415': erro('Content-Type não suportado'),
          ...errosComuns
        }
      }
    },
    '/api/videos/{id}': {
      get: {
        tags: ['videos'],
        summary: 'Buscar vídeo(s) por ID (videos.list)',
        description: 'Usa YOUTUBE_API_KEY; se um token Bearer for enviado, ele é usado no lugar.',
        parameters: [
          parametroIds,
          {
            name: 'part',
            in: 'query',
            description: 'Partes separadas por vírgula.',
            schema: { type: 'string', default: 'snippet,contentDetails,statistics,status' }
          }
        ],
        responses: { '200': { description: 'Resposta videos.list' }, ...errosComuns }
      },
      put: {
        tags: ['videos'],
        summary: 'Atualizar vídeo (videos.update)',
        description: 'As partes enviadas substituem as atuais por completo. Ao enviar snippet, title e categoryId são obrigatórios.',
        security: comOAuth,
        parameters: [parametroId],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  snippet: {
                    type: 'object',
                    required: ['title', 'categoryId'],
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      tags: { type: 'array', items: { type: 'string' } },
                      categoryId: { type: 'string' }
                    }
                  },
                  status: {
                    type: 'object',
                    properties: { privacyStatus: { $ref: '#/components/schemas/Privacidade' } }
                  },
                  recordingDetails: { type: 'object' },
                  localizations: { type: 'object' }
                }
              },
              example: {
                snippet: { title: 'Novo título', description: 'Nova descrição', categoryId: '22' },
                status: { privacyStatus: 'unlisted' }
              }
            }
          }
        },
        responses: { '200': { description: 'Vídeo atualizado' }, ...errosComuns }
      },
      delete: {
        tags: ['videos'],
        summary: 'Excluir vídeo (videos.delete)',
        security: comOAuth,
        parameters: [parametroId],
        responses: { '204': { description: 'Vídeo excluído' }, ...errosComuns }
      }
    },
    '/api/videos/{id}/rating': {
      get: {
        tags: ['videos'],
        summary: 'Consultar minha avaliação (videos.getRating)',
        security: comOAuth,
        parameters: [parametroIds],
        responses: { '200': { description: 'Avaliações por vídeo' }, ...errosComuns }
      },
      put: {
        tags: ['videos'],
        summary: 'Avaliar vídeo (videos.rate)',
        security: comOAuth,
        parameters: [parametroId],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rating'],
                properties: { rating: { type: 'string', enum: ['like', 'dislike', 'none'] } }
              },
              example: { rating: 'like' }
            }
          }
        },
        responses: { '204': { description: 'Avaliação registrada' }, ...errosComuns }
      }
    }
  }
};

function configSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swagger));
}

module.exports = configSwagger;
