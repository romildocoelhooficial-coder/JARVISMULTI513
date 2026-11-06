export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'Fish Audio TTS Proxy',
      model: process.env.FISH_AUDIO_MODEL || 's2.1-pro-free',
      voiceId: process.env.FISH_AUDIO_VOICE_ID || '82d13948027e4be69892dd3d0104e681',
      platform: 'Vercel Serverless Function',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Apenas requisições POST ou GET são permitidas.',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const isTest = req.query?.action === 'test' || body?.action === 'test' || req.url?.includes('test');

    const fallbackKey = 'sk-fish-tNdqjK_XbkVx27B8kO-TuYlx7EP6h5OnhWg3xe0W6us';
    const fallbackVoice = '82d13948027e4be69892dd3d0104e681';

    const effectiveApiKey = (body?.apiKey && String(body.apiKey).trim()) || process.env.FISH_AUDIO_API_KEY || fallbackKey;
    const effectiveVoiceId = (body?.voiceId && String(body.voiceId).trim()) || (body?.reference_id && String(body.reference_id).trim()) || process.env.FISH_AUDIO_VOICE_ID || fallbackVoice;
    const effectiveModel = (body?.model && String(body.model).trim()) || process.env.FISH_AUDIO_MODEL || 's2.1-pro-free';

    const cleanVoiceId = effectiveVoiceId.replace(/^id\s+/i, '').trim();

    if (isTest) {
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
        platform: 'Vercel Serverless (jarvis-tts)',
      });
    }

    // TTS synthesis
    const text = body?.text;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Texto obrigatório para síntese de voz.' });
    }

    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveApiKey}`,
        'Content-Type': 'application/json',
        'model': effectiveModel,
      },
      body: JSON.stringify({
        text: text.trim(),
        reference_id: cleanVoiceId,
        format: body?.format || 'mp3',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: 'Fish Audio TTS generation failed',
        status: response.status,
        details: errText,
      });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.status(200).send(buffer);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error during TTS',
      message: err?.message || 'Falha no processamento de áudio.',
    });
  }
}
