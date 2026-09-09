import React, { useState } from 'react';
import { Grid, Sun, Moon } from 'lucide-react';

interface CrossGridTestProps {
  pixelsPerMm: number;
}

export const CrossGridTest: React.FC<CrossGridTestProps> = ({ pixelsPerMm }) => {
  const [isInverted, setIsInverted] = useState<boolean>(false);
  const [gridSpacing, setGridSpacing] = useState<number>(30); // px

  return (
    <div className={`w-full h-full flex flex-col select-none ${
      isInverted ? 'bg-black text-white' : 'bg-white text-black'
    }`}>
      {/* Barra de Controles */}
      <div className={`w-full px-6 py-2.5 flex items-center justify-between text-xs border-b ${
        isInverted ? 'bg-slate-950 border-slate-900 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700'
      }`}>
        <div className="flex items-center gap-3">
          <Grid className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-sm">GRADE CRUZADA (CROSS GRID)</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Espaçamento:</span>
            <div className={`flex p-0.5 rounded border ${
              isInverted ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'
            }`}>
              {[20, 30, 45, 60].map((s) => (
                <button
                  key={s}
                  onClick={() => setGridSpacing(s)}
                  className={`px-2.5 py-0.5 rounded font-bold transition-colors ${
                    gridSpacing === s ? 'bg-blue-600 text-white' : 'hover:opacity-100 opacity-60'
                  }`}
                >
                  {s}px
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsInverted(prev => !prev)}
            className={`px-3 py-1 rounded flex items-center gap-1.5 font-semibold border ${
              isInverted ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            {isInverted ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            <span>{isInverted ? 'Fundo Claro' : 'Fundo Escuro'}</span>
          </button>
        </div>
      </div>

      {/* Grade Cruzada SVG de Alta Precisão */}
      <div className="flex-1 w-full flex items-center justify-center p-8">
        <svg
          viewBox="-200 -200 400 400"
          className="w-full max-w-[500px] max-h-[500px] aspect-square"
        >
          {/* Linhas Verticais e Horizontais */}
          {[-150, -100, -50, 0, 50, 100, 150].map((pos) => (
            <React.Fragment key={pos}>
              {/* Linha Vertical */}
              <line
                x1={pos}
                y1="-180"
                x2={pos}
                y2="180"
                stroke={isInverted ? '#FFFFFF' : '#000000'}
                strokeWidth={pos === 0 ? 5 : 3.5}
              />
              {/* Linha Horizontal */}
              <line
                x1="-180"
                y1={pos}
                x2="180"
                y2={pos}
                stroke={isInverted ? '#FFFFFF' : '#000000'}
                strokeWidth={pos === 0 ? 5 : 3.5}
              />
            </React.Fragment>
          ))}

          {/* Ponto Central de Fixação */}
          <circle cx="0" cy="0" r="7" fill="#DC2626" />
        </svg>
      </div>

      {/* Guia Clínico Inferior */}
      <div className={`w-full px-6 py-2.5 flex items-center justify-between text-xs border-t ${
        isInverted ? 'bg-slate-950 border-slate-900 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
      }`}>
        <div className="flex items-center gap-6">
          <span><strong>Verticais mais nítidas:</strong> Adicionar esférico (+) ou diminuir cilindro (-)</span>
          <span><strong>Horizontais mais nítidas:</strong> Adicionar esférico (-) ou aumentar cilindro (-)</span>
          <span className="text-blue-600 font-bold">Iguais = Equilíbrio</span>
        </div>
        <span className="italic">* Ferramenta auxiliar para acomodação e cilindro cruzado</span>
      </div>
    </div>
  );
};
