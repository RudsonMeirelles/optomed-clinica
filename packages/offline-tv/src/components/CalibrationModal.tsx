import React, { useState, useEffect } from 'react';
import { DisplayCalibrationData, calculatePixelsPerMm } from '@optotipo/shared';
import { Ruler, Check, RotateCcw, X, Plus, Minus } from 'lucide-react';
import { saveCalibration } from '../services/storageService';

interface CalibrationModalProps {
  isOpen: boolean;
  calibration: DisplayCalibrationData;
  onClose: () => void;
  onSave: (newCalibration: DisplayCalibrationData) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  calibration,
  onClose,
  onSave
}) => {
  const [barPixels, setBarPixels] = useState<number>(calibration.referenceBarPixels || 378);
  const [scaleFactor, setScaleFactor] = useState<number>(calibration.displayScale || 1.0);

  useEffect(() => {
    setBarPixels(calibration.referenceBarPixels || 378);
    setScaleFactor(calibration.displayScale || 1.0);
  }, [calibration, isOpen]);

  if (!isOpen) return null;

  const handleAdjustPixels = (delta: number) => {
    setBarPixels(prev => Math.max(100, Math.min(1200, Math.round(prev + delta))));
  };

  const handleConfirm = () => {
    const pxPerMm = calculatePixelsPerMm(barPixels, 100, scaleFactor);
    const updated: DisplayCalibrationData = {
      ...calibration,
      isCalibrated: true,
      referenceBarLengthMm: 100,
      referenceBarPixels: barPixels,
      pixelsPerMm: pxPerMm,
      displayScale: scaleFactor,
      calibratedAt: new Date().toISOString(),
      screenWidthPx: window.innerWidth,
      screenHeightPx: window.innerHeight
    };

    saveCalibration(updated);
    onSave(updated);
    onClose();
  };

  const handleReset = () => {
    setBarPixels(378);
    setScaleFactor(1.0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-slate-900 border-2 border-blue-500/80 rounded-2xl max-w-3xl w-full p-8 shadow-2xl text-slate-100 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-4 text-blue-400">
          <Ruler className="w-8 h-8" />
          <h2 className="text-2xl font-bold tracking-wide">CALIBRAÇÃO FÍSICA DA TELA</h2>
        </div>

        <p className="text-sm text-slate-300 text-center max-w-xl mb-6 leading-relaxed">
          Para garantir precisão geométrica e validade dos testes de acuidade visual, posicione uma <strong className="text-white">régua física real</strong> sobre a barra abaixo e ajuste até medir <strong className="text-emerald-400">exatamente 100 mm (10 cm)</strong>.
        </p>

        {/* Barra de Calibração Física 100mm com Marcações de Régua */}
        <div className="w-full flex flex-col items-center justify-center py-6 bg-slate-950 rounded-xl border border-slate-800 mb-6 overflow-hidden">
          <div className="text-xs text-slate-400 mb-2 font-mono">
            RÉGUA DE REFERÊNCIA (100 mm): <span className="text-blue-400 font-bold">{barPixels} px</span> ({ (barPixels / 100).toFixed(2) } px/mm)
          </div>

          <div
            style={{ width: `${barPixels}px` }}
            className="h-16 bg-white relative rounded flex flex-col justify-between px-0.5 shadow-lg select-none transition-all duration-75"
          >
            {/* Linhas de graduação da régua */}
            <div className="w-full flex justify-between items-start h-5 border-b border-gray-300">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-0.5 bg-black ${i % 5 === 0 ? 'h-4' : 'h-2'}`} />
                  {i % 2 === 0 && (
                    <span className="text-[9px] font-mono text-black font-bold -mt-0.5">{i}cm</span>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center text-xs font-bold text-black tracking-widest uppercase pb-1">
              100 MILÍMETROS EXATOS
            </div>
          </div>
        </div>

        {/* Botões de Ajuste */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <span className="text-xs text-slate-400 mr-2">Ajuste Rápido:</span>
          <button
            onClick={() => handleAdjustPixels(-10)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold flex items-center gap-1 active:scale-95 transition-transform"
          >
            <Minus className="w-4 h-4" /> 10px
          </button>
          <button
            onClick={() => handleAdjustPixels(-1)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold flex items-center gap-1 active:scale-95 transition-transform"
          >
            <Minus className="w-4 h-4" /> 1px
          </button>
          <button
            onClick={() => handleAdjustPixels(1)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold flex items-center gap-1 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" /> 1px
          </button>
          <button
            onClick={() => handleAdjustPixels(10)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold flex items-center gap-1 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" /> 10px
          </button>
        </div>

        {/* Ações Finais */}
        <div className="flex items-center gap-4 w-full justify-end border-t border-slate-800 pt-5">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Restaurar Padrão
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>

          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-transform"
          >
            <Check className="w-4 h-4" /> Confirmar e Salvar Calibração
          </button>
        </div>
      </div>
    </div>
  );
};
