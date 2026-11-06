import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  UploadCloud,
  Trash2,
  Youtube,
  Music,
  ExternalLink,
  Search,
  Sparkles,
  Radio,
  Disc,
  ListMusic,
  Maximize2,
  Globe,
  Share2,
  CheckCircle2,
  RefreshCw,
  Plus,
  Edit3,
  X,
  RotateCcw,
  Film,
  Sliders,
  Check,
  Tag,
  Save,
  Lock,
  HelpCircle,
  ShieldCheck,
  GripVertical,
  Move,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { UserAccount } from '../types';
import {
  AudioTrack,
  loadAllTracks,
  saveUploadedAudioFile,
  saveDirectUrlTrack,
  deleteAudioTrack,
  updateAudioTrack,
  resetUserTracksToDefault,
  YouTubeSongItem,
  loadYouTubeSongs,
  saveYouTubeSongs,
  resetYouTubeSongsToDefault,
  extractYouTubeVideoId,
  extractYouTubeSearchQuery,
  extractDailymotionVideoId,
  detectVideoPlatform,
  buildEmbedVideoUrl,
  generateMediaImportSampleJson,
  parseAndValidateMediaImportJson,
  importBulkMediaItems,
  DEFAULT_YOUTUBE_SONGS
} from '../utils/musicStorage';

interface MediaHubProps {
  currentUser?: UserAccount | null;
  currentVolume?: number;
  onVolumeChange?: (newVolume: number) => void;
  voiceQuery?: string;
  autoPlayQuery?: string;
  onAddLog?: (action: string, device: string, target?: string) => void;
  externalTrackToPlay?: string | null;
  externalVideoId?: string | null;
  externalAction?: 'play' | 'pause' | 'stop' | 'next' | 'prev' | 'mute' | 'unmute' | null;
  initialSubTab?: 'player' | 'youtube' | 'weblinks';
  commandNonce?: number;
  onSaveSystem?: () => void;
  isSaving?: boolean;
  lastSavedTimestamp?: string | null;
  isDirty?: boolean;
}

export const MediaHub: React.FC<MediaHubProps> = ({
  currentUser = null,
  currentVolume = 80,
  onVolumeChange,
  voiceQuery,
  autoPlayQuery,
  onAddLog,
  externalTrackToPlay,
  externalVideoId,
  externalAction,
  initialSubTab = 'player',
  commandNonce = 0,
  onSaveSystem,
  isSaving = false,
  lastSavedTimestamp = null,
  isDirty = false,
}) => {
  // Current active user identity for playlist isolation
  const activeUserId = currentUser?.id || 'usr-romildo-master';
  const activeUserName = currentUser?.name || 'Romildo';

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'player' | 'youtube' | 'weblinks'>(initialSubTab);
  const [showVoiceHelp, setShowVoiceHelp] = useState<boolean>(false);

  // Tracks & Library state (MP3)
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(currentVolume / 100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // YouTube state & Curated suggestions
  const [ytSongs, setYtSongs] = useState<YouTubeSongItem[]>([]);
  const [activeYtVideoId, setActiveYtVideoId] = useState<string>('pAgnJDJN4VA');
  const [activeYtTitle, setActiveYtTitle] = useState<string>('Back in Black (Iron Man Theme)');
  const [activeYtArtist, setActiveYtArtist] = useState<string>('AC/DC');
  const [ytSearchQuery, setYtSearchQuery] = useState<string>(autoPlayQuery || voiceQuery || 'Iron Man AC/DC Back in Black');
  const [activeYtUrl, setActiveYtUrl] = useState<string>('https://www.youtube.com/embed/pAgnJDJN4VA?autoplay=1&rel=0');
  const [activeVideoPlatform, setActiveVideoPlatform] = useState<'youtube' | 'dailymotion' | 'direct'>('youtube');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<'Todos' | 'youtube' | 'dailymotion'>('Todos');
  const [ytHistory, setYtHistory] = useState<string[]>([
    'Iron Man AC/DC Back in Black',
    'Cyberpunk 2077 Synthwave Radio',
    'Hans Zimmer Interstellar OST',
    'Lofi Hip Hop Beats to Relax / Study',
    'Daft Punk Tron Legacy',
  ]);

  // Drag-and-Drop & Position Reordering State for Video Cards
  const [draggedSongId, setDraggedSongId] = useState<string | null>(null);
  const [dragOverSongId, setDragOverSongId] = useState<string | null>(null);
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  // Modal State for Adding / Editing Video Links (YouTube / Dailymotion / Direct)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalArtist, setModalArtist] = useState<string>('');
  const [modalUrlOrId, setModalUrlOrId] = useState<string>('');
  const [modalPlatform, setModalPlatform] = useState<'youtube' | 'dailymotion' | 'direct'>('youtube');
  const [modalCategory, setModalCategory] = useState<string>('Rock Clássico');
  const [modalDescription, setModalDescription] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal State for Editing Audio Track (MP3)
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState<boolean>(false);
  const [editingTrack, setEditingTrack] = useState<AudioTrack | null>(null);
  const [modalTrackTitle, setModalTrackTitle] = useState<string>('');
  const [modalTrackArtist, setModalTrackArtist] = useState<string>('');
  const [modalTrackError, setModalTrackError] = useState<string | null>(null);

  // Modal State for Manual MP3 by URL
  const [isAddMp3UrlModalOpen, setIsAddMp3UrlModalOpen] = useState<boolean>(false);
  const [modalMp3Title, setModalMp3Title] = useState<string>('');
  const [modalMp3Artist, setModalMp3Artist] = useState<string>('');
  const [modalMp3Url, setModalMp3Url] = useState<string>('');
  const [modalMp3Genre, setModalMp3Genre] = useState<string>('Geral');
  const [modalMp3Error, setModalMp3Error] = useState<string | null>(null);

  // Modal State for Bulk JSON Import (MP3 + Videos)
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState<boolean>(false);
  const [bulkJsonInput, setBulkJsonInput] = useState<string>('');
  const [bulkValidation, setBulkValidation] = useState<{
    success: boolean;
    mp3s: AudioTrack[];
    videos: YouTubeSongItem[];
    error?: string;
  } | null>(null);
  const [isImportingBulk, setIsImportingBulk] = useState<boolean>(false);
  const [bulkImportNotice, setBulkImportNotice] = useState<string | null>(null);

  // Audio element reference & Visualizer Canvas
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sync external volume prop
  useEffect(() => {
    if (typeof currentVolume === 'number') {
      const v = Math.min(1, Math.max(0, currentVolume / 100));
      setVolume(v);
      if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : v;
      }
    }
  }, [currentVolume, isMuted]);

  // Load tracks and YouTube links from storage on mount or when active user changes
  useEffect(() => {
    let mounted = true;
    loadAllTracks(activeUserId).then((loaded) => {
      if (mounted) {
        setTracks(loaded);
      }
    });
    setYtSongs(loadYouTubeSongs(activeUserId));
    return () => {
      mounted = false;
    };
  }, [activeUserId]);

  // Sync initialSubTab changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab, commandNonce]);

  // Handle external video ID or autoPlayQuery for YouTube
  // Handle external video ID or autoPlayQuery for YouTube & Dailymotion & DB Library
  useEffect(() => {
    if (externalVideoId) {
      playVideoById(externalVideoId, autoPlayQuery || 'Vídeo Selecionado', 'Vídeo');
    } else if (autoPlayQuery) {
      setYtSearchQuery(autoPlayQuery);
      const qLower = autoPlayQuery.toLowerCase().trim();

      // 1. Check user's personal database MP3 tracks first
      if (tracks.length > 0) {
        const foundMp3Idx = tracks.findIndex(
          (t) => t.title.toLowerCase().includes(qLower) || t.artist.toLowerCase().includes(qLower)
        );
        if (foundMp3Idx !== -1) {
          playTrackAtIndex(foundMp3Idx);
          return;
        }
      }

      // 2. Check user's personal database video links (YouTube / Dailymotion)
      const matchedVideo = ytSongs.find(
        (s) =>
          s.title.toLowerCase().includes(qLower) ||
          s.artist.toLowerCase().includes(qLower)
      );
      if (matchedVideo) {
        playVideoById(
          matchedVideo.videoId,
          matchedVideo.title,
          matchedVideo.artist,
          matchedVideo.originalUrl,
          matchedVideo.platform
        );
        return;
      }

      // 3. Check if query is specifically for Dailymotion
      const isDm =
        qLower.includes('dailymotion') ||
        qLower.includes('daymotion') ||
        detectVideoPlatform(autoPlayQuery) === 'dailymotion';

      if (isDm) {
        const dmId = extractDailymotionVideoId(autoPlayQuery);
        if (dmId) {
          playVideoById(dmId, 'Vídeo Dailymotion', 'Dailymotion', autoPlayQuery, 'dailymotion');
        } else {
          const cleanQ = autoPlayQuery.replace(/dailymotion|daymotion/gi, '').trim();
          playVideoById(cleanQ, cleanQ, 'Dailymotion', undefined, 'dailymotion');
        }
        return;
      }

      // 4. Fallback to direct YouTube ID or YouTube search embed
      const extractedId = extractYouTubeVideoId(autoPlayQuery);
      if (extractedId && extractedId.length === 11) {
        playVideoById(extractedId, autoPlayQuery, 'YouTube', undefined, 'youtube');
      } else {
        setActiveVideoPlatform('youtube');
        setActiveYtVideoId('');
        setActiveYtTitle(autoPlayQuery);
        setActiveYtArtist('Pesquisa YouTube');
        setActiveYtUrl(`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(autoPlayQuery)}&autoplay=1`);
        setActiveSubTab('youtube');
      }

      if (!ytHistory.includes(autoPlayQuery)) {
        setYtHistory((prev) => [autoPlayQuery, ...prev.slice(0, 9)]);
      }
    }
  }, [externalVideoId, autoPlayQuery, commandNonce]);

  // Handle external voice action (e.g. from JARVES voice parser)
  useEffect(() => {
    if (!externalAction) return;

    if (externalAction === 'play') {
      if (activeSubTab === 'youtube') {
        if (activeYtVideoId) {
          setActiveYtUrl(`https://www.youtube.com/embed/${activeYtVideoId}?autoplay=1&rel=0`);
        }
      } else {
        setActiveSubTab('player');
        handlePlay();
      }
    } else if (externalAction === 'pause') {
      handlePause();
    } else if (externalAction === 'stop') {
      handlePause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    } else if (externalAction === 'next') {
      handleNextTrack();
    } else if (externalAction === 'prev') {
      handlePrevTrack();
    } else if (externalAction === 'mute') {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.muted = true;
    } else if (externalAction === 'unmute') {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.muted = false;
    }
  }, [externalAction, commandNonce]);

  // Handle external track query search (e.g. "tocar música Back in Black" or "tocar Stark" or "tocar mp3")
  useEffect(() => {
    if (!externalTrackToPlay) return;
    const q = externalTrackToPlay.toLowerCase().trim();

    // 1. If command is generic MP3 or local audio request, switch to MP3 player and play
    if (
      q === 'mp3' ||
      q === 'musica' ||
      q === 'música' ||
      q === 'audio' ||
      q === 'áudio' ||
      q === 'som' ||
      q === 'faixa' ||
      q === 'minhas musicas' ||
      q === 'minhas músicas' ||
      q === 'local' ||
      q === 'músicas locais' ||
      q === 'musicas locais'
    ) {
      setActiveSubTab('player');
      handlePlay();
      return;
    }

    // 2. Check uploaded & preset MP3 tracks first for matches
    if (tracks.length > 0) {
      const foundIdx = tracks.findIndex(
        (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      );
      if (foundIdx !== -1) {
        playTrackAtIndex(foundIdx);
        return;
      }
    }

    // 3. Check video songs list (YouTube & Dailymotion)
    const ytMatch = ytSongs.find(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
    if (ytMatch) {
      playVideoById(ytMatch.videoId, ytMatch.title, ytMatch.artist, ytMatch.originalUrl, ytMatch.platform);
      return;
    }

    // 4. If no exact MP3 match, trigger YouTube search and switch to YouTube tab
    handleYtSearch(externalTrackToPlay);
  }, [externalTrackToPlay, commandNonce]);

  // Holographic Audio Waveform Visualizer on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const renderWave = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background subtle grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      const numBars = 48;
      const barWidth = width / numBars - 2;

      for (let i = 0; i < numBars; i++) {
        let barHeight = 8;
        if (isPlaying) {
          const wave1 = Math.sin(phase + i * 0.28) * 0.5 + 0.5;
          const wave2 = Math.cos(phase * 0.7 + i * 0.15) * 0.4 + 0.6;
          const energy = (wave1 * wave2);
          barHeight = Math.max(10, energy * (height - 18));
        }

        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Gradient
        const grad = ctx.createLinearGradient(0, height, 0, y);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.85)');
        grad.addColorStop(0.6, 'rgba(192, 132, 252, 0.85)');
        grad.addColorStop(1, 'rgba(244, 114, 182, 0.95)');

        ctx.fillStyle = grad;
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = isPlaying ? 10 : 2;

        // Rounded bar top
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      phase += isPlaying ? 0.09 : 0.02;
      animFrameRef.current = requestAnimationFrame(renderWave);
    };

    renderWave();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying]);

  const currentTrack = tracks[currentTrackIndex] || null;

  // Play a specific MP3 track by index directly and securely
  const playTrackAtIndex = (index: number) => {
    if (index < 0 || index >= tracks.length) return;
    const target = tracks[index];
    setCurrentTrackIndex(index);
    setActiveSubTab('player');

    if (audioRef.current && target && target.url) {
      if (audioRef.current.src !== target.url) {
        audioRef.current.src = target.url;
      }
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          if (onAddLog) {
            onAddLog(`Reproduzindo MP3: "${target.title}"`, 'Holo-Audio', target.artist);
          }
        })
        .catch((e) => {
          console.warn('Audio play prevented or interrupted:', e);
          setIsPlaying(false);
        });
    }
  };

  // Handle Play
  const handlePlay = () => {
    if (tracks.length === 0) {
      loadAllTracks().then((freshTracks) => {
        if (freshTracks.length > 0) {
          setTracks(freshTracks);
          setCurrentTrackIndex(0);
          const first = freshTracks[0];
          if (audioRef.current && first.url) {
            audioRef.current.src = first.url;
            audioRef.current
              .play()
              .then(() => {
                setIsPlaying(true);
                if (onAddLog) {
                  onAddLog(`Reproduzindo MP3: "${first.title}"`, 'Holo-Audio', first.artist);
                }
              })
              .catch(() => setIsPlaying(false));
          }
        }
      });
      return;
    }

    const trackToPlay = tracks[currentTrackIndex] || tracks[0];
    if (audioRef.current && trackToPlay && trackToPlay.url) {
      if (!audioRef.current.src || audioRef.current.src !== trackToPlay.url) {
        audioRef.current.src = trackToPlay.url;
      }
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          if (onAddLog) {
            onAddLog(`Reproduzindo MP3: "${trackToPlay.title}"`, 'Holo-Audio', trackToPlay.artist);
          }
        })
        .catch((e) => {
          console.warn('Audio play prevented or interrupted:', e);
          setIsPlaying(false);
        });
    }
  };

  // Handle Pause
  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  // Next / Previous Tracks (Aware of active subTab: YouTube or MP3)
  const handleNextTrack = () => {
    if (activeSubTab === 'youtube') {
      if (ytSongs.length === 0) return;
      const currentYtIdx = ytSongs.findIndex((s) => s.videoId === activeYtVideoId);
      const nextIdx = (currentYtIdx + 1) % ytSongs.length;
      const nextSong = ytSongs[nextIdx];
      playYouTubeVideoById(nextSong.videoId, nextSong.title, nextSong.artist);
      return;
    }

    if (tracks.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % tracks.length;
    playTrackAtIndex(nextIdx);
  };

  const handlePrevTrack = () => {
    if (activeSubTab === 'youtube') {
      if (ytSongs.length === 0) return;
      const currentYtIdx = ytSongs.findIndex((s) => s.videoId === activeYtVideoId);
      const prevIdx = (currentYtIdx - 1 + ytSongs.length) % ytSongs.length;
      const prevSong = ytSongs[prevIdx];
      playYouTubeVideoById(prevSong.videoId, prevSong.title, prevSong.artist);
      return;
    }

    if (tracks.length === 0) return;
    const prevIdx = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrackAtIndex(prevIdx);
  };

  // Timeline seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  // Volume slider change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (onVolumeChange) {
      onVolumeChange(Math.round(val * 100));
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioRef.current) {
      audioRef.current.volume = nextMute ? 0 : volume;
    }
  };

  // Upload MP3 File handler (Stores in IndexedDB with ArrayBuffer & Blob)
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (
          file.type.startsWith('audio/') ||
          file.name.endsWith('.mp3') ||
          file.name.endsWith('.wav') ||
          file.name.endsWith('.ogg') ||
          file.name.endsWith('.m4a')
        ) {
          const newTrack = await saveUploadedAudioFile(file, activeUserId, activeUserName);
          setTracks((prev) => [newTrack, ...prev]);
          setUploadSuccess(`Faixa "${newTrack.title}" armazenada na sua biblioteca pessoal (${activeUserName}).`);
          setTimeout(() => setUploadSuccess(null), 6000);
          if (onAddLog) {
            onAddLog(
              `Música MP3 Armazenada: "${newTrack.title}"`,
              'Biblioteca Pessoal',
              `${(file.size / (1024 * 1024)).toFixed(2)} MB`
            );
          }
        }
      }
    } catch (err) {
      console.error('Upload track error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Open modal to edit track title/artist
  const openEditTrackModal = (track: AudioTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTrack(track);
    setModalTrackTitle(track.title);
    setModalTrackArtist(track.artist);
    setModalTrackError(null);
    setIsEditTrackModalOpen(true);
  };

  // Save edited track
  const handleSaveTrackModal = async () => {
    if (!editingTrack) return;
    if (!modalTrackTitle.trim()) {
      setModalTrackError('Por favor, informe o título da música.');
      return;
    }
    const cleanTitle = modalTrackTitle.trim();
    const cleanArtist = modalTrackArtist.trim() || 'Artista';

    try {
      await updateAudioTrack(
        editingTrack.id,
        { title: cleanTitle, artist: cleanArtist },
        activeUserId
      );

      setTracks((prev) =>
        prev.map((t) =>
          t.id === editingTrack.id
            ? { ...t, title: cleanTitle, artist: cleanArtist }
            : t
        )
      );

      if (onAddLog) {
        onAddLog(`Música Editada: "${cleanTitle}"`, 'Playlist Pessoal', activeUserName);
      }

      setIsEditTrackModalOpen(false);
      setEditingTrack(null);
    } catch (err) {
      console.error('Failed to update track:', err);
      setModalTrackError('Erro ao salvar as alterações da faixa.');
    }
  };

  // Reset user's MP3 tracks back to presets
  const handleResetTrackDefaults = async () => {
    if (window.confirm('Deseja restaurar as faixas padrão da sua playlist pessoal?')) {
      const defaults = await resetUserTracksToDefault(activeUserId);
      setTracks(defaults);
      setCurrentTrackIndex(0);
      handlePause();
      if (onAddLog) {
        onAddLog('Faixas MP3 Padrão Restauradas', 'Playlist Pessoal', activeUserName);
      }
    }
  };

  // Delete Track
  const handleDeleteTrack = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteAudioTrack(id);
      setTracks((prev) => prev.filter((t) => t.id !== id));
      if (currentTrack?.id === id) {
        handlePause();
        setCurrentTrackIndex(0);
      }
      if (onAddLog) {
        onAddLog(`Música Removida: "${title}"`, 'Biblioteca Pessoal', activeUserName);
      }
    } catch (err) {
      console.error('Delete track error:', err);
    }
  };

  // Play specific Video by ID (YouTube or Dailymotion)
  const playVideoById = (
    videoId: string,
    title: string,
    artist: string,
    originalUrl?: string,
    platformParam?: 'youtube' | 'dailymotion' | 'direct'
  ) => {
    const rawTarget = originalUrl || videoId;
    const platform = platformParam || detectVideoPlatform(rawTarget);
    setActiveVideoPlatform(platform);

    let cleanId = videoId;
    let embedUrl = '';

    if (platform === 'dailymotion') {
      cleanId = extractDailymotionVideoId(rawTarget);
      embedUrl = `https://www.dailymotion.com/embed/video/${cleanId}?autoplay=1`;
    } else {
      cleanId = extractYouTubeVideoId(videoId) || videoId;
      if (cleanId.includes('search_query=') || cleanId.startsWith('search:') || cleanId.includes('/results')) {
        const q = extractYouTubeSearchQuery(cleanId) || `${title} ${artist}`;
        embedUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(q)}&autoplay=1`;
      } else {
        embedUrl = `https://www.youtube.com/embed/${cleanId}?autoplay=1&rel=0`;
      }
    }

    setActiveYtVideoId(cleanId);
    setActiveYtTitle(title);
    setActiveYtArtist(artist);
    setActiveYtUrl(embedUrl);
    setActiveSubTab('youtube');

    handlePause();

    if (onAddLog) {
      onAddLog(
        `Vídeo Iniciado: "${title}" (${platform === 'dailymotion' ? 'Dailymotion' : 'YouTube'})`,
        platform === 'dailymotion' ? 'Dailymotion Player' : 'YouTube Multimídia',
        `ID: ${cleanId}`
      );
    }
  };

  const playYouTubeVideoById = (videoId: string, title: string, artist: string, originalUrl?: string) => {
    playVideoById(videoId, title, artist, originalUrl);
  };

  // Video Search submit (YouTube or Dailymotion)
  const handleYtSearch = (queryToSearch?: string) => {
    const q = (queryToSearch || ytSearchQuery).trim();
    if (!q) return;

    const platform = detectVideoPlatform(q);

    // If query is a direct Dailymotion URL or ID
    if (platform === 'dailymotion') {
      playVideoById(q, 'Vídeo Dailymotion', 'Dailymotion', q, 'dailymotion');
      return;
    }

    // If query is a direct YouTube URL or ID, play directly
    const extractedId = extractYouTubeVideoId(q);
    if (extractedId && extractedId.length === 11 && extractedId !== q) {
      playVideoById(extractedId, 'Vídeo Personalizado', 'YouTube', q, 'youtube');
      return;
    }

    setActiveVideoPlatform('youtube');
    setActiveYtVideoId('');
    setActiveYtTitle(q);
    setActiveYtArtist('Pesquisa YouTube');
    setActiveYtUrl(`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(q)}&autoplay=1`);
    setActiveSubTab('youtube');

    if (!ytHistory.includes(q)) {
      setYtHistory((prev) => [q, ...prev.slice(0, 9)]);
    }
    if (onAddLog) {
      onAddLog(`Pesquisa no YouTube: "${q}"`, 'YouTube Multimídia', 'Player Integrado');
    }
  };

  // Open modal to Add a new Video link
  const openAddModal = () => {
    setEditingSongId(null);
    setModalTitle('');
    setModalArtist('');
    setModalUrlOrId('');
    setModalPlatform('youtube');
    setModalCategory('Rock Clássico');
    setModalDescription('');
    setModalError(null);
    setIsEditModalOpen(true);
  };

  // Open modal to Edit existing Video
  const openEditModal = (song: YouTubeSongItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSongId(song.id);
    setModalTitle(song.title);
    setModalArtist(song.artist);
    setModalUrlOrId(song.originalUrl || song.videoId);
    setModalPlatform(song.platform || detectVideoPlatform(song.originalUrl || song.videoId));
    setModalCategory(song.category);
    setModalDescription(song.description || '');
    setModalError(null);
    setIsEditModalOpen(true);
  };

  // Save changes from Video Modal (Add or Edit)
  const handleSaveModal = () => {
    if (!modalTitle.trim()) {
      setModalError('Por favor, informe o título da música ou vídeo.');
      return;
    }
    const inputVal = modalUrlOrId.trim();
    if (!inputVal) {
      setModalError('Por favor, informe o link ou ID do vídeo (YouTube ou Dailymotion).');
      return;
    }

    const platform = modalPlatform || detectVideoPlatform(inputVal);
    let cleanVideoId = '';

    if (platform === 'dailymotion') {
      cleanVideoId = extractDailymotionVideoId(inputVal);
      if (!cleanVideoId) {
        setModalError('Link do Dailymotion inválido.');
        return;
      }
    } else {
      cleanVideoId = extractYouTubeVideoId(inputVal);
      if (!cleanVideoId) {
        setModalError('Link ou ID do vídeo do YouTube inválido.');
        return;
      }
    }

    const isUrl = inputVal.startsWith('http://') || inputVal.startsWith('https://');

    if (editingSongId) {
      const existing = ytSongs.find((s) => s.id === editingSongId);
      const updated = ytSongs.map((s) =>
        s.id === editingSongId
          ? {
              ...s,
              title: modalTitle.trim(),
              artist: modalArtist.trim() || (platform === 'dailymotion' ? 'Dailymotion' : 'YouTube'),
              videoId: cleanVideoId,
              originalUrl: isUrl ? inputVal : existing?.originalUrl,
              platform,
              category: modalCategory.trim() || 'Personalizado',
              description: modalDescription.trim(),
              userId: activeUserId,
              addedByUser: true,
            }
          : s
      );
      setYtSongs(updated);
      saveYouTubeSongs(updated, activeUserId);
      if (onAddLog) {
        onAddLog(`Link de Vídeo Atualizado: "${modalTitle}"`, 'Galeria de Vídeos', cleanVideoId);
      }
    } else {
      const newSong: YouTubeSongItem = {
        id: `vid-custom-${Date.now()}`,
        userId: activeUserId,
        title: modalTitle.trim(),
        artist: modalArtist.trim() || (platform === 'dailymotion' ? 'Dailymotion' : 'YouTube'),
        videoId: cleanVideoId,
        originalUrl: isUrl ? inputVal : undefined,
        platform,
        category: modalCategory.trim() || 'Personalizado',
        description: modalDescription.trim(),
        addedByUser: true,
        source: 'manual_entry',
      };
      const updated = [newSong, ...ytSongs];
      setYtSongs(updated);
      saveYouTubeSongs(updated, activeUserId);
      if (onAddLog) {
        onAddLog(`Novo Vídeo Cadastrado (${platform}): "${modalTitle}"`, 'Galeria de Vídeos', cleanVideoId);
      }
    }

    setIsEditModalOpen(false);
  };

  // Save manual MP3 Stream URL
  const handleSaveMp3UrlModal = async () => {
    if (!modalMp3Title.trim() || !modalMp3Url.trim()) {
      setModalMp3Error('Título e URL do arquivo de áudio MP3 são obrigatórios.');
      return;
    }

    try {
      const newTrack = await saveDirectUrlTrack(
        activeUserId,
        modalMp3Title.trim(),
        modalMp3Artist.trim() || 'Artista',
        modalMp3Url.trim(),
        modalMp3Genre.trim() || 'Geral'
      );
      setTracks((prev) => [newTrack, ...prev]);
      setUploadSuccess(`Faixa "${newTrack.title}" adicionada com sucesso à sua biblioteca.`);
      setTimeout(() => setUploadSuccess(null), 5000);
      setIsAddMp3UrlModalOpen(false);
      setModalMp3Title('');
      setModalMp3Artist('');
      setModalMp3Url('');
      if (onAddLog) {
        onAddLog(`Música Adicionada por Link: "${newTrack.title}"`, 'Biblioteca MP3', activeUserName);
      }
    } catch (err: any) {
      setModalMp3Error('Erro ao registrar link de áudio na base durável.');
    }
  };

  // Download Sample JSON template
  const downloadSampleJsonTemplate = () => {
    const jsonStr = generateMediaImportSampleJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_midias.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle bulk JSON input change and live validation
  const handleBulkJsonChange = (text: string) => {
    setBulkJsonInput(text);
    if (!text.trim()) {
      setBulkValidation(null);
      return;
    }
    const val = parseAndValidateMediaImportJson(text, activeUserId);
    setBulkValidation(val);
  };

  // Handle file upload for bulk JSON
  const handleBulkJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        handleBulkJsonChange(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute bulk import
  const handleExecuteBulkImport = async () => {
    if (!bulkValidation || !bulkValidation.success) return;
    setIsImportingBulk(true);
    try {
      const result = await importBulkMediaItems(
        activeUserId,
        bulkValidation.mp3s,
        bulkValidation.videos
      );
      if (result.addedTracks.length > 0) {
        setTracks((prev) => [...result.addedTracks, ...prev]);
      }
      if (result.addedVideos.length > 0) {
        setYtSongs((prev) => [...result.addedVideos, ...prev]);
      }
      setBulkImportNotice(
        `Importação concluída com sucesso! ${result.addedTracks.length} faixas MP3 e ${result.addedVideos.length} links de vídeos vinculados à biblioteca de ${activeUserName}.`
      );
      setTimeout(() => {
        setIsBulkImportModalOpen(false);
        setBulkImportNotice(null);
        setBulkJsonInput('');
        setBulkValidation(null);
      }, 3500);
      if (onAddLog) {
        onAddLog(
          `Importação em Massa via JSON`,
          'Biblioteca Individual',
          `${result.addedTracks.length} MP3s, ${result.addedVideos.length} Vídeos`
        );
      }
    } catch (err: any) {
      setBulkValidation((prev) => prev ? { ...prev, error: `Falha na importação: ${err?.message || 'Erro de gravação'}` } : null);
    } finally {
      setIsImportingBulk(false);
    }
  };

  // Delete YouTube suggestion
  const handleDeleteYtSong = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = ytSongs.filter((s) => s.id !== id);
    setYtSongs(updated);
    saveYouTubeSongs(updated, activeUserId);
    if (onAddLog) {
      onAddLog(`Música Removida da Lista: "${title}"`, 'Playlist YouTube Pessoal', activeUserName);
    }
  };

  // Reset YouTube list back to default factory items for this user
  const handleResetDefaults = () => {
    if (window.confirm('Deseja restaurar as sugestões padrão da sua playlist do YouTube?')) {
      const defaults = resetYouTubeSongsToDefault(activeUserId);
      setYtSongs(defaults);
      if (onAddLog) {
        onAddLog('Sugestões do YouTube Restauradas para o Padrão', 'Playlist YouTube Pessoal', activeUserName);
      }
    }
  };

  // ==========================================
  // DRAG & DROP / REORDER YOUTUBE CARDS
  // ==========================================
  const handleDragStart = (e: React.DragEvent, songId: string) => {
    setDraggedSongId(songId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', songId);
  };

  const handleDragOver = (e: React.DragEvent, targetSongId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSongId !== targetSongId) {
      setDragOverSongId(targetSongId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetSongId: string) => {
    e.preventDefault();
    if (dragOverSongId === targetSongId) {
      setDragOverSongId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetSongId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedSongId;
    if (!sourceId || sourceId === targetSongId) {
      setDraggedSongId(null);
      setDragOverSongId(null);
      return;
    }

    const sourceIndex = ytSongs.findIndex((s) => s.id === sourceId);
    const targetIndex = ytSongs.findIndex((s) => s.id === targetSongId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const updatedSongs = [...ytSongs];
      const [movedItem] = updatedSongs.splice(sourceIndex, 1);
      updatedSongs.splice(targetIndex, 0, movedItem);

      setYtSongs(updatedSongs);
      saveYouTubeSongs(updatedSongs, activeUserId);

      setReorderNotice(`"${movedItem.title}" movido para a posição #${targetIndex + 1}!`);
      setTimeout(() => setReorderNotice(null), 3500);

      if (onAddLog) {
        onAddLog('Card do YouTube Reordenado', 'Playlist YouTube', `"${movedItem.title}" movido para #${targetIndex + 1}`);
      }
    }

    setDraggedSongId(null);
    setDragOverSongId(null);
  };

  const handleDragEnd = () => {
    setDraggedSongId(null);
    setDragOverSongId(null);
  };

  // Quick 1-step move button (Left / Right)
  const handleMoveSong = (songId: string, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = ytSongs.findIndex((s) => s.id === songId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= ytSongs.length) return;

    const updatedSongs = [...ytSongs];
    const [movedItem] = updatedSongs.splice(currentIndex, 1);
    updatedSongs.splice(targetIndex, 0, movedItem);

    setYtSongs(updatedSongs);
    saveYouTubeSongs(updatedSongs, activeUserId);

    setReorderNotice(`"${movedItem.title}" movido para a posição #${targetIndex + 1}!`);
    setTimeout(() => setReorderNotice(null), 3500);

    if (onAddLog) {
      onAddLog('Card do YouTube Reordenado', 'Playlist YouTube', `"${movedItem.title}" movido para #${targetIndex + 1}`);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filter Video songs by category and platform (YouTube & Dailymotion)
  const categories = ['Todos', ...Array.from(new Set(ytSongs.map((s) => s.category)))];
  const filteredYtSongs = ytSongs.filter((s) => {
    const matchesCat = selectedCategory === 'Todos' || s.category === selectedCategory;
    const matchesPlat =
      selectedPlatformFilter === 'Todos' ||
      (selectedPlatformFilter === 'dailymotion' && s.platform === 'dailymotion') ||
      (selectedPlatformFilter === 'youtube' && (!s.platform || s.platform === 'youtube'));
    return matchesCat && matchesPlat;
  });

  // Quick Web Links Catalog
  const webLinksCatalog = [
    {
      name: 'YouTube',
      url: 'https://www.youtube.com',
      icon: <Youtube className="w-6 h-6 text-red-400" />,
      color: 'border-red-500/40 bg-red-500/10 text-red-300 hover:border-red-500',
      desc: 'Vídeos, músicas e transmissões ao vivo',
    },
    {
      name: 'Google Search',
      url: 'https://www.google.com',
      icon: <Search className="w-6 h-6 text-blue-400" />,
      color: 'border-blue-500/40 bg-blue-500/10 text-blue-300 hover:border-blue-500',
      desc: 'Pesquisa e informações na web global',
    },
    {
      name: 'Spotify Web',
      url: 'https://open.spotify.com',
      icon: <Disc className="w-6 h-6 text-emerald-400" />,
      color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500',
      desc: 'Playlists, artistas e álbuns favoritos',
    },
    {
      name: 'WhatsApp Web',
      url: 'https://web.whatsapp.com',
      icon: <Share2 className="w-6 h-6 text-green-400" />,
      color: 'border-green-500/40 bg-green-500/10 text-green-300 hover:border-green-500',
      desc: 'Mensagens instantâneas e automações',
    },
    {
      name: 'GitHub',
      url: 'https://github.com',
      icon: <Globe className="w-6 h-6 text-purple-400" />,
      color: 'border-purple-500/40 bg-purple-500/10 text-purple-300 hover:border-purple-500',
      desc: 'Repositórios de código e projetos',
    },
    {
      name: 'ChatGPT / IA',
      url: 'https://chat.openai.com',
      icon: <Sparkles className="w-6 h-6 text-cyan-400" />,
      color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:border-cyan-500',
      desc: 'Modelos de linguagem e assistência',
    },
  ];

  return (
    <div className="h-full flex flex-col gap-5 overflow-y-auto pr-1 pb-10">
      {/* Hidden Audio Element */}
      {currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.url}
          loop={isLooping}
          onError={(e) => {
            console.warn('Audio tag playback error safely intercepted:', e);
            setIsPlaying(false);
          }}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
              setDuration(audioRef.current.duration || currentTrack.duration);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration || currentTrack.duration);
            }
          }}
          onEnded={handleNextTrack}
        />
      )}

      {/* Top Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0B0E14]/90 border border-slate-800 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-600/30 to-[#00F0FF]/30 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <Music className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-orbitron font-extrabold text-base text-slate-100 flex items-center gap-2 tracking-wide">
              CENTRO DE MÍDIA & HOLO-AUDIO
              <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 text-[10px] font-mono border border-fuchsia-500/30">
                MP3 PERSISTENTE + YOUTUBE EDITÁVEL
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Upload e armazenamento durável de MP3, player com links do YouTube editáveis e controle por voz
            </p>
          </div>
        </div>

        {/* Sub-Tab Selector & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
            <button
              onClick={() => setActiveSubTab('player')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                activeSubTab === 'player'
                  ? 'bg-gradient-to-r from-fuchsia-600/30 to-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/50 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Disc className="w-4 h-4" />
              <span>Reprodutor MP3</span>
            </button>

            <button
              onClick={() => setActiveSubTab('youtube')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                activeSubTab === 'youtube'
                  ? 'bg-gradient-to-r from-red-600/30 to-orange-600/25 text-red-400 border border-red-500/50 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Vídeos (YouTube & Dailymotion)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('weblinks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                activeSubTab === 'weblinks'
                  ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/25 text-blue-300 border border-blue-500/50 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Abas & Sites</span>
            </button>
          </div>

          {/* Bulk Import JSON Button */}
          <button
            type="button"
            onClick={() => {
              setIsBulkImportModalOpen(true);
              if (!bulkJsonInput) {
                setBulkJsonInput(generateMediaImportSampleJson());
                setBulkValidation(parseAndValidateMediaImportJson(generateMediaImportSampleJson(), activeUserId));
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-[#00F0FF] border border-[#00F0FF]/40 font-bold transition-all shadow-sm cursor-pointer"
            title="Importar músicas MP3 e links de vídeos em massa via arquivo JSON"
          >
            <UploadCloud className="w-4 h-4 text-[#00F0FF]" />
            <span>Importar JSON em Massa</span>
          </button>

          {/* Voice Help Toggle */}
          <button
            type="button"
            onClick={() => setShowVoiceHelp(!showVoiceHelp)}
            className={`p-2 rounded-xl border text-xs font-mono transition-colors flex items-center gap-1.5 ${
              showVoiceHelp
                ? 'bg-[#00F0FF]/20 border-[#00F0FF]/60 text-[#00F0FF]'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Ver guia de comandos de voz para áudio e vídeos"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Comandos</span>
          </button>

          {/* Save Vault Button */}
          {onSaveSystem && (
            <div className="flex items-center gap-2">
              {lastSavedTimestamp && (
                <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1.5 rounded-lg bg-slate-900/80 text-slate-300 border border-slate-800">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>{lastSavedTimestamp}</span>
                </span>
              )}
              <button
                type="button"
                onClick={onSaveSystem}
                disabled={isSaving}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-orbitron font-bold text-xs tracking-wider transition-all shadow-md ${
                  isDirty
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
                    : 'bg-[#121824] border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/15 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                }`}
                title="Armazenar alterações e biblioteca no cofre criptografado"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>SALVANDO...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isDirty ? 'SALVAR NO COFRE *' : 'SALVAR NO COFRE'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Voice Commands Guia Rápido HUD */}
      {showVoiceHelp && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0B0E14] via-[#121824] to-[#0B0E14] border border-cyan-500/40 text-xs font-mono shadow-[0_0_25px_rgba(0,240,255,0.12)] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#00F0FF] animate-pulse" />
              <span className="font-orbitron font-bold text-slate-100 tracking-wider text-[11px]">
                COMANDOS DE VOZ SUPORTADOS (PRECISÃO ALTA)
              </span>
            </div>
            <button
              onClick={() => setShowVoiceHelp(false)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-slate-300">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-red-400 font-bold mb-1 flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5" />
                <span>YouTube</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-400">
                <li>• "Tocar no YouTube Iron Man"</li>
                <li>• "Tocar música Legião Urbana"</li>
                <li>• "Tocar no YouTube Alok"</li>
                <li>• "Abrir YouTube"</li>
              </ul>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-fuchsia-400 font-bold mb-1 flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5" />
                <span>MP3 & Local</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-400">
                <li>• "Tocar MP3"</li>
                <li>• "Tocar faixa Stark Industries"</li>
                <li>• "Solta o som"</li>
                <li>• "Abrir minhas músicas"</li>
              </ul>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[#00F0FF] font-bold mb-1 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" />
                <span>Controles</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-400">
                <li>• "Pausar som" / "Continuar som"</li>
                <li>• "Próxima música" / "Voltar faixa"</li>
                <li>• "Mutar áudio" / "Desmutar"</li>
                <li>• "Parar música"</li>
              </ul>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Salvar Sistema</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-400">
                <li>• "Salvar sistema"</li>
                <li>• "Salvar tudo"</li>
                <li>• "Salvar no cofre"</li>
                <li>• "Fazer backup agora"</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upload Notification Alert */}
      {uploadSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono animate-in fade-in duration-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. HOLO-AUDIO MP3 PLAYER TAB                             */}
      {/* ======================================================== */}
      {activeSubTab === 'player' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Player Box (Left 7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Visualizer & Playing Card */}
            <div className="relative p-6 rounded-2xl bg-gradient-to-b from-[#121824]/95 to-[#0B0E14] border border-[#00F0FF]/30 shadow-[0_0_30px_rgba(0,240,255,0.12)] overflow-hidden">
              {/* Header inside Card */}
              <div className="relative z-10 flex items-center justify-between mb-4">
                <span className="flex items-center gap-2 text-xs font-mono text-[#00F0FF] uppercase tracking-wider font-semibold">
                  <Radio className="w-4 h-4 animate-pulse text-[#00F0FF]" />
                  JARVES HOLO-AUDIO SYSTEM
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                  {currentTrack?.category === 'uploaded' ? 'Arquivo MP3 Salvo no Banco' : 'Preset Stark'}
                </span>
              </div>

              {/* Reactive Holographic Canvas Spectrum */}
              <div className="relative z-10 my-4 h-28 bg-black/50 rounded-xl border border-slate-800/80 overflow-hidden backdrop-blur-sm">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={112}
                  className="w-full h-full block"
                />
              </div>

              {/* Track Title & Artist */}
              <div className="relative z-10 text-center my-3">
                <h3 className="font-orbitron font-bold text-lg text-slate-100 tracking-wide truncate">
                  {currentTrack ? currentTrack.title : 'Nenhuma faixa selecionada'}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {currentTrack ? currentTrack.artist : 'Selecione ou faça upload de um MP3'}
                </p>
              </div>

              {/* Timeline Progress Bar */}
              <div className="relative z-10 mt-5 space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={duration || currentTrack?.duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
                />
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration || currentTrack?.duration || 0)}</span>
                </div>
              </div>

              {/* Playback Controls Bar */}
              <div className="relative z-10 flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={`p-2 rounded-lg transition-colors ${
                      isLooping
                        ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Repetir faixa"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrevTrack}
                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700"
                    title="Faixa anterior"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="p-4 rounded-2xl bg-gradient-to-r from-[#00F0FF] to-fuchsia-500 text-black font-bold shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-105 transition-all"
                    title={isPlaying ? 'Pausar' : 'Reproduzir'}
                  >
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                  </button>

                  <button
                    onClick={handleNextTrack}
                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700"
                    title="Próxima faixa"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
                    title="Volume do Reprodutor"
                  />
                </div>
              </div>
            </div>

            {/* Quick Voice Command Triggers for Music */}
            <div className="p-4 rounded-xl bg-[#0B0E14]/80 border border-slate-800 flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1 mr-2">
                <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
                Comandos de Voz para Mídia:
              </span>
              {[
                'Tocar música',
                'Pausar música',
                'Próxima faixa',
                'Tocar Back in Black',
                'Aumentar volume',
              ].map((cmd) => (
                <span
                  key={cmd}
                  className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
                >
                  "{cmd}"
                </span>
              ))}
            </div>
          </div>

          {/* Playlist & Upload Area (Right 5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Upload MP3 Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              className="p-5 rounded-2xl bg-[#121824]/90 border border-dashed border-[#00F0FF]/40 hover:border-[#00F0FF] transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF] group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <span className="font-orbitron font-bold text-xs text-slate-100 block">
                  FAZER UPLOAD DE MÚSICAS MP3
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Arraste arquivos ou clique para selecionar (.mp3, .wav, .m4a)
                </p>
                <p className="text-[10px] text-cyan-400/90 font-mono mt-1">
                  ✓ Armazenamento durável no IndexedDB — persistido entre sessões!
                </p>
              </div>
              {isUploading && (
                <div className="flex items-center gap-2 text-xs text-[#00F0FF] font-mono">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Indexando e gravando áudio na memória durável...
                </div>
              )}
            </div>

            {/* Quick Actions for MP3: Direct URL Link & Bulk JSON */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddMp3UrlModalOpen(true)}
                className="py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-cyan-300 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#00F0FF]" />
                <span>+ Adicionar MP3 por Link Direto</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsBulkImportModalOpen(true);
                  if (!bulkJsonInput) {
                    setBulkJsonInput(generateMediaImportSampleJson());
                    setBulkValidation(parseAndValidateMediaImportJson(generateMediaImportSampleJson(), activeUserId));
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500/15 to-fuchsia-500/15 hover:from-cyan-500/25 hover:to-fuchsia-500/25 border border-cyan-500/40 text-slate-200 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <span>Importação em Massa (JSON)</span>
              </button>
            </div>

            {/* Track List */}
            <div className="p-4 rounded-2xl bg-[#0B0E14]/90 border border-slate-800 flex-1 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-fuchsia-400" />
                  <h4 className="font-orbitron font-bold text-xs text-slate-200">
                    PLAYLIST PESSOAL ({tracks.length})
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {activeUserName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetTrackDefaults}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                    title="Restaurar faixas padrão para sua playlist pessoal"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar Padrão</span>
                  </button>
                  <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">Clique para tocar</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 max-h-[380px] pr-1">
                {tracks.map((track, idx) => {
                  const isCurrent = currentTrackIndex === idx;
                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        setCurrentTrackIndex(idx);
                        setTimeout(() => handlePlay(), 100);
                      }}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isCurrent
                          ? 'bg-[#00F0FF]/15 border-[#00F0FF]/60 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? 'bg-[#00F0FF] text-black font-bold'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isCurrent && isPlaying ? (
                            <Radio className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-[#00F0FF]' : 'text-slate-200'}`}>
                            {track.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span>{track.artist}</span>
                            <span>•</span>
                            <span>{formatTime(track.duration)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Edit Track Button */}
                        <button
                          onClick={(e) => openEditTrackModal(track, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                          title="Editar título e artista da faixa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Track Button */}
                        <button
                          onClick={(e) => handleDeleteTrack(track.id, track.title, e)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remover faixa da sua playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                            track.category === 'uploaded'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          }`}
                        >
                          {track.category === 'uploaded' ? 'MP3 SALVO' : 'PRESET'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {tracks.length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-xs font-mono">
                    Nenhuma faixa cadastrada. Faça upload de um arquivo MP3 acima.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. YOUTUBE SEARCH & VIDEO PLAYBACK TAB                    */}
      {/* ======================================================== */}
      {activeSubTab === 'youtube' && (
        <div className="flex flex-col gap-5">
          {/* Top Player & Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Embedded Responsive Player (Left 8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Search Bar with URL & Query recognition */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#121824] border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                <Youtube className="w-5 h-5 text-red-500 ml-2 shrink-0" />
                <input
                  type="text"
                  value={ytSearchQuery}
                  onChange={(e) => setYtSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleYtSearch()}
                  placeholder="Pesquisar música ou colar link do YouTube (ex: https://youtube.com/watch?v=...)..."
                  className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
                />
                <button
                  onClick={() => handleYtSearch()}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar</span>
                </button>
              </div>

              {/* Responsive Player Box */}
              <div className="relative aspect-video rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl">
                <iframe
                  src={activeYtUrl}
                  title="YouTube Video Player JARVES"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Active Video Info Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0B0E14]/90 border border-slate-800 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 truncate">{activeYtTitle}</p>
                    <p className="text-[11px] font-mono text-slate-400">{activeYtArtist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      window.open(
                        activeYtVideoId
                          ? `https://www.youtube.com/watch?v=${activeYtVideoId}`
                          : `https://www.youtube.com/results?search_query=${encodeURIComponent(ytSearchQuery)}`,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all font-mono text-[11px]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Assistir no YouTube</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions & Search History (Right 4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Add & Edit Shortcuts */}
              <div className="p-4 rounded-2xl bg-[#0B0E14]/90 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-slate-200">
                    <Sparkles className="w-4 h-4 text-red-400" />
                    GERENCIAR VÍDEOS & LINKS
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Adicione seus próprios clipes e links de músicas do YouTube para tocar diretamente pelo painel ou por voz!
                </p>

                <button
                  onClick={openAddModal}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600/30 to-orange-600/30 hover:from-red-600/50 hover:to-orange-600/50 border border-red-500/50 text-red-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Adicionar Novo Link de Música</span>
                </button>

                <button
                  onClick={handleResetDefaults}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Músicas Sugeridas Padrão</span>
                </button>
              </div>

              {/* Voice Command Suggestions */}
              <div className="p-4 rounded-2xl bg-[#0B0E14]/90 border border-slate-800 flex flex-col gap-2.5">
                <div className="text-xs font-mono text-slate-300 flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-red-400" />
                  Exemplos de Comandos por Voz:
                </div>
                <div className="space-y-1.5">
                  {[
                    'JARVES, tocar Back in Black',
                    'JARVES, tocar Iron Man',
                    'JARVES, tocar Cyberpunk',
                    'JARVES, tocar Lofi',
                    'JARVES, pesquisar no YouTube Sertanejo',
                  ].map((v, i) => (
                    <div
                      key={i}
                      onClick={() => handleYtSearch(v.replace(/JARVES,\s*tocar\s*|JARVES,\s*pesquisar\s*no\s*YouTube\s*/i, ''))}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px] font-mono text-slate-300 hover:text-red-300 hover:border-red-500/40 cursor-pointer transition-colors"
                    >
                      "{v}"
                    </div>
                  ))}
                </div>
              </div>

              {/* Search History */}
              <div className="p-4 rounded-2xl bg-[#0B0E14]/90 border border-slate-800 flex flex-col gap-2">
                <div className="text-xs font-mono text-slate-400">Histórico Recente:</div>
                <div className="flex flex-wrap gap-1.5">
                  {ytHistory.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setYtSearchQuery(item);
                        handleYtSearch(item);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700/80 truncate max-w-full"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* CURATED & USER-EDITABLE YOUTUBE SONGS CATALOG             */}
          {/* ======================================================== */}
          <div className="p-5 rounded-2xl bg-[#0B0E14]/90 border border-slate-800 flex flex-col gap-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-red-500" />
                  <h3 className="font-orbitron font-extrabold text-sm text-slate-100 tracking-wide">
                    BIBLIOTECA DE VÍDEOS & MÚSICAS DO YOUTUBE ({ytSongs.length})
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-300 border border-red-500/30">
                    {activeUserName}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Playlist personalizada e independente: edite títulos, adicione seus links ou remova itens sem afetar outros usuários.
                </p>
              </div>

              {/* Reset to Factory Defaults + Platform & Category Filter Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={handleResetDefaults}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                  title="Restaurar sugestões padrão do YouTube para sua playlist"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar Padrão</span>
                </button>

                {/* Platform Filter Buttons */}
                <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setSelectedPlatformFilter('Todos')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                      selectedPlatformFilter === 'Todos'
                        ? 'bg-slate-700 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setSelectedPlatformFilter('youtube')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                      selectedPlatformFilter === 'youtube'
                        ? 'bg-red-600 text-white font-bold shadow-sm'
                        : 'text-red-400/80 hover:text-red-300'
                    }`}
                  >
                    <Youtube className="w-3 h-3" />
                    YouTube
                  </button>
                  <button
                    onClick={() => setSelectedPlatformFilter('dailymotion')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                      selectedPlatformFilter === 'dailymotion'
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'text-blue-400/80 hover:text-blue-300'
                    }`}
                  >
                    <Film className="w-3 h-3" />
                    Dailymotion
                  </button>
                </div>

                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                      selectedCategory === cat
                        ? 'bg-red-600 text-white font-bold shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Reorder Notification Toast / Helper Banner */}
            {reorderNotice && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-mono animate-in fade-in shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
                <span className="font-bold">{reorderNotice}</span>
              </div>
            )}

            {/* Drag & Drop Instructions Hint */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-[#00F0FF] shrink-0" />
                <span>
                  <strong className="text-slate-200">Organize sua Playlist:</strong> Segure qualquer card com o mouse (Grab & Move) e arraste para a posição desejada, ou use os botões <span className="text-[#00F0FF] font-mono">◀ ▶</span> em cada card.
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                Ordem salva automaticamente
              </span>
            </div>

            {/* Video Cards Grid with Drag & Drop Reordering */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredYtSongs.map((song) => {
                const isCurrent = activeYtVideoId === song.videoId;
                const platform = song.platform || (song.originalUrl?.includes('dailymotion.com') ? 'dailymotion' : 'youtube');
                const isDailymotion = platform === 'dailymotion';
                const isCleanYtId = !isDailymotion && /^[a-zA-Z0-9_-]{11}$/.test(song.videoId);
                const thumbUrl = isDailymotion
                  ? `https://www.dailymotion.com/thumbnail/video/${song.videoId}`
                  : isCleanYtId
                  ? `https://img.youtube.com/vi/${song.videoId}/mqdefault.jpg`
                  : '';
                const realIndex = ytSongs.findIndex((s) => s.id === song.id);
                const isBeingDragged = draggedSongId === song.id;
                const isDragTarget = dragOverSongId === song.id && !isBeingDragged;

                return (
                  <div
                    key={song.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, song.id)}
                    onDragOver={(e) => handleDragOver(e, song.id)}
                    onDragLeave={(e) => handleDragLeave(e, song.id)}
                    onDrop={(e) => handleDrop(e, song.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => playVideoById(song.videoId, song.title, song.artist, song.originalUrl, platform)}
                    className={`group rounded-xl border transition-all cursor-pointer overflow-hidden flex flex-col justify-between bg-slate-900/60 relative ${
                      isBeingDragged
                        ? 'opacity-35 scale-95 border-2 border-dashed border-[#00F0FF] shadow-2xl ring-2 ring-[#00F0FF]/30'
                        : isDragTarget
                        ? 'border-2 border-[#00F0FF] bg-[#00F0FF]/15 shadow-[0_0_30px_rgba(0,240,255,0.45)] ring-2 ring-[#00F0FF] scale-[1.02]'
                        : isCurrent
                        ? isDailymotion
                          ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-blue-950/20'
                          : 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.25)] bg-red-950/20'
                        : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    {/* Top Grab Handle & Position Bar */}
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="flex items-center justify-between px-2.5 py-1.5 bg-black/60 backdrop-blur-md border-b border-slate-800/80 text-[10px] font-mono z-10"
                    >
                      <div 
                        className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing text-slate-400 hover:text-[#00F0FF] transition-colors py-0.5"
                        title="Segure com o mouse e arraste para mudar a posição"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-[#00F0FF]" />
                        <span className="font-bold text-[#00F0FF]">#{realIndex + 1}</span>
                        <span className="text-slate-500 hidden sm:inline">Arraste</span>
                      </div>

                      {/* Quick Move Arrows */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={realIndex === 0}
                          onClick={(e) => handleMoveSong(song.id, 'left', e)}
                          className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 disabled:opacity-25 disabled:hover:bg-slate-800/80 text-slate-300 hover:text-white transition-colors"
                          title="Mover card para a esquerda / posição anterior"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={realIndex === ytSongs.length - 1}
                          onClick={(e) => handleMoveSong(song.id, 'right', e)}
                          className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 disabled:opacity-25 disabled:hover:bg-slate-800/80 text-slate-300 hover:text-white transition-colors"
                          title="Mover card para a direita / próxima posição"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail with overlay play */}
                    <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden flex items-center justify-center">
                      {thumbUrl && (
                        <img
                          src={thumbUrl}
                          alt={song.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                      {!thumbUrl && (
                        <div className="flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                          <Film className="w-8 h-8 text-cyan-500/60 mb-1" />
                          <span className="text-[11px] font-mono text-slate-300 line-clamp-1">{song.title}</span>
                          <span className="text-[9px] font-mono text-slate-500">{song.artist}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                      {/* Play Badge */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                            isCurrent
                              ? isDailymotion
                                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                : 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                              : 'bg-black/60 text-white border border-white/30 backdrop-blur-sm'
                          }`}
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Platform Badge */}
                      <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                        isDailymotion
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-red-600 text-white shadow-sm'
                      }`}>
                        {isDailymotion ? 'DAILYMOTION' : 'YOUTUBE'}
                      </span>

                      {/* Category Tag */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-red-300 text-[10px] font-mono border border-red-500/30">
                        {song.category}
                      </span>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3.5 flex flex-col justify-between gap-2.5 flex-1">
                      <div>
                        <h4 className="font-semibold text-xs text-slate-100 group-hover:text-red-300 transition-colors line-clamp-1">
                          {song.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 line-clamp-1">
                          {song.artist}
                        </p>
                        {song.description && (
                          <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                            {song.description}
                          </p>
                        )}
                      </div>

                      {/* Card Bottom Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-auto">
                        <span className="text-[9px] font-mono text-slate-500 truncate max-w-[120px]" title={song.originalUrl || song.videoId}>
                          {song.originalUrl ? (isDailymotion ? 'Dailymotion' : 'YouTube') : `ID: ${song.videoId}`}
                        </span>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* Direct External Link */}
                          <a
                            href={
                              song.originalUrl ||
                              (isDailymotion
                                ? `https://www.dailymotion.com/video/${song.videoId}`
                                : `https://www.youtube.com/watch?v=${song.videoId}`)
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                            title={isDailymotion ? 'Abrir no Dailymotion' : 'Abrir no YouTube'}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* Edit Button */}
                          <button
                            onClick={(e) => openEditModal(song, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                            title="Editar Link / Informações"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={(e) => handleDeleteYtSong(song.id, song.title, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remover da lista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. WEB LINKS & SITES TAB                                 */}
      {/* ======================================================== */}
      {activeSubTab === 'weblinks' && (
        <div className="flex flex-col gap-5">
          <div className="p-4 rounded-2xl bg-[#121824]/80 border border-slate-800 text-xs text-slate-300">
            Diga comandos como:{' '}
            <span className="text-[#00F0FF] font-mono">"JARVES, abrir o site do Spotify"</span>,{' '}
            <span className="text-[#00F0FF] font-mono">"Pesquisar no Google sobre inteligência artificial"</span> ou{' '}
            <span className="text-[#00F0FF] font-mono">"Abrir link do GitHub"</span>.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {webLinksCatalog.map((link) => (
              <div
                key={link.name}
                onClick={() => {
                  window.open(link.url, '_blank', 'noopener,noreferrer');
                  if (onAddLog) onAddLog(`Abrindo link: ${link.name}`, 'Navegador Web', link.url);
                }}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 group ${link.color}`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 group-hover:scale-110 transition-transform">
                    {link.icon}
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                </div>

                <div>
                  <h4 className="font-orbitron font-bold text-sm text-white">{link.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{link.desc}</p>
                  <p className="text-[11px] font-mono text-slate-500 mt-2 truncate">{link.url}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT VIDEO LINK (YOUTUBE / DAILYMOTION)     */}
      {/* ======================================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#121824] border border-cyan-500/40 p-6 shadow-2xl flex flex-col gap-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {modalPlatform === 'dailymotion' ? (
                  <Film className="w-5 h-5 text-blue-400" />
                ) : (
                  <Youtube className="w-5 h-5 text-red-500" />
                )}
                <h3 className="font-orbitron font-bold text-sm text-slate-100">
                  {editingSongId ? 'EDITAR LINK DE VÍDEO' : 'ADICIONAR MÚSICA / VÍDEO (YOUTUBE / DAILYMOTION)'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono">
                {modalError}
              </div>
            )}

            {/* Platform Selector Buttons */}
            <div>
              <label className="block text-slate-300 font-mono mb-1 text-xs">
                Plataforma de Vídeo
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModalPlatform('youtube')}
                  className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ${
                    modalPlatform === 'youtube'
                      ? 'bg-red-600 text-white border-red-500 shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Youtube className="w-4 h-4" />
                  <span>YouTube</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalPlatform('dailymotion')}
                  className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ${
                    modalPlatform === 'dailymotion'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Film className="w-4 h-4" />
                  <span>Dailymotion</span>
                </button>
              </div>
            </div>

            {/* Modal Fields */}
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono mb-1">
                  Título da Música / Vídeo *
                </label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="Ex: Back in Black, Sweet Child O' Mine..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">
                  Artista / Canal
                </label>
                <input
                  type="text"
                  value={modalArtist}
                  onChange={(e) => setModalArtist(e.target.value)}
                  placeholder="Ex: AC/DC, Iron Maiden, Dailymotion Creator..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">
                  Link Completo ou ID do Vídeo *
                </label>
                <input
                  type="text"
                  value={modalUrlOrId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setModalUrlOrId(val);
                    if (val.toLowerCase().includes('dailymotion') || val.toLowerCase().includes('dai.ly')) {
                      setModalPlatform('dailymotion');
                    } else if (val.toLowerCase().includes('youtube') || val.toLowerCase().includes('youtu.be')) {
                      setModalPlatform('youtube');
                    }
                  }}
                  placeholder={
                    modalPlatform === 'dailymotion'
                      ? 'Ex: https://www.dailymotion.com/video/x8abcdef ou x8abcdef'
                      : 'Ex: https://www.youtube.com/watch?v=pAgnJDJN4VA ou pAgnJDJN4VA'
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                {modalUrlOrId && (
                  <p className="text-[11px] font-mono text-cyan-400 mt-1">
                    ID detectado:{' '}
                    <strong>
                      {modalPlatform === 'dailymotion'
                        ? extractDailymotionVideoId(modalUrlOrId) || 'Formato Dailymotion...'
                        : extractYouTubeVideoId(modalUrlOrId) || 'Formato YouTube...'}
                    </strong>
                  </p>
                )}
              </div>

              {/* Live Thumbnail Preview */}
              {modalPlatform === 'youtube' && extractYouTubeVideoId(modalUrlOrId).length === 11 && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <img
                    src={`https://img.youtube.com/vi/${extractYouTubeVideoId(modalUrlOrId)}/mqdefault.jpg`}
                    alt="Preview YouTube"
                    className="w-20 h-12 object-cover rounded"
                  />
                  <div className="text-[11px] text-slate-400 font-mono">
                    <span className="text-emerald-400 font-bold block">✓ Miniatura YouTube Validada</span>
                    Pronto para tocar no player holográfico
                  </div>
                </div>
              )}

              {modalPlatform === 'dailymotion' && extractDailymotionVideoId(modalUrlOrId) && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <img
                    src={`https://www.dailymotion.com/thumbnail/video/${extractDailymotionVideoId(modalUrlOrId)}`}
                    alt="Preview Dailymotion"
                    className="w-20 h-12 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="text-[11px] text-slate-400 font-mono">
                    <span className="text-blue-400 font-bold block">✓ Vídeo Dailymotion Identificado</span>
                    Player nativo Dailymotion integrado
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Categoria</label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500 font-sans"
                  >
                    <option value="Rock Clássico">Rock Clássico</option>
                    <option value="Heavy Metal">Heavy Metal</option>
                    <option value="Synthwave / Sci-Fi">Synthwave / Sci-Fi</option>
                    <option value="Épico / Orquestral">Épico / Orquestral</option>
                    <option value="Lofi / Foco">Lofi / Foco</option>
                    <option value="Eletrônica">Eletrônica</option>
                    <option value="Pop / Retrowave">Pop / Retrowave</option>
                    <option value="Sertanejo">Sertanejo</option>
                    <option value="Dailymotion">Dailymotion</option>
                    <option value="Personalizado">Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Descrição / Nota</label>
                  <input
                    type="text"
                    value={modalDescription}
                    onChange={(e) => setModalDescription(e.target.value)}
                    placeholder="Ex: Trilha sonora favorita"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveModal}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-mono font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingSongId ? 'Salvar Alterações' : 'Adicionar à Lista'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT MP3 TRACK (TITLE & ARTIST)                   */}
      {/* ======================================================== */}
      {isEditTrackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#121824] border border-[#00F0FF]/40 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-[#00F0FF]" />
                <h3 className="font-orbitron font-bold text-sm text-slate-100">
                  EDITAR FAIXA DA PLAYLIST
                </h3>
              </div>
              <button
                onClick={() => setIsEditTrackModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalTrackError && (
              <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono">
                {modalTrackError}
              </div>
            )}

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono mb-1">
                  Título da Música *
                </label>
                <input
                  type="text"
                  value={modalTrackTitle}
                  onChange={(e) => setModalTrackTitle(e.target.value)}
                  placeholder="Nome da faixa..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">
                  Artista / Criador
                </label>
                <input
                  type="text"
                  value={modalTrackArtist}
                  onChange={(e) => setModalTrackArtist(e.target.value)}
                  placeholder="Nome do artista..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] font-sans"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00F0FF] shrink-0" />
                <span>Salvo exclusivamente na sua biblioteca pessoal ({activeUserName}).</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsEditTrackModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTrackModal}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#00F0FF] to-cyan-500 hover:from-cyan-400 hover:to-cyan-600 text-slate-950 text-xs font-mono font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Faixa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD MP3 BY DIRECT AUDIO STREAM URL                */}
      {/* ======================================================== */}
      {isAddMp3UrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#121824] border border-cyan-500/40 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-[#00F0FF]" />
                <h3 className="font-orbitron font-bold text-sm text-slate-100">
                  ADICIONAR MP3 POR LINK DIRETO
                </h3>
              </div>
              <button
                onClick={() => setIsAddMp3UrlModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalMp3Error && (
              <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono">
                {modalMp3Error}
              </div>
            )}

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono mb-1">
                  Título da Faixa *
                </label>
                <input
                  type="text"
                  value={modalMp3Title}
                  onChange={(e) => setModalMp3Title(e.target.value)}
                  placeholder="Ex: Hino do Rock, Trilha Futurista..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">
                  Artista / Banda
                </label>
                <input
                  type="text"
                  value={modalMp3Artist}
                  onChange={(e) => setModalMp3Artist(e.target.value)}
                  placeholder="Ex: AC/DC, Queen, Trilha Sonora..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">
                  URL Direta do Áudio (.mp3 / .wav / stream) *
                </label>
                <input
                  type="url"
                  value={modalMp3Url}
                  onChange={(e) => setModalMp3Url(e.target.value)}
                  placeholder="https://exemplo.com/audio/musica.mp3"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">
                  Gênero / Categoria
                </label>
                <input
                  type="text"
                  value={modalMp3Genre}
                  onChange={(e) => setModalMp3Genre(e.target.value)}
                  placeholder="Ex: Rock, Clássica, Eletrônica..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] font-sans"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00F0FF] shrink-0" />
                <span>Vinculado individualmente à conta de {activeUserName} (Isolado por usuário).</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsAddMp3UrlModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMp3UrlModal}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#00F0FF] to-cyan-500 hover:from-cyan-400 hover:to-cyan-600 text-slate-950 text-xs font-mono font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Adicionar à Playlist</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: BULK JSON IMPORT FOR MP3s & VIDEO LINKS           */}
      {/* ======================================================== */}
      {isBulkImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-[#0E131E] border border-cyan-500/50 p-6 shadow-2xl flex flex-col gap-4 overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[#00F0FF]">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-orbitron font-extrabold text-sm text-slate-100 tracking-wide">
                    IMPORTAÇÃO EM MASSA VIA JSON (MP3 & VÍDEOS)
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    Povoamento em massa com isolamento individual para {activeUserName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkImportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Helper & Sample Download Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-300">
                Baixe o modelo pré-formatado de exemplo ou faça upload do seu arquivo JSON:
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadSampleJsonTemplate}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-[#00F0FF] border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Baixar Modelo JSON</span>
                </button>
                <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                  <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Subir Arquivo</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleBulkJsonFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Notification messages */}
            {bulkImportNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{bulkImportNotice}</span>
              </div>
            )}

            {bulkValidation?.error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-2">
                <X className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{bulkValidation.error}</span>
              </div>
            )}

            {/* Live Counters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#121824] border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Disc className="w-4 h-4 text-fuchsia-400" />
                  <span className="text-xs font-mono text-slate-300">Faixas MP3 Detectadas:</span>
                </div>
                <span className="text-base font-orbitron font-bold text-fuchsia-400">
                  {bulkValidation?.mp3s.length || 0}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#121824] border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono text-slate-300">Vídeos (YT/Dailymotion):</span>
                </div>
                <span className="text-base font-orbitron font-bold text-cyan-400">
                  {bulkValidation?.videos.length || 0}
                </span>
              </div>
            </div>

            {/* Textarea for JSON editing */}
            <div>
              <label className="block text-slate-300 font-mono text-xs mb-1">
                Conteúdo JSON de Importação:
              </label>
              <textarea
                value={bulkJsonInput}
                onChange={(e) => handleBulkJsonChange(e.target.value)}
                rows={11}
                className="w-full p-3 rounded-xl bg-black/70 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder='Cole aqui seu JSON com "musicas_mp3" e "videos_links"...'
              />
            </div>

            {/* User Isolation info */}
            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 font-mono flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                Isolamento estrito: todos os itens importados serão vinculados exclusivamente ao seu usuário (<code>user_id: {activeUserId}</code>).
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkImportModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={!bulkValidation?.success || isImportingBulk}
                onClick={handleExecuteBulkImport}
                className={`px-5 py-2 rounded-lg font-orbitron font-bold text-xs tracking-wider flex items-center gap-2 transition-all shadow-md ${
                  bulkValidation?.success && !isImportingBulk
                    ? 'bg-gradient-to-r from-[#00F0FF] to-blue-600 text-slate-950 hover:brightness-110 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {isImportingBulk ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>IMPORTANDO...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>IMPORTAR PARA MEU BANCO</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
