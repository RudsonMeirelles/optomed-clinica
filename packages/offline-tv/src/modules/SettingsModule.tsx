import React, { useState } from 'react';
import { DisplayCalibrationData } from '@optotipo/shared';
import { Settings, Ruler, Tv, Lock, Volume2, Moon, ArrowLeft, Check, Wifi } from 'lucide-react';
import { TVAppSettings, saveSettings } from '../services/storageService';
import { lanPairingService } from '../services/lanPairingService';

interface SettingsModuleProps {
  calibration: DisplayCalibrationData;
  settings: TVAppSettings;
  onOpenCalibration: () => void;
  onUpdateSettings: (newSettings: TVAppSettings) => void;
  onUpdateDistance: (distanceMeters: number) => void;
  onBackToMenu?: () => void;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  calibration,
  settings,
  onOpenCalibration,
  onUpdateSettings,
  onUpdateDistance,
  onBackToMenu
}) => {
  const [localSettings, setLocalSettings] = useState<TVAppSettings>(settings);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  const handleSave = (updated: TVAppSettings) => {
    setLocalSettings(updated);
    saveSettings(updated);
    onUpdateSettings(updated);
    lanPairingService.connect(updated.serverIp);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleDistanceChange = (dist: number) => {
    const updated = { ...localSettings, defaultDistanceMeters: dist };
    handleSave(updated);
    onUpdateDistance(dist);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-100 select-none overflow-y-auto">
      {/* Barra Superior */}
      <div className="w-full bg-slate-950 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {onBackToMenu && (
            <button
              type="button"
              onClick={onBackToMenu}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4 text-blue-400" />
              <span>Voltar</span>
            </button>
          )}
          <Settings className="w-5 h-5 text-blue-400" />
          <span className="font-bold text-slate-100 text-sm">CONFIGURAÇÕES DO OPTOTIPO MEIRELLES</span>
        </div>

        {saveToast && (
          <div className="flex items-center gap-1.5 text-xs bg-emerald-950 border border-emerald-800 text-emerald-300 px-3 py-1 rounded-full font-bold">
            <Check className="w-3.5 h-3.5" /> Configurações salvas e rede conectando!
          </div>
        )}
      </div>

      {/* Grade de Configurações */}
      <div className="max-w-4xl w-full mx-auto p-8 space-y-6">
        {/* 1. Calibração Física */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-950/60 border border-blue-800 rounded-xl text-blue-400">
              <Ruler className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Calibração Física da Tela (100 mm)</h3>
              <p className="text-xs text-slate-400 max-w-md">
                Ajuste os pixels por milímetro reais da televisão com uma régua de 10 cm para garantir a precisão geométrica dos optotipos.
              </p>
              <div className="mt-2 text-xs font-mono text-slate-300">
                Status: {calibration.isCalibrated ? (
                  <span className="text-emerald-400 font-bold">CALIBRADO ({calibration.pixelsPerMm.toFixed(2)} px/mm)</span>
                ) : (
                  <span className="text-amber-400 font-bold">PENDENTE DE CALIBRAÇÃO</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCalibration}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
          >
            Abrir Calibração (100mm)
          </button>
        </div>

        {/* 2. Distância de Exame Padrão */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Tv className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Distância Padrão do Exame (Longe)</h3>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[2.0, 2.5, 3.0, 3.5, 4.0, 5.0].map((dist) => (
              <button
                key={dist}
                type="button"
                onClick={() => handleDistanceChange(dist)}
                className={`py-3 rounded-xl font-bold font-mono text-sm border transition-all cursor-pointer ${
                  localSettings.defaultDistanceMeters === dist
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30 scale-105'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {dist.toFixed(1)} m
              </button>
            ))}
          </div>
        </div>

        {/* 3. Conexão LAN e IP do Sistema */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Wifi className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Conexão em Rede (Parear com Computador / Tablet)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">ENDEREÇO IP DO COMPUTADOR:</label>
              <input
                type="text"
                value={localSettings.serverIp || '192.168.1.144'}
                onChange={(e) => setLocalSettings({ ...localSettings, serverIp: e.target.value })}
                placeholder="Ex: 192.168.1.144"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">IP do seu computador na rede Wi-Fi</p>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">NOME DA SALA / CONSULTÓRIO:</label>
              <input
                type="text"
                value={localSettings.roomName}
                onChange={(e) => setLocalSettings({ ...localSettings, roomName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => handleSave(localSettings)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Salvar e Conectar à Rede</span>
            </button>
          </div>
        </div>

        {/* 4. Protetor de Tela & Áudio */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Moon className="w-4 h-4 text-purple-400" />
              <h4 className="text-sm font-bold text-white">Tempo para Modo Descanso</h4>
            </div>
            <div className="flex gap-2">
              {[15, 30, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleSave({ ...localSettings, autoScreenSaverMinutes: mins })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                    localSettings.autoScreenSaverMinutes === mins
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }`}
                >
                  {mins} minutos
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-bold text-white">Feedback Sonoro do Controle</h4>
            </div>
            <button
              type="button"
              onClick={() => handleSave({ ...localSettings, soundFeedback: !localSettings.soundFeedback })}
              className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                localSettings.soundFeedback
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              {localSettings.soundFeedback ? 'Ativado' : 'Desativado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
