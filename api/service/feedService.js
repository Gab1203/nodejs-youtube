async function buscarVideos(q) {
  const chave = process.env.YOUTUBE_API_KEY;

  if (!chave || !chave.trim()) {
    const erro = new Error('ERRO');
    erro.status = 503;
    throw erro;
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('q', q);
  url.searchParams.set('maxResults', '5');

  const resposta = await fetch(url, {
    headers: { 'x-goog-api-key': chave.trim() },
    signal: AbortSignal.timeout(5000)
  });

  if (!resposta.ok) {
    throw new Error(`response http do Youtube: ${resposta.status}.`);
  }

  return resposta.json();
}

module.exports = { buscarVideos };