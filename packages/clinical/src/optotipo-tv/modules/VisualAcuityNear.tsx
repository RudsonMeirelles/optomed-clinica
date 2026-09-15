import React, { useState } from 'react';
import { calculateOptotypeHeightMm, mmToPixels } from '@optotipo/shared';
import { BookOpen, Glasses, Ruler } from 'lucide-react';

interface VisualAcuityNearProps {
  pixelsPerMm: number;
}

interface NearParagraph {
  jaeger: string;
  snellenNear: string;
  logMAR: number;
  ptSize: number;
  text: string;
}

const NEAR_PARAGRAPHS: NearParagraph[] = [
  {
    jaeger: 'J1 / N4',
    snellenNear: '20/20 (0.8M)',
    logMAR: 0.0,
    ptSize: 10,
    text: 'A visão de perto é essencial para a leitura confortável e atividades minuciosas do dia a dia profissional.'
  },
  {
    jaeger: 'J2 / N5',
    snellenNear: '20/25 (1.0M)',
    logMAR: 0.1,
    ptSize: 12,
    text: 'Com o avanço natural da idade, a flexibilidade do cristalino diminui, exigindo compensação óptica adequada.'
  },
  {
    jaeger: 'J4 / N6',
    snellenNear: '20/30 (1.25M)',
    logMAR: 0.2,
    ptSize: 14,
    text: 'A presbiopia se manifesta tipicamente a partir dos quarenta anos com dificuldade para leitura em distâncias usuais.'
  },
  {
    jaeger: 'J6 / N8',
    snellenNear: '20/40 (1.6M)',
    logMAR: 0.3,
    ptSize: 16,
    text: 'O exame refrativo criterioso avalia tanto a acuidade monocular quanto o equilíbrio binocular para perto.'
  },
  {
    jaeger: 'J8 / N10',
    snellenNear: '20/50 (2.0M)',
    logMAR: 0.4,
    ptSize: 20,
    text: 'A correta prescrição de adição garante conforto visual e prevenção de astenopia durante o trabalho.'
  },
  {
    jaeger: 'J10 / N14',
    snellenNear: '20/80 (3.2M)',
    logMAR: 0.6,
    ptSize: 26,
    text: 'AVALIAÇÃO DE VISÃO SUB-NORMAL E LEITURA AMPLIADA.'
  }
];

export const VisualAcuityNear: React.FC<VisualAcuityNearProps> = ({ pixelsPerMm }) => {
  const [distanceCm, setDistanceCm] = useState<number>(40); // 33, 40, 50, 60 cm
  const [selectedAddition, setSelectedAddition] = useState<number>(2.00); // Adição em dioptrias

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 text-slate-900 select-none">
      {/* Barra de Configurações de Perto */}
      <div className="w-full bg-white border-b border-slate-300 px-6 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          {/* Seletor de Distância de Perto */}
          <div className="flex items-center gap-2 text-xs">
            <Ruler className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-700">DISTÂNCIA DE PERTO:</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {[33, 40, 50, 60].map((d) => (
                <button
                  key={d}
                  onClick={() => setDistanceCm(d)}
                  className={`px-3 py-1 rounded font-bold transition-colors ${
                    distanceCm === d ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-black'
                  }`}
                >
                  {d} cm
                </button>
              ))}
            </div>
          </div>

          {/* Módulo Presbiopia / Adição */}
          <div className="flex items-center gap-2 text-xs">
            <Glasses className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-700">ADIÇÃO (PRESBIOPIA):</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {[1.00, 1.50, 2.00, 2.50, 3.00, 3.50].map((add) => (
                <button
                  key={add}
                  onClick={() => setSelectedAddition(add)}
                  className={`px-2.5 py-1 rounded font-mono font-bold transition-colors ${
                    selectedAddition === add ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-black'
                  }`}
                >
                  +{add.toFixed(2)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1 rounded-full font-medium">
          Tabela de Leitura Contínua Padronizada
        </div>
      </div>

      {/* Cartão de Leitura Central */}
      <div className="flex-1 w-full p-8 overflow-y-auto max-w-5xl mx-auto flex flex-col gap-6 justify-center">
        {NEAR_PARAGRAPHS.map((p, idx) => (
          <div
            key={idx}
            className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-400 transition-colors flex items-center justify-between gap-6"
          >
            <div className="flex-1">
              <p
                style={{ fontSize: `${p.ptSize * 1.3}px` }}
                className="font-serif leading-relaxed text-slate-900 tracking-normal"
              >
                {p.text}
              </p>
            </div>

            <div className="w-44 flex flex-col items-end text-right border-l border-slate-200 pl-4 text-xs font-mono shrink-0">
              <span className="font-black text-sm text-blue-700">{p.jaeger}</span>
              <span className="text-slate-600">{p.snellenNear}</span>
              <span className="text-slate-500">logMAR {p.logMAR.toFixed(1)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
