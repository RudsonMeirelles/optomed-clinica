import React from 'react';
import { Moon } from 'lucide-react';
import logoClinicaMeirelles from '../assets/logo-clinica-meirelles.jpg';

interface ScreenSaverProps {
  isActive: boolean;
  onWake: () => void;
}

export const ScreenSaver: React.FC<ScreenSaverProps> = ({ isActive, onWake }) => {
  if (!isActive) return null;

  return (
    <div
      onClick={onWake}
      className="fixed inset-0 z-50 bg-[#0B0F19] flex flex-col items-center justify-center cursor-pointer select-none transition-opacity duration-700 animate-fadeIn"
    >
      <div className="flex flex-col items-center text-center p-8 max-w-xl mx-auto">
        {/* Logo Oficial da Clínica Meirelles */}
        <div className="p-5 bg-white rounded-3xl shadow-2xl border border-slate-700/40 mb-6 backdrop-blur-md animate-pulse">
          <img
            src={logoClinicaMeirelles}
            alt="Clínica Meirelles"
            className="w-72 sm:w-96 h-auto object-contain rounded-2xl"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-widest mt-2 bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-800">
          <Moon className="w-3.5 h-3.5 text-blue-400" />
          <span>Proteção de Tela Automática (30 min)</span>
        </div>

        <div className="mt-10 text-xs text-slate-400 border border-slate-800 bg-slate-900/60 px-5 py-2 rounded-full backdrop-blur-sm">
          Pressione qualquer botão no controle remoto para continuar o exame
        </div>
      </div>
    </div>
  );
};
