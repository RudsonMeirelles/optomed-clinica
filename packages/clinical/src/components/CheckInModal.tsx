import React, { useState, useEffect } from 'react';
import { 
  Patient, 
  Appointment, 
  AppointmentType, 
  NationalityType, 
  DocumentType,
  FinancialTransaction,
  PaymentMethod,
  canTransitionAppointmentStatus 
} from '@optotipo/shared';
import { 
  UserCheck, 
  Search, 
  X, 
  Check, 
  Clock, 
  AlertTriangle, 
  Ticket, 
  MapPin, 
  Calendar,
  Sparkles,
  Phone,
  FileText,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { offlineDb, generateUUID } from '../services/offlineDb';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  initialAppointment?: Appointment | null;
  preselectedPatient?: Patient | null;
  preselectedAppointment?: Appointment | null;
  onCheckInCompleted?: (appointment: Appointment, patient: Patient) => void;
  onSuccess?: () => void;
  clinicId?: string;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  patient,
  initialAppointment,
  preselectedPatient,
  preselectedAppointment,
  onCheckInCompleted,
  onSuccess,
  clinicId
}) => {
  const activeTargetPatient = patient || preselectedPatient;
  const activeTargetAppointment = initialAppointment || preselectedAppointment;
  const effectiveClinicId = (clinicId && clinicId !== 'all') ? clinicId : offlineDb.getActiveClinicId();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  
  // Paciente e Agendamento selecionados
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Dados rápidos de conferência
  const [patientPhone, setPatientPhone] = useState('');
  const [patientDoc, setPatientDoc] = useState('');
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('refrativo');
  const [isPriority, setIsPriority] = useState<boolean>(false);
  const [assignedRoom, setAssignedRoom] = useState<string>('Consultório 1');
  const [checkInNotes, setCheckInNotes] = useState<string>('');

  // Pagamento da Consulta na Recepção
  const [chargeConsultation, setChargeConsultation] = useState<boolean>(true);
  const [consultationFee, setConsultationFee] = useState<number>(50.00);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentStatus, setPaymentStatus] = useState<'completed' | 'pending'>('completed');

  // Prevenção contra duplo clique e concorrência
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const todayIso = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isOpen) return;

    const allPatients = offlineDb.getPatients(effectiveClinicId);
    setPatients(allPatients);

    const allApts = offlineDb.getAppointments(effectiveClinicId);
    const dayApts = allApts.filter(a => a.date === todayIso && a.status !== 'canceled');
    setTodayAppointments(dayApts);

    // Inicializa seleção se fornecido
    if (activeTargetPatient) {
      setSelectedPatient(activeTargetPatient);
      setPatientPhone(activeTargetPatient.phone || '');
      setPatientDoc(activeTargetPatient.documentNumber || '');
      
      const aptForPat = dayApts.find(a => a.patientId === activeTargetPatient.id);
      if (aptForPat) {
        setSelectedAppointment(aptForPat);
        setAppointmentType(aptForPat.type || 'refrativo');
        setIsPriority(Boolean(aptForPat.isPriority));
        setAssignedRoom(aptForPat.room || 'Consultório 1');
      }
    } else if (activeTargetAppointment) {
      setSelectedAppointment(activeTargetAppointment);
      setAppointmentType(activeTargetAppointment.type || 'refrativo');
      setIsPriority(Boolean(activeTargetAppointment.isPriority));
      setAssignedRoom(activeTargetAppointment.room || 'Consultório 1');
      
      const pat = allPatients.find(p => p.id === activeTargetAppointment.patientId);
      if (pat) {
        setSelectedPatient(pat);
        setPatientPhone(pat.phone || activeTargetAppointment.patientPhone || '');
        setPatientDoc(pat.documentNumber || activeTargetAppointment.patientDocument || '');
      } else {
        setPatientPhone(activeTargetAppointment.patientPhone || '');
        setPatientDoc(activeTargetAppointment.patientDocument || '');
      }
    } else {
      setSelectedPatient(null);
      setSelectedAppointment(null);
      setPatientPhone('');
      setPatientDoc('');
      setAppointmentType('refrativo');
      setIsPriority(false);
      setAssignedRoom('Consultório 1');
      setCheckInNotes('');
    }

    setConflictWarning(null);
    setIsProcessing(false);
  }, [isOpen, activeTargetPatient, activeTargetAppointment, effectiveClinicId]);

  // FASE 29: Fechamento acessível com tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtragem de pacientes
  const filteredPatients = searchQuery.trim().length > 1
    ? patients.filter(p => {
        const q = searchQuery.toLowerCase();
        const pName = (p.fullName || '').toLowerCase();
        return (
          pName.includes(q) ||
          (p.documentNumber && p.documentNumber.includes(q)) ||
          (p.phone && p.phone.includes(q))
        );
      }).slice(0, 8)
    : [];

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setPatientPhone(p.phone || '');
    setPatientDoc(p.documentNumber || '');
    setSearchQuery('');

    // Verifica se paciente já tem agendamento hoje
    const existingApt = todayAppointments.find(a => a.patientId === p.id);
    if (existingApt) {
      setSelectedAppointment(existingApt);
      setAppointmentType(existingApt.type || 'refrativo');
      setIsPriority(Boolean(existingApt.isPriority));
      setAssignedRoom(existingApt.room || 'Consultório 1');
    } else {
      setSelectedAppointment(null);
    }

    // Verifica se já está em atendimento ou na fila
    checkQueueConflict(p.id, p.patientGlobalId);
  };

  const checkQueueConflict = (patientId: string, globalId?: string): boolean => {
    // 1. Verifica se já está com consulta em andamento (inclusive em outras unidades)
    const activeCheck = offlineDb.hasActiveEncounter(patientId, globalId, undefined, effectiveClinicId, true);
    if (activeCheck.active) {
      setConflictWarning('⚠️ Este paciente já possui uma consulta em andamento no consultório. O check-in simultâneo está bloqueado para evitar inconsistência operacional.');
      return true;
    }

    // 2. Verifica se já está na fila de espera hoje na unidade
    const alreadyWaiting = todayAppointments.find(a => 
      a.patientId === patientId && 
      (a.status === 'checked_in' || a.status === 'waiting' || a.status === 'called')
    );
    if (alreadyWaiting) {
      setConflictWarning(`⚠️ Este paciente já realizou check-in hoje (Senha: ${alreadyWaiting.ticketNumber || 'P-01'}) e está aguardando chamada.`);
      return true;
    }

    setConflictWarning(null);
    return false;
  };

  // Gerar senha / ticket sequencial inteligente
  const generateTicket = (priority: boolean, type: AppointmentType): string => {
    const prefix = priority ? 'P' : type === 'retorno' ? 'R' : 'G';
    const dayCount = todayAppointments.length + 1;
    return `${prefix}-${String(dayCount).padStart(2, '0')}`;
  };

  const handleConfirmCheckIn = () => {
    if (isProcessing) return;
    if (!selectedPatient && !preselectedAppointment) {
      alert('Por favor, selecione ou localize um paciente para realizar o check-in.');
      return;
    }

    const patientId = selectedPatient ? selectedPatient.id : (preselectedAppointment?.patientId || '');
    const globalId = selectedPatient?.patientGlobalId;

    // Trava de segurança: impede duplicidade de atendimento ativo incompatível
    if (patientId) {
      const activeCheck = offlineDb.hasActiveEncounter(patientId, globalId, undefined, effectiveClinicId, true);
      if (activeCheck.active) {
        alert('Operação bloqueada: Este paciente já possui um atendimento ativo em andamento (no mesmo ou em outro consultório). Conclua ou cancele o atendimento anterior antes de iniciar novo check-in.');
        return;
      }

      // Se já está aguardando com senha hoje, não duplica ticket
      const alreadyWaiting = todayAppointments.find(a => 
        a.patientId === patientId && 
        (a.status === 'checked_in' || a.status === 'waiting' || a.status === 'called')
      );
      if (alreadyWaiting && !selectedAppointment) {
        alert(`O paciente já possui uma senha ativa hoje (${alreadyWaiting.ticketNumber || 'P-01'}) aguardando chamada.`);
        return;
      }
    }

    setIsProcessing(true);

    try {
      const now = new Date().toISOString();
      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      let targetApt: Appointment;
      const targetPatientId = patientId || generateUUID();
      const patientName = selectedPatient ? selectedPatient.fullName : (preselectedAppointment?.patientName || 'Paciente');

      // Atualiza telefone e documento do paciente se modificado
      if (selectedPatient) {
        if (patientPhone !== selectedPatient.phone || patientDoc !== selectedPatient.documentNumber) {
          const updatedPat: Patient = {
            ...selectedPatient,
            phone: patientPhone.trim() || selectedPatient.phone,
            documentNumber: patientDoc.trim() || selectedPatient.documentNumber,
            updatedAt: now
          };
          offlineDb.savePatient(updatedPat, effectiveClinicId);
        }
      }

      if (selectedAppointment) {
        // Atualiza agendamento existente para checked_in
        const ticket = selectedAppointment.ticketNumber || generateTicket(isPriority, appointmentType);
        targetApt = {
          ...selectedAppointment,
          patientName,
          patientPhone: patientPhone || selectedAppointment.patientPhone,
          patientDocument: patientDoc || selectedAppointment.patientDocument,
          status: 'checked_in',
          ticketNumber: ticket,
          isPriority,
          room: assignedRoom,
          checkInAt: now,
          notes: checkInNotes.trim() ? `${selectedAppointment.notes || ''} [Check-in: ${checkInNotes.trim()}]`.trim() : selectedAppointment.notes,
          updatedAt: now
        };
      } else {
        // Encaixe / Agendamento Imediato no Check-in
        const ticket = generateTicket(isPriority, appointmentType);
        targetApt = {
          id: generateUUID(),
          patientId: targetPatientId,
          patientName,
          patientNationality: selectedPatient?.nationality || 'BR',
          patientPhone,
          patientDocument: patientDoc,
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: todayIso,
          time: nowTime,
          durationMinutes: 3,
          type: appointmentType,
          status: 'checked_in',
          ticketNumber: ticket,
          isPriority,
          room: assignedRoom,
          notes: checkInNotes.trim() || 'Check-in presencial na recepção',
          clinicId: effectiveClinicId,
          checkInAt: now,
          createdAt: now,
          updatedAt: now
        };
      }

      // Persiste offline com idempotência
      offlineDb.saveAppointment(targetApt, effectiveClinicId);

      // Lançamento Financeiro Instantâneo da Consulta na Recepção
      if (chargeConsultation && consultationFee > 0) {
        const txId = generateUUID();
        const activeCl = offlineDb.getClinics().find(c => c.id === effectiveClinicId);
        const curr = activeCl?.defaultCurrency || 'BRL';

        const paymentLabel = paymentMethod === 'pix' ? 'PIX'
          : paymentMethod === 'credit_card' ? 'Cartão de Crédito'
          : paymentMethod === 'debit_card' ? 'Cartão de Débito'
          : paymentMethod === 'cash' ? 'Dinheiro'
          : 'Transferência';

        const newTx: FinancialTransaction = {
          id: txId,
          clinicId: effectiveClinicId,
          type: 'income',
          category: 'consulta',
          description: `Consulta ${targetApt.type === 'retorno' ? 'de Retorno' : 'Clínica'} - ${patientName}`,
          amount: consultationFee,
          amountCents: Math.round(consultationFee * 100),
          currency: curr,
          date: todayIso,
          paymentMethod: paymentMethod,
          patientId: targetApt.patientId,
          patientName: patientName,
          appointmentId: targetApt.id,
          receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
          status: paymentStatus,
          isSettled: paymentStatus === 'completed',
          settledAt: paymentStatus === 'completed' ? now : undefined,
          createdBy: 'Recepção (Check-in)',
          createdAt: now,
          updatedAt: now
        };

        offlineDb.saveTransaction(newTx, effectiveClinicId);
        window.dispatchEvent(new CustomEvent('optomed_transaction_updated', { detail: newTx }));
      }

      // Notifica examinador via evento DOM
      window.dispatchEvent(new CustomEvent('optomed_new_patient_registered', {
        detail: {
          patientName: targetApt.patientName,
          patientId: targetApt.patientId,
          ticketNumber: targetApt.ticketNumber,
          time: targetApt.time,
          type: targetApt.type === 'refrativo' ? 'Refração & Grau' : targetApt.type === 'retorno' ? 'Retorno' : 'Consulta Geral',
          isPriority: targetApt.isPriority,
          appointmentId: targetApt.id
        }
      }));

      // Notifica atualização da agenda e sala de espera
      window.dispatchEvent(new CustomEvent('optomed_appointment_updated', {
        detail: targetApt
      }));

      if (onCheckInCompleted) {
        onCheckInCompleted(targetApt, selectedPatient || (activeTargetPatient as any));
      }

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (err) {
      console.error('Erro ao realizar check-in:', err);
      alert('Erro ao confirmar check-in. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-modal-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 text-slate-900 border border-slate-200 space-y-5">
        
        {/* Header do Check-In */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 text-emerald-600">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <UserCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 id="checkin-modal-title" className="font-black text-sm text-slate-900 uppercase tracking-tight">
                Check-in de Recepção & Triagem
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                Confirmação de Chegada e Entrada na Fila de Atendimento
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de check-in (Esc)"
            title="Fechar (Esc)"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Localizar Paciente (se ainda não selecionado) */}
        {!selectedPatient && !preselectedAppointment && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              1. Localizar Paciente por Nome, CPF ou Telefone:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite para buscar paciente..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            {filteredPatients.length > 0 && (
              <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white shadow-lg">
                {filteredPatients.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className="w-full px-3.5 py-2 text-left hover:bg-emerald-50/70 flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{p.fullName}</span>
                      <span className="text-[10px] text-slate-400">
                        Doc: {p.documentNumber || 'Não informado'} • Tel: {p.phone || 'Sem fone'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Selecionar
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Paciente Selecionado & Conferência Rápida */}
        {(selectedPatient || preselectedAppointment) && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Paciente Identificado
                </span>
                <span className="text-sm font-black text-slate-900 block">
                  {selectedPatient?.fullName || preselectedAppointment?.patientName}
                </span>
              </div>
              {!preselectedAppointment && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setSelectedAppointment(null);
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Trocar Paciente
                </button>
              )}
            </div>

            {/* Campos de Confirmação Rápida */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Telefone/WhatsApp:</label>
                <input
                  type="text"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="DDD + Telefone"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  {selectedPatient?.nationality === 'PY' ? 'CI / RUC (Paraguai):' : 'CPF / RG / Passaporte:'}
                </label>
                <input
                  type="text"
                  value={patientDoc}
                  onChange={(e) => setPatientDoc(e.target.value)}
                  placeholder={selectedPatient?.nationality === 'PY' ? 'Ex: 4.821.902 ou s/ doc' : 'CPF, RG ou Passaporte'}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. Parâmetros de Triagem & Fila */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Tipo de Consulta:</label>
            <select
              value={appointmentType}
              onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="refrativo">Refração & Grau (Geral)</option>
              <option value="retorno">Retorno / Reavaliação</option>
              <option value="pediatrico">Pediátrico / Infantil</option>
              <option value="baixa_visao">Baixa Visão</option>
              <option value="urgencia">Urgência</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Consultório de Destino:</label>
            <select
              value={assignedRoom}
              onChange={(e) => setAssignedRoom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Consultório 1">Consultório 1 (Dr. Rudson)</option>
              <option value="Consultório 2">Consultório 2</option>
              <option value="Sala de Exames">Sala de Exames</option>
            </select>
          </div>
        </div>

        {/* 4. Prioridade Legal & Observações */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div>
              <span className="font-bold text-xs text-slate-900 block">Atendimento Prioritário (Lei nº 10.048)</span>
              <span className="text-[10px] text-slate-500 block">Idosos (60+), gestantes, lactantes, PCD ou crianças de colo</span>
            </div>
            <input
              type="checkbox"
              checked={isPriority}
              onChange={(e) => setIsPriority(e.target.checked)}
              className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Observação de Recepção:</label>
            <input
              type="text"
              value={checkInNotes}
              onChange={(e) => setCheckInNotes(e.target.value)}
              placeholder="Ex: Queixa de dor, acompanhado da filha, etc."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* 5. Pagamento da Consulta na Recepção */}
        <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                R$
              </div>
              <div>
                <span className="font-extrabold text-xs text-emerald-950 block">Pagamento da Consulta</span>
                <span className="text-[10px] text-emerald-700 font-medium">Lançamento instantâneo no caixa da recepção</span>
              </div>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-emerald-900">
              <input
                type="checkbox"
                checked={chargeConsultation}
                onChange={(e) => setChargeConsultation(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <span>Cobrar Consulta</span>
            </label>
          </div>

          {chargeConsultation && (
            <div className="space-y-2.5 pt-1 border-t border-emerald-200/60">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-emerald-800 block mb-1">Valor da Consulta (R$):</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-emerald-300 rounded-xl pl-8 pr-3 py-1.5 text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-emerald-800 block mb-1">Situação do Pagamento:</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full bg-white border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="completed">✓ Pago agora na recepção</option>
                    <option value="pending">⏳ Pendente / Pagar na saída</option>
                  </select>
                </div>
              </div>

              {/* Formas de Pagamento em Botões Rápidos */}
              <div>
                <label className="text-[10px] font-bold text-emerald-800 block mb-1.5">Forma de Pagamento:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      paymentMethod === 'pix'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-100/60'
                    }`}
                  >
                    📱 PIX
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-100/60'
                    }`}
                  >
                    💵 Dinheiro
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('debit_card')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      paymentMethod === 'debit_card'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-100/60'
                    }`}
                  >
                    💳 Débito
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      paymentMethod === 'credit_card'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-100/60'
                    }`}
                  >
                    💳 Crédito
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alerta de Conflito de Fila / Atendimento Concorrente */}
        {conflictWarning && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{conflictWarning}</span>
          </div>
        )}

        {/* Ações Finais */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            disabled={(!selectedPatient && !preselectedAppointment) || isProcessing}
            onClick={handleConfirmCheckIn}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>{isProcessing ? 'Confirmando...' : 'Confirmar Presença & Inserir na Fila'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
