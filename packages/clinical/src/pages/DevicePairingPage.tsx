import React, { useState } from 'react';
import { Tv, Lock, CheckCircle2, RefreshCw, Wifi, ArrowRight } from 'lucide-react';
import { lanController } from '../services/lanController';

interface DevicePairingPageProps {
  onBack: () => void;
}

export const DevicePairingPage: React.FC<DevicePairingPageProps> = ({ onBack }) => {
  const [pinCode, setPinCode] = useState<string>('7492');
  const [roomName, setRoomName] = useState<string>('Consultório 1');
  const [isPairing, setIsPairing] = useState<boolean>(false);
  const [isPaired, setIsPaired] = useState<boolean>(true);

  const handlePair = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPairing(true);
    setTimeout(() => {
      lanController.setPairedRoom(roomName);
      setIsPairing(false);
      setIsPaired(true);
    }, 800);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          PAREAMENTO DO OPTOTIPO MEIRELLES OFFLINE
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Conexão direta por rede local (LAN) com o Amazon Fire TV / Vega OS ou navegador da TV
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <Tv className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Dispositivo da Sala de Exame</h2>
            <p className="text-xs text-slate-500">
              Insira o PIN exibido nas configurações da televisão para estabelecer o controle seguro.
            </p>
          </div>
        </div>

        <form onSubmit={handlePair} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">NOME DA SALA / CONSULTÓRIO</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">PIN DE PAREAMENTO (4 DÍGITOS DA TV)</label>
            <input
              type="text"
              maxLength={4}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-mono font-black tracking-widest text-center text-blue-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPairing}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-transform"
            >
              {isPairing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Conectando à TV...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" /> Conectar e Parear Dispositivo
                </>
              )}
            </button>
          </div>
        </form>

        {isPaired && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <div className="font-bold text-xs text-emerald-900">Dispositivo Conectado com Sucesso!</div>
                <div className="text-[11px] text-emerald-700">Controle remoto ativo para {roomName} via LAN.</div>
              </div>
            </div>

            <button
              onClick={onBack}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1"
            >
              <span>Ir para Consultas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
