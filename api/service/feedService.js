async function consultarYouTube(recurso, parametros) {
  const chave = process.env.YOUTUBE_API_KEY;

  if (!chave || !chave.trim()) {
    const erro = new Error('ERRO');
    erro.status = 503;
    throw erro;
  }

  const urlBase = process.env.YOUTUBE_API_BASE_URL;
  if (!urlBase || !urlBase.trim()) {
    const erro = new Error('Configure YOUTUBE_API_BASE_URL no .env.');
    erro.status = 503;
    throw erro;
  }

  const url = new URL(recurso, urlBase.trim());
  for (const [nome, valor] of Object.entries(parametros)) {
    url.searchParams.set(nome, valor);
  }

  const resposta = await fetch(url, {
    headers: { 'x-goog-api-key': chave.trim() },
    signal: AbortSignal.timeout(5000)
  });

  if (!resposta.ok) {
    throw new Error(`response http do Youtube: ${resposta.status}.`);
  }

  return resposta.json();
}

function buscarVideos(q) {
  return consultarYouTube('search', {
    part: 'snippet',
    type: 'video',
    q,
    maxResults: '5'
  });
}

function listarPopulares() {
  return consultarYouTube('videos', {
    part: 'snippet,statistics',
    chart: 'mostPopular',
    // ranking do Brasil
    regionCode: 'BR',
    maxResults: '5'
  });
}

module.exports = { buscarVideos, listarPopulares };