import React, { useState, useRef, useEffect } from 'react';
import {
  Languages,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  BookOpen,
  Headphones,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Play,
  Pause,
  ArrowRightLeft,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Compass,
  MessageSquare,
  Award,
  Sliders,
  RefreshCw,
  GraduationCap,
  Globe,
  Radio,
  ExternalLink,
  ChevronDown,
  Square,
  Lightbulb,
  Zap
} from 'lucide-react';
import { UserAccount, EnglishTutorMessage, PronunciationFeedback, ConversationTopic } from '../types';

interface TranslatorTutorPanelProps {
  currentUser: UserAccount;
  onAddLog: (action: string, category: string, details?: string) => void;
  onSaveSystem?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
}

const PRESET_TOPICS: ConversationTopic[] = [
  {
    id: 't-interview',
    title: 'Entrevista de Emprego',
    level: 'Intermediário',
    category: 'Trabalho',
    starterPrompt: 'Could you please introduce yourself and tell me about your background and experience?',
    starterPromptPt: 'Você poderia se apresentar e falar sobre sua trajetória e experiência?',
    iconName: 'briefcase',
  },
  {
    id: 't-travel',
    title: 'Viagem & Aeroporto',
    level: 'Iniciante',
    category: 'Viagem',
    starterPrompt: 'Excuse me, could you tell me where baggage claim and passport control are located?',
    starterPromptPt: 'Com licença, você poderia me informar onde fica a restituição de bagagem e o controle de passaportes?',
    iconName: 'plane',
  },
  {
    id: 't-coffee',
    title: 'Cafeteria & Restaurante',
    level: 'Iniciante',
    category: 'Cotidiano',
    starterPrompt: 'Hi! Could I please get a large black coffee and a warm croissant to take away?',
    starterPromptPt: 'Olá! Poderia me ver um café preto grande e um croissant quentinho para viagem?',
    iconName: 'coffee',
  },
  {
    id: 't-tech',
    title: 'Tecnologia, IA & Inovação',
    level: 'Avançado',
    category: 'Tecnologia',
    starterPrompt: 'How do you think generative AI and autonomous systems like JARVES will reshape real estate and productivity?',
    starterPromptPt: 'Como você acha que a IA generativa e sistemas autônomos como o JARVES vão remodelar o mercado imobiliário e a produtividade?',
    iconName: 'cpu',
  },
  {
    id: 't-smalltalk',
    title: 'Cotidiano & Small Talk',
    level: 'Iniciante',
    category: 'Cotidiano',
    starterPrompt: 'Nice weather we are having today, right? What are your plans for the upcoming weekend?',
    starterPromptPt: 'Tempo agradável hoje, não é? Quais são seus planos para o próximo fim de semana?',
    iconName: 'sun',
  },
  {
    id: 't-music',
    title: 'Cultura & Música Brasileira (MPB)',
    level: 'Intermediário',
    category: 'Cultura',
    starterPrompt: 'I love Brazilian music! Can you tell me why songs like Águas de Março and Carinhoso are so legendary?',
    starterPromptPt: 'Eu amo música brasileira! Você pode me contar por que canções como Águas de Março e Carinhoso são tão marcantes?',
    iconName: 'music',
  },
];

export const TranslatorTutorPanel: React.FC<TranslatorTutorPanelProps> = ({
  currentUser,
  onAddLog,
  onSaveSystem,
  isSaving,
  isDirty,
}) => {
  // Navigation sub-modes
  const [activeMode, setActiveMode] = useState<'conversation' | 'pronunciation' | 'translate' | 'roleplay'>('conversation');
  const [userLevel, setUserLevel] = useState<'Iniciante' | 'Intermediário' | 'Avançado'>('Intermediário');
  const [selectedAccent, setSelectedAccent] = useState<'en-US' | 'en-GB'>('en-US');
  const [speechRate, setSpeechRate] = useState<number>(1.0); // 0.8x, 1.0x, 1.2x
  const [autoSpeakTutor, setAutoSpeakTutor] = useState<boolean>(true);

  // Messages state
  const [messages, setMessages] = useState<EnglishTutorMessage[]>([
    {
      id: 'msg-init-1',
      sender: 'tutor',
      englishText: `Hello Romildo! I am your JARVES English Tutor and Pronunciation Coach. I can listen to your English audio, analyze your pronunciation, repeat your initiated phrases with native cadence, and guide our interactive dialogue step-by-step. What would you like to practice today?`,
      repeatedPhrase: 'I am ready to practice interactive English dialogues!',
      repeatedPhrasePhonetic: 'aɪ æm ˈred.i tuː ˈpræk.tɪs ˌɪn.tərˈæk.tɪv ˈɪŋ.ɡlɪʃ ˈdaɪ.ə.lɑːɡz',
      interactiveDialoguePrompt: `Repeat the phrase above to warm up your voice! Then tell me: What is your primary learning focus today: business meetings, international travel, or casual small talk?`,
      dialogueContext: `Diálogo Interativo Inicial & Boas-Vindas`,
      translationPt: `Olá Romildo! Eu sou o seu Tutor de Inglês e Treinador de Pronúncia do JARVES. Posso ouvir seus áudios em inglês, analisar sua pronúncia, repetir suas frases iniciadas com cadência nativa e conduzir diálogos interativos passo a passo. O que você gostaria de praticar hoje?`,
      pronunciationTips: [
        {
          word: 'Practice',
          phoneticIpa: '/ˈpræk.tɪs/',
          tip: 'Atenção ao som aberto da primeira sílaba: PRAC-tice. Não termine com som de "i".',
          soundComparison: 'Termine com som de "s" seco, sem adicionar "i".',
        },
        {
          word: 'Dialogue',
          phoneticIpa: '/ˈdaɪ.ə.lɑːɡ/ (US) ou /ˈdaɪ.ə.lɒɡ/ (UK)',
          tip: 'A primeira sílaba soa como "DIE". O "ue" final é mudo!',
          soundComparison: 'Diga "DAI-a-log", sem pronunciar "guer".',
        },
        {
          word: 'Tutor',
          phoneticIpa: '/ˈtuː.tər/ (US) ou /ˈtjuː.tər/ (UK)',
          tip: 'No inglês americano, o "T" soa quase como um "D" suave (flap T). No britânico, soa "T-you-tor".',
          soundComparison: 'Ouça a diferença alternando o sotaque US e UK no topo.',
        },
      ],
      grammarNotes: [
        'A expressão "What would you like to..." é uma forma muito cortês e natural de perguntar o que alguém deseja fazer.',
      ],
      suggestedFollowups: [
        'I want to practice an interview for my business.',
        'Can we practice the pronunciation of words with the "TH" sound?',
        'How do I order food and drinks naturally in a restaurant dialogue?',
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'conversation',
    },
  ]);

  // Input & audio recording states
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dedicated Pronunciation Suggestions & Coaching Lab State
  const [pronounceWordTarget, setPronounceWordTarget] = useState<string>('');
  const [pronounceResult, setPronounceResult] = useState<any>(null);
  const [isAnalyzingPronounce, setIsAnalyzingPronounce] = useState<boolean>(false);

  // Vocabulary bank (saved words)
  const [savedVocabulary, setSavedVocabulary] = useState<{ word: string; translation: string; ipa?: string }[]>(() => {
    try {
      const userKey = currentUser?.id || 'usr-romildo-master';
      let stored = localStorage.getItem(`JARVES_VOCAB_${userKey}`);
      if (stored === 'undefined' || stored === 'null') {
        try {
          localStorage.removeItem(`JARVES_VOCAB_${userKey}`);
        } catch {}
        stored = null;
      }
      if (stored && stored.trim() !== '') {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return [
        { word: 'Consistency', translation: 'Consistência / Constância', ipa: '/kənˈsɪs.tən.si/' },
        { word: 'Fluency', translation: 'Fluência verbal', ipa: '/ˈfluː.ən.si/' },
        { word: 'Reliability', translation: 'Confiabilidade', ipa: '/rɪˌlaɪ.əˈbɪl.ə.ti/' },
      ];
    } catch {
      return [
        { word: 'Consistency', translation: 'Consistência / Constância', ipa: '/kənˈsɪs.tən.si/' },
        { word: 'Fluency', translation: 'Fluência verbal', ipa: '/ˈfluː.ən.si/' },
        { word: 'Reliability', translation: 'Confiabilidade', ipa: '/rɪˌlaɪ.əˈbɪl.ə.ti/' },
      ];
    }
  });

  // Dedicated instant translator state
  const [translateInput, setTranslateInput] = useState('');
  const [translateOutput, setTranslateOutput] = useState('');
  const [translateNotes, setTranslateNotes] = useState<string[]>([]);
  const [translateDirection, setTranslateDirection] = useState<'pt-en' | 'en-pt'>('pt-en');
  const [isTranslating, setIsTranslating] = useState(false);

  // Audio recording refs & Speech references (Ref-based GC shield for Chromium)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Pre-load and cache voices
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setAvailableVoices(v);
        }
      }
    };

    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Persist vocabulary
  useEffect(() => {
    try {
      const userKey = currentUser?.id || 'usr-romildo-master';
      if (Array.isArray(savedVocabulary) && savedVocabulary.length > 0) {
        localStorage.setItem(`JARVES_VOCAB_${userKey}`, JSON.stringify(savedVocabulary));
      }
    } catch (e) {
      console.warn('Could not save vocabulary:', e);
    }
  }, [savedVocabulary, currentUser?.id]);

  // Ultra-Reliable Native Web Speech Synthesis for English
  const speakEnglish = (text: string, msgId?: string, overrideRate?: number) => {
    if (!('speechSynthesis' in window) || !text) return;

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('SpeechSynthesis reset safe handling:', e);
    }

    const cleanText = text
      .replace(/\*\*.*?\*\*/g, (m) => m.replace(/\*\*/g, ''))
      .replace(/[*#_~`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    // 60ms delay ensures Chromium finishes canceling prior utterances before starting new one
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = selectedAccent; // 'en-US' or 'en-GB'
        utterance.rate = overrideRate !== undefined ? overrideRate : speechRate;
        utterance.pitch = 1.0;

        // CRITICAL: Retain in ref to prevent Chrome Garbage Collection mid-speech
        activeUtteranceRef.current = utterance;

        // Pick best English voice
        const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
        const enVoices = voices.filter(
          (v) => v.lang.startsWith(selectedAccent.substring(0, 2)) || v.lang.startsWith('en')
        );

        if (enVoices.length > 0) {
          const preferred =
            enVoices.find(
              (v) =>
                v.lang.includes(selectedAccent) &&
                (v.name.includes('Google') ||
                  v.name.includes('Natural') ||
                  v.name.includes('Samantha') ||
                  v.name.includes('Daniel') ||
                  v.name.includes('David') ||
                  v.name.includes('Jenny') ||
                  v.name.includes('Karen'))
            ) ||
            enVoices.find((v) => v.lang.includes(selectedAccent)) ||
            enVoices[0];

          if (preferred) {
            utterance.voice = preferred;
          }
        }

        utterance.onstart = () => {
          if (msgId) setCurrentlySpeakingId(msgId);
        };

        utterance.onend = () => {
          setCurrentlySpeakingId(null);
          activeUtteranceRef.current = null;
        };

        utterance.onerror = (e: any) => {
          setCurrentlySpeakingId(null);
          activeUtteranceRef.current = null;
          // Normal interruption or cancellation when switching audio
          if (e?.error && e.error !== 'canceled' && e.error !== 'interrupted') {
            // Handled safely
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Failed to speak utterance:', err);
        setCurrentlySpeakingId(null);
        activeUtteranceRef.current = null;
      }
    }, 60);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      setCurrentlySpeakingId(null);
      activeUtteranceRef.current = null;
    }
  };

  // Start English Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Convert to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await sendAudioToTutor(base64Audio);
        };
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      setLiveTranscript('Ouvindo em inglês...');

      // Live SpeechRecognition for instant visual preview
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            interim += event.results[i][0].transcript;
          }
          if (interim) {
            setLiveTranscript(interim);
          }
        };

        recognition.onerror = () => {};
        recognition.start();
        speechRecognitionRef.current = recognition;
      }

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone for tutor:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões de áudio do navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);

      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
    }
  };

  // Send audio to the tutor backend
  const sendAudioToTutor = async (base64Audio: string) => {
    setIsLoading(true);
    const userAudioMsgId = `usr_audio_${Date.now()}`;

    // Add user placeholder message
    const userMsg: EnglishTutorMessage = {
      id: userAudioMsgId,
      sender: 'user',
      englishText: liveTranscript || '🎙️ Áudio em inglês enviado para avaliação...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: activeMode,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLiveTranscript('');

    try {
      const res = await fetch('/api/jarves/translator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType: 'audio/webm',
          prompt: liveTranscript || '',
          mode: activeMode,
          userLevel: userLevel.toLowerCase(),
          topic: activeMode === 'roleplay' ? 'Simulação de Conversa' : 'Conversação Geral',
          conversationHistory: messages.slice(-4).map((m) => ({
            role: m.sender,
            englishText: m.englishText,
          })),
        }),
      });

      const data = await res.json();

      // Update user message if detectedSpeech is available
      if (data.detectedSpeech) {
        setMessages((prev) =>
          prev.map((m) => (m.id === userAudioMsgId ? { ...m, englishText: `"${data.detectedSpeech}"` } : m))
        );
      }

      const tutorMsg: EnglishTutorMessage = {
        id: `tutor_${Date.now()}`,
        sender: 'tutor',
        englishText: data.englishResponse,
        repeatedPhrase: data.repeatedPhrase,
        repeatedPhrasePhonetic: data.repeatedPhrasePhonetic,
        interactiveDialoguePrompt: data.interactiveDialoguePrompt,
        dialogueContext: data.dialogueContext,
        translationPt: data.translationPt,
        pronunciationTips: data.pronunciationTips || [],
        grammarNotes: data.grammarNotes || [],
        suggestedFollowups: data.suggestedFollowups || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: activeMode,
      };

      setMessages((prev) => [...prev, tutorMsg]);
      onAddLog('Áudio em Inglês Analisado', 'Tradutor & Tutor', `${data.englishResponse.substring(0, 40)}...`);

      // Immediately play the AI's response aloud in natural English
      if (autoSpeakTutor && (data.speechText || data.englishResponse)) {
        setTimeout(() => {
          speakEnglish(data.speechText || data.englishResponse, tutorMsg.id);
        }, 350);
      }
    } catch (err: any) {
      console.error('Error in sendAudioToTutor:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'tutor',
          englishText: 'I could hear your audio clearly! Keep up the great work practicing your spoken English.',
          translationPt: 'Pude ouvir seu áudio com clareza! Continue praticando sua fala em inglês.',
          pronunciationTips: [
            {
              word: 'Spoken English',
              phoneticIpa: '/ˈspoʊ.kən ˈɪŋ.ɡlɪʃ/',
              tip: 'O "o" em "spoken" soa como "ou" fechado. Termine o "English" com som de "sh" suave.',
            },
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Send written message to tutor
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsgId = `usr_${Date.now()}`;
    const userMsg: EnglishTutorMessage = {
      id: userMsgId,
      sender: 'user',
      englishText: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: activeMode,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/jarves/translator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          mode: activeMode,
          userLevel: userLevel.toLowerCase(),
          topic: activeMode === 'roleplay' ? 'Simulação de Diálogo' : 'Conversação de Inglês',
          conversationHistory: messages.slice(-4).map((m) => ({
            role: m.sender,
            englishText: m.englishText,
          })),
        }),
      });

      const data = await res.json();

      const tutorMsg: EnglishTutorMessage = {
        id: `tutor_${Date.now()}`,
        sender: 'tutor',
        englishText: data.englishResponse,
        repeatedPhrase: data.repeatedPhrase,
        repeatedPhrasePhonetic: data.repeatedPhrasePhonetic,
        interactiveDialoguePrompt: data.interactiveDialoguePrompt,
        dialogueContext: data.dialogueContext,
        translationPt: data.translationPt,
        pronunciationTips: data.pronunciationTips || [],
        grammarNotes: data.grammarNotes || [],
        suggestedFollowups: data.suggestedFollowups || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: activeMode,
      };

      setMessages((prev) => [...prev, tutorMsg]);
      onAddLog('Mensagem ao Tutor de Inglês', 'Tradutor & Tutor', text.substring(0, 30));

      // Immediately play the AI's response aloud in natural English
      if (autoSpeakTutor && (data.speechText || data.englishResponse)) {
        setTimeout(() => {
          speakEnglish(data.speechText || data.englishResponse, tutorMsg.id);
        }, 350);
      }
    } catch (err: any) {
      // Offline resilient fallback for tutor continuity
      const fallbackMsg: EnglishTutorMessage = {
        id: `tutor_fb_${Date.now()}`,
        sender: 'tutor',
        englishText: `Great effort! Let's practice saying your phrase with confidence: "${text}". Notice the rhythm and word stress.`,
        repeatedPhrase: text,
        repeatedPhrasePhonetic: `${text} [pronounce smoothly without pauses]`,
        interactiveDialoguePrompt: `Repeat the phrase above aloud! Now tell me: What projects or goals are you working on this week?`,
        dialogueContext: 'Prática de Diálogo Contínuo',
        translationPt: `Excelente esforço! Vamos praticar dizer a sua frase com confiança. Observe o ritmo e a tônica das palavras. Repita-a e me conte quais projetos você está desenvolvendo esta semana!`,
        pronunciationTips: [
          {
            word: text.split(' ')[0] || 'Practice',
            phoneticIpa: '/ˈpræk.tɪs/',
            tip: 'Mantenha o som das consoantes finalizado de forma limpa, sem acrescentar "i".',
            soundComparison: 'Conecte as palavras suavemente (linking sounds).',
          },
        ],
        grammarNotes: ['Dica: fale com calma e foque na clareza de cada fonema!'],
        suggestedFollowups: [
          'I am working on building my English fluency every day.',
          'Can you give me another sentence with pronunciation tips?',
          'How do I say "tenha um bom dia" in a natural way?',
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: activeMode,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      if (autoSpeakTutor) {
        setTimeout(() => {
          speakEnglish(fallbackMsg.englishText, fallbackMsg.id);
        }, 350);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze specific word or phrase for detailed pronunciation coaching
  const handleAnalyzePronunciation = async (targetText?: string) => {
    const textToAnalyze = (targetText || pronounceWordTarget).trim();
    if (!textToAnalyze || isAnalyzingPronounce) return;

    setIsAnalyzingPronounce(true);
    setPronounceWordTarget(textToAnalyze);

    try {
      const res = await fetch('/api/jarves/translator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analyze the exact English pronunciation of: "${textToAnalyze}". Provide phonetic IPA, mouth/tongue position guide, syllable stress, common mistakes by Brazilian speakers, and slow pronunciation advice.`,
          mode: 'pronunciation',
          userLevel: userLevel.toLowerCase(),
          topic: 'Pronúncia & Fonética',
        }),
      });

      const data = await res.json();
      setPronounceResult(data);
      onAddLog('Análise de Pronúncia Solicitada', 'Treino Fonético', textToAnalyze);

      // Play audio automatically for pronunciation feedback
      if (data.speechText || data.englishResponse) {
        setTimeout(() => {
          speakEnglish(data.speechText || textToAnalyze, 'pronounce-lab');
        }, 300);
      }
    } catch (err) {
      setPronounceResult({
        detectedSpeech: textToAnalyze,
        repeatedPhrase: textToAnalyze,
        repeatedPhrasePhonetic: `/${textToAnalyze.toLowerCase()}/`,
        englishResponse: `Here is the pronunciation guide for "${textToAnalyze}": Articulate clearly, stress the primary vowel, and do not add an extra vowel at the end.`,
        interactiveDialoguePrompt: `Repeat "${textToAnalyze}" slowly three times aloud!`,
        dialogueContext: 'Treino Fonético Resiliente',
        translationPt: `Guia de pronúncia para "${textToAnalyze}": Articule com clareza, enfatize a vogal tônica e corte o som seco sem vogal de apoio no final.`,
        pronunciationTips: [
          {
            word: textToAnalyze,
            phoneticIpa: `/${textToAnalyze.toLowerCase()}/`,
            tip: 'Mantenha a língua relaxada e o fluxo de ar constante.',
            soundComparison: 'Pronúncia limpa e concisa.',
          },
        ],
      });
    } finally {
      setIsAnalyzingPronounce(false);
    }
  };

  // Handle instant translation tool
  const handleInstantTranslate = async () => {
    if (!translateInput.trim() || isTranslating) return;

    setIsTranslating(true);
    try {
      const res = await fetch('/api/jarves/translator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Traduza ${translateDirection === 'pt-en' ? 'do português para o inglês nativo e fluente' : 'do inglês para o português do Brasil'}: "${translateInput}". Explique nuances culturais e dê dicas de pronúncia.`,
          mode: 'translate',
          userLevel: userLevel.toLowerCase(),
        }),
      });

      const data = await res.json();
      setTranslateOutput(data.englishResponse || data.translationPt || '');
      setTranslateNotes(data.grammarNotes || []);
      onAddLog('Tradução Executada', 'Tradutor & Tutor', `${translateInput.substring(0, 30)}...`);
    } catch (err) {
      setTranslateOutput(translateInput);
      setTranslateNotes(['Tradução em modo local seguro.']);
    } finally {
      setIsTranslating(false);
    }
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Bookmark a word to vocabulary bank
  const toggleSaveWord = (word: string, translation: string, ipa?: string) => {
    setSavedVocabulary((prev) => {
      const exists = prev.some((w) => w.word.toLowerCase() === word.toLowerCase());
      if (exists) {
        return prev.filter((w) => w.word.toLowerCase() !== word.toLowerCase());
      } else {
        return [{ word, translation, ipa }, ...prev];
      }
    });
  };

  return (
    <div id="translator-panel" className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Master Mode Controls */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0E1726] via-[#111C2E] to-[#0A111E] border border-teal-500/30 p-6 shadow-2xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-32 bottom-0 w-48 h-48 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-[0_0_25px_rgba(20,184,166,0.3)]">
              <Languages className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-orbitron font-bold text-slate-100 tracking-wide">
                  TRADUTOR & TUTOR DE INGLÊS
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 animate-pulse">
                  PROFESSOR JARVES
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Assistente pedagógico com inteligência de voz em inglês nativo. Compreensão de áudios, treino de pronúncia, feedback fonético, sugestões de conversação e tradução contextual.
              </p>
            </div>
          </div>

          {/* Quick Voice & Accent Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto bg-[#070B12]/80 p-2.5 rounded-xl border border-slate-800">
            {/* Sotaque */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <select
                value={selectedAccent}
                onChange={(e) => setSelectedAccent(e.target.value as any)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs font-mono"
              >
                <option value="en-US" className="bg-slate-900 text-slate-200">🇺🇸 Inglês Americano (US)</option>
                <option value="en-GB" className="bg-slate-900 text-slate-200">🇬🇧 Inglês Britânico (UK)</option>
              </select>
            </div>

            {/* Velocidade da Voz */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className="text-[10px] text-slate-400 font-mono">Vel:</span>
              <button
                onClick={() => setSpeechRate(0.8)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  speechRate === 0.8 ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Lento para aprendizado"
              >
                0.8x
              </button>
              <button
                onClick={() => setSpeechRate(1.0)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  speechRate === 1.0 ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Velocidade normal"
              >
                1.0x
              </button>
              <button
                onClick={() => setSpeechRate(1.2)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  speechRate === 1.2 ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Fluência rápida"
              >
                1.2x
              </button>
            </div>

            {/* Auto Speak Toggle */}
            <button
              onClick={() => setAutoSpeakTutor(!autoSpeakTutor)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                autoSpeakTutor
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
              title="Ouvir automaticamente a resposta do professor"
            >
              {autoSpeakTutor ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{autoSpeakTutor ? 'Voz Ativa' : 'Voz Mudo'}</span>
            </button>
          </div>
        </div>

        {/* Learning Mode Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveMode('conversation')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeMode === 'conversation'
                  ? 'bg-teal-500 text-slate-950 shadow-[0_0_15px_rgba(20,184,166,0.4)]'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Conversação & Voz</span>
            </button>

            <button
              onClick={() => setActiveMode('pronunciation')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeMode === 'pronunciation'
                  ? 'bg-teal-500 text-slate-950 shadow-[0_0_15px_rgba(20,184,166,0.4)]'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Headphones className="w-4 h-4" />
              <span>Treino de Pronúncia</span>
            </button>

            <button
              onClick={() => setActiveMode('roleplay')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeMode === 'roleplay'
                  ? 'bg-teal-500 text-slate-950 shadow-[0_0_15px_rgba(20,184,166,0.4)]'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Simulações & Diálogos</span>
            </button>

            <button
              onClick={() => setActiveMode('translate')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeMode === 'translate'
                  ? 'bg-teal-500 text-slate-950 shadow-[0_0_15px_rgba(20,184,166,0.4)]'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Tradutor Bidirecional</span>
            </button>
          </div>

          {/* User Proficiency Level */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-teal-400" />
              Nível:
            </span>
            <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
              {(['Iniciante', 'Intermediário', 'Avançado'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setUserLevel(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    userLevel === lvl
                      ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Topics Carousel / Topic Starters */}
      <div className="rounded-2xl bg-[#0F1420]/80 border border-slate-800/80 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-orbitron font-semibold text-teal-400">
            <Sparkles className="w-4 h-4" />
            <span>SUGESTÕES DE ASSUNTOS & TÓPICOS DE CONVERSAÇÃO</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Clique para iniciar o diálogo com o professor</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRESET_TOPICS.map((top) => (
            <div
              key={top.id}
              onClick={() => handleSendMessage(top.starterPrompt)}
              className="p-3 rounded-xl bg-[#090D15]/80 hover:bg-slate-900 border border-slate-800/80 hover:border-teal-500/40 cursor-pointer transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-200 group-hover:text-teal-300 transition-colors">
                  {top.title}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  {top.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 italic line-clamp-2">
                "{top.starterPrompt}"
              </p>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                {top.starterPromptPt}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: The Interactive Chat & Voice Studio */}
        <div className="lg:col-span-2 flex flex-col h-[650px] rounded-2xl bg-[#0B0E17]/90 border border-slate-800 p-4 relative shadow-xl">
          {/* Header of Chat */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-orbitron font-semibold">SALA DE AULA VIRTUAL</span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-slate-400 font-mono">Modo: {activeMode.toUpperCase()}</span>
            </div>

            <div className="flex items-center gap-2">
              {currentlySpeakingId && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 text-[11px] font-mono animate-pulse">
                  <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                  <span>Reproduzindo voz...</span>
                  <button
                    onClick={stopSpeaking}
                    className="ml-1 px-1.5 py-0.5 rounded bg-rose-500 hover:bg-rose-600 text-white text-[10px]"
                    title="Parar áudio agora"
                  >
                    Parar
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setMessages([messages[0]]);
                  stopSpeaking();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                title="Reiniciar conversa"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar Histórico</span>
              </button>
            </div>
          </div>

          {/* Messages Flow */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {messages.map((msg) => {
              const isSpeakingThisMsg = currentlySpeakingId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl p-4 transition-all relative ${
                      isSpeakingThisMsg
                        ? 'border-2 border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.35)] ring-2 ring-teal-500/20 bg-[#121c2e]'
                        : msg.sender === 'user'
                        ? 'bg-gradient-to-r from-teal-900/40 to-cyan-900/30 border border-teal-500/30 text-slate-100'
                        : 'bg-[#101726]/95 border border-slate-800 text-slate-200 shadow-lg'
                    }`}
                  >
                    {/* Sender title & Controls */}
                    <div className="flex items-center justify-between gap-4 mb-2 text-xs">
                      <span
                        className={`font-orbitron font-bold flex items-center gap-1.5 ${
                          msg.sender === 'user' ? 'text-teal-400' : 'text-cyan-400'
                        }`}
                      >
                        {msg.sender === 'user' ? (
                          <>
                            <span>Você (Romildo)</span>
                          </>
                        ) : (
                          <>
                            <GraduationCap className="w-3.5 h-3.5 text-teal-400" />
                            <span>Professor Collins &bull; Tutor JARVES</span>
                          </>
                        )}
                        {isSpeakingThisMsg && (
                          <span className="flex items-center gap-1 text-[10px] text-teal-300 font-mono animate-pulse">
                            <Volume2 className="w-3 h-3" />
                            <span>Áudio ativo</span>
                          </span>
                        )}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>

                        {/* Copy Text */}
                        <button
                          onClick={() => copyToClipboard(msg.englishText, msg.id)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                          title="Copiar texto em inglês"
                        >
                          {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Primary English Content */}
                    <div className="text-sm font-medium text-slate-100 leading-relaxed">
                      {msg.englishText}
                    </div>

                    {/* Repeated Initiated Phrase (Repita a Frase Iniciada) */}
                    {msg.sender === 'tutor' && msg.repeatedPhrase && (
                      <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-teal-950/70 via-slate-900/90 to-teal-900/40 border border-teal-500/40 text-xs shadow-md">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-orbitron font-bold text-teal-300 text-[11px] flex items-center gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
                            <span>FRASE INICIADA &bull; REPITA COMIGO:</span>
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-200 border border-teal-500/30">
                            CADÊNCIA NATIVA
                          </span>
                        </div>
                        <div className="text-sm font-bold text-white tracking-wide mb-1 font-sans">
                          "{msg.repeatedPhrase}"
                        </div>
                        {msg.repeatedPhrasePhonetic && (
                          <div className="text-[11px] font-mono text-amber-300/90 mb-2">
                            🗣️ Guia fonético & ritmo: {msg.repeatedPhrasePhonetic}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-teal-500/20">
                          <button
                            type="button"
                            onClick={() => speakEnglish(msg.repeatedPhrase!, `${msg.id}-repeated`, 1.0)}
                            className="px-2.5 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-1 transition-all shadow-sm"
                            title="Ouvir a frase repetida pelo professor em velocidade normal"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Ouvir e Repetir (1.0x)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => speakEnglish(msg.repeatedPhrase!, `${msg.id}-repeated`, 0.75)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-700 text-xs font-mono flex items-center gap-1 transition-colors"
                            title="Ouvir a frase repetida em câmera lenta para treinar cada som"
                          >
                            <span>🐢 Lento (0.75x)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendMessage(`I repeated: "${msg.repeatedPhrase}"`)}
                            className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-500/30 text-xs font-mono flex items-center gap-1 ml-auto transition-colors"
                            title="Confirmar repetição para avançar o diálogo"
                          >
                            <span>🎤 Repeti com Sucesso!</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Interactive Dialogue Turn & Scenario Challenge */}
                    {msg.sender === 'tutor' && msg.interactiveDialoguePrompt && (
                      <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900/90 to-blue-950/50 border border-cyan-500/40 text-xs shadow-md">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 font-orbitron font-bold text-cyan-300 text-[11px]">
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                            <span>DIÁLOGO INTERATIVO &bull; SUA VEZ DE FALAR:</span>
                          </div>
                          {msg.dialogueContext && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                              {msg.dialogueContext}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-100 text-xs leading-relaxed font-medium mb-2.5">
                          {msg.interactiveDialoguePrompt}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => speakEnglish(msg.interactiveDialoguePrompt!, `${msg.id}-dialogue`, 0.9)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-mono flex items-center gap-1 transition-colors"
                            title="Ouvir a pergunta interativa do diálogo"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Ouvir Diálogo</span>
                          </button>
                          <span className="text-[10px] font-mono text-slate-400">
                            Responda pelo microfone ou pelas opções sugeridas abaixo:
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Controls for Tutor Audio Response */}
                    {msg.sender === 'tutor' && (
                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            if (isSpeakingThisMsg) {
                              stopSpeaking();
                            } else {
                              speakEnglish(msg.englishText, msg.id, 1.0);
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                            isSpeakingThisMsg
                              ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                              : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-[0_0_12px_rgba(20,184,166,0.3)]'
                          }`}
                          title="Ouvir a resposta do tutor em inglês nativo"
                        >
                          {isSpeakingThisMsg ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Parar Áudio</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Ouvir Resposta da IA</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => speakEnglish(msg.englishText, msg.id, 0.75)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-700 text-xs font-mono transition-colors"
                          title="Ouvir em câmera lenta (0.75x) para treinar compreensão auditiva"
                        >
                          <span>🐢 Lento (0.75x)</span>
                        </button>

                        {msg.repeatedPhrase && (
                          <button
                            type="button"
                            onClick={() => speakEnglish(msg.repeatedPhrase!, `${msg.id}-repeated-btn`, 0.85)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-mono transition-colors"
                            title="Repetir a frase iniciada com cadência nativa"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Repetir Frase</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleAnalyzePronunciation(msg.repeatedPhrase || msg.englishText.slice(0, 120))}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono transition-colors ml-auto"
                          title="Pedir sugestões de pronúncia para a frase iniciada ou resposta"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Sugerir Pronúncia</span>
                        </button>
                      </div>
                    )}

                    {/* Controls for User English Audio Feedback (Hear Native Pronunciation) */}
                    {msg.sender === 'user' && (
                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-teal-500/20">
                        <button
                          type="button"
                          onClick={() => {
                            if (isSpeakingThisMsg) {
                              stopSpeaking();
                            } else {
                              speakEnglish(msg.englishText, msg.id, 1.0);
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                            isSpeakingThisMsg
                              ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                              : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/50 shadow-sm'
                          }`}
                          title="Ouvir sua própria frase com pronúncia nativa e entonação natural"
                        >
                          {isSpeakingThisMsg ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Parar Áudio</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Ouvir com Pronúncia Nativa</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => speakEnglish(msg.englishText, msg.id, 0.75)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono transition-colors"
                          title="Ouvir sua frase em câmera lenta (0.75x) para aprimorar o ritmo"
                        >
                          <span>🐢 0.75x</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAnalyzePronunciation(msg.englishText)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono transition-colors ml-auto"
                          title="Pedir sugestões de pronúncia para a frase que você enviou"
                        >
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>Sugerir Pronúncia</span>
                        </button>
                      </div>
                    )}

                    {/* Portuguese Translation & Cultural/Grammar Explanation */}
                    {msg.translationPt && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-xl">
                        <span className="text-teal-400 font-bold block mb-1">Tradução & Explicação:</span>
                        {msg.translationPt}
                      </div>
                    )}

                    {/* Pronunciation Coaching Tips */}
                    {msg.pronunciationTips && msg.pronunciationTips.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="text-[11px] font-orbitron font-bold text-amber-400 flex items-center gap-1.5">
                          <Headphones className="w-3.5 h-3.5" />
                          <span>DICAS DE PRONÚNCIA DO PROFESSOR:</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {msg.pronunciationTips.map((tip, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-amber-300 font-mono text-xs">
                                  {tip.word} {tip.phoneticIpa && <span className="text-slate-300 font-normal">[{tip.phoneticIpa}]</span>}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => speakEnglish(tip.word, undefined, 0.9)}
                                    className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-mono flex items-center gap-1"
                                    title="Ouvir palavra em inglês"
                                  >
                                    <Volume2 className="w-3 h-3" />
                                    Ouvir
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => speakEnglish(tip.word, undefined, 0.7)}
                                    className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[10px] font-mono flex items-center gap-1"
                                    title="Ouvir em câmera lenta (0.7x) para treinar fonética"
                                  >
                                    🐢 0.7x
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAnalyzePronunciation(tip.word)}
                                    className="px-2 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-[10px] font-mono flex items-center gap-1"
                                    title="Abrir no Laboratório de Pronúncia"
                                  >
                                    <Lightbulb className="w-3 h-3" />
                                    Treinar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleSaveWord(tip.word, tip.tip, tip.phoneticIpa)}
                                    className="p-1 rounded bg-slate-900 text-slate-400 hover:text-amber-300"
                                    title="Salvar no meu banco de vocabulário"
                                  >
                                    <Bookmark className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-slate-200 text-[11px] leading-relaxed">{tip.tip}</p>
                              {tip.soundComparison && (
                                <p className="text-amber-200/80 text-[10px] italic">
                                  &bull; {tip.soundComparison}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grammar & Idiom Highlights */}
                    {msg.grammarNotes && msg.grammarNotes.length > 0 && (
                      <div className="mt-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-xl">
                        <span className="font-bold block mb-1">Nota Gramatical & Vocabulário:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                          {msg.grammarNotes.map((note, i) => (
                            <li key={i}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggested Next Topics / Clickable Followups */}
                    {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] font-mono text-teal-400 block mb-1.5 uppercase font-bold">
                          Como continuar (Clique para responder):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedFollowups.map((followup, fIdx) => (
                            <button
                              key={fIdx}
                              onClick={() => handleSendMessage(followup)}
                              className="text-left text-xs px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-200 hover:text-white transition-colors"
                            >
                              &bull; "{followup}"
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-teal-500/20 text-teal-400 text-xs font-mono max-w-sm">
                <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                <span>Professor Collins está analisando seu áudio e preparando o feedback...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Live Recording Waveform & Status */}
          {isRecording && (
            <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs animate-pulse">
              <div className="flex items-center gap-2 text-rose-400 font-mono">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <span className="font-bold">GRAVANDO ÁUDIO EM INGLÊS... ({recordingDuration}s)</span>
                <span className="text-slate-300 italic text-[11px]">"{liveTranscript}"</span>
              </div>
              <button
                onClick={stopRecording}
                className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold font-mono text-xs transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              >
                Concluir e Enviar ao Professor
              </button>
            </div>
          )}

          {/* Input & Voice Controls Footer */}
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2">
              {/* Push-to-Talk / Toggle Mic Recording */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
                className={`p-3 rounded-xl font-bold transition-all flex items-center justify-center shrink-0 ${
                  isRecording
                    ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse'
                    : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-[0_0_15px_rgba(20,184,166,0.3)]'
                }`}
                title={isRecording ? 'Parar gravação e enviar áudio' : 'Falar em inglês com o professor'}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Text Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Fale pelo microfone ou digite em inglês para o professor..."
                  disabled={isLoading || isRecording}
                  className="w-full bg-[#070B12] border border-slate-800 focus:border-teal-500/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500/50 transition-all font-sans"
                />
              </div>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading || isRecording}
                className="p-3 rounded-xl bg-slate-800 hover:bg-teal-500 text-slate-400 hover:text-slate-950 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:hover:text-slate-400 transition-all shrink-0"
                title="Enviar mensagem"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1 font-mono">
              <span>🎙️ Dica: Clique no microfone para falar em inglês. O JARVES analisa seu áudio nativamente.</span>
              <span>Pressione Enter para enviar</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Pronunciation Coach Lab & Vocabulary Bank */}
        <div className="space-y-6">
          {/* 1. Dedicated Pronunciation Suggestions & Coach Lab */}
          <div className="rounded-2xl bg-[#0B0E17]/90 border border-teal-500/40 p-4 shadow-xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-teal-300">
                <Headphones className="w-4 h-4 text-teal-400 animate-pulse" />
                <span>SUGESTÃO DE PRONÚNCIA & IA</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/40">
                TREINO AUDITIVO
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] text-slate-400">
                Digite ou selecione palavras desafiadoras em inglês para receber análise fonética, posição da boca e áudio comparativo:
              </p>

              {/* Input for any custom phrase / word */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={pronounceWordTarget}
                  onChange={(e) => setPronounceWordTarget(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAnalyzePronunciation();
                    }
                  }}
                  placeholder="Ex: Schedule, Thought, World..."
                  className="flex-1 bg-[#070B12] border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleAnalyzePronunciation()}
                  disabled={!pronounceWordTarget.trim() || isAnalyzingPronounce}
                  className="px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-950 font-bold text-xs font-mono transition-all flex items-center gap-1 shadow-sm shrink-0"
                  title="Pedir sugestões de pronúncia para a IA"
                >
                  {isAnalyzingPronounce ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Analisar</span>
                </button>
              </div>

              {/* Popular Brazilian Pronunciation Challenge Chips */}
              <div className="space-y-1">
                <div className="text-[10px] font-mono text-slate-500">Palavras frequentes para treino:</div>
                <div className="flex flex-wrap gap-1.5">
                  {['Thought', 'World', 'Comfortable', 'Schedule', 'Iron', 'Three', 'Vegetable', 'Doubt'].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleAnalyzePronunciation(w)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all border ${
                        pronounceWordTarget.toLowerCase() === w.toLowerCase()
                          ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                          : 'bg-slate-900/90 text-slate-300 hover:text-teal-300 border-slate-800 hover:border-teal-500/40'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pronunciation Result Card */}
              {pronounceResult && (
                <div className="p-3 rounded-xl bg-slate-900/95 border border-teal-500/40 text-xs text-slate-200 space-y-2 mt-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-teal-300 font-mono text-sm block">
                        {pronounceWordTarget}
                      </span>
                      {pronounceResult.pronunciationTips?.[0]?.phoneticIpa && (
                        <span className="text-[11px] font-mono text-amber-300">
                          [{pronounceResult.pronunciationTips[0].phoneticIpa}]
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => speakEnglish(pronounceWordTarget, 'pronounce-lab', 1.0)}
                        className="px-2 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-[10px] font-mono flex items-center gap-1"
                        title="Ouvir na velocidade normal"
                      >
                        <Volume2 className="w-3 h-3" />
                        1.0x
                      </button>
                      <button
                        type="button"
                        onClick={() => speakEnglish(pronounceWordTarget, 'pronounce-lab', 0.7)}
                        className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-mono flex items-center gap-1"
                        title="Ouvir em câmera lenta"
                      >
                        🐢 0.7x
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          toggleSaveWord(
                            pronounceWordTarget,
                            pronounceResult.pronunciationTips?.[0]?.tip || 'Treino de pronúncia',
                            pronounceResult.pronunciationTips?.[0]?.phoneticIpa
                          )
                        }
                        className="p-1 rounded bg-slate-800 text-slate-300 hover:text-amber-300"
                        title="Salvar no cofre de vocabulário"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {pronounceResult.pronunciationTips?.[0]?.tip && (
                    <p className="text-[11px] text-slate-300 bg-black/40 p-2 rounded-lg border border-slate-800 leading-relaxed">
                      💡 {pronounceResult.pronunciationTips[0].tip}
                    </p>
                  )}

                  {pronounceResult.pronunciationTips?.[0]?.soundComparison && (
                    <p className="text-[10px] text-amber-300/90 italic">
                      &bull; {pronounceResult.pronunciationTips[0].soundComparison}
                    </p>
                  )}

                  {pronounceResult.grammarNotes?.[0] && (
                    <p className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1">
                      {pronounceResult.grammarNotes[0]}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Instant Translator Widget */}
          <div className="rounded-2xl bg-[#0B0E17]/90 border border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-teal-400">
                <ArrowRightLeft className="w-4 h-4" />
                <span>TRADUTOR RÁPIDO</span>
              </div>
              <button
                onClick={() =>
                  setTranslateDirection((prev) => (prev === 'pt-en' ? 'en-pt' : 'pt-en'))
                }
                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-teal-300 flex items-center gap-1"
              >
                {translateDirection === 'pt-en' ? 'PT ➔ EN' : 'EN ➔ PT'}
              </button>
            </div>

            <div className="space-y-2">
              <textarea
                value={translateInput}
                onChange={(e) => setTranslateInput(e.target.value)}
                placeholder={
                  translateDirection === 'pt-en'
                    ? 'Digite em português para traduzir com contexto...'
                    : 'Type in English to translate into Portuguese...'
                }
                rows={3}
                className="w-full bg-[#070B12] border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none"
              />

              <button
                onClick={handleInstantTranslate}
                disabled={!translateInput.trim() || isTranslating}
                className="w-full py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-950 font-orbitron font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(20,184,166,0.2)]"
              >
                {isTranslating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Traduzir & Explicar Nuances</span>
              </button>

              {translateOutput && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-teal-500/30 text-xs text-slate-200 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-teal-400">TRADUÇÃO:</span>
                    <button
                      onClick={() => speakEnglish(translateOutput)}
                      className="text-teal-400 hover:text-teal-300 p-1"
                      title="Ouvir"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-semibold text-slate-100">{translateOutput}</p>
                  {translateNotes.length > 0 && (
                    <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-1.5">
                      {translateNotes.join(' ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Personal Vocabulary Bank */}
          <div className="rounded-2xl bg-[#0B0E17]/90 border border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-amber-400">
                <BookmarkCheck className="w-4 h-4" />
                <span>COFRE DE VOCABULÁRIO ({savedVocabulary.length})</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Salvo no perfil</span>
            </div>

            {savedVocabulary.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                Nenhuma palavra salva ainda. Clique no marcador 🔖 ao lado de qualquer dica de pronúncia para guardar palavras aqui.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {savedVocabulary.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs group hover:border-teal-500/30 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 font-mono">{item.word}</span>
                        {item.ipa && (
                          <span className="text-[10px] text-slate-400 font-mono">[{item.ipa}]</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.translation}</p>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => speakEnglish(item.word, undefined, 0.8)}
                        className="p-1 rounded text-teal-400 hover:bg-slate-800"
                        title="Ouvir pronúncia"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleSaveWord(item.word, item.translation)}
                        className="p-1 rounded text-rose-400 hover:bg-slate-800"
                        title="Remover"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Pronunciation Pitfalls Guide for Brazilians */}
          <div className="rounded-2xl bg-[#0B0E17]/90 border border-amber-500/30 p-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-amber-400 mb-2">
              <Award className="w-4 h-4" />
              <span>DICAS DE OURO PARA BRASILEIROS</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
              <li>
                <strong className="text-amber-300">Som do "TH" (/θ/ e /ð/):</strong> Coloque a ponta da língua suavemente entre os dentes em palavras como <em>Think, That, Through</em>.
              </li>
              <li>
                <strong className="text-amber-300">Sem "i" no final:</strong> Evite adicionar som de "i" em consoantes finais. Palavras como <em>Stop, Big, Work</em> terminam secas na consoante.
              </li>
              <li>
                <strong className="text-amber-300">Vogais curtas vs longas:</strong> Pratique a diferença entre <em>Ship</em> (/ɪ/ curto) e <em>Sheep</em> (/iː/ longo esticado).
              </li>
              <li>
                <strong className="text-amber-300">Terminação "-ed":</strong> Em verbos regulares, o "-ed" quase nunca é pronunciado como duas sílabas. Ex: <em>Watched</em> soa "watch-t".
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
