import React, { useEffect, useState } from 'react';
import { PatientTicketCall } from '@optotipo/shared';
import { UserCheck, Bell, MapPin, Stethoscope, Sparkles } from 'lucide-react';

interface PatientCallingOverlayProps {
  currentCall: PatientTicketCall | null;
  onDismiss?: () => void;
}

export const PatientCallingOverlay: React.FC<PatientCallingOverlayProps> = ({ currentCall, onDismiss }) => {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    if (currentCall) {
      setVisible(true);

      // Reproduzir som eletrônico de chamada (Ding-Dong / Chime suave)
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = audioCtx.currentTime;
        
        // Primeiro tom (Freq 660 Hz - Mi)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        // Segundo tom (Freq 880 Hz - Lá)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, now + 0.25);
        gain2.gain.setValueAtTime(0.35, now + 0.25);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.25);
        osc2.stop(now + 1.2);

        // Voz síntese anunciando a senha e o nome (SpeechSynthesis)
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(
            `Senha ${currentCall.ticketNumber}. Paciente ${currentCall.patientName}, favor dirigir-se ao ${currentCall.roomName}`
          );
          utterance.lang = 'pt-BR';
          utterance.rate = 0.95;
          utterance.pitch = 1.0;
          setTimeout(() => {
            window.speechSynthesis.speak(utterance);
          }, 400);
        }
      } catch (e) {
        console.log('Audio chime error:', e);
      }

      // Oculta automaticamente após 18 segundos
      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }, 18000);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [currentCall]);

  if (!visible || !currentCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-10 bg-slate-950/85 backdrop-blur-xl animate-fadeIn select-none">
      {/* Luz ambiente de destaque atrás do painel */}
      <div className="absolute -top-32 w-full max-w-4xl h-96 rounded-full blur-3xl pointer-events-none opacity-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 animate-pulse" />

      <div className="relative w-full max-w-5xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-4 border-blue-500/80 rounded-[40px] shadow-[0_25px_80px_rgba(37,99,235,0.4)] p-8 sm:p-12 text-white overflow-hidden text-center space-y-8 animate-scaleUp">
        
        {/* Faixa Superior de Alerta */}
        <div className="flex items-center justify-center gap-3">
          <div className="px-5 py-2 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 font-black text-sm uppercase tracking-[0.3em] flex items-center gap-2 shadow-inner">
            <Bell className="w-5 h-5 text-amber-400 animate-bounce" />
            <span>CHAMADA DE PACIENTE • SALA DE ESPERA</span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
        </div>

        {/* SENHA DO PACIENTE EM DESTAQUE GIGANTE */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-1">
            SENHA DE ATENDIMENTO
          </span>
          <div className="text-6xl sm:text-8xl md:text-9xl font-black font-mono tracking-wider bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(245,158,11,0.3)]">
            {currentCall.ticketNumber}
          </div>
          {currentCall.priority && (
            <span className="mt-2 px-4 py-1 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-lg">
              ATENDIMENTO PRIORITÁRIO
            </span>
          )}
        </div>

        {/* NOME COMPLETO DO PACIENTE */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-inner">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400 block mb-2">
            PACIENTE
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight capitalize drop-shadow-md">
            {currentCall.patientName}
          </h2>
        </div>

        {/* LOCAL / CONSULTÓRIO & EXAMINADOR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="bg-blue-600/30 border border-blue-500/50 rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg">
              <MapPin className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-200 block">
                DIRIGIR-SE AO LOCAL
              </span>
              <span className="text-xl sm:text-2xl font-black text-white block">
                {currentCall.roomName}
              </span>
            </div>
          </div>

          <div className="bg-indigo-600/30 border border-indigo-500/50 rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-lg">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-200 block">
                EXAMINADOR RESPONSÁVEL
              </span>
              <span className="text-xl sm:text-2xl font-black text-white block">
                {currentCall.examinerName}
              </span>
            </div>
          </div>
        </div>

        {/* Botão de Fechar / Toque */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              if (onDismiss) onDismiss();
            }}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            [Toque na tela ou pressione qualquer tecla para fechar]
          </button>
        </div>
      </div>
    </div>
  );
};
