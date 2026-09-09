import React, { useState, useEffect, useRef } from 'react';
import { Activity, Play, Pause, RotateCcw } from 'lucide-react';

export const OcularMotility: React.FC = () => {
  const [pattern, setPattern] = useState<'h_pattern' | 'horizontal' | 'vertical' | 'circular' | 'saccades'>('h_pattern');
  const [speed, setSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [targetType, setTargetType] = useState<'dot' | 'star'>('dot');

  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  const speedMultiplier = speed === 'slow' ? 0.001 : speed === 'medium' ? 0.0025 : 0.005;

  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      timeRef.current += delta * speedMultiplier;

      const t = timeRef.current;

      if (pattern === 'horizontal') {
        const x = Math.sin(t) * 350;
        setPos({ x, y: 0 });
      } else if (pattern === 'vertical') {
        const y = Math.sin(t) * 220;
        setPos({ x: 0, y });
      } else if (pattern === 'circular') {
        const x = Math.cos(t) * 250;
        const y = Math.sin(t) * 200;
        setPos({ x, y });
      } else if (pattern === 'saccades') {
        // Movimento sacádico (saltos bruscos)
        const step = Math.floor(t % 4);
        const positions = [
          { x: -300, y: 0 },
          { x: 300, y: 0 },
          { x: 0, y: -200 },
          { x: 0, y: 200 }
        ];
        setPos(positions[step] || { x: 0, y: 0 });
      } else {
        // Padrão H clássico (Músculos Extraoculares)
        // Ciclo: Centro -> Esq -> Sup Esq -> Inf Esq -> Esq -> Centro -> Dir -> Sup Dir -> Inf Dir -> Dir -> Centro
        const cycle = (t % 10) / 10;
        let x = 0;
        let y = 0;

        if (cycle < 0.2) {
          x = -300;
          y = (cycle / 0.2) * 200 - 100;
        } else if (cycle < 0.4) {
          x = -300 + ((cycle - 0.2) / 0.2) * 600;
          y = 0;
        } else if (cycle < 0.6) {
          x = 300;
          y = ((cycle - 0.4) / 0.2) * 200 - 100;
        } else if (cycle < 0.8) {
          x = 300 - ((cycle - 0.6) / 0.2) * 600;
          y = 0;
        } else {
          x = 0;
          y = 0;
        }
        setPos({ x, y });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, pattern, speedMultiplier]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Barra Superior */}
      <div className="w-full bg-slate-900 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-100 text-sm">MOTILIDADE OCULAR (DUÇÕES E VERSÕES)</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Padrões */}
          <div className="flex bg-slate-800 p-0.5 rounded border border-slate-700">
            {(['h_pattern', 'horizontal', 'vertical', 'circular', 'saccades'] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPattern(p);
                  timeRef.current = 0;
                }}
                className={`px-3 py-1 rounded font-medium capitalize transition-colors ${
                  pattern === p ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'h_pattern' ? 'Padrão H' : p === 'saccades' ? 'Sacádicos' : p}
              </button>
            ))}
          </div>

          {/* Velocidade */}
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded border border-slate-700">
            {(['slow', 'medium', 'fast'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1 rounded font-bold capitalize transition-colors ${
                  speed === s ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s === 'slow' ? 'Lenta' : s === 'medium' ? 'Média' : 'Rápida'}
              </button>
            ))}
          </div>

          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(prev => !prev)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Área Central de Animação com Alvo em Movimento */}
      <div className="flex-1 w-full relative flex items-center justify-center bg-black">
        {/* Marcadores de Guia Suaves */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-[700px] h-0.5 bg-white" />
          <div className="h-[440px] w-0.5 bg-white absolute" />
        </div>

        {/* Alvo de Fixação Móvel */}
        <div
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            transition: pattern === 'saccades' ? 'transform 0.08s ease-out' : 'none'
          }}
          className="absolute flex items-center justify-center"
        >
          {targetType === 'dot' ? (
            <div className="w-10 h-10 rounded-full bg-red-600 ring-8 ring-red-500/40 shadow-[0_0_30px_#EF4444] animate-pulse" />
          ) : (
            <div className="text-4xl text-amber-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]">
              ★
            </div>
          )}
        </div>
      </div>

      {/* Guia Clínico */}
      <div className="w-full bg-slate-950 border-t border-slate-900 px-6 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <span>Instruir o paciente a acompanhar o alvo apenas com os olhos, mantendo a cabeça fixa</span>
        <span className="text-slate-600 italic">* Observar simetria, restrições musculares, dor ou nistagmo</span>
      </div>
    </div>
  );
};
