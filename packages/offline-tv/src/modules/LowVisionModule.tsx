import React, { useState } from 'react';
import { calculateOptotypeHeightMm, mmToPixels } from '@optotipo/shared';
import { OptotypeRenderer } from '../components/OptotypeRenderer';
import { Eye, Accessibility, Hand, Sun, Moon } from 'lucide-react';

interface LowVisionModuleProps {
  distanceMeters: number;
  pixelsPerMm: number;
}

export const LowVisionModule: React.FC<LowVisionModuleProps> = ({ distanceMeters, pixelsPerMm }) => {
  const [scaleLevel, setScaleLevel] = useState<'20_400' | '20_800' | '20_1600'>('20_400');
  const [currentOperational, setCurrentOperational] = useState<'chart' | 'cf' | 'hm' | 'lp' | 'nlp'>('chart');
  const [cfDistanceMeters, setCfDistanceMeters] = useState<number>(1.0);

  const relativeScale = scaleLevel === '20_400' ? 20.0 : scaleLevel === '20_800' ? 40.0 : 80.0;
  const heightMm = calculateOptotypeHeightMm(relativeScale, distanceMeters);
  const sizePx = mmToPixels(heightMm, pixelsPerMm);

  return (
    <div className="w-full h-full flex flex-col bg-white text-black select-none">
      {/* Barra de Controles */}
      <div className="w-full bg-slate-100 border-b border-slate-300 px-6 py-2.5 flex items-center justify-between text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <Accessibility className="w-4 h-4 text-purple-600" />
          <span className="font-bold text-slate-900 text-sm">AVALIAÇÃO DE BAIXA VISÃO / VISÃO SUBNORMAL</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-200 p-0.5 rounded border border-slate-300">
            {(['chart', 'cf', 'hm', 'lp', 'nlp'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setCurrentOperational(m)}
                className={`px-3 py-1 rounded font-bold uppercase transition-colors ${
                  currentOperational === m ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-700 hover:text-black'
                }`}
              >
                {m === 'chart' ? 'Optotipo Gigante' : m === 'cf' ? 'CF (Conta Dedos)' : m === 'hm' ? 'HM (Mov. Mãos)' : m === 'lp' ? 'LP (Percepção Luz)' : 'NLP (Sem Luz)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo Central */}
      <div className="flex-1 w-full flex items-center justify-center p-8 bg-white overflow-hidden">
        {currentOperational === 'chart' && (
          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center justify-center gap-8">
              <OptotypeRenderer type="tumbling_e" value="E" orientation={0} sizePx={Math.min(sizePx, 450)} color="#000000" />
              <OptotypeRenderer type="tumbling_e" value="E" orientation={90} sizePx={Math.min(sizePx, 450)} color="#000000" />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600">NÍVEL AMPLIADO:</span>
              <div className="flex gap-2">
                {[
                  { id: '20_400', label: '20/400 (Decimal 0.05)' },
                  { id: '20_800', label: '20/800 (Decimal 0.025)' },
                  { id: '20_1600', label: '20/1600 (Decimal 0.0125)' }
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => setScaleLevel(lvl.id as any)}
                    className={`px-3 py-1 rounded text-xs font-bold ${
                      scaleLevel === lvl.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentOperational === 'cf' && (
          <div className="flex flex-col items-center text-center max-w-lg p-8 bg-purple-50 border-2 border-purple-200 rounded-3xl">
            <Hand className="w-16 h-16 text-purple-600 mb-4" />
            <h3 className="text-2xl font-black text-purple-950 mb-2">CF — CONTA DEDOS (Counting Fingers)</h3>
            <p className="text-sm text-slate-600 mb-6">
              Apresente dedos em alto contraste na distância indicada e registre a resposta confirmada pelo paciente.
            </p>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Distância do Teste:</span>
              {[0.5, 1.0, 1.5, 2.0, 3.0].map((d) => (
                <button
                  key={d}
                  onClick={() => setCfDistanceMeters(d)}
                  className={`px-3 py-1 rounded font-bold text-xs ${
                    cfDistanceMeters === d ? 'bg-purple-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
                  }`}
                >
                  {d} m
                </button>
              ))}
            </div>

            <div className="mt-6 text-base font-bold text-purple-900 bg-white px-4 py-2 rounded-xl border border-purple-200">
              Registro Clínico: <span className="font-mono">CF a {cfDistanceMeters.toFixed(1)}m</span>
            </div>
          </div>
        )}

        {currentOperational === 'hm' && (
          <div className="flex flex-col items-center text-center max-w-lg p-8 bg-blue-50 border-2 border-blue-200 rounded-3xl">
            <Hand className="w-16 h-16 text-blue-600 mb-4 animate-pulse" />
            <h3 className="text-2xl font-black text-blue-950 mb-2">HM — MOVIMENTO DE MÃOS (Hand Motion)</h3>
            <p className="text-sm text-slate-600 mb-6">
              Movimente a mão horizontalmente ou verticalmente e confirme se o paciente detecta a direção do movimento.
            </p>
            <div className="text-base font-bold text-blue-900 bg-white px-4 py-2 rounded-xl border border-blue-200">
              Registro Clínico: <span className="font-mono">HM (Hand Motion)</span>
            </div>
          </div>
        )}

        {currentOperational === 'lp' && (
          <div className="flex flex-col items-center text-center max-w-lg p-8 bg-amber-50 border-2 border-amber-200 rounded-3xl">
            <Sun className="w-16 h-16 text-amber-600 mb-4" />
            <h3 className="text-2xl font-black text-amber-950 mb-2">LP — PERCEPÇÃO LUMINOSA (Light Perception)</h3>
            <p className="text-sm text-slate-600 mb-6">
              Avalie com lanterna/foco se o paciente detecta a presença de luz e sua projeção nos 4 quadrantes.
            </p>
            <div className="text-base font-bold text-amber-900 bg-white px-4 py-2 rounded-xl border border-amber-200">
              Registro Clínico: <span className="font-mono">LP com projeção correta / duvidosa</span>
            </div>
          </div>
        )}

        {currentOperational === 'nlp' && (
          <div className="flex flex-col items-center text-center max-w-lg p-8 bg-slate-100 border-2 border-slate-300 rounded-3xl">
            <Moon className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-2xl font-black text-slate-900 mb-2">NLP — SEM PERCEPÇÃO LUMINOSA (No Light Perception)</h3>
            <p className="text-sm text-slate-600 mb-6">
              Ausência total de resposta ou detecção sob estímulo luminoso direto de alta intensidade.
            </p>
            <div className="text-base font-bold text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-300">
              Registro Clínico: <span className="font-mono">NLP (Amaurose)</span>
            </div>
          </div>
        )}
      </div>

      {/* Guia Clínico */}
      <div className="w-full bg-slate-100 border-t border-slate-300 px-6 py-2.5 flex items-center justify-between text-xs text-slate-600">
        <span>Estímulos dimensionados para pacientes com acuidade visual profundamente reduzida</span>
        <span className="text-slate-500 italic">* CF, HM, LP e NLP são registros clínicos operacionais padronizados</span>
      </div>
    </div>
  );
};
