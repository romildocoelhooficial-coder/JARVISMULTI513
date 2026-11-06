export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ready',
      endpoint: '/api/jarvis/tts/test',
      message: 'Fish Audio Test Endpoint está operacional. Envie POST para testar chave e voiceId.',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Apenas requisições POST são permitidas para validação de voz.',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { apiKey, voiceId, model } = body || {};

    const fallbackKey = 'sk-fish-tNdqjK_XbkVx27B8kO-TuYlx7EP6h5OnhWg3xe0W6us';
    const fallbackVoice = '82d13948027e4be69892dd3d0104e681';

    const effectiveApiKey = (apiKey && String(apiKey).trim()) || process.env.FISH_AUDIO_API_KEY || fallbackKey;
    const effectiveVoiceId = (voiceId && String(voiceId).trim()) || process.env.FISH_AUDIO_VOICE_ID || fallbackVoice;
    const effectiveModel = (model && String(model).trim()) || process.env.FISH_AUDIO_MODEL || 's2.1-pro-free';

    const cleanVoiceId = effectiveVoiceId.replace(/^id\s+/i, '').trim();

    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveApiKey}`,
        'Content-Type': 'application/json',
        'model': effectiveModel,
      },
      body: JSON.stringify({
        text: 'Teste de áudio Fish Audio validado com sucesso.',
        reference_id: cleanVoiceId,
        format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        success: false,
        status: response.status,
        error: `Falha na API Fish Audio (${response.status}): ${errText}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Conexão com Fish Audio validada com sucesso! API Key e Voice ID estão operacionais.',
      voiceId: cleanVoiceId,
      model: effectiveModel,
      platform: 'Vercel Serverless',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Erro ao testar credenciais: ${err?.message || 'Falha de rede'}`,
    });
  }
}
