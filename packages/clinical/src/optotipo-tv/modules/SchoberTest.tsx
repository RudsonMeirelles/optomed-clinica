import React, { useState } from 'react';
import { Circle, Sliders } from 'lucide-react';

interface SchoberTestProps {
  pixelsPerMm: number;
}

export const SchoberTest: React.FC<SchoberTestProps> = ({ pixelsPerMm }) => {
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);

  return (
    <div className="w-full h-full flex flex-col bg-black text-white select-none">
      {/* Barra Superior */}
      <div className="w-full bg-slate-950 border-b border-slate-900 px-6 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <Circle className="w-4 h-4 text-emerald-500" />
          <span className="font-bold text-slate-200">TESTE DE SCHOBER (HETEROPHORIAS)</span>
        </div>

        <div className="flex items-center gap-3">
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span>Dimensão dos Anéis:</span>
          <div className="flex bg-slate-900 p-0.5 rounded border border-slate-800">
            {[0.8, 1.0, 1.2, 1.5].map((s) => (
              <button
                key={s}
                onClick={() => setScaleFactor(s)}
                className={`px-2.5 py-0.5 rounded font-bold transition-colors ${
                  scaleFactor === s ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cruz Vermelha Central e Anéis Concêntricos Verdes */}
      <div className="flex-1 w-full flex items-center justify-center bg-black">
        <svg
          viewBox="-200 -200 400 400"
          style={{ transform: `scale(${scaleFactor})` }}
          className="w-full max-w-[500px] max-h-[500px] aspect-square transition-transform"
        >
          {/* Anel Verde Externo */}
          <circle
            cx="0"
            cy="0"
            r="160"
            fill="none"
            stroke="#16A34A"
            strokeWidth="12"
          />

          {/* Anel Verde Interno */}
          <circle
            cx="0"
            cy="0"
            r="90"
            fill="none"
            stroke="#16A34A"
            strokeWidth="10"
          />

          {/* Cruz Vermelha Central */}
          <line
            x1="-45"
            y1="0"
            x2="45"
            y2="0"
            stroke="#DC2626"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="-45"
            x2="0"
            y2="45"
            stroke="#DC2626"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Guia Clínico Inferior */}
      <div className="w-full bg-slate-950 border-t border-slate-900 px-6 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-6">
          <span><strong>Cruz no Centro:</strong> Ortoforia</span>
          <span><strong>Cruz Deslocada p/ Direita:</strong> Endoforia</span>
          <span><strong>Cruz Deslocada p/ Esquerda:</strong> Exoforia</span>
          <span><strong>Cruz Deslocada Vertical:</strong> Hiperforia</span>
        </div>
        <span className="text-slate-600 italic">* Filtros Vermelho (OD) e Verde (OE)</span>
      </div>
    </div>
  );
};
