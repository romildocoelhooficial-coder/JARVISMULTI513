/**
 * JARVES Holo-Audio Storage & IndexedDB Manager
 * Handles local durable storage for user-uploaded MP3 and audio tracks,
 * metadata extraction, procedural audio generation for demo tracks,
 * and track playback management.
 */

export interface AudioTrack {
  id: string;
  userId?: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  size: number; // in bytes
  dateAdded: string;
  category: 'uploaded' | 'preset';
  blob?: Blob;
  arrayBuffer?: ArrayBuffer;
  mimeType?: string;
  url: string;
}

export interface YouTubeSongItem {
  id: string;
  userId?: string;
  title: string;
  artist: string;
  videoId: string; // 11-char YouTube ID, Dailymotion ID or search query / URL
  originalUrl?: string; // Exact user provided URL (e.g. results?search_query=... or watch?v=...)
  platform?: 'youtube' | 'dailymotion' | 'direct';
  category: string;
  description?: string;
  addedByUser?: boolean;
  source?: 'manual_entry' | 'json_import' | 'preset';
}

export const DEFAULT_YOUTUBE_SONGS: YouTubeSongItem[] = [
  {
    id: 'yt-1',
    title: 'Back in Black (Iron Man Theme)',
    artist: 'AC/DC',
    videoId: 'pAgnJDJN4VA',
    category: 'Rock Clássico',
    description: 'Tema clássico de Tony Stark e das indústrias Stark',
  },
  {
    id: 'yt-2',
    title: 'Iron Man (Live in Paris)',
    artist: 'Black Sabbath',
    videoId: '5s7_Wbi4Lx8',
    category: 'Heavy Metal',
    description: 'A inspiração original do Vingador Blindado',
  },
  {
    id: 'yt-3',
    title: 'Cyberpunk 2077 Synthwave Mix',
    artist: 'Night City Pulse',
    videoId: '8ZhnJmSTXm4',
    category: 'Synthwave / Sci-Fi',
    description: 'Ondas sintetizadas imersivas de alta tecnologia',
  },
  {
    id: 'yt-4',
    title: 'Interstellar - Live Suite',
    artist: 'Hans Zimmer',
    videoId: 'UDVtMYqUAyw',
    category: 'Épico / Orquestral',
    description: 'Trilha sonora cósmica e transcendente',
  },
  {
    id: 'yt-5',
    title: 'Lofi Hip Hop - Beats to Relax / Study',
    artist: 'Lofi Girl',
    videoId: 'jfKfPfyJRdk',
    category: 'Lofi / Foco',
    description: 'Batidas suaves ideais para produtividade e foco mental',
  },
  {
    id: 'yt-6',
    title: 'Tron: Legacy - The Grid Suite',
    artist: 'Daft Punk',
    videoId: 'tFXYuw96d0c',
    category: 'Eletrônica',
    description: 'Sinfonia futurista digital de circuitos e luz neon',
  },
  {
    id: 'yt-7',
    title: "Don't Stop Me Now",
    artist: 'Queen',
    videoId: 'HgzGwKwLmgM',
    category: 'Rock Clássico',
    description: 'Energia máxima para foco operacional e produtividade',
  },
  {
    id: 'yt-8',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    videoId: '4NRXx6U8ABQ',
    category: 'Pop / Retrowave',
    description: 'Synth-pop retro-futurista de alta energia',
  },
  {
    id: 'yt-9',
    title: 'Hear Me Now',
    artist: 'Alok, Bruno Martini, Zeeba',
    videoId: 'jvWxb_x8s50',
    category: 'Eletrônica',
    description: 'Hit internacional da música eletrônica brasileira',
  },
  {
    id: 'yt-10',
    title: 'Tempo Perdido',
    artist: 'Legião Urbana',
    videoId: 'o4o0_7kI3vA',
    category: 'Rock Nacional',
    description: 'Clássico imortal da música popular brasileira',
  },
  {
    id: 'yt-11',
    title: "Sweet Child O' Mine",
    artist: "Guns N' Roses",
    videoId: '1w7OgIMMRc4',
    category: 'Rock Clássico',
    description: 'Riff de guitarra inconfundível para foco e motivação',
  },
  {
    id: 'yt-12',
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    videoId: 'Zi_XLOBDo_Y',
    category: 'Pop / Retrowave',
    description: 'Clássico lendário do Rei do Pop',
  },
  {
    id: 'yt-13',
    title: 'Viva La Vida',
    artist: 'Coldplay',
    videoId: 'dvgZkm1xWPE',
    category: 'Pop / Alternativo',
    description: 'Orquestração e melodia grandiosa',
  },
  {
    id: 'yt-14',
    title: 'Não Quero Dinheiro (Só Quero Amar)',
    artist: 'Tim Maia',
    videoId: '663p-z3x5m8',
    category: 'Soul / MPB',
    description: 'Ritmo contagiante do Soul brasileiro',
  },
];

/**
 * Curated list of Brazilian MPB masterpieces for Romildo's YouTube gallery
 */
export const ROMILDO_MPB_YOUTUBE_SONGS: YouTubeSongItem[] = [
  {
    id: 'yt-romildo-1',
    title: 'Águas de Março',
    artist: 'Elis Regina & Tom Jobim',
    videoId: 'rkP8Z9v2f9Y',
    originalUrl: 'https://www.youtube.com/watch?v=rkP8Z9v2f9Y',
    category: 'MPB Clássico',
    description: 'Dueto histórico e inesquecível de 1974, um dos maiores clássicos da Bossa Nova e da MPB',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-2',
    title: 'Carinhoso',
    artist: 'Pixinguinha',
    videoId: 'r7XqI6tU9fM',
    originalUrl: 'https://www.youtube.com/results?search_query=Pixinguinha+Carinhoso+Oficial',
    category: 'Choro / MPB',
    description: 'Obra-prima imortal da música popular brasileira composta pelo mestre Pixinguinha',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-3',
    title: 'Mas que Nada',
    artist: 'Jorge Ben Jor',
    videoId: 'BRvyWc2hS9w',
    originalUrl: 'https://www.youtube.com/results?search_query=Jorge+Ben+Jor+Mas+que+Nada+Oficial',
    category: 'Samba-Rock / MPB',
    description: 'Hino internacional do samba-rock e da ginga brasileira de Jorge Ben Jor',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-4',
    title: 'Construção',
    artist: 'Chico Buarque',
    videoId: 'q9N16wG58-E',
    originalUrl: 'https://www.youtube.com/results?search_query=Chico+Buarque+Construcao+Oficial',
    category: 'MPB Clássico',
    description: 'Monumento poético e lírico da MPB com métrica proparoxítona e crítica social genial',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-5',
    title: 'O Mundo É um Moinho',
    artist: 'Cartola',
    videoId: '6qV5tYm_wEQ',
    originalUrl: 'https://www.youtube.com/results?search_query=Cartola+O+Mundo+E+um+Moinho+Oficial',
    category: 'Samba / MPB',
    description: 'Composição comovente, lírica e atemporal do mestre Cartola da Estação Primeira de Mangueira',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-6',
    title: 'Maria, Maria',
    artist: 'Milton Nascimento',
    videoId: 'X3E3e7bH8gM',
    originalUrl: 'https://www.youtube.com/results?search_query=Milton+Nascimento+Maria+Maria+Oficial',
    category: 'Clube da Esquina',
    description: 'A força, a raça e a fé da mulher brasileira cantadas com a genialidade de Bituca',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-7',
    title: 'Alegria, Alegria',
    artist: 'Caetano Veloso',
    videoId: '6vM7y1zVl-E',
    originalUrl: 'https://www.youtube.com/results?search_query=Caetano+Veloso+Alegria+Alegria+Oficial',
    category: 'Tropicalismo',
    description: 'Marco inaugural e divisor de águas do Tropicalismo no histórico festival da TV Record de 1967',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-8',
    title: 'Baby',
    artist: 'Gal Costa',
    videoId: 'gU6N6y1e2h8',
    originalUrl: 'https://www.youtube.com/results?search_query=Gal+Costa+Baby+Oficial',
    category: 'Tropicalismo',
    description: 'Interpretação icônica, cristalina e doce de Gal Costa para o hino de Caetano Veloso',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-9',
    title: 'Aquele Abraço',
    artist: 'Gilberto Gil',
    videoId: '2s28fG04tL8',
    originalUrl: 'https://www.youtube.com/results?search_query=Gilberto+Gil+Aquele+Abraco+Oficial',
    category: 'Tropicalismo / Samba',
    description: 'A celebração do Rio de Janeiro, do povo brasileiro e da cultura popular por Gilberto Gil',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-10',
    title: 'Oceano',
    artist: 'Djavan',
    videoId: 'Kx18a7p96_Y',
    originalUrl: 'https://www.youtube.com/results?search_query=Djavan+Oceano+Oficial',
    category: 'MPB Clássico',
    description: 'Harmonia refinada, poesia arrebatadora e interpretação sublime de Djavan',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-11',
    title: 'La Belle de Jour',
    artist: 'Alceu Valença',
    videoId: '9yR2wA8cE_M',
    originalUrl: 'https://www.youtube.com/results?search_query=Alceu+Valenca+La+Belle+de+Jour+Oficial',
    category: 'Frevo / Regional',
    description: 'Obra-prima poética do cancioneiro nordestino inspirada na praia de Boa Viagem e Paris',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-12',
    title: 'Asa Branca',
    artist: 'Luiz Gonzaga',
    videoId: 'Yw3c26A59aM',
    originalUrl: 'https://www.youtube.com/results?search_query=Luiz+Gonzaga+Asa+Branca+Oficial',
    category: 'Baião / Nordeste',
    description: 'O verdadeiro hino do sertão brasileiro e da esperança nordestina composto pelo Rei do Baião',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-13',
    title: 'O Mar Serenou',
    artist: 'Clara Nunes',
    videoId: '9q8N1m5_zPQ',
    originalUrl: 'https://www.youtube.com/results?search_query=Clara+Nunes+O+Mar+Serenou+Oficial',
    category: 'Samba de Raiz',
    description: 'A força e a luz inesquecível de Clara Nunes celebrando Iemanjá e as tradições de Candeia',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-14',
    title: 'Como Nossos Pais',
    artist: 'Elis Regina',
    videoId: 'L5K3P21qR40',
    originalUrl: 'https://www.youtube.com/results?search_query=Elis+Regina+Como+Nossos+Pais+Oficial',
    category: 'MPB Clássico',
    description: 'A contundente e arrebatadora interpretação da composição de Belchior na voz de Elis Regina',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-15',
    title: 'Ainda Bem',
    artist: 'Marisa Monte',
    videoId: 'hSgU9aH6g8Q',
    originalUrl: 'https://www.youtube.com/results?search_query=Marisa+Monte+Ainda+Bem+Oficial',
    category: 'MPB Contemporânea',
    description: 'Elegância, delicadeza melódica e arranjo acústico refinado na voz cristalina de Marisa Monte',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-16',
    title: 'Tempo Perdido',
    artist: 'Legião Urbana',
    videoId: 'o4o0_7kI3vA',
    originalUrl: 'https://www.youtube.com/results?search_query=Legiao+Urbana+Tempo+Perdido+Oficial',
    category: 'Rock Nacional',
    description: 'Somos tão jovens: o maior hino do rock lírico brasileiro composto por Renato Russo',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
  {
    id: 'yt-romildo-17',
    title: 'Exagerado',
    artist: 'Cazuza',
    videoId: '3aW6K4s2q_Q',
    originalUrl: 'https://www.youtube.com/results?search_query=Cazuza',
    category: 'Rock Nacional / MPB',
    description: 'Paixão desmedida, poesia visceral e entrega absoluta na voz inconfundível do eterno poeta Cazuza',
    userId: 'usr-romildo-master',
    addedByUser: true,
  },
];

/**
 * Extracts search query keywords if a YouTube search URL was provided
 */
export function extractYouTubeSearchQuery(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/[?&]search_query=([^&]+)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch {
      return match[1].replace(/\+/g, ' ');
    }
  }
  return trimmed;
}

/**
 * Extracts a YouTube Video ID from any URL or raw string
 */
export function extractYouTubeVideoId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Standard youtube.com/watch?v=ID
  const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vMatch && vMatch[1]) return vMatch[1];

  // Short youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  // Embed youtube.com/embed/ID
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  // Shorts youtube.com/shorts/ID
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  // If search URL or general query, return as-is
  return trimmed;
}

/**
 * Extracts a Dailymotion Video ID from any URL or raw string
 * Supported formats:
 * - https://www.dailymotion.com/video/x8n6f1q
 * - https://dai.ly/x8n6f1q
 * - https://www.dailymotion.com/embed/video/x8n6f1q
 */
export function extractDailymotionVideoId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const daiMatch = trimmed.match(/dai\.ly\/([a-zA-Z0-9]+)/);
  if (daiMatch && daiMatch[1]) return daiMatch[1];
  const dmMatch = trimmed.match(/dailymotion\.com\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/);
  if (dmMatch && dmMatch[1]) return dmMatch[1];
  return trimmed;
}

/**
 * Detects whether a URL belongs to YouTube, Dailymotion, or is a direct video link
 */
export function detectVideoPlatform(urlOrId: string): 'youtube' | 'dailymotion' | 'direct' {
  if (!urlOrId) return 'youtube';
  const lower = urlOrId.toLowerCase();
  if (lower.includes('dailymotion.com') || lower.includes('dai.ly')) return 'dailymotion';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.m3u8')) return 'direct';
  return 'youtube';
}

/**
 * Builds responsive, auto-playing embed URLs for YouTube or Dailymotion
 */
export function buildEmbedVideoUrl(item: {
  videoId: string;
  platform?: 'youtube' | 'dailymotion' | 'direct';
  originalUrl?: string;
  title?: string;
  artist?: string;
}): string {
  const platform = item.platform || detectVideoPlatform(item.originalUrl || item.videoId);
  if (platform === 'dailymotion') {
    const cleanId = extractDailymotionVideoId(item.videoId || item.originalUrl || '');
    return `https://www.dailymotion.com/embed/video/${cleanId}?autoplay=1`;
  }
  // YouTube fallback
  const cleanId = extractYouTubeVideoId(item.videoId) || item.videoId;
  if (cleanId.includes('search_query=') || cleanId.startsWith('search:') || cleanId.includes('/results')) {
    const q = extractYouTubeSearchQuery(cleanId) || `${item.title || ''} ${item.artist || ''}`.trim();
    return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(q)}&autoplay=1`;
  }
  return `https://www.youtube.com/embed/${cleanId}?autoplay=1&rel=0`;
}

/**
 * Generates an example JSON template for bulk-importing user MP3s and Video links
 */
export function generateMediaImportSampleJson(): string {
  const sample = {
    sistema: "JARVES Holo-Audio & Video Library",
    versao: "4.2",
    instrucoes: "Este modelo permite importar em massa músicas MP3 e links de vídeos (YouTube e Dailymotion) para a sua biblioteca individual no JARVES. Preencha ou edite os dados e importe diretamente no painel.",
    musicas_mp3: [
      {
        title: "Iron Man Theme (Holo-Audio)",
        artist: "Tony Stark Laboratories",
        url: "https://actions.google.com/sounds/v1/science_fiction/scifi_engine_run_steady.ogg",
        genre: "Sci-Fi / Trilha",
        duration: 180
      },
      {
        title: "Synthwave Pulse 2026",
        artist: "JARVES Cybernetics",
        url: "https://actions.google.com/sounds/v1/science_fiction/teleport.ogg",
        genre: "Synthwave",
        duration: 215
      }
    ],
    videos_links: [
      {
        title: "Back in Black (Iron Man Theme)",
        artist: "AC/DC",
        url: "https://www.youtube.com/watch?v=pAgnJDJN4VA",
        platform: "youtube",
        category: "Rock Clássico",
        description: "Tema icônico de Tony Stark no JARVES"
      },
      {
        title: "Documentário Tecnologia Aeroespacial",
        artist: "Dailymotion Science",
        url: "https://www.dailymotion.com/video/x8n6f1q",
        platform: "dailymotion",
        category: "Ciência & Engenharia",
        description: "Vídeo streaming em alta definição via Dailymotion"
      },
      {
        title: "Águas de Março",
        artist: "Elis Regina & Tom Jobim",
        url: "https://www.youtube.com/watch?v=rkP8Z9v2f9Y",
        platform: "youtube",
        category: "MPB Clássico",
        description: "Obra-prima da MPB brasileira"
      }
    ]
  };
  return JSON.stringify(sample, null, 2);
}

/**
 * Parses and validates an uploaded or pasted JSON file for mass-import
 */
export function parseAndValidateMediaImportJson(
  jsonText: string,
  userId: string
): {
  success: boolean;
  mp3s: AudioTrack[];
  videos: YouTubeSongItem[];
  error?: string;
} {
  try {
    const data = JSON.parse(jsonText);
    const mp3s: AudioTrack[] = [];
    const videos: YouTubeSongItem[] = [];

    // Parse MP3s
    if (Array.isArray(data.musicas_mp3)) {
      for (let i = 0; i < data.musicas_mp3.length; i++) {
        const item = data.musicas_mp3[i];
        if (item && item.title) {
          const trackId = `track-json-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
          mp3s.push({
            id: trackId,
            userId,
            title: String(item.title).trim(),
            artist: String(item.artist || 'Artista').trim(),
            duration: Number(item.duration) || 180,
            size: 1024 * 1024 * 3,
            dateAdded: new Date().toLocaleDateString('pt-BR'),
            category: 'uploaded',
            url: item.url || item.file_url || '',
          });
        }
      }
    }

    // Parse Videos (YouTube, Dailymotion, Direct)
    if (Array.isArray(data.videos_links)) {
      for (let i = 0; i < data.videos_links.length; i++) {
        const item = data.videos_links[i];
        if (item && item.title) {
          const rawUrl = String(item.url || item.video_url || item.videoId || '').trim();
          const platform = item.platform || detectVideoPlatform(rawUrl);
          const videoId = platform === 'dailymotion'
            ? extractDailymotionVideoId(rawUrl)
            : extractYouTubeVideoId(rawUrl);

          const songId = `yt-json-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
          videos.push({
            id: songId,
            userId,
            title: String(item.title).trim(),
            artist: String(item.artist || (platform === 'dailymotion' ? 'Dailymotion' : 'YouTube')).trim(),
            videoId: videoId || rawUrl,
            originalUrl: rawUrl,
            platform,
            category: String(item.category || 'Importado via JSON').trim(),
            description: item.description ? String(item.description).trim() : undefined,
            addedByUser: true,
            source: 'json_import',
          });
        }
      }
    }

    if (mp3s.length === 0 && videos.length === 0) {
      return {
        success: false,
        mp3s: [],
        videos: [],
        error: 'Nenhuma música ("musicas_mp3") ou vídeo ("videos_links") válido foi encontrado no JSON fornecido.',
      };
    }

    return { success: true, mp3s, videos };
  } catch (err: any) {
    return {
      success: false,
      mp3s: [],
      videos: [],
      error: `Erro de sintaxe JSON: ${err?.message || 'Arquivo inválido'}`,
    };
  }
}

/**
 * Saves a track from a direct MP3 stream URL into user's IndexedDB
 */
export async function saveDirectUrlTrack(
  userId: string,
  title: string,
  artist: string,
  url: string,
  genre: string = 'Geral',
  duration: number = 180
): Promise<AudioTrack> {
  const targetUserId = userId ? userId.trim() : 'usr-romildo-master';
  const trackId = `track-url-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const db = await openDB();

  // Create procedural fallback buffer so it can play even if offline
  const fallbackBlob = await createProceduralTrackWav('synthwave');
  const fallbackBuffer = await fallbackBlob.arrayBuffer();

  const track: AudioTrack = {
    id: trackId,
    userId: targetUserId,
    title: title.trim() || 'Faixa de Áudio MP3',
    artist: artist.trim() || 'Artista',
    duration: duration > 0 ? duration : 180,
    size: fallbackBlob.size,
    dateAdded: new Date().toLocaleDateString('pt-BR'),
    category: 'uploaded',
    url: url.trim(),
    blob: fallbackBlob,
    arrayBuffer: fallbackBuffer,
    mimeType: 'audio/mp3',
  };

  await saveTrackToDB(db, {
    id: track.id,
    userId: track.userId,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    size: track.size,
    dateAdded: track.dateAdded,
    category: track.category,
    arrayBuffer: track.arrayBuffer,
    mimeType: track.mimeType,
    blob: track.blob,
    url: track.url,
  });

  return track;
}

/**
 * Bulk imports MP3s and Videos for a specific user into IndexedDB and localStorage
 */
export async function importBulkMediaItems(
  userId: string,
  mp3s: AudioTrack[],
  videos: YouTubeSongItem[]
): Promise<{ addedTracks: AudioTrack[]; addedVideos: YouTubeSongItem[] }> {
  const targetUserId = userId ? userId.trim() : 'usr-romildo-master';
  const db = await openDB();
  const addedTracks: AudioTrack[] = [];

  for (const m of mp3s) {
    try {
      const fallbackBlob = await createProceduralTrackWav('synthwave');
      const fallbackBuffer = await fallbackBlob.arrayBuffer();
      const track: AudioTrack = {
        ...m,
        userId: targetUserId,
        blob: fallbackBlob,
        arrayBuffer: fallbackBuffer,
        mimeType: 'audio/mp3',
        url: m.url || URL.createObjectURL(fallbackBlob),
      };
      await saveTrackToDB(db, {
        id: track.id,
        userId: targetUserId,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        size: track.size,
        dateAdded: track.dateAdded,
        category: 'uploaded',
        arrayBuffer: track.arrayBuffer,
        mimeType: track.mimeType,
        blob: track.blob,
        url: track.url,
      });
      addedTracks.push(track);
    } catch (e) {
      console.warn('Could not save imported track to DB:', m.title, e);
    }
  }

  // Videos
  const existingVideos = loadYouTubeSongs(targetUserId);
  const existingIds = new Set(existingVideos.map((v) => (v.videoId || '').toLowerCase().trim()));
  const existingTitles = new Set(existingVideos.map((v) => v.title.toLowerCase().trim()));

  const addedVideos: YouTubeSongItem[] = [];
  for (const v of videos) {
    const vidKey = (v.videoId || '').toLowerCase().trim();
    const titleKey = v.title.toLowerCase().trim();
    if (!existingIds.has(vidKey) && !existingTitles.has(titleKey)) {
      addedVideos.push({
        ...v,
        userId: targetUserId,
      });
      existingIds.add(vidKey);
      existingTitles.add(titleKey);
    }
  }

  const updatedVideos = [...addedVideos, ...existingVideos];
  saveYouTubeSongs(updatedVideos, targetUserId);

  // Sync with backend API in background if online
  try {
    fetch('/api/media/import-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: targetUserId,
        tracks: addedTracks.map((t) => ({
          title: t.title,
          artist: t.artist,
          url: t.url,
          genre: 'Geral',
          duration: t.duration,
        })),
        videos: addedVideos.map((v) => ({
          title: v.title,
          artist: v.artist,
          url: v.originalUrl || v.videoId,
          platform: v.platform || 'youtube',
          videoId: v.videoId,
          category: v.category,
        })),
      }),
    }).catch(() => {});
  } catch {}

  return { addedTracks, addedVideos };
}

function getYtStorageKey(userId?: string): string {
  const safeUser = userId ? userId.trim() : 'usr-romildo-master';
  return `JARVES_YT_PLAYLIST_${safeUser}`;
}

/**
 * Loads YouTube suggested songs from localStorage for a specific user, or initializes defaults.
 * For Romildo, ensures the requested 17 Brazilian MPB masterpieces are always included.
 */
export function loadYouTubeSongs(userId?: string): YouTubeSongItem[] {
  try {
    const key = getYtStorageKey(userId);
    let raw = localStorage.getItem(key);
    if (raw === 'undefined' || raw === 'null') {
      try {
        localStorage.removeItem(key);
      } catch {}
      raw = null;
    }
    const targetUserId = userId ? userId.trim() : 'usr-romildo-master';
    const isRomildo = targetUserId === 'usr-romildo-master' || targetUserId === 'usr-001';

    let currentSongs: YouTubeSongItem[] = [];

    if (raw && raw.trim() !== '') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          currentSongs = parsed;
        }
      } catch (e) {
        console.warn('Error parsing YouTube playlist from localStorage:', e);
      }
    } else {
      // If master user, check legacy key
      if (isRomildo) {
        let legacy = localStorage.getItem('JARVES_YT_SUGGESTIONS');
        if (legacy === 'undefined' || legacy === 'null') {
          try {
            localStorage.removeItem('JARVES_YT_SUGGESTIONS');
          } catch {}
          legacy = null;
        }
        if (legacy && legacy.trim() !== '') {
          try {
            const parsedLegacy = JSON.parse(legacy);
            if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
              currentSongs = parsedLegacy.map((item: any) => ({
                ...item,
                userId: targetUserId,
              }));
            }
          } catch {}
        }
      }

      // Default curated songs cloned specifically for this user
      if (currentSongs.length === 0) {
        if (isRomildo) {
          currentSongs = [
            ...ROMILDO_MPB_YOUTUBE_SONGS,
            ...DEFAULT_YOUTUBE_SONGS.map((item) => ({
              ...item,
              id: `${item.id}-${targetUserId}`,
              userId: targetUserId,
            })),
          ];
        } else {
          currentSongs = DEFAULT_YOUTUBE_SONGS.map((item) => ({
            ...item,
            id: `${item.id}-${targetUserId}`,
            userId: targetUserId,
          }));
        }
        localStorage.setItem(key, JSON.stringify(currentSongs));
        return currentSongs;
      }
    }

    // If this is Romildo, ensure all 17 songs requested are present and up to date
    if (isRomildo) {
      let hasChanges = false;
      const existingTitles = new Set(
        currentSongs.map((s) => s.title.toLowerCase().trim())
      );

      // Prepend any missing Romildo tracks
      const missingRomildoTracks = ROMILDO_MPB_YOUTUBE_SONGS.filter(
        (song) => !existingTitles.has(song.title.toLowerCase().trim())
      );

      if (missingRomildoTracks.length > 0) {
        currentSongs = [...missingRomildoTracks, ...currentSongs];
        hasChanges = true;
      }

      // Also enrich any existing tracks matching Romildo's list
      currentSongs = currentSongs.map((s) => {
        const matchingRomildo = ROMILDO_MPB_YOUTUBE_SONGS.find(
          (r) => r.title.toLowerCase().trim() === s.title.toLowerCase().trim()
        );
        if (matchingRomildo) {
          let updatedItem = { ...s };
          if (!s.originalUrl && matchingRomildo.originalUrl) {
            updatedItem.originalUrl = matchingRomildo.originalUrl;
            hasChanges = true;
          }
          if (!s.videoId && matchingRomildo.videoId) {
            updatedItem.videoId = matchingRomildo.videoId;
            hasChanges = true;
          }
          return updatedItem;
        }
        return s;
      });

      if (hasChanges) {
        localStorage.setItem(key, JSON.stringify(currentSongs));
      }
    }

    return currentSongs.length > 0 ? currentSongs : DEFAULT_YOUTUBE_SONGS;
  } catch (e) {
    console.warn('Failed to load YouTube suggestions from localStorage:', e);
    return DEFAULT_YOUTUBE_SONGS;
  }
}

/**
 * Saves YouTube playlist to localStorage for a specific user
 */
export function saveYouTubeSongs(songs: YouTubeSongItem[], userId?: string): void {
  try {
    if (!Array.isArray(songs) || songs.length === 0) return;
    const key = getYtStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(songs));
  } catch (e) {
    console.error('Failed to save YouTube songs to localStorage:', e);
  }
}

/**
 * Resets YouTube playlist back to default curated factory items for a specific user.
 * For Romildo, preserves his 17 curated Brazilian MPB songs!
 */
export function resetYouTubeSongsToDefault(userId?: string): YouTubeSongItem[] {
  try {
    const key = getYtStorageKey(userId);
    const targetUserId = userId ? userId.trim() : 'usr-romildo-master';
    const isRomildo = targetUserId === 'usr-romildo-master' || targetUserId === 'usr-001';

    const baseDefaults = DEFAULT_YOUTUBE_SONGS.map((item) => ({
      ...item,
      id: `${item.id}-${targetUserId}`,
      userId: targetUserId,
    }));

    const userDefaults = isRomildo
      ? [...ROMILDO_MPB_YOUTUBE_SONGS, ...baseDefaults]
      : baseDefaults;

    localStorage.setItem(key, JSON.stringify(userDefaults));
    return userDefaults;
  } catch (e) {
    console.error('Failed to reset YouTube songs:', e);
    return DEFAULT_YOUTUBE_SONGS;
  }
}

const DB_NAME = 'JARVES_MEDIA_DB';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

// Open or initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

/**
 * Procedurally generates a futuristic synth audio track as a real playable WAV Blob
 * to ensure JARVES always has high-tech music available out-of-the-box.
 */
function createProceduralTrackWav(type: 'synthwave' | 'ambient' | 'pulse'): Promise<Blob> {
  return new Promise((resolve) => {
    const sampleRate = 22050;
    const durationSec = 14; // 14 seconds loopable
    const numSamples = sampleRate * durationSec;
    const buffer = new Float32Array(numSamples);

    // Chords and frequencies
    const baseFreq = type === 'synthwave' ? 110 : type === 'ambient' ? 130.81 : 98; // A2, C3, G2
    const scales = type === 'synthwave' ? [1, 1.25, 1.5, 1.875] : [1, 1.2, 1.5, 1.6];

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const beat = Math.floor(t * 2) % 4;
      const currentMultiplier = scales[beat % scales.length];
      const freq = baseFreq * currentMultiplier;

      // Bass drone with warm pulse
      const bass = Math.sin(2 * Math.PI * (baseFreq / 2) * t) * 0.35;
      // Arp melodic note
      const arp = Math.sin(2 * Math.PI * freq * t) * 0.25 * Math.exp(-((t * 2) % 1) * 3);
      // Hi-hat / rhythmic ticking
      const noise = (Math.random() * 2 - 1) * (i % (sampleRate / 4) < 1500 ? 0.08 : 0);
      // Sub-harmonic warm sweep
      const sweep = Math.sin(2 * Math.PI * (baseFreq * 0.75 + Math.sin(t * 0.8) * 15) * t) * 0.15;

      buffer[i] = Math.max(-1, Math.min(1, bass + arp + noise + sweep));
    }

    // Convert Float32Array to 16-bit PCM WAV Blob
    const wavBytes = encodeWAV(buffer, sampleRate);
    resolve(new Blob([wavBytes], { type: 'audio/wav' }));
  });
}

// Minimal WAV encoder
function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // FMT sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // Data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Initializes the default track presets for a specific user.
 */
export async function initPresetTracks(userId?: string): Promise<AudioTrack[]> {
  const targetUserId = userId ? userId.trim() : 'usr-romildo-master';
  try {
    const db = await openDB();

    // Create preset tracks
    const [blob1, blob2, blob3] = await Promise.all([
      createProceduralTrackWav('synthwave'),
      createProceduralTrackWav('ambient'),
      createProceduralTrackWav('pulse'),
    ]);

    const [buf1, buf2, buf3] = await Promise.all([
      blob1.arrayBuffer(),
      blob2.arrayBuffer(),
      blob3.arrayBuffer(),
    ]);

    const presets: AudioTrack[] = [
      {
        id: `preset-${targetUserId}-1`,
        userId: targetUserId,
        title: 'Stark Industries Workshop (Theme)',
        artist: 'JARVES Core Synth',
        duration: 14,
        size: blob1.size,
        dateAdded: 'Predefinido',
        category: 'preset',
        blob: blob1,
        arrayBuffer: buf1,
        mimeType: 'audio/wav',
        url: URL.createObjectURL(blob1),
      },
      {
        id: `preset-${targetUserId}-2`,
        userId: targetUserId,
        title: 'Arc Reactor Ambient Resonance',
        artist: 'JARVES Lab Labs',
        duration: 14,
        size: blob2.size,
        dateAdded: 'Predefinido',
        category: 'preset',
        blob: blob2,
        arrayBuffer: buf2,
        mimeType: 'audio/wav',
        url: URL.createObjectURL(blob2),
      },
      {
        id: `preset-${targetUserId}-3`,
        userId: targetUserId,
        title: 'Quantum Pulse Cyber Beats',
        artist: 'Tony Stark Audio AI',
        duration: 14,
        size: blob3.size,
        dateAdded: 'Predefinido',
        category: 'preset',
        blob: blob3,
        arrayBuffer: buf3,
        mimeType: 'audio/wav',
        url: URL.createObjectURL(blob3),
      },
    ];

    for (const t of presets) {
      await saveTrackToDB(db, {
        id: t.id,
        userId: t.userId,
        title: t.title,
        artist: t.artist,
        duration: t.duration,
        size: t.size,
        dateAdded: t.dateAdded,
        category: t.category,
        arrayBuffer: t.arrayBuffer,
        mimeType: t.mimeType,
        blob: t.blob,
      });
    }

    return presets;
  } catch (err) {
    console.warn('Failed to initialize preset tracks in IndexedDB, generating in-memory fallbacks', err);
    try {
      const b1 = await createProceduralTrackWav('synthwave');
      return [
        {
          id: `fallback-${targetUserId}-1`,
          userId: targetUserId,
          title: 'Stark Industries Workshop',
          artist: 'JARVES Core Audio',
          duration: 14,
          size: b1.size,
          dateAdded: 'Predefinido',
          category: 'preset',
          blob: b1,
          url: URL.createObjectURL(b1),
        },
      ];
    } catch {
      return [];
    }
  }
}

function getAllStoredTracksFromDB(db: IDBDatabase): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function saveTrackToDB(db: IDBDatabase, track: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(track);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function removeTrackFromDB(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Saves a user-uploaded MP3/Audio file into durable IndexedDB, tagged with user ID
 */
export async function saveUploadedAudioFile(file: File, userId?: string, artistName?: string): Promise<AudioTrack> {
  const targetUserId = userId ? userId.trim() : 'usr-romildo-master';
  const db = await openDB();

  // Read arrayBuffer and mimeType for maximum storage durability
  const arrayBuffer = await file.arrayBuffer();
  const mimeType = file.type || (file.name.endsWith('.mp3') ? 'audio/mpeg' : file.name.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg');
  const freshBlob = new Blob([arrayBuffer], { type: mimeType });

  // Extract duration using an audio element
  const tempUrl = URL.createObjectURL(freshBlob);
  const duration = await new Promise<number>((resolve) => {
    const audio = new Audio();
    audio.src = tempUrl;
    audio.onloadedmetadata = () => {
      resolve(Math.round(audio.duration || 0));
      URL.revokeObjectURL(tempUrl);
    };
    audio.onerror = () => {
      resolve(0);
      URL.revokeObjectURL(tempUrl);
    };
  });

  // Parse title and artist from filename
  let cleanName = file.name.replace(/\.[^/.]+$/, '');
  let artist = artistName || 'Usuário JARVES';
  let title = cleanName;

  if (cleanName.includes(' - ')) {
    const parts = cleanName.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }

  const newTrack: AudioTrack = {
    id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    userId: targetUserId,
    title,
    artist,
    duration,
    size: file.size,
    dateAdded: new Date().toLocaleDateString('pt-BR'),
    category: 'uploaded',
    blob: freshBlob,
    arrayBuffer,
    mimeType,
    url: URL.createObjectURL(freshBlob),
  };

  await saveTrackToDB(db, {
    id: newTrack.id,
    userId: newTrack.userId,
    title: newTrack.title,
    artist: newTrack.artist,
    duration: newTrack.duration,
    size: newTrack.size,
    dateAdded: newTrack.dateAdded,
    category: newTrack.category,
    arrayBuffer: newTrack.arrayBuffer,
    mimeType: newTrack.mimeType,
    blob: newTrack.blob,
  });

  return newTrack;
}

/**
 * Updates an audio track's metadata (title, artist, category)
 */
export async function updateAudioTrack(
  id: string,
  updates: { title?: string; artist?: string; category?: 'uploaded' | 'preset' },
  userId?: string
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) {
        resolve();
        return;
      }
      if (updates.title !== undefined) item.title = updates.title.trim();
      if (updates.artist !== undefined) item.artist = updates.artist.trim();
      if (updates.category !== undefined) item.category = updates.category;
      if (userId && !item.userId) item.userId = userId;

      const putReq = store.put(item);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Resets audio tracks for a specific user to default procedural presets
 */
export async function resetUserTracksToDefault(userId?: string): Promise<AudioTrack[]> {
  const targetUserId = userId ? userId.trim() : 'usr-romildo-master';
  const db = await openDB();
  const all = await getAllStoredTracksFromDB(db);
  const userItems = all.filter((r) => r.userId === targetUserId || (!r.userId && targetUserId === 'usr-romildo-master'));

  for (const item of userItems) {
    await removeTrackFromDB(db, item.id);
  }

  return await initPresetTracks(targetUserId);
}

/**
 * Deletes an audio track by ID
 */
export async function deleteAudioTrack(id: string): Promise<void> {
  const db = await openDB();
  await removeTrackFromDB(db, id);
}

/**
 * Retrieves all saved audio tracks for a specific user with active ObjectURLs
 */
export async function loadAllTracks(userId?: string): Promise<AudioTrack[]> {
  const targetUserId = userId ? userId.trim() : 'usr-romildo-master';
  const isMaster = targetUserId === 'usr-romildo-master';

  try {
    const db = await openDB();
    const records = await getAllStoredTracksFromDB(db);

    // Filter tracks belonging to targetUserId
    // If master, also include legacy tracks without userId
    let userRecords = records.filter(
      (record) => record.userId === targetUserId || (!record.userId && isMaster)
    );

    if (userRecords.length === 0) {
      return await initPresetTracks(targetUserId);
    }

    return await Promise.all(
      userRecords.map(async (record, idx) => {
        let blob = record.blob;
        if (blob && !(blob instanceof Blob) && record.arrayBuffer) {
          blob = new Blob([record.arrayBuffer], { type: record.mimeType || 'audio/wav' });
        } else if (!blob && record.arrayBuffer) {
          blob = new Blob([record.arrayBuffer], { type: record.mimeType || 'audio/wav' });
        }

        if (!blob || !(blob instanceof Blob) || blob.size === 0) {
          const types: ('synthwave' | 'ambient' | 'pulse')[] = ['synthwave', 'ambient', 'pulse'];
          blob = await createProceduralTrackWav(types[idx % 3]);
        }

        let url = record.url && (record.url.startsWith('http://') || record.url.startsWith('https://') || record.url.startsWith('data:')) ? record.url : '';
        if (!url) {
          try {
            url = URL.createObjectURL(blob);
          } catch (e) {
            console.warn('Could not create ObjectURL for track:', record.id, e);
          }
        }

        return {
          ...record,
          userId: record.userId || targetUserId,
          blob,
          url,
        };
      })
    );
  } catch (e) {
    console.error('Error loading tracks from IndexedDB:', e);
    return await initPresetTracks(targetUserId);
  }
}

/**
 * Fuzzy search for a track by name/artist in the given playlist
 */
export function findTrackInList(tracks: AudioTrack[], query: string): AudioTrack | undefined {
  if (!query || tracks.length === 0) return tracks[0];

  const q = query.toLowerCase().trim();
  // Exact or contains match in title
  const match = tracks.find((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
  if (match) return match;

  // Split query words and find track with most matches
  const words = q.split(/\s+/);
  let bestTrack: AudioTrack | undefined;
  let maxScore = 0;

  for (const t of tracks) {
    const full = (t.title + ' ' + t.artist).toLowerCase();
    let score = 0;
    for (const w of words) {
      if (w.length > 2 && full.includes(w)) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestTrack = t;
    }
  }

  return bestTrack || tracks[0];
}
