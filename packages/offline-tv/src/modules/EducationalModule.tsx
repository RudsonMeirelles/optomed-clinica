import React, { useState } from 'react';
import { GraduationCap, Eye, ChevronRight } from 'lucide-react';

interface ConditionDoc {
  id: string;
  title: string;
  shortDesc: string;
  anatomy: string;
  correction: string;
  diagramColor: string;
}

const CONDITIONS: ConditionDoc[] = [
  {
    id: 'emmetropia',
    title: 'Emetropia (Visão Normal)',
    shortDesc: 'Os raios luminosos convergem perfeitamente sobre a retina.',
    anatomy: 'Comprimento axial do olho e poder refrativo da córnea e cristalino em equilíbrio harmônico.',
    correction: 'Não necessita de compensação óptica.',
    diagramColor: '#10B981'
  },
  {
    id: 'myopia',
    title: 'Miopia',
    shortDesc: 'Visão embaçada para longe, com foco formado antes da retina.',
    anatomy: 'Olho com diâmetro axial mais longo que o normal ou curvatura corneana excessivamente acentuada.',
    correction: 'Lentes divergentes / côncavas (esférico com dioptria negativa).',
    diagramColor: '#3B82F6'
  },
  {
    id: 'hyperopia',
    title: 'Hipermetropia',
    shortDesc: 'Dificuldade proporcional para perto e fadiga visual, foco formado atrás da retina.',
    anatomy: 'Olho com diâmetro axial mais curto que o normal ou poder refrativo corneano reduzido.',
    correction: 'Lentes convergentes / convexas (esférico com dioptria positiva).',
    diagramColor: '#F59E0B'
  },
  {
    id: 'astigmatism',
    title: 'Astigmatismo',
    shortDesc: 'Distorção e falta de nitidez em todas as distâncias devido a múltiplos pontos focais.',
    anatomy: 'Assimetria na curvatura da córnea ou cristalino (formato ovalado/tórico em vez de esférico).',
    correction: 'Lentes tóricas / cilíndricas com orientação de eixo específico (0° a 180°).',
    diagramColor: '#8B5CF6'
  },
  {
    id: 'presbyopia',
    title: 'Presbiopia (Vista Cansada)',
    shortDesc: 'Perda gradual da capacidade de focar objetos próximos a partir dos 40 anos.',
    anatomy: 'Diminuição fisiológica natural da elasticidade da cápsula do cristalino e do músculo ciliar.',
    correction: 'Lentes de leitura, bifocais ou multifocais progressivas com adição positiva.',
    diagramColor: '#EC4899'
  }
];

export const EducationalModule: React.FC = () => {
  const [selectedCondition, setSelectedCondition] = useState<ConditionDoc>(CONDITIONS[0]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-100 select-none">
      {/* Barra Superior */}
      <div className="w-full bg-slate-950 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-slate-100 text-sm">MÓDULO EDUCACIONAL & ORIENTAÇÃO AO PACIENTE</span>
        </div>
      </div>

      <div className="flex-1 w-full flex overflow-hidden">
        {/* Menu Lateral de Condições */}
        <div className="w-80 bg-slate-950/60 border-r border-slate-800 p-4 flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-1">AMETROPIAS E CONDIÇÕES</span>
          {CONDITIONS.map((cond) => (
            <button
              key={cond.id}
              onClick={() => setSelectedCondition(cond)}
              className={`p-3.5 rounded-xl text-left flex items-center justify-between transition-all ${
                selectedCondition.id === cond.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div>
                <div className="font-bold text-sm">{cond.title}</div>
                <div className="text-xs opacity-75 line-clamp-1">{cond.shortDesc}</div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
            </button>
          ))}
        </div>

        {/* Painel Central com Diagrama Óptico e Explicação */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center bg-slate-900 overflow-y-auto">
          <div className="max-w-3xl w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
            <h2 className="text-3xl font-black text-white mb-2 tracking-wide" style={{ color: selectedCondition.diagramColor }}>
              {selectedCondition.title}
            </h2>
            <p className="text-base text-slate-300 text-center mb-8 max-w-xl">
              {selectedCondition.shortDesc}
            </p>

            {/* Diagrama Esquemático do Globo Ocular e Raios de Luz */}
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 flex items-center justify-center">
              <svg viewBox="0 0 400 200" className="w-full h-auto">
                {/* Globo Ocular */}
                <ellipse cx="220" cy="100" rx="90" ry="80" fill="#0F172A" stroke="#475569" strokeWidth="3" />
                {/* Córnea */}
                <path d="M 130 60 A 50 50 0 0 0 130 140" fill="none" stroke="#60A5FA" strokeWidth="4" />
                {/* Cristalino */}
                <ellipse cx="160" cy="100" rx="8" ry="30" fill="#93C5FD" opacity="0.8" />
                {/* Retina */}
                <path d="M 310 60 A 90 80 0 0 1 310 140" fill="none" stroke="#F87171" strokeWidth="5" />

                {/* Raios Luminosos */}
                <line x1="20" y1="70" x2="130" y2="70" stroke="#FBBF24" strokeWidth="2" strokeDasharray="4,2" />
                <line x1="20" y1="130" x2="130" y2="130" stroke="#FBBF24" strokeWidth="2" strokeDasharray="4,2" />

                {/* Ponto Focal Conforme a Ametropia */}
                {selectedCondition.id === 'emmetropia' && (
                  <>
                    <line x1="160" y1="70" x2="310" y2="100" stroke="#10B981" strokeWidth="2.5" />
                    <line x1="160" y1="130" x2="310" y2="100" stroke="#10B981" strokeWidth="2.5" />
                    <circle cx="310" cy="100" r="6" fill="#10B981" />
                    <text x="310" y="40" fill="#10B981" fontSize="12" textAnchor="middle" fontWeight="bold">Foco Exato na Retina</text>
                  </>
                )}

                {selectedCondition.id === 'myopia' && (
                  <>
                    <line x1="160" y1="70" x2="250" y2="100" stroke="#3B82F6" strokeWidth="2.5" />
                    <line x1="160" y1="130" x2="250" y2="100" stroke="#3B82F6" strokeWidth="2.5" />
                    <circle cx="250" cy="100" r="6" fill="#3B82F6" />
                    <text x="250" y="40" fill="#3B82F6" fontSize="12" textAnchor="middle" fontWeight="bold">Foco Antes da Retina</text>
                  </>
                )}

                {selectedCondition.id === 'hyperopia' && (
                  <>
                    <line x1="160" y1="70" x2="360" y2="100" stroke="#F59E0B" strokeWidth="2.5" />
                    <line x1="160" y1="130" x2="360" y2="100" stroke="#F59E0B" strokeWidth="2.5" />
                    <circle cx="360" cy="100" r="6" fill="#F59E0B" />
                    <text x="350" y="40" fill="#F59E0B" fontSize="12" textAnchor="middle" fontWeight="bold">Foco Atrás da Retina</text>
                  </>
                )}

                {selectedCondition.id === 'astigmatism' && (
                  <>
                    <line x1="160" y1="70" x2="260" y2="100" stroke="#8B5CF6" strokeWidth="2" />
                    <line x1="160" y1="130" x2="330" y2="100" stroke="#8B5CF6" strokeWidth="2" />
                    <ellipse cx="295" cy="100" rx="35" ry="4" fill="#8B5CF6" opacity="0.6" />
                    <text x="295" y="40" fill="#8B5CF6" fontSize="12" textAnchor="middle" fontWeight="bold">Dois Planos Focais Distintos</text>
                  </>
                )}

                {selectedCondition.id === 'presbyopia' && (
                  <>
                    <line x1="160" y1="70" x2="340" y2="100" stroke="#EC4899" strokeWidth="2.5" />
                    <line x1="160" y1="130" x2="340" y2="100" stroke="#EC4899" strokeWidth="2.5" />
                    <circle cx="340" cy="100" r="6" fill="#EC4899" />
                    <text x="320" y="40" fill="#EC4899" fontSize="12" textAnchor="middle" fontWeight="bold">Perda da Acomodação de Perto</text>
                  </>
                )}
              </svg>
            </div>

            {/* Informações Anatômicas e Correção Óptica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Mecanismo Anatômico:</span>
                <p className="text-sm text-slate-200">{selectedCondition.anatomy}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Compensação Óptica Recomendada:</span>
                <p className="text-sm text-slate-200">{selectedCondition.correction}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
