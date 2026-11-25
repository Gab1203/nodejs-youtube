const { montarUrl, autenticacao, requisitar, lerJson } = require('../util/youtubeClient');

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

module.exports = { buscarDadosCanal };
