import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Wifi, 
  CheckCircle2, 
  Copy, 
  Check, 
  X, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Send, 
  BookOpen, 
  Eye, 
  ExternalLink 
} from 'lucide-react';
import { lanController } from '../services/lanController';

interface FireTVPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FireTVPairingModal: React.FC<FireTVPairingModalProps> = ({ isOpen, onClose }) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [localIp, setLocalIp] = useState<string>('192.168.0.104');
  const [testSuccess, setTestSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
      setLocalIp(window.location.hostname);
    }
  }, []);

  if (!isOpen) return null;

  const tvFarUrl = `http://${localIp}:5173`;
  const remoteControllerUrl = `http://${localIp}:5174`;

  const handleCopy = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleSendTest = () => {
    lanController.randomize();
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 2500);
  };

  const handleOpenNearTest = () => {
    lanController.setModule('av_near');
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 2500);
  };

  const handleOpenFarTest = () => {
    lanController.setModule('av_distance');
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto select-none animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
            <Wifi className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-wide text-white flex items-center gap-2">
              CENTRAL DE PAREAMENTO MULTI-DISPOSITIVOS
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Conecte TV de Longe, Tablet de Perto, Smartphones e Telas na mesma Rede Local (Wi-Fi)
            </p>
          </div>
        </div>

        {/* 3 Cartões de Conexão Rápida */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* 1. Tela de Exame de Longe (TV / Android Box) */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-blue-400 flex items-center gap-1.5 text-xs">
                  <Monitor className="w-4 h-4" /> TELA DE LONGE (TV BOX / SMART TV)
                </span>
                <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full font-mono">
                  Porta 5173
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Instale o <strong>OptotipoMeirelles.apk</strong> ou abra no navegador da TV:
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-700">
              <span className="font-mono font-bold text-xs text-slate-200 flex-1 truncate px-1">
                {tvFarUrl}
              </span>
              <button
                onClick={() => handleCopy(tvFarUrl, 'far')}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow cursor-pointer"
              >
                {copiedUrl === 'far' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl === 'far' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <button
              onClick={handleOpenFarTest}
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" /> Transmitir Teste de Longe
            </button>
          </div>

          {/* 2. Tablet do Paciente / Teste de Perto (40 cm) */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-indigo-400 flex items-center gap-1.5 text-xs">
                  <Tablet className="w-4 h-4" /> TABLET DO PACIENTE (TESTE DE PERTO)
                </span>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full font-mono">
                  33cm - 40cm
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Abra no navegador de qualquer <strong>Tablet iPad / Android</strong>:
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-700">
              <span className="font-mono font-bold text-xs text-slate-200 flex-1 truncate px-1">
                {tvFarUrl}
              </span>
              <button
                onClick={() => handleCopy(tvFarUrl, 'near')}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow cursor-pointer"
              >
                {copiedUrl === 'near' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl === 'near' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <button
              onClick={handleOpenNearTest}
              className="w-full py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-800 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Transmitir Teste de Perto (Jaeger)
            </button>
          </div>
        </div>

        {/* 3. Controle Remoto Clínico em Celular ou Tablet do Médico */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5 text-emerald-400">
              <Smartphone className="w-4 h-4" /> CONTROLE REMOTO NO SEU CELULAR / TABLET DO EXAMINADOR:
            </span>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
              Porta 5174
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-700">
            <span className="font-mono font-bold text-xs text-emerald-300 flex-1 truncate px-1">
              {remoteControllerUrl}
            </span>
            <button
              onClick={() => handleCopy(remoteControllerUrl, 'remote')}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow cursor-pointer"
            >
              {copiedUrl === 'remote' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl === 'remote' ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Abra este endereço no navegador do seu celular ou tablet para controlar todo o consultório sem fios na mão.
          </p>
        </div>

        {/* Botão de Teste Imediato de Sincronização */}
        <div className="pt-1 flex items-center gap-3">
          <button
            onClick={handleSendTest}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-98 transition-all cursor-pointer"
          >
            {testSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-300 animate-bounce" /> : <Send className="w-4 h-4" />}
            <span>{testSuccess ? 'Comando Enviado com Sucesso para Todas as Telas!' : 'Testar Sincronização Imediata com a TV / Tablet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
