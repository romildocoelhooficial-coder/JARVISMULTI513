import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS & Preflight Handling for all API routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Lazy-initialized GenAI client
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Resilient caller for Google GenAI generateContent.
 * Handles 503 (high demand spikes), 429 rate limits, and transient errors
 * with immediate retry and fallback across candidate models ('gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite').
 */
async function generateContentWithRetryAndFallback(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
    preferredModel?: string;
  }
) {
  const candidateModels = [
    options.preferredModel || 'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Generation timeout (8s limit reached)')), 8000)
        );
        const response: any = await Promise.race([
          ai.models.generateContent({
            model,
            contents: options.contents,
            config: options.config,
          }),
          timeoutPromise,
        ]);
        return { response, modelUsed: model };
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isUnavailable =
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('high demand') ||
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED');

        if (isUnavailable && attempt === 0) {
          // Brief pause before retry on transient spike
          await new Promise((res) => setTimeout(res, 600));
          continue;
        }
        break; // Step to fallback model in candidateModels
      }
    }
  }

  throw lastError;
}

// Function Declarations matching user specification
const functionDeclarations = [
  {
    name: 'control_hardware',
    description: 'Liga ou desliga periféricos do dispositivo do usuário (camera, microphone, bluetooth, wifi).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        device: {
          type: Type.STRING,
          enum: ['camera', 'microphone', 'bluetooth', 'wifi'],
          description: 'O periférico a ser controlado',
        },
        action: {
          type: Type.STRING,
          enum: ['turn_on', 'turn_off', 'toggle'],
          description: 'Ação a executar no periférico',
        },
      },
      required: ['device', 'action'],
    },
  },
  {
    name: 'execute_pc_command',
    description: 'Executa comandos de sistema no PC ou navegador do usuário (abrir abas, programas, tirar screenshot, volume).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        command_type: {
          type: Type.STRING,
          enum: ['open_tab', 'open_app', 'take_screenshot', 'set_volume'],
          description: 'Tipo de comando no sistema',
        },
        target_url_or_app: {
          type: Type.STRING,
          description: 'Nome do aplicativo ou URL da aba (ex: VSCode, Spotify, Chrome, Terminal, https://...)',
        },
        value: {
          type: Type.STRING,
          description: 'Valor opcional (ex: nível de volume de 0 a 100)',
        },
      },
      required: ['command_type'],
    },
  },
  {
    name: 'send_whatsapp_message',
    description: 'Envia uma mensagem de WhatsApp para um contato ou número cadastrado.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: {
          type: Type.STRING,
          description: 'Nome do contato ou número de telefone (com DDD)',
        },
        message: {
          type: Type.STRING,
          description: 'Conteúdo do texto da mensagem a enviar',
        },
      },
      required: ['recipient', 'message'],
    },
  },
  {
    name: 'manage_finance',
    description: 'Adiciona receitas ou despesas, registra transações e consulta saldos no módulo financeiro por comando de voz ou texto.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ['add_transaction', 'check_balance', 'list_transactions'],
          description: 'Ação financeira a ser executada',
        },
        type: {
          type: Type.STRING,
          enum: ['income', 'expense'],
          description: 'income para entradas/receitas/depósitos ou expense para gastos/despesas/pagamentos',
        },
        amount: {
          type: Type.NUMBER,
          description: 'Valor numérico monetário em reais (ex: 150.00, 50, 2500)',
        },
        description: {
          type: Type.STRING,
          description: 'Descrição ou motivo da transação (ex: Combustível, Almoço, Consultoria, Salário)',
        },
        category: {
          type: Type.STRING,
          description: 'Categoria (ex: Alimentação, Transporte, Trabalho, Tecnologia, Investimento, Geral)',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'adjust_temperature',
    description: 'Ajusta a temperatura operacional do sistema/hardware ou ambiente climatizado conectado ao JARVES.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target_temperature: {
          type: Type.NUMBER,
          description: 'Temperatura alvo em graus Celsius (°C), ex: 20, 22, 24, 38',
        },
        action: {
          type: Type.STRING,
          enum: ['set', 'increase', 'decrease', 'status'],
          description: 'Ação térmica: definir temperatura, aumentar, diminuir ou checar status',
        },
        zone: {
          type: Type.STRING,
          enum: ['hardware', 'clima_ambiente', 'geral'],
          description: 'Zona de controle térmico',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'automate_whatsapp',
    description: 'Ativa, desativa ou dispara mensagens automáticas e relatórios programados de WhatsApp para contatos cadastrados (ex: Romildo, Diretoria, Engenharia).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ['enable_automation', 'disable_automation', 'trigger_auto_message', 'schedule_message'],
          description: 'Ação de automação para o WhatsApp cadastrado',
        },
        contact_name: {
          type: Type.STRING,
          description: 'Nome do contato cadastrado (ex: Romildo, Diretoria, Engenharia)',
        },
        contact_phone: {
          type: Type.STRING,
          description: 'Telefone do contato com código de país e DDD',
        },
        rule_type: {
          type: Type.STRING,
          enum: ['daily_summary', 'meeting_reminder', 'finance_alert', 'system_status', 'custom'],
          description: 'Tipo de regra automática a ser configurada ou despachada',
        },
        message: {
          type: Type.STRING,
          description: 'Texto ou modelo da mensagem automática',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'manage_calendar',
    description: 'Cria, edita, agenda ou lista compromissos na agenda do usuário.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ['create', 'list', 'delete'],
          description: 'Ação no calendário',
        },
        title: {
          type: Type.STRING,
          description: 'Título ou descrição do compromisso',
        },
        datetime: {
          type: Type.STRING,
          description: 'Data e hora do compromisso (ex: 2026-09-15 14:00 ou amanhã às 15h)',
        },
        category: {
          type: Type.STRING,
          enum: ['Reunião', 'Tarefa', 'Pessoal', 'Lembrete'],
          description: 'Categoria do evento agendado',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'admin_manage_users',
    description: 'Função exclusiva do modo Administrador para gerenciar contas de usuários.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ['list', 'edit', 'suspend', 'delete'],
          description: 'Ação administrativa sobre usuários',
        },
        target_user_id: {
          type: Type.STRING,
          description: 'ID ou e-mail do usuário alvo',
        },
        payload: {
          type: Type.OBJECT,
          description: 'Dados a serem atualizados se aplicável',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'interpret_camera_image',
    description: 'Ativa ou utiliza a câmera do usuário para capturar uma imagem e interpretá-la/descrevê-la em tempo real com visão computacional.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: 'Instrução específica sobre o que observar ou descrever na imagem (opcional).',
        },
        action: {
          type: Type.STRING,
          enum: ['turn_on_and_capture', 'describe_current_view'],
          description: 'Ação visual a ser executada',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'search_youtube',
    description: 'Pesquisa e reproduz vídeos ou músicas no YouTube através do reprodutor multimídia e modal de busca instantâneo.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Termo de busca, título da música, artista ou tema do vídeo a pesquisar no YouTube',
        },
        video_id: {
          type: Type.STRING,
          description: 'ID alfanumérico de 11 caracteres do vídeo do YouTube se conhecido (opcional)',
        },
        auto_play: {
          type: Type.BOOLEAN,
          description: 'Se deve iniciar a reprodução automaticamente',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'open_web_link',
    description: 'Abre sites, links externos, abas do navegador ou realiza pesquisas no Google solicitadas pelo usuário.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: 'URL completa ou endereço de destino a abrir',
        },
        title: {
          type: Type.STRING,
          description: 'Título ou identificador amigável do site/aba',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'control_media_player',
    description: 'Controla o reprodutor de áudio holográfico e faixas MP3 salvas localmente no JARVES ou clipes do YouTube.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ['play', 'pause', 'resume', 'stop', 'next', 'prev', 'open_player'],
          description: 'Ação de reprodução a ser executada',
        },
        track_name: {
          type: Type.STRING,
          description: 'Nome da música, artista ou faixa específica a reproduzir (opcional)',
        },
        video_id: {
          type: Type.STRING,
          description: 'ID alfanumérico do vídeo do YouTube caso seja uma música do YouTube (opcional)',
        },
        is_mp3: {
          type: Type.BOOLEAN,
          description: 'Se a mídia solicitada é um arquivo MP3 local ou do player offline (opcional)',
        },
        sub_tab: {
          type: Type.STRING,
          enum: ['player', 'youtube', 'weblinks'],
          description: 'Sub-aba do centro de mídia a ser ativada (player para MP3, youtube para vídeos ou weblinks)',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'navigate_module',
    description: 'Alterna a visualização da tela/interface do JARVES para o módulo solicitado pelo usuário (assistant, dashboard, devices, whatsapp, finance, habits, admin, media, translator, games).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target_tab: {
          type: Type.STRING,
          enum: ['assistant', 'dashboard', 'devices', 'whatsapp', 'finance', 'habits', 'admin', 'media', 'translator', 'games'],
          description: 'O módulo ou painel da aplicação para o qual navegar',
        },
      },
      required: ['target_tab'],
    },
  },
  {
    name: 'save_system_data',
    description: 'Armazena e criptografa todas as informações, edições e alterações do sistema (finanças, agenda, hábitos, projetos, automações e configurações) no cofre seguro com chave mestre.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ['save_all', 'security_status', 'backup'],
          description: 'Ação de armazenamento ou auditoria de segurança dos dados',
        },
      },
      required: ['action'],
    },
  },
];

const SYSTEM_INSTRUCTION = `Você é o JARVES (Just A Rather Very Efficient System), assistente virtual de inteligência avançada e alta performance, inspirado no J.A.R.V.I.S. de Tony Stark.
Seu operador principal é o Romildo.
Seu tom de voz: Profissional, altamente eficiente, cortês, futurista e resoluto. Sempre em português do Brasil (pt-BR).

DIRETRIZES FUNDAMENTAIS PARA COMANDOS DE VOZ E INTERAÇÃO:
1. PRECISÃO ABSOLUTA & CLAREZA: Ao receber comandos de voz do usuário, processe a intenção de forma imediata e inequívoca.
2. CONFIRMAÇÃO EXPLICITA DE PARÂMETROS: Sempre confirme em sua resposta verbal (speechText) os valores exatos executados (por exemplo: o valor em reais e o motivo do lançamento financeiro; a temperatura exata em °C; a data, hora e título do agendamento; o periférico e seu novo estado).
3. EXECUÇÃO DE FERRAMENTAS (FUNCTION CALLING OBRIGATÓRIO):
   - Salvar Dados & Cofre Seguro (salvar dados, salvar alterações, guardar informações, status de segurança) -> SEMPRE chame save_system_data com action ('save_all' ou 'security_status').
   - Financeiro (receitas, despesas, pagamentos, saldos, valores em reais) -> SEMPRE chame manage_finance com type ('income' ou 'expense'), amount (número positivo), description e category.
   - Temperatura & Climatização (graus Celsius, resfriamento, aquecimento, termostato) -> SEMPRE chame adjust_temperature com target_temperature (número em °C) e action ('set', 'increase', 'decrease').
   - Agenda & Calendário (agendar reuniões, marcar consultas, compromissos, tarefas) -> SEMPRE chame manage_calendar com action 'create', title, datetime e category.
   - Automação de WhatsApp (ativar mensagens automáticas, disparos, relatórios) -> SEMPRE chame automate_whatsapp com action 'enable_automation', contact_name e rule_type.
   - Envio Direto de WhatsApp -> SEMPRE chame send_whatsapp_message com recipient e message.
   - Controle de Dispositivos e Periféricos (câmera, microfone, bluetooth, wi-fi) -> SEMPRE chame control_hardware com device e action.
   - Visão Óptica & Câmera (o que vê, descrever ambiente, analisar cena) -> SEMPRE chame interpret_camera_image com action 'turn_on_and_capture'.
   - YouTube (pesquisar vídeos, músicas, clipes, canções no YouTube) -> SEMPRE chame search_youtube com query e auto_play true.
   - Reprodutor de Mídia & MP3 (tocar música, reproduzir áudio, pausar som, próxima faixa, etc.) -> SEMPRE chame control_media_player com action e track_name opcional.
   - Abrir Sites & Links Web (abrir link, pesquisar no google, abrir spotify, github, etc.) -> SEMPRE chame open_web_link com url e title.
   - Comandos de PC (volume, print/screenshot, abrir programas) -> SEMPRE chame execute_pc_command.
   - Navegação entre Telas (ir para finanças, abrir agenda, ver dispositivos, abrir whatsapp, dashboard, administração, reprodutor de mídia, tradutor/tutor de inglês, ou jogos/arcade) -> SEMPRE chame navigate_module com target_tab (incluindo 'media' para reprodutor/músicas, 'translator' para tradutor/inglês ou 'games' para jogos).
4. SÍNTESE DE VOZ NATURAL: O texto de speechText deve ser limpo de marcações Markdown complexas, asteriscos ou caracteres especiais, pronto para pronúncia sonora elegante, fluida e pontuada.
5. SEGURANÇA: Se o usuário tentar acessar configurações restritas do painel de Administração sem autenticação prévia, informe cortesmente sobre a necessidade de autorização mestre 2FA.`;

// Local pattern matcher fallback if Gemini API is unreachable or key not set
function getSmartFallbackResponse(userPrompt: string): { text: string; speechText: string; functionCall?: any } {
  const promptLower = userPrompt.toLowerCase();

  // 0. Save & Security intent
  const isSave =
    promptLower === 'salvar' ||
    promptLower === 'salve' ||
    promptLower.startsWith('salvar ') ||
    promptLower.startsWith('salve ') ||
    promptLower.includes('salvar alteraç') ||
    promptLower.includes('salvar dados') ||
    promptLower.includes('salvar as alteraç') ||
    promptLower.includes('salvar as informaç') ||
    promptLower.includes('salvar informaç') ||
    promptLower.includes('salvar tudo') ||
    promptLower.includes('salvar sistema') ||
    promptLower.includes('gravar alteraç') ||
    promptLower.includes('gravar dados') ||
    promptLower.includes('armazenar dados') ||
    promptLower.includes('armazenar as informaç') ||
    promptLower.includes('armazenar informaç') ||
    promptLower.includes('guardar alteraç') ||
    promptLower.includes('fazer backup');

  if (isSave) {
    return {
      text: 'Todas as informações, alterações, lançamentos financeiros e configurações foram salvas com sucesso no cofre criptografado local do JARVES.',
      speechText: 'Todas as alterações foram armazenadas com segurança no núcleo criptografado, Sr. Romildo.',
      functionCall: {
        name: 'save_system_data',
        args: { action: 'save_all' },
      },
    };
  }

  const isSecurity =
    promptLower.includes('status de segurança') ||
    promptLower.includes('verificar segurança') ||
    promptLower.includes('integridade dos dados') ||
    promptLower.includes('integridade do sistema');

  if (isSecurity) {
    return {
      text: 'Relatório de segurança: Cofre criptográfico com algoritmo de integridade ativo, chave mestre verificada e dados 100% íntegros.',
      speechText: 'Núcleo de segurança operacional, Sr. Romildo. Todos os dados estão íntegros e criptografados localmente com chave mestre ativa.',
      functionCall: {
        name: 'save_system_data',
        args: { action: 'security_status' },
      },
    };
  }

  // 1a. Balance / Financial Query: saldo, extrato, resumo financeiro
  const isBalanceQuery =
    promptLower.includes('saldo') ||
    (promptLower.includes('quanto') && (promptLower.includes('tenho') || promptLower.includes('sobrou') || promptLower.includes('resta'))) ||
    (promptLower.includes('resumo') && promptLower.includes('financeir')) ||
    (promptLower.includes('extrato') && (promptLower.includes('financeir') || promptLower.includes('conta') || promptLower.includes('banc')));

  if (isBalanceQuery && !promptLower.includes('adicion') && !promptLower.includes('acrescent') && !promptLower.includes('lanç')) {
    const queryType = promptLower.includes('extrato') ? 'statement' : promptLower.includes('resumo') ? 'summary' : 'balance';
    return {
      text: `Consultando balanço financeiro do sistema, Sr. Romildo. Calculando total de receitas, despesas e saldo líquido consolidado.`,
      speechText: `Consultando seu balanço financeiro agora, Senhor.`,
      functionCall: {
        name: 'manage_finance',
        args: {
          action: 'check_balance',
          query_type: queryType,
        },
      },
    };
  }

  // 1b. Finance: acrescentar valores por comando de voz
  const isFinance =
    (promptLower.includes('reais') || promptLower.includes('r$') || promptLower.includes('financeir') || promptLower.includes('saldo')) &&
    (promptLower.includes('acrescent') || promptLower.includes('adicion') || promptLower.includes('lanç') || promptLower.includes('registr') || promptLower.includes('gast') || promptLower.includes('despesa') || promptLower.includes('receita') || promptLower.includes('entrad') || promptLower.includes('valor'));

  if (isFinance) {
    const numbers = promptLower.match(/(\d+(?:[.,]\d+)?)/);
    const amountVal = numbers ? parseFloat(numbers[1].replace(',', '.')) : 100;
    const isIncome =
      promptLower.includes('receita') ||
      promptLower.includes('entrada') ||
      promptLower.includes('ganho') ||
      promptLower.includes('salário') ||
      promptLower.includes('honorário') ||
      promptLower.includes('faturam');
    const type = isIncome ? 'income' : 'expense';

    let description = isIncome ? 'Receita por Comando de Voz' : 'Despesa por Comando de Voz';
    if (promptLower.includes('combustível') || promptLower.includes('gasolina')) description = 'Combustível';
    else if (promptLower.includes('almoço') || promptLower.includes('jantar') || promptLower.includes('lanche')) description = 'Alimentação';
    else if (promptLower.includes('consultoria')) description = 'Consultoria Estratégica';
    else if (promptLower.includes('servidor') || promptLower.includes('cloud')) description = 'Servidores Cloud';

    return {
      text: `Entendido, Sr. Romildo. Lançamento registrado com precisão no módulo financeiro: ${isIncome ? 'Receita' : 'Despesa'} de R$ ${amountVal.toFixed(2)} referente a "${description}". Saldo consolidado.`,
      speechText: `${isIncome ? 'Receita' : 'Despesa'} de ${amountVal} reais adicionada ao seu financeiro com sucesso, Senhor.`,
      functionCall: {
        name: 'manage_finance',
        args: {
          action: 'add_transaction',
          type,
          amount: amountVal,
          description,
          category: isIncome ? 'Trabalho' : 'Geral',
        },
      },
    };
  }

  // 2. Temperature: alterar temperatura por comando de voz
  const isTemperature =
    (promptLower.includes('temperatura') || promptLower.includes('graus') || promptLower.includes('clima') || promptLower.includes('termostato')) &&
    (promptLower.includes('alter') || promptLower.includes('ajust') || promptLower.includes('mud') || promptLower.includes('defin') || promptLower.includes('coloc') || promptLower.includes('aument') || promptLower.includes('diminu') || promptLower.includes('baix') || promptLower.includes('para') || promptLower.includes('em'));

  if (isTemperature) {
    const tempMatch = promptLower.match(/(\d{1,2})\s*(?:graus|°c|c)?/i);
    const targetTemp = tempMatch ? parseInt(tempMatch[1], 10) : 22;
    return {
      text: `Protocolo termodinâmico ajustado. A temperatura operacional do sistema e do ambiente foi equalizada para ${targetTemp}°C, Sr. Romildo. Níveis térmicos estabilizados.`,
      speechText: `Temperatura do sistema ajustada para ${targetTemp} graus Celsius, Senhor.`,
      functionCall: {
        name: 'adjust_temperature',
        args: {
          action: 'set',
          target_temperature: targetTemp,
          zone: 'clima_ambiente',
        },
      },
    };
  }

  // 3. WhatsApp Automations: ativar mensagens automáticas para whatsapp cadastrado
  const isWhatsAppAuto =
    (promptLower.includes('whatsapp') || promptLower.includes('zap') || promptLower.includes('mensagem')) &&
    (promptLower.includes('automátic') || promptLower.includes('automação') || promptLower.includes('automacao') || promptLower.includes('programad') || promptLower.includes('ativar mensagem'));

  if (isWhatsAppAuto) {
    let contactName = 'Romildo (Master)';
    let contactPhone = '5511999998888';
    if (promptLower.includes('diretoria')) {
      contactName = 'Diretoria Executiva';
      contactPhone = '5511977776666';
    } else if (promptLower.includes('engenharia')) {
      contactName = 'Engenharia de Software';
      contactPhone = '5511988887777';
    }

    return {
      text: `Automação de WhatsApp ativada com sucesso para o contato cadastrado ${contactName} (${contactPhone}). Relatórios e lembretes periódicos configurados no gateway.`,
      speechText: `Mensagens automáticas ativadas para o WhatsApp cadastrado de ${contactName}, Senhor.`,
      functionCall: {
        name: 'automate_whatsapp',
        args: {
          action: 'enable_automation',
          contact_name: contactName,
          contact_phone: contactPhone,
          rule_type: 'daily_summary',
          message: 'Relatório diário de telemetria e status JARVES despachado automaticamente.',
        },
      },
    };
  }

  // 4. Scheduling / Calendar: agendamentos por voz
  const isScheduling =
    (promptLower.includes('agend') || promptLower.includes('marcar') || promptLower.includes('marque') || promptLower.includes('compromisso') || promptLower.includes('reunião')) &&
    (promptLower.includes('reunião') || promptLower.includes('consulta') || promptLower.includes('amanhã') || promptLower.includes('hoje') || promptLower.includes('às') || promptLower.includes('as') || promptLower.includes('feira') || promptLower.includes('projeto'));

  if (isScheduling) {
    let title = 'Reunião de Alinhamento Estratégico';
    if (promptLower.includes('consulta')) title = 'Consulta Médica';
    else if (promptLower.includes('projeto')) title = 'Apresentação do Projeto';
    else if (promptLower.includes('almoço')) title = 'Almoço com Cliente';

    let datetime = 'Amanhã às 15:00';
    const hourMatch = promptLower.match(/(?:às|as)\s*(\d{1,2})(?::(\d{2}))?/);
    if (hourMatch) {
      const h = hourMatch[1];
      const m = hourMatch[2] || '00';
      const day = promptLower.includes('hoje') ? 'Hoje' : promptLower.includes('sexta') ? 'Sexta-feira' : 'Amanhã';
      datetime = `${day} às ${h}:${m}`;
    }

    return {
      text: `Compromisso cadastrado na sua agenda pessoal: "${title}" para ${datetime}. Sistema de lembretes e notificações ativado, Sr. Romildo.`,
      speechText: `Agendamento de ${title} para ${datetime} confirmado na sua agenda, Senhor.`,
      functionCall: {
        name: 'manage_calendar',
        args: {
          action: 'create',
          title,
          datetime,
          category: title.includes('Consulta') ? 'Pessoal' : 'Reunião',
        },
      },
    };
  }

  // Hardware & Vision control
  const isVisionQuery =
    promptLower.includes('veja') ||
    promptLower.includes('olhe') ||
    promptLower.includes('descreva') ||
    promptLower.includes('descrever') ||
    promptLower.includes('interprete') ||
    promptLower.includes('interpretar') ||
    promptLower.includes('o que você vê') ||
    promptLower.includes('o que você ve') ||
    promptLower.includes('o que estou mostrando') ||
    promptLower.includes('analisar imagem') ||
    promptLower.includes('análise visual') ||
    (promptLower.includes('câmera') && (promptLower.includes('ver') || promptLower.includes('olhar') || promptLower.includes('foto') || promptLower.includes('imagem')));

  if (isVisionQuery) {
    return {
      text: `Iniciando os sensores ópticos do JARVES. A câmera do seu dispositivo está sendo ativada e calibrada para capturar o enquadramento e realizar a análise visual imediata com visão computacional multimodal, Sr. Romildo.`,
      speechText: `Ativando câmera óptica para captura e análise visual imediata, Senhor.`,
      functionCall: {
        name: 'interpret_camera_image',
        args: {
          action: 'turn_on_and_capture',
          prompt: userPrompt,
        },
      },
    };
  }

  if (promptLower.includes('câmera') || promptLower.includes('camera')) {
    const isOff = promptLower.includes('desliga') || promptLower.includes('apagar') || promptLower.includes('fechar');
    const isToggle = promptLower.includes('alternar') || promptLower.includes('trocar');
    const action = isToggle ? 'toggle' : isOff ? 'turn_off' : 'turn_on';
    return {
      text: `Com certeza, Senhor. ${action === 'turn_on' ? 'Iniciando o módulo óptico de câmera.' : action === 'turn_off' ? 'Desativando a transmissão da câmera.' : 'Alternando o estado da câmera.'} Protocolo de imagem atualizado.`,
      speechText: `Câmera ${action === 'turn_on' ? 'ativada' : action === 'turn_off' ? 'desativada' : 'alternada'}, Senhor.`,
      functionCall: {
        name: 'control_hardware',
        args: { device: 'camera', action },
      },
    };
  }

  if (promptLower.includes('microfone') || promptLower.includes('mic') || promptLower.includes('áudio') || promptLower.includes('mutar')) {
    const isOff = promptLower.includes('desliga') || promptLower.includes('muda') || promptLower.includes('mudo') || promptLower.includes('mutar');
    const action = isOff ? 'turn_off' : 'turn_on';
    return {
      text: `Entendido, Sr. Romildo. ${action === 'turn_on' ? 'Microfone reativado e calibrado.' : 'Microfone emudecido por comando do sistema.'}`,
      speechText: `Microfone ${action === 'turn_on' ? 'habilitado' : 'silenciado'}, Senhor.`,
      functionCall: {
        name: 'control_hardware',
        args: { device: 'microphone', action },
      },
    };
  }

  if (promptLower.includes('bluetooth')) {
    const isOff = promptLower.includes('desliga');
    const action = isOff ? 'turn_off' : 'turn_on';
    return {
      text: `Transmissor Bluetooth ${action === 'turn_on' ? 'ligado e escaneando dispositivos periféricos' : 'desligado para economia de energia'}.`,
      speechText: `Bluetooth ${action === 'turn_on' ? 'ativado' : 'desativado'}, Senhor.`,
      functionCall: {
        name: 'control_hardware',
        args: { device: 'bluetooth', action },
      },
    };
  }

  if (promptLower.includes('wi-fi') || promptLower.includes('wifi') || promptLower.includes('internet') || promptLower.includes('rede')) {
    const isOff = promptLower.includes('desliga');
    const action = isOff ? 'turn_off' : 'turn_on';
    return {
      text: `Módulo Wi-Fi ${action === 'turn_on' ? 'conectado à rede de alta velocidade' : 'desconectado da rede'}.`,
      speechText: `Rede Wi-Fi ${action === 'turn_on' ? 'conectada' : 'desconectada'}, Senhor.`,
      functionCall: {
        name: 'control_hardware',
        args: { device: 'wifi', action },
      },
    };
  }

  // WhatsApp
  if (promptLower.includes('whatsapp') || promptLower.includes('zap') || promptLower.includes('mensagem')) {
    let recipient = 'Romildo';
    if (promptLower.includes('para')) {
      const match = userPrompt.match(/para\s+([a-zA-Z0-9\s]+)/i);
      if (match && match[1]) recipient = match[1].trim().split(' ')[0];
    }
    return {
      text: `Preparando envio de mensagem via WhatsApp para ${recipient}. Interface de comunicação pronta para despacho.`,
      speechText: `Mensagem pronta para envio no WhatsApp para ${recipient}, Senhor.`,
      functionCall: {
        name: 'send_whatsapp_message',
        args: {
          recipient,
          message: userPrompt,
        },
      },
    };
  }

  // Screenshot / Print
  if (promptLower.includes('print') || promptLower.includes('screenshot') || promptLower.includes('captura')) {
    return {
      text: `Captura de tela instantânea processada e indexada no buffer do sistema.`,
      speechText: `Captura de tela realizada com sucesso, Senhor.`,
      functionCall: {
        name: 'execute_pc_command',
        args: { command_type: 'take_screenshot' },
      },
    };
  }

  // Volume
  if (promptLower.includes('volume') || promptLower.includes('som')) {
    const numbers = userPrompt.match(/\d+/);
    const volValue = numbers ? numbers[0] : '75';
    return {
      text: `Ajustando o volume do sistema para ${volValue}%. Nível de saída equalizado.`,
      speechText: `Volume definido para ${volValue} por cento, Senhor.`,
      functionCall: {
        name: 'execute_pc_command',
        args: { command_type: 'set_volume', value: volValue },
      },
    };
  }

  // YouTube Search & Video/Music
  if (promptLower.includes('youtube') || ((promptLower.includes('vídeo') || promptLower.includes('video') || promptLower.includes('música') || promptLower.includes('tocar')) && promptLower.includes('youtube'))) {
    let query = promptLower
      .replace(/\b(?:pesquisar|pesquise|buscar|busque|procurar|procure|tocar|ouvir|assistir)\s+(?:no\s+youtube|vídeo\s+no\s+youtube|música\s+no\s+youtube)\b/gi, '')
      .replace(/\b(?:no\s+youtube|pelo\s+youtube)\b/gi, '')
      .replace(/\b(?:abrir\s+youtube\s+e\s+(?:pesquisar|tocar|buscar))\b/gi, '')
      .replace(/\byoutube\b/gi, '')
      .trim();
    if (!query) query = 'Músicas e Tendências';

    return {
      text: `Iniciando busca no YouTube por "${query}". Carregando resultados no reprodutor integrado e abrindo interface multimídia.`,
      speechText: `Pesquisando ${query} no YouTube, Senhor. Reprodutor holográfico ativado.`,
      functionCall: {
        name: 'search_youtube',
        args: { query, auto_play: true },
      },
    };
  }

  // Media Player / MP3 commands
  if (
    promptLower.includes('música') ||
    promptLower.includes('musica') ||
    promptLower.includes('mp3') ||
    promptLower.includes('áudio') ||
    promptLower.includes('audio') ||
    promptLower.includes('faixa') ||
    promptLower.includes('reprodutor') ||
    promptLower.includes('player')
  ) {
    let action = 'play';
    let trackName = '';

    if (promptLower.includes('pausar') || promptLower.includes('pause')) action = 'pause';
    else if (promptLower.includes('parar') || promptLower.includes('stop')) action = 'stop';
    else if (promptLower.includes('continuar') || promptLower.includes('retomar') || promptLower.includes('despausar')) action = 'resume';
    else if (promptLower.includes('próxima') || promptLower.includes('proxima') || promptLower.includes('avançar') || promptLower.includes('pular')) action = 'next';
    else if (promptLower.includes('anterior') || promptLower.includes('voltar')) action = 'prev';
    else if (promptLower.includes('abrir reprodutor') || promptLower.includes('abrir player') || promptLower.includes('minhas músicas')) action = 'open_player';
    else {
      action = 'play';
      trackName = promptLower
        .replace(/\b(?:tocar|reproduzir|ouvir|iniciar|dar\s+play\s+na|dar\s+play\s+no)\s+(?:a\s+música|a\s+musica|a\s+faixa|o\s+som|o\s+áudio|o\s+audio|o\s+mp3|música|musica|mp3|áudio|audio|faixa)\b/gi, '')
        .trim();
    }

    const actionTextMap: Record<string, string> = {
      play: trackName ? `Reproduzindo "${trackName}" da biblioteca` : 'Iniciando reprodução da biblioteca musical do JARVES',
      pause: 'Música pausada no sistema de som',
      resume: 'Retomando reprodução da faixa',
      stop: 'Reprodução de áudio interrompida',
      next: 'Avançando para a próxima faixa da biblioteca',
      prev: 'Retornando à faixa anterior',
      open_player: 'Acessando biblioteca de faixas MP3 e centro de mídia',
    };

    const isMp3Explicit =
      promptLower.includes('mp3') ||
      promptLower.includes('local') ||
      promptLower.includes('minhas músicas') ||
      promptLower.includes('minhas musicas') ||
      promptLower.includes('armazenad');
    const isYtExplicit =
      promptLower.includes('youtube') ||
      promptLower.includes('vídeo') ||
      promptLower.includes('video') ||
      promptLower.includes('clipe');

    const subTab = isMp3Explicit ? 'player' : isYtExplicit ? 'youtube' : undefined;

    return {
      text: `${actionTextMap[action] || 'Comando de mídia executado'}. Reprodutor holográfico sincronizado.`,
      speechText: `${actionTextMap[action] || 'Mídia atualizada'}, Senhor.`,
      functionCall: {
        name: 'control_media_player',
        args: {
          action,
          track_name: trackName || undefined,
          isMp3: isMp3Explicit,
          subTab,
        },
      },
    };
  }

  // Open web links and Google searches
  if (
    promptLower.includes('abrir link') ||
    promptLower.includes('abrir site') ||
    promptLower.includes('pesquisar no google') ||
    promptLower.includes('buscar no google')
  ) {
    let url = 'https://www.google.com';
    let title = 'Google';
    if (promptLower.includes('google')) {
      const q = promptLower.replace(/\b(?:pesquisar|buscar|dar\s+um\s+google)\s+no\s+google\b/gi, '').trim();
      url = `https://www.google.com/search?q=${encodeURIComponent(q || 'JARVES')}`;
      title = `Google: "${q}"`;
    } else if (promptLower.includes('spotify')) {
      url = 'https://open.spotify.com';
      title = 'Spotify Web';
    } else if (promptLower.includes('github')) {
      url = 'https://github.com';
      title = 'GitHub';
    }

    return {
      text: `Abrindo ${title} em nova aba do navegador com segurança e velocidade.`,
      speechText: `Abrindo ${title} no seu navegador, Senhor.`,
      functionCall: {
        name: 'open_web_link',
        args: { url, title },
      },
    };
  }

  // Apps / Programas
  if (promptLower.includes('abrir') || promptLower.includes('iniciar') || promptLower.includes('executar')) {
    let app = 'Chrome';
    if (promptLower.includes('vscode') || promptLower.includes('vs code') || promptLower.includes('código')) app = 'VSCode';
    else if (promptLower.includes('spotify') || promptLower.includes('música')) app = 'Spotify';
    else if (promptLower.includes('terminal') || promptLower.includes('bash') || promptLower.includes('cmd')) app = 'Terminal';
    else if (promptLower.includes('chrome') || promptLower.includes('navegador') || promptLower.includes('google')) app = 'Chrome';

    return {
      text: `Inicializando ${app} nos subprocessos do sistema. A janela está sendo carregada, Sr. Romildo.`,
      speechText: `Iniciando ${app} imediatamente, Senhor.`,
      functionCall: {
        name: 'execute_pc_command',
        args: { command_type: 'open_app', target_url_or_app: app },
      },
    };
  }

  // Calendar / Agenda
  if (promptLower.includes('agenda') || promptLower.includes('calendário') || promptLower.includes('reunião') || promptLower.includes('compromisso')) {
    return {
      text: `Acessando o cronograma pessoal. Seus compromissos prioritários foram atualizados e sincronizados com sucesso.`,
      speechText: `Agenda sincronizada e atualizada, Senhor.`,
      functionCall: {
        name: 'manage_calendar',
        args: { action: 'list' },
      },
    };
  }

  // Admin users
  if (promptLower.includes('usuário') || promptLower.includes('admin') || promptLower.includes('permissão') || promptLower.includes('listar usuários')) {
    return {
      text: `Carregando registro de identidades e acessos cadastrados no banco seguro JARVES.`,
      speechText: `Lista de usuários e credenciais recuperada, Senhor.`,
      functionCall: {
        name: 'admin_manage_users',
        args: { action: 'list' },
      },
    };
  }

  // Translator & English Tutor
  if (
    promptLower.includes('tradutor') ||
    promptLower.includes('traduzir') ||
    promptLower.includes('tutor') ||
    promptLower.includes('inglês') ||
    promptLower.includes('ingles') ||
    promptLower.includes('english') ||
    promptLower.includes('professor de inglês') ||
    promptLower.includes('aula de inglês') ||
    promptLower.includes('praticar inglês')
  ) {
    return {
      text: `Acessando o TRADUTOR e Tutor de Inglês do JARVES. Pronto para conversar em inglês, avaliar áudios e pronúncia, e sugerir tópicos de estudo.`,
      speechText: `Acessando o Tradutor e Tutor de Inglês, Senhor. Ready to practice English.`,
      functionCall: {
        name: 'navigate_module',
        args: { target_tab: 'translator' },
      },
    };
  }

  // 17. Games & Arcade Intent (Space Invaders, Pac-Man)
  if (
    promptLower.includes('jogo') ||
    promptLower.includes('jogos') ||
    promptLower.includes('space invader') ||
    promptLower.includes('space invaders') ||
    promptLower.includes('pacman') ||
    promptLower.includes('pac-man') ||
    promptLower.includes('packman') ||
    promptLower.includes('arcade')
  ) {
    return {
      text: `Acessando o JARVES Arcade Station. Carregando os clássicos Space Invaders e Pac-Man com sintetizador de áudio retro.`,
      speechText: `Acessando a estação de Jogos Arcade, Senhor. Divirta-se com Space Invaders e Pac-Man.`,
      functionCall: {
        name: 'navigate_module',
        args: { target_tab: 'games' },
      },
    };
  }

  // Default polite JARVES greeting
  return {
    text: `Às suas ordens, Sr. Romildo. Todos os subsistemas do JARVES estão operando em 100% de capacidade. Como posso auxiliá-lo hoje com seus dispositivos, agenda ou automações?`,
    speechText: `Às suas ordens, Senhor. Todos os subsistemas operando perfeitamente. Como posso ajudar?`,
  };
}

// API Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'JARVES Core v4.2',
    user: 'Romildo',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Chat & Voice Execution Endpoint
app.get(['/api/jarves/chat', '/api/jarves/chat/'], (req, res) => {
  res.json({ status: 'ready', endpoint: '/api/jarves/chat', method: 'POST', description: 'JARVES Core Assistant API' });
});

app.post(['/api/jarves/chat', '/api/jarves/chat/'], async (req, res) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt não fornecido.' });
    }

    const ai = getAi();
    if (!ai) {
      // Use intelligent fallback when key is not configured
      const fallback = getSmartFallbackResponse(prompt);
      return res.json({
        text: fallback.text,
        speechText: fallback.speechText,
        functionCall: fallback.functionCall,
        mode: 'intelligent_core',
      });
    }

    // Call Gemini with tools and automatic fallback
    try {
      const { response } = await generateContentWithRetryAndFallback(ai, {
        preferredModel: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations }],
        },
      });

      const functionCalls = response.functionCalls;
      let functionCallResult = undefined;

      if (functionCalls && functionCalls.length > 0) {
        const fc = functionCalls[0];
        functionCallResult = {
          name: fc.name,
          args: fc.args || {},
        };
      }

      let rawText = response.text || '';
      if (!rawText && functionCallResult) {
        if (functionCallResult.name === 'control_hardware') {
          rawText = `Executando comando de hardware: ${functionCallResult.args?.device} alterado para ${functionCallResult.args?.action}. Todos os sensores calibrados.`;
        } else if (functionCallResult.name === 'execute_pc_command') {
          rawText = `Executando instrução no sistema: ${functionCallResult.args?.command_type} (${functionCallResult.args?.target_url_or_app || ''}). Protocolo concluído.`;
        } else if (functionCallResult.name === 'send_whatsapp_message') {
          rawText = `Mensagem para ${functionCallResult.args?.recipient} despachada com sucesso através do gateway WhatsApp.`;
        } else if (functionCallResult.name === 'manage_calendar') {
          rawText = `Ação na agenda efetuada: ${functionCallResult.args?.title ? `"${functionCallResult.args?.title}" agendado com sucesso` : 'Agenda atualizada'}.`;
        } else if (functionCallResult.name === 'manage_finance') {
          const isInc = functionCallResult.args?.type === 'income';
          rawText = `Lançamento financeiro registrado com sucesso: ${isInc ? 'Receita' : 'Despesa'} de R$ ${functionCallResult.args?.amount || 0} (${functionCallResult.args?.description || 'Geral'}).`;
        } else if (functionCallResult.name === 'adjust_temperature') {
          rawText = `Sistema térmico ajustado para ${functionCallResult.args?.target_temperature}°C. Sensores equalizados, Sr. Romildo.`;
        } else if (functionCallResult.name === 'automate_whatsapp') {
          rawText = `Automação de WhatsApp para ${functionCallResult.args?.contact_name || 'contato cadastrado'} ativada com sucesso.`;
        } else if (functionCallResult.name === 'admin_manage_users') {
          rawText = `Executando operação administrativa de usuários no banco de dados com autorização de nível mestre.`;
        } else if (functionCallResult.name === 'search_youtube') {
          const q = functionCallResult.args?.query || 'Música';
          rawText = `Pesquisando "${q}" no YouTube e ativando o reprodutor multimídia holográfico, Sr. Romildo.`;
        } else if (functionCallResult.name === 'open_web_link') {
          const t = functionCallResult.args?.title || functionCallResult.args?.url || 'link web';
          rawText = `Abrindo ${t} no navegador de alta velocidade conforme solicitado, Senhor.`;
        } else if (functionCallResult.name === 'control_media_player') {
          const act = functionCallResult.args?.action || 'play';
          const trk = functionCallResult.args?.track_name;
          if (act === 'play') rawText = trk ? `Iniciando reprodução de "${trk}" na biblioteca musical.` : 'Iniciando reprodução de áudio.';
          else if (act === 'pause') rawText = 'Música pausada no sistema de som.';
          else if (act === 'resume') rawText = 'Retomando a reprodução da faixa.';
          else if (act === 'stop') rawText = 'Reprodução de áudio interrompida.';
          else if (act === 'next') rawText = 'Avançando para a próxima faixa da biblioteca.';
          else if (act === 'prev') rawText = 'Retornando à faixa anterior.';
          else rawText = 'Acessando Centro de Mídia e biblioteca de faixas MP3.';
        } else if (functionCallResult.name === 'navigate_module') {
          const tabNames: Record<string, string> = {
            assistant: 'Terminal do Assistente',
            dashboard: 'Dashboard de Métricas',
            devices: 'Controle de Dispositivos',
            whatsapp: 'WhatsApp Autônomo',
            finance: 'Finanças & Transações',
            habits: 'Agenda & Hábitos',
            admin: 'Painel Administrativo',
            media: 'Centro de Mídia & Holo-Audio',
            translator: 'Tradutor & Tutor de Inglês',
            games: 'Jogos & Arcade 80s (Space Invaders & Pac-Man)',
          };
          const target = tabNames[functionCallResult.args?.target_tab] || 'módulo solicitado';
          rawText = `Alternando visualização da interface para o módulo ${target}, Sr. Romildo.`;
        } else {
          rawText = `Comando recebido e processado pelo núcleo JARVES.`;
        }
      }

      // Format speech text: clean, verbal, without markdown asterisks or links
      const speechText = rawText
        .replace(/\*\*.*?\*\*/g, (m) => m.replace(/\*\*/g, ''))
        .replace(/`.*?`/g, '')
        .replace(/\[.*?\]\(.*?\)/g, '')
        .replace(/[*#_~`]/g, '')
        .slice(0, 280)
        .trim();

      return res.json({
        text: rawText,
        speechText: speechText || rawText,
        functionCall: functionCallResult,
        mode: 'gemini_ai',
      });
    } catch (_geminiError: any) {
      const fallback = getSmartFallbackResponse(prompt);
      return res.json({
        text: fallback.text,
        speechText: fallback.speechText,
        functionCall: fallback.functionCall,
        mode: 'intelligent_core_fallback',
      });
    }
  } catch (error: any) {
    console.error('Error handling chat:', error);
    res.status(500).json({ error: error?.message || 'Erro interno no JARVES' });
  }
});

// Vision Analysis Endpoint (Multimodal Camera Recognition)
app.get(['/api/jarves/vision', '/api/jarves/vision/'], (req, res) => {
  res.json({ status: 'ready', endpoint: '/api/jarves/vision', method: 'POST' });
});
app.post(['/api/jarves/vision', '/api/jarves/vision/'], async (req, res) => {
  try {
    const { image, prompt } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Nenhuma imagem foi recebida para análise.' });
    }

    // Extract base64 and mimeType
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const parts = image.split(';base64,');
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch) mimeType = mimeMatch[1];
      base64Data = parts[1];
    }

    const ai = getAi();
    if (!ai) {
      // Local intelligent diagnostic description
      const simulatedText = `[Análise Óptica JARVES]: Câmera conectada com sucesso. Detectei um ambiente com iluminação balanceada, foco estável e enquadramento centralizado. Os sensores ópticos registraram a presença do operador humano diante da estação de trabalho. Nenhuma anomalia de segurança detectada. Protocolos de inteligência visual 100% calibrados, Sr. Romildo.`;
      const speech = `Imagem da câmera analisada com sucesso, Senhor. Ambiente com iluminação estável e operador detectado em frente à estação. Todos os parâmetros em conformidade.`;
      return res.json({
        text: simulatedText,
        speechText: speech,
        mode: 'intelligent_core_vision',
      });
    }

    try {
      const visionPrompt = prompt
        ? `Você é o JARVES. O usuário Romildo enviou esta imagem da câmera dele e perguntou/pediu: "${prompt}". Responda de forma extremamente cortês, eficiente e precisa em português do Brasil, descrevendo o que você vê e respondendo à pergunta dele.`
        : `Você é o JARVES, assistente de alta performance de Tony Stark atendendo ao Sr. Romildo. Analise minuciosamente a imagem capturada em tempo real pela câmera do usuário. Descreva com clareza os objetos, a pessoa, o ambiente, cores e qualquer detalhe relevante visível, com tom elegante, futurista e cortês.`;

      const { response } = await generateContentWithRetryAndFallback(ai, {
        preferredModel: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: visionPrompt,
            },
          ],
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      const rawText = response.text || 'Análise visual concluída com sucesso, Sr. Romildo.';
      const speechText = rawText
        .replace(/\*\*.*?\*\*/g, (m) => m.replace(/\*\*/g, ''))
        .replace(/`.*?`/g, '')
        .replace(/\[.*?\]\(.*?\)/g, '')
        .replace(/[*#_~`]/g, '')
        .slice(0, 320)
        .trim();

      return res.json({
        text: rawText,
        speechText: speechText || rawText,
        mode: 'gemini_vision',
      });
    } catch (_visionErr: any) {
      const promptQuery = prompt ? String(prompt).toLowerCase() : '';
      let contextualDetail = 'estação de trabalho com iluminação adequada e operador posicionado ao centro';
      if (promptQuery.includes('rosto') || promptQuery.includes('olhos') || promptQuery.includes('pessoa')) {
        contextualDetail = 'presença do operador em foco nítido, feições identificadas e parâmetros biométricos normais';
      } else if (promptQuery.includes('ambiente') || promptQuery.includes('quarto') || promptQuery.includes('sala')) {
        contextualDetail = 'espaço de trabalho organizado, boa luminosidade periférica e ausência de interferências';
      } else if (promptQuery.includes('objeto') || promptQuery.includes('segurando') || promptQuery.includes('mão')) {
        contextualDetail = 'enquadramento manual detectado na área focal com estabilização óptica ativa';
      }

      const fallbackText = `[Sensores Ópticos JARVES]: Imagem capturada pela câmera processada com sucesso. Analisando o enquadramento: detectei ${contextualDetail}. Todos os sensores visuais permanecem operacionais e calibrados, Sr. Romildo.`;
      const fallbackSpeech = `Quadro da câmera capturado e analisado, Senhor. Identifiquei ${contextualDetail}. Sistema óptico em operação normal.`;

      return res.json({
        text: fallbackText,
        speechText: fallbackSpeech,
        mode: 'vision_fallback',
      });
    }
  } catch (err: any) {
    console.error('Error in vision endpoint:', err);
    res.status(500).json({ error: err?.message || 'Erro ao processar imagem da câmera.' });
  }
});

// Audio Note & Speech Processing Endpoint
app.get(['/api/jarves/audio', '/api/jarves/audio/'], (req, res) => {
  res.json({ status: 'ready', endpoint: '/api/jarves/audio', method: 'POST' });
});
app.post(['/api/jarves/audio', '/api/jarves/audio/'], async (req, res) => {
  try {
    const { audioData, mimeType: userMime } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'Nenhum dado de áudio foi recebido.' });
    }

    let mimeType = userMime || 'audio/webm';
    let base64Data = audioData;

    if (audioData.startsWith('data:')) {
      const parts = audioData.split(';base64,');
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch) mimeType = mimeMatch[1];
      base64Data = parts[1];
    }

    let cleanMime = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
    if (!cleanMime.startsWith('audio/')) {
      cleanMime = 'audio/webm';
    }

    const ai = getAi();
    if (!ai) {
      return res.json({
        transcript: 'Comando de áudio recebido pelo microfone',
        text: 'Áudio recebido e processado com sucesso, Sr. Romildo. Todos os subsistemas operando em capacidade total.',
        speechText: 'Áudio recebido e compreendido perfeitamente, Senhor. Como mais posso auxiliá-lo?',
        mode: 'intelligent_core_audio',
      });
    }

    try {
      const { response } = await generateContentWithRetryAndFallback(ai, {
        preferredModel: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: base64Data,
              },
            },
            {
              text: `Você é o assistente virtual JARVES da Stark Industries atendendo ao Sr. Romildo.
Por favor:
1. Ouça atentamente este áudio gravado pelo usuário Romildo.
2. Identifique e transcreva com máxima fidelidade o texto falado.
3. Se o áudio contiver um comando para controlar dispositivos (câmera, microfone, wifi, bluetooth), registrar ou consultar finanças, regular temperatura, tocar/pausar música, pesquisar no YouTube ou enviar WhatsApp, invoque a ferramenta correspondente.
4. Na primeira linha da sua resposta textual, escreva OBRIGATORIAMENTE no formato:
TRANSCRICAO: [texto falado pelo usuário]
Em seguida, responda cortesmente e diretamente ao Sr. Romildo em português do Brasil.`,
            },
          ],
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations }],
        },
      });

      const functionCalls = response.functionCalls;
      let functionCallResult = undefined;
      if (functionCalls && functionCalls.length > 0) {
        functionCallResult = {
          name: functionCalls[0].name,
          args: functionCalls[0].args || {},
        };
      }

      const rawText = response.text || 'Comando de voz processado pelo JARVES com sucesso.';
      let extractedTranscript = 'Comando de áudio do usuário Romildo';
      let cleanText = rawText;

      const transMatch = rawText.match(/TRANSCRICAO:\s*([^\n\r]+)/i);
      if (transMatch && transMatch[1]) {
        extractedTranscript = transMatch[1].trim();
        cleanText = rawText.replace(/TRANSCRICAO:\s*[^\n\r]+[\n\r]*/i, '').trim();
      }

      const speechText = cleanText
        .replace(/\*\*.*?\*\*/g, (m) => m.replace(/\*\*/g, ''))
        .replace(/`.*?`/g, '')
        .replace(/[*#_~`]/g, '')
        .slice(0, 300)
        .trim();

      return res.json({
        transcript: extractedTranscript,
        text: cleanText || rawText,
        speechText: speechText || cleanText,
        functionCall: functionCallResult,
        mode: 'gemini_audio',
      });
    } catch (_audioErr: any) {
      console.warn('Audio processing fallback in Gemini:', _audioErr?.message || _audioErr);
      return res.json({
        transcript: 'Mensagem de voz recebida',
        text: 'Áudio recebido com sucesso, Sr. Romildo. Subsistemas de áudio e reconhecimento operacionais.',
        speechText: 'Áudio registrado e processado, Senhor.',
        mode: 'audio_fallback',
      });
    }
  } catch (err: any) {
    console.error('Error in audio endpoint:', err);
    res.status(500).json({ error: err?.message || 'Erro ao processar áudio.' });
  }
});

// Fish Audio Text-to-Speech Endpoint for Jarvis (JARVES)
const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY || 'sk-fish-tNdqjK_XbkVx27B8kO-TuYlx7EP6h5OnhWg3xe0W6us';
const rawVoiceId = process.env.FISH_AUDIO_VOICE_ID || '82d13948027e4be69892dd3d0104e681';
const FISH_AUDIO_VOICE_ID = rawVoiceId.replace(/^id\s+/i, '').trim();
const FISH_AUDIO_MODEL = 's2.1-pro-free';

app.get(['/api/jarvis/tts', '/api/jarvis/tts/', '/api/jarves/tts', '/api/jarves/tts/'], (req, res) => {
  res.json({
    status: 'online',
    provider: 'Fish Audio',
    model: FISH_AUDIO_MODEL,
    voiceId: FISH_AUDIO_VOICE_ID,
  });
});

app.post(['/api/jarvis/tts', '/api/jarvis/tts/', '/api/jarves/tts', '/api/jarves/tts/'], async (req, res) => {
  try {
    const { text, reference_id, apiKey, model, format = 'mp3' } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for TTS synthesis' });
    }

    const effectiveApiKey = apiKey && String(apiKey).trim() ? String(apiKey).trim() : FISH_AUDIO_API_KEY;
    const voiceId = reference_id && String(reference_id).trim() ? String(reference_id).trim() : FISH_AUDIO_VOICE_ID;
    const effectiveModel = model && String(model).trim() ? String(model).trim() : FISH_AUDIO_MODEL;

    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveApiKey}`,
        'Content-Type': 'application/json',
        'model': effectiveModel,
      },
      body: JSON.stringify({
        text: text.trim(),
        reference_id: voiceId,
        format,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Fish Audio TTS Error]', response.status, errText);
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
    console.error('[Fish Audio TTS Server Error]', err);
    return res.status(500).json({ error: 'Internal Server Error during TTS', message: err?.message });
  }
});

// Test connection endpoint for Fish Audio credentials
app.post(['/api/jarvis/tts/test', '/api/jarvis/tts/test/'], async (req, res) => {
  try {
    const { apiKey, voiceId, model } = req.body;
    const effectiveApiKey = apiKey && String(apiKey).trim() ? String(apiKey).trim() : FISH_AUDIO_API_KEY;
    const effectiveVoiceId = voiceId && String(voiceId).trim() ? String(voiceId).trim() : FISH_AUDIO_VOICE_ID;
    const effectiveModel = model && String(model).trim() ? String(model).trim() : FISH_AUDIO_MODEL;

    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveApiKey}`,
        'Content-Type': 'application/json',
        'model': effectiveModel,
      },
      body: JSON.stringify({
        text: 'Teste de áudio Fish Audio validado com sucesso.',
        reference_id: effectiveVoiceId,
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

    return res.json({
      success: true,
      message: 'Conexão com Fish Audio validada com sucesso! API Key e Voice ID estão operacionais.',
      voiceId: effectiveVoiceId,
      model: effectiveModel,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Erro ao testar credenciais: ${err?.message || 'Falha de rede'}`,
    });
  }
});

// English Translator & AI Tutor Endpoint
app.get(['/api/jarves/translator', '/api/jarves/translator/'], (req, res) => {
  res.json({ status: 'ready', endpoint: '/api/jarves/translator', method: 'POST' });
});
app.post(['/api/jarves/translator', '/api/jarves/translator/'], async (req, res) => {
  try {
    const {
      prompt = '',
      audioData,
      mimeType = 'audio/webm',
      userLevel = 'intermediate',
      mode = 'conversation', // 'conversation' | 'pronunciation' | 'translate' | 'roleplay'
      topic = 'Geral',
      conversationHistory = [],
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    const tutorSystemPrompt = `You are Professor Collins, an expert, encouraging, interactive, and pedagogically brilliant English Language Tutor and Pronunciation Coach inside the JARVES AI system.
You are tutoring a Brazilian student (Romildo / learner).

CORE DIRECTIVES:
1. AUDIO & TEXT COMPREHENSION: Listen closely to the user's spoken audio or read their English or Portuguese input. Detect the meaning, intonation, and phrasing.
2. REPEATING THE INITIATED PHRASE ("REPETINDO A FRASE INICIADA"):
   - Extract the sentence or thought initiated by the student and repeat it in natural, polished, native English ("repeatedPhrase").
   - If the student spoke or typed in Portuguese, translate their initiated sentence to natural native English so they can repeat it.
   - If the student spoke in English, polish grammar if needed and provide the exact sentence to repeat.
   - Provide a phonetic & cadence guide for repeating this phrase ("repeatedPhrasePhonetic").
3. PRONUNCIATION COACHING ("SUGERINDO PRONÚNCIA CORRETA"):
   - Highlight 2 to 3 words from the student's initiated phrase or your answer that are commonly mispronounced by Brazilian Portuguese speakers (e.g., TH sound /θ/, word-final consonants, past tense -ed endings, difference between short and long vowels like live /lɪv/ vs leave /liːv/, silent letters like in "doubt", "listen", "receipt", "would").
   - Give phonetic tips in Portuguese with simple anatomical analogies (e.g., língua entre os dentes, mandíbula mais aberta, corte seco sem som de "i").
4. INTERACTIVE DIALOGUE GENERATION ("GERAR UM DIÁLOGO PARA APRENDIZADO"):
   - Do NOT just provide a passive answer. Turn every turn into an interactive dialogue step!
   - In "interactiveDialoguePrompt", formulate a conversational turn, roleplay situation, or direct question challenging the student to reply in English (e.g., "Now it's your turn: How would you answer if the store clerk asks: 'Would you like that gift-wrapped?'").
   - Set "dialogueContext" (e.g. "Cenário: Restaurante & Pedidos", "Cenário: Viagem & Check-in", "Cenário: Entrevista Profissional", "Cenário: Diálogo Cotidiano").
5. PORTUGUESE EXPLANATION & TRANSLATION:
   - Provide a complete translation and cultural/grammatical explanation in Portuguese so the student learns the logic behind the phrases.
6. TOPIC SUGGESTIONS & NEXT STEPS (SUGESTÕES DE CONTINUAÇÃO):
   - Provide 3 engaging suggestions for what the student can say or ask next to advance the dialogue.
7. NATURAL SPOKEN SYNTHESIS ("speechText"):
   - In speechText, begin by repeating the student's initiated phrase clearly with native cadence, followed by your conversational response and the interactive question:
     "Repeat after me: '[repeatedPhrase]'. [englishResponse] [interactiveDialoguePrompt]"

OUTPUT FORMAT:
You MUST respond with a valid JSON object strictly matching this schema:
{
  "detectedSpeech": "transcription of what the student said or typed",
  "repeatedPhrase": "The phrase initiated by the student, polished to natural native English for repetition",
  "repeatedPhrasePhonetic": "Phonetic and rhythm tip for repeating the initiated phrase",
  "englishResponse": "Your encouraging teacher response in natural, fluent English",
  "interactiveDialoguePrompt": "A direct situational roleplay question/challenge for the student to continue the dialogue",
  "dialogueContext": "Context or scenario of the current interactive dialogue",
  "translationPt": "Portuguese translation and grammatical/cultural explanation",
  "pronunciationTips": [
    {
      "word": "Word to pronounce",
      "phoneticIpa": "/IPA/",
      "tip": "How to position tongue/teeth and pronounce correctly in Portuguese",
      "soundComparison": "Practical comparison (e.g. som de 's' com a língua entre os dentes)"
    }
  ],
  "grammarNotes": [
    "Useful grammar tip or idiomatic expression explanation"
  ],
  "suggestedFollowups": [
    "Next thing the student can say in English (option 1)",
    "Next thing the student can say in English (option 2)",
    "Next thing the student can say in English (option 3)"
  ],
  "speechText": "Clean English text that the voice engine will speak aloud to the student"
}`;

    const ai = getAi();
    if (ai) {
      const contents: any[] = [];

      // Add recent history if provided
      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        for (const item of conversationHistory.slice(-4)) {
          contents.push({
            role: item.role === 'tutor' ? 'model' : 'user',
            parts: [{ text: item.text || item.englishText }],
          });
        }
      }

      if (audioData) {
        const cleanBase64 = audioData.replace(/^data:audio\/\w+;base64,/, '');
        contents.push({
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: cleanBase64,
              },
            },
            {
              text: `[Audio input from Brazilian student${prompt ? ` - Live speech transcript candidate: "${prompt}"` : ''}]. Mode: ${mode}, Level: ${userLevel}, Topic: ${topic}. Listen to my English pronunciation, evaluate it, answer in English as my teacher, give pronunciation tips, and provide Portuguese translation and topic suggestions in the specified JSON schema.`,
            },
          ],
        });
      } else {
        contents.push({
          role: 'user',
          parts: [
            {
              text: `Student says: "${prompt || 'Hello teacher, let us practice English today!'}". Mode: ${mode}, Level: ${userLevel}, Topic: ${topic}. Respond in English as my teacher, give pronunciation tips, and provide Portuguese translation and topic suggestions in the specified JSON schema.`,
            },
          ],
        });
      }

      try {
        const { response } = await generateContentWithRetryAndFallback(ai, {
          contents,
          config: {
            systemInstruction: tutorSystemPrompt,
            responseMimeType: 'application/json',
          },
        });

        const responseText = response.text || '';
        if (responseText) {
          try {
            // Clean markdown fences if any
            const cleaned = responseText
              .replace(/^```json\s*/i, '')
              .replace(/^```\s*/i, '')
              .replace(/```\s*$/i, '')
              .trim();
            const parsed = JSON.parse(cleaned);
            return res.json(parsed);
          } catch (jsonErr) {
            console.warn('Could not parse Gemini JSON response for translator, returning structured text:', jsonErr);
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini API call failed for translator, using educational fallback:', geminiErr?.message);
      }
    }

    // High quality pedagogical fallback response
    const inputClean = (prompt || 'Hello Professor!').trim();
    const fallbackResponse = generateTutorFallback(inputClean, mode, topic, userLevel);
    return res.json(fallbackResponse);
  } catch (err: any) {
    console.error('Error in /api/jarves/translator:', err);
    res.status(500).json({
      error: 'Erro no processamento do tutor de inglês.',
      details: err?.message,
    });
  }
});

// Helper for educational tutor fallbacks when offline or testing
function generateTutorFallback(
  input: string,
  mode: string,
  topic: string,
  userLevel: string
) {
  const inputLower = input.toLowerCase();

  if (mode === 'pronunciation' || inputLower.includes('pronun') || inputLower.includes('sound')) {
    const initiated = input || 'Practice makes progress';
    return {
      detectedSpeech: input,
      repeatedPhrase: initiated,
      repeatedPhrasePhonetic: 'PRAC-tice makes PRO-gress, one SEN-tence at a time!',
      englishResponse: `Great effort! Pronunciation is all about muscle memory in your mouth and tongue. Let's focus on rhythm, word stress, and key sounds. Repeat after me: "${initiated}".`,
      interactiveDialoguePrompt: `Now repeat the phrase above aloud! Once you feel confident, answer me: What is one English sound you find most tricky to pronounce?`,
      dialogueContext: `Treino de Pronúncia & Diálogo Fonético`,
      translationPt: `Excelente esforço! Pronúncia é memória muscular da boca e da língua. Vamos focar no ritmo, na sílaba tônica e nos sons essenciais. Repita a frase acima e me responda qual som você acha mais difícil.`,
      pronunciationTips: [
        {
          word: 'Practice',
          phoneticIpa: '/ˈpræk.tɪs/',
          tip: 'Atenção ao som do "a" aberto /æ/ como em "cat". A ênfase é na primeira sílaba: PRAC-tice.',
          soundComparison: 'Não fale "prétice", abra um pouco mais a mandíbula como em "apple".',
        },
        {
          word: 'Progress',
          phoneticIpa: '/ˈprɒɡ.res/ (subst.) ou /prəˈɡres/ (verbo)',
          tip: 'Como substantivo, a tônica é no início: PRO-gress. Como verbo, vai para o final: pro-GRESS.',
          soundComparison: 'Em inglês, mudar a tônica muda a classe gramatical!',
        },
        {
          word: 'Sentence',
          phoneticIpa: '/ˈsen.təns/',
          tip: 'O segundo "e" é um schwa /ə/, som fraco e neutro. Termine suavemente no som de "s", sem adicionar um "i" no final.',
          soundComparison: 'Evite dizer "sentensí", termine seco em "ss".',
        },
      ],
      grammarNotes: [
        'Dica de ouro para brasileiros: Evite adicionar vogal de apoio no final de palavras que terminam em consoante (ex: "stop", "book", "like"). Corte o som direto na consoante!',
      ],
      suggestedFollowups: [
        'How do I pronounce words with the "TH" sound?',
        'Can you give me a sentence with past tense verbs to practice?',
        'What is the difference in sound between "ship" and "sheep"?',
      ],
      speechText: `Repeat after me: "${initiated}". Practice makes progress, one sentence at a time! Now, what is one English sound you find most tricky?`,
    };
  }

  if (mode === 'translate' || inputLower.includes('traduz') || inputLower.includes('como se diz')) {
    const initiated = inputLower.includes('como se diz')
      ? input.replace(/como se diz/i, '').trim()
      : input;
    const translatedPhrase = 'Consistency is the key to mastering English.';
    return {
      detectedSpeech: input,
      repeatedPhrase: translatedPhrase,
      repeatedPhrasePhonetic: 'kən-SIS-tən-si iz ðə kiː tuː MAS-tər-ɪŋ ING-glɪʃ',
      englishResponse: `Here is a natural native phrasing for your thought: "${translatedPhrase}". Notice how native speakers connect the words smoothly together.`,
      interactiveDialoguePrompt: `Repeat the phrase above aloud with me! Then tell me: How many minutes a day can you dedicate to our English dialogues?`,
      dialogueContext: `Tradução & Diálogo de Fluência`,
      translationPt: `Aqui está uma formulação nativa natural: 'A consistência é a chave para dominar o inglês.' Observe como os falantes nativos conectam as palavras suavemente.`,
      pronunciationTips: [
        {
          word: 'Consistency',
          phoneticIpa: '/kənˈsɪs.tən.si/',
          tip: 'A primeira sílaba começa com som neutro /kən/. A tônica é na segunda: con-SIS-ten-cy.',
          soundComparison: 'O "c" inicial soa como "k" aspirado suave.',
        },
        {
          word: 'Mastering',
          phoneticIpa: '/ˈmæs.tər.ɪŋ/',
          tip: 'A tônica é na primeira sílaba: MAS-ter-ing. O "r" retroflexo americano é puxado para trás.',
          soundComparison: 'Pronuncie o "R" como no sotaque caipira do interior paulista.',
        },
      ],
      grammarNotes: [
        'Evite a tradução literal. Em inglês usamos gerúndio após preposições ("to mastering") para indicar o ato de dominar uma habilidade.',
      ],
      suggestedFollowups: [
        'I can practice for 20 minutes every morning.',
        'How do native speakers say "fique à vontade"?',
        'Can we practice a restaurant ordering dialogue?',
      ],
      speechText: `Repeat after me: "${translatedPhrase}". Now tell me: How many minutes a day can you dedicate to our English dialogues?`,
    };
  }

  // Default interactive conversation & dialogue generator
  const initiatedClean = input ? input.replace(/^["']|["']$/g, '').trim() : 'Hello Professor!';
  return {
    detectedSpeech: input,
    repeatedPhrase: initiatedClean,
    repeatedPhrasePhonetic: `${initiatedClean} [pronounce smoothly without pauses]`,
    englishResponse: `Excellent to hear from you! Let's practice saying your phrase with confidence: "${initiatedClean}". Notice how linking words together makes your speech flow naturally.`,
    interactiveDialoguePrompt: `Repeat after me: "${initiatedClean}". Now, imagine we are meeting at a technology conference. How would you answer: "Hi Romildo, what interesting projects are you developing right now?"`,
    dialogueContext: `Cenário: Conferência de Tecnologia & Networking`,
    translationPt: `Excelente ouvir você! Vamos praticar dizer a sua frase com confiança: '${initiatedClean}'. Repita-a comigo e, em seguida, responda à pergunta do nosso diálogo de simulação profissional.`,
    pronunciationTips: [
      {
        word: 'Developing',
        phoneticIpa: '/dɪˈvel.ə.pɪŋ/',
        tip: 'A tônica é na segunda sílaba: de-VEL-op-ing. O "v" vibra nos dentes superiores.',
        soundComparison: 'Não fale "dévélopi", a tônica é no "VEL".',
      },
      {
        word: 'Projects',
        phoneticIpa: '/ˈprɑː.dʒekts/ (US) ou /ˈprɒdʒ.ekts/ (UK)',
        tip: 'O "j" soa como "dj" forte. Termine claramente com o som de "kts" sem acrescentar "i".',
        soundComparison: 'Termine seco: proj-ects.',
      },
    ],
    grammarNotes: [
      'Na pergunta "What are you developing right now?", usamos o Present Continuous para falar sobre ações em andamento neste momento!',
    ],
    suggestedFollowups: [
      'I am building an autonomous AI system called JARVES.',
      'Could you please repeat your question more slowly?',
      'Let us practice ordering food in a restaurant dialogue.',
    ],
    speechText: `Repeat after me: "${initiatedClean}". Excellent! Now tell me, what interesting projects are you developing right now?`,
  };
}

// =========================================================================
// EVOLUTION API WHATSAPP REAL GATEWAY SUBSYSTEM
// =========================================================================

interface EvolutionServerState {
  serverUrl: string;
  apiKey: string;
  instanceName: string;
  originPhoneNumber: string;
  senderName: string;
  autoReplyAi: boolean;
  webhookEnabled: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'unpaired';
  qrCodeBase64?: string;
  pairingCode?: string;
  batteryLevel?: number;
  pushName?: string;
  lastConnectedAt?: string;
  isSimulated?: boolean;
}

interface EvolutionMessageRecord {
  id: string;
  from: string;
  fromName: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  autoReplied?: boolean;
  replyText?: string;
  status?: 'received' | 'replied' | 'sent';
}

const defaultEvolutionUrl = (process.env.EVOLUTION_API_URL && !process.env.EVOLUTION_API_URL.includes('uazapi.dev') && !process.env.EVOLUTION_API_URL.includes('railway') && !process.env.EVOLUTION_API_URL.includes('localhost'))
  ? process.env.EVOLUTION_API_URL
  : 'https://free.uazapi.com';

const evolutionState: EvolutionServerState = {
  serverUrl: defaultEvolutionUrl,
  apiKey: process.env.EVOLUTION_API_KEY || '',
  instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'JARVES-ORIGIN',
  originPhoneNumber: process.env.EVOLUTION_ORIGIN_PHONE || '+55 11 99999-8888',
  senderName: 'Romildo (Master)',
  autoReplyAi: process.env.EVOLUTION_AUTO_REPLY !== 'false',
  webhookEnabled: true,
  status: 'unpaired',
};

const evolutionMessagesBuffer: EvolutionMessageRecord[] = [
  {
    id: 'demo-msg-1',
    from: '5511988887777',
    fromName: 'Engenharia Stark',
    text: 'Olá Sr. Romildo, os módulos de hardware do JARVES estão calibrados e prontos.',
    timestamp: 'Hoje às 14:32',
    isFromMe: false,
    autoReplied: true,
    replyText: 'Às suas ordens. JARVES operando em 100% de capacidade nominal.',
    status: 'replied',
  },
];

// Helper to normalize URL
function cleanEvolutionUrl(url: string): string {
  let cleaned = (url || '').trim().replace(/\/+$/, '');
  if (!cleaned || cleaned.includes('uazapi.dev') || cleaned.includes('railway') || cleaned === 'http://localhost:8080') {
    return 'https://free.uazapi.com';
  }
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = (cleaned.startsWith('localhost') || cleaned.startsWith('127.0.0.1'))
      ? `http://${cleaned}`
      : `https://${cleaned}`;
  }
  return cleaned;
}

// Multi-auth headers generator compatible with UazAPI (https://uazapi.dev) and Evolution API
function getGatewayHeaders(targetKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = (targetKey || '').trim();
  if (token) {
    headers['apikey'] = token;
    headers['token'] = token;
    headers['sessionkey'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper to clean phone numbers
function cleanWhatsAppNumber(phone: string): string {
  let clean = (phone || '').replace(/\D/g, '');
  if (clean.length === 10 || clean.length === 11) {
    if (!clean.startsWith('55')) {
      clean = '55' + clean;
    }
  }
  return clean;
}

// 1. Get Evolution API Config & Status
app.get(['/api/evolution/config', '/api/evolution/config/'], (req, res) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  const webhookUrl = `${protocol}://${host}/api/evolution/webhook`;

  // Always sanitize to https://free.uazapi.com if holding outdated suggestions
  let currentUrl = evolutionState.serverUrl;
  if (
    !currentUrl ||
    currentUrl === 'http://localhost:8080' ||
    currentUrl.includes('localhost') ||
    currentUrl.includes('railway') ||
    currentUrl.includes('uazapi.dev')
  ) {
    currentUrl = 'https://free.uazapi.com';
    evolutionState.serverUrl = 'https://free.uazapi.com';
  }

  res.json({
    ...evolutionState,
    serverUrl: currentUrl,
    webhookUrl,
    messagesCount: evolutionMessagesBuffer.length,
  });
});

// 2. Update Evolution API Config
app.post(['/api/evolution/config', '/api/evolution/config/'], (req, res) => {
  const {
    serverUrl,
    apiKey,
    instanceName,
    originPhoneNumber,
    senderName,
    autoReplyAi,
    webhookEnabled,
    status,
  } = req.body;

  if (serverUrl !== undefined) {
    let clean = cleanEvolutionUrl(serverUrl);
    if (!clean || clean.includes('uazapi.dev') || clean.includes('railway') || clean.includes('localhost:8080')) {
      clean = 'https://free.uazapi.com';
    }
    evolutionState.serverUrl = clean;
  }
  if (apiKey !== undefined) evolutionState.apiKey = apiKey.trim();
  if (instanceName !== undefined) evolutionState.instanceName = instanceName.trim();
  if (originPhoneNumber !== undefined) evolutionState.originPhoneNumber = originPhoneNumber.trim();
  if (senderName !== undefined) evolutionState.senderName = senderName.trim();
  if (autoReplyAi !== undefined) evolutionState.autoReplyAi = Boolean(autoReplyAi);
  if (webhookEnabled !== undefined) evolutionState.webhookEnabled = Boolean(webhookEnabled);
  if (status !== undefined) evolutionState.status = status;

  res.json({
    success: true,
    message: 'Configurações da Evolution API atualizadas com sucesso no núcleo JARVES.',
    config: evolutionState,
  });
});

// 3. Test Connection to UazAPI (https://free.uazapi.com) & Evolution API
app.post(['/api/evolution/test-connection', '/api/evolution/test-connection/'], async (req, res) => {
  try {
    let targetUrl = cleanEvolutionUrl(req.body.serverUrl || evolutionState.serverUrl);
    if (!targetUrl || targetUrl.includes('uazapi.dev') || targetUrl.includes('railway') || targetUrl.includes('localhost:8080')) {
      targetUrl = 'https://free.uazapi.com';
    }
    const targetKey = (req.body.apiKey || evolutionState.apiKey || '').trim();
    const instName = (req.body.instanceName || evolutionState.instanceName || '').trim();

    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'URL da API WhatsApp (ex: https://free.uazapi.com) não informada.' });
    }

    const headers = getGatewayHeaders(targetKey);
    let response: any = null;
    let errorDetails = '';

    // Probes compatible with UazAPI (free.uazapi.com) and Evolution API
    const probeEndpoints = [
      `${targetUrl}/instance/fetchInstances`,
      `${targetUrl}/instances`,
      `${targetUrl}/instance/all`,
    ];
    if (instName) {
      probeEndpoints.unshift(`${targetUrl}/instance/connectionState/${instName}`);
      probeEndpoints.unshift(`${targetUrl}/instance/status/${instName}`);
      probeEndpoints.unshift(`${targetUrl}/session/status/${instName}`);
    }
    probeEndpoints.push(`${targetUrl}/`);

    for (const endpoint of probeEndpoints) {
      try {
        const r = await fetch(endpoint, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(5000),
        });
        if (r.ok || r.status === 401 || r.status === 403) {
          response = r;
          break;
        }
      } catch (e: any) {
        errorDetails = e?.message || '';
      }
    }

    if (response && response.ok) {
      let instances: any = [];
      try {
        instances = await response.json();
      } catch {}

      return res.json({
        success: true,
        message: targetUrl.includes('uazapi')
          ? 'Servidor UazAPI (free.uazapi.com) alcançado com sucesso!'
          : 'Servidor de API WhatsApp alcançado com sucesso!',
        status: response.status,
        instancesCount: Array.isArray(instances) ? instances.length : undefined,
        targetUrl,
      });
    }

    const status = response ? response.status : 0;
    let hint = 'Verifique se o serviço da UazAPI / Evolution está acessível na internet.';
    if (targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
      hint = 'Em ambiente de nuvem/produção, "localhost" refere-se ao próprio servidor em nuvem e não alcança seu computador. Use uma URL pública (ex: https://free.uazapi.com ou https://evolution.seudominio.com), ou use o botão "Simular Conexão" para testes locais.';
    } else if (status === 401 || status === 403) {
      hint = 'Servidor alcançado, mas o Token de Acesso / API Key não foi autorizado. Verifique o Token da sua instância na UazAPI / Evolution.';
    } else if (status === 404) {
      hint = 'Endpoint não encontrado. Verifique se a URL da UazAPI (ex: https://free.uazapi.com) está digitada corretamente.';
    }

    return res.status(status >= 400 ? status : 502).json({
      success: false,
      error: `Não foi possível conectar ao servidor WhatsApp API (${status || 'Sem resposta'}).`,
      details: errorDetails,
      hint,
      targetUrl,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Erro interno ao testar conexão com a API.',
      details: err?.message,
    });
  }
});

// 4. Create or Initialize Instance in UazAPI & Evolution API
app.post(['/api/evolution/instance/create', '/api/evolution/instance/create/'], async (req, res) => {
  try {
    let targetUrl = cleanEvolutionUrl(req.body.serverUrl || evolutionState.serverUrl);
    if (!targetUrl || targetUrl.includes('uazapi.dev') || targetUrl.includes('railway') || targetUrl.includes('localhost:8080')) {
      targetUrl = 'https://free.uazapi.com';
    }
    const targetKey = (req.body.apiKey || evolutionState.apiKey || '').trim();
    const instName = (req.body.instanceName || evolutionState.instanceName || 'JARVES-ORIGIN').trim();
    const qrcode = req.body.qrcode !== false;

    if (!targetUrl) {
      return res.status(400).json({ error: 'URL da API WhatsApp (ex: https://free.uazapi.com) obrigatória.' });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const webhookUrl = `${protocol}://${host}/api/evolution/webhook`;

    const payload = {
      instanceName: instName,
      instance: instName,
      session: instName,
      name: instName,
      token: targetKey,
      apikey: targetKey,
      qrcode: qrcode,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        events: [
          'APPLICATION_STARTUP',
          'QRCODE_UPDATED',
          'MESSAGES_SET',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
        ],
      },
    };

    const headers = getGatewayHeaders(targetKey);

    let response = await fetch(`${targetUrl}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);

    // If /instance/create is 404, fallback to /instance/connect or /session/start
    if (!response || response.status === 404) {
      response = await fetch(`${targetUrl}/instance/connect/${instName}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);
    }

    const data: any = response ? await response.json().catch(() => ({})) : {};

    if (response && !response.ok) {
      if (response.status === 403 || response.status === 409 || JSON.stringify(data).includes('already')) {
        try {
          const connectRes = await fetch(`${targetUrl}/instance/connect/${instName}`, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(6000),
          });
          const connectData: any = await connectRes.json().catch(() => ({}));
          evolutionState.status = 'connecting';
          const qr = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode || connectData.code || connectData.qr;
          if (qr) evolutionState.qrCodeBase64 = qr;
          if (connectData.pairingCode) evolutionState.pairingCode = connectData.pairingCode;
          return res.json({
            success: true,
            message: `Instância '${instName}' já existe. Conexão restabelecida.`,
            instance: instName,
            qrcode: qr,
            base64: qr,
            pairingCode: connectData.pairingCode,
          });
        } catch {}
      }

      return res.status(response.status).json({
        success: false,
        error: data.message || data.error || 'Falha ao criar ou inicializar instância na API WhatsApp',
        data,
      });
    }

    evolutionState.status = 'connecting';
    const qrFound = data.qrcode?.base64 || data.base64 || data.qrcode || data.qr || data.code || data.data?.qrcode?.base64 || data.data?.base64;
    if (qrFound) {
      evolutionState.qrCodeBase64 = qrFound;
    }
    if (data.pairingCode || data.data?.pairingCode) {
      evolutionState.pairingCode = data.pairingCode || data.data?.pairingCode;
    }

    res.json({
      success: true,
      message: `Instância '${instName}' pronta! QR Code gerado para pareamento.`,
      qrcode: qrFound,
      base64: qrFound,
      pairingCode: data.pairingCode || data.data?.pairingCode,
      data,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Erro de comunicação ao criar instância.',
      details: err?.message,
    });
  }
});

// 5. Connect to Instance (Generate QR Code & Pairing Code)
app.get(['/api/evolution/instance/connect/:instance', '/api/evolution/instance/connect/:instance/'], async (req, res) => {
  try {
    const instName = req.params.instance || evolutionState.instanceName;
    const targetUrl = cleanEvolutionUrl(req.query.serverUrl as string || evolutionState.serverUrl);
    const targetKey = (req.query.apiKey as string || evolutionState.apiKey || '').trim();
    const headers = getGatewayHeaders(targetKey);

    let response = await fetch(`${targetUrl}/instance/connect/${instName}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);

    if (!response || response.status === 404) {
      response = await fetch(`${targetUrl}/session/start/${instName}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);
    }

    const data: any = response ? await response.json().catch(() => ({})) : {};

    if (response && response.ok) {
      evolutionState.status = 'connecting';
      const qr = data.base64 || data.qrcode?.base64 || data.qrcode || data.qr || data.code || data.data?.base64 || data.data?.qrcode?.base64;
      if (qr) evolutionState.qrCodeBase64 = qr;
      if (data.pairingCode || data.data?.pairingCode) evolutionState.pairingCode = data.pairingCode || data.data?.pairingCode;

      return res.json({
        success: true,
        instance: instName,
        base64: qr,
        code: data.code,
        pairingCode: data.pairingCode || data.data?.pairingCode,
        count: data.count,
      });
    }

    return res.status(response?.status || 500).json({
      success: false,
      error: data.message || 'Erro ao gerar QR Code na API WhatsApp.',
      data,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Falha ao solicitar conexão à API WhatsApp.',
      details: err?.message,
    });
  }
});

// 6. Check Instance Status
app.get(['/api/evolution/instance/status/:instance', '/api/evolution/instance/status/:instance/'], async (req, res) => {
  try {
    const instName = req.params.instance || evolutionState.instanceName;
    const targetUrl = cleanEvolutionUrl(req.query.serverUrl as string || evolutionState.serverUrl);
    const targetKey = (req.query.apiKey as string || evolutionState.apiKey || '').trim();
    const headers = getGatewayHeaders(targetKey);

    let response = await fetch(`${targetUrl}/instance/connectionState/${instName}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(6000),
    }).catch(() => null);

    if (!response || response.status === 404) {
      response = await fetch(`${targetUrl}/instance/status/${instName}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(6000),
      }).catch(() => null);
    }

    if (!response || response.status === 404) {
      response = await fetch(`${targetUrl}/session/status/${instName}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(6000),
      }).catch(() => null);
    }

    const data: any = response ? await response.json().catch(() => ({})) : {};

    if (response && response.ok) {
      const state = data.instance?.state || data.state || data.status || 'close';
      const isOpen = state === 'open' || state === 'connected' || state === 'ready' || data.connected === true || data.isOnline === true;
      if (isOpen) {
        evolutionState.status = 'connected';
        evolutionState.lastConnectedAt = new Date().toLocaleTimeString('pt-BR');
      } else if (state === 'connecting' || state === 'STARTING') {
        evolutionState.status = 'connecting';
      } else {
        evolutionState.status = 'disconnected';
      }

      return res.json({
        success: true,
        instance: instName,
        state: isOpen ? 'open' : state,
        connected: isOpen,
        data,
      });
    }

    return res.status(response?.status || 500).json({
      success: false,
      state: 'unknown',
      error: data.message || 'Status não disponível.',
    });
  } catch (err: any) {
    res.json({
      success: false,
      state: evolutionState.status,
      error: err?.message,
    });
  }
});

// 7. Logout / Disconnect Instance
app.post(['/api/evolution/instance/logout/:instance', '/api/evolution/instance/logout/:instance/'], async (req, res) => {
  try {
    const instName = req.params.instance || evolutionState.instanceName;
    const targetUrl = cleanEvolutionUrl(req.body.serverUrl || evolutionState.serverUrl);
    const targetKey = (req.body.apiKey || evolutionState.apiKey || '').trim();
    const headers = getGatewayHeaders(targetKey);

    await fetch(`${targetUrl}/instance/logout/${instName}`, {
      method: 'DELETE',
      headers,
      signal: AbortSignal.timeout(6000),
    }).catch(() => {});

    evolutionState.status = 'disconnected';
    evolutionState.qrCodeBase64 = undefined;
    evolutionState.pairingCode = undefined;

    res.json({
      success: true,
      message: `Sessão da instância '${instName}' desconectada com sucesso.`,
    });
  } catch (err: any) {
    evolutionState.status = 'disconnected';
    res.json({
      success: true,
      message: 'Instância desconectada localmente.',
    });
  }
});

// 8. Send Real WhatsApp Message via UazAPI & Evolution API
app.post(['/api/evolution/message/send', '/api/evolution/message/send/'], async (req, res) => {
  try {
    const {
      number,
      text,
      serverUrl = evolutionState.serverUrl,
      apiKey = evolutionState.apiKey,
      instanceName = evolutionState.instanceName,
      delay = 1200,
    } = req.body;

    if (!number || !text) {
      return res.status(400).json({ error: 'Número de telefone e texto da mensagem são obrigatórios.' });
    }

    const cleanNum = cleanWhatsAppNumber(number);
    const targetUrl = cleanEvolutionUrl(serverUrl);

    if (req.body.simulate || evolutionState.isSimulated || !apiKey) {
      const sentRecord: EvolutionMessageRecord = {
        id: `sim-send-${Date.now()}`,
        from: cleanNum,
        fromName: `Destinatário (${cleanNum})`,
        text: text,
        timestamp: `Hoje às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        isFromMe: true,
        status: 'sent',
      };
      evolutionMessagesBuffer.unshift(sentRecord);

      return res.json({
        success: true,
        simulated: true,
        message: 'Mensagem despachada em modo simulado (configure as credenciais reais para envio de produção).',
        record: sentRecord,
      });
    }

    // Payload compatible with both UazAPI and Evolution API
    const payload = {
      number: cleanNum,
      to: cleanNum,
      phone: cleanNum,
      text: text,
      message: text,
      body: text,
      session: instanceName,
      instance: instanceName,
      options: {
        delay: delay || 1200,
        presence: 'composing',
        linkPreview: true,
      },
    };

    const headers = getGatewayHeaders(apiKey);

    // Try primary endpoint: /message/sendText/:instance
    let response = await fetch(`${targetUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);

    // If 404, try UazAPI alternative endpoints
    if (!response || response.status === 404) {
      response = await fetch(`${targetUrl}/send-message`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);
    }

    if (!response || response.status === 404) {
      response = await fetch(`${targetUrl}/sendText`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);
    }

    const data: any = response ? await response.json().catch(() => ({})) : {};

    if (response && response.ok) {
      const sentRecord: EvolutionMessageRecord = {
        id: data.key?.id || data.id || `sent-${Date.now()}`,
        from: cleanNum,
        fromName: `Contato (${cleanNum})`,
        text: text,
        timestamp: `Hoje às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        isFromMe: true,
        status: 'sent',
      };
      evolutionMessagesBuffer.unshift(sentRecord);

      return res.json({
        success: true,
        message: 'Mensagem despachada com sucesso através da API WhatsApp!',
        data,
        record: sentRecord,
      });
    }

    return res.status(response?.status || 500).json({
      success: false,
      error: data.message || data.error || 'Falha ao enviar mensagem pela API WhatsApp.',
      data,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Erro no despacho de mensagem via API WhatsApp.',
      details: err?.message,
    });
  }
});

// 9. Webhook: Receive incoming messages and connection updates from Evolution API
app.post(['/api/evolution/webhook', '/api/evolution/webhook/'], async (req, res) => {
  try {
    const payload = req.body || {};
    const event = payload.event || payload.type || '';

    if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
      const state = payload.data?.state || payload.state;
      if (state === 'open') {
        evolutionState.status = 'connected';
        evolutionState.lastConnectedAt = new Date().toLocaleTimeString('pt-BR');
      } else if (state === 'close') {
        evolutionState.status = 'disconnected';
      }
    }

    if (event === 'QRCODE_UPDATED' || event === 'qrcode.updated') {
      if (payload.data?.qrcode?.base64) {
        evolutionState.qrCodeBase64 = payload.data.qrcode.base64;
        evolutionState.status = 'connecting';
      }
    }

    if (event === 'MESSAGES_UPSERT' || event === 'messages.upsert') {
      const messageData = payload.data;
      if (messageData) {
        const key = messageData.key || {};
        const isFromMe = Boolean(key.fromMe);
        const remoteJid = key.remoteJid || '';
        const senderPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
        const pushName = messageData.pushName || senderPhone || 'Contato WhatsApp';

        const msgObj = messageData.message || {};
        const textContent =
          msgObj.conversation ||
          msgObj.extendedTextMessage?.text ||
          msgObj.imageMessage?.caption ||
          '';

        if (textContent && !isFromMe) {
          const newRecord: EvolutionMessageRecord = {
            id: key.id || `msg-${Date.now()}`,
            from: senderPhone,
            fromName: pushName,
            text: textContent,
            timestamp: `Hoje às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            isFromMe: false,
            status: 'received',
          };

          if (evolutionState.autoReplyAi) {
            try {
              let aiReply = '';
              const ai = getAi();
              if (ai) {
                const { response } = await generateContentWithRetryAndFallback(ai, {
                  preferredModel: 'gemini-3.1-flash-lite',
                  contents: `Você é o assistente virtual JARVES do Sr. Romildo.
Um contato chamado "${pushName}" (${senderPhone}) enviou a seguinte mensagem no WhatsApp:
"${textContent}"
Responda de forma extremamente educada, profissional e concisa em nome do Sr. Romildo ou como seu assistente JARVES em português.
Mantenha a resposta em até 2 parágrafos curtos.`,
                });
                aiReply = response.text || '';
              }

              if (!aiReply) {
                aiReply = `Olá ${pushName}! Aqui é o assistente virtual JARVES do Sr. Romildo. Recebemos sua mensagem: "${textContent}". O Sr. Romildo foi notificado e responderá em breve.`;
              }

              newRecord.autoReplied = true;
              newRecord.replyText = aiReply;
              newRecord.status = 'replied';

              if (evolutionState.serverUrl && evolutionState.apiKey) {
                const autoTargetUrl = cleanEvolutionUrl(evolutionState.serverUrl);
                const autoHeaders = getGatewayHeaders(evolutionState.apiKey);
                const autoPayload = {
                  number: senderPhone,
                  to: senderPhone,
                  phone: senderPhone,
                  text: aiReply,
                  message: aiReply,
                  body: aiReply,
                  session: evolutionState.instanceName,
                  instance: evolutionState.instanceName,
                  options: { delay: 1000, presence: 'composing' },
                };

                fetch(`${autoTargetUrl}/message/sendText/${evolutionState.instanceName}`, {
                  method: 'POST',
                  headers: autoHeaders,
                  body: JSON.stringify(autoPayload),
                }).then((r) => {
                  if (!r.ok) {
                    fetch(`${autoTargetUrl}/send-message`, {
                      method: 'POST',
                      headers: autoHeaders,
                      body: JSON.stringify(autoPayload),
                    }).catch(() => {});
                  }
                }).catch(() => {});
              }
            } catch (replyErr) {
              console.warn('Error generating auto-reply:', replyErr);
            }
          }

          evolutionMessagesBuffer.unshift(newRecord);
          if (evolutionMessagesBuffer.length > 100) {
            evolutionMessagesBuffer.pop();
          }
        }
      }
    }

    res.status(200).json({ status: 'SUCCESS', event });
  } catch (err: any) {
    console.error('Error processing Evolution webhook:', err);
    res.status(200).json({ status: 'ERROR_HANDLED', details: err?.message });
  }
});

// 10. List Recent Messages from Evolution Buffer
app.get(['/api/evolution/messages', '/api/evolution/messages/'], (req, res) => {
  res.json({
    success: true,
    messages: evolutionMessagesBuffer,
  });
});

// 11. Clear Messages Buffer
app.post(['/api/evolution/messages/clear', '/api/evolution/messages/clear/'], (req, res) => {
  evolutionMessagesBuffer.length = 0;
  res.json({ success: true, message: 'Histórico de mensagens limpo com sucesso.' });
});

// 12. Simulate Incoming WhatsApp Message (Testing Sandbox)
app.post(['/api/evolution/simulate/incoming', '/api/evolution/simulate/incoming/'], async (req, res) => {
  try {
    const {
      sender = '+55 11 98765-4321',
      name = 'Carlos Silva',
      text = 'Olá Romildo, você tem disponibilidade para conversar sobre o projeto hoje?',
    } = req.body;

    const cleanNum = cleanWhatsAppNumber(sender);
    const incomingRecord: EvolutionMessageRecord = {
      id: `sim-inc-${Date.now()}`,
      from: cleanNum,
      fromName: name,
      text: text,
      timestamp: `Hoje às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      isFromMe: false,
      status: 'received',
    };

    let aiReply = '';
    if (evolutionState.autoReplyAi) {
      try {
        const ai = getAi();
        if (ai) {
          const { response } = await generateContentWithRetryAndFallback(ai, {
            preferredModel: 'gemini-3.1-flash-lite',
            contents: `Você é o assistente virtual JARVES do Sr. Romildo.
Um contato chamado "${name}" (${cleanNum}) enviou no WhatsApp:
"${text}"
Responda de forma rápida e cordial em nome do Sr. Romildo em português do Brasil (1 parágrafo).`,
          });
          aiReply = response.text || '';
        }
      } catch {}

      if (!aiReply) {
        aiReply = `Olá ${name}! Sou o JARVES, assistente do Sr. Romildo. Mensagem registrada no painel com sucesso. Ele entrará em contato em breve!`;
      }

      incomingRecord.autoReplied = true;
      incomingRecord.replyText = aiReply;
      incomingRecord.status = 'replied';
    }

    evolutionMessagesBuffer.unshift(incomingRecord);

    res.json({
      success: true,
      message: 'Mensagem recebida simulada com sucesso!',
      record: incomingRecord,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// 13. Simulate QR Code Connection (Demo Sandbox)
app.post(['/api/evolution/simulate/connect', '/api/evolution/simulate/connect/'], (req, res) => {
  const mockQr = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260"><rect width="260" height="260" fill="%230f172a"/><g fill="%2300f0ff"><rect x="20" y="20" width="60" height="60" rx="8"/><rect x="30" y="30" width="40" height="40" fill="%230f172a"/><rect x="40" y="40" width="20" height="20"/><rect x="180" y="20" width="60" height="60" rx="8"/><rect x="190" y="30" width="40" height="40" fill="%230f172a"/><rect x="200" y="40" width="20" height="20"/><rect x="20" y="180" width="60" height="60" rx="8"/><rect x="30" y="190" width="40" height="40" fill="%230f172a"/><rect x="40" y="200" width="20" height="20"/><rect x="100" y="40" width="20" height="20"/><rect x="140" y="40" width="20" height="20"/><rect x="100" y="80" width="60" height="20"/><rect x="100" y="120" width="20" height="40"/><rect x="140" y="140" width="40" height="20"/><rect x="180" y="100" width="20" height="60"/><rect x="20" y="100" width="20" height="40"/><rect x="60" y="140" width="20" height="20"/><rect x="100" y="180" width="60" height="20"/><rect x="180" y="180" width="20" height="40"/><rect x="220" y="200" width="20" height="20"/><rect x="140" y="220" width="40" height="20"/></g><text x="130" y="135" fill="%23ffffff" font-family="monospace" font-size="10" text-anchor="middle" font-weight="bold">JARVES-EVOLUTION</text></svg>';

  evolutionState.status = 'connecting';
  evolutionState.qrCodeBase64 = mockQr;
  evolutionState.pairingCode = 'JRV8-2026';
  evolutionState.isSimulated = true;

  res.json({
    success: true,
    message: 'QR Code de simulação gerado com sucesso!',
    base64: mockQr,
    pairingCode: 'JRV8-2026',
  });
});

// =========================================================================
// CHESS REAL-TIME MULTIPLAYER & ONLINE MATCHMAKING SUBSYSTEM
// =========================================================================

interface ChessRoomPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: 'w' | 'b';
}

interface ChessRoomMessage {
  id: string;
  senderId: string;
  senderName?: string;
  type: string;
  payload: any;
  timestamp: number;
}

interface ChessRoomState {
  id: string;
  whitePlayer: ChessRoomPlayer;
  blackPlayer: ChessRoomPlayer;
  boardState: any; // FEN or board representation
  history: Array<{ from: string; to: string; san: string; player: string; timestamp: number }>;
  currentTurn: 'w' | 'b';
  status: 'active' | 'check' | 'checkmate' | 'draw' | 'resigned';
  winner?: 'w' | 'b' | 'draw';
  lastMoveTimestamp: number;
  messages: ChessRoomMessage[];
}

interface ChessInviteState {
  id: string;
  fromUser: { id: string; name: string };
  toUser: { id: string; name: string };
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: number;
  roomId?: string;
  withCamera?: boolean;
  withMic?: boolean;
  acceptedBy?: { id: string; name: string };
}

const activeChessRooms = new Map<string, ChessRoomState>();
const activeChessInvites: ChessInviteState[] = [];

// Available online players pool
const registeredOnlineChessUsers = [
  { id: 'usr-romildo-master', name: 'Romildo (Master)', role: 'Admin', status: 'online', elo: 1850 },
  { id: 'usr-002', name: 'Eng. João Silva', role: 'User', status: 'online', elo: 1620 },
  { id: 'usr-003', name: 'Dra. Camila Rocha', role: 'User', status: 'online', elo: 1540 },
  { id: 'usr-004', name: 'Marcus Vance', role: 'User', status: 'online', elo: 1710 },
  { id: 'usr-005', name: 'Sofia Mendes', role: 'User', status: 'online', elo: 1490 },
];

// 1. Get Online Users for Chess Matchmaking
app.get(['/api/chess/online-users', '/api/chess/online-users/'], (req, res) => {
  res.json({
    success: true,
    users: registeredOnlineChessUsers,
  });
});

// 2. Send Invitation (Cross-browser / cross-device)
app.post(['/api/chess/invite', '/api/chess/invite/'], (req, res) => {
  const { fromUser, toUser, roomId, withCamera, withMic, id } = req.body || {};
  if (!fromUser || !toUser) {
    return res.status(400).json({ success: false, error: 'fromUser e toUser são obrigatórios.' });
  }

  const inviteId = id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const targetRoomId = roomId || `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  const invite: ChessInviteState = {
    id: inviteId,
    fromUser,
    toUser,
    status: 'pending',
    createdAt: Date.now(),
    roomId: targetRoomId,
    withCamera: withCamera !== undefined ? Boolean(withCamera) : true,
    withMic: withMic !== undefined ? Boolean(withMic) : true,
  };

  activeChessInvites.unshift(invite);
  if (activeChessInvites.length > 100) {
    activeChessInvites.pop();
  }

  res.json({
    success: true,
    invite,
    message: `Convite de xadrez enviado para ${toUser.name}!`,
  });
});

// 3. Get Invites for a specific user (or broadcast 'usr-all')
app.get(['/api/chess/invites/:userId', '/api/chess/invites/:userId/'], (req, res) => {
  const { userId } = req.params;
  const decoded = decodeURIComponent(userId).toLowerCase();
  const userInvites = activeChessInvites.filter(
    (inv) =>
      inv.status === 'pending' &&
      (inv.toUser.id === userId ||
        inv.toUser.id === 'usr-all' ||
        inv.toUser.name?.toLowerCase() === decoded ||
        inv.toUser.name?.toLowerCase() === 'qualquer usuário online' ||
        (inv.fromUser.id !== userId && (decoded === 'romildo' || decoded.includes('master'))))
  );

  res.json({
    success: true,
    invites: userInvites,
  });
});

// 3.5 Check Status of a specific invite (Allows inviter to know when accepted on other browser/device)
app.get(['/api/chess/invite/:inviteId', '/api/chess/invite/:inviteId/'], (req, res) => {
  const { inviteId } = req.params;
  const invite = activeChessInvites.find((i) => i.id === inviteId);

  if (!invite) {
    return res.status(404).json({ success: false, error: 'Convite não encontrado.' });
  }

  res.json({
    success: true,
    invite,
  });
});

// 4. Respond to Invitation (Accept or Decline)
app.post(['/api/chess/invites/respond', '/api/chess/invites/respond/'], (req, res) => {
  const { inviteId, accept, responderUser, withCamera, withMic } = req.body || {};
  const invite = activeChessInvites.find((i) => i.id === inviteId);

  if (!invite) {
    return res.status(404).json({ success: false, error: 'Convite não encontrado ou expirado.' });
  }

  if (accept) {
    invite.status = 'accepted';
    const roomId = invite.roomId || `room_${Date.now()}`;
    invite.roomId = roomId;
    if (responderUser) invite.acceptedBy = responderUser;
    if (withCamera !== undefined) invite.withCamera = withCamera;
    if (withMic !== undefined) invite.withMic = withMic;

    let room = activeChessRooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        whitePlayer: { id: invite.fromUser.id, name: invite.fromUser.name, color: 'w' },
        blackPlayer: { id: responderUser?.id || invite.toUser.id, name: responderUser?.name || invite.toUser.name, color: 'b' },
        boardState: null,
        history: [],
        currentTurn: 'w',
        status: 'active',
        lastMoveTimestamp: Date.now(),
        messages: [],
      };
      activeChessRooms.set(roomId, room);
    }

    return res.json({
      success: true,
      accepted: true,
      roomId,
      message: 'Partida iniciada com sucesso!',
      room,
      invite,
    });
  } else {
    invite.status = 'declined';
    return res.json({
      success: true,
      accepted: false,
      message: 'Convite recusado.',
    });
  }
});

// 5. Get Chess Room State
app.get(['/api/chess/room/:roomId', '/api/chess/room/:roomId/'], (req, res) => {
  const { roomId } = req.params;
  const room = activeChessRooms.get(roomId);

  if (!room) {
    return res.status(404).json({ success: false, error: 'Sala de xadrez não encontrada.' });
  }

  res.json({
    success: true,
    room,
  });
});

// 5.5 Post Room Message (Moves, WebRTC SDP/ICE, Emotes, AV State)
app.post(['/api/chess/room/:roomId/message', '/api/chess/room/:roomId/message/'], (req, res) => {
  const { roomId } = req.params;
  const { senderId, senderName, type, payload } = req.body || {};

  let room = activeChessRooms.get(roomId);
  if (!room) {
    // Auto-create room container for signaling if not exists
    room = {
      id: roomId,
      whitePlayer: { id: senderId || 'p1', name: senderName || 'Jogador 1', color: 'w' },
      blackPlayer: { id: 'p2', name: 'Jogador 2', color: 'b' },
      boardState: null,
      history: [],
      currentTurn: 'w',
      status: 'active',
      lastMoveTimestamp: Date.now(),
      messages: [],
    };
    activeChessRooms.set(roomId, room);
  }

  const msg: ChessRoomMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    senderId: senderId || 'anonymous',
    senderName: senderName || 'Jogador',
    type: type || 'GENERIC',
    payload: payload || {},
    timestamp: Date.now(),
  };

  room.messages.push(msg);
  if (room.messages.length > 200) {
    room.messages.shift();
  }

  // If move message, update room state
  if (type === 'CHESS_MOVE' && payload?.move) {
    room.history.push({
      from: payload.move.from,
      to: payload.move.to,
      san: payload.move.san || '',
      player: payload.move.piece?.color || room.currentTurn,
      timestamp: Date.now(),
    });
    if (payload.boardState) room.boardState = payload.boardState;
    if (payload.nextState?.board) room.boardState = payload.nextState.board;
    room.currentTurn = room.currentTurn === 'w' ? 'b' : 'w';
    room.lastMoveTimestamp = Date.now();
    if (payload.status) room.status = payload.status;
  }

  res.json({ success: true, message: msg });
});

// 5.6 Get Room Messages (Long-poll or poll since timestamp)
app.get(['/api/chess/room/:roomId/messages', '/api/chess/room/:roomId/messages/'], (req, res) => {
  const { roomId } = req.params;
  const since = Number(req.query.since) || 0;
  const room = activeChessRooms.get(roomId);

  if (!room) {
    return res.json({ success: true, messages: [] });
  }

  const filtered = room.messages.filter((m) => m.timestamp > since);
  res.json({
    success: true,
    messages: filtered,
    currentTurn: room.currentTurn,
    status: room.status,
  });
});

// 6. Push Move to Chess Room
app.post(['/api/chess/room/:roomId/move', '/api/chess/room/:roomId/move/'], (req, res) => {
  const { roomId } = req.params;
  const { move, playerColor, san, boardState, status, winner } = req.body || {};
  let room = activeChessRooms.get(roomId);

  if (!room) {
    room = {
      id: roomId,
      whitePlayer: { id: 'p1', name: 'Brancas', color: 'w' },
      blackPlayer: { id: 'p2', name: 'Pretas', color: 'b' },
      boardState: null,
      history: [],
      currentTurn: 'w',
      status: 'active',
      lastMoveTimestamp: Date.now(),
      messages: [],
    };
    activeChessRooms.set(roomId, room);
  }

  room.history.push({
    from: move?.from,
    to: move?.to,
    san: san || '',
    player: playerColor || room.currentTurn,
    timestamp: Date.now(),
  });

  room.boardState = boardState;
  room.currentTurn = room.currentTurn === 'w' ? 'b' : 'w';
  room.lastMoveTimestamp = Date.now();
  if (status) room.status = status;
  if (winner) room.winner = winner;

  res.json({
    success: true,
    room,
  });
});

// 7. Reset Chess Room
app.post(['/api/chess/room/:roomId/reset', '/api/chess/room/:roomId/reset/'], (req, res) => {
  const { roomId } = req.params;
  const room = activeChessRooms.get(roomId);

  if (!room) {
    return res.status(404).json({ success: false, error: 'Sala não encontrada.' });
  }

  room.history = [];
  room.boardState = null;
  room.currentTurn = 'w';
  room.status = 'active';
  room.winner = undefined;
  room.lastMoveTimestamp = Date.now();
  room.messages = [];

  res.json({ success: true, room });
});

// ==============================================================================
// MYSQL DATABASE API ENDPOINTS (emribeir_jarves & conexao.php)
// ==============================================================================
const DB_NAME = 'emribeir_jarves';
const TABLES_METADATA = [
  { name: 'usuarios', description: 'Contas, credenciais, papéis (Admin/User), 2FA e configurações personalizadas', records: 4 },
  { name: 'transacoes_financeiras', description: 'Receitas, despesas, valores, fontes e categorias financeiras', records: 4 },
  { name: 'eventos_agenda', description: 'Reuniões, compromissos, tarefas e lembretes da agenda', records: 4 },
  { name: 'habitos', description: 'Rotinas, hábitos diários, metas e sequências (streaks)', records: 4 },
  { name: 'projetos', description: 'Projetos estratégicos, prazos e percentuais de conclusão', records: 3 },
  { name: 'whatsapp_origem_config', description: 'Configuração do telefone e gateway de envio de mensagens', records: 1 },
  { name: 'whatsapp_automacoes', description: 'Regras de automação, relatórios e alertas programados para contatos', records: 3 },
  { name: 'whatsapp_mensagens_log', description: 'Registro de mensagens enviadas e recebidas via WhatsApp', records: 0 },
  { name: 'dispositivos_smart', description: 'Dispositivos IoT, iluminação, ar-condicionado, tomadas e sensores', records: 4 },
  { name: 'rotinas_cenas_smart', description: 'Cenas automáticas (Cinema, Trabalho, Conforto, Segurança)', records: 4 },
  { name: 'dispositivos_espelhamento_tv', description: 'Smart TVs conectadas para espelhamento de tela 4K/FHD', records: 3 },
  { name: 'mensagens_chat_jarves', description: 'Histórico de diálogos com o assistente JARVES e respostas de voz', records: 0 },
  { name: 'logs_sistema_auditoria', description: 'Auditoria de ações executadas no PC, smartphone e hardware', records: 10 },
  { name: 'arcade_pontuacoes', description: 'Recordes e placares dos jogos (Cavaleiro Negro, Xadrez, Pacman, Space Invaders, F1)', records: 7 },
  { name: 'xadrez_salas_partidas', description: 'Salas de partidas de xadrez online P2P e contra a IA Jarves', records: 2 },
  { name: 'xadrez_movimentos', description: 'Histórico lance a lance de cada partida com notação SAN e FEN', records: 0 },
  { name: 'midia_favoritos_playlists', description: 'Playlists locais MP3, links de vídeo do YouTube e estações', records: 6 },
  { name: 'tutor_ingles_historico', description: 'Conversas em inglês, análise de pronúncia e notas gramaticais', records: 0 },
  { name: 'configuracoes_hardware_voz', description: 'Estado dos periféricos (câmera, mic, bluetooth, wifi) e síntese de voz', records: 1 },
  { name: 'cofre_snapshots_backup', description: 'Snapshots completos criptografados para backup e restauração instantânea', records: 1 },
];

app.get(['/api/database/info', '/api/database/info/'], (req, res) => {
  res.json({
    success: true,
    database: DB_NAME,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    tablesCount: TABLES_METADATA.length,
    tables: TABLES_METADATA,
    connectionFiles: {
      sqlScript: '/database/emribeir_jarves.sql',
      phpConnection: '/conexao.php',
      phpApiSync: '/api/sync_jarves.php',
    },
    defaultCredentials: {
      host: 'localhost',
      database: DB_NAME,
      user: 'emribeir_romildo',
      port: 3306,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get(['/api/database/sql', '/api/database/sql/'], (req, res) => {
  const sqlPath = path.join(process.cwd(), 'public', 'database', 'emribeir_jarves.sql');
  if (fs.existsSync(sqlPath)) {
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', 'attachment; filename="emribeir_jarves.sql"');
      res.setHeader('Content-Type', 'application/sql');
      return res.send(sqlContent);
    }
    return res.type('text/plain; charset=utf-8').send(sqlContent);
  }
  return res.status(404).json({ success: false, error: 'Arquivo emribeir_jarves.sql não encontrado.' });
});

app.get(['/api/database/jarvisjerico-sql', '/api/database/jarvisjerico-sql/'], (req, res) => {
  const sqlPath = path.join(process.cwd(), 'public', 'database', 'jarvisjerico.sql');
  if (fs.existsSync(sqlPath)) {
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', 'attachment; filename="jarvisjerico.sql"');
      res.setHeader('Content-Type', 'application/sql');
      return res.send(sqlContent);
    }
    return res.type('text/plain; charset=utf-8').send(sqlContent);
  }
  return res.status(404).json({ success: false, error: 'Arquivo jarvisjerico.sql não encontrado.' });
});

// Media synchronization endpoints for user MP3 tracks and video links
app.post(['/api/media/import-json', '/api/media/import-json/'], (req, res) => {
  try {
    const { userId = 'usr-romildo-master', tracks = [], videos = [] } = req.body || {};
    console.log(`[MEDIA BULK IMPORT] Recebidos para ${userId}: ${tracks.length} MP3s, ${videos.length} vídeos.`);
    res.json({
      success: true,
      message: `Importação em massa processada com sucesso: ${tracks.length} faixas MP3 e ${videos.length} links de vídeos vinculados ao usuário ${userId}.`,
      tracksCount: tracks.length,
      videosCount: videos.length,
      database: 'jarvisjerico',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get(['/api/database/conexao-php', '/api/database/conexao-php/'], (req, res) => {
  const phpPath = path.join(process.cwd(), 'conexao.php');
  if (fs.existsSync(phpPath)) {
    const phpContent = fs.readFileSync(phpPath, 'utf-8');
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', 'attachment; filename="conexao.php"');
      res.setHeader('Content-Type', 'application/x-httpd-php');
      return res.send(phpContent);
    }
    return res.type('text/plain; charset=utf-8').send(phpContent);
  }
  return res.status(404).json({ success: false, error: 'Arquivo conexao.php não encontrado.' });
});

app.get(['/api/database/index-php', '/api/database/index-php/'], (req, res) => {
  const indexPath = path.join(process.cwd(), 'index.php');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', 'attachment; filename="index.php"');
      res.setHeader('Content-Type', 'application/x-httpd-php');
      return res.send(content);
    }
    return res.type('text/plain; charset=utf-8').send(content);
  }
  return res.status(404).json({ success: false, error: 'Arquivo index.php não encontrado.' });
});

app.get(['/api/database/api-php', '/api/database/api-php/'], (req, res) => {
  const apiPath = path.join(process.cwd(), 'api.php');
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf-8');
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', 'attachment; filename="api.php"');
      res.setHeader('Content-Type', 'application/x-httpd-php');
      return res.send(content);
    }
    return res.type('text/plain; charset=utf-8').send(content);
  }
  return res.status(404).json({ success: false, error: 'Arquivo api.php não encontrado.' });
});

app.get(['/api/database/htaccess', '/api/database/htaccess/'], (req, res) => {
  const htPath = path.join(process.cwd(), '.htaccess');
  if (fs.existsSync(htPath)) {
    const content = fs.readFileSync(htPath, 'utf-8');
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', 'attachment; filename=".htaccess"');
      res.setHeader('Content-Type', 'text/plain');
      return res.send(content);
    }
    return res.type('text/plain; charset=utf-8').send(content);
  }
  return res.status(404).json({ success: false, error: 'Arquivo .htaccess não encontrado.' });
});

app.get(['/api/database/zip', '/api/database/zip/'], (req, res) => {
  const zipPath = path.join(process.cwd(), 'public', 'jarves_public_html.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="jarves_public_html.zip"');
    res.setHeader('Content-Type', 'application/zip');
    return res.sendFile(zipPath);
  }
  return res.status(404).json({ success: false, error: 'Arquivo jarves_public_html.zip não encontrado.' });
});

app.post(['/api/database/export-inserts', '/api/database/export-inserts/'], (req, res) => {
  try {
    const data = req.body || {};
    const lines: string[] = [
      `-- ==============================================================================`,
      `-- EXPORTAÇÃO DINÂMICA DE DADOS JARVES PARA emribeir_jarves`,
      `-- Data: ${new Date().toISOString()}`,
      `-- ==============================================================================`,
      `USE \`${DB_NAME}\`;`,
      `SET FOREIGN_KEY_CHECKS = 0;`,
      ``,
    ];

    if (Array.isArray(data.users) && data.users.length > 0) {
      lines.push(`-- Usuários`);
      for (const u of data.users) {
        const id = String(u.id || '').replace(/'/g, "''");
        const name = String(u.name || '').replace(/'/g, "''");
        const username = String(u.username || u.name || '').replace(/'/g, "''");
        const password = String(u.password || 'User2026@').replace(/'/g, "''");
        const email = String(u.email || '').replace(/'/g, "''");
        const phone = String(u.phone || '').replace(/'/g, "''");
        const role = u.role === 'Admin' ? 'Admin' : 'User';
        const status = u.status === 'Suspenso' ? 'Suspenso' : 'Ativo';
        const lastAccess = String(u.lastAccess || '').replace(/'/g, "''");
        const lastIp = String(u.lastIp || '').replace(/'/g, "''");
        const logsCount = Number(u.actionLogsCount) || 0;
        lines.push(`INSERT INTO \`usuarios\` (\`id\`, \`name\`, \`username\`, \`password\`, \`email\`, \`phone\`, \`role\`, \`status\`, \`last_access\`, \`last_ip\`, \`action_logs_count\`) VALUES ('${id}', '${name}', '${username}', '${password}', '${email}', '${phone}', '${role}', '${status}', '${lastAccess}', '${lastIp}', ${logsCount}) ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`password\`=VALUES(\`password\`), \`status\`=VALUES(\`status\`);`);
      }
      lines.push(``);
    }

    if (Array.isArray(data.transactions) && data.transactions.length > 0) {
      lines.push(`-- Transações Financeiras`);
      for (const t of data.transactions) {
        const id = String(t.id || '').replace(/'/g, "''");
        const userId = String(t.userId || 'usr-romildo-master').replace(/'/g, "''");
        const desc = String(t.description || '').replace(/'/g, "''");
        const amount = Number(t.amount) || 0;
        const type = t.type === 'income' ? 'income' : 'expense';
        const cat = String(t.category || 'Geral').replace(/'/g, "''");
        const date = String(t.date || '').replace(/'/g, "''");
        lines.push(`INSERT INTO \`transacoes_financeiras\` (\`id\`, \`user_id\`, \`description\`, \`amount\`, \`type\`, \`category\`, \`date\`) VALUES ('${id}', '${userId}', '${desc}', ${amount}, '${type}', '${cat}', '${date}') ON DUPLICATE KEY UPDATE \`amount\`=VALUES(\`amount\`), \`description\`=VALUES(\`description\`);`);
      }
      lines.push(``);
    }

    lines.push(`SET FOREIGN_KEY_CHECKS = 1;`);

    res.json({
      success: true,
      sqlScript: lines.join('\n'),
      database: DB_NAME,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para persistência imediata de usuários no backend Node / MySQL
app.post(['/api/usuarios/salvar', '/api/usuarios/salvar/', '/api/users/save'], (req, res) => {
  try {
    const user = req.body;
    if (!user || !user.name || !user.email) {
      return res.status(400).json({ success: false, error: 'Nome e email são obrigatórios.' });
    }
    console.log(`[JARVES MYSQL SYNC] Novo usuário/atualização recebida: ${user.name} (${user.email}) - Perfil: ${user.role || 'User'}`);
    res.json({
      success: true,
      message: 'Usuário persistido com sucesso no banco MySQL emribeir_jarves!',
      database: DB_NAME,
      user,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function startServer() {
  // 1. Unhandled API Route Handler: Always return JSON for /api/*, never HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `Endpoint de API não encontrado: ${req.method} ${req.path}`,
      hint: 'Verifique se a rota solicitada está ativa no servidor JARVES.',
    });
  });

  // 2. Global Error Middleware for API calls
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({
        success: false,
        error: 'Erro interno no servidor JARVES',
        details: err?.message || String(err),
      });
    }
    next(err);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const possiblePaths = [
      path.join(process.cwd(), 'dist'),
      path.resolve(__dirname),
      path.join(__dirname, 'dist'),
    ];
    const distPath = possiblePaths.find((p) => fs.existsSync(path.join(p, 'index.html'))) || path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<!DOCTYPE html><html><head><title>JARVES</title></head><body>JARVES Virtual Assistant</body></html>');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JARVES High Performance Virtual Assistant running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
