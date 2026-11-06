/**
 * High-Precision Brazilian Portuguese Voice Command & Intent Parser for JARVES
 * Provides instant phonetic normalization, spelled-out currency/number resolution,
 * multi-domain intent classification, and natural verbal feedback generation.
 */

export interface ParsedVoiceCommand {
  type:
    | 'finance'
    | 'finance_query'
    | 'temperature'
    | 'calendar'
    | 'whatsapp_origin'
    | 'whatsapp_automation'
    | 'whatsapp_send'
    | 'control_hardware'
    | 'execute_pc_command'
    | 'camera_vision'
    | 'navigate'
    | 'system_status'
    | 'youtube_search'
    | 'media_player'
    | 'open_link'
    | 'save_system'
    | 'unknown';
  action: string;
  args: Record<string, any>;
  confidence: number;
  explanation: string;
  spokenResponse?: string;
  matchedText?: string;
}

// Map of spoken Portuguese number terms to numeric values
const NUMBER_MAP: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  três: 3,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  meia: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  duzentos: 200,
  duzentas: 200,
  trezentos: 300,
  trezentas: 300,
  quatrocentos: 400,
  quatrocentas: 400,
  quinhentos: 500,
  quinhentas: 500,
  seiscentos: 600,
  seiscentas: 600,
  setecentos: 700,
  setecentas: 700,
  oitocentos: 800,
  oitocentas: 800,
  novecentos: 900,
  novecentas: 900,
  mil: 1000,
};

/**
 * Extracts phone numbers from voice transcripts with spoken words or digits.
 * Supports Brazilian national and international prefixes, DDD, and spelled-out numbers.
 */
export function extractPhoneNumber(text: string): { raw: string; clean: string; formatted: string } | null {
  if (!text || text.trim().length < 3) return null;

  // 1. Convert any spoken number words to numeric digits
  let converted = text.toLowerCase();
  for (const [w, num] of Object.entries(NUMBER_MAP)) {
    converted = converted.replace(new RegExp(`\\b${w}\\b`, 'gi'), String(num));
  }

  // 2. Remove common text that might get blended with digits
  converted = converted.replace(/\b(?:ddd|número|numero|tel|fone|telefone|celular|zap|whatsapp)\b/gi, ' ');

  // 3. Search for digit sequences (with spaces, hyphens, parentheses, plus signs)
  const matches = converted.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\s*\d{4}[\s-]?\d{4}/g) ||
                  converted.match(/\b(?:\d[\s-]?){8,14}\d\b/g);

  if (!matches || matches.length === 0) return null;

  // Pick candidate with most digits
  const candidate = matches.sort((a, b) => b.replace(/\D/g, '').length - a.replace(/\D/g, '').length)[0];
  const digits = candidate.replace(/\D/g, '');

  if (digits.length < 8 || digits.length > 14) return null;

  let fullDigits = digits;
  // If 8 or 9 digits without DDD, assume standard SP DDD 11
  if (fullDigits.length === 8 || fullDigits.length === 9) {
    fullDigits = '5511' + fullDigits;
  } else if (fullDigits.length === 10 || fullDigits.length === 11) {
    fullDigits = '55' + fullDigits;
  }

  // Format into standard display format: +55 (DD) 9XXXX-XXXX
  let formatted = '+' + fullDigits;
  if (fullDigits.startsWith('55') && fullDigits.length === 13) {
    formatted = `+55 (${fullDigits.slice(2, 4)}) ${fullDigits.slice(4, 9)}-${fullDigits.slice(9)}`;
  } else if (fullDigits.startsWith('55') && fullDigits.length === 12) {
    formatted = `+55 (${fullDigits.slice(2, 4)}) ${fullDigits.slice(4, 8)}-${fullDigits.slice(8)}`;
  }

  return {
    raw: candidate.trim(),
    clean: fullDigits,
    formatted,
  };
}

/**
 * Normalizes Brazilian Portuguese voice transcript:
 * - Removes introductory greetings and wake-word variations ("jarvis", "jarves", "por favor")
 * - Converts spelled-out Portuguese numbers (e.g., "vinte e dois", "cento e cinquenta", "dois mil") to digits
 * - Standardizes slang and money terms ("conto", "pila", "reais", "centavos")
 */
export function normalizeVoiceTranscript(rawText: string): string {
  if (!rawText) return '';

  let text = rawText.toLowerCase().trim();

  // Strip punctuation that may interfere with word boundaries
  text = text.replace(/[,;!?.]/g, ' ');

  // Normalize common phonetic voice recognition artifacts, regional terms, and homophones
  text = text
    .replace(/\b(?:iutube|iutubi|iutub|you\s*tube|youtub|youtubi|ioutub|ioutube|u\s*tube|iu\s*tube|iu\s*tubi|you\s*tubi|iutubi|yt)\b/gi, 'youtube')
    .replace(/\b(?:em\s*p[eé]\s*tr[eê]s|empe\s*tr[eê]s|m\s*p\s*3|m\s*p\s*tr[eê]s|empe3|mpe3|mepe3|me\s*pe\s*tres)\b/gi, 'mp3')
    .replace(/\bgugol\b|\bgúgol\b|\bgugle\b|\bgoogl\b/gi, 'google')
    .replace(/\bspotifai\b|\bspotfy\b|\bspotfi\b|\bespótifai\b|\bespotifai\b/gi, 'spotify')
    .replace(/\bzap\s*zap\b|\bzap\b|\bwats\b|\bwpp\b|\buatsap\b|\buatsapp\b/gi, 'whatsapp')
    .replace(/\bcelsios\b|\bcelsius\b|\bgraus?\s*celsius\b/gi, 'graus')
    .replace(/\bprinti\b|\bprint\b|\bfotografar\s+a\s+tela\b/gi, 'screenshot')
    .replace(/\bcontos?\b|\bpilas?\b/gi, 'reais')
    .replace(/\bwebcam\b|\bweb\s+cam\b/gi, 'câmera')
    .replace(/\bwi-fi\b|\bwifi\b|\bwaifai\b|\buaifai\b/gi, 'wifi')
    .replace(/\bblutuf\b|\bbluetoot\b/gi, 'bluetooth')
    .replace(/r\$\s*(\d+)/gi, '$1 reais');

  // Support Brazilian real values with cents: "50 reais e 50 centavos" -> "50.50 reais", "20 reais e 30" -> "20.30 reais"
  text = text.replace(/(\d+)\s*reais?\s*e\s*(\d{1,2})\s*(?:centavos?)?/gi, '$1.$2 reais');

  // Strip wake words, vocatives, and polite fillers from anywhere
  text = text
    .replace(/\b(?:ei\s+|ô\s+|o\s+|olá\s+|ola\s+|hey\s+|fala\s+|ok\s+|e\s+aí\s+|fale\s+)?(?:jarves|jarvis|jervis|iarvis|javis|jarvys|assistente|computador|ia|sistema)\b/gi, '')
    .replace(/\b(?:por\s+favor|por\s+gentileza|por\s+obsequio|favor|gentileza|obrigado|valeu|faz\s+favor|faz\s+um\s+favor)\b/gi, '')
    .replace(/\b(?:cê\s+pode|você\s+pode|vc\s+pode|poderia|tem\s+como|dá\s+pra|da\s+pra|quero\s+que\s+você|preciso\s+que\s+você|eu\s+quero|me\s+faz|faça|favor)\b/gi, '');

  // Strip standalone greeting vocative "sr romildo" only at start or without target preposition ("para", "de", "do", "com")
  text = text.replace(/^(?:ol[aá]|bom\s+dia|boa\s+tarde|boa\s+noite)?\s*(?:sr\.?\s+|senhor\s+)?romildo\b/gi, '');
  text = text.replace(/(?<!\b(?:para|pro|pra|ao|à|do|de|com)\s+)(?:sr\.?\s+|senhor\s+)romildo\b/gi, '');

  // Normalize common colloquial idioms to direct action verbs
  text = text
    .replace(/\b(?:bota\s+pra\s+tocar|solta\s+o\s+som|solta\s+a\s+música|solta\s+a\s+musica|coloque\s+pra\s+tocar|toca\s+um\s+som|toca\s+uma\s+música|toca\s+uma\s+musica|toca\s+aí|toca\s+ai)\b/gi, 'tocar música')
    .replace(/\b(?:dar\s+play|dar\s+o\s+play|da\s+play|dar\s+um\s+play)\b/gi, 'play')
    .replace(/\b(?:músicas?\s+do\s+youtube|musicas?\s+do\s+youtube|músicas?\s+no\s+youtube|musicas?\s+no\s+youtube)\b/gi, 'música no youtube')
    .replace(/\b(?:músicas?\s+em\s+mp3|musicas?\s+em\s+mp3|músicas?\s+no\s+mp3|musicas?\s+no\s+mp3|músicas?\s+mp3|musicas?\s+mp3)\b/gi, 'música mp3')
    .replace(/\b(?:tocar\s+no\s+youtube|toque\s+no\s+youtube|toca\s+no\s+youtube|coloca\s+no\s+youtube|coloque\s+no\s+youtube|bota\s+no\s+youtube)\b/gi, 'tocar no youtube')
    .replace(/\b(?:tocar\s+em\s+mp3|toque\s+em\s+mp3|toca\s+em\s+mp3|tocar\s+no\s+mp3|toque\s+no\s+mp3|toca\s+no\s+mp3)\b/gi, 'tocar mp3')
    .replace(/\b(?:passa\s+a\s+música|passa\s+de\s+música|passa\s+essa|pula\s+a\s+música|troca\s+a\s+música|passar\s+a\s+música)\b/gi, 'próxima música')
    .replace(/\b(?:volta\s+a\s+música|volta\s+essa|música\s+de\s+trás|tocar\s+anterior|voltar\s+a\s+música)\b/gi, 'música anterior')
    .replace(/\b(?:grava\s+aí|grava\s+tudo|salva\s+aí|salva\s+tudo|guarda\s+tudo|armazenar\s+tudo|manter\s+salvo|grava\s+no\s+cofre)\b/gi, 'salvar tudo')
    .replace(/\b(?:como\s+está\s+meu\s+dinheiro|quanto\s+sobrou|quanto\s+eu\s+tenho\s+guardado)\b/gi, 'saldo financeiro');

  // Convert compound numbers with "mil" (e.g. "dois mil e quinhentos" -> "2500")
  text = text.replace(
    /\b(um|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+mil\s+e\s+(\d+)\b/gi,
    (_match, thousands, rest) => {
      const k = (NUMBER_MAP[thousands.toLowerCase()] || 1) * 1000;
      return String(k + parseInt(rest, 10));
    }
  );

  text = text.replace(
    /\b(um|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+mil\b/gi,
    (_match, thousands) => {
      const k = (NUMBER_MAP[thousands.toLowerCase()] || 1) * 1000;
      return String(k);
    }
  );

  text = text.replace(/\bmil\s+e\s+(\d+)\b/gi, (_match, rest) => {
    return String(1000 + parseInt(rest, 10));
  });

  text = text.replace(/\bmil\b/gi, '1000');

  // Hundreds + compound tens: "cento e cinquenta e dois" -> "152"
  text = text.replace(
    /\b(cento|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos)\s+e\s+(vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)\s+e\s+(um|uma|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove)\b/gi,
    (_match, h, t, u) => {
      const hv = NUMBER_MAP[h.toLowerCase()] || 0;
      const tv = NUMBER_MAP[t.toLowerCase()] || 0;
      const uv = NUMBER_MAP[u.toLowerCase()] || 0;
      return String(hv + tv + uv);
    }
  );

  // Hundreds + units/tens: "cento e cinquenta" -> "150"
  text = text.replace(
    /\b(cento|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos)\s+e\s+([a-z]+)\b/gi,
    (_match, h, rest) => {
      const hv = NUMBER_MAP[h.toLowerCase()] || 0;
      const rv = NUMBER_MAP[rest.toLowerCase()];
      if (rv !== undefined) {
        return String(hv + rv);
      }
      return _match;
    }
  );

  // Tens + units: "vinte e dois" -> "22"
  text = text.replace(
    /\b(vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)\s+e\s+(um|uma|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove)\b/gi,
    (_match, tens, units) => {
      const tv = NUMBER_MAP[tens.toLowerCase()] || 0;
      const uv = NUMBER_MAP[units.toLowerCase()] || 0;
      return String(tv + uv);
    }
  );

  // Single word numbers if next to currency, temperature, percent or time
  for (const [word, val] of Object.entries(NUMBER_MAP)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    text = text.replace(regex, String(val));
  }

  // Normalize multiple spaces
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Main Intent Classifier and Parameter Extractor
 */
export function parseVoiceIntent(rawTranscript: string): ParsedVoiceCommand | null {
  if (!rawTranscript || !rawTranscript.trim()) return null;

  const normalized = normalizeVoiceTranscript(rawTranscript);

  // ==========================================
  // 0. SECURE STORAGE & SAVE INTENT
  // ==========================================
  const isSaveCommand =
    normalized === 'salvar' ||
    normalized === 'salve' ||
    normalized === 'salva' ||
    normalized === 'salvar tudo' ||
    normalized === 'salve tudo' ||
    normalized === 'salva tudo' ||
    normalized.startsWith('salvar ') ||
    normalized.startsWith('salve ') ||
    normalized.startsWith('salva ') ||
    normalized.includes('salvar alteraç') ||
    normalized.includes('salve as alteraç') ||
    normalized.includes('salva as alteraç') ||
    normalized.includes('salvar dados') ||
    normalized.includes('salve os dados') ||
    normalized.includes('salva os dados') ||
    normalized.includes('salvar as alteraç') ||
    normalized.includes('salvar as informaç') ||
    normalized.includes('salvar informaç') ||
    normalized.includes('salvar o sistema') ||
    normalized.includes('salve o sistema') ||
    normalized.includes('salva o sistema') ||
    normalized.includes('salvar sistema') ||
    normalized.includes('salve sistema') ||
    normalized.includes('salvar agora') ||
    normalized.includes('salve agora') ||
    normalized.includes('gravar alteraç') ||
    normalized.includes('gravar dados') ||
    normalized.includes('gravar as alteraç') ||
    normalized.includes('gravar tudo') ||
    normalized.includes('gravar sistema') ||
    normalized.includes('gravar no cofre') ||
    normalized.includes('grava no cofre') ||
    normalized.includes('armazenar dados') ||
    normalized.includes('armazenar tudo') ||
    normalized.includes('armazenar as informaç') ||
    normalized.includes('armazenar informaç') ||
    normalized.includes('armazenar alteraç') ||
    normalized.includes('armazenar no cofre') ||
    normalized.includes('atualizar cofre') ||
    normalized.includes('sincronizar cofre') ||
    normalized.includes('manter salvo') ||
    normalized.includes('padrão de salvar') ||
    normalized.includes('padrao de salvar') ||
    normalized.includes('mantenha o padrão de salvar') ||
    normalized.includes('mantenha o padrao de salvar') ||
    normalized.includes('salvar e aprimorar') ||
    normalized.includes('salvar e aprimore') ||
    normalized.includes('guardar alteraç') ||
    normalized.includes('guardar dados') ||
    normalized.includes('guardar tudo') ||
    normalized.includes('guardar as informaç') ||
    normalized.includes('fazer backup') ||
    normalized.includes('criar backup') ||
    normalized.includes('backup do cofre') ||
    normalized.includes('backup do sistema') ||
    normalized.includes('backup agora');

  if (isSaveCommand) {
    return {
      type: 'save_system',
      action: 'save_all',
      args: { action: 'save_all' },
      confidence: 0.99,
      explanation: 'Armazenamento e criptografia dos dados e alterações do sistema',
      spokenResponse: 'Todas as informações e alterações foram armazenadas com segurança no cofre criptografado, Sr. Romildo.',
      matchedText: rawTranscript,
    };
  }

  const isSecurityStatus =
    normalized.includes('status de segurança') ||
    normalized.includes('verificar segurança') ||
    normalized.includes('integridade dos dados') ||
    normalized.includes('integridade do sistema') ||
    normalized.includes('verificar integridade') ||
    normalized.includes('como está a segurança');

  if (isSecurityStatus) {
    return {
      type: 'save_system',
      action: 'security_status',
      args: { action: 'security_status' },
      confidence: 0.98,
      explanation: 'Verificação da integridade criptográfica e estado do cofre seguro',
      spokenResponse: 'Núcleo de segurança operacional, Sr. Romildo. Todos os dados estão íntegros e criptografados localmente com chave mestre ativa.',
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 1. HARDWARE CONTROL INTENT
  // ==========================================
  const isHardware =
    normalized.includes('câmera') ||
    normalized.includes('camera') ||
    normalized.includes('microfone') ||
    normalized.includes('mic') ||
    normalized.includes('bluetooth') ||
    normalized.includes('wifi') ||
    normalized.includes('wi-fi');

  const hasHardwareAction =
    normalized.includes('ligar') ||
    normalized.includes('liga') ||
    normalized.includes('desligar') ||
    normalized.includes('desliga') ||
    normalized.includes('ativar') ||
    normalized.includes('ativa') ||
    normalized.includes('desativar') ||
    normalized.includes('desativa') ||
    normalized.includes('mutar') ||
    normalized.includes('muta') ||
    normalized.includes('desmutar') ||
    normalized.includes('desmuta') ||
    normalized.includes('habilitar') ||
    normalized.includes('desabilitar') ||
    normalized.includes('apagar') ||
    normalized.includes('fechar') ||
    normalized.includes('abrir') ||
    normalized.includes('conectar') ||
    normalized.includes('desconectar');

  if (isHardware && hasHardwareAction && !normalized.includes('descreva o que')) {
    let device = 'camera';
    let deviceNamePt = 'Câmera';
    if (normalized.includes('microfone') || normalized.includes('mic')) {
      device = 'microphone';
      deviceNamePt = 'Microfone';
    } else if (normalized.includes('bluetooth')) {
      device = 'bluetooth';
      deviceNamePt = 'Bluetooth';
    } else if (normalized.includes('wifi') || normalized.includes('wi-fi')) {
      device = 'wifi';
      deviceNamePt = 'Wi-Fi';
    }

    const isTurnOff =
      normalized.includes('deslig') ||
      normalized.includes('desativ') ||
      normalized.includes('mutar') ||
      normalized.includes('muta') ||
      normalized.includes('desabilit') ||
      normalized.includes('apagar') ||
      normalized.includes('fechar') ||
      normalized.includes('desconectar');

    const action = isTurnOff ? 'turn_off' : 'turn_on';
    const statePt = isTurnOff ? 'desativado' : 'ativado';

    return {
      type: 'control_hardware',
      action,
      args: { device, action },
      confidence: 0.99,
      explanation: `${deviceNamePt} ${statePt} via comando de voz direto`,
      spokenResponse: `Periférico ${deviceNamePt} foi ${statePt} com sucesso no hardware, Senhor.`,
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 1.5 TV SCREEN MIRRORING & REMOTE CONTROL INTENT
  // ==========================================
  const isTvMirrorIntent =
    normalized.includes('espelhar na tv') ||
    normalized.includes('espelhar tela') ||
    normalized.includes('espelhar aplicativo') ||
    normalized.includes('espelhar no app') ||
    normalized.includes('espelhamento na tv') ||
    normalized.includes('espelhamento de tela') ||
    normalized.includes('espelhar para tv') ||
    normalized.includes('espelhar pra tv') ||
    normalized.includes('conectar na tv') ||
    normalized.includes('conectar a tv') ||
    normalized.includes('conectar tv samsung') ||
    normalized.includes('conectar tv lg') ||
    normalized.includes('conectar tv sony') ||
    normalized.includes('tv samsung') ||
    normalized.includes('tv lg') ||
    normalized.includes('smart tv') ||
    normalized.includes('controle da tv') ||
    normalized.includes('controle remoto da tv') ||
    normalized.includes('espelhamento');

  if (isTvMirrorIntent) {
    return {
      type: 'navigate',
      action: 'switch_tab',
      args: { targetTab: 'mirroring' },
      confidence: 0.99,
      explanation: 'Inicialização da Central de Espelhamento Smart TV (Samsung/LG/Wi-Fi/BLE)',
      spokenResponse:
        'Iniciando a Central de Espelhamento Smart TV, Senhor. Varredura Wi-Fi e Bluetooth ativadas para conectar sua tela e controle remoto.',
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 2. CAMERA VISION / OPTICAL SENSORS INTENT
  // ==========================================
  const isVisionQuery =
    (normalized.includes('câmera') ||
      normalized.includes('camera') ||
      normalized.includes('sensor óptico') ||
      normalized.includes('imagem') ||
      normalized.includes('foto') ||
      normalized.includes('visão') ||
      normalized.includes('veja') ||
      normalized.includes('olhe') ||
      normalized.includes('olha')) &&
    (normalized.includes('descreva') ||
      normalized.includes('descrever') ||
      normalized.includes('interprete') ||
      normalized.includes('interpretar') ||
      normalized.includes('analise') ||
      normalized.includes('analisar') ||
      normalized.includes('o que você vê') ||
      normalized.includes('o que voce ve') ||
      normalized.includes('o que está vendo') ||
      normalized.includes('o que esta vendo') ||
      normalized.includes('identifique') ||
      normalized.includes('reconheça') ||
      normalized.includes('quem está') ||
      normalized.includes('o que tem na minha'));

  if (isVisionQuery) {
    return {
      type: 'camera_vision',
      action: 'turn_on_and_capture',
      args: {
        action: 'turn_on_and_capture',
        prompt: rawTranscript,
      },
      confidence: 0.98,
      explanation: 'Ativação de sensores ópticos e análise visual de quadro da câmera',
      spokenResponse:
        'Sensores ópticos ativados, Senhor. Capturando quadro da câmera para interpretação visual minuciosa.',
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 3.0 FINANCIAL BALANCE & SUMMARY QUERY (Saldo, Extrato, Resumo, Despesas em Voz)
  // ==========================================
  const isFinanceBalanceQuery =
    /qual\s+(?:é\s+|e\s+)?(?:o\s+)?(?:meu\s+)?saldo/i.test(normalized) ||
    /meu\s+saldo/i.test(normalized) ||
    /saldo\s+(?:financeiro|atual|da\s+conta|em\s+conta|disponível|disponivel)/i.test(normalized) ||
    /quanto\s+(?:eu\s+)?tenho(?:\s+(?:na\s+conta|em\s+conta|de\s+saldo|de\s+dinheiro))?/i.test(normalized) ||
    /como\s+est(?:á|ao|ão|am)\s+(?:as|minhas)\s+finan(?:ç|c)as/i.test(normalized) ||
    /(?:consultar|ver|checar|mostrar|falar|informar|diga|dizer)\s+(?:o\s+)?saldo/i.test(normalized) ||
    /resumo\s+financeiro/i.test(normalized) ||
    /balan(?:ç|c)o\s+financeiro/i.test(normalized) ||
    /extrato\s+(?:financeiro|da\s+conta)/i.test(normalized) ||
    /(?:quanto\s+(?:eu\s+)?gastei|total\s+de\s+despesas|quanto\s+foi\s+gasto)/i.test(normalized) ||
    /(?:quanto\s+(?:eu\s+)?recebi|total\s+de\s+receitas|quanto\s+entrou)/i.test(normalized);

  const isAddingMoney =
    normalized.includes('acrescent') ||
    normalized.includes('adicion') ||
    normalized.includes('lanç') ||
    normalized.includes('registr') ||
    normalized.includes('inserir') ||
    normalized.includes('comprei') ||
    normalized.includes('paguei');

  if (isFinanceBalanceQuery && !isAddingMoney) {
    const isExpensesOnly = /(?:quanto\s+(?:eu\s+)?gastei|total\s+de\s+despesas|quanto\s+foi\s+gasto|minhas\s+despesas)/i.test(normalized);
    const isIncomeOnly = /(?:quanto\s+(?:eu\s+)?recebi|total\s+de\s+receitas|quanto\s+entrou|minhas\s+receitas)/i.test(normalized);

    const queryType = isExpensesOnly ? 'expenses' : isIncomeOnly ? 'income' : 'balance';

    return {
      type: 'finance_query',
      action: 'check_balance',
      args: {
        action: 'check_balance',
        query_type: queryType,
      },
      confidence: 0.99,
      explanation: isExpensesOnly
        ? 'Consulta de despesas acumuladas e extrato em voz'
        : isIncomeOnly
        ? 'Consulta de receitas totais e extrato em voz'
        : 'Consulta de saldo financeiro consolidado em voz',
      spokenResponse: '', // Handled dynamically with live state in App.tsx
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 3.1 FINANCE INTENT (Receitas & Despesas - Lançamentos)
  // ==========================================
  const financeKeywords =
    normalized.includes('reais') ||
    normalized.includes('real') ||
    normalized.includes('r$') ||
    normalized.includes('financeir') ||
    normalized.includes('saldo') ||
    normalized.includes('gasto') ||
    normalized.includes('gastos') ||
    normalized.includes('gastei') ||
    normalized.includes('despesa') ||
    normalized.includes('despesas') ||
    normalized.includes('receita') ||
    normalized.includes('receitas') ||
    normalized.includes('faturamento') ||
    normalized.includes('honorário') ||
    normalized.includes('salário') ||
    normalized.includes('comprei') ||
    normalized.includes('compra') ||
    normalized.includes('paguei') ||
    normalized.includes('pagamento') ||
    normalized.includes('pix') ||
    normalized.includes('recebi') ||
    normalized.includes('ganhei');

  const financeActions =
    normalized.includes('acrescent') ||
    normalized.includes('adicion') ||
    normalized.includes('lanç') ||
    normalized.includes('registr') ||
    normalized.includes('inserir') ||
    normalized.includes('comprei') ||
    normalized.includes('paguei') ||
    normalized.includes('gast') ||
    normalized.includes('recebi') ||
    normalized.includes('ganhei') ||
    normalized.includes('depositar') ||
    normalized.includes('depósito') ||
    normalized.includes('pix');

  if (financeKeywords && (financeActions || normalized.match(/\d+\s*(?:reais|real)/))) {
    // Extract monetary value (supports integer or decimal, e.g. "200", "45.50", "1500")
    const amountMatch = normalized.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|r\$)?/i);
    let amount = 100;
    if (amountMatch && amountMatch[1]) {
      amount = parseFloat(amountMatch[1].replace(',', '.'));
    }

    // Distinguish income vs expense
    const isIncome =
      normalized.includes('receita') ||
      normalized.includes('entrada') ||
      normalized.includes('ganho') ||
      normalized.includes('ganhei') ||
      normalized.includes('recebi') ||
      normalized.includes('depósito') ||
      normalized.includes('salário') ||
      normalized.includes('faturamento') ||
      normalized.includes('honorário') ||
      normalized.includes('lucro');

    const type: 'income' | 'expense' = isIncome ? 'income' : 'expense';

    // Categorization
    let category = isIncome ? 'Receita' : 'Geral';
    let description = isIncome ? 'Receita lançada por voz' : 'Despesa lançada por voz';

    if (normalized.includes('combustível') || normalized.includes('gasolina') || normalized.includes('etanol') || normalized.includes('abasteci')) {
      category = 'Transporte';
      description = 'Combustível / Abastecimento';
    } else if (normalized.includes('almoço') || normalized.includes('jantar') || normalized.includes('lanche') || normalized.includes('restaurante') || normalized.includes('comida') || normalized.includes('alimentação') || normalized.includes('mercado') || normalized.includes('supermercado')) {
      category = 'Alimentação';
      description = 'Alimentação e Refeição';
    } else if (normalized.includes('uber') || normalized.includes('táxi') || normalized.includes('passagem') || normalized.includes('transporte') || normalized.includes('estacionamento') || normalized.includes('pedágio')) {
      category = 'Transporte';
      description = 'Transporte Urbano / Viagem';
    } else if (normalized.includes('consultoria') || normalized.includes('projeto') || normalized.includes('desenvolvimento') || normalized.includes('honorário') || normalized.includes('cliente')) {
      category = 'Trabalho';
      description = 'Serviços de Consultoria / Honorários';
    } else if (normalized.includes('servidor') || normalized.includes('cloud') || normalized.includes('hospedagem') || normalized.includes('aws') || normalized.includes('google cloud') || normalized.includes('software') || normalized.includes('licença')) {
      category = 'Tecnologia';
      description = 'Infraestrutura Cloud & Softwares';
    } else if (normalized.includes('farmácia') || normalized.includes('remédio') || normalized.includes('médico') || normalized.includes('exame') || normalized.includes('saúde')) {
      category = 'Saúde';
      description = 'Saúde e Medicamentos';
    } else if (normalized.includes('aluguel') || normalized.includes('condomínio') || normalized.includes('luz') || normalized.includes('energia') || normalized.includes('água') || normalized.includes('internet')) {
      category = 'Moradia';
      description = 'Contas e Moradia';
    } else {
      // Try to capture description right after preposition
      const descMatch = normalized.match(/(?:com|de|em|para|como)\s+([a-zA-Zá-úÁ-Ú0-9\s]+?)(?:\s+(?:no financeiro|reais|no|na)|$)/i);
      if (descMatch && descMatch[1] && descMatch[1].trim().length > 2) {
        const captured = descMatch[1].trim();
        description = captured.charAt(0).toUpperCase() + captured.slice(1);
      }
    }

    const typePt = isIncome ? 'Receita' : 'Despesa';
    const formattedAmount = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      type: 'finance',
      action: 'add_transaction',
      args: {
        amount,
        type,
        description,
        category,
      },
      confidence: 0.99,
      explanation: `Lançamento de ${typePt}: R$ ${formattedAmount} (${description} - ${category})`,
      spokenResponse: `Confirmado, Senhor. Lançamento de ${typePt.toLowerCase()} no valor de ${formattedAmount} reais referente a ${description.toLowerCase()} registrado com precisão no seu financeiro.`,
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 4. TEMPERATURE & CLIMATE INTENT
  // ==========================================
  const isTemperature =
    (normalized.includes('temperatura') ||
      normalized.includes('graus') ||
      normalized.includes('grau') ||
      normalized.includes('clima') ||
      normalized.includes('termostato') ||
      normalized.includes('resfriar') ||
      normalized.includes('esfriar') ||
      normalized.includes('aquecer') ||
      normalized.includes('esquentar')) &&
    (normalized.includes('alter') ||
      normalized.includes('ajust') ||
      normalized.includes('mud') ||
      normalized.includes('defin') ||
      normalized.includes('coloc') ||
      normalized.includes('regul') ||
      normalized.includes('aument') ||
      normalized.includes('diminu') ||
      normalized.includes('baix') ||
      normalized.includes('subir') ||
      normalized.includes('para') ||
      normalized.includes('em'));

  if (isTemperature) {
    const tempMatch = normalized.match(/(\d{1,2})\s*(?:graus|grau|°c|c)?/i);
    let targetTemperature = 22;
    if (tempMatch && tempMatch[1]) {
      targetTemperature = parseInt(tempMatch[1], 10);
    }

    let action: 'set' | 'increase' | 'decrease' = 'set';
    let delta = 0;

    if (normalized.includes('aument') || normalized.includes('subir') || normalized.includes('aquecer') || normalized.includes('esquentar')) {
      action = 'increase';
      delta = tempMatch ? parseInt(tempMatch[1], 10) : 2;
    } else if (normalized.includes('diminu') || normalized.includes('baix') || normalized.includes('resfriar') || normalized.includes('esfriar')) {
      action = 'decrease';
      delta = tempMatch ? parseInt(tempMatch[1], 10) : 2;
    }

    return {
      type: 'temperature',
      action,
      args: {
        target_temperature: targetTemperature,
        action,
        delta,
        zone: 'clima_ambiente',
      },
      confidence: 0.99,
      explanation: `Regulação de temperatura do sistema para ${targetTemperature}°C`,
      spokenResponse: `Temperatura regulada com precisão para ${targetTemperature} graus Celsius, Senhor. Subsistema térmico em parâmetros ideais.`,
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 5. CALENDAR & SCHEDULING INTENT
  // ==========================================
  const isCalendar =
    (normalized.includes('agend') ||
      normalized.includes('marcar') ||
      normalized.includes('marque') ||
      normalized.includes('anotar') ||
      normalized.includes('anote') ||
      normalized.includes('calendário') ||
      normalized.includes('compromisso') ||
      normalized.includes('lembrete')) &&
    (normalized.includes('reunião') ||
      normalized.includes('consulta') ||
      normalized.includes('almoço') ||
      normalized.includes('apresentação') ||
      normalized.includes('compromisso') ||
      normalized.includes('call') ||
      normalized.includes('entrevista') ||
      normalized.includes('dentista') ||
      normalized.includes('médico') ||
      normalized.includes('tarefa') ||
      normalized.includes('às') ||
      normalized.includes('as') ||
      normalized.includes('amanhã') ||
      normalized.includes('hoje') ||
      normalized.includes('feira'));

  if (isCalendar) {
    let title = 'Compromisso Agendado';
    if (normalized.includes('reunião')) title = 'Reunião Estratégica';
    else if (normalized.includes('consulta') || normalized.includes('dentista') || normalized.includes('médico')) title = 'Consulta de Saúde';
    else if (normalized.includes('almoço')) title = 'Almoço de Negócios';
    else if (normalized.includes('apresentação') || normalized.includes('pitch')) title = 'Apresentação Executiva';
    else if (normalized.includes('call') || normalized.includes('chamada')) title = 'Call com Parceiro';
    else if (normalized.includes('entrevista')) title = 'Entrevista';

    // Custom title extract after "reunião com" / "agendar" / "marcar"
    const titleMatch = normalized.match(
      /(?:agendar|marcar|marque|anotar|compromisso de|reunião de|reunião com|call com)\s+([a-zA-Zá-úÁ-Ú0-9\s]+?)(?:\s+(?:amanhã|hoje|segunda|terça|quarta|quinta|sexta|sábado|domingo|às|as|dia)|$)/i
    );
    if (titleMatch && titleMatch[1] && titleMatch[1].trim().length > 2) {
      const extracted = titleMatch[1].trim();
      title = extracted.charAt(0).toUpperCase() + extracted.slice(1);
    }

    // Extract time & day
    let datetime = 'Amanhã às 15:00';
    const timeMatch = normalized.match(/(?:às|as|para às|para as)\s*(\d{1,2})(?::(\d{2}))?\s*(?:horas|h)?/i);
    const dayMatch = normalized.match(/(amanhã|hoje|segunda(?:-feira)?|terça(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|domingo|dia\s+\d{1,2})/i);

    if (timeMatch) {
      const hour = timeMatch[1].padStart(2, '0');
      const minute = (timeMatch[2] || '00').padStart(2, '0');
      const day = dayMatch ? dayMatch[1] : 'Hoje';
      datetime = `${day.charAt(0).toUpperCase() + day.slice(1)} às ${hour}:${minute}`;
    }

    let category: 'Reunião' | 'Tarefa' | 'Pessoal' | 'Lembrete' = 'Reunião';
    if (title.toLowerCase().includes('consulta') || title.toLowerCase().includes('médic') || title.toLowerCase().includes('dentista')) category = 'Pessoal';
    else if (title.toLowerCase().includes('lembrete')) category = 'Lembrete';
    else if (title.toLowerCase().includes('tarefa') || title.toLowerCase().includes('revisão')) category = 'Tarefa';

    return {
      type: 'calendar',
      action: 'create',
      args: {
        action: 'create',
        title,
        datetime,
        category,
      },
      confidence: 0.98,
      explanation: `Compromisso: "${title}" para ${datetime}`,
      spokenResponse: `Compromisso "${title}" foi agendado com sucesso na sua pauta para ${datetime}, Senhor.`,
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 6. WHATSAPP ORIGIN REGISTRATION & CONFIG INTENT
  // ==========================================
  const isWhatsAppOrigin =
    (normalized.includes('whatsapp') || normalized.includes('zap') || normalized.includes('remetente')) &&
    (normalized.includes('origem') ||
      normalized.includes('remetente') ||
      normalized.includes('meu número') ||
      normalized.includes('meu numero') ||
      normalized.includes('meu telefone') ||
      normalized.includes('minha linha') ||
      normalized.includes('linha de envio') ||
      normalized.includes('numero de envio') ||
      normalized.includes('número de envio') ||
      normalized.includes('cadastrar whatsapp') ||
      normalized.includes('configurar whatsapp') ||
      normalized.includes('definir whatsapp') ||
      normalized.includes('alterar whatsapp'));

  if (isWhatsAppOrigin) {
    const isQuery =
      normalized.includes('qual') ||
      normalized.includes('ver') ||
      normalized.includes('mostrar') ||
      normalized.includes('exibir') ||
      normalized.includes('consultar') ||
      normalized.includes('status');

    const phoneInfo = extractPhoneNumber(rawTranscript) || extractPhoneNumber(normalized);

    if (isQuery && !phoneInfo) {
      return {
        type: 'whatsapp_origin',
        action: 'view_origin',
        args: {},
        confidence: 0.99,
        explanation: 'Consultar WhatsApp de origem configurado no JARVES',
        spokenResponse: 'Consultando a linha de WhatsApp de origem registrada no sistema JARVES, Senhor.',
        matchedText: rawTranscript,
      };
    }

    if (phoneInfo) {
      let senderName = 'Romildo (Master)';
      const nameMatch = rawTranscript.match(/(?:nome|identidade|como|titular)\s+([A-Za-zÀ-ÿ\s]+?)(?:\s+(?:no|número|numero|tel|telefone)|$)/i);
      if (nameMatch && nameMatch[1]?.trim()) {
        senderName = nameMatch[1].trim();
      } else if (rawTranscript.toLowerCase().includes('jarves')) {
        senderName = 'JARVES Core';
      }

      return {
        type: 'whatsapp_origin',
        action: 'set_origin',
        args: {
          phoneNumber: phoneInfo.formatted,
          cleanPhone: phoneInfo.clean,
          senderName,
        },
        confidence: 0.99,
        explanation: `Cadastrar WhatsApp de origem: ${phoneInfo.formatted} (${senderName})`,
        spokenResponse: `WhatsApp de origem cadastrado com sucesso como ${phoneInfo.formatted}. As mensagens do JARVES serão enviadas a partir desta linha, Senhor.`,
        matchedText: rawTranscript,
      };
    }

    return {
      type: 'whatsapp_origin',
      action: 'open_origin_config',
      args: {},
      confidence: 0.96,
      explanation: 'Abrir painel de cadastro do WhatsApp de origem',
      spokenResponse: 'Abrindo o painel de cadastro da linha de origem do WhatsApp, Senhor.',
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 7. WHATSAPP AUTOMATION INTENT
  // ==========================================
  const isWhatsAppAuto =
    (normalized.includes('whatsapp') || normalized.includes('zap') || normalized.includes('mensagem')) &&
    (normalized.includes('automátic') ||
      normalized.includes('automacao') ||
      normalized.includes('automação') ||
      normalized.includes('programad') ||
      normalized.includes('disparar autom') ||
      normalized.includes('ativar autom') ||
      normalized.includes('desativar autom') ||
      normalized.includes('ativar mensagens automáticas') ||
      normalized.includes('desativar mensagens automáticas'));

  if (isWhatsAppAuto) {
    let contactName = 'Romildo (Master)';
    let contactPhone = '5511999998888';

    if (normalized.includes('diretoria')) {
      contactName = 'Diretoria Executiva';
      contactPhone = '5511977776666';
    } else if (normalized.includes('engenharia')) {
      contactName = 'Engenharia de Software';
      contactPhone = '5511988887777';
    } else if (normalized.includes('suporte')) {
      contactName = 'Suporte 24h JARVES';
      contactPhone = '5511966665555';
    } else if (normalized.includes('romildo')) {
      contactName = 'Romildo (Master)';
      contactPhone = '5511999998888';
    }

    const isDisable = normalized.includes('desativ') || normalized.includes('deslig') || normalized.includes('cancel');
    const isTriggerNow = normalized.includes('dispar') || normalized.includes('enviar agora') || normalized.includes('mande agora');

    const action = isDisable ? 'deactivate' : isTriggerNow ? 'trigger_now' : 'activate';

    return {
      type: 'whatsapp_automation',
      action,
      args: {
        action,
        target_contact: contactName,
        contact_name: contactName,
        contact_phone: contactPhone,
        trigger_type: 'daily_summary',
      },
      confidence: 0.98,
      explanation: `Automação WhatsApp: ${action === 'activate' ? 'Ativar' : action === 'trigger_now' ? 'Disparo imediato' : 'Desativar'} para ${contactName}`,
      spokenResponse: `Automação de mensagens do WhatsApp para ${contactName} foi ${action === 'activate' ? 'ativada' : action === 'trigger_now' ? 'despachada' : 'desativada'} com sucesso, Senhor.`,
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 8. DIRECT WHATSAPP MESSAGE INTENT (HIGH PRECISION)
  // ==========================================
  const isWhatsAppSend =
    (normalized.includes('whatsapp') || normalized.includes('zap')) &&
    (normalized.includes('enviar') ||
      normalized.includes('envie') ||
      normalized.includes('mandar') ||
      normalized.includes('mande') ||
      normalized.includes('escreva') ||
      normalized.includes('escreve') ||
      normalized.includes('notificar') ||
      normalized.includes('notifique') ||
      normalized.includes('disparar') ||
      normalized.includes('dispara') ||
      /\b(?:zap|whatsapp)\s+(?:para|pro|pra|ao|à)\b/i.test(normalized) ||
      /\b(?:mensagem)\s+(?:de\s+)?(?:zap|whatsapp)\b/i.test(normalized));

  if (isWhatsAppSend && !isWhatsAppAuto && !isWhatsAppOrigin) {
    let recipient = 'Romildo (Master)';
    let recipientPhone = '';

    // Check if direct phone was provided in transcript
    const phoneCandidate = extractPhoneNumber(rawTranscript) || extractPhoneNumber(normalized);
    if (phoneCandidate) {
      recipient = phoneCandidate.formatted;
      recipientPhone = phoneCandidate.clean;
    } else if (normalized.includes('diretoria')) {
      recipient = 'Diretoria Executiva';
      recipientPhone = '5511977776666';
    } else if (normalized.includes('engenharia')) {
      recipient = 'Engenharia de Software';
      recipientPhone = '5511988887777';
    } else if (normalized.includes('suporte')) {
      recipient = 'Suporte 24h JARVES';
      recipientPhone = '5511966665555';
    } else if (normalized.includes('clara')) {
      recipient = 'Dra. Clara Andrade';
      recipientPhone = '5511977776666';
    } else if (normalized.includes('joao') || normalized.includes('joão')) {
      recipient = 'Eng. João Silva';
      recipientPhone = '5511988887777';
    } else if (normalized.includes('romildo')) {
      recipient = 'Romildo (Master)';
      recipientPhone = '5511999998888';
    } else {
      // Custom recipient extraction
      const recMatch = rawTranscript.match(/(?:para|pro|pra|ao|à)\s+(?:o\s+|a\s+)?([A-Za-zÀ-ÿ0-9\s.-]+?)(?:\s+(?:dizendo|com\s+o\s+texto|falando|avisando|que|com\s+a\s+mensagem|:|mensagem)|$)/i);
      if (recMatch && recMatch[1] && recMatch[1].trim().length > 1) {
        const candidateName = recMatch[1].trim();
        if (!/^(?:whatsapp|zap|mim|ele|ela|todos)$/i.test(candidateName)) {
          recipient = candidateName;
        }
      }
    }

    // High precision message content extraction from raw transcript
    let message = 'Olá, mensagem enviada via JARVES Voice Assistant.';
    const msgMatch = rawTranscript.match(/(?:dizendo\s+que|dizendo|falando\s+que|falando|avisando\s+que|avisando|com\s+o\s+texto|com\s+a\s+mensagem|com\s+texto|mensagem|:)\s+(.+)$/i);
    if (msgMatch && msgMatch[1] && msgMatch[1].trim()) {
      message = msgMatch[1].trim();
    } else {
      // Fallback: examine text after recipient keyword
      const words = rawTranscript.split(/\s+/);
      const recIndex = words.findIndex((w) => w.toLowerCase().includes(recipient.split(' ')[0].toLowerCase()));
      if (recIndex !== -1 && recIndex < words.length - 1) {
        const rest = words.slice(recIndex + 1).join(' ').replace(/^(?:que|dizendo|falando|avisando)\s+/i, '').trim();
        if (rest.length > 2) {
          message = rest;
        }
      }
    }

    return {
      type: 'whatsapp_send',
      action: 'send_message',
      args: {
        recipient,
        recipientPhone,
        message,
      },
      confidence: 0.98,
      explanation: `Envio direto de WhatsApp para ${recipient}: "${message}"`,
      spokenResponse: `Preparando e despachando mensagem de WhatsApp para ${recipient}, Senhor.`,
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 8. PC SYSTEM COMMANDS (Volume, Screenshot, Apps)
  // ==========================================
  const isPCVolume =
    normalized.includes('volume') ||
    normalized.includes('som') ||
    normalized.includes('áudio') ||
    normalized.includes('audio');

  if (
    isPCVolume &&
    (normalized.includes('aument') ||
      normalized.includes('mais alto') ||
      normalized.includes('sobe') ||
      normalized.includes('subir') ||
      normalized.includes('diminu') ||
      normalized.includes('abaix') ||
      normalized.includes('desce') ||
      normalized.includes('descer') ||
      normalized.includes('mais baixo') ||
      normalized.includes('defin') ||
      normalized.includes('coloc') ||
      normalized.includes('mutar') ||
      normalized.includes('muta') ||
      normalized.includes('mudo') ||
      normalized.includes('desmutar') ||
      normalized.includes('desmuta') ||
      normalized.includes('tirar do mudo') ||
      normalized.includes('tira do mudo') ||
      normalized.includes('sem som') ||
      normalized.includes('silenci') ||
      normalized.includes('máximo') ||
      normalized.includes('maximo') ||
      normalized.includes('mínimo') ||
      normalized.includes('minimo') ||
      normalized.includes('%') ||
      /\b(?:volume|som)\s+(?:no\s+|em\s+)?\d+\b/i.test(normalized))
  ) {
    const volMatch = normalized.match(/(\d{1,3})\s*(?:%|por cento)?/i);
    let valStr = '80';
    let explanation = 'Volume ajustado';
    let spoken = 'Volume do sistema ajustado, Senhor.';

    if (normalized.includes('desmutar') || normalized.includes('desmuta') || normalized.includes('tirar do mudo') || normalized.includes('tira do mudo')) {
      valStr = '65';
      explanation = 'Áudio do sistema reativado (65%)';
      spoken = 'Áudio do sistema reativado, Senhor.';
    } else if (normalized.includes('mutar') || normalized.includes('muta') || normalized.includes('mudo') || normalized.includes('silenci') || normalized.includes('sem som')) {
      valStr = '0';
      explanation = 'Sistema silenciado (0%)';
      spoken = 'Áudio do sistema silenciado, Senhor.';
    } else if (normalized.includes('máximo') || normalized.includes('maximo') || normalized.includes('no talo')) {
      valStr = '100';
      explanation = 'Volume equalizado no nível máximo (100%)';
      spoken = 'Volume configurado na capacidade máxima, Senhor.';
    } else if (normalized.includes('mínimo') || normalized.includes('minimo')) {
      valStr = '15';
      explanation = 'Volume equalizado no nível mínimo (15%)';
      spoken = 'Volume configurado no nível mínimo, Senhor.';
    } else if (volMatch && volMatch[1]) {
      const vol = Math.min(100, Math.max(0, parseInt(volMatch[1], 10)));
      valStr = String(vol);
      explanation = `Volume do sistema equalizado para ${vol}%`;
      spoken = `Volume do sistema ajustado para ${vol} por cento, Senhor.`;
    } else if (normalized.includes('aument') || normalized.includes('mais alto') || normalized.includes('sobe') || normalized.includes('subir')) {
      valStr = 'increase';
      explanation = 'Volume amplificado (+15%)';
      spoken = 'Aumentando o volume do sistema, Senhor.';
    } else if (normalized.includes('diminu') || normalized.includes('abaix') || normalized.includes('mais baixo') || normalized.includes('desce') || normalized.includes('descer')) {
      valStr = 'decrease';
      explanation = 'Volume atenuado (-15%)';
      spoken = 'Abaixando o volume do sistema, Senhor.';
    }

    return {
      type: 'execute_pc_command',
      action: 'set_volume',
      args: {
        command_type: 'set_volume',
        value: valStr,
      },
      confidence: 0.98,
      explanation,
      spokenResponse: spoken,
      matchedText: rawTranscript,
    };
  }

  const isScreenshot =
    normalized.includes('screenshot') ||
    normalized.includes('print da tela') ||
    normalized.includes('capturar tela') ||
    normalized.includes('captura de tela');

  if (isScreenshot) {
    return {
      type: 'execute_pc_command',
      action: 'take_screenshot',
      args: {
        command_type: 'take_screenshot',
      },
      confidence: 0.98,
      explanation: 'Captura de tela instantânea (Screenshot Buffer)',
      spokenResponse: 'Captura de tela do terminal realizada e salva no buffer de memória, Senhor.',
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 8.5 YOUTUBE & DAILYMOTION SEARCH & VIDEO PLAYBACK
  // ==========================================
  const isExplicitVideoOrYouTube =
    normalized.includes('youtube') ||
    normalized.includes('dailymotion') ||
    normalized.includes('daymotion') ||
    normalized.includes('vídeo') ||
    normalized.includes('video') ||
    normalized.includes('clipe') ||
    normalized.includes('trailer') ||
    normalized.includes('música no youtube') ||
    normalized.includes('músicas no youtube') ||
    normalized.includes('música do youtube') ||
    normalized.includes('músicas do youtube') ||
    normalized.includes('tocar no youtube') ||
    normalized.includes('tocar no dailymotion') ||
    normalized.includes('tocar no daymotion') ||
    ((normalized.includes('assistir') || normalized.includes('ver')) &&
      !normalized.includes('saldo') &&
      !normalized.includes('extrato') &&
      !normalized.includes('temperatura') &&
      !normalized.includes('agenda'));

  // Curated YouTube songs dictionary for instant high-confidence matching
  const KNOWN_YT_SONGS = [
    { key: 'back in black', videoId: 'pAgnJDJN4VA', title: 'Back in Black', artist: 'AC/DC' },
    { key: 'ac dc', videoId: 'pAgnJDJN4VA', title: 'Back in Black', artist: 'AC/DC' },
    { key: 'acdc', videoId: 'pAgnJDJN4VA', title: 'Back in Black', artist: 'AC/DC' },
    { key: 'iron man', videoId: '5s7_Wbi4Lx8', title: 'Iron Man', artist: 'Black Sabbath' },
    { key: 'black sabbath', videoId: '5s7_Wbi4Lx8', title: 'Iron Man', artist: 'Black Sabbath' },
    { key: 'cyberpunk', videoId: '8ZhnJmSTXm4', title: 'Cyberpunk 2077 Synthwave Mix', artist: 'Night City Pulse' },
    { key: 'synthwave', videoId: '8ZhnJmSTXm4', title: 'Cyberpunk 2077 Synthwave Mix', artist: 'Synthwave Radio' },
    { key: 'interstellar', videoId: 'UDVtMYqUAyw', title: 'Interstellar Main Theme Suite', artist: 'Hans Zimmer' },
    { key: 'hans zimmer', videoId: 'UDVtMYqUAyw', title: 'Interstellar Suite', artist: 'Hans Zimmer' },
    { key: 'lofi', videoId: 'jfKfPfyJRdk', title: 'Lofi Hip Hop Beats to Relax / Study', artist: 'Lofi Girl' },
    { key: 'lo fi', videoId: 'jfKfPfyJRdk', title: 'Lofi Hip Hop Beats to Relax / Study', artist: 'Lofi Girl' },
    { key: 'tron', videoId: 'tFXYuw96d0c', title: 'Tron Legacy Theme', artist: 'Daft Punk' },
    { key: 'daft punk', videoId: 'tFXYuw96d0c', title: 'Tron Legacy Theme', artist: 'Daft Punk' },
    { key: 'queen', videoId: 'HgzGwKwLmgM', title: "Don't Stop Me Now", artist: 'Queen' },
    { key: 'dont stop me now', videoId: 'HgzGwKwLmgM', title: "Don't Stop Me Now", artist: 'Queen' },
    { key: 'bohemian rhapsody', videoId: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artist: 'Queen' },
    { key: 'blinding lights', videoId: '4NRXx6U8ABQ', title: 'Blinding Lights', artist: 'The Weeknd' },
    { key: 'the weeknd', videoId: '4NRXx6U8ABQ', title: 'Blinding Lights', artist: 'The Weeknd' },
    { key: 'alok', videoId: 'jvWxb_x8s50', title: 'Hear Me Now', artist: 'Alok' },
    { key: 'hear me now', videoId: 'jvWxb_x8s50', title: 'Hear Me Now', artist: 'Alok' },
    { key: 'tempo perdido', videoId: 'o4o0_7kI3vA', title: 'Tempo Perdido', artist: 'Legião Urbana' },
    { key: 'legiao urbana', videoId: 'o4o0_7kI3vA', title: 'Tempo Perdido', artist: 'Legião Urbana' },
    { key: 'legião urbana', videoId: 'o4o0_7kI3vA', title: 'Tempo Perdido', artist: 'Legião Urbana' },
    { key: 'guns n roses', videoId: '1w7OgIMMRc4', title: "Sweet Child O' Mine", artist: "Guns N' Roses" },
    { key: 'sweet child o mine', videoId: '1w7OgIMMRc4', title: "Sweet Child O' Mine", artist: "Guns N' Roses" },
    { key: 'michael jackson', videoId: 'Zi_XLOBDo_Y', title: 'Billie Jean', artist: 'Michael Jackson' },
    { key: 'billie jean', videoId: 'Zi_XLOBDo_Y', title: 'Billie Jean', artist: 'Michael Jackson' },
    { key: 'coldplay', videoId: 'dvgZkm1xWPE', title: 'Viva La Vida', artist: 'Coldplay' },
    { key: 'viva la vida', videoId: 'dvgZkm1xWPE', title: 'Viva La Vida', artist: 'Coldplay' },
    { key: 'tim maia', videoId: '663p-z3x5m8', title: 'Não Quero Dinheiro', artist: 'Tim Maia' },
    { key: 'nao quero dinheiro', videoId: '663p-z3x5m8', title: 'Não Quero Dinheiro', artist: 'Tim Maia' },
  ];

  if (isExplicitVideoOrYouTube) {
    // If navigation only (e.g., "abrir youtube", "ver youtube")
    const isYtNavOnly =
      normalized === 'abrir youtube' ||
      normalized === 'ver youtube' ||
      normalized === 'acessar youtube' ||
      normalized === 'ir para o youtube' ||
      normalized === 'ir para youtube';

    if (isYtNavOnly) {
      return {
        type: 'navigate',
        action: 'switch_tab',
        args: { targetTab: 'media', subTab: 'youtube' },
        confidence: 0.99,
        explanation: 'Acesso à interface e reprodutor do YouTube',
        spokenResponse: 'Acessando o reprodutor e pesquisa do YouTube no Centro de Mídia, Sr. Romildo.',
        matchedText: rawTranscript,
      };
    }

    // Extract video search query
    let query = normalized
      .replace(/\b(?:pesquisar|pesquise|buscar|busque|procurar|procure|encontrar|ver|assistir|tocar|toque|reproduzir|reproduza|colocar|coloque|botar|bota|soltar|solte|passar|abre|abrir|ouvir|ouça)\s+(?:no\s+youtube|vídeo\s+no\s+youtube|video\s+no\s+youtube|música\s+no\s+youtube|musica\s+no\s+youtube|músicas\s+no\s+youtube|musicas\s+no\s+youtube|música\s+do\s+youtube|musica\s+do\s+youtube|músicas\s+do\s+youtube|musicas\s+do\s+youtube|o\s+vídeo\s+do|o\s+video\s+do|o\s+vídeo\s+de|o\s+video\s+de|o\s+vídeo|o\s+video|os\s+vídeos|os\s+videos|o\s+clipe\s+de|o\s+clipe\s+do|o\s+clipe|vídeo\s+de|video\s+de|vídeo\s+do|video\s+do|vídeo|video|clipe\s+de|clipe\s+do|clipe|trailer\s+de|trailer\s+do|trailer|youtube)\b/gi, '')
      .replace(/\b(?:músicas?\s+do\s+youtube|musicas?\s+do\s+youtube|músicas?\s+no\s+youtube|musicas?\s+no\s+youtube|vídeos?\s+do\s+youtube|videos?\s+do\s+youtube)\b/gi, '')
      .replace(/\b(?:no\s+youtube|pelo\s+youtube|do\s+youtube|no\s+yt|pelo\s+yt|do\s+yt)\b/gi, '')
      .replace(/\b(?:abrir\s+youtube\s+e\s+(?:pesquisar|tocar|buscar|ouvir|assistir))\b/gi, '')
      .replace(/\b(?:pesquisar|pesquise|buscar|busque|procurar|procure|tocar|toque|reproduzir|reproduza|ouvir|ouça|assistir|ver|colocar|coloque|botar|bota|soltar|solte)\s+(?:a\s+música|a\s+musica|as\s+músicas|as\s+musicas|o\s+vídeo|o\s+video|os\s+vídeos|os\s+videos|o\s+clipe|o\s+som|a\s+faixa)\b/gi, '')
      .replace(/\b(?:pesquisar|buscar|procurar|tocar|toque|ouvir|assistir|ver|colocar|coloque|reproduzir|soltar)\s+/gi, '')
      .replace(/\b(?:youtube|yt)\b/gi, '')
      .replace(/\b(?:de\s+fundo|agora|pra\s+mim|por\s+favor)\b/gi, '')
      .trim();

    if (!query) {
      query = 'Músicas e Vídeos em Alta';
    }

    const matchedCurated = KNOWN_YT_SONGS.find((s) => query.toLowerCase().includes(s.key) || s.key.includes(query.toLowerCase()));

    return {
      type: 'youtube_search',
      action: 'search_and_play',
      args: {
        query: matchedCurated ? matchedCurated.title : query,
        videoId: matchedCurated?.videoId,
        title: matchedCurated?.title,
        artist: matchedCurated?.artist,
        autoPlay: true,
        category: 'video',
      },
      confidence: 0.99,
      explanation: matchedCurated
        ? `Reprodução de música no YouTube: "${matchedCurated.title}" (${matchedCurated.artist})`
        : `Pesquisa e reprodução de música no YouTube: "${query}"`,
      spokenResponse: matchedCurated
        ? `Iniciando a reprodução de "${matchedCurated.title}" de ${matchedCurated.artist} no YouTube, Sr. Romildo.`
        : `Pesquisando e reproduzindo "${query}" no YouTube, Sr. Romildo. Player integrado ativado.`,
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 8.6 MP3 AUDIO & LOCAL MEDIA PLAYER (PLAY/PAUSE/FAIXAS/CONTROLES)
  // ==========================================
  const isExplicitMp3 =
    normalized.includes('mp3') ||
    normalized.includes('áudio') ||
    normalized.includes('audio') ||
    normalized.includes('faixa') ||
    normalized.includes('minhas músicas') ||
    normalized.includes('minhas musicas') ||
    normalized.includes('música local') ||
    normalized.includes('musica local') ||
    normalized.includes('arquivo de som') ||
    normalized.includes('reprodutor de áudio') ||
    normalized.includes('player de áudio');

  const isMediaCommand =
    isExplicitMp3 ||
    normalized.includes('música') ||
    normalized.includes('musica') ||
    normalized.includes('som') ||
    normalized.includes('tocar') ||
    normalized.includes('reproduzir') ||
    normalized.includes('ouvir') ||
    normalized.includes('pausar') ||
    normalized.includes('pause') ||
    normalized.includes('pausa') ||
    normalized.includes('parar som') ||
    normalized.includes('parar música') ||
    normalized.includes('parar musica') ||
    normalized.includes('mutar') ||
    normalized.includes('desmutar') ||
    normalized.includes('reprodutor') ||
    normalized.includes('player') ||
    normalized.includes('dar play') ||
    normalized.startsWith('play');

  if (isMediaCommand) {
    const isMute =
      normalized.includes('mutar áudio') ||
      normalized.includes('mutar som') ||
      normalized.includes('mutar música') ||
      normalized.includes('mutar musica') ||
      normalized.includes('silenciar som') ||
      normalized.includes('silenciar música') ||
      normalized.includes('silenciar musica') ||
      normalized === 'mutar' ||
      normalized === 'mudo';

    const isUnmute =
      normalized.includes('desmutar') ||
      normalized.includes('tirar do mudo') ||
      normalized.includes('reativar som') ||
      normalized.includes('reativar áudio');

    const isPause =
      normalized.includes('pausar') ||
      normalized.includes('pause') ||
      normalized.includes('pausa a música') ||
      normalized.includes('pausa a musica') ||
      normalized.includes('pausa o som') ||
      normalized.includes('pausa o áudio') ||
      normalized.includes('pausa');

    const isStop =
      normalized.includes('parar som') ||
      normalized.includes('parar música') ||
      normalized.includes('parar musica') ||
      normalized.includes('para a música') ||
      normalized.includes('para a musica') ||
      normalized.includes('para o som') ||
      normalized.includes('parar áudio') ||
      normalized.includes('parar audio') ||
      normalized.includes('desligar música') ||
      normalized.includes('interromper reprodução');

    const isResume =
      normalized.includes('continuar') ||
      normalized.includes('despausar') ||
      normalized.includes('retomar') ||
      normalized.includes('continuar música') ||
      normalized.includes('continuar o som');

    const isNext =
      normalized.includes('próxima') ||
      normalized.includes('proxima') ||
      normalized.includes('avançar') ||
      normalized.includes('pular faixa') ||
      normalized.includes('passa de música') ||
      normalized.includes('passa essa') ||
      normalized.includes('pula essa') ||
      normalized.includes('trocar música') ||
      normalized.includes('troca a música');

    const isPrev =
      normalized.includes('anterior') ||
      normalized.includes('voltar faixa') ||
      normalized.includes('voltar música') ||
      normalized.includes('volta a música') ||
      normalized.includes('volta essa') ||
      normalized.includes('faixa anterior');

    const isOpenOnly =
      normalized === 'abrir reprodutor' ||
      normalized === 'abrir player' ||
      normalized === 'abrir mp3' ||
      normalized === 'minhas músicas' ||
      normalized === 'minhas musicas' ||
      normalized === 'centro de mídia' ||
      normalized === 'mídia';

    if (isMute) {
      return {
        type: 'media_player',
        action: 'mute',
        args: { action: 'mute' },
        confidence: 0.99,
        explanation: 'Silenciamento instantâneo do áudio do sistema',
        spokenResponse: 'Áudio do sistema silenciado, Senhor.',
        matchedText: rawTranscript,
      };
    }

    if (isUnmute) {
      return {
        type: 'media_player',
        action: 'unmute',
        args: { action: 'unmute' },
        confidence: 0.99,
        explanation: 'Reativação do áudio e som do sistema',
        spokenResponse: 'Áudio do sistema reativado, Senhor.',
        matchedText: rawTranscript,
      };
    }

    if (isPause) {
      return {
        type: 'media_player',
        action: 'pause',
        args: { action: 'pause' },
        confidence: 0.99,
        explanation: 'Pausa da reprodução de áudio/música',
        spokenResponse: 'Música pausada, Senhor. Reprodução em espera.',
        matchedText: rawTranscript,
      };
    }

    if (isStop) {
      return {
        type: 'media_player',
        action: 'stop',
        args: { action: 'stop' },
        confidence: 0.99,
        explanation: 'Parada da reprodução do reprodutor de mídia',
        spokenResponse: 'Reprodução de áudio interrompida, Senhor.',
        matchedText: rawTranscript,
      };
    }

    if (isResume) {
      return {
        type: 'media_player',
        action: 'resume',
        args: { action: 'resume' },
        confidence: 0.99,
        explanation: 'Retomada da reprodução musical',
        spokenResponse: 'Retomando a reprodução da faixa atual, Senhor.',
        matchedText: rawTranscript,
      };
    }

    if (isNext) {
      return {
        type: 'media_player',
        action: 'next',
        args: { action: 'next' },
        confidence: 0.99,
        explanation: 'Avançar para a próxima faixa da biblioteca',
        spokenResponse: 'Avançando para a próxima faixa da lista, Senhor.',
        matchedText: rawTranscript,
      };
    }

    if (isPrev) {
      return {
        type: 'media_player',
        action: 'prev',
        args: { action: 'prev' },
        confidence: 0.99,
        explanation: 'Retornar para a faixa anterior',
        spokenResponse: 'Retornando para a faixa anterior, Senhor.',
        matchedText: rawTranscript,
      };
    }

    if (isOpenOnly) {
      return {
        type: 'navigate',
        action: 'switch_tab',
        args: { targetTab: 'media', subTab: 'player' },
        confidence: 0.99,
        explanation: 'Navegação para o Centro de Mídia & Holo-Audio Player',
        spokenResponse: 'Acessando o Centro de Mídia e biblioteca de faixas MP3, Senhor.',
        matchedText: rawTranscript,
      };
    }

    // Play specific song, playlist, or artist
    const isPlay =
      normalized.includes('tocar') ||
      normalized.includes('reproduzir') ||
      normalized.includes('ouvir') ||
      normalized.includes('iniciar') ||
      normalized.includes('dar play') ||
      normalized.startsWith('play');

    if (isPlay) {
      let trackQuery = normalized
        .replace(/\b(?:tocar|toque|reproduzir|reproduza|ouvir|iniciar|dar\s+play\s+na|dar\s+play\s+no|dar\s+play|play)\s+(?:a\s+música|a\s+musica|a\s+faixa|o\s+som|o\s+áudio|o\s+audio|o\s+mp3|um\s+mp3|música|musica|mp3|áudio|audio|faixa|o\s+clipe|o\s+vídeo|o\s+video)\b/gi, '')
        .replace(/\b(?:tocar|toque|reproduzir|reproduza|ouvir|iniciar|dar\s+play|play)\b/gi, '')
        .replace(/\b(?:de\s+fundo|no\s+player|agora|pra\s+mim|por\s+favor|em\s+mp3|no\s+mp3)\b/gi, '')
        .trim();

      // If the command explicitly mentioned MP3 or local music and has no other query
      const isPureMp3Intent =
        isExplicitMp3 ||
        !trackQuery ||
        trackQuery === 'mp3' ||
        trackQuery === 'musica' ||
        trackQuery === 'música' ||
        trackQuery === 'som' ||
        trackQuery === 'áudio' ||
        trackQuery === 'audio';

      // Check if user requested a known YouTube song (only if not an explicit local MP3 command)
      const matchedCurated = !isExplicitMp3
        ? KNOWN_YT_SONGS.find(
            (s) => trackQuery && (trackQuery.toLowerCase().includes(s.key) || s.key.includes(trackQuery.toLowerCase()))
          )
        : null;

      if (matchedCurated) {
        return {
          type: 'youtube_search',
          action: 'search_and_play',
          args: {
            query: matchedCurated.title,
            videoId: matchedCurated.videoId,
            title: matchedCurated.title,
            artist: matchedCurated.artist,
            autoPlay: true,
          },
          confidence: 0.99,
          explanation: `Reprodução automática no YouTube: "${matchedCurated.title}" (${matchedCurated.artist})`,
          spokenResponse: `Iniciando a reprodução de "${matchedCurated.title}" de ${matchedCurated.artist} no YouTube, Sr. Romildo.`,
          matchedText: rawTranscript,
        };
      }

      // MP3 / Local Audio Player
      const cleanedTrackName = isPureMp3Intent ? undefined : trackQuery;

      return {
        type: 'media_player',
        action: 'play',
        args: {
          action: 'play',
          trackName: cleanedTrackName,
          isMp3: true,
          subTab: 'player',
        },
        confidence: 0.99,
        explanation: cleanedTrackName
          ? `Reproduzir faixa MP3: "${cleanedTrackName}"`
          : 'Reproduzir música em MP3 na biblioteca JARVES',
        spokenResponse: cleanedTrackName
          ? `Iniciando a reprodução da faixa MP3 "${cleanedTrackName}" no reprodutor holográfico, Sr. Romildo.`
          : 'Iniciando a reprodução do áudio em MP3 no reprodutor holográfico, Sr. Romildo.',
        matchedText: rawTranscript,
      };
    }
  }

  // ==========================================
  // 8.7 OPEN EXTERNAL LINKS & WEB SEARCH INTENT
  // ==========================================
  const isOpenLink =
    normalized.includes('abrir link') ||
    normalized.includes('abrir site') ||
    normalized.includes('abrir o site') ||
    normalized.includes('abrir a página') ||
    normalized.includes('abrir página') ||
    normalized.includes('pesquisar no google') ||
    normalized.includes('buscar no google') ||
    normalized.includes('dar um google') ||
    (normalized.includes('abrir') && (normalized.includes('.com') || normalized.includes('.br') || normalized.includes('.org') || normalized.includes('http')));

  if (isOpenLink) {
    let url = '';
    let targetName = 'Navegador Web';

    if (normalized.includes('pesquisar no google') || normalized.includes('buscar no google') || normalized.includes('dar um google')) {
      const q = normalized
        .replace(/\b(?:pesquisar|pesquise|buscar|busque|dar\s+um\s+google|procurar|procure)\s+(?:no\s+google|pelo\s+google)\b/gi, '')
        .replace(/\b(?:no\s+google)\b/gi, '')
        .trim();
      url = `https://www.google.com/search?q=${encodeURIComponent(q || 'JARVES AI')}`;
      targetName = `Google: "${q}"`;
    } else {
      // Extract URL or target
      const matchUrl = normalized.match(/(https?:\/\/[^\s]+)/i);
      if (matchUrl) {
        url = matchUrl[1];
        targetName = url;
      } else {
        const rawTarget = normalized
          .replace(/\b(?:abrir\s+o\s+site\s+do|abrir\s+o\s+site\s+da|abrir\s+o\s+site\s+de|abrir\s+o\s+site|abrir\s+site\s+do|abrir\s+site\s+da|abrir\s+site\s+de|abrir\s+site|abrir\s+link\s+do|abrir\s+link\s+da|abrir\s+link\s+de|abrir\s+link|abrir\s+página\s+do|abrir\s+página\s+da|abrir\s+página)\b/gi, '')
          .trim();

        if (rawTarget.includes('google')) {
          url = 'https://www.google.com';
          targetName = 'Google';
        } else if (rawTarget.includes('spotify')) {
          url = 'https://open.spotify.com';
          targetName = 'Spotify Web';
        } else if (rawTarget.includes('github')) {
          url = 'https://github.com';
          targetName = 'GitHub';
        } else if (rawTarget.includes('netflix')) {
          url = 'https://www.netflix.com';
          targetName = 'Netflix';
        } else if (rawTarget.includes('chatgpt') || rawTarget.includes('openai')) {
          url = 'https://chat.openai.com';
          targetName = 'ChatGPT';
        } else if (rawTarget.includes('whatsapp')) {
          url = 'https://web.whatsapp.com';
          targetName = 'WhatsApp Web';
        } else if (rawTarget.includes('.')) {
          url = rawTarget.startsWith('http') ? rawTarget : `https://${rawTarget}`;
          targetName = rawTarget;
        } else {
          url = `https://www.google.com/search?q=${encodeURIComponent(rawTarget)}`;
          targetName = `Google: ${rawTarget}`;
        }
      }
    }

    return {
      type: 'open_link',
      action: 'open_url',
      args: {
        url,
        title: targetName,
      },
      confidence: 0.98,
      explanation: `Abrir link ou pesquisa web: ${targetName}`,
      spokenResponse: `Abrindo ${targetName} no navegador, Sr. Romildo.`,
      matchedText: rawTranscript,
    };
  }

  const isAppLaunch =
    (normalized.includes('abrir') || normalized.includes('iniciar') || normalized.includes('executar')) &&
    (normalized.includes('vscode') ||
      normalized.includes('terminal') ||
      normalized.includes('spotify') ||
      normalized.includes('youtube') ||
      normalized.includes('chrome') ||
      normalized.includes('google'));

  if (isAppLaunch) {
    let appName = 'VSCode';
    let url = '';
    if (normalized.includes('spotify')) {
      appName = 'Spotify';
      url = 'https://open.spotify.com';
    } else if (normalized.includes('youtube')) {
      appName = 'YouTube';
      url = 'https://www.youtube.com';
    } else if (normalized.includes('terminal')) {
      appName = 'Terminal Bash';
    } else if (normalized.includes('chrome') || normalized.includes('google')) {
      appName = 'Google Chrome';
      url = 'https://www.google.com';
    }

    return {
      type: 'execute_pc_command',
      action: url ? 'open_tab' : 'open_app',
      args: {
        command_type: url ? 'open_tab' : 'open_app',
        target_url_or_app: url || appName,
      },
      confidence: 0.96,
      explanation: `Execução de software do sistema: ${appName}`,
      spokenResponse: `Inicializando ${appName} com privilégios de alto desempenho, Senhor.`,
      matchedText: rawTranscript,
    };
  }

  // ==========================================
  // 9. NAVIGATION INTENT BETWEEN APP MODULES
  // ==========================================
  const isNav =
    normalized.includes('abrir') ||
    normalized.includes('ir para') ||
    normalized.includes('vai para') ||
    normalized.includes('vai pra') ||
    normalized.includes('vai pro') ||
    normalized.includes('muda para') ||
    normalized.includes('mudar para') ||
    normalized.includes('mostrar') ||
    normalized.includes('exibir') ||
    normalized.includes('acessar') ||
    normalized.includes('navegar');

  if (isNav) {
    let targetTab = '';
    let tabNamePt = '';

    if (
      normalized.includes('hp12c') ||
      normalized.includes('hp 12c') ||
      normalized.includes('12c') ||
      normalized.includes('calculadora')
    ) {
      targetTab = 'hp12c';
      tabNamePt = 'HP 12C Financeira';
    } else if (normalized.includes('financeir') || normalized.includes('finanças') || normalized.includes('saldo')) {
      targetTab = 'finance';
      tabNamePt = 'Finanças & Transações';
    } else if (normalized.includes('dispositiv') || normalized.includes('periféric') || normalized.includes('hardware')) {
      targetTab = 'devices';
      tabNamePt = 'Controle de Dispositivos';
    } else if (normalized.includes('agenda') || normalized.includes('compromiss') || normalized.includes('tarefa') || normalized.includes('projeto') || normalized.includes('hábito')) {
      targetTab = 'habits';
      tabNamePt = 'Agenda & Hábitos';
    } else if (normalized.includes('dashboard') || normalized.includes('métrica') || normalized.includes('telemetria') || normalized.includes('visão geral')) {
      targetTab = 'dashboard';
    } else if (
      normalized.includes('automaç') ||
      normalized.includes('automacao') ||
      normalized.includes('automações') ||
      normalized.includes('automacoes') ||
      normalized.includes('alexa') ||
      normalized.includes('google home') ||
      normalized.includes('iot') ||
      normalized.includes('casa inteligente') ||
      normalized.includes('smart home')
    ) {
      targetTab = 'automations';
      tabNamePt = 'Automações & IoT Remoto';
    } else if (normalized.includes('whatsapp') || normalized.includes('mensagen') || normalized.includes('zap')) {
      targetTab = 'whatsapp';
      tabNamePt = 'WhatsApp & Mensagens';
    } else if (normalized.includes('admin') || normalized.includes('usuário') || normalized.includes('gerenciamento')) {
      targetTab = 'admin';
      tabNamePt = 'Painel Administrativo';
    } else if (
      normalized.includes('mídia') ||
      normalized.includes('midia') ||
      normalized.includes('música') ||
      normalized.includes('musica') ||
      normalized.includes('reprodutor') ||
      normalized.includes('player') ||
      normalized.includes('holo') ||
      normalized.includes('canção')
    ) {
      targetTab = 'media';
      tabNamePt = 'Centro de Mídia & Holo-Audio';
    } else if (
      normalized.includes('tradutor') ||
      normalized.includes('tutor') ||
      normalized.includes('inglês') ||
      normalized.includes('ingles') ||
      normalized.includes('pronúncia') ||
      normalized.includes('pronuncia') ||
      normalized.includes('english')
    ) {
      targetTab = 'translator';
      tabNamePt = 'Tradutor & Tutor de Inglês';
    } else if (
      normalized.includes('jogo') ||
      normalized.includes('jogos') ||
      normalized.includes('arcade') ||
      normalized.includes('xadrez') ||
      normalized.includes('space invaders') ||
      normalized.includes('pacman') ||
      normalized.includes('pac-man')
    ) {
      targetTab = 'games';
      tabNamePt = 'Jogos & Arcade Clássico';
    } else if (
      normalized.includes('espelh') ||
      normalized.includes('tv') ||
      normalized.includes('televis') ||
      normalized.includes('samsung') ||
      normalized.includes('lg') ||
      normalized.includes('airplay') ||
      normalized.includes('chromecast') ||
      normalized.includes('miracast')
    ) {
      targetTab = 'mirroring';
      tabNamePt = 'Espelhamento Smart TV';
    } else if (normalized.includes('assistente') || normalized.includes('chat') || normalized.includes('terminal')) {
      targetTab = 'assistant';
      tabNamePt = 'Terminal do Assistente';
    }

    if (targetTab) {
      return {
        type: 'navigate',
        action: 'switch_tab',
        args: { targetTab },
        confidence: 0.98,
        explanation: `Navegação para o módulo ${tabNamePt}`,
        spokenResponse: `Alternando interface para o módulo ${tabNamePt}, Senhor.`,
        matchedText: rawTranscript,
      };
    }
  }

  // ==========================================
  // 10. SYSTEM STATUS / TELEMETRY INTENT
  // ==========================================
  const isStatus =
    normalized.includes('status do sistema') ||
    normalized.includes('como estão os sistemas') ||
    normalized.includes('relatório do sistema') ||
    normalized.includes('diagnóstico') ||
    normalized.includes('telemetria') ||
    normalized.includes('tudo certo');

  if (isStatus) {
    return {
      type: 'system_status',
      action: 'check_status',
      args: { metric: 'general' },
      confidence: 0.97,
      explanation: 'Diagnóstico geral e integridade operacional dos sistemas JARVES',
      spokenResponse:
        'Todos os subsistemas do JARVES operam em parâmetros nominais, Sr. Romildo. CPU a dezesseis por cento, conexões criptografadas ativas e telemetria estável.',
      matchedText: rawTranscript,
    };
  }

  return null;
}

/**
 * Real-time helper to detect live intent preview during user speech.
 * Returns concise badge info (label, color, icon) for the live audio HUD.
 */
export function detectLiveVoiceIntentPreview(transcript: string): { label: string; color: string; icon: string } | null {
  if (!transcript || transcript.trim().length < 2) return null;
  const parsed = parseVoiceIntent(transcript);
  if (!parsed || parsed.type === 'unknown') return null;

  switch (parsed.type) {
    case 'save_system':
      return { label: 'COFRE SEGURO (SALVAR DADOS)', color: '#00F0FF', icon: 'lock' };
    case 'finance_query':
      return { label: 'FINANÇAS: SALDO & EXTRATO', color: '#10B981', icon: 'dollar' };
    case 'finance':
      return { label: `FINANCEIRO: ${parsed.args?.type === 'income' ? 'RECEITA' : 'DESPESA'}`, color: '#10B981', icon: 'dollar' };
    case 'control_hardware':
      return { label: `HARDWARE: ${parsed.args?.device?.toUpperCase()} (${parsed.action === 'turn_on' ? 'ON' : 'OFF'})`, color: '#6C5CE7', icon: 'cpu' };
    case 'camera_vision':
      return { label: 'SENSORES ÓPTICOS / CÂMERA', color: '#00F0FF', icon: 'camera' };
    case 'execute_pc_command':
      return { label: `SISTEMA: ${parsed.args?.command_type?.toUpperCase()}`, color: '#3B82F6', icon: 'terminal' };
    case 'media_player':
      return { label: `HOLO-AUDIO: ${parsed.action?.toUpperCase()}`, color: '#EC4899', icon: 'music' };
    case 'youtube_search':
      return { label: 'YOUTUBE: VÍDEO & MÍDIA', color: '#EF4444', icon: 'play' };
    case 'temperature':
      return { label: `CLIMATIZAÇÃO: ${parsed.args?.target_temperature || 22}°C`, color: '#F59E0B', icon: 'thermometer' };
    case 'calendar':
      return { label: 'AGENDA & COMPROMISSO', color: '#8B5CF6', icon: 'calendar' };
    case 'whatsapp_origin':
      return { label: 'WHATSAPP: CONFIG ORIGEM', color: '#10B981', icon: 'phone' };
    case 'whatsapp_automation':
      return { label: 'WHATSAPP: AUTOMAÇÃO', color: '#22C55E', icon: 'message' };
    case 'whatsapp_send':
      return { label: 'WHATSAPP: ENVIO DIRETO', color: '#22C55E', icon: 'message' };
    case 'navigate':
      return { label: `NAVEGAÇÃO: ${parsed.args?.targetTab?.toUpperCase()}`, color: '#06B6D4', icon: 'compass' };
    case 'system_status':
      return { label: 'DIAGNÓSTICO & TELEMETRIA', color: '#00F0FF', icon: 'activity' };
    case 'open_link':
      return { label: 'NAVEGADOR WEB', color: '#3B82F6', icon: 'globe' };
    default:
      return null;
  }
}
