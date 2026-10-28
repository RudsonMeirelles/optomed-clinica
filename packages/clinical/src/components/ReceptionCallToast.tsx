import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  User, 
  MapPin, 
  Stethoscope, 
  X, 
  Volume2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { PatientTicketCall } from '@optotipo/shared';

interface ReceptionCallToastProps {
  onDismiss?: () => void;
}

export const ReceptionCallToast: React.FC<ReceptionCallToastProps> = ({ onDismiss }) => {
  const [activeCall, setActiveCall] = useState<PatientTicketCall | null>(null);

  useEffect(() => {
    const handlePatientCalled = (e: any) => {
      const ticket: PatientTicketCall = e.detail;
      if (ticket) {
        setActiveCall(ticket);

        // Som discreto de notificação na recepção (Chime de sino suave)
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const now = audioCtx.currentTime;
          
          const osc1 = audioCtx.createOscillator();
          const gain1 = audioCtx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(587.33, now); // D5
          gain1.gain.setValueAtTime(0.2, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc1.connect(gain1);
          gain1.connect(audioCtx.destination);
          osc1.start(now);
          osc1.stop(now + 0.4);

          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(880.00, now + 0.2); // A5
          gain2.gain.setValueAtTime(0.25, now + 0.2);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.start(now + 0.2);
          osc2.stop(now + 0.8);

          // Anúncio por voz se disponível
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(
              `Chamando paciente ${ticket.patientName} para o ${ticket.roomName}`
            );
            utterance.lang = 'pt-BR';
            utterance.rate = 1.0;
            setTimeout(() => {
              window.speechSynthesis.speak(utterance);
            }, 300);
          }
        } catch {}
      }
    };

    const handlePatientCleared = () => {
      setActiveCall(null);
    };

    window.addEventListener('optomed_patient_called', handlePatientCalled);
    window.addEventListener('optomed_patient_cleared', handlePatientCleared);

    return () => {
      window.removeEventListener('optomed_patient_called', handlePatientCalled);
      window.removeEventListener('optomed_patient_cleared', handlePatientCleared);
    };
  }, []);

  // Auto-fechar após 15 segundos
  useEffect(() => {
    if (!activeCall) return;
    const timer = setTimeout(() => {
      setActiveCall(null);
      if (onDismiss) onDismiss();
    }, 15000);
    return () => clearTimeout(timer);
  }, [activeCall, onDismiss]);

  if (!activeCall) return null;

  return (
    <div className="fixed top-20 right-6 z-50 max-w-sm w-full animate-bounce-in select-none">
      <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-blue-500 rounded-3xl p-4.5 text-white shadow-2xl ring-4 ring-blue-500/20 space-y-3">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center animate-pulse">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Chamada do Consultório
                </span>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              </div>
              <div className="text-xs font-bold text-white">
                Paciente Solicitado
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveCall(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card do Paciente */}
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white truncate">
                {activeCall.patientName}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-teal-400" />
                <span className="truncate">{activeCall.roomName}</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-lg">
              {activeCall.ticketNumber}
            </span>
          </div>
        </div>

        {/* Rodapé informativo */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1">
            <Stethoscope className="w-3 h-3 text-emerald-400" />
            <span>{activeCall.examinerName || 'Consultório'}</span>
          </div>
          <span className="font-mono text-slate-500">
            {new Date(activeCall.calledAt || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};
