import React, { useState } from 'react';
import { calculateOptotypeHeightMm, mmToPixels } from '@optotipo/shared';
import { OptotypeRenderer } from '../components/OptotypeRenderer';
import { Eye, SunMedium } from 'lucide-react';

interface ContrastSensitivityProps {
  distanceMeters: number;
  pixelsPerMm: number;
}

interface ContrastStep {
  percent: number;
  logCS: number;
  letters: string[];
}

const CONTRAST_STEPS: ContrastStep[] = [
  { percent: 100, logCS: 0.00, letters: ['V', 'R', 'S'] },
  { percent: 50,  logCS: 0.30, letters: ['K', 'D', 'C'] },
  { percent: 25,  logCS: 0.60, letters: ['N', 'H', 'O'] },
  { percent: 12.5,logCS: 0.90, letters: ['Z', 'P', 'R'] },
  { percent: 6.25,logCS: 1.20, letters: ['E', 'S', 'V'] },
  { percent: 3.12,logCS: 1.50, letters: ['K', 'N', 'D'] },
  { percent: 1.56,logCS: 1.80, letters: ['C', 'O', 'Z'] },
  { percent: 0.78,logCS: 2.10, letters: ['H', 'P', 'E'] }
];

export const ContrastSensitivity: React.FC<ContrastSensitivityProps> = ({ distanceMeters, pixelsPerMm }) => {
  const [selectedStep, setSelectedStep] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');

  // Optotipo padrão equivalente a 20/60 para teste de contraste
  const heightMm = calculateOptotypeHeightMm(3.0, distanceMeters);
  const sizePx = mmToPixels(heightMm, pixelsPerMm);

  return (
    <div className="w-full h-full flex flex-col bg-white text-black select-none">
      {/* Barra de Controles */}
      <div className="w-full bg-slate-100 border-b border-slate-300 px-6 py-2.5 flex items-center justify-between text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <SunMedium className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-900 text-sm">SENSIBILIDADE AO CONTRASTE</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-200 p-0.5 rounded border border-slate-300">
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 rounded font-bold transition-colors ${
                viewMode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:text-black'
              }`}
            >
              Tabela Completa
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 rounded font-bold transition-colors ${
                viewMode === 'single' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:text-black'
              }`}
            >
              Nível Isolado
            </button>
          </div>
        </div>
      </div>

      {/* Área Central de Exibição */}
      <div className="flex-1 w-full p-8 flex items-center justify-center overflow-y-auto">
        {viewMode === 'all' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl">
            {CONTRAST_STEPS.map((step, idx) => {
              const opacityVal = step.percent / 100;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedStep(idx)}
                  className={`p-6 border-2 rounded-2xl flex flex-col items-center justify-between gap-4 cursor-pointer transition-all ${
                    selectedStep === idx
                      ? 'border-blue-500 bg-blue-50/50 shadow-md scale-105'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-4" style={{ opacity: opacityVal }}>
                    {step.letters.map((l, lIdx) => (
                      <OptotypeRenderer
                        key={lIdx}
                        type="sloan"
                        value={l}
                        sizePx={sizePx * 0.8}
                        color="#000000"
                      />
                    ))}
                  </div>

                  <div className="w-full flex justify-between text-xs font-mono text-slate-500 border-t border-slate-200 pt-2">
                    <span className="font-bold text-slate-800">{step.percent}%</span>
                    <span>logCS {step.logCS.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8">
            <div
              className="flex items-center gap-8 p-12 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner"
              style={{ opacity: CONTRAST_STEPS[selectedStep].percent / 100 }}
            >
              {CONTRAST_STEPS[selectedStep].letters.map((l, lIdx) => (
                <OptotypeRenderer
                  key={lIdx}
                  type="sloan"
                  value={l}
                  sizePx={sizePx * 1.4}
                  color="#000000"
                />
              ))}
            </div>

            <div className="flex items-center gap-6 font-mono text-sm">
              <span className="bg-slate-200 px-3 py-1 rounded font-bold">
                Contraste: {CONTRAST_STEPS[selectedStep].percent}%
              </span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded font-bold">
                logCS: {CONTRAST_STEPS[selectedStep].logCS.toFixed(2)}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedStep(prev => Math.max(0, prev - 1))}
                disabled={selectedStep === 0}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 rounded font-semibold disabled:opacity-30"
              >
                ▲ Maior Contraste
              </button>
              <button
                onClick={() => setSelectedStep(prev => Math.min(CONTRAST_STEPS.length - 1, prev + 1))}
                disabled={selectedStep === CONTRAST_STEPS.length - 1}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 rounded font-semibold disabled:opacity-30"
              >
                ▼ Menor Contraste
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guia Clínico e Disclaimer */}
      <div className="w-full bg-slate-100 border-t border-slate-300 px-6 py-2.5 flex items-center justify-between text-xs text-slate-600">
        <span>Avaliação quantitativa de discriminação em baixos níveis de contraste luminoso</span>
        <span className="text-slate-500 italic">* Triagem digital de contraste (sem alegação de equivalência normativa externa)</span>
      </div>
    </div>
  );
};
