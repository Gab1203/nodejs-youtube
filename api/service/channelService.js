const { criarErro, montarUrl, autenticacao, requisitar, lerJson } = require('../util/youtubeClient');

async function buscarDadosCanal(idCanal, tokenAcesso) {
  const url = montarUrl('channels', {
    part: 'snippet,statistics,contentDetails,brandingSettings',
    id: idCanal
  });
  const resposta = await requisitar(url, {
    cabecalhos: autenticacao(tokenAcesso),
    timeoutMs: 5000
  });
  return lerJson(resposta);
}

async function atualizarDadosCanal(idCanal, dados, tokenAcesso) {
  if (!tokenAcesso) {
    throw criarErro('Atualizar o canal exige um token OAuth 2.0.', 401);
  }

  const partesAtualizaveis = ['brandingSettings', 'localizations', 'snippet'];
  const partes = Object.keys(dados).filter(parte => partesAtualizaveis.includes(parte));

  if (partes.length === 0) {
    throw criarErro('Nenhuma configuração atualizável do canal foi informada.', 400);
  }

  const url = montarUrl('channels', {
    part: partes.join(','),
    id: idCanal
  });
  const resposta = await requisitar(url, {
    metodo: 'PUT',
    cabecalhos: {
      ...autenticacao(tokenAcesso),
      'Content-Type': 'application/json'
    },
    corpo: JSON.stringify({ id: idCanal, ...dados }),
    timeoutMs: 5000
  });
  return lerJson(resposta);
}

module.exports = { buscarDadosCanal, atualizarDadosCanal };
