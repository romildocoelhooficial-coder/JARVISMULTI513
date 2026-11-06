import React, { useEffect, useRef, useState } from 'react';
import { Bot, Cpu, Sparkles, Volume2 } from 'lucide-react';

interface HologramAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  intensity?: number;
}

export const HologramAvatar: React.FC<HologramAvatarProps> = ({
  isSpeaking,
  isListening,
  intensity = 1.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [avatarMode, setAvatarMode] = useState<'core' | 'humanoid'>('core');
  const animFrameId = useRef<number | null>(null);
  const rotationRef = useRef({ x: 0.2, y: 0 });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.035 * (isSpeaking ? 1.8 : isListening ? 1.4 : 0.8);
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Radial background glow
      const baseGlow = ctx.createRadialGradient(
        centerX, centerY, 10,
        centerX, centerY, width * 0.48
      );
      if (isSpeaking) {
        baseGlow.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
        baseGlow.addColorStop(0.5, 'rgba(108, 92, 231, 0.25)');
        baseGlow.addColorStop(1, 'rgba(11, 14, 20, 0)');
      } else if (isListening) {
        baseGlow.addColorStop(0, 'rgba(108, 92, 231, 0.5)');
        baseGlow.addColorStop(0.5, 'rgba(0, 240, 255, 0.2)');
        baseGlow.addColorStop(1, 'rgba(11, 14, 20, 0)');
      } else {
        baseGlow.addColorStop(0, 'rgba(0, 240, 255, 0.15)');
        baseGlow.addColorStop(0.6, 'rgba(108, 92, 231, 0.08)');
        baseGlow.addColorStop(1, 'rgba(11, 14, 20, 0)');
      }
      ctx.fillStyle = baseGlow;
      ctx.fillRect(0, 0, width, height);

      // Auto slow rotate if not dragging
      if (!isDraggingRef.current) {
        rotationRef.current.y += 0.012;
      }

      const rotX = rotationRef.current.x;
      const rotY = rotationRef.current.y;

      if (avatarMode === 'core') {
        // --- 3D HOLOGRAPHIC QUANTUM CORE ---
        // Draw orbital rings
        const numRings = 5;
        const baseRadius = 65 + (isSpeaking ? Math.sin(time * 6) * 12 : isListening ? Math.sin(time * 4) * 8 : 0);

        for (let i = 0; i < numRings; i++) {
          const ringAngleX = rotX + (i * Math.PI) / numRings;
          const ringAngleY = rotY + (i * 0.4) + (time * 0.3 * (i % 2 === 0 ? 1 : -1));
          const ringRadius = baseRadius + i * 14;

          ctx.save();
          ctx.translate(centerX, centerY);

          ctx.beginPath();
          const segments = 60;
          for (let s = 0; s <= segments; s++) {
            const theta = (s / segments) * Math.PI * 2;
            // 3D circle coords
            let x = ringRadius * Math.cos(theta);
            let y = ringRadius * Math.sin(theta);
            let z = 0;

            // Rotate around X
            const y1 = y * Math.cos(ringAngleX) - z * Math.sin(ringAngleX);
            const z1 = y * Math.sin(ringAngleX) + z * Math.cos(ringAngleX);

            // Rotate around Y
            const x2 = x * Math.cos(ringAngleY) + z1 * Math.sin(ringAngleY);
            const z2 = -x * Math.sin(ringAngleY) + z1 * Math.cos(ringAngleY);

            // Perspective
            const fov = 350;
            const scale = fov / (fov + z2);
            const projX = x2 * scale;
            const projY = y1 * scale;

            if (s === 0) ctx.moveTo(projX, projY);
            else ctx.lineTo(projX, projY);
          }

          ctx.strokeStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.7)' : 'rgba(108, 92, 231, 0.65)';
          ctx.lineWidth = i === 2 ? 2.5 : 1.2;
          ctx.stroke();

          // Nodes / energy ticks along the ring
          const nodeCount = 6;
          for (let n = 0; n < nodeCount; n++) {
            const theta = (n / nodeCount) * Math.PI * 2 + time * 1.5;
            let x = ringRadius * Math.cos(theta);
            let y = ringRadius * Math.sin(theta);
            let z = 0;

            const y1 = y * Math.cos(ringAngleX) - z * Math.sin(ringAngleX);
            const z1 = y * Math.sin(ringAngleX) + z * Math.cos(ringAngleX);
            const x2 = x * Math.cos(ringAngleY) + z1 * Math.sin(ringAngleY);
            const z2 = -x * Math.sin(ringAngleY) + z1 * Math.cos(ringAngleY);

            const fov = 350;
            const scale = fov / (fov + z2);
            const projX = x2 * scale;
            const projY = y1 * scale;

            ctx.beginPath();
            ctx.arc(projX, projY, 3 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#00F0FF';
            ctx.shadowColor = '#00F0FF';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          ctx.restore();
        }

        // Inner glowing core sphere
        const corePulse = (Math.sin(time * 8) + 1) * 0.5;
        const coreRadius = 38 + (isSpeaking ? corePulse * 14 : isListening ? corePulse * 8 : corePulse * 3);

        const coreGradient = ctx.createRadialGradient(
          centerX, centerY, 5,
          centerX, centerY, coreRadius
        );
        coreGradient.addColorStop(0, '#FFFFFF');
        coreGradient.addColorStop(0.3, '#00F0FF');
        coreGradient.addColorStop(0.8, '#6C5CE7');
        coreGradient.addColorStop(1, 'rgba(11, 14, 20, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = coreGradient;
        ctx.fill();

        // Audio waveform rings in core
        const waveCount = 24;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.beginPath();
        for (let i = 0; i <= waveCount; i++) {
          const angle = (i / waveCount) * Math.PI * 2;
          const amp = isSpeaking
            ? Math.sin(angle * 6 + time * 10) * 12 + 45
            : isListening
            ? Math.sin(angle * 4 + time * 6) * 8 + 42
            : 38;
          const px = Math.cos(angle) * amp;
          const py = Math.sin(angle) * amp;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();

      } else {
        // --- 3D METALLIC HUMANOID WIREFRAME / HOLOGRAM ---
        ctx.save();
        ctx.translate(centerX, centerY);

        const fov = 320;
        const project3D = (x: number, y: number, z: number) => {
          // Rotate around X
          const y1 = y * Math.cos(rotX) - z * Math.sin(rotX);
          const z1 = y * Math.sin(rotX) + z * Math.cos(rotX);
          // Rotate around Y
          const x2 = x * Math.cos(rotY) + z1 * Math.sin(rotY);
          const z2 = -x * Math.sin(rotY) + z1 * Math.cos(rotY);
          const scale = fov / (fov + z2 + 80);
          return { x: x2 * scale, y: y1 * scale, z: z2, scale };
        };

        // Futuristic Humanoid Head / Helmet Vertices
        const headPoints = [
          // Forehead / Crown
          [-35, -75, 10], [0, -85, 20], [35, -75, 10],
          // Temples
          [-55, -45, 15], [0, -50, 45], [55, -45, 15],
          // Visor / Eyes Line
          [-45, -20, 35], [-15, -20, 50], [15, -20, 50], [45, -20, 35],
          // Cheekbones
          [-40, 10, 30], [0, 15, 45], [40, 10, 30],
          // Jaw / Chin
          [-20, 45, 25], [0, 55, 35], [20, 45, 25],
          // Neck
          [-15, 80, 10], [0, 85, 15], [15, 80, 10],
          // Shoulders
          [-70, 95, -10], [70, 95, -10],
          // Back of skull
          [-30, -55, -40], [0, -65, -45], [30, -55, -40],
          [-20, 20, -35], [20, 20, -35],
        ];

        const projected = headPoints.map(p => project3D(p[0], p[1], p[2]));

        // Wireframe edges connecting metallic polygon facets
        const edges = [
          [0, 1], [1, 2], [0, 3], [2, 5], [1, 4], [3, 4], [4, 5],
          [3, 6], [4, 7], [4, 8], [5, 9], [6, 7], [7, 8], [8, 9],
          [6, 10], [7, 11], [8, 11], [9, 12], [10, 11], [11, 12],
          [10, 13], [11, 14], [12, 15], [13, 14], [14, 15],
          [13, 16], [14, 17], [15, 18], [16, 17], [17, 18],
          [16, 19], [18, 20],
          // Rear skull
          [0, 21], [1, 22], [2, 23], [21, 22], [22, 23],
          [3, 21], [5, 23], [21, 24], [23, 25], [24, 25], [16, 24], [18, 25]
        ];

        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        edges.forEach(([p1, p2]) => {
          if (projected[p1] && projected[p2]) {
            ctx.beginPath();
            ctx.moveTo(projected[p1].x, projected[p1].y);
            ctx.lineTo(projected[p2].x, projected[p2].y);
            ctx.stroke();
          }
        });

        // Visor / Audio mouth glow
        const mouthWidth = 25 + (isSpeaking ? Math.sin(time * 12) * 15 : isListening ? 6 : 2);
        const mouthP = project3D(0, 25, 42);
        ctx.beginPath();
        ctx.moveTo(mouthP.x - mouthWidth * 0.5, mouthP.y);
        ctx.lineTo(mouthP.x + mouthWidth * 0.5, mouthP.y);
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Eye sensors
        const eyeLeft = project3D(-18, -20, 48);
        const eyeRight = project3D(18, -20, 48);
        [eyeLeft, eyeRight].forEach(eye => {
          ctx.beginPath();
          ctx.arc(eye.x, eye.y, 4 * eye.scale, 0, Math.PI * 2);
          ctx.fillStyle = isListening ? '#6C5CE7' : '#00F0FF';
          ctx.shadowColor = '#00F0FF';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        });

        // Holographic horizontal scanline effect
        const scanY = (Math.sin(time * 2.5) * 85);
        ctx.beginPath();
        ctx.moveTo(-90, scanY);
        ctx.lineTo(90, scanY);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [avatarMode, isSpeaking, isListening, intensity]);

  // Mouse drag handlers for interactive 3D rotation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;
    rotationRef.current.y += deltaX * 0.01;
    rotationRef.current.x = Math.max(-0.6, Math.min(0.6, rotationRef.current.x + deltaY * 0.01));
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch event handlers for mobile and tablet devices
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || e.touches.length === 0) return;
    const deltaX = e.touches[0].clientX - lastMousePosRef.current.x;
    const deltaY = e.touches[0].clientY - lastMousePosRef.current.y;
    rotationRef.current.y += deltaX * 0.012;
    rotationRef.current.x = Math.max(-0.6, Math.min(0.6, rotationRef.current.x + deltaY * 0.012));
    lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-2 sm:p-3 w-full">
      {/* 3D Canvas */}
      <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none">
        {/* Outer glowing sci-fi rings */}
        <div className={`absolute inset-0 rounded-full border border-[#00F0FF]/30 ${isSpeaking ? 'animate-ping opacity-30' : ''}`} />
        <div className="absolute inset-2 rounded-full border border-dashed border-[#6C5CE7]/40 animate-spin" style={{ animationDuration: '24s' }} />
        <div className="absolute inset-5 rounded-full border border-dotted border-[#00F0FF]/25 animate-spin" style={{ animationDuration: '16s', animationDirection: 'reverse' }} />

        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="w-full h-full object-contain select-none touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        />

        {/* State Badge */}
        <div className="absolute bottom-2 px-3 py-1 rounded-full bg-[#121824]/90 border border-[#00F0FF]/40 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              isSpeaking
                ? 'bg-[#00F0FF] animate-pulse'
                : isListening
                ? 'bg-[#6C5CE7] animate-ping'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-[#00F0FF] font-semibold">
            {isSpeaking ? 'JARVES FALANDO...' : isListening ? 'OUVINDO COMANDO...' : 'SISTEMA ONLINE'}
          </span>
        </div>
      </div>

      {/* Switcher: Núcleo 3D vs Androide Humanoide */}
      <div className="mt-2 flex items-center gap-2 bg-[#121824]/80 p-1 rounded-lg border border-slate-800">
        <button
          id="btn-mode-core"
          onClick={() => setAvatarMode('core')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
            avatarMode === 'core'
              ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Núcleo Reativo 3D</span>
        </button>

        <button
          id="btn-mode-humanoid"
          onClick={() => setAvatarMode('humanoid')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
            avatarMode === 'humanoid'
              ? 'bg-[#6C5CE7]/25 text-[#6C5CE7] border border-[#6C5CE7]/40 font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Androide Metálico 3D</span>
        </button>
      </div>
    </div>
  );
};
