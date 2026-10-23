import React, { useState, useEffect } from 'react';
import { Patient, Appointment, NationalityType, DocumentType, calculateAge } from '@optotipo/shared';
import { 
  Users, 
  Search, 
  Plus, 
  UserPlus, 
  Phone, 
  Calendar, 
  ArrowRight, 
  ShieldCheck, 
  X, 
  Globe, 
  FileText,
  MapPin,
  Cake,
  Edit3,
  Glasses,
  History,
  FileCheck2,
  Printer,
  ChevronDown,
  Trash2,
  RotateCcw,
  Clock,
  Eye
} from 'lucide-react';
import { offlineDb, generateUUID } from '../services/offlineDb';
import { ClinicalEncounter, Prescription } from '@optotipo/shared';
import { UnifiedPrintCenterModal } from '../components/UnifiedPrintCenterModal';
import { PatientMedicalRecordModal } from '../components/PatientMedicalRecordModal';
import { ClinicalReportModal } from '../components/ClinicalReportModal';
import { CheckInModal } from '../components/CheckInModal';

interface PatientsListProps {
  onSelectPatient: (patient: Patient) => void;
  onStartEncounter?: (patient: Patient, encounter?: ClinicalEncounter) => void;
  userRole?: string;
  clinicId?: string;
}

export const PatientsList: React.FC<PatientsListProps> = ({ onSelectPatient, onStartEncounter, userRole, clinicId }) => {
  const effectiveClinicId = (clinicId && clinicId !== 'all') ? clinicId : offlineDb.getActiveClinicId();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [search, setSearch] = useState<string>('');
  const [nationalityFilter, setNationalityFilter] = useState<'ALL' | 'BR' | 'PY'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

  // Estados para impressão direta de receituário
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printPatient, setPrintPatient] = useState<Patient | null>(null);
  const [printPrescription, setPrintPrescription] = useState<Prescription | null>(null);
  const [printTherapeuticPlan, setPrintTherapeuticPlan] = useState<string | undefined>(undefined);

  // Estados para Modal de Prontuário Completo e Laudo Clínico
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [recordPatient, setRecordPatient] = useState<Patient | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportEncounter, setReportEncounter] = useState<ClinicalEncounter | null>(null);
  const [reportPatient, setReportPatient] = useState<Patient | null>(null);

  // Estados para Check-In Direto da Recepção
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState<boolean>(false);
  const [checkInPatient, setCheckInPatient] = useState<Patient | null>(null);

  const handleOpenRecordModal = (patient: Patient, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecordPatient(patient);
    setIsRecordModalOpen(true);
  };

  const handleOpenReportModal = (patient: Patient, encounter: ClinicalEncounter, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReportPatient(patient);
    setReportEncounter(encounter);
    setIsReportModalOpen(true);
  };

  const handleRegisterReturn = (patient: Patient, previousEncounter?: ClinicalEncounter, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // 1. Cria ou enfileira agendamento de retorno para hoje
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const existingApts = offlineDb.getAppointments(effectiveClinicId);
    
    const returnApt: Appointment = {
      id: generateUUID(),
      patientId: patient.id,
      patientName: patient.fullName,
      patientNationality: patient.nationality || 'BR',
      patientPhone: patient.phone,
      patientDocument: patient.documentNumber,
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      date: today,
      time: nowTime,
      durationMinutes: 3,
      type: 'retorno',
      status: 'waiting',
      ticketNumber: `R-${String(existingApts.filter(a => a.date === today).length + 1).padStart(2, '0')}`,
      notes: `Consulta de Retorno registrada em ${new Date().toLocaleDateString('pt-BR')}. Reavaliação de conduta e dioptria.`,
      room: 'Consultório 1 (Retorno)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.saveAppointment(returnApt, effectiveClinicId);
    window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: returnApt }));
    window.dispatchEvent(new CustomEvent('optomed_new_patient_registered', { detail: { patientName: patient.fullName, type: 'retorno' } }));

    // 2. Se for examinador, abre diretamente o atendimento de retorno na tela de exame com dados preservados da consulta anterior
    if (userRole !== 'reception') {
      if (onStartEncounter) {
        onStartEncounter(patient, {
          isReturnEncounter: true,
          previousEncounter: previousEncounter
        } as any);
      } else {
        onSelectPatient(patient);
      }
    } else {
      alert(`Retorno registrado com sucesso para ${patient.fullName}!\nSenha: ${returnApt.ticketNumber} - Enfileirado na Recepção / Painel do Examinador.`);
    }
  };

  const handleQuickPrint = (patient: Patient, encounter?: ClinicalEncounter, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // 1. Tenta achar prescrição existente salva
    const prescriptions = offlineDb.getPrescriptions(effectiveClinicId);
    let rx = prescriptions.find(p => p.patientId === patient.id);

    // 2. Se não houver prescrição salva mas houver encounter com refração, sintetiza a prescrição
    const enc = encounter || encounters.find(ec => ec.patientId === patient.id && ec.subjectiveRefraction);
    if (!rx && enc && enc.subjectiveRefraction) {
      const ref = enc.subjectiveRefraction;
      rx = {
        id: generateUUID(),
        encounterId: enc.id,
        patientId: patient.id,
        patientName: patient.fullName,
        date: enc.date || new Date().toISOString(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        od: {
          sphere: ref?.od?.sphere || 0,
          cylinder: ref?.od?.cylinder || 0,
          axis: ref?.od?.axis || 0,
          visualAcuity: ref?.od?.visualAcuity
        },
        oe: {
          sphere: ref?.oe?.sphere || 0,
          cylinder: ref?.oe?.cylinder || 0,
          axis: ref?.oe?.axis || 0,
          visualAcuity: ref?.oe?.visualAcuity
        },
        addition: ref?.addition,
        pdDistanceMm: ref?.pdDistanceMm || 62,
        lensType: (ref?.addition ? 'multifocal' : 'monofocal') as any,
        material: 'resina' as any,
        treatments: ['Antirreflexo Premium', 'Proteção UV400'],
        returnInstructions: patient.nationality === 'PY' ? 'Control en 1 año para evaluación visual de rutina.' : 'Retorno em 1 ano para controle visual de rotina.',
        observations: enc.conduct || 'Receita óptica de rotina.'
      };
    }

    setPrintPatient(patient);
    setPrintPrescription(rx || null);
    setPrintTherapeuticPlan(enc?.conduct);
    setIsPrintModalOpen(true);
  };

  // Form state com suporte binacional BR / PY
  const [fullName, setFullName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [sex, setSex] = useState<Patient['sex']>('uninformed');
  const [nationality, setNationality] = useState<NationalityType>('BR');
  const [documentType, setDocumentType] = useState<DocumentType>('CPF');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>('+55');
  const [phone, setPhone] = useState<string>('');
  const [city, setCity] = useState<string>('Ponta Porã');
  const [address, setAddress] = useState<string>('');
  const [guardianName, setGuardianName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [lgpdConsent, setLgpdConsent] = useState<boolean>(true);

  useEffect(() => {
    const refreshPatients = () => {
      // 1. Busca pacientes e prontuários EXCLUSIVAMENTE da clínica efetiva autorizada na sessão
      const clinicPatients = offlineDb.getPatients(effectiveClinicId);
      const clinicEncounters = offlineDb.getEncounters(effectiveClinicId);

      setPatients(clinicPatients);
      setEncounters(clinicEncounters);
    };

    const handleOpenNewPatientTrigger = () => {
      openNewPatientModal();
    };

    refreshPatients();
    window.addEventListener('storage', refreshPatients);
    window.addEventListener('optomed_patient_updated', refreshPatients);
    window.addEventListener('optomed_new_patient_registered', refreshPatients);
    window.addEventListener('optomed_encounter_updated', refreshPatients);
    window.addEventListener('optomed_clinic_changed', refreshPatients);
    window.addEventListener('optomed_open_new_patient_modal', handleOpenNewPatientTrigger);

    return () => {
      window.removeEventListener('storage', refreshPatients);
      window.removeEventListener('optomed_patient_updated', refreshPatients);
      window.removeEventListener('optomed_new_patient_registered', refreshPatients);
      window.removeEventListener('optomed_encounter_updated', refreshPatients);
      window.removeEventListener('optomed_clinic_changed', refreshPatients);
      window.removeEventListener('optomed_open_new_patient_modal', handleOpenNewPatientTrigger);
    };
  }, [effectiveClinicId]);

  const openNewPatientModal = () => {
    const activeClinic = offlineDb.getActiveClinic();
    const isPyClinic = activeClinic?.defaultLanguage === 'es-PY' || activeClinic?.id === 'vision' || activeClinic?.id === 'megastar';

    setEditingPatient(null);
    setFullName('');
    setBirthDate('');
    setSex('uninformed');
    setNationality(isPyClinic ? 'PY' : 'BR');
    setDocumentType(isPyClinic ? 'CI_PY' : 'CPF');
    setDocumentNumber('');
    setPhoneCountryCode(isPyClinic ? '+595' : '+55');
    setPhone('');
    setCity(isPyClinic ? 'Pedro Juan Caballero' : 'Ponta Porã');
    setAddress('');
    setGuardianName('');
    setNotes('');
    setLgpdConsent(true);
    setIsModalOpen(true);
  };

  const openEditPatientModal = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPatient(patient);
    setFullName(patient.fullName || '');
    setBirthDate(patient.birthDate || '');
    setSex(patient.sex || 'uninformed');
    setNationality(patient.nationality || 'BR');
    setDocumentType(patient.documentType || (patient.nationality === 'PY' ? 'CI_PY' : 'CPF'));
    setDocumentNumber(patient.documentNumber || '');
    setPhoneCountryCode(patient.phoneCountryCode || (patient.nationality === 'PY' ? '+595' : '+55'));
    
    // Remove código de país duplicado se já estiver no telefone
    const cleanPhone = patient.phone 
      ? patient.phone.replace(/^\+\d+\s*/, '') 
      : '';
    setPhone(cleanPhone);
    
    setCity(patient.city || (patient.nationality === 'PY' ? 'Pedro Juan Caballero' : 'Ponta Porã'));
    setAddress(patient.address || '');
    setGuardianName(patient.guardianName || '');
    setNotes(patient.notes || '');
    setLgpdConsent(patient.lgpdConsent ?? true);
    setIsModalOpen(true);
  };

  const handleNationalityChange = (nat: NationalityType) => {
    setNationality(nat);
    if (nat === 'PY') {
      setDocumentType('CI_PY');
      setPhoneCountryCode('+595');
      if (!city || city === 'Ponta Porã' || city === 'Foz do Iguaçu') setCity('Pedro Juan Caballero');
    } else {
      setDocumentType('CPF');
      setPhoneCountryCode('+55');
      if (!city || city === 'Pedro Juan Caballero' || city === 'Ciudad del Este') setCity('Ponta Porã');
    }
  };

  const handleDeletePatient = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Deseja realmente excluir o cadastro de "${patient.fullName}" e seus agendamentos?`);
    if (!confirmed) return;

    offlineDb.deletePatient(patient.id, effectiveClinicId);
    // Remove também agendamentos deste paciente nesta clínica
    const apts = offlineDb.getAppointments(effectiveClinicId).filter(a => a.patientId !== patient.id && a.patientName.toLowerCase().trim() !== patient.fullName.toLowerCase().trim());
    offlineDb.saveAppointments(apts, effectiveClinicId);

    setPatients(offlineDb.getPatients(effectiveClinicId));
    window.dispatchEvent(new CustomEvent('optomed_patient_updated', { detail: { id: patient.id, deleted: true } }));
    window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: { patientId: patient.id, deleted: true } }));
  };

  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    if (editingPatient) {
      // Edição de paciente existente
      const updatedPatient: Patient = {
        ...editingPatient,
        fullName: fullName.trim(),
        birthDate,
        sex,
        nationality,
        documentType,
        documentNumber: documentNumber.trim() || undefined,
        phoneCountryCode,
        phone: phone.trim() ? `${phoneCountryCode} ${phone.trim()}` : undefined,
        city: city.trim() || undefined,
        country: nationality === 'PY' ? 'Paraguai' : 'Brasil',
        address: address.trim() || undefined,
        guardianName: guardianName.trim() || undefined,
        notes: notes.trim() || undefined,
        lgpdConsent,
        updatedAt: new Date().toISOString()
      };

      offlineDb.savePatient(updatedPatient, effectiveClinicId);
      setPatients(offlineDb.getPatients(effectiveClinicId));
      setIsModalOpen(false);
      setEditingPatient(null);
    } else {
      // Criação de novo paciente
      const newPatient: Patient = {
        id: generateUUID(),
        fullName: fullName.trim(),
        birthDate,
        sex,
        nationality,
        documentType,
        documentNumber: documentNumber.trim() || undefined,
        phoneCountryCode,
        phone: phone.trim() ? `${phoneCountryCode} ${phone.trim()}` : undefined,
        city: city.trim() || undefined,
        country: nationality === 'PY' ? 'Paraguai' : 'Brasil',
        address: address.trim() || undefined,
        guardianName: guardianName.trim() || undefined,
        notes: notes.trim() || undefined,
        lgpdConsent,
        lgpdConsentDate: lgpdConsent ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      offlineDb.savePatient(newPatient, effectiveClinicId);
      setPatients(offlineDb.getPatients(effectiveClinicId));
      setIsModalOpen(false);

      // Gera senha e entrada automática na fila de espera do dia (usando fuso horário local real)
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const timeNow = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const currentApts = offlineDb.getAppointments(effectiveClinicId);
      const todayCount = currentApts.filter(a => a.date === today).length;
      const generatedTicket = `P-${String(todayCount + 1).padStart(2, '0')}`;

      const newApt: Appointment = {
        id: generateUUID(),
        patientId: newPatient.id,
        patientName: newPatient.fullName,
        patientNationality: newPatient.nationality,
        patientPhone: newPatient.phone,
        patientDocument: newPatient.documentNumber,
        examinerId: 'user-examinador',
        examinerName: 'Dr. Rudson Meirelles',
        date: today,
        time: timeNow,
        durationMinutes: 3,
        type: 'refrativo',
        status: 'waiting', // Entra direto na fila de espera da recepção para o examinador
        ticketNumber: generatedTicket,
        notes: newPatient.notes || 'Paciente cadastrado na recepção.',
        room: 'Consultório 1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      offlineDb.saveAppointment(newApt, effectiveClinicId);

      // Notifica o examinador imediatamente na tela em tempo real
      window.dispatchEvent(new CustomEvent('optomed_new_patient_registered', {
        detail: {
          patientName: newPatient.fullName,
          patientId: newPatient.id,
          ticketNumber: generatedTicket,
          time: timeNow,
          type: 'Consulta / Refração'
        }
      }));

      // Na recepção, apenas salva o cadastro sem abrir a ficha do paciente
      if (userRole !== 'reception') {
        onSelectPatient(newPatient);
      }
    }
  };

  const filtered = patients.filter(p => {
    const matchesSearch = p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone && p.phone.includes(search)) ||
      (p.documentNumber && p.documentNumber.includes(search));
    
    const matchesNat = nationalityFilter === 'ALL' || p.nationality === nationalityFilter;
    return matchesSearch && matchesNat;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              MÓDULO RECEPÇÃO & CADASTRO DE PACIENTES
            </h1>
            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              Brasil 🇧🇷 / Paraguai 🇵🇾
            </span>
            <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
              {patients.length} Pacientes Cadastrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão de cadastro bilíngue com histórico completo, emissão direta de receitas e consentimento LGPD
          </p>
        </div>

        <button
          onClick={openNewPatientModal}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-transform"
        >
          <UserPlus className="w-4 h-4" /> Cadastrar Novo Paciente
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, documento (CPF / C.I.) ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        {/* Filtro por Nacionalidade */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
          <button
            onClick={() => setNationalityFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              nationalityFilter === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-black'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setNationalityFilter('BR')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
              nationalityFilter === 'BR' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-black'
            }`}
          >
            <span>🇧🇷 Brasil</span>
          </button>
          <button
            onClick={() => setNationalityFilter('PY')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
              nationalityFilter === 'PY' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:text-black'
            }`}
          >
            <span>🇵🇾 Paraguai</span>
          </button>
        </div>
      </div>

      {/* Tabela de Pacientes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filtered.map((patient) => {
            const patientEncounters = encounters
              .filter(e => e.patientId === patient.id)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            const lastEncounter = patientEncounters[0];
            const isExpanded = expandedPatientId === patient.id;

            // Formatação do Grau OD e OE do último exame
            const odRef = lastEncounter?.subjectiveRefraction?.od;
            const oeRef = lastEncounter?.subjectiveRefraction?.oe;
            const hasDioptria = odRef && (odRef.sphere !== undefined || odRef.cylinder !== undefined);

            const formatDioptria = (eye?: { sphere?: number; cylinder?: number; axis?: number; visualAcuity?: string }) => {
              if (!eye || (eye.sphere === undefined && eye.cylinder === undefined)) return 'Sem grau';
              const sph = eye.sphere !== undefined ? (eye.sphere > 0 ? `+${eye.sphere.toFixed(2)}` : eye.sphere.toFixed(2)) : '0.00';
              const cyl = eye.cylinder !== undefined && eye.cylinder !== 0 ? ` ${eye.cylinder > 0 ? `+${eye.cylinder.toFixed(2)}` : eye.cylinder.toFixed(2)}` : '';
              const ax = eye.axis ? ` x ${eye.axis}°` : '';
              const va = eye.visualAcuity ? ` (AV ${eye.visualAcuity})` : '';
              return `${sph}${cyl}${ax}${va}`;
            };

            return (
              <div key={patient.id} className="transition-colors hover:bg-slate-50/70">
                <div
                  onClick={() => onSelectPatient(patient)}
                  className="p-4 sm:p-5 cursor-pointer flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-all"
                >
                  {/* Informações Principais do Paciente */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm shadow-2xs shrink-0 ${
                      patient.nationality === 'PY' 
                        ? 'bg-red-50 text-red-700 border border-red-200/80' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                    }`}>
                      {patient.nationality === 'PY' ? '🇵🇾' : '🇧🇷'}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">{patient.fullName}</span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/80">
                          {patient.documentType || 'DOC'}: {patient.documentNumber || 'Sem número'}
                        </span>
                        {patientEncounters.length > 0 && (
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <FileCheck2 className="w-3 h-3 text-blue-600" />
                            {patientEncounters.length} {patientEncounters.length === 1 ? 'Prontuário' : 'Prontuários'}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3.5 gap-y-1">
                        {patient.birthDate && (
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            <span>{new Date(patient.birthDate).toLocaleDateString('pt-BR')}</span>
                            {calculateAge(patient.birthDate) && (
                              <span className="text-[10px] font-bold bg-blue-100/80 text-blue-800 px-1.5 py-0.2 rounded-full border border-blue-200">
                                {calculateAge(patient.birthDate)?.formatted}
                              </span>
                            )}
                          </span>
                        )}
                        {patient.phone && (
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{patient.phone}</span>
                          </span>
                        )}
                        {patient.city && (
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            <span>{patient.city}</span>
                          </span>
                        )}
                        {patient.guardianName && (
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            Resp: {patient.guardianName}
                          </span>
                        )}
                      </div>

                      {/* Exibição Rápida da Última Refração / Dioptria Cadastrada com Data do Atendimento */}
                      {lastEncounter && hasDioptria && (
                        <div className="mt-2 bg-slate-50 border border-slate-200/70 rounded-xl p-2 flex flex-wrap items-center gap-2 text-xs">
                          {/* Data do Atendimento */}
                          <span className="font-bold text-[11px] text-blue-900 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>Atendido em: <strong>{new Date(lastEncounter.date).toLocaleDateString('pt-BR')} às {new Date(lastEncounter.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                          </span>

                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Glasses className="w-3.5 h-3.5 text-blue-600" /> Grau:
                          </span>
                          <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            OD: {formatDioptria(odRef)}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            OE: {formatDioptria(oeRef)}
                          </span>
                          {lastEncounter.subjectiveRefraction?.addition && (
                            <span className="font-mono text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              Adição: +{lastEncounter.subjectiveRefraction.addition.toFixed(2)}
                            </span>
                          )}
                          {lastEncounter.conduct && (
                            <span className="text-[10px] text-slate-600 truncate max-w-xs" title={lastEncounter.conduct}>
                              Conduta: {lastEncounter.conduct}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barra de Ações Rápida Enquadrada & Harmonizada */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-start xl:justify-end pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-100">
                    {/* Botão de Check-In Rápido da Recepção */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCheckInPatient(patient);
                        setIsCheckInModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-teal-600 hover:bg-teal-700 text-white shadow-2xs active:scale-95"
                      title="Realizar check-in do paciente na recepção e emitir senha para a sala de espera"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Check-In</span>
                    </button>

                    {/* Botão de Retorno Principal */}
                    <button
                      type="button"
                      onClick={(e) => handleRegisterReturn(patient, lastEncounter, e)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs active:scale-95"
                      title="Registrar retorno deste paciente (reavaliação visual preservando histórico anterior)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retorno</span>
                    </button>

                    {/* Botão Histórico Inline */}
                    {patientEncounters.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPatientId(isExpanded ? null : patient.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                          isExpanded 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' 
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                        }`}
                        title="Ver histórico de consultas na lista"
                      >
                        <History className="w-3.5 h-3.5 text-slate-500" />
                        <span>Histórico ({patientEncounters.length})</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}

                    {/* Botão Prontuário Completo */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenRecordModal(patient, e)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs cursor-pointer"
                      title="Abrir prontuário clínico completo com histórico"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Prontuário</span>
                    </button>

                    {/* Botão Receita */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickPrint(patient, lastEncounter, e)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                        hasDioptria
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300/80'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                      title="Imprimir receituário óptico/médico com 1 clique"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Receita</span>
                    </button>

                    {/* Botão Editar */}
                    <button
                      type="button"
                      onClick={(e) => openEditPatientModal(patient, e)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors border border-slate-200 shadow-2xs cursor-pointer"
                      title="Editar cadastro deste paciente"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Editar</span>
                    </button>

                    {/* Botão Excluir */}
                    <button
                      type="button"
                      onClick={(e) => handleDeletePatient(patient, e)}
                      className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-slate-200 hover:border-rose-200 shadow-2xs cursor-pointer"
                      title="Excluir paciente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Botão Iniciar / Abrir Ficha */}
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSelectPatient(patient); }}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <span>{userRole === 'reception' ? 'Abrir Ficha' : 'Iniciar'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>


                {/* Gaveta de Histórico de Exames Anteriores Expandida */}
                {isExpanded && (
                  <div className="px-6 pb-4 pt-2 bg-slate-50/80 border-t border-slate-200/60 space-y-2 animate-fadeIn">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-2">
                      <History className="w-4 h-4 text-blue-600" />
                      Histórico Completo de Atendimentos & Dioptrias de {patient.fullName}
                    </div>

                    <div className="space-y-2">
                      {patientEncounters.map((enc, idx) => (
                        <div 
                          key={enc.id} 
                          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">
                                Exame #{idx + 1} - {new Date(enc.date).toLocaleDateString('pt-BR')} às {new Date(enc.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                enc.status === 'completed' 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {enc.status === 'completed' ? 'Concluído' : 'Em Andamento'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Examinador: {enc.examinerName || 'Dr. Rudson Meirelles'}
                              </span>
                            </div>

                            {enc.subjectiveRefraction && (
                              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                                <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                                  <b>OD:</b> {formatDioptria(enc.subjectiveRefraction.od)}
                                </span>
                                <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                                  <b>OE:</b> {formatDioptria(enc.subjectiveRefraction.oe)}
                                </span>
                                {enc.subjectiveRefraction.addition && (
                                  <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-indigo-800 font-bold">
                                    Adição: +{enc.subjectiveRefraction.addition.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}

                            {enc.conduct && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200/70 mt-1">
                                <b>Conduta:</b> {enc.conduct}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap sm:flex-nowrap">
                            <button
                              type="button"
                              onClick={(e) => handleOpenReportModal(patient, enc, e)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="Visualizar e imprimir laudo clínico deste exame"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>Laudo Completo</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleQuickPrint(patient, enc, e)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="Imprimir receituário deste exame específico"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Receita</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleRegisterReturn(patient, enc, e)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-black text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="Iniciar nova consulta de retorno com base nesta consulta e dioptria"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                              <span>↩ Retorno</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onSelectPatient(patient)}
                              className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Abrir no Exame
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-12 text-center text-slate-400 text-sm">
              Nenhum paciente encontrado para os filtros selecionados.
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cadastro com Suporte Brasil / Paraguai e LGPD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 text-slate-900 border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-blue-600 font-bold">
                {editingPatient ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                <span>{editingPatient ? 'EDITAR DADOS DO PACIENTE' : 'NOVO CADASTRO DE PACIENTE'}</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePatient} className="space-y-4">
              {/* Seletor de Nacionalidade BR / PY */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">NACIONALIDADE DO PACIENTE:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleNationalityChange('BR')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      nationality === 'BR'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>🇧🇷 Paciente Brasileiro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNationalityChange('PY')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      nationality === 'PY'
                        ? 'bg-red-50 border-red-500 text-red-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>🇵🇾 Paciente Paraguaio</span>
                  </button>
                </div>
              </div>

              {/* Nome Completo */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">NOME COMPLETO *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome completo do paciente"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              {/* Documento e Tipo */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">TIPO DOC.</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 font-semibold"
                  >
                    {nationality === 'BR' ? (
                      <>
                        <option value="CPF">CPF (Brasil)</option>
                        <option value="RG">RG (Brasil)</option>
                        <option value="passport">Passaporte</option>
                      </>
                    ) : (
                      <>
                        <option value="CI_PY">C.I. (Cédula PY)</option>
                        <option value="RUC">RUC (Paraguai)</option>
                        <option value="passport">Passaporte</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">NÚMERO DO DOCUMENTO</label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder={nationality === 'PY' ? 'Ex: 4.567.890' : 'Ex: 123.456.789-00'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Nascimento, Sexo e Telefone */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 block">DATA NASC.</label>
                    {birthDate && calculateAge(birthDate) && (
                      <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                        🎂 {calculateAge(birthDate)?.formatted}
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">SEXO</label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-900 font-semibold"
                  >
                    <option value="uninformed">Não informado</option>
                    <option value="F">Feminino</option>
                    <option value="M">Masculino</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">TELEFONE / WHATSAPP</label>
                  <div className="flex gap-1">
                    <span className="bg-slate-200 px-2 py-2 rounded-xl text-xs font-mono font-bold text-slate-700 flex items-center">
                      {phoneCountryCode}
                    </span>
                    <input
                      type="tel"
                      placeholder={nationality === 'PY' ? '981 123456' : '(45) 99999-9999'}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Cidade e Endereço */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">CIDADE</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Ponta Porã / Pedro Juan Caballero"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">RESPONSÁVEL (SE MENOR)</label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="Pai / Mãe / Tutor"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Observações / Queixa Inicial na Recepção */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">OBSERVAÇÕES DA RECEPÇÃO / MOTIVO DA CONSULTA</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Queixa relatada na recepção, encaminhamento..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Consentimento LGPD */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="lgpd"
                  checked={lgpdConsent}
                  onChange={(e) => setLgpdConsent(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="lgpd" className="text-[11px] text-slate-700 leading-snug cursor-pointer">
                  <strong className="text-blue-900">Termo de Consentimento & LGPD:</strong> O paciente/responsável autoriza o armazenamento dos dados clínicos para fins exclusivos de avaliação visual e emissão de prescrição óptica.
                </label>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-transform"
                >
                  {editingPatient ? 'Salvar Alterações' : 'Salvar Cadastro e Abrir Ficha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Unificado de Impressão Direta de Receituários */}
      <UnifiedPrintCenterModal
        isOpen={isPrintModalOpen}
        initialMode="dioptria"
        prescription={printPrescription}
        patient={printPatient}
        therapeuticPlan={printTherapeuticPlan}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintPatient(null);
          setPrintPrescription(null);
          setPrintTherapeuticPlan(undefined);
        }}
      />

      {/* Modal de Prontuário Clínico Completo com Histórico de Atendimentos */}
      <PatientMedicalRecordModal
        isOpen={isRecordModalOpen}
        patient={recordPatient}
        encounters={encounters.filter(e => e.patientId === recordPatient?.id)}
        clinicId={effectiveClinicId}
        onClose={() => {
          setIsRecordModalOpen(false);
          setRecordPatient(null);
        }}
        onSelectEncounterForReport={(enc) => {
          if (recordPatient) {
            handleOpenReportModal(recordPatient, enc);
          }
        }}
        onStartReturn={(pat, prevEnc) => {
          handleRegisterReturn(pat, prevEnc);
        }}
      />

      {/* Modal de Relatório / Laudo Clínico Formatado para Impressão */}
      <ClinicalReportModal
        isOpen={isReportModalOpen}
        patient={reportPatient}
        encounter={reportEncounter}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportPatient(null);
          setReportEncounter(null);
        }}
      />

      {/* Modal de Check-In Profissional da Recepção */}
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => {
          setIsCheckInModalOpen(false);
          setCheckInPatient(null);
        }}
        patient={checkInPatient}
        onSuccess={() => {
          // Atualiza lista se necessário
        }}
      />
    </div>
  );
};
