import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Crown,
  Shield,
  RotateCcw,
  Volume2,
  VolumeX,
  Users,
  Bot,
  Maximize2,
  Minimize2,
  ChevronRight,
  Sparkles,
  Trophy,
  AlertTriangle,
  Play,
  Send,
  CheckCircle2,
  Radio,
  Eye,
  EyeOff,
  Move,
  Layers,
  HelpCircle,
  X,
  Swords,
  Zap,
  Clock,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Camera,
  Tv,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Smile,
  Signal
} from 'lucide-react';
import {
  ChessGameState,
  ChessPiece,
  ChessMove,
  PieceColor,
  PieceType,
  createInitialGameState,
  getLegalMovesForSquare,
  getAllLegalMoves,
  applyMove,
  getJarvesAiMove,
  JarvesAiDifficulty,
  squareToAlgebraic,
} from './chessEngine';
import { chessAudio } from './chessAudio';
import { UserAccount } from '../../../types';

interface MedievalChessGameProps {
  currentUser?: UserAccount;
  onAddLog: (action: string, category: string, details?: string) => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  users?: UserAccount[];
  initialOnlineRoom?: {
    roomId: string;
    opponent: { id: string; name: string };
    playerColor: 'w' | 'b';
  } | null;
  onClearInitialOnlineRoom?: () => void;
}

export const MedievalChessGame: React.FC<MedievalChessGameProps> = ({
  currentUser,
  onAddLog,
  onToggleFullscreen,
  isFullscreen = false,
  users = [],
  initialOnlineRoom = null,
  onClearInitialOnlineRoom,
}) => {
  // Game state
  const [gameState, setGameState] = useState<ChessGameState>(createInitialGameState);
  const [gameMode, setGameMode] = useState<'ai' | 'online'>('ai');
  const [aiDifficulty, setAiDifficulty] = useState<JarvesAiDifficulty>('medium');
  const [playerColor, setPlayerColor] = useState<PieceColor>('w'); // 'w' = Silver, 'b' = Bronze
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiTotalThinkTime, setAiTotalThinkTime] = useState(0);
  const [aiTimeRemaining, setAiTimeRemaining] = useState(0);
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const plannedAiMoveRef = useRef<ChessMove | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Viewpoint: '3d' (Catedral perspective) or 'topdown' (Cenital flat)
  const [viewpoint, setViewpoint] = useState<'3d' | 'topdown'>('3d');

  // Selected piece & valid moves highlight
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [legalTargetSquares, setLegalTargetSquares] = useState<{ row: number; col: number; move: ChessMove }[]>([]);

  // Drag and Drop state
  const [draggingSquare, setDraggingSquare] = useState<{ row: number; col: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);

  // Promotion pending state
  const [pendingPromotionMove, setPendingPromotionMove] = useState<ChessMove | null>(null);

  // Online Multiplayer State
  const [isOnlineLobbyOpen, setIsOnlineLobbyOpen] = useState(false);
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [onlineOpponent, setOnlineOpponent] = useState<{ id: string; name: string } | null>(null);
  const [onlineInvites, setOnlineInvites] = useState<any[]>([]);
  const [inviteSentTo, setInviteSentTo] = useState<string | null>(null);
  const [onlinePollActive, setOnlinePollActive] = useState(false);
  const [incomingInvite, setIncomingInvite] = useState<{
    id: string;
    fromUser: { id: string; name: string };
    toUser: { id: string; name: string };
    roomId: string;
  } | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // ========================================================
  // LIVE AUDIO & VIDEO (AV) TRANSMISSION STATE & CONTROLS
  // ========================================================
  const [optInCameraOnInvite, setOptInCameraOnInvite] = useState(true);
  const [optInMicOnInvite, setOptInMicOnInvite] = useState(true);
  const [optInCameraOnAccept, setOptInCameraOnAccept] = useState(true);
  const [optInMicOnAccept, setOptInMicOnAccept] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [opponentCameraActive, setOpponentCameraActive] = useState(true);
  const [opponentMicActive, setOpponentMicActive] = useState(true);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [opponentAudioLevel, setOpponentAudioLevel] = useState(0);
  const [isAvModalOpen, setIsAvModalOpen] = useState(false);
  const [isAvModalVisible, setIsAvModalVisible] = useState(true);
  const [modalPos, setModalPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingModal, setIsDraggingModal] = useState(false);
  const isDraggingModalRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });
  const modalBoxRef = useRef<HTMLDivElement | null>(null);
  const [isAvPanelMinimized, setIsAvPanelMinimized] = useState(false);
  const [avPanelPlacement, setAvPanelPlacement] = useState<'side' | 'modal'>('side');
  const [hasCameraPermissionError, setHasCameraPermissionError] = useState<string | null>(null);
  const [remoteEmoteNotification, setRemoteEmoteNotification] = useState<{ text: string; sender: string } | null>(null);

  // Set default initial position for AV modal when opened
  useEffect(() => {
    if (isAvModalOpen && isAvModalVisible && !modalPos) {
      const modalWidth = Math.min(480, window.innerWidth - 32);
      const initialX = Math.max(12, window.innerWidth - modalWidth - 24);
      const initialY = 75;
      setModalPos({ x: initialX, y: initialY });
    }
  }, [isAvModalOpen, isAvModalVisible, modalPos]);

  // Window-level mouse & touch drag listeners allowing free repositioning across the screen
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDraggingModalRef.current) return;
      const { mouseX, mouseY, startX, startY } = dragStartRef.current;
      const deltaX = clientX - mouseX;
      const deltaY = clientY - mouseY;

      const modalWidth = modalBoxRef.current?.offsetWidth || 460;
      const modalHeight = modalBoxRef.current?.offsetHeight || 380;

      const minX = 8;
      const maxX = Math.max(minX, window.innerWidth - modalWidth - 8);
      const minY = 8;
      const maxY = Math.max(minY, window.innerHeight - modalHeight - 8);

      const nextX = Math.min(maxX, Math.max(minX, startX + deltaX));
      const nextY = Math.min(maxY, Math.max(minY, startY + deltaY));

      setModalPos({ x: nextX, y: nextY });
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingModalRef.current) return;
      handleMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingModalRef.current) return;
      if (e.touches && e.touches[0]) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onEnd = () => {
      if (isDraggingModalRef.current) {
        isDraggingModalRef.current = false;
        setIsDraggingModal(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  const handleModalDragStart = useCallback((clientX: number, clientY: number) => {
    const currentBox = modalBoxRef.current;
    if (!currentBox) return;
    const rect = currentBox.getBoundingClientRect();

    isDraggingModalRef.current = true;
    setIsDraggingModal(true);
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: rect.left,
      startY: rect.top,
    };
  }, []);

  const handleMouseDownOnFrame = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) {
      return;
    }
    e.preventDefault();
    handleModalDragStart(e.clientX, e.clientY);
  };

  const handleTouchStartOnFrame = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) {
      return;
    }
    const touch = e.touches[0];
    if (touch) {
      handleModalDragStart(touch.clientX, touch.clientY);
    }
  };

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // WebRTC & Cross-device Room Signaling Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const sentInviteIdRef = useRef<string | null>(null);
  const sentRoomIdRef = useRef<string | null>(null);
  const lastPolledMessageTimestampRef = useRef<number>(0);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());

  // Unified Room Message Dispatcher (Both BroadcastChannel and Server REST API for cross-browser & mobile)
  const postRoomMessage = useCallback(
    async (type: string, payload: any) => {
      const targetRoomId = onlineRoomId || sentRoomIdRef.current;
      if (!targetRoomId) return;
      const myId = currentUser?.id || 'usr-player';
      const myName = currentUser?.name || 'Jogador';

      const enrichedPayload = {
        ...payload,
        roomId: targetRoomId,
        senderId: myId,
        senderName: myName,
      };

      // 1. Same-browser BroadcastChannel (zero latency)
      try {
        broadcastChannelRef.current?.postMessage({
          type,
          payload: enrichedPayload,
        });
      } catch {}

      // 2. Cross-browser & Cross-device Server Message Hub
      try {
        await fetch(`/api/chess/room/${targetRoomId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: myId,
            senderName: myName,
            type,
            payload: enrichedPayload,
          }),
        });
      } catch {}
    },
    [onlineRoomId, currentUser]
  );

  // Broadcast current AV status to opponent
  const broadcastAvState = useCallback((cameraActive: boolean, micActive: boolean) => {
    postRoomMessage('CHESS_AV_STATE', {
      cameraActive,
      micActive,
    });
  }, [postRoomMessage]);

  // Fallback high-tech animated hologram stream (ensures 30fps video if hardware camera is locked by another tab or unavailable)
  const createFallbackHologramStream = useCallback((playerName: string, color: 'w' | 'b') => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      let angle = 0;
      let pulse = 0;
      const timer = setInterval(() => {
        if (!ctx) return;
        angle = (angle + 0.05) % (Math.PI * 2);
        pulse = (pulse + 0.08) % (Math.PI * 2);
        // Background
        ctx.fillStyle = color === 'w' ? '#091524' : '#1f130b';
        ctx.fillRect(0, 0, 640, 480);
        // Grid pattern
        ctx.strokeStyle = color === 'w' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 640; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 480);
          ctx.stroke();
        }
        for (let y = 0; y < 480; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(640, y);
          ctx.stroke();
        }
        // Scanner circle
        ctx.save();
        ctx.translate(320, 220);
        const radius = 90 + Math.sin(pulse) * 8;
        ctx.strokeStyle = color === 'w' ? '#38bdf8' : '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Radial sweep line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        ctx.stroke();

        // Center avatar
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(playerName.slice(0, 10).toUpperCase(), 0, -10);

        ctx.font = 'bold 15px monospace';
        ctx.fillStyle = color === 'w' ? '#7dd3fc' : '#fcd34d';
        ctx.fillText('• JARVES LIVE HOLO •', 0, 32);
        ctx.font = '12px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(color === 'w' ? 'PEDRAS CLARAS (PRATA)' : 'PEDRAS ESCURAS (BRONZE)', 0, 54);
        ctx.restore();
      }, 1000 / 30);

      const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : new MediaStream();
      canvasStream.getVideoTracks().forEach((track: any) => {
        const origStop = track.stop ? track.stop.bind(track) : null;
        track.stop = () => {
          clearInterval(timer);
          if (origStop) origStop();
        };
      });
      return canvasStream;
    } catch {
      return new MediaStream();
    }
  }, []);

  // Fallback carrier audio track for peer connection
  const createFallbackAudioTrack = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const actx = new AudioContextClass();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        gain.gain.value = 0.00001; // Inaudible carrier signal to keep audio channel established
        osc.connect(gain);
        const dest = actx.createMediaStreamDestination();
        gain.connect(dest);
        osc.start();
        return dest.stream.getAudioTracks()[0] || null;
      }
    } catch {}
    return null;
  }, []);

  // WebRTC Peer Connection Factory with Public STUN Servers
  const getOrCreatePeerConnection = useCallback(() => {
    if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    });

    // Remote Track Handler
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      const incomingStream = stream || (event.track ? new MediaStream([event.track]) : null);
      if (incomingStream) {
        remoteStreamRef.current = incomingStream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = incomingStream;
          remoteVideoRef.current.play().catch(() => {});
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = incomingStream;
          remoteAudioRef.current.play().catch(() => {});
        }
        setOpponentCameraActive(true);
        setOpponentMicActive(true);
      }
    };

    // ICE Candidate Generator
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        postRoomMessage('WEBRTC_ICE', { candidate: event.candidate });
      }
    };

    // Attach existing local tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, mediaStreamRef.current!);
        } catch {}
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  }, [postRoomMessage]);

  // Initiate WebRTC Offer (Executed by White player / Inviter)
  const initiateWebRtcOffer = useCallback(async () => {
    try {
      const pc = getOrCreatePeerConnection();
      // Ensure local tracks are attached before offer
      if (mediaStreamRef.current) {
        const senders = pc.getSenders();
        mediaStreamRef.current.getTracks().forEach((track) => {
          if (!senders.some((s) => s.track === track)) {
            try {
              pc.addTrack(track, mediaStreamRef.current!);
            } catch {}
          }
        });
      }
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      await postRoomMessage('WEBRTC_OFFER', { sdp: offer });
    } catch (err) {
      console.warn('[WebRTC] Offer initiation notice:', err);
    }
  }, [getOrCreatePeerConnection, postRoomMessage]);

  // Handle Incoming Remote WebRTC Offer (Executed by Black player / Recipient)
  const handleRemoteOffer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      try {
        const pc = getOrCreatePeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // Flush queued candidates
        while (pendingIceCandidatesRef.current.length > 0) {
          const cand = pendingIceCandidatesRef.current.shift();
          if (cand) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch {}
          }
        }

        // Ensure local tracks are attached before answer
        if (mediaStreamRef.current) {
          const senders = pc.getSenders();
          mediaStreamRef.current.getTracks().forEach((track) => {
            if (!senders.some((s) => s.track === track)) {
              try {
                pc.addTrack(track, mediaStreamRef.current!);
              } catch {}
            }
          });
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await postRoomMessage('WEBRTC_ANSWER', { sdp: answer });
      } catch (err) {
        console.warn('[WebRTC] Remote offer error:', err);
      }
    },
    [getOrCreatePeerConnection, postRoomMessage]
  );

  // Handle Incoming Remote WebRTC Answer (Executed by White player)
  const handleRemoteAnswer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      try {
        const pc = getOrCreatePeerConnection();
        if (pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          // Flush queued candidates
          while (pendingIceCandidatesRef.current.length > 0) {
            const cand = pendingIceCandidatesRef.current.shift();
            if (cand) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn('[WebRTC] Remote answer error:', err);
      }
    },
    [getOrCreatePeerConnection]
  );

  // Handle Incoming Remote ICE Candidate
  const handleRemoteIce = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      try {
        const pc = getOrCreatePeerConnection();
        if (!pc.remoteDescription) {
          pendingIceCandidatesRef.current.push(candidate);
        } else {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.warn('[WebRTC] Add ICE candidate notice:', err);
      }
    },
    [getOrCreatePeerConnection]
  );

  // Stop media stream tracks and cleanup audio analyzers
  const stopMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsCameraActive(false);
    setIsMicActive(false);
    broadcastAvState(false, false);
  }, [broadcastAvState]);

  // Start media stream capturing video and/or audio with graceful holographic fallback
  const startMediaStream = useCallback(
    async (wantVideo = true, wantAudio = true): Promise<MediaStream | null> => {
      setHasCameraPermissionError(null);
      if (!wantVideo && !wantAudio) {
        stopMediaStream();
        return null;
      }

      let stream: MediaStream | null = null;

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: wantVideo
              ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
              : false,
            audio: wantAudio,
          });
        } catch (userMediaErr) {
          console.warn('[AV] getUserMedia notice, attempting single track fallback:', userMediaErr);
          if (wantVideo) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            } catch {}
          }
        }
      }

      // If hardware camera is locked (e.g. 2 tabs on same computer) or denied, provide smooth 30fps holographic stream
      if (!stream || stream.getVideoTracks().length === 0) {
        const fallbackStream = createFallbackHologramStream(
          currentUser?.name || 'Comandante',
          playerColor === 'b' ? 'b' : 'w'
        );
        if (wantAudio) {
          const dummyAudio = createFallbackAudioTrack();
          if (dummyAudio) fallbackStream.addTrack(dummyAudio);
        }
        stream = fallbackStream;
        setHasCameraPermissionError(
          'Webcam ocupada por outra aplicação. Transmissão Holográfica JARVES Ativa em 30FPS.'
        );
      }

      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      setIsMicActive(true);

      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      // Sync tracks to WebRTC peer connection
      if (peerConnectionRef.current && stream) {
        const senders = peerConnectionRef.current.getSenders();
        stream.getTracks().forEach((track) => {
          const existing = senders.find((s) => s.track?.kind === track.kind);
          if (existing) {
            existing.replaceTrack(track).catch(() => {});
          } else {
            try {
              peerConnectionRef.current?.addTrack(track, stream!);
            } catch {}
          }
        });
      }

      if (wantAudio && stream.getAudioTracks().length > 0) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;
          }
        } catch {}
      }

      broadcastAvState(true, true);
      return stream;
    },
    [
      broadcastAvState,
      stopMediaStream,
      createFallbackHologramStream,
      createFallbackAudioTrack,
      currentUser,
      playerColor,
    ]
  );

  // Toggle local camera track
  const toggleCamera = useCallback(async () => {
    const next = !isCameraActive;
    if (!mediaStreamRef.current) {
      await startMediaStream(next, isMicActive);
      return;
    }
    const videoTracks = mediaStreamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks.forEach((t) => (t.enabled = next));
      setIsCameraActive(next);
      broadcastAvState(next, isMicActive);
    } else if (next) {
      await startMediaStream(true, isMicActive);
    }
  }, [isCameraActive, isMicActive, startMediaStream, broadcastAvState]);

  // Toggle local microphone track
  const toggleMic = useCallback(async () => {
    const next = !isMicActive;
    if (!mediaStreamRef.current) {
      await startMediaStream(isCameraActive, next);
      return;
    }
    const audioTracks = mediaStreamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks.forEach((t) => (t.enabled = next));
      setIsMicActive(next);
      broadcastAvState(isCameraActive, next);
    } else if (next) {
      await startMediaStream(isCameraActive, true);
    }
  }, [isCameraActive, isMicActive, startMediaStream, broadcastAvState]);

  // Send quick heraldic reaction / emote over network
  const sendHeraldicEmote = (emote: string) => {
    if (!onlineRoomId) return;
    postRoomMessage('CHESS_EMOTE', {
      text: emote,
      senderName: currentUser?.name || 'Você',
    });
    setRemoteEmoteNotification({
      text: emote,
      sender: 'Você',
    });
    setTimeout(() => {
      setRemoteEmoteNotification(null);
    }, 4000);
  };

  // Real-time Audio Level Equalizer calculation
  useEffect(() => {
    let animId: number;
    const updateAudioLevels = () => {
      if (analyserRef.current && isMicActive) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setLocalAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
      } else if (isMicActive) {
        setLocalAudioLevel(Math.floor(15 + Math.random() * 25));
      } else {
        setLocalAudioLevel(0);
      }

      if (opponentMicActive) {
        setOpponentAudioLevel((prev) => {
          const delta = (Math.random() - 0.48) * 16;
          return Math.min(85, Math.max(5, Math.round(prev + delta)));
        });
      } else {
        setOpponentAudioLevel(0);
      }

      animId = requestAnimationFrame(updateAudioLevels);
    };

    if (gameMode === 'online' && onlineRoomId) {
      animId = requestAnimationFrame(updateAudioLevels);
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameMode, onlineRoomId, isMicActive, opponentMicActive]);

  // Connect local video element whenever active
  useEffect(() => {
    if (localVideoRef.current && mediaStreamRef.current && isCameraActive) {
      localVideoRef.current.srcObject = mediaStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }
    if (remoteVideoRef.current && remoteStreamRef.current && opponentCameraActive) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [isCameraActive, opponentCameraActive, isAvModalOpen, avPanelPlacement]);

  // Stop media when leaving online mode or unmounting
  useEffect(() => {
    if (gameMode !== 'online') {
      stopMediaStream();
    }
  }, [gameMode, stopMediaStream]);

  useEffect(() => {
    return () => {
      stopMediaStream();
    };
  }, [stopMediaStream]);

  // The board is flipped for the invited player playing with Black (Pedras Escuras) so their pieces are at the bottom
  const isBoardFlipped = playerColor === 'b';

  // Commentary / Voice Alert
  const [jarvesCommentary, setJarvesCommentary] = useState<string>(
    'Bem-vindo ao Xadrez Medieval JARVES. Suas peças são de prata forjada. Escolha seu movimento, Senhor.'
  );

  // Sound toggle
  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    chessAudio.setMuted(next);
  };

  // Tab session identifier to distinguish multiple browser tabs
  const tabSessionIdRef = useRef<string>('');
  useEffect(() => {
    let sid = sessionStorage.getItem('jarves_tab_session_id');
    if (!sid) {
      sid = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      sessionStorage.setItem('jarves_tab_session_id', sid);
    }
    tabSessionIdRef.current = sid;
  }, []);

  // Handle incoming initial online room (e.g. accepted from App global modal)
  useEffect(() => {
    if (initialOnlineRoom) {
      setGameMode('online');
      setOnlineRoomId(initialOnlineRoom.roomId);
      setOnlineOpponent(initialOnlineRoom.opponent);
      setPlayerColor(initialOnlineRoom.playerColor); // 'b' for invited player
      setGameState(createInitialGameState());
      setIsOnlineLobbyOpen(false);
      setIncomingInvite(null);
      setJarvesCommentary(
        `Desafio aceito! Você está jogando com as Pedras Escuras (Bronze) contra ${initialOnlineRoom.opponent.name}. O tabuleiro foi virado para sua perspectiva. Câmeras e áudio liberados!`
      );
      chessAudio.playMove();

      // Automatically liberate camera and mic for challenged user and display AV transmission panel
      setIsAvModalVisible(true);
      setIsAvPanelMinimized(false);
      setAvPanelPlacement('side');
      setOpponentCameraActive(true);
      setOpponentMicActive(true);

      startMediaStream(true, true);

      if (onClearInitialOnlineRoom) {
        onClearInitialOnlineRoom();
      }
    }
  }, [initialOnlineRoom, onClearInitialOnlineRoom, startMediaStream]);

  // Common message dispatcher for incoming events (from BroadcastChannel or Server Polling)
  const handleIncomingRoomMessage = useCallback(
    (type: string, payload: any) => {
      const myId = currentUser?.id || 'usr-romildo-master';
      if (payload.senderId && payload.senderId === myId) {
        return; // Ignore own echoes
      }

      if (type === 'CHESS_MOVE') {
        if (payload.nextState) {
          setGameState(payload.nextState);
          chessAudio.playMove();
          if (payload.nextState.isCheckmate) {
            chessAudio.playCheckmate();
          } else if (payload.nextState.isCheck) {
            chessAudio.playCheck();
          }
        }
      } else if (type === 'WEBRTC_OFFER' && payload.sdp) {
        handleRemoteOffer(payload.sdp);
      } else if (type === 'WEBRTC_ANSWER' && payload.sdp) {
        handleRemoteAnswer(payload.sdp);
      } else if (type === 'WEBRTC_ICE' && payload.candidate) {
        handleRemoteIce(payload.candidate);
      } else if (type === 'CHESS_AV_STATE') {
        if (payload.cameraActive !== undefined) setOpponentCameraActive(payload.cameraActive);
        if (payload.micActive !== undefined) setOpponentMicActive(payload.micActive);
      } else if (type === 'CHESS_EMOTE') {
        setRemoteEmoteNotification({
          text: payload.text,
          sender: payload.senderName || 'Oponente',
        });
        chessAudio.playMove();
        setTimeout(() => {
          setRemoteEmoteNotification(null);
        }, 4500);
      } else if (type === 'CHESS_INVITE_ACCEPT') {
        if (payload.toUserId === myId || payload.fromUser?.id === myId) {
          setOnlineRoomId(payload.roomId);
          setOnlineOpponent(payload.toUser || payload.fromUser);
          setGameMode('online');
          setPlayerColor('w'); // Inviter ALWAYS plays with White (Pedras Claras / Prata)
          setIsOnlineLobbyOpen(false);
          setInviteSentTo(null);
          setGameState(createInitialGameState());
          setJarvesCommentary(
            `Desafio aceito! ${payload.toUser?.name || 'Oponente'} jogará com as Pedras Escuras. Sua vez de iniciar com as Pedras Claras (Prata). Câmeras e áudio ativados!`
          );
          chessAudio.playMove();
          onAddLog('Partida de Xadrez Online Conectada', 'Xadrez Online', payload.toUser?.name || 'Oponente');

          // Automatically liberate camera and mic for challenger and display AV transmission panel
          setIsAvModalVisible(true);
          setIsAvPanelMinimized(false);
          setAvPanelPlacement('side');
          setOpponentCameraActive(true);
          setOpponentMicActive(true);

          startMediaStream(true, true).then(() => {
            // Initiate WebRTC offer as White
            setTimeout(() => {
              initiateWebRtcOffer();
            }, 300);
          });
        }
      } else if (type === 'CHESS_INVITE_DECLINED') {
        if (payload.fromUserId === myId) {
          setInviteSentTo(null);
          setJarvesCommentary(`${payload.declinedByName || 'Oponente'} recusou o convite para a partida.`);
        }
      }
    },
    [
      currentUser,
      handleRemoteOffer,
      handleRemoteAnswer,
      handleRemoteIce,
      initiateWebRtcOffer,
      onAddLog,
      optInCameraOnInvite,
      optInMicOnInvite,
      startMediaStream,
    ]
  );

  // Setup Cross-Tab Real-time BroadcastChannel
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('jarves_chess_network');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'CHESS_INVITE') {
          if (payload.senderSessionId && payload.senderSessionId === tabSessionIdRef.current) {
            return;
          }
          const myId = currentUser?.id || 'usr-romildo-master';
          const myName = currentUser?.name?.toLowerCase();
          const targetId = payload.toUser?.id;
          const targetName = payload.toUser?.name?.toLowerCase();

          const isTargetedToMe = targetId === myId || (targetName && myName && targetName === myName);
          const isBroadcast = targetId === 'usr-all' || !targetId;
          const isDifferentSession = payload.senderSessionId && payload.senderSessionId !== tabSessionIdRef.current;

          if (isTargetedToMe || isBroadcast || (isDifferentSession && payload.fromUser?.id !== myId)) {
            chessAudio.playInviteAlert();
            setIncomingInvite(payload);
            setJarvesCommentary(`⚔️ Desafio de xadrez recebido de ${payload.fromUser.name}!`);
          }
        } else if (payload?.roomId === onlineRoomId || type === 'CHESS_INVITE_ACCEPT') {
          handleIncomingRoomMessage(type, payload);
        }
      };

      return () => {
        channel.close();
      };
    } catch {}
  }, [onlineRoomId, currentUser, handleIncomingRoomMessage]);

  // Polling for incoming invites from server (cross-device & cross-browser fallback)
  useEffect(() => {
    const userId = currentUser?.id || 'usr-romildo-master';

    const checkServerInvites = () => {
      fetch(`/api/chess/invites/${encodeURIComponent(userId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.invites) && data.invites.length > 0) {
            const latest = data.invites[0];
            if (
              latest &&
              latest.status === 'pending' &&
              latest.fromUser.id !== userId &&
              (!incomingInvite || incomingInvite.id !== latest.id)
            ) {
              chessAudio.playInviteAlert();
              setIncomingInvite({
                id: latest.id,
                fromUser: latest.fromUser,
                toUser: latest.toUser,
                roomId: latest.roomId || `room_${Date.now()}`,
              });
              setJarvesCommentary(`⚔️ Desafio de xadrez recebido de ${latest.fromUser.name}!`);
            }
          }
        })
        .catch(() => {});
    };

    const interval = setInterval(checkServerInvites, 2000);
    return () => clearInterval(interval);
  }, [currentUser, incomingInvite]);

  // Inviter Polling: Check if sent invite was accepted on another browser or mobile device
  useEffect(() => {
    if (!inviteSentTo || !sentInviteIdRef.current) return;

    const pollInviteStatus = () => {
      if (!sentInviteIdRef.current) return;
      fetch(`/api/chess/invite/${sentInviteIdRef.current}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data.invite) {
            const inv = data.invite;
            if (inv.status === 'accepted') {
              const rId = inv.roomId || sentRoomIdRef.current || `room_${Date.now()}`;
              setOnlineRoomId(rId);
              setOnlineOpponent(inv.acceptedBy || inv.toUser);
              setGameMode('online');
              setPlayerColor('w'); // Inviter ALWAYS plays White
              setIsOnlineLobbyOpen(false);
              setInviteSentTo(null);
              sentInviteIdRef.current = null;
              setGameState(createInitialGameState());
              setJarvesCommentary(
                `Desafio aceito! ${inv.acceptedBy?.name || inv.toUser.name} jogará com as Pedras Escuras. Sua vez de iniciar com as Pedras Claras (Prata). Câmeras e áudio ativados!`
              );
              chessAudio.playMove();
              onAddLog('Partida de Xadrez Online Conectada', 'Xadrez Online', inv.acceptedBy?.name || inv.toUser.name);

              // Automatically liberate camera and mic for challenger and display AV transmission panel
              setIsAvModalVisible(true);
              setIsAvPanelMinimized(false);
              setAvPanelPlacement('side');
              setOpponentCameraActive(true);
              setOpponentMicActive(true);

              startMediaStream(true, true).then(() => {
                // Initiate WebRTC offer as White
                setTimeout(() => {
                  initiateWebRtcOffer();
                }, 300);
              });
            } else if (inv.status === 'declined') {
              setInviteSentTo(null);
              sentInviteIdRef.current = null;
              setJarvesCommentary('Oponente recusou o convite para a partida.');
            }
          }
        })
        .catch(() => {});
    };

    const interval = setInterval(pollInviteStatus, 1000);
    return () => clearInterval(interval);
  }, [
    inviteSentTo,
    onAddLog,
    optInCameraOnInvite,
    optInMicOnInvite,
    startMediaStream,
    initiateWebRtcOffer,
  ]);

  // Polling online room messages (Cross-browser, cross-device WebRTC & moves)
  useEffect(() => {
    if (gameMode !== 'online' || !onlineRoomId) return;

    const interval = setInterval(() => {
      fetch(`/api/chess/room/${onlineRoomId}/messages?since=${lastPolledMessageTimestampRef.current}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              if (processedMessageIdsRef.current.has(msg.id)) continue;
              processedMessageIdsRef.current.add(msg.id);
              if (msg.timestamp > lastPolledMessageTimestampRef.current) {
                lastPolledMessageTimestampRef.current = msg.timestamp;
              }
              handleIncomingRoomMessage(msg.type, msg.payload);
            }
          }
        })
        .catch(() => {});
    }, 800);

    return () => clearInterval(interval);
  }, [gameMode, onlineRoomId, handleIncomingRoomMessage]);

  // Handle legal move execution
  const executeMove = useCallback((move: ChessMove) => {
    if (move.piece.type === 'p' && (move.to.row === 0 || move.to.row === 7) && !move.promotion) {
      setPendingPromotionMove(move);
      return;
    }

    const nextState = applyMove(gameState, move);
    setGameState(nextState);

    // Play appropriate sound
    if (move.isCastling) {
      chessAudio.playCastle();
    } else if (move.captured) {
      chessAudio.playCapture();
    } else {
      chessAudio.playMove();
    }

    if (nextState.isCheckmate) {
      chessAudio.playCheckmate();
      const winnerName = nextState.turn === 'w' ? 'Pretas (Bronze)' : 'Brancas (Prata)';
      setJarvesCommentary(`👑 XEQUE-MATE! Vitória das ${winnerName}! Uma partida magnífica.`);
      onAddLog('Xeque-Mate no Xadrez', 'Xadrez Medieval', `Vencedor: ${winnerName}`);
    } else if (nextState.isCheck) {
      chessAudio.playCheck();
      const inCheckName = nextState.turn === 'w' ? 'Rei Branco' : 'Rei Preto';
      setJarvesCommentary(`⚠️ XEQUE! O ${inCheckName} está sob ataque direto!`);
      onAddLog('Alerta de Xeque', 'Xadrez Medieval', inCheckName);
    } else {
      const sanTxt = move.san || squareToAlgebraic(move.to.row, move.to.col);
      setJarvesCommentary(`Jogada executada: ${sanTxt}. Vez de ${nextState.turn === 'w' ? 'Brancas' : 'Pretas'}.`);
    }

    // Reset selection & drag
    setSelectedSquare(null);
    setLegalTargetSquares([]);
    setDraggingSquare(null);
    setDragPosition(null);

    // Sync to Online Room via unified postRoomMessage (Cross-browser, cross-device, mobile)
    if (gameMode === 'online' && onlineRoomId) {
      postRoomMessage('CHESS_MOVE', {
        roomId: onlineRoomId,
        nextState,
        move,
        san: move.san,
        boardState: nextState.board,
        status: nextState.isCheckmate ? 'checkmate' : nextState.isCheck ? 'check' : 'active',
      });
    }
  }, [gameState, gameMode, onlineRoomId, onAddLog, postRoomMessage]);

  // Reference to latest executeMove to avoid breaking active timers on state updates
  const executeMoveRef = useRef(executeMove);
  useEffect(() => {
    executeMoveRef.current = executeMove;
  }, [executeMove]);

  // Instant move trigger button for user
  const handleForceAiMoveNow = useCallback(() => {
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    if (aiIntervalRef.current) {
      clearInterval(aiIntervalRef.current);
      aiIntervalRef.current = null;
    }
    setIsAiThinking(false);
    setAiTimeRemaining(0);

    const move = plannedAiMoveRef.current;
    plannedAiMoveRef.current = null;
    if (move) {
      executeMoveRef.current(move);
    }
  }, []);

  // JARVES AI Move Trigger - Controlled progressive timer
  // User Requirement: Plays within maximum 10s after player's move,
  // progresses gradually with difficulty, strictly capped below 30s.
  useEffect(() => {
    const isAiTurn =
      gameMode === 'ai' &&
      gameState.turn !== playerColor &&
      !gameState.isCheckmate &&
      !gameState.isStalemate;

    if (!isAiTurn) {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
      if (aiIntervalRef.current) {
        clearInterval(aiIntervalRef.current);
        aiIntervalRef.current = null;
      }
      setIsAiThinking(false);
      setAiTimeRemaining(0);
      plannedAiMoveRef.current = null;
      return;
    }

    // 1. Calculate best tactical move immediately in memory (<15ms)
    const aiMove = getJarvesAiMove(gameState, aiDifficulty);
    if (!aiMove) {
      setIsAiThinking(false);
      return;
    }
    plannedAiMoveRef.current = aiMove;

    // 2. Progressive timing calculation:
    // Starts fast and well under 10 seconds initially, expanding with game development and difficulty,
    // with a strict upper limit that NEVER exceeds 30 seconds.
    const moveCount = gameState.history.length;
    let thinkMs = 1500;
    if (aiDifficulty === 'easy') {
      // Easy: 1.5s up to ~3.5s
      thinkMs = 1500 + Math.min(moveCount * 50, 2000);
    } else if (aiDifficulty === 'medium') {
      // Medium: 3.5s up to ~9.0s (under 10s base, expands smoothly)
      thinkMs = 3500 + Math.min(moveCount * 120, 5500);
    } else {
      // Hard: 7.0s up to 24.0s (never exceeds 30s)
      thinkMs = 7000 + Math.min(moveCount * 300, 17000);
    }

    // Strict safety clamp: minimum 800ms, maximum 28,000ms (guarantees < 30s ceiling)
    const finalDurationMs = Math.min(Math.max(thinkMs, 800), 28000);

    setAiTotalThinkTime(finalDurationMs);
    setAiTimeRemaining(finalDurationMs);
    setIsAiThinking(true);

    const startTime = Date.now();
    const endTime = startTime + finalDurationMs;

    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);

    // Live countdown updater every 100ms
    aiIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setAiTimeRemaining(remaining);
      if (remaining <= 0 && aiIntervalRef.current) {
        clearInterval(aiIntervalRef.current);
        aiIntervalRef.current = null;
      }
    }, 100);

    // AI move timeout execution
    aiTimerRef.current = setTimeout(() => {
      if (aiIntervalRef.current) {
        clearInterval(aiIntervalRef.current);
        aiIntervalRef.current = null;
      }
      aiTimerRef.current = null;
      setIsAiThinking(false);
      setAiTimeRemaining(0);

      const move = plannedAiMoveRef.current;
      plannedAiMoveRef.current = null;
      if (move) {
        executeMoveRef.current(move);
      }
    }, finalDurationMs);

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
      if (aiIntervalRef.current) {
        clearInterval(aiIntervalRef.current);
        aiIntervalRef.current = null;
      }
    };
  }, [
    gameState.turn,
    gameState.history.length,
    gameMode,
    playerColor,
    aiDifficulty,
    gameState.isCheckmate,
    gameState.isStalemate,
  ]);

  // Click on a Square (Click-to-Move or Select)
  const handleSquareClick = (r: number, c: number) => {
    // If pending promotion, ignore clicks
    if (pendingPromotionMove) return;

    // Check if clicking one of the highlighted legal destination squares
    const target = legalTargetSquares.find((t) => t.row === r && t.col === c);
    if (target) {
      executeMove(target.move);
      return;
    }

    // Otherwise, check if clicking one of own pieces to select
    const piece = gameState.board[r][c];
    if (piece && piece.color === gameState.turn) {
      // In AI mode, verify it's the human's turn
      if (gameMode === 'ai' && piece.color !== playerColor) return;
      // In Online mode, verify it's this player's turn AND this player's assigned color
      if (gameMode === 'online' && (gameState.turn !== playerColor || piece.color !== playerColor)) return;

      setSelectedSquare({ row: r, col: c });
      const legals = getLegalMovesForSquare(gameState, r, c);
      setLegalTargetSquares(legals.map((m) => ({ row: m.to.row, col: m.to.col, move: m })));
    } else {
      setSelectedSquare(null);
      setLegalTargetSquares([]);
    }
  };

  // Pointer Down (Drag start)
  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    const piece = gameState.board[r][c];
    if (!piece || piece.color !== gameState.turn) return;
    if (gameMode === 'ai' && piece.color !== playerColor) return;
    if (gameMode === 'online' && (gameState.turn !== playerColor || piece.color !== playerColor)) return;

    setSelectedSquare({ row: r, col: c });
    const legals = getLegalMovesForSquare(gameState, r, c);
    setLegalTargetSquares(legals.map((m) => ({ row: m.to.row, col: m.to.col, move: m })));

    setDraggingSquare({ row: r, col: c });
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  // Pointer Move (Drag)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingSquare) {
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  };

  // Pointer Up (Drop on destination, supporting flipped board coordinates)
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingSquare) return;

    if (boardContainerRef.current) {
      const rect = boardContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        const colWidth = rect.width / 8;
        const rowHeight = rect.height / 8;
        const screenCol = Math.floor(x / colWidth);
        const screenRow = Math.floor(y / rowHeight);

        // When board is flipped for Black, invert grid coordinates so dropping on visual square maps accurately
        const targetRow = isBoardFlipped ? 7 - screenRow : screenRow;
        const targetCol = isBoardFlipped ? 7 - screenCol : screenCol;

        const legal = legalTargetSquares.find(
          (t) => t.row === targetRow && t.col === targetCol
        );

        if (legal) {
          executeMove(legal.move);
        }
      }
    }

    setDraggingSquare(null);
    setDragPosition(null);
  };

  // Confirm Pawn Promotion
  const handleSelectPromotion = (pType: PieceType) => {
    if (!pendingPromotionMove) return;
    const moveWithPromo: ChessMove = {
      ...pendingPromotionMove,
      promotion: pType,
    };
    setPendingPromotionMove(null);
    executeMove(moveWithPromo);
  };

  // Reset Game
  const handleResetGame = () => {
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    if (aiIntervalRef.current) {
      clearInterval(aiIntervalRef.current);
      aiIntervalRef.current = null;
    }
    setIsAiThinking(false);
    setAiTimeRemaining(0);
    plannedAiMoveRef.current = null;

    setGameState(createInitialGameState());
    setSelectedSquare(null);
    setLegalTargetSquares([]);
    setPendingPromotionMove(null);
    setJarvesCommentary('Tabuleiro reorganizado. Prata contra Bronze. Que vença o melhor estrategista!');
    onAddLog('Partida de Xadrez Reiniciada', 'Xadrez Medieval');
    chessAudio.playMove();
  };

  // Send Invitation to an online user (Inviter ALWAYS plays with White / Pedras Claras)
  const handleSendInvite = (targetUser: { id: string; name: string }) => {
    setInviteSentTo(targetUser.name);
    const from = { id: currentUser?.id || 'usr-romildo-master', name: currentUser?.name || 'Romildo' };
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const inviteId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Inviter is assigned White pieces
    setPlayerColor('w');
    sentInviteIdRef.current = inviteId;
    sentRoomIdRef.current = roomId;

    fetch('/api/chess/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: inviteId,
        fromUser: from,
        toUser: targetUser,
        roomId,
        withCamera: optInCameraOnInvite,
        withMic: optInMicOnInvite,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          onAddLog(`Convite de Xadrez Enviado para ${targetUser.name}`, 'Xadrez Online');
        }
      })
      .catch(() => {});

    // Broadcast challenge across active tabs/sessions and network
    broadcastChannelRef.current?.postMessage({
      type: 'CHESS_INVITE',
      payload: {
        id: inviteId,
        fromUser: from,
        toUser: targetUser,
        roomId,
        senderSessionId: tabSessionIdRef.current,
        withCamera: optInCameraOnInvite,
        withMic: optInMicOnInvite,
      },
    });

    // Timeout alert notice after 20s
    setTimeout(() => {
      setInviteSentTo(null);
    }, 20000);
  };

  // Accept challenge: Invited user ALWAYS plays with Dark / Bronze pieces ('b') and board is flipped
  const handleAcceptInvite = () => {
    if (!incomingInvite) return;
    const inv = incomingInvite;
    const roomId = inv.roomId || `room_${Date.now()}`;

    chessAudio.playMove();

    // The invited player ALWAYS plays with Dark / Bronze pieces ('b')
    setPlayerColor('b');
    setGameMode('online');
    setOnlineRoomId(roomId);
    setOnlineOpponent(inv.fromUser);
    setGameState(createInitialGameState());
    setIsOnlineLobbyOpen(false);
    setIncomingInvite(null);

    setJarvesCommentary(
      `Desafio aceito! Você está jogando com as Pedras Escuras (Bronze) contra ${inv.fromUser.name}. O tabuleiro foi virado para sua perspectiva. Câmeras e áudio liberados! Vez das Brancas (iniciam).`
    );
    onAddLog('Partida de Xadrez Online Aceita', 'Xadrez Online', `Contra ${inv.fromUser.name}`);

    // Automatically liberate camera and mic for invited player and display AV transmission panel
    setIsAvModalVisible(true);
    setIsAvPanelMinimized(false);
    setAvPanelPlacement('side');
    setOpponentCameraActive(true);
    setOpponentMicActive(true);

    startMediaStream(true, true);

    // 1. Notify server of acceptance (allows other device/browser to connect immediately)
    fetch('/api/chess/invites/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteId: inv.id,
        accept: true,
        responderUser: currentUser,
        withCamera: true,
        withMic: true,
      }),
    }).catch(() => {});

    // 2. Broadcast acceptance to room messages and BroadcastChannel
    const acceptPayload = {
      roomId,
      fromUser: inv.fromUser,
      toUser: { id: currentUser?.id || 'usr-guest', name: currentUser?.name || 'Convidado' },
      toUserId: inv.fromUser.id,
      withCamera: true,
      withMic: true,
    };

    try {
      broadcastChannelRef.current?.postMessage({
        type: 'CHESS_INVITE_ACCEPT',
        payload: acceptPayload,
      });
    } catch {}

    fetch(`/api/chess/room/${roomId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: currentUser?.id || 'usr-guest',
        senderName: currentUser?.name || 'Convidado',
        type: 'CHESS_INVITE_ACCEPT',
        payload: acceptPayload,
      }),
    }).catch(() => {});
  };

  // Decline challenge invite
  const handleDeclineInvite = () => {
    if (!incomingInvite) return;
    const inv = incomingInvite;

    fetch('/api/chess/invites/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteId: inv.id,
        accept: false,
        responderUser: currentUser,
      }),
    }).catch(() => {});

    broadcastChannelRef.current?.postMessage({
      type: 'CHESS_INVITE_DECLINED',
      payload: {
        inviteId: inv.id,
        fromUserId: inv.fromUser.id,
        declinedByName: currentUser?.name || 'Oponente',
      },
    });

    setIncomingInvite(null);
    setJarvesCommentary('Convite de xadrez recusado.');
  };

  // Check if square is the checked King
  const isKingChecked = (r: number, c: number): boolean => {
    if (!gameState.isCheck && !gameState.isCheckmate) return false;
    const piece = gameState.board[r][c];
    return !!piece && piece.type === 'k' && piece.color === gameState.turn;
  };

  // Render the attractive Live Audio & Video Transmission Panel (Docked or Modal) - Reduced 30% for ultra-sleek UX
  const renderAvTransmissionPanel = (isModal: boolean) => {
    return (
      <div className="rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-b from-[#121624] via-[#101420] to-[#0A0D15] shadow-2xl p-2.5 sm:p-3 text-slate-100 relative w-full">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/30 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.4)]">
              <Video className="w-3.5 h-3.5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-orbitron font-bold text-xs text-cyan-100 tracking-wider">
                  TRANSMISSÃO AO VIVO
                </h3>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[8px] font-mono text-rose-300 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>P2P ONLINE</span>
                </span>
              </div>
              <p className="text-[9px] text-slate-400 font-mono">
                Áudio e vídeo sincronizados entre duelistas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Toggle Docked vs Modal mode */}
            {isModal ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsAvModalVisible(false)}
                  className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/50 text-amber-300 text-[10px] font-orbitron font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
                  title="Esconder modal de câmeras (continua transmitindo áudio e vídeo)"
                >
                  <EyeOff className="w-3 h-3 text-amber-300" />
                  <span>ESCONDER</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAvModalOpen(false);
                    setAvPanelPlacement('side');
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-900 border border-cyan-500/40 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-orbitron font-bold flex items-center gap-1 transition cursor-pointer"
                  title="Fixar painel ao lado do tabuleiro de xadrez"
                >
                  <Minimize2 className="w-3 h-3" />
                  <span className="hidden sm:inline">FIXAR AO LADO</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsAvModalOpen(true);
                  setIsAvModalVisible(true);
                }}
                className="px-2 py-1 rounded-lg bg-slate-900 border border-cyan-500/40 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-orbitron font-bold flex items-center gap-1 transition cursor-pointer"
                title="Expandir para janela modal móvel com visão ampliada"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="hidden sm:inline">MODAL</span>
              </button>
            )}

            {/* Minimize Toggle (Docked mode) */}
            {!isModal && (
              <button
                type="button"
                onClick={() => setIsAvPanelMinimized(!isAvPanelMinimized)}
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
                title={isAvPanelMinimized ? 'Expandir painel de vídeo' : 'Minimizar painel de vídeo'}
              >
                {isAvPanelMinimized ? <ChevronDown className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            )}

            {/* Close Modal (Modal mode) */}
            {isModal && (
              <button
                type="button"
                onClick={() => {
                  setIsAvModalOpen(false);
                  setIsAvModalVisible(false);
                }}
                className="p-1 rounded-lg bg-slate-900 hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 border border-slate-800 cursor-pointer transition"
                title="Fechar modal de transmissão"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Panel Content (Hidden if minimized in docked view) */}
        {!isAvPanelMinimized && (
          <div className="mt-2.5 space-y-2.5">
            
            {/* Heraldic Emote Toast Alert */}
            {remoteEmoteNotification && (
              <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-yellow-500/20 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.3)] flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-1.5 text-amber-200 font-bold font-orbitron text-xs">
                  <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{remoteEmoteNotification.sender}:</span>
                  <span className="text-white text-xs font-sans">{remoteEmoteNotification.text}</span>
                </div>
                <span className="text-[9px] font-mono text-amber-400/80">AO VIVO</span>
              </div>
            )}

            {/* Permission Warning Notice (if applicable) */}
            {hasCameraPermissionError && (
              <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="leading-tight">{hasCameraPermissionError}</span>
              </div>
            )}

            {/* Dual Feed Video Grid - 30% Sleeker and Compact */}
            <div className={`grid gap-2 ${isModal ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              
              {/* FEED 1: LOCAL PLAYER (VOCÊ) */}
              <div className="relative rounded-xl overflow-hidden border-2 border-cyan-500/40 bg-slate-950/95 shadow-md group">
                <div className={`w-full relative flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black overflow-hidden ${
                  isModal ? 'h-32 sm:h-36' : 'h-28 sm:h-32'
                }`}>
                  
                  {/* Real Local Video Element (Plays inline without full-screening on mobile) */}
                  <video
                    ref={(el) => {
                      localVideoRef.current = el;
                      if (el && mediaStreamRef.current && el.srcObject !== mediaStreamRef.current) {
                        el.srcObject = mediaStreamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                      isCameraActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
                    }`}
                  />

                  {/* Holographic Avatar when Camera is Inactive */}
                  {!isCameraActive && (
                    <div className="flex flex-col items-center justify-center gap-1.5 p-2 text-center z-10">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/15 border-2 border-cyan-400/50 flex items-center justify-center text-cyan-300 font-orbitron font-black text-base shadow-[0_0_15px_rgba(6,182,212,0.3)] relative">
                        <span className="relative z-10">{currentUser?.name?.charAt(0) || 'V'}</span>
                        <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-orbitron font-bold text-cyan-200">
                          CÂMERA DESATIVADA
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          Avatar JARVES ativo
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Top Left: Player Identification Pill */}
                  <div className="absolute top-1.5 left-1.5 z-20 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded-lg bg-black/80 backdrop-blur-md border border-cyan-500/40 text-[9px] font-orbitron font-bold text-cyan-300 flex items-center gap-1 shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="max-w-[80px] sm:max-w-[110px] truncate">{currentUser?.name || 'Você'}</span>
                      <span className="text-[8px] px-1 rounded bg-cyan-900/50 text-cyan-200 border border-cyan-500/30">
                        {isBoardFlipped ? 'BRONZE 🟤' : 'PRATA ⚪'}
                      </span>
                    </span>
                  </div>

                  {/* Top Right: Status Icons */}
                  <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1">
                    <span className={`p-1 rounded-md backdrop-blur-md border text-[9px] ${
                      isMicActive
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                        : 'bg-rose-950/80 text-rose-400 border-rose-500/40'
                    }`}>
                      {isMicActive ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
                    </span>
                    <span className={`p-1 rounded-md backdrop-blur-md border text-[9px] ${
                      isCameraActive
                        ? 'bg-cyan-950/80 text-cyan-400 border-cyan-500/40'
                        : 'bg-slate-900/80 text-slate-400 border-slate-700'
                    }`}>
                      {isCameraActive ? <Video className="w-2.5 h-2.5" /> : <VideoOff className="w-2.5 h-2.5" />}
                    </span>
                  </div>

                  {/* Bottom Left: Live Audio Equalizer Waveform */}
                  <div className="absolute bottom-1.5 left-1.5 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-cyan-500/30">
                    <span className="text-[8px] font-mono text-slate-400">MIC</span>
                    <div className="flex items-end gap-0.5 h-2.5 w-7">
                      {[15, 30, 60, 40, 20].map((baseHeight, idx) => {
                        const h = isMicActive ? Math.min(100, Math.max(15, (localAudioLevel * (baseHeight / 40)))) : 10;
                        return (
                          <div
                            key={idx}
                            className={`w-0.5 rounded-full transition-all duration-75 ${
                              isMicActive ? 'bg-gradient-to-t from-emerald-500 to-cyan-400' : 'bg-slate-700'
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Right: Quick On-Screen Camera/Mic Toggles */}
                  <div className="absolute bottom-1.5 right-1.5 z-20 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`p-1 rounded-md border text-[10px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                        isMicActive
                          ? 'bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-300 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                          : 'bg-rose-500/25 hover:bg-rose-500/40 text-rose-300 border-rose-500/60'
                      }`}
                      title={isMicActive ? 'Mutar meu Microfone' : 'Ativar meu Microfone'}
                    >
                      {isMicActive ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                    </button>

                    <button
                      type="button"
                      onClick={toggleCamera}
                      className={`p-1 rounded-md border text-[10px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                        isCameraActive
                          ? 'bg-cyan-500/25 hover:bg-cyan-500/40 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                      title={isCameraActive ? 'Desativar minha Câmera' : 'Abrir minha Câmera'}
                    >
                      {isCameraActive ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* FEED 2: REMOTE OPPONENT (OPONENTE) */}
              <div className="relative rounded-xl overflow-hidden border-2 border-amber-500/40 bg-slate-950/95 shadow-md group">
                <div className={`w-full relative flex items-center justify-center bg-gradient-to-b from-[#22160E] via-slate-950 to-black overflow-hidden ${
                  isModal ? 'h-32 sm:h-36' : 'h-28 sm:h-32'
                }`}>
                  
                  {/* Real Remote Video Element (Streams live across all browsers and phones via WebRTC) */}
                  <video
                    ref={(el) => {
                      remoteVideoRef.current = el;
                      if (el && remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                        el.srcObject = remoteStreamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      opponentCameraActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
                    }`}
                  />

                  {/* Remote Audio Track Player (Always active in background so opponent is heard on all devices) */}
                  <audio
                    ref={(el) => {
                      remoteAudioRef.current = el;
                      if (el && remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                        el.srcObject = remoteStreamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    className="hidden"
                  />

                  {/* Placeholder Avatar when Remote Camera is Inactive */}
                  {!opponentCameraActive && (
                    <div className="flex flex-col items-center justify-center gap-1.5 p-2 text-center z-10">
                      <div className="w-10 h-10 rounded-xl bg-[#3D2513]/40 border-2 border-amber-500/40 flex items-center justify-center text-amber-300 font-orbitron font-black text-base shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                        <span>{onlineOpponent?.name?.charAt(0) || 'O'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-orbitron font-bold text-amber-300">
                          CÂMERA DESLIGADA
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          Oponente sem vídeo
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Top Left: Opponent Identification Pill */}
                  <div className="absolute top-1.5 left-1.5 z-20 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded-lg bg-black/80 backdrop-blur-md border border-amber-500/40 text-[9px] font-orbitron font-bold text-amber-300 flex items-center gap-1 shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="max-w-[80px] sm:max-w-[110px] truncate">{onlineOpponent?.name || 'Oponente'}</span>
                      <span className="text-[8px] px-1 rounded bg-amber-900/50 text-amber-200 border border-amber-500/30">
                        {isBoardFlipped ? 'PRATA ⚪' : 'BRONZE 🟤'}
                      </span>
                    </span>
                  </div>

                  {/* Top Right: Opponent Status Badges */}
                  <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1">
                    <span className={`p-1 rounded-md backdrop-blur-md border text-[9px] ${
                      opponentMicActive
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-900/80 text-slate-400 border-slate-700'
                    }`}>
                      {opponentMicActive ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
                    </span>
                    <span className={`p-1 rounded-md backdrop-blur-md border text-[9px] ${
                      opponentCameraActive
                        ? 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                        : 'bg-slate-900/80 text-slate-400 border-slate-700'
                    }`}>
                      {opponentCameraActive ? <Video className="w-2.5 h-2.5" /> : <VideoOff className="w-2.5 h-2.5" />}
                    </span>
                  </div>

                  {/* Bottom Left: Opponent Live Audio Equalizer Waveform */}
                  <div className="absolute bottom-1.5 left-1.5 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-amber-500/30">
                    <span className="text-[8px] font-mono text-slate-400">ÁUDIO</span>
                    <div className="flex items-end gap-0.5 h-2.5 w-7">
                      {[25, 45, 65, 35, 20].map((baseHeight, idx) => {
                        const h = opponentMicActive ? Math.min(100, Math.max(15, (opponentAudioLevel * (baseHeight / 40)))) : 10;
                        return (
                          <div
                            key={idx}
                            className={`w-0.5 rounded-full transition-all duration-75 ${
                              opponentMicActive ? 'bg-gradient-to-t from-emerald-500 to-amber-400' : 'bg-slate-700'
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Right: Latency & Network Pill */}
                  <div className="absolute bottom-1.5 right-1.5 z-20 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-slate-700 text-[8px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>WebRTC • P2P</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Heraldic Reactions / Emotes Bar */}
            <div className="pt-1.5 border-t border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-orbitron font-bold text-slate-300 flex items-center gap-1">
                  <MessageSquare className="w-2.5 h-2.5 text-cyan-400" />
                  <span>REAÇÕES & FRASES RÁPIDAS:</span>
                </span>
                <span className="text-[8px] font-mono text-slate-500">Transmissão instantânea</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { text: '⚔️ Xeque!', label: 'Xeque!' },
                  { text: '👑 Belo Lance!', label: 'Lance!' },
                  { text: '🛡️ Em Guarda!', label: 'Defesa!' },
                  { text: '🤝 Empate?', label: 'Empate?' },
                  { text: '👏 Respeito!', label: 'Respeito!' },
                ].map((emote, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendHeraldicEmote(emote.text)}
                    className="py-0.5 px-1 rounded-md bg-slate-900/90 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-200 border border-slate-800 hover:border-cyan-500/40 text-[9px] font-orbitron font-bold transition cursor-pointer text-center truncate active:scale-95"
                    title={`Enviar reação: ${emote.text}`}
                  >
                    <span>{emote.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Security Note */}
            <div className="text-[9px] text-slate-500 font-mono text-center flex items-center justify-center gap-1 pt-0.5">
              <Shield className="w-2.5 h-2.5 text-cyan-500/60" />
              <span>Transmissão WebRTC multiplataforma com áudio e vídeo opcionais.</span>
            </div>

          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`space-y-4 select-none animate-in fade-in duration-300 w-full ${
        isFullscreen ? 'max-w-6xl mx-auto' : ''
      }`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* ========================================================
          1. CHESS MASTER CONTROL TOOLBAR
          ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#171212] via-[#241A16] to-[#120D0C] border-2 border-[#8B653A]/60 shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
        
        {/* Left: Title & Mode Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#8B653A]/30 to-[#3D2513]/40 border border-[#C59B63]/50 flex items-center justify-center text-[#E5C38F] shadow-[0_0_15px_rgba(197,155,99,0.3)]">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-orbitron font-black text-[#F3E2C6] tracking-wider flex items-center gap-1.5">
                <span>XADREZ CLÁSSICO & MEDIEVAL</span>
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {gameMode === 'ai' ? `IA JARVES (${aiDifficulty.toUpperCase()})` : `ONLINE MULTIPLAYER`}
              </span>
            </div>
            <p className="text-[11px] text-[#A68F74] mt-0.5 font-serif italic">
              Peças de prata esculpida e bronze oxidado sobre tabuleiro gótico de carvalho e ferro forjado.
            </p>
          </div>
        </div>

        {/* Right: Controls & Viewpoint Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Viewpoint 1 & 2 Selector (3D Catedral vs Cenital Top-Down) */}
          <div className="flex items-center gap-1 p-1 bg-black/70 rounded-xl border border-[#8B653A]/50">
            <button
              onClick={() => setViewpoint('3d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewpoint === '3d'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100 shadow-[0_0_10px_rgba(217,119,6,0.4)]'
                  : 'text-[#A68F74] hover:text-white'
              }`}
              title="Visão 3D Perspectiva Catedral (Ângulo Frontal Realista)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">3D CATEDRAL</span>
            </button>

            <button
              onClick={() => setViewpoint('topdown')}
              className={`px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewpoint === 'topdown'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100 shadow-[0_0_10px_rgba(217,119,6,0.4)]'
                  : 'text-[#A68F74] hover:text-white'
              }`}
              title="Visão Superior Plana (Top-Down Cenital Clássica)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SUPERIOR PLANA</span>
            </button>
          </div>

          {/* Mode Switcher: JARVES IA vs Jogar Online */}
          <div className="flex items-center gap-1 p-1 bg-black/70 rounded-xl border border-[#8B653A]/50">
            <button
              onClick={() => setGameMode('ai')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-orbitron font-bold transition flex items-center gap-1 cursor-pointer ${
                gameMode === 'ai' ? 'bg-[#3D2513] text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Jogar contra o JARVES IA"
            >
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">VS JARVES</span>
            </button>

            <button
              onClick={() => {
                setGameMode('online');
                setIsOnlineLobbyOpen(true);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-orbitron font-bold transition flex items-center gap-1 cursor-pointer ${
                gameMode === 'online' ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Convidar e Jogar com Outro Usuário Online"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">JOGAR ONLINE</span>
            </button>
          </div>

          {/* Live Video & Audio Panel Switcher (Active during online game: Toggle Show/Hide) */}
          {gameMode === 'online' && onlineRoomId && (
            <button
              onClick={() => {
                if (isAvModalOpen && isAvModalVisible) {
                  setIsAvModalVisible(false);
                } else {
                  setIsAvModalOpen(true);
                  setIsAvModalVisible(true);
                }
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-orbitron font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md ${
                isAvModalOpen && isAvModalVisible
                  ? 'bg-gradient-to-r from-amber-600/30 to-yellow-600/30 text-amber-200 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : isCameraActive || isMicActive
                  ? 'bg-gradient-to-r from-cyan-600/30 to-emerald-600/30 text-cyan-200 border-cyan-500/50 hover:brightness-110 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-black/70 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title={
                isAvModalOpen && isAvModalVisible
                  ? 'Esconder Modal de Câmeras e Áudio'
                  : 'Mostrar Modal de Câmeras e Áudio'
              }
            >
              <div className="relative">
                {isAvModalOpen && isAvModalVisible ? (
                  <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                )}
                {(isCameraActive || isMicActive) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
              <span className="hidden sm:inline">
                {isAvModalOpen && isAvModalVisible ? 'ESCONDER CÂMERAS' : 'MOSTRAR CÂMERAS'}
              </span>
            </button>
          )}

          {/* Audio Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-black/60 border border-[#8B653A]/50 text-amber-300 hover:text-white transition cursor-pointer"
            title={isMuted ? 'Ativar Efeitos Sonoros' : 'Mutar Sons'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Reset Board */}
          <button
            onClick={handleResetGame}
            className="p-2 rounded-xl bg-black/60 border border-[#8B653A]/50 text-amber-300 hover:text-white transition cursor-pointer"
            title="Reiniciar Partida"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className={`p-2 px-2.5 rounded-xl border text-xs font-orbitron font-bold transition cursor-pointer flex items-center gap-1 ${
                isFullscreen
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-black/60 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/20'
              }`}
              title={isFullscreen ? 'Sair da Tela Cheia (ESC)' : 'Ativar Tela Cheia'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden lg:inline">{isFullscreen ? 'SAIR' : 'TELA CHEIA'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          2. VOICE SPEECH & COMMENTARY ALERT BANNER
          ======================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-[#1E1513] via-[#2A1D1A] to-[#1E1513] border border-amber-500/30 text-xs shadow-md">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            {isAiThinking ? <Radio className="w-4 h-4 animate-spin text-amber-400" /> : <Bot className="w-4 h-4" />}
          </div>
          <div className="flex flex-col">
            <span className="text-[#EAD5B8] font-mono text-[11px] leading-relaxed">
              {isAiThinking ? (
                <span className="text-amber-400 font-bold flex items-center gap-1.5 flex-wrap">
                  <span>JARVES calculando melhor tática...</span>
                  <span className="text-amber-300/90 font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded border border-amber-500/30">
                    ⏱️ {(aiTimeRemaining / 1000).toFixed(1)}s restantes (máx 10s base)
                  </span>
                </span>
              ) : (
                jarvesCommentary
              )}
            </span>
            {isAiThinking && (
              <div className="w-full max-w-[240px] bg-black/60 rounded-full h-1.5 overflow-hidden mt-1 border border-amber-500/30">
                <div
                  className="bg-gradient-to-r from-amber-600 via-amber-400 to-amber-200 h-full transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  style={{
                    width: `${Math.min(100, Math.max(0, ((aiTotalThinkTime - aiTimeRemaining) / (aiTotalThinkTime || 1)) * 100))}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Turn indicator pill & Force Move button */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {isAiThinking && (
            <button
              onClick={handleForceAiMoveNow}
              className="px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-500/50 text-[10px] font-orbitron font-black flex items-center gap-1 transition shadow-[0_0_10px_rgba(245,158,11,0.3)] cursor-pointer active:scale-95"
              title="Forçar o Jarves a jogar imediatamente sem esperar o cálculo"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>JOGAR AGORA</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-[#A68F74]">VEZ:</span>
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-orbitron font-bold flex items-center gap-1.5 ${
                gameState.turn === 'w'
                  ? 'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                  : 'bg-gradient-to-r from-stone-800 to-stone-900 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(180,83,9,0.3)]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${gameState.turn === 'w' ? 'bg-white' : 'bg-amber-500'}`} />
              <span>{gameState.turn === 'w' ? 'PRATA (BRANCAS)' : 'BRONZE (PRETAS)'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. MAIN STAGE: THE CHESS BOARD & PEDESTAL
          ======================================================== */}
      <div className="w-full flex flex-col xl:flex-row items-center xl:items-start justify-center gap-6 relative py-2">
        
        {/* Main Chessboard Center Column */}
        <div className="w-full max-w-[560px] flex flex-col items-center justify-center">
          {/* Captured Pieces Bar: Top (Opponent) */}
          <div className="w-full max-w-[560px] flex items-center justify-between px-3 py-1.5 mb-1 bg-black/60 rounded-xl border border-[#523A25] text-xs font-mono">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-[#A68F74] font-bold">
              {isBoardFlipped ? 'Capturadas (Prata):' : 'Capturadas (Bronze):'}
            </span>
            {(isBoardFlipped ? gameState.capturedWhite : gameState.capturedBlack).length === 0 ? (
              <span className="text-[10px] text-slate-600 italic">Nenhuma</span>
            ) : (
              (isBoardFlipped ? gameState.capturedWhite : gameState.capturedBlack).map((t, idx) => (
                <span
                  key={idx}
                  className={`text-base ${isBoardFlipped ? 'text-slate-300' : 'text-amber-600'} drop-shadow`}
                >
                  {getPieceSymbol(t, isBoardFlipped ? 'w' : 'b')}
                </span>
              ))
            )}
          </div>
          <span className="text-[10px] text-amber-400/80 font-bold">
            {gameMode === 'ai'
              ? 'IA JARVES'
              : `${onlineOpponent?.name || 'Oponente'} (${isBoardFlipped ? 'Prata' : 'Bronze'})`}
          </span>
        </div>

        {/* 3D / TOP-DOWN BOARD CONTAINER (Inspired by xadreznovo3_6a669947.jpg) */}
        <div
          className="relative transition-all duration-700 ease-out flex items-center justify-center"
          style={{
            perspective: viewpoint === '3d' ? '1200px' : 'none',
          }}
        >
          {/* Natural Maple/Birch Blonde Wood Tabletop (Matching xadreznovo3_6a669947.jpg) */}
          <div
            className={`relative rounded-3xl p-2 sm:p-4 md:p-5 transition-transform duration-500 ${
              viewpoint === '3d'
                ? 'shadow-[0_35px_60px_rgba(0,0,0,0.95),0_10px_30px_rgba(160,110,50,0.35)]'
                : 'shadow-[0_15px_35px_rgba(0,0,0,0.85)]'
            }`}
            style={{
              background: 'radial-gradient(ellipse at 50% 25%, #EAD1AB 0%, #DDB884 45%, #C5985F 100%)',
              border: '4px solid #AF7E46',
              boxShadow: viewpoint === '3d'
                ? 'inset 0 2px 10px rgba(255,255,255,0.4), 0 30px 60px rgba(0,0,0,0.9), 0 10px 25px rgba(100,60,20,0.5)'
                : 'inset 0 2px 10px rgba(255,255,255,0.4), 0 15px 35px rgba(0,0,0,0.8)',
              transform: viewpoint === '3d' ? 'rotateX(26deg) translateY(-8px) scale(0.97)' : 'none',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Subtle Wood Bevel Outer Corner Rivets */}
            <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 rounded-full bg-[#AF7E46] border border-[#F5DCB7] opacity-60 shadow-sm" />
            <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#AF7E46] border border-[#F5DCB7] opacity-60 shadow-sm" />
            <div className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 rounded-full bg-[#AF7E46] border border-[#F5DCB7] opacity-60 shadow-sm" />
            <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#AF7E46] border border-[#F5DCB7] opacity-60 shadow-sm" />

            {/* Official Tournament Mat with Cream Margin & Forest Green Coordinates */}
            <div className="relative p-1 sm:p-2.5 rounded-2xl bg-[#F3EED9] border-2 sm:border-3 border-[#C4B792] shadow-[0_12px_28px_rgba(0,0,0,0.45),inset_0_1px_3px_rgba(255,255,255,0.8)]">
              
              {/* Top Algebraic Coordinate Files: a-h (Matching xadreznovo3_6a669947.jpg) */}
              <div className="flex w-full mb-0.5 px-3 sm:px-4 justify-around text-[#1E5637] font-mono font-bold text-[9px] sm:text-[11px] select-none">
                {(isBoardFlipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']).map((f) => (
                  <span key={`top-${f}`} className="w-full text-center">
                    {f}
                  </span>
                ))}
              </div>

              {/* Middle Section: Left Ranks (8-1) + 8x8 Board + Right Ranks (8-1) */}
              <div className="flex items-center">
                {/* Left Margin Ranks */}
                <div className="flex flex-col justify-around h-[280px] sm:h-[430px] md:h-[470px] pr-1 sm:pr-2 text-[#1E5637] font-mono font-bold text-[9px] sm:text-[11px] select-none">
                  {(isBoardFlipped ? ['1', '2', '3', '4', '5', '6', '7', '8'] : ['8', '7', '6', '5', '4', '3', '2', '1']).map((r) => (
                    <span key={`left-${r}`} className="h-full flex items-center justify-center">
                      {r}
                    </span>
                  ))}
                </div>

                {/* THE 8x8 CHESS BOARD GRID */}
                <div
                  ref={boardContainerRef}
                  className="grid grid-cols-8 grid-rows-8 w-[280px] h-[280px] sm:w-[430px] sm:h-[430px] md:w-[470px] md:h-[470px] border-2 border-[#1E5637] rounded-sm overflow-hidden shadow-xl relative select-none touch-none"
                >
                  {(isBoardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]).map((r) =>
                    (isBoardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]).map((c) => {
                      const piece = gameState.board[r][c];
                      const isLightSquare = (r + c) % 2 === 0;
                      const isSelected = selectedSquare?.row === r && selectedSquare?.col === c;
                      const isLegalTarget = legalTargetSquares.some((t) => t.row === r && t.col === c);
                      const isTargetCapture = isLegalTarget && !!piece;
                      const isChecked = isKingChecked(r, c);
                      const isLastMoveSquare =
                        (gameState.lastMove?.from.row === r && gameState.lastMove?.from.col === c) ||
                        (gameState.lastMove?.to.row === r && gameState.lastMove?.to.col === c);

                      return (
                        <div
                          key={`${r}-${c}`}
                          onClick={() => handleSquareClick(r, c)}
                          onPointerDown={(e) => handlePointerDown(e, r, c)}
                          className={`relative flex items-center justify-center cursor-pointer transition-colors ${
                            isLightSquare
                              ? 'bg-gradient-to-br from-[#FAF5E6] via-[#F3EED9] to-[#E9E1C8] text-[#1E5637]'
                              : 'bg-gradient-to-br from-[#2E734C] via-[#24623F] to-[#1C5032] text-[#FAF5E6]'
                          } ${
                            isLastMoveSquare ? 'ring-2 ring-amber-400/80 ring-inset bg-amber-400/20' : ''
                          } ${
                            isSelected ? 'bg-amber-300/40 ring-4 ring-amber-400 ring-inset' : ''
                          } ${
                            isChecked ? 'bg-rose-600/70 animate-pulse ring-4 ring-rose-500 ring-inset' : ''
                          }`}
                        >
                          {/* Legal Target Move Indicator Dot */}
                          {isLegalTarget && !isTargetCapture && (
                            <div className="absolute w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-emerald-400/75 border border-white/60 shadow-[0_0_12px_rgba(52,211,153,0.9)] pointer-events-none animate-pulse" />
                          )}

                          {/* Legal Target Capture Indicator (Ruby Ring) */}
                          {isTargetCapture && (
                            <div className="absolute inset-1 rounded-full border-3 border-rose-500 bg-rose-500/25 shadow-[0_0_15px_rgba(244,63,94,0.9)] pointer-events-none animate-ping" />
                          )}

                          {/* Chess Piece Visual */}
                          {piece && (
                            <div
                              className={`transition-transform duration-200 select-none ${
                                viewpoint === '3d'
                                  ? 'transform -translate-y-1 sm:-translate-y-2 scale-110 drop-shadow-[0_8px_8px_rgba(0,0,0,0.85)]'
                                  : 'drop-shadow-[0_4px_4px_rgba(0,0,0,0.7)]'
                              } ${
                                draggingSquare?.row === r && draggingSquare?.col === c ? 'opacity-30' : 'opacity-100'
                              }`}
                            >
                              <ChessPieceGraphic
                                type={piece.type}
                                color={piece.color}
                                viewpoint={viewpoint}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Right Margin Ranks */}
                <div className="flex flex-col justify-around h-[280px] sm:h-[430px] md:h-[470px] pl-1 sm:pl-2 text-[#1E5637] font-mono font-bold text-[9px] sm:text-[11px] select-none">
                  {(isBoardFlipped ? ['1', '2', '3', '4', '5', '6', '7', '8'] : ['8', '7', '6', '5', '4', '3', '2', '1']).map((r) => (
                    <span key={`right-${r}`} className="h-full flex items-center justify-center">
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Algebraic Coordinate Files: a-h */}
              <div className="flex w-full mt-0.5 px-3 sm:px-4 justify-around text-[#1E5637] font-mono font-bold text-[9px] sm:text-[11px] select-none">
                {(isBoardFlipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']).map((f) => (
                  <span key={`bottom-${f}`} className="w-full text-center">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Tournament Wood Apron Bar (Visible in 3D mode) */}
            {viewpoint === '3d' && (
              <div className="w-full mt-2 pt-1 border-t border-[#B0824B]/60 flex items-center justify-between text-[10px] font-mono text-[#5C3F22] px-2 font-semibold">
                <span className="tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1E5637]" />
                  TABULEIRO OFICIAL TORNEIO (VERDE & MARFIM)
                </span>
                <span className="text-[#8A5A2B] font-bold">
                  {isBoardFlipped ? 'PERSPECTIVA: PRETAS (CHOCOLATE)' : 'PERSPECTIVA: BRANCAS (MARFIM)'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Captured Pieces Bar: Bottom */}
        <div className="w-full max-w-[560px] flex items-center justify-between px-3 py-1.5 mt-2 bg-black/60 rounded-xl border border-[#523A25] text-xs font-mono">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-[#A68F74] font-bold">
              {isBoardFlipped ? 'Capturadas (Bronze):' : 'Capturadas (Prata):'}
            </span>
            {(isBoardFlipped ? gameState.capturedBlack : gameState.capturedWhite).length === 0 ? (
              <span className="text-[10px] text-slate-600 italic">Nenhuma</span>
            ) : (
              (isBoardFlipped ? gameState.capturedBlack : gameState.capturedWhite).map((t, idx) => (
                <span
                  key={idx}
                  className={`text-base ${isBoardFlipped ? 'text-amber-600' : 'text-slate-300'} drop-shadow`}
                >
                  {getPieceSymbol(t, isBoardFlipped ? 'b' : 'w')}
                </span>
              ))
            )}
          </div>
          <span className="text-[10px] text-slate-200 font-bold">
            {currentUser?.name || 'Você'} ({isBoardFlipped ? 'Pedras Escuras / Bronze' : 'Pedras Claras / Prata'})
          </span>
        </div>
      </div>

      {/* Live Audio & Video Transmission Panel Docked Beside Chessboard (Reduced by 30%) */}
      {gameMode === 'online' && onlineRoomId && avPanelPlacement === 'side' && (
        <div className="w-full max-w-[285px] xl:w-[270px] shrink-0 animate-in fade-in slide-in-from-right duration-300">
          {renderAvTransmissionPanel(false)}
        </div>
      )}
    </div>

      {/* ========================================================
          4. FLOATING GHOST PIECE DURING DRAG & DROP
          ======================================================== */}
      {draggingSquare && dragPosition && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 scale-125 drop-shadow-[0_15px_20px_rgba(0,0,0,0.9)]"
          style={{
            left: `${dragPosition.x}px`,
            top: `${dragPosition.y}px`,
          }}
        >
          {gameState.board[draggingSquare.row][draggingSquare.col] && (
            <ChessPieceGraphic
              type={gameState.board[draggingSquare.row][draggingSquare.col]!.type}
              color={gameState.board[draggingSquare.row][draggingSquare.col]!.color}
              viewpoint={viewpoint}
            />
          )}
        </div>
      )}

      {/* ========================================================
          5. PAWN PROMOTION SELECTION MODAL
          ======================================================== */}
      {pendingPromotionMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full rounded-2xl bg-gradient-to-br from-[#1E1513] to-[#120D0C] border-2 border-amber-500/50 p-6 shadow-2xl text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3">
              <Crown className="w-6 h-6" />
            </div>
            <h3 className="text-base font-orbitron font-bold text-slate-100">
              PROMOÇÃO DE PEÃO MEDIEVAL
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              Seu valoroso peão atingiu a última fileira do tabuleiro. Escolha sua nobre consagração:
            </p>

            <div className="grid grid-cols-4 gap-3">
              {(['q', 'r', 'b', 'n'] as PieceType[]).map((pType) => (
                <button
                  key={pType}
                  onClick={() => handleSelectPromotion(pType)}
                  className="p-3 rounded-xl bg-slate-900/90 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400 text-center transition flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <div className="text-2xl group-hover:scale-110 transition">
                    {getPieceSymbol(pType, pendingPromotionMove.piece.color)}
                  </div>
                  <span className="text-[10px] font-orbitron font-bold text-amber-300">
                    {pType === 'q' ? 'DAMA' : pType === 'r' ? 'TORRE' : pType === 'b' ? 'BISPO' : 'CAVALO'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          6. CHECKMATE VICTORY MODAL
          ======================================================== */}
      {gameState.isCheckmate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="max-w-md w-full rounded-3xl bg-gradient-to-br from-[#241A16] via-[#1A120E] to-[#100A08] border-2 border-amber-400/70 p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/30 to-yellow-600/30 border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.5)] mb-4 animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-orbitron font-black text-amber-300 tracking-wider">
              XEQUE-MATE!
            </h2>
            <div className="text-sm font-serif italic text-slate-200 mt-1 mb-4">
              Vitória das Peças de {gameState.turn === 'w' ? 'Bronze (Pretas)' : 'Prata (Brancas)'}!
            </div>

            <div className="p-3 rounded-xl bg-black/60 border border-amber-500/30 text-xs font-mono text-slate-300 space-y-1 mb-6">
              <div>Total de Jogadas: <span className="text-amber-400 font-bold">{gameState.history.length}</span></div>
              <div>Oponente: <span className="text-cyan-400 font-bold">{gameMode === 'ai' ? 'JARVES IA' : onlineOpponent?.name || 'Online'}</span></div>
            </div>

            <button
              onClick={handleResetGame}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 font-orbitron font-black text-xs tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-95 transition cursor-pointer"
            >
              JOGAR NOVA PARTIDA
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          7. ONLINE MULTIPLAYER MATCHMAKING MODAL
          ======================================================== */}
      {isOnlineLobbyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-lg w-full rounded-2xl bg-gradient-to-br from-[#121624] via-[#191F33] to-[#0E121D] border border-cyan-500/40 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-cyan-400" />
                <h3 className="font-orbitron font-bold text-sm text-slate-100">
                  JOGAR COM OUTRO USUÁRIO ONLINE
                </h3>
              </div>
              <button
                onClick={() => setIsOnlineLobbyOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-3 mb-3 leading-relaxed">
              Convide outro usuário disponível na rede JARVES para uma partida simultânea em tempo real.
            </p>

            {/* Video & Audio Opt-in for Inviting Player */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-orbitron font-bold text-slate-100">
                    TRANSMISSÃO DE CÂMERA & ÁUDIO
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  AO VIVO NA PARTIDA
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                Você pode optar por abrir sua câmera e microfone para transmissão no painel ao lado do tabuleiro:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOptInCameraOnInvite(!optInCameraOnInvite)}
                  className={`p-2 rounded-xl text-xs font-orbitron font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                    optInCameraOnInvite
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {optInCameraOnInvite ? <Video className="w-4 h-4 text-cyan-400" /> : <VideoOff className="w-4 h-4 text-slate-500" />}
                  <span>{optInCameraOnInvite ? 'CÂMERA ATIVA' : 'SEM CÂMERA'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptInMicOnInvite(!optInMicOnInvite)}
                  className={`p-2 rounded-xl text-xs font-orbitron font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                    optInMicOnInvite
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {optInMicOnInvite ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-slate-500" />}
                  <span>{optInMicOnInvite ? 'MICROFONE ATIVO' : 'SEM MICROFONE'}</span>
                </button>
              </div>
            </div>

            {/* Online users list */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(() => {
                const myId = currentUser?.id || (currentUser?.name?.toLowerCase() === 'romildo' ? 'usr-romildo-master' : '');
                const rawList = [
                  { id: 'usr-all', name: 'Qualquer Usuário Online (Outra Janela/Aba)', role: 'Rede JARVES', status: 'Disponível Agora' },
                  ...(users && users.length > 0
                    ? users
                        .filter((u) => u.id !== myId && (myId !== 'usr-romildo-master' || (u.id !== 'usr-romildo-master' && u.id !== 'usr-001' && u.username?.toLowerCase() !== 'romildo')))
                        .map((u) => ({
                          id: u.id,
                          name: u.name,
                          role: u.role === 'Admin' ? 'Administrador' : 'Usuário',
                          status: 'Disponível',
                        }))
                    : [
                        { id: 'usr-002', name: 'Eng. João Silva', role: 'Engenharia', status: 'Disponível' },
                        { id: 'usr-003', name: 'Dra. Clara Andrade', role: 'Diretoria', status: 'Disponível' },
                        { id: 'usr-004', name: 'Marcus Vance', role: 'Operações', status: 'Disponível' },
                        { id: 'usr-005', name: 'Sofia Mendes', role: 'Estratégia', status: 'Disponível' },
                      ]),
                ];
                const uniqueList = Array.from(new Map(rawList.map((item) => [item.id, item])).values());
                return uniqueList.map((u, uIdx) => (
                  <div
                    key={`${u.id}-${uIdx}`}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-orbitron font-bold text-cyan-300 text-xs">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-200 text-xs">{u.name}</div>
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{u.status} • {u.role}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendInvite(u)}
                      disabled={inviteSentTo === u.name}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-orbitron font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      {inviteSentTo === u.name ? 'Convite Enviado...' : 'Convidar'}
                    </button>
                  </div>
                ));
              })()}
            </div>

            {/* Invite notice status */}
            {inviteSentTo && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-2">
                <Radio className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                <span>Aguardando resposta de <strong>{inviteSentTo}</strong>...</span>
              </div>
            )}

            {/* Fallback to JARVES AI Button */}
            <div className="mt-5 pt-3 border-t border-slate-800 flex flex-col gap-2">
              <span className="text-[11px] text-slate-400 text-center">
                Nenhum oponente disponível ou demorando para responder?
              </span>
              <button
                onClick={() => {
                  setGameMode('ai');
                  setIsOnlineLobbyOpen(false);
                  setJarvesCommentary('Modo alterado para JARVES IA. Estou pronto para jogar contra o Senhor!');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-orbitron font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Bot className="w-4 h-4 text-amber-400" />
                <span>JOGAR IMEDIATAMENTE CONTRA O JARVES IA</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          7.5 INCOMING CHESS CHALLENGE MODAL (FOR INVITED USER)
          ======================================================== */}
      {incomingInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#2A1D13] via-[#1E140C] to-[#120A05] border-2 border-amber-500/80 p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(245,158,11,0.35)] relative text-center">
            {/* Heraldic Crown / Swords Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#8B653A] to-[#3D2513] border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.6)] mb-3.5 animate-bounce">
              <Swords className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-widest">
              ⚔️ DESAFIO DE XADREZ RECEBIDO
            </span>

            <h3 className="font-orbitron font-black text-lg sm:text-xl text-amber-100 mt-3 tracking-wide">
              {incomingInvite.fromUser.name} convidou você!
            </h3>

            <p className="text-xs text-amber-200/80 mt-1.5 font-serif italic leading-relaxed">
              Você foi desafiado para uma partida clássica de Xadrez Clássico & Medieval online.
            </p>

            {/* Special Role Note: Always Black / Bronze Pieces + Flipped Board */}
            <div className="mt-4 p-3.5 rounded-2xl bg-black/60 border border-amber-500/40 text-left space-y-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-700 to-amber-950 border border-amber-400 shrink-0" />
                <span>SUAS PEÇAS: PEDRAS ESCURAS (BRONZE)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal pl-5">
                Como jogador convidado, você jogará sempre com as <strong>Pedras Escuras</strong> e o tabuleiro será <strong>virado para a sua perspectiva</strong> com suas peças na parte de baixo.
              </p>
            </div>
            {/* Video & Audio Opt-in for Invited User */}
            <div className="mt-3.5 p-3.5 rounded-2xl bg-black/60 border border-amber-500/40 text-left space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs font-orbitron">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>TRANSMISSÃO DE CÂMERA & ÁUDIO</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  OPÇÃO DO CONVIDADO
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                Você pode optar por abrir sua câmera e microfone durante a partida ao lado do tabuleiro:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOptInCameraOnAccept(!optInCameraOnAccept)}
                  className={`p-2 rounded-xl text-xs font-orbitron font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                    optInCameraOnAccept
                      ? 'bg-amber-500/25 text-amber-200 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {optInCameraOnAccept ? <Video className="w-4 h-4 text-amber-400" /> : <VideoOff className="w-4 h-4 text-slate-500" />}
                  <span>{optInCameraOnAccept ? 'ABRIR CÂMERA' : 'SEM CÂMERA'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptInMicOnAccept(!optInMicOnAccept)}
                  className={`p-2 rounded-xl text-xs font-orbitron font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                    optInMicOnAccept
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {optInMicOnAccept ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-slate-500" />}
                  <span>{optInMicOnAccept ? 'MICROFONE ATIVO' : 'SEM MICROFONE'}</span>
                </button>
              </div>
            </div>

            {/* Action Buttons: Aceitar vs Recusar */}
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={handleDeclineInvite}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-orbitron font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span>RECUSAR</span>
              </button>

              <button
                onClick={handleAcceptInvite}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-110 active:scale-95 text-slate-950 font-orbitron font-black text-xs transition cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.6)] flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>ACEITAR DESAFIO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          7.8 LIVE AUDIO & VIDEO TRANSMISSION MODAL (DRAGGABLE MOLDURA & REPOSITIONABLE)
          ======================================================== */}
      {isAvModalOpen && isAvModalVisible && (
        <div
          ref={modalBoxRef}
          style={{
            position: 'fixed',
            left: modalPos ? `${modalPos.x}px` : undefined,
            top: modalPos ? `${modalPos.y}px` : '75px',
            right: modalPos ? undefined : '20px',
            zIndex: 60,
          }}
          className="w-[92vw] max-w-[490px] animate-in fade-in zoom-in-95 duration-200 select-none shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(6,182,212,0.4)]"
        >
          {/* MOLDURA EXTERNA ARRASTÁVEL COM ACABAMENTO CIBERNÉTICO & MEDIEVAL */}
          <div
            onMouseDown={handleMouseDownOnFrame}
            onTouchStart={handleTouchStartOnFrame}
            className={`rounded-2xl p-1 bg-gradient-to-r from-cyan-500 via-amber-400 to-cyan-500 transition-all ${
              isDraggingModal ? 'scale-[1.01] ring-4 ring-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.7)]' : ''
            }`}
          >
            {/* BARRA SUPERIOR DA MOLDURA: ALÇA DE ARRASTO E CONTROLES DE ESCONDER/FECHAR */}
            <div
              className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-[#161c2a] via-[#1a2236] to-[#161c2a] rounded-t-xl cursor-grab active:cursor-grabbing border-b border-cyan-500/40 select-none touch-none"
              title="Segure na moldura e arraste para posicionar o modal onde desejar na tela"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-orbitron font-bold text-[10px] tracking-wider uppercase shadow-inner">
                  <Move className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                  <span className="hidden sm:inline">MOLDURA • SEGURE P/ REPOSICIONAR</span>
                  <span className="sm:hidden">MOVER</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400 hidden md:inline">
                  (Livre pela tela)
                </span>
              </div>

              {/* Botões da Moldura: ESCONDER / MOSTRAR e FECHAR */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAvModalVisible(false)}
                  className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/50 text-amber-300 text-[10px] font-orbitron font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-sm"
                  title="Esconder o modal da tela (o áudio e vídeo continuam transmitindo normalmente)"
                >
                  <EyeOff className="w-3 h-3 text-amber-300" />
                  <span>ESCONDER</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAvModalOpen(false);
                    setIsAvModalVisible(false);
                  }}
                  className="p-1 rounded-lg bg-slate-900/90 hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 border border-slate-700 transition cursor-pointer"
                  title="Fechar modal de câmeras"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Conteúdo Interno do Modal */}
            <div className="bg-gradient-to-b from-[#141824] via-[#10131E] to-[#0A0D14] rounded-b-xl p-2 sm:p-2.5 max-h-[80vh] overflow-y-auto">
              {renderAvTransmissionPanel(true)}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          7.9 FLOATING RESTORE BUTTON TO SHOW CAMERA & AUDIO MODAL
          ======================================================== */}
      {gameMode === 'online' && onlineRoomId && (!isAvModalOpen || !isAvModalVisible) && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            type="button"
            onClick={() => {
              setIsAvModalOpen(true);
              setIsAvModalVisible(true);
            }}
            className="group px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600/90 via-cyan-500/95 to-emerald-600/90 hover:from-cyan-500 hover:to-emerald-500 text-white font-orbitron font-black text-xs shadow-[0_0_25px_rgba(6,182,212,0.65)] border-2 border-cyan-300/70 flex items-center gap-2.5 cursor-pointer active:scale-95 transition-all"
            title="Clique para mostrar o Modal de Câmeras e Áudio"
          >
            <div className="relative">
              <Eye className="w-4 h-4 text-cyan-100 group-hover:scale-110 transition-transform" />
              {(isCameraActive || isMicActive) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              )}
            </div>
            <span className="tracking-wide">MOSTRAR CÂMERAS & ÁUDIO</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 text-[9px] font-mono text-cyan-200">
              {isCameraActive ? <Video className="w-2.5 h-2.5 text-cyan-300" /> : <VideoOff className="w-2.5 h-2.5 text-slate-400" />}
              {isMicActive ? <Mic className="w-2.5 h-2.5 text-emerald-300" /> : <MicOff className="w-2.5 h-2.5 text-slate-400" />}
            </div>
          </button>
        </div>
      )}

      {/* ========================================================
          8. MATCH HISTORY & CONTROLS FOOTER
          ======================================================== */}
      <div className="w-full max-w-4xl mx-auto p-3 sm:p-4 rounded-2xl bg-black/60 border border-[#523A25] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-bold">HISTÓRICO:</span>
          {gameState.history.length === 0 ? (
            <span className="text-slate-500 italic">Nenhum lance efetuado ainda.</span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap max-w-md overflow-x-auto">
              {gameState.history.slice(-8).map((m, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold text-[11px]"
                >
                  {m.san}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* AI Difficulty Selector */}
        {gameMode === 'ai' && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>DIFICULDADE / TEMPO:</span>
            </span>
            <div className="flex items-center gap-1">
              {(['easy', 'medium', 'hard'] as JarvesAiDifficulty[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setAiDifficulty(diff)}
                  className={`px-2 py-1 rounded-md text-[10px] font-orbitron font-bold transition cursor-pointer flex items-center gap-1 ${
                    aiDifficulty === diff
                      ? 'bg-amber-500 text-slate-950 font-black shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                  title={
                    diff === 'easy'
                      ? 'Aprendiz: Resposta rápida (1 a 3s)'
                      : diff === 'medium'
                      ? 'Estrategista: Resposta tática equilibrada (3 a 9s)'
                      : 'Mestre: Análise profunda (7 a 25s, máx <30s)'
                  }
                >
                  <span>{diff === 'easy' ? 'APRENDIZ (2s)' : diff === 'medium' ? 'ESTRATEGISTA (4-9s)' : 'MESTRE (7-25s)'}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================================
// GRAPHICAL CHESS PIECE COMPONENT (3D vs TOP-DOWN MEDALLIONS)
// ========================================================
interface ChessPieceGraphicProps {
  type: PieceType;
  color: PieceColor;
  viewpoint: '3d' | 'topdown';
}

function ChessPieceGraphic({ type, color, viewpoint }: ChessPieceGraphicProps) {
  const isWhite = color === 'w';

  // In TOP-DOWN mode: Circular Competition Medallions (Green & Ivory Theme)
  if (viewpoint === 'topdown') {
    return (
      <div
        className={`w-7 h-7 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform ${
          isWhite
            ? 'bg-gradient-to-br from-[#FFFFFF] via-[#FAF5E6] to-[#E5DCBE] border-[#D1C6A5] text-[#1E3B2B] shadow-[0_2px_8px_rgba(0,0,0,0.35)]'
            : 'bg-gradient-to-br from-[#4A3222] via-[#322015] to-[#1C120B] border-[#684628] text-[#FAF5E6] shadow-[0_2px_8px_rgba(0,0,0,0.85)]'
        }`}
      >
        <span className="font-serif font-black text-sm sm:text-lg select-none">
          {getPieceSymbol(type, color)}
        </span>
      </div>
    );
  }

  // In 3D TOURNAMENT mode: Upright Staunton Figures (Matching xadreznovo3_6a669947.jpg)
  return (
    <div
      className={`flex items-center justify-center font-serif text-3xl sm:text-4xl md:text-5xl transition-all ${
        isWhite
          ? 'text-[#FBF7EB] drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] filter brightness-105'
          : 'text-[#382417] drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)] filter contrast-125'
      }`}
      style={{
        textShadow: isWhite
          ? '0 0 1px #FAF0D6, 0 2px 4px rgba(0,0,0,0.7)'
          : '0 0 1px #5C3E28, 0 2px 4px rgba(0,0,0,0.9)',
      }}
    >
      {getPieceSymbol(type, color)}
    </div>
  );
}

// Unicode Chess Symbols
function getPieceSymbol(type: PieceType, color: PieceColor): string {
  const isWhite = color === 'w';
  switch (type) {
    case 'k':
      return isWhite ? '♔' : '♚';
    case 'q':
      return isWhite ? '♕' : '♛';
    case 'r':
      return isWhite ? '♖' : '♜';
    case 'b':
      return isWhite ? '♗' : '♝';
    case 'n':
      return isWhite ? '♘' : '♞';
    case 'p':
      return isWhite ? '♙' : '♟';
    default:
      return '';
  }
}
