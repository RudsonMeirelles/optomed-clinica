import React, { useState } from 'react';
import { Eye, Sun, Moon, Maximize } from 'lucide-react';

interface AmslerGridProps {
  pixelsPerMm: number;
}

export const AmslerGrid: React.FC<AmslerGridProps> = ({ pixelsPerMm }) => {
  const [isInverted, setIsInverted] = useState<boolean>(true); // Fundo escuro por padrão
  const [showDiagonals, setShowDiagonals] = useState<boolean>(false);
  const [gridType, setGridType] = useState<'standard' | 'dense'>('standard');

  const linesCount = gridType === 'standard' ? 20 : 40;
  const step = 400 / linesCount;

  return (
    <div className={`w-full h-full flex flex-col select-none ${
      isInverted ? 'bg-black text-white' : 'bg-white text-black'
    }`}>
      {/* Barra Superior */}
      <div className={`w-full px-6 py-2.5 flex items-center justify-between text-xs border-b ${
        isInverted ? 'bg-slate-950 border-slate-900 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700'
      }`}>
        <div className="flex items-center gap-3">
          <Maximize className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-sm">GRADE DE AMSLER (FUNÇÃO MACULAR)</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDiagonals(prev => !prev)}
              className={`px-3 py-1 rounded font-semibold border ${
                showDiagonals 
                  ? 'bg-blue-600 text-white border-blue-500' 
                  : isInverted ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              {showDiagonals ? 'Diagonais Ativas' : 'Sem Diagonais'}
            </button>

            <button
              onClick={() => setGridType(prev => prev === 'standard' ? 'dense' : 'standard')}
              className={`px-3 py-1 rounded font-semibold border ${
                gridType === 'dense' 
                  ? 'bg-blue-600 text-white border-blue-500' 
                  : isInverted ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              {gridType === 'dense' ? 'Grade Fina (Macular)' : 'Grade Padrão'}
            </button>
          </div>

          <button
            onClick={() => setIsInverted(prev => !prev)}
            className={`px-3 py-1 rounded flex items-center gap-1.5 font-semibold border ${
              isInverted ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            {isInverted ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            <span>{isInverted ? 'Fundo Branco' : 'Fundo Preto'}</span>
          </button>
        </div>
      </div>

      {/* Grade de Amsler SVG de Alta Precisão */}
      <div className="flex-1 w-full flex items-center justify-center p-8">
        <svg
          viewBox="-200 -200 400 400"
          className="w-full max-w-[550px] max-h-[550px] aspect-square"
        >
          {/* Fundo */}
          <rect
            x="-200"
            y="-200"
            width="400"
            height="400"
            fill={isInverted ? '#000000' : '#FFFFFF'}
          />

          {/* Linhas da Grade */}
          {Array.from({ length: linesCount + 1 }).map((_, i) => {
            const coord = -200 + i * step;
            return (
              <React.Fragment key={i}>
                {/* Linha Vertical */}
                <line
                  x1={coord}
                  y1="-200"
                  x2={coord}
                  y2="200"
                  stroke={isInverted ? '#FFFFFF' : '#000000'}
                  strokeWidth="1.5"
                  opacity={isInverted ? 0.9 : 0.85}
                />
                {/* Linha Horizontal */}
                <line
                  x1="-200"
                  y1={coord}
                  x2="200"
                  y2={coord}
                  stroke={isInverted ? '#FFFFFF' : '#000000'}
                  strokeWidth="1.5"
                  opacity={isInverted ? 0.9 : 0.85}
                />
              </React.Fragment>
            );
          })}

          {/* Diagonais Auxiliares para Escotoma Central */}
          {showDiagonals && (
            <>
              <line x1="-200" y1="-200" x2="200" y2="200" stroke="#DC2626" strokeWidth="2" strokeDasharray="6,4" />
              <line x1="-200" y1="200" x2="200" y2="-200" stroke="#DC2626" strokeWidth="2" strokeDasharray="6,4" />
            </>
          )}

          {/* Borda Externa */}
          <rect
            x="-200"
            y="-200"
            width="400"
            height="400"
            fill="none"
            stroke={isInverted ? '#FFFFFF' : '#000000'}
            strokeWidth="3"
          />

          {/* Ponto de Fixação Central */}
          <circle cx="0" cy="0" r="6" fill="#DC2626" />
          <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Guia Clínico Inferior */}
      <div className={`w-full px-6 py-2.5 flex items-center justify-between text-xs border-t ${
        isInverted ? 'bg-slate-950 border-slate-900 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
      }`}>
        <div className="flex items-center gap-4">
          <span className="font-semibold">Instrução ao Paciente:</span>
          <span>"Fixe o ponto central vermelho. Observa linhas onduladas, tortas, falhas ou manchas?"</span>
        </div>
        <span className="italic">* Ferramenta orientativa para metamorfopsias e escotomas centrais</span>
      </div>
    </div>
  );
};
