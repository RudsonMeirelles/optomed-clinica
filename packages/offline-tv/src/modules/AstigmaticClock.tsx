import React, { useState } from 'react';
import { Compass, SunMedium } from 'lucide-react';

interface AstigmaticClockProps {
  pixelsPerMm: number;
}

export const AstigmaticClock: React.FC<AstigmaticClockProps> = ({ pixelsPerMm }) => {
  const [lineThickness, setLineThickness] = useState<number>(3); // 2, 3, 4, 5 px
  const [contrastPercent, setContrastPercent] = useState<number>(100);

  const hours = [
    { hour: 12, angleDeg: 90, axisDeg: 90 },
    { hour: 1, angleDeg: 60, axisDeg: 60 },
    { hour: 2, angleDeg: 30, axisDeg: 30 },
    { hour: 3, angleDeg: 0, axisDeg: 180 },
    { hour: 4, angleDeg: 330, axisDeg: 150 },
    { hour: 5, angleDeg: 300, axisDeg: 120 },
    { hour: 6, angleDeg: 270, axisDeg: 90 },
    { hour: 7, angleDeg: 240, axisDeg: 60 },
    { hour: 8, angleDeg: 210, axisDeg: 30 },
    { hour: 9, angleDeg: 180, axisDeg: 180 },
    { hour: 10, angleDeg: 150, axisDeg: 150 },
    { hour: 11, angleDeg: 120, axisDeg: 120 },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white text-black select-none">
      {/* Barra Superior */}
      <div className="w-full bg-slate-100 border-b border-slate-300 px-6 py-2.5 flex items-center justify-between text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <Compass className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-900 text-sm">RELÓGIO ASTIGMÁTICO (RADIAL DE GREEN)</span>
        </div>

        <div className="flex items-center gap-6">
          {/* Espessura dos Meridianos */}
          <div className="flex items-center gap-2">
            <span>Espessura:</span>
            <div className="flex bg-slate-200 p-0.5 rounded border border-slate-300">
              {[2, 3, 4, 6].map((th) => (
                <button
                  key={th}
                  onClick={() => setLineThickness(th)}
                  className={`px-2.5 py-0.5 rounded font-bold transition-colors ${
                    lineThickness === th ? 'bg-blue-600 text-white' : 'text-slate-700 hover:text-black'
                  }`}
                >
                  {th}px
                </button>
              ))}
            </div>
          </div>

          {/* Contraste */}
          <div className="flex items-center gap-2">
            <SunMedium className="w-3.5 h-3.5 text-slate-500" />
            <span>Contraste:</span>
            <div className="flex bg-slate-200 p-0.5 rounded border border-slate-300">
              {[100, 75, 50, 25].map((c) => (
                <button
                  key={c}
                  onClick={() => setContrastPercent(c)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    contrastPercent === c ? 'bg-blue-600 text-white' : 'text-slate-700 hover:text-black'
                  }`}
                >
                  {c}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Relógio Radial SVG de Alta Precisão Geométrica */}
      <div className="flex-1 w-full flex items-center justify-center p-6 bg-white">
        <svg
          viewBox="-250 -250 500 500"
          className="w-full max-w-[620px] max-h-[620px] aspect-square overflow-visible"
        >
          {/* Fundo de alto contraste */}
          <circle cx="0" cy="0" r="230" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />

          {/* Meridianos Radiais Triplos de Green */}
          {hours.map((h) => {
            const rad = (h.angleDeg * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = -Math.sin(rad);

            const x1 = cos * 35;
            const y1 = sin * 35;
            const x2 = cos * 190;
            const y2 = sin * 190;

            const textX = cos * 215;
            const textY = sin * 215 + 5;

            return (
              <g key={h.hour} opacity={contrastPercent / 100}>
                {/* Linha Central do Meridiano */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#000000"
                  strokeWidth={lineThickness}
                  strokeLinecap="round"
                />

                {/* Linha Paralela Esquerda */}
                <line
                  x1={x1 + sin * 4}
                  y1={y1 - cos * 4}
                  x2={x2 + sin * 4}
                  y2={y2 - cos * 4}
                  stroke="#000000"
                  strokeWidth={lineThickness * 0.75}
                  strokeLinecap="round"
                />

                {/* Linha Paralela Direita */}
                <line
                  x1={x1 - sin * 4}
                  y1={y1 + cos * 4}
                  x2={x2 - sin * 4}
                  y2={y2 + cos * 4}
                  stroke="#000000"
                  strokeWidth={lineThickness * 0.75}
                  strokeLinecap="round"
                />

                {/* Marcador de Hora e Eixo */}
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  fill="#0F172A"
                  fontSize="16"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {h.hour}
                </text>
              </g>
            );
          })}

          {/* Ponto Central de Fixação */}
          <circle cx="0" cy="0" r="8" fill="#DC2626" />
          <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Guia Clínico Inferior */}
      <div className="w-full bg-slate-100 border-t border-slate-300 px-6 py-2 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-900">Regra de Cálculo do Eixo:</span>
          <span>Eixo do cilindro negativo = Menor número da hora mais nítida × 30°</span>
        </div>
        <span className="text-slate-500 italic">* Auxílio ao exame de refração subjetiva</span>
      </div>
    </div>
  );
};
