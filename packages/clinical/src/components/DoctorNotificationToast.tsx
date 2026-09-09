import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  User, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  Play, 
  Sparkles,
  Stethoscope,
  Volume2
} from 'lucide-react';
import { Appointment, Patient } from '@optotipo/shared';
import { offlineDb } from '../services/offlineDb';

interface DoctorNotificationToastProps {
  onStartEncounter: (patient: Patient) => void;
  onOpenPatientView?: (patient: Patient) => void;
}

export const DoctorNotificationToast: React.FC<DoctorNotificationToastProps> = ({
  onStartEncounter,
  onOpenPatientView
}) => {
  const [notification, setNotification] = useState<{
    id: string;
    patientName: string;
    patientId: string;
    ticketNumber?: string;
    time: string;
    type?: string;
    isPriority?: boolean;
    appointmentId?: string;
  } | null>(null);

  useEffect(() => {
    const handleNewPatientRegistered = (e: any) => {
      const data = e.detail;
      if (data) {
        setNotification({
          id: 'notif_' + Date.now(),
          patientName: data.patientName,
          patientId: data.patientId,
          ticketNumber: data.ticketNumber || 'P-01',
          time: data.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          type: data.type || 'Consulta / Refração',
          isPriority: data.isPriority,
          appointmentId: data.appointmentId
        });

        // Toca aviso sonoro discreto para o examinador
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota A5
          osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15); // Nota E6
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        } catch {}
      }
    };

    window.addEventListener('optomed_new_patient_registered', handleNewPatientRegistered);
    return () => window.removeEventListener('optomed_new_patient_registered', handleNewPatientRegistered);
  }, []);

  if (!notification) return null;

  const handleStartExam = () => {
    const allPatients = offlineDb.getPatients();
    const patient: Patient = allPatients.find(p => p.id === notification.patientId) || {
      id: notification.patientId,
      fullName: notification.patientName,
      birthDate: '',
      nationality: 'BR',
      documentType: 'CPF',
      phoneCountryCode: '+55',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Atualiza status na agenda se houver
    if (notification.appointmentId) {
      const apts = offlineDb.getAppointments();
      const apt = apts.find(a => a.id === notification.appointmentId);
      if (apt) {
        apt.status = 'in_consultation';
        offlineDb.saveAppointment(apt);
      }
    }

    setNotification(null);
    onStartEncounter(patient);
  };

  const handleViewPatient = () => {
    const allPatients = offlineDb.getPatients();
    const patient = allPatients.find(p => p.id === notification.patientId);
    if (patient && onOpenPatientView) {
      onOpenPatientView(patient);
    }
    setNotification(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce-in select-none">
      <div className="bg-slate-950/95 backdrop-blur-xl border-2 border-emerald-500/80 rounded-3xl p-5 text-white shadow-2xl ring-4 ring-emerald-500/20 space-y-4">
        
        {/* Cabeçalho da Notificação */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-inner">
              <Bell className="w-5 h-5 animate-wiggle" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                NOVO PACIENTE NA RECEPÇÃO
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Cadastrado agora • Aguardando na Sala
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card do Paciente */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono font-black text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-xl">
              {notification.ticketNumber}
            </span>
            <div className="overflow-hidden">
              <h4 className="font-black text-sm text-white capitalize truncate max-w-[200px]">
                {notification.patientName}
              </h4>
              <span className="text-[10px] text-slate-400 font-medium block">
                {notification.type} • {notification.time}
              </span>
            </div>
          </div>

          {notification.isPriority && (
            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-black uppercase">
              Prioritário
            </span>
          )}
        </div>

        {/* Botões de Ação Imediata do Examinador */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleViewPatient}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span>Visualizar</span>
          </button>

          <button
            type="button"
            onClick={handleStartExam}
            className="py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Play className="w-3.5 h-3.5 text-white fill-white" />
            <span>Iniciar Atendimento</span>
          </button>
        </div>
      </div>
    </div>
  );
};
