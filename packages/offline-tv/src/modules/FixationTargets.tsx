import React, { useState } from 'react';
import { Target, Star, Smile, Circle, Plus } from 'lucide-react';

export const FixationTargets: React.FC = () => {
  const [targetType, setTargetType] = useState<'dot' | 'cross' | 'star' | 'circle' | 'animated_sun'>('dot');

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 select-none">
      {/* Barra Superior */}
      <div className="w-full bg-slate-900 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <Target className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-slate-100 text-sm">ALVOS DE FIXAÇÃO VISUAL</span>
        </div>

        <div className="flex bg-slate-800 p-0.5 rounded border border-slate-700">
          {(['dot', 'cross', 'star', 'circle', 'animated_sun'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTargetType(t)}
              className={`px-3 py-1 rounded font-medium capitalize transition-colors ${
                targetType === t ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'dot' ? 'Ponto Vermelho' : t === 'cross' ? 'Cruz' : t === 'star' ? 'Estrela' : t === 'circle' ? 'Anéis' : 'Sol Animado'}
            </button>
          ))}
        </div>
      </div>

      {/* Alvo Central em Fundo Escuro para Retinoscopia e Oftalmoscopia */}
      <div className="flex-1 w-full flex items-center justify-center p-8 bg-black">
        {targetType === 'dot' && (
          <div className="w-12 h-12 rounded-full bg-red-600 ring-8 ring-red-600/30 shadow-[0_0_40px_#EF4444] animate-pulse" />
        )}

        {targetType === 'cross' && (
          <div className="relative flex items-center justify-center">
            <div className="w-32 h-3 bg-red-600 rounded-full shadow-[0_0_20px_#EF4444]" />
            <div className="h-32 w-3 bg-red-600 rounded-full absolute shadow-[0_0_20px_#EF4444]" />
            <div className="w-5 h-5 rounded-full bg-white absolute" />
          </div>
        )}

        {targetType === 'star' && (
          <div className="text-8xl text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.9)] animate-spin" style={{ animationDuration: '8s' }}>
            ★
          </div>
        )}

        {targetType === 'circle' && (
          <div className="flex items-center justify-center">
            {[180, 120, 60].map((size, idx) => (
              <div
                key={idx}
                style={{ width: `${size}px`, height: `${size}px`, animationDuration: `${2 + idx}s` }}
                className="rounded-full border-4 border-amber-400 absolute animate-ping"
              />
            ))}
            <div className="w-6 h-6 rounded-full bg-red-600 z-10" />
          </div>
        )}

        {targetType === 'animated_sun' && (
          <div className="flex flex-col items-center animate-bounce" style={{ animationDuration: '2s' }}>
            <div className="w-36 h-36 rounded-full bg-amber-400 flex items-center justify-center shadow-[0_0_50px_#F59E0B] border-4 border-amber-300">
              <Smile className="w-24 h-24 text-amber-900" />
            </div>
            <span className="mt-6 text-xl font-bold text-amber-300 tracking-wider">OLHE PARA O SOLZINHO!</span>
          </div>
        )}
      </div>

      {/* Guia Clínico */}
      <div className="w-full bg-slate-950 border-t border-slate-900 px-6 py-2 flex items-center justify-between text-xs text-slate-500">
        <span>Ideal para fixação foveal durante Retinoscopia, Oftalmoscopia e Avaliação Pediátrica</span>
      </div>
    </div>
  );
};
