import React, { useState } from 'react';
import { Palette, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface ColorPlate {
  id: number;
  type: 'number' | 'shape' | 'path';
  expectedAnswer: string;
  category: 'adulto' | 'infantil';
  plateColor: string; // Fundo
  figureColor: string; // Estímulo
  description: string;
}

const COLOR_PLATES: ColorPlate[] = [
  { id: 1, type: 'number', expectedAnswer: '12', category: 'adulto', plateColor: '#84CC16', figureColor: '#F97316', description: 'Placa de Demonstração (Todos devem identificar)' },
  { id: 2, type: 'number', expectedAnswer: '8',  category: 'adulto', plateColor: '#10B981', figureColor: '#EF4444', description: 'Eixo Protan / Deutan' },
  { id: 3, type: 'number', expectedAnswer: '29', category: 'adulto', plateColor: '#22C55E', figureColor: '#F59E0B', description: 'Discriminação Vermelho / Verde' },
  { id: 4, type: 'number', expectedAnswer: '5',  category: 'adulto', plateColor: '#3B82F6', figureColor: '#EC4899', description: 'Eixo Tritan / Azul-Amarelo' },
  { id: 5, type: 'number', expectedAnswer: '74', category: 'adulto', plateColor: '#059669', figureColor: '#DC2626', description: 'Discriminação Cromática' },
  { id: 6, type: 'shape',  expectedAnswer: 'Círculo', category: 'infantil', plateColor: '#10B981', figureColor: '#EA580C', description: 'Triagem Pediátrica (Forma Geométrica)' },
  { id: 7, type: 'shape',  expectedAnswer: 'Estrela', category: 'infantil', plateColor: '#14B8A6', figureColor: '#E11D48', description: 'Triagem Pediátrica (Forma Geométrica)' },
  { id: 8, type: 'path',   expectedAnswer: 'Linha Contínua', category: 'infantil', plateColor: '#0D9488', figureColor: '#F97316', description: 'Seguimento de Trajeto' }
];

export const ColorVisionScreening: React.FC = () => {
  const [currentPlateIndex, setCurrentPlateIndex] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);

  const plate = COLOR_PLATES[currentPlateIndex];

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-100 select-none">
      {/* Barra de Controles */}
      <div className="w-full bg-slate-950 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <Palette className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-slate-100 text-sm">TRIAGEM CROMÁTICA DIGITAL</span>
          <span className="text-slate-500 font-mono">({plate.category.toUpperCase()})</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono text-slate-400">
            Placa {currentPlateIndex + 1} de {COLOR_PLATES.length}
          </span>
          <button
            onClick={() => setShowAnswer(prev => !prev)}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold border border-slate-700"
          >
            {showAnswer ? 'Ocultar Resposta' : 'Revelar Resposta'}
          </button>
        </div>
      </div>

      {/* Exibição da Placa Pseudo-Isocromática Digital */}
      <div className="flex-1 w-full flex flex-col items-center justify-center p-8 relative">
        <div className="relative w-80 h-80 rounded-full flex items-center justify-center shadow-2xl overflow-hidden border-4 border-slate-800 bg-slate-950">
          {/* Mosaico de pontos simulados */}
          <div className="absolute inset-0 grid grid-cols-8 gap-2 p-4 opacity-75">
            {Array.from({ length: 64 }).map((_, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: i % 3 === 0 ? plate.plateColor : plate.figureColor,
                  transform: `scale(${0.6 + (i % 5) * 0.1})`
                }}
                className="rounded-full transition-transform"
              />
            ))}
          </div>

          {/* Figura / Número Central em Destaque */}
          <div className="relative z-10 font-mono font-black text-7xl tracking-tighter" style={{ color: plate.figureColor }}>
            {plate.type === 'number' ? (
              plate.expectedAnswer
            ) : plate.type === 'shape' ? (
              <div className="w-32 h-32 border-8 rounded-2xl" style={{ borderColor: plate.figureColor }} />
            ) : (
              <div className="w-48 h-8 rounded-full" style={{ backgroundColor: plate.figureColor }} />
            )}
          </div>
        </div>

        {/* Resposta e Descrição */}
        {showAnswer && (
          <div className="mt-6 bg-slate-800/90 border border-slate-700 px-6 py-2.5 rounded-xl text-center">
            <span className="text-xs text-slate-400">Padrão esperado: </span>
            <strong className="text-emerald-400 text-base">{plate.expectedAnswer}</strong>
            <span className="text-xs text-slate-400 block mt-0.5">{plate.description}</span>
          </div>
        )}

        {/* Botões de Navegação Anterior / Próxima */}
        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={() => {
              setShowAnswer(false);
              setCurrentPlateIndex(prev => Math.max(0, prev - 1));
            }}
            disabled={currentPlateIndex === 0}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl flex items-center gap-1.5 font-bold"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          <button
            onClick={() => {
              setShowAnswer(false);
              setCurrentPlateIndex(prev => Math.min(COLOR_PLATES.length - 1, prev + 1));
            }}
            disabled={currentPlateIndex === COLOR_PLATES.length - 1}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-xl flex items-center gap-1.5 font-bold shadow-lg shadow-blue-600/30"
          >
            Próxima <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alerta Clínico Mandatório */}
      <div className="w-full bg-slate-950 border-t border-slate-800 px-6 py-2.5 flex items-center justify-between text-[11px] text-amber-400/90">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>AVISO CLÍNICO:</strong> As imagens digitais consistem em triagem funcional orientativa. A reprodução exata de cores depende do gamut e calibragem do display.
          </span>
        </div>
      </div>
    </div>
  );
};
