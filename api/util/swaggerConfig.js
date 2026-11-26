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

const errosUsuario = {
  '400': erro('Parâmetros inválidos'),
  '401': erro('Token OAuth ausente ou inválido'),
  '403': erro('Sem permiss\u00e3o para acessar os dados do usu\u00e1rio'),
  '404': erro('Usu\u00e1rio ou recurso n\u00e3o encontrado'),
  '502': erro('Falha na API do YouTube'),
  '503': erro('Configuração ausente no .env'),
  '504': erro('Tempo esgotado')
};

const parametrosListaUsuario = [
  {
    name: 'maxResults',
    in: 'query',
    description: 'Limite de resultados por página da API v3.',
    schema: { type: 'integer', minimum: 1, maximum: 50 }
  },
  {
    name: 'pageToken',
    in: 'query',
    description: 'Token retornado para solicitar a próxima página.',
    schema: { type: 'string' }
  }
];

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
    '/api/channels/{id}': {
      get: {
        tags: ['channels'],
        summary: 'Buscar canal por ID (channels.list)',
        description: 'Se um token OAuth 2.0 for enviado no cabeçalho Authorization: Bearer, ele será usado; caso contrário, utiliza YOUTUBE_API_KEY para canais públicos.',
        security: [{ bearerAuth: [] }, {}],
        parameters: [{
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          example: 'UC_x5XG1OV2P6uZZ5FSM9Ttw'
        }],
        responses: {
          '200': { description: 'Resposta channels.list' },
          '400': erro('ID do canal inválido'),
          '401': erro('Token OAuth ausente ou inválido'),
          '403': erro('Sem permissão no YouTube'),
          '502': erro('Falha na API do YouTube'),
          '503': erro('Configuração ausente no .env'),
          '504': erro('Tempo esgotado')
        }
      },
      put: {
        tags: ['channels'],
        summary: 'Atualizar canal (channels.update)',
        description: 'Exige token OAuth 2.0 do proprietário do canal.',
        security: comOAuth,
        parameters: [{
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          example: 'UC_x5XG1OV2P6uZZ5FSM9Ttw'
        }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                minProperties: 1,
                additionalProperties: false,
                properties: {
                  brandingSettings: { type: 'object' },
                  localizations: { type: 'object' },
                  snippet: { type: 'object' }
                }
              },
              example: {
                brandingSettings: {
                  channel: { description: 'Descrição atualizada do canal' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Canal atualizado' },
          '400': erro('ID ou partes do canal inválidos'),
          '401': erro('Token OAuth ausente ou inválido'),
          '403': erro('Sem permissão para atualizar o canal'),
          '502': erro('Falha na API do YouTube'),
          '503': erro('Configuração ausente no .env'),
          '504': erro('Tempo esgotado')
        }
      }
    },
    '/api/users/me/channels': {
      get: {
        tags: ['users'],
        summary: 'Consultar canal e perfil da conta autenticada',
        description: 'Mapeia para channels.list?mine=true. Exige OAuth; YOUTUBE_API_KEY, sozinha, não autoriza dados da conta.',
        security: comOAuth,
        responses: { '200': { description: 'Canal, perfil e playlists relacionadas' }, ...errosUsuario }
      }
    },
    '/api/users/me/subscriptions': {
      get: {
        tags: ['users'],
        summary: 'Listar canais inscritos pela conta autenticada',
        description: 'Mapeia para subscriptions.list?mine=true.',
        security: comOAuth,
        parameters: parametrosListaUsuario,
        responses: { '200': { description: 'Inscrições da conta' }, ...errosUsuario }
      },
      post: {
        tags: ['users'],
        summary: 'Inscrever a conta em um canal',
        description: 'Mapeia para subscriptions.insert e exige OAuth.',
        security: comOAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['channelId'],
                properties: { channelId: { type: 'string', example: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' } }
              }
            }
          }
        },
        responses: { '201': { description: 'Inscrição criada' }, ...errosUsuario }
      }
    },
    '/api/users/me/subscriptions/{id}': {
      delete: {
        tags: ['users'],
        summary: 'Cancelar inscrição',
        description: 'Mapeia para subscriptions.delete. O ID é o ID do recurso de inscrição, não o ID do canal.',
        security: comOAuth,
        parameters: [parametroId],
        responses: { '204': { description: 'Inscrição removida' }, ...errosUsuario }
      }
    },
    '/api/users/me/subscribers': {
      get: {
        tags: ['users'],
        summary: 'Listar inscritos do canal da conta autenticada',
        description: 'Mapeia para subscriptions.list?mySubscribers=true.',
        security: comOAuth,
        parameters: parametrosListaUsuario,
        responses: { '200': { description: 'Inscritos do canal' }, ...errosUsuario }
      }
    },
    '/api/users/me/videos': {
      get: {
        tags: ['users'],
        summary: 'Listar vídeos curtidos ou não curtidos pela conta',
        description: 'Mapeia para videos.list?myRating=like|dislike.',
        security: comOAuth,
        parameters: [
          {
            name: 'myRating', in: 'query', required: true,
            schema: { type: 'string', enum: ['like', 'dislike'] }
          },
          ...parametrosListaUsuario
        ],
        responses: { '200': { description: 'Vídeos avaliados pela conta' }, ...errosUsuario }
      }
    },
    '/api/users/me/playlists': {
      get: {
        tags: ['users'],
        summary: 'Listar playlists criadas pela conta',
        description: 'Mapeia para playlists.list?mine=true; pode incluir playlists privadas e não listadas.',
        security: comOAuth,
        parameters: parametrosListaUsuario,
        responses: { '200': { description: 'Playlists da conta' }, ...errosUsuario }
      }
    },
    '/api/users/me/activities': {
      get: {
        tags: ['users'],
        summary: 'Listar atividades recentes da conta',
        description: 'Mapeia para activities.list?mine=true.',
        security: comOAuth,
        parameters: parametrosListaUsuario,
        responses: { '200': { description: 'Atividades recentes' }, ...errosUsuario }
      }
    },
    '/api/users/me/uploads': {
      get: {
        tags: ['users'],
        summary: 'Listar vídeos enviados pela conta',
        description: 'Obtém a playlist de uploads de channels.list?mine=true e consulta playlistItems.list; exige OAuth.',
        security: comOAuth,
        parameters: parametrosListaUsuario,
        responses: { '200': { description: 'Vídeos enviados, incluindo privados quando permitidos pelo OAuth' }, ...errosUsuario }
      }
    },
    '/api/users/me/members': {
      get: {
        tags: ['users'],
        summary: 'Listar membros pagantes do canal autenticado',
        description: 'Mapeia para members.list?mode=all_current. Disponível somente a canais com Clubes dos canais ativo e autorização apropriada.',
        security: comOAuth,
        parameters: parametrosListaUsuario,
        responses: { '200': { description: 'Membros atuais do canal' }, ...errosUsuario }
      }
    },
    '/api/videos/{id}/comments': {
      post: {
        tags: ['users'],
        summary: 'Publicar comentário em um vídeo',
        description: 'Mapeia para commentThreads.insert.',
        security: comOAuth,
        parameters: [parametroId],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['textOriginal'],
            properties: { textOriginal: { type: 'string', example: 'Ótimo vídeo!' } }
          } } }
        },
        responses: { '201': { description: 'Comentário publicado' }, ...errosUsuario }
      }
    },
    '/api/comments/{id}/replies': {
      post: {
        tags: ['users'],
        summary: 'Responder a um comentário',
        description: 'Mapeia para comments.insert; o ID no caminho é o ID do comentário pai.',
        security: comOAuth,
        parameters: [parametroId],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['textOriginal'],
            properties: { textOriginal: { type: 'string', example: 'Obrigado pelo comentário!' } }
          } } }
        },
        responses: { '201': { description: 'Resposta publicada' }, ...errosUsuario }
      }
    },
    '/api/comments/{id}': {
      put: {
        tags: ['users'],
        summary: 'Editar comentário',
        description: 'Mapeia para comments.update.',
        security: comOAuth,
        parameters: [parametroId],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['textOriginal'],
            properties: { textOriginal: { type: 'string' } }
          } } }
        },
        responses: { '200': { description: 'Comentário atualizado' }, ...errosUsuario }
      },
      delete: {
        tags: ['users'],
        summary: 'Excluir comentário',
        description: 'Mapeia para comments.delete.',
        security: comOAuth,
        parameters: [parametroId],
        responses: { '204': { description: 'Comentário excluído' }, ...errosUsuario }
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
    },
    '/api/feed/popular': {
      get: {
        tags: ['feeds'],
        summary: 'Listar vídeos populares no Brasil',
        responses: { '200': { description: 'Resultados de até cinco vídeos do ranking do YouTube' } }
      }
    }
  }
};

function configSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swagger));
}

module.exports = configSwagger;
