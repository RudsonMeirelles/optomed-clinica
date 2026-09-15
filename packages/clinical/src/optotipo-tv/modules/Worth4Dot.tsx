import React, { useState } from 'react';
import { Eye, ShieldCheck } from 'lucide-react';

interface Worth4DotProps {
  pixelsPerMm: number;
}

export const Worth4Dot: React.FC<Worth4DotProps> = ({ pixelsPerMm }) => {
  const [mode, setMode] = useState<'distance' | 'near'>('distance');

  const dotSize = mode === 'distance' ? 44 : 72;
  const spacing = mode === 'distance' ? 120 : 180;

  return (
    <div className="w-full h-full flex flex-col bg-black text-white select-none">
      {/* Barra de Controles Discreta */}
      <div className="w-full bg-slate-950 border-b border-slate-900 px-6 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="font-bold text-slate-200">TESTE DE WORTH (4 PONTOS)</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500">Distância do Teste:</span>
          <div className="flex bg-slate-900 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setMode('distance')}
              className={`px-3 py-1 rounded font-bold transition-colors ${
                mode === 'distance' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Longe (Padrão)
            </button>
            <button
              onClick={() => setMode('near')}
              className={`px-3 py-1 rounded font-bold transition-colors ${
                mode === 'near' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Perto
            </button>
          </div>
        </div>
      </div>

      {/* Painel Central com os 4 Pontos de Worth em Fundo Preto Absoluto */}
      <div className="flex-1 w-full flex items-center justify-center relative bg-black">
        <div
          style={{ width: `${spacing}px`, height: `${spacing}px` }}
          className="relative flex items-center justify-center"
        >
          {/* Ponto Superior: Vermelho (#EF4444) */}
          <div
            style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
            className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-[#EF4444] shadow-[0_0_20px_#EF4444]"
          />

          {/* Ponto Esquerdo: Verde (#22C55E) */}
          <div
            style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
            className="absolute top-1/2 left-0 -translate-y-1/2 rounded-full bg-[#22C55E] shadow-[0_0_20px_#22C55E]"
          />

          {/* Ponto Direito: Verde (#22C55E) */}
          <div
            style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
            className="absolute top-1/2 right-0 -translate-y-1/2 rounded-full bg-[#22C55E] shadow-[0_0_20px_#22C55E]"
          />

          {/* Ponto Inferior: Branco (#FFFFFF) */}
          <div
            style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-[#FFFFFF] shadow-[0_0_20px_#FFFFFF]"
          />
        </div>
      </div>

      {/* Guia de Interpretação Clínica */}
      <div className="w-full bg-slate-950 border-t border-slate-900 px-6 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-6">
          <span><strong>4 Pontos:</strong> Fusão Normal</span>
          <span><strong>2 Vermelhos:</strong> Supressão OE (Verde)</span>
          <span><strong>3 Verdes:</strong> Supressão OD (Vermelho)</span>
          <span><strong>5 Pontos:</strong> Diplopia</span>
        </div>
        <span className="text-slate-600 italic">* Requer óculos com filtros Vermelho (OD) e Verde (OE)</span>
      </div>
    </div>
  );
};
