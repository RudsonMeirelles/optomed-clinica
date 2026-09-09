import React, { useState } from 'react';
import { Target, RotateCw } from 'lucide-react';

interface JCCTargetProps {
  pixelsPerMm: number;
}

export const JCCTarget: React.FC<JCCTargetProps> = ({ pixelsPerMm }) => {
  const [targetType, setTargetType] = useState<'dots' | 'rings' | 'letters'>('dots');
  const [currentPosition, setCurrentPosition] = useState<1 | 2>(1);

  return (
    <div className="w-full h-full flex flex-col bg-white text-black select-none">
      {/* Barra de Controles */}
      <div className="w-full bg-slate-100 border-b border-slate-300 px-6 py-2.5 flex items-center justify-between text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <Target className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-900 text-sm">ALVO PARA CILINDRO CRUZADO (JCC)</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-200 p-0.5 rounded-lg border border-slate-300">
            {(['dots', 'rings', 'letters'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTargetType(t)}
                className={`px-3 py-1 rounded font-medium capitalize transition-colors ${
                  targetType === t ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-black'
                }`}
              >
                {t === 'dots' ? 'Pontos (Padrão)' : t === 'rings' ? 'Anéis' : 'Letras'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPosition(prev => prev === 1 ? 2 : 1)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-transform"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Alternar: Posição {currentPosition}</span>
          </button>
        </div>
      </div>

      {/* Alvo Central de Fixação para Refinamento de Cilindro */}
      <div className="flex-1 w-full flex items-center justify-center p-8 bg-white">
        {targetType === 'dots' ? (
          <div className="grid grid-cols-5 gap-8 p-10 bg-slate-50 border border-slate-200 rounded-3xl shadow-inner">
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full ${
                  i === 12 ? 'bg-red-600 ring-4 ring-red-200' : 'bg-black'
                }`}
              />
            ))}
          </div>
        ) : targetType === 'rings' ? (
          <div className="flex items-center justify-center gap-12">
            {[60, 100, 140].map((size, idx) => (
              <div
                key={idx}
                style={{ width: `${size}px`, height: `${size}px`, borderWidth: `${size / 8}px` }}
                className="rounded-full border-black flex items-center justify-center"
              >
                <div className="w-3 h-3 rounded-full bg-red-600" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-16 font-mono font-black text-8xl text-black">
            <span>O</span>
            <span className="text-red-600">●</span>
            <span>C</span>
          </div>
        )}
      </div>

      {/* Guia Clínico e Disclaimer */}
      <div className="w-full bg-slate-100 border-t border-slate-300 px-6 py-2.5 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-800">Posição Atual do Exame:</span>
          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded">
            POSIÇÃO {currentPosition}
          </span>
          <span className="text-slate-500">"Qual posição fica mais nítida: 1 ou 2, ou ambas são iguais?"</span>
        </div>
        <span className="text-slate-500 italic">* Utilizar com lente de cilindro cruzado física</span>
      </div>
    </div>
  );
};
