import React, { useState, useEffect, useRef } from 'react';
import { 
  Patient, 
  ClinicalEncounter, 
  SubjectiveRefraction, 
  Prescription,
  EyeTested,
  calculateAge
} from '@optotipo/shared';
import { 
  User, 
  FileText, 
  CheckCircle2, 
  Save, 
  Printer, 
  Glasses, 
  ShieldCheck, 
  Grid, 
  BookOpen, 
  Compass,
  ArrowLeft,
  Calendar,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  Layers,
  Award,
  Cake,
  Edit3,
  X,
  Globe,
  Pill,
  Tv,
  Maximize2,
  Minimize2,
  HeartPulse,
  Columns,
  Activity,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  Eye,
  Sliders
} from 'lucide-react';
import { RemoteControlPanel } from '../components/RemoteControlPanel';
import { RefractionDials } from '../components/RefractionDials';
import { PrescriptionModal } from '../components/PrescriptionModal';
import { MedicalPrescriptionModal } from '../components/MedicalPrescriptionModal';
import { UnifiedPrintCenterModal } from '../components/UnifiedPrintCenterModal';
import { ClinicalReportModal } from '../components/ClinicalReportModal';
import { TherapeuticGuideModal } from '../components/TherapeuticGuideModal';
import { TherapeuticPlanModal } from '../components/TherapeuticPlanModal';
import { offlineDb, generateUUID } from '../services/offlineDb';
import { OphthalmicDrug } from '../services/ophthalmicDrugsDb';
import { TherapeuticProtocol, ClinicalProtocolDrug } from '../services/therapeuticProtocolsDb';
import { NationalityType, DocumentType } from '@optotipo/shared';

interface ExaminationWorkspaceProps {
  patient: Patient;
  encounter?: ClinicalEncounter;
  onBack: () => void;
  onPatientUpdated?: (patient: Patient) => void;
}

interface TrailStep {
  id: number;
  label: string;
  tabKey: 'anamnesis' | 'av_sc' | 'lensometry' | 'autorefraction' | 'refraction' | 'binocular' | 'conduct';
}

const EXAM_TRAIL: TrailStep[] = [
  { id: 1, label: '1. Anamnese', tabKey: 'anamnesis' },
  { id: 2, label: '2. AVsc Longe/Perto', tabKey: 'av_sc' },
  { id: 3, label: '3. Óculos Atual', tabKey: 'lensometry' },
  { id: 4, label: '4. Autorefração', tabKey: 'autorefraction' },
  { id: 5, label: '5. Refração', tabKey: 'refraction' },
  { id: 6, label: '6. Binocular', tabKey: 'binocular' },
  { id: 7, label: '7. Conduta & Rx', tabKey: 'conduct' },
];

export const ExaminationWorkspace: React.FC<ExaminationWorkspaceProps> = ({
  patient: initialPatient,
  encounter: initialEncounter,
  onBack,
  onPatientUpdated
}) => {
  const [patient, setPatient] = useState<Patient>(initialPatient);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<TrailStep['tabKey']>('anamnesis');

  // Estado para Modo do Controle Remoto (Inicia MINIMIZADO como Widget Flutuante para dar espaço total à tela do exame)
  const [remoteMode, setRemoteMode] = useState<'sidebar' | 'floating'>('floating');
  const [isFloatingRemoteOpen, setIsFloatingRemoteOpen] = useState<boolean>(false);

  // Estado para Edição dos Dados Cadastrais do Paciente
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>(patient.fullName);
  const [editBirthDate, setEditBirthDate] = useState<string>(patient.birthDate || '');
  const [editSex, setEditSex] = useState<Patient['sex']>(patient.sex || 'uninformed');
  const [editNationality, setEditNationality] = useState<NationalityType>(patient.nationality || 'BR');
  const [editDocumentType, setEditDocumentType] = useState<DocumentType>(patient.documentType || 'CPF');
  const [editDocumentNumber, setEditDocumentNumber] = useState<string>(patient.documentNumber || '');
  const [editPhoneCountryCode, setEditPhoneCountryCode] = useState<string>(patient.phoneCountryCode || '+55');
  const [editPhone, setEditPhone] = useState<string>(patient.phone ? patient.phone.replace(/^\+\d+\s*/, '') : '');
  const [editCity, setEditCity] = useState<string>(patient.city || 'Foz do Iguaçu');
  const [editAddress, setEditAddress] = useState<string>(patient.address || '');
  const [editGuardianName, setEditGuardianName] = useState<string>(patient.guardianName || '');
  const [editNotes, setEditNotes] = useState<string>(patient.notes || '');

  const openEditModal = () => {
    setEditFullName(patient.fullName);
    setEditBirthDate(patient.birthDate || '');
    setEditSex(patient.sex || 'uninformed');
    setEditNationality(patient.nationality || 'BR');
    setEditDocumentType(patient.documentType || (patient.nationality === 'PY' ? 'CI_PY' : 'CPF'));
    setEditDocumentNumber(patient.documentNumber || '');
    setEditPhoneCountryCode(patient.phoneCountryCode || (patient.nationality === 'PY' ? '+595' : '+55'));
    setEditPhone(patient.phone ? patient.phone.replace(/^\+\d+\s*/, '') : '');
    setEditCity(patient.city || (patient.nationality === 'PY' ? 'Ciudad del Este' : 'Foz do Iguaçu'));
    setEditAddress(patient.address || '');
    setEditGuardianName(patient.guardianName || '');
    setEditNotes(patient.notes || '');
    setIsEditPatientModalOpen(true);
  };

  const handleEditNationalityChange = (nat: NationalityType) => {
    setEditNationality(nat);
    if (nat === 'PY') {
      setEditDocumentType('CI_PY');
      setEditPhoneCountryCode('+595');
      if (!editCity || editCity === 'Foz do Iguaçu') setEditCity('Ciudad del Este');
    } else {
      setEditDocumentType('CPF');
      setEditPhoneCountryCode('+55');
      if (!editCity || editCity === 'Ciudad del Este') setEditCity('Foz do Iguaçu');
    }
  };

  const handleSavePatientData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) return;

    const updatedPatient: Patient = {
      ...patient,
      fullName: editFullName.trim(),
      birthDate: editBirthDate,
      sex: editSex,
      nationality: editNationality,
      documentType: editDocumentType,
      documentNumber: editDocumentNumber.trim() || undefined,
      phoneCountryCode: editPhoneCountryCode,
      phone: editPhone.trim() ? `${editPhoneCountryCode} ${editPhone.trim()}` : undefined,
      city: editCity.trim() || undefined,
      country: editNationality === 'PY' ? 'Paraguai' : 'Brasil',
      address: editAddress.trim() || undefined,
      guardianName: editGuardianName.trim() || undefined,
      notes: editNotes.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    offlineDb.savePatient(updatedPatient);
    setPatient(updatedPatient);
    if (onPatientUpdated) {
      onPatientUpdated(updatedPatient);
    }
    setIsEditPatientModalOpen(false);
    setSaveMessage('Cadastro do paciente atualizado!');
    setTimeout(() => setSaveMessage(null), 2500);
  };

  // Estado do Atendimento Atual com Auto-recuperação de dados existentes
  const [currentEncounter, setCurrentEncounter] = useState<ClinicalEncounter>(() => {
    if (initialEncounter) return initialEncounter;
    
    // Procura se o paciente já tem atendimento registrado no banco de dados
    const existingEncounters = offlineDb.getEncounters().filter(e => e.patientId === patient.id);
    if (existingEncounters.length > 0) {
      // Ordena pelo mais recente
      const sorted = [...existingEncounters].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return sorted[0];
    }

    return {
      id: generateUUID(),
      patientId: patient.id,
      date: new Date().toISOString(),
      status: 'in_progress',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles (CRM/CROO 123456)',
      syncStatus: 'synced',
      updatedAt: new Date().toISOString(),
      anamnesis: {
        id: generateUUID(),
        encounterId: '',
        chiefComplaint: patient.notes || '',
        currentGlasses: false,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false,
        medicationsInUse: '',
        pathologicalHistory: '',
        allergies: '',
        ocularHistory: ''
      },
      lensometry: {
        id: generateUUID(),
        encounterId: '',
        od: { sphere: undefined as any, cylinder: undefined as any, axis: undefined as any },
        oe: { sphere: undefined as any, cylinder: undefined as any, axis: undefined as any },
        addition: undefined,
        pdDistanceMm: undefined,
        lensType: 'multifocal',
        material: 'resina',
        treatments: ['Antirreflexo']
      },
      visualAcuity: {
        id: generateUUID(),
        encounterId: '',
        testedAt: new Date().toISOString(),
        entries: [
          { eye: 'OD', optotypeType: 'snellen_letters', distanceMeters: 6, uncorrected: '20/' },
          { eye: 'OE', optotypeType: 'snellen_letters', distanceMeters: 6, uncorrected: '20/' }
        ]
      },
      subjectiveRefraction: {
        id: generateUUID(),
        encounterId: '',
        od: { sphere: undefined as any, cylinder: undefined as any, axis: undefined as any, visualAcuity: '20/' },
        oe: { sphere: undefined as any, cylinder: undefined as any, axis: undefined as any, visualAcuity: '20/' },
        pdDistanceMm: undefined
      }
    };
  });

  // Salva no banco de dados offline toda vez que o atendimento for alterado
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      // Salva o atendimento inicial garantindo persistência imediata
      offlineDb.saveEncounter(currentEncounter);
      return;
    }

    const timer = setTimeout(() => {
      offlineDb.saveEncounter(currentEncounter);
    }, 400);

    return () => clearTimeout(timer);
  }, [currentEncounter]);

  // Formatação segura de valores numéricos de dioptria
  const formatDiopterStr = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return '';
    if (val === 0) return '0.00';
    return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
  };

  // Estados locais em string para digitação fluida da Dioptria de Uso (Óculos Atual)
  const [lensOdSph, setLensOdSph] = useState<string>(() => formatDiopterStr(currentEncounter.lensometry?.od?.sphere));
  const [lensOdCyl, setLensOdCyl] = useState<string>(() => formatDiopterStr(currentEncounter.lensometry?.od?.cylinder));
  const [lensOdAxis, setLensOdAxis] = useState<string>(() => currentEncounter.lensometry?.od?.axis !== undefined ? String(currentEncounter.lensometry.od.axis) : '');
  
  const [lensOeSph, setLensOeSph] = useState<string>(() => formatDiopterStr(currentEncounter.lensometry?.oe?.sphere));
  const [lensOeCyl, setLensOeCyl] = useState<string>(() => formatDiopterStr(currentEncounter.lensometry?.oe?.cylinder));
  const [lensOeAxis, setLensOeAxis] = useState<string>(() => currentEncounter.lensometry?.oe?.axis !== undefined ? String(currentEncounter.lensometry.oe.axis) : '');
  const [lensAddition, setLensAddition] = useState<string>(() => formatDiopterStr(currentEncounter.lensometry?.addition));

  // Sincroniza os estados locais se o encounter mudar externamente
  useEffect(() => {
    if (currentEncounter.lensometry) {
      setLensOdSph(formatDiopterStr(currentEncounter.lensometry.od?.sphere));
      setLensOdCyl(formatDiopterStr(currentEncounter.lensometry.od?.cylinder));
      setLensOdAxis(currentEncounter.lensometry.od?.axis !== undefined ? String(currentEncounter.lensometry.od.axis) : '');
      setLensOeSph(formatDiopterStr(currentEncounter.lensometry.oe?.sphere));
      setLensOeCyl(formatDiopterStr(currentEncounter.lensometry.oe?.cylinder));
      setLensOeAxis(currentEncounter.lensometry.oe?.axis !== undefined ? String(currentEncounter.lensometry.oe.axis) : '');
      setLensAddition(formatDiopterStr(currentEncounter.lensometry.addition));
    }
  }, [currentEncounter.id]);

  const parseInputDiopter = (str: string): number | undefined => {
    if (!str || str.trim() === '' || str === '+' || str === '-') return undefined;
    const cleaned = str.replace(',', '.').trim();
    const num = parseFloat(cleaned);
    if (isNaN(num)) return undefined;
    return Math.round(num * 100) / 100;
  };

  const parseInputAxis = (str: string): number | undefined => {
    if (!str || str.trim() === '') return undefined;
    const num = parseInt(str.trim());
    if (isNaN(num)) return undefined;
    let axis = ((num % 180) + 180) % 180;
    return axis === 0 ? 180 : axis;
  };

  // Estados dos Modais
  const [isRxModalOpen, setIsRxModalOpen] = useState<boolean>(false);
  const [isMedicalRxModalOpen, setIsMedicalRxModalOpen] = useState<boolean>(false);
  const [isUnifiedPrintModalOpen, setIsUnifiedPrintModalOpen] = useState<boolean>(false);
  const [unifiedPrintMode, setUnifiedPrintMode] = useState<'dioptria' | 'farmaco' | 'dual'>('dual');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isTherapeuticGuideOpen, setIsTherapeuticGuideOpen] = useState<boolean>(false);
  const [isTherapeuticPlanModalOpen, setIsTherapeuticPlanModalOpen] = useState<boolean>(false);
  const [activePrescription, setActivePrescription] = useState<Prescription | null>(null);
  const [pendingPrescriptionDrugs, setPendingPrescriptionDrugs] = useState<ClinicalProtocolDrug[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const patientAge = calculateAge(patient.birthDate);

  const handleStepClick = (step: TrailStep) => {
    setCurrentStep(step.id);
    setActiveTab(step.tabKey);
  };

  const handleAcuityRecorded = (eye: EyeTested, acuitySnellen: string, correct: boolean) => {
    if (!correct) return;
    const ref = currentEncounter.subjectiveRefraction || {
      id: generateUUID(),
      encounterId: currentEncounter.id,
      od: { sphere: 0, cylinder: 0, axis: 180 },
      oe: { sphere: 0, cylinder: 0, axis: 180 }
    };

    if (eye === 'OD') {
      ref.od.visualAcuity = acuitySnellen;
    } else if (eye === 'OE') {
      ref.oe.visualAcuity = acuitySnellen;
    }

    const updated = {
      ...currentEncounter,
      subjectiveRefraction: ref
    };
    setCurrentEncounter(updated);
    offlineDb.saveEncounter(updated);
  };

  const handleSaveEncounter = (status: 'in_progress' | 'completed' = 'in_progress') => {
    const updated: ClinicalEncounter = {
      ...currentEncounter,
      status,
      updatedAt: new Date().toISOString()
    };
    offlineDb.saveEncounter(updated);
    setCurrentEncounter(updated);

    // Se o atendimento for CONCLUÍDO na clínica IVS (ou padrão), gera automaticamente o lançamento financeiro de R$ 50,00 da consulta
    if (status === 'completed') {
      const activeClinicId = offlineDb.getActiveClinicId();
      const existingTxs = offlineDb.getTransactions(activeClinicId);
      const alreadyLogged = existingTxs.some(t => t.encounterId === updated.id);

      if (!alreadyLogged) {
        const isIvs = activeClinicId === 'ivs';
        const consultAmount = isIvs ? 50.00 : 150.00;

        const autoTx = {
          id: generateUUID(),
          clinicId: activeClinicId,
          type: 'income' as const,
          category: 'consulta' as const,
          description: `Consulta Oftalmológica / Refração - Paciente: ${patient.fullName}`,
          amount: consultAmount,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash' as const,
          patientId: patient.id,
          patientName: patient.fullName,
          encounterId: updated.id,
          status: 'completed' as const,
          createdBy: updated.examinerName || 'Dr. Rudson Meirelles',
          createdAt: new Date().toISOString()
        };

        offlineDb.saveTransaction(autoTx, activeClinicId);
      }
    }


    setSaveMessage(status === 'completed' ? 'Atendimento concluído e R$ 50,00 lançado no Financeiro!' : 'Progresso salvo!');
    setTimeout(() => setSaveMessage(null), 2500);
  };


  // Prepara Objeto de Prescrição Óptica
  const prepareOpticalPrescription = (): Prescription => {
    const ref = currentEncounter.subjectiveRefraction;
    const specialLensesText = ref?.specialLenses?.trim() ? ` [Lentes Especiais: ${ref.specialLenses.trim()}]` : '';
    const observationsText = `${currentEncounter.conduct || 'Adaptação progressiva.'}${specialLensesText}`;

    const newRx: Prescription = {
      id: generateUUID(),
      encounterId: currentEncounter.id,
      patientId: patient.id,
      patientName: patient.fullName,
      date: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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
      lensType: (ref?.lensType as any) || (ref?.addition ? 'multifocal' : 'monofocal'),
      material: (ref?.material as any) || 'resina',
      treatments: ref?.treatments && ref.treatments.length > 0 ? ref.treatments : ['Antirreflexo Digital', 'Filtro Luz Azul (BlueCut)'],
      returnInstructions: currentEncounter.returnInstructions || (patient.nationality === 'PY' ? 'Control en 1 año para evaluación visual de rutina.' : 'Retorno em 1 ano para controle visual de rotina.'),
      observations: observationsText
    };
    offlineDb.savePrescription(newRx);
    setActivePrescription(newRx);
    return newRx;
  };

  // Abertura da Central de Impressão Bilíngue (A4 Paisagem 2 em 1 / Individual)
  const handleOpenPrintCenter = (mode: 'dual' | 'dioptria' | 'farmaco' = 'dual') => {
    handleSaveEncounter('in_progress');
    prepareOpticalPrescription();
    setUnifiedPrintMode(mode);
    setIsUnifiedPrintModalOpen(true);
  };

  // Inserção automática de fármaco na conduta clínica
  const handleApplyDrugToEncounter = (drug: OphthalmicDrug, dosage?: string) => {
    const drugText = `\n• ${drug.commercialName} (${drug.activePrinciple}, ${drug.presentation}): ${dosage || drug.defaultPosology}`;
    const currentConduct = currentEncounter.conduct || '';
    const updatedConduct = currentConduct.trim() 
      ? `${currentConduct.trim()}\n${drugText}`
      : `PRESCRIÇÃO & PLANO TERAPÊUTICO:${drugText}`;
    
    setCurrentEncounter({
      ...currentEncounter,
      conduct: updatedConduct
    });
    setSaveMessage(`Fármaco "${drug.commercialName}" adicionado à conduta!`);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Aplicação do Plano Terapêutico Completo por Quadro Clínico
  const handleApplyTherapeuticPlan = (protocol: TherapeuticProtocol) => {
    const nonPharmText = protocol.nonPharmacologicalActions.map(a => `• ${a}`).join('\n');
    const drugsText = protocol.suggestedDrugs.map(d => `• ${d.commercialName} (${d.activePrinciple}, ${d.presentation}): ${d.dosage}`).join('\n');
    
    const isPY = patient.nationality === 'PY';
    const titlePrefix = isPY ? 'CUADRO CLÍNICO / DIAGNÓSTICO' : 'QUADRO CLÍNICO / DIAGNÓSTICO';
    const nonPharmPrefix = isPY ? '1. CONDUCTA NO FARMACOLÓGICA Y MEDIDAS GENERALES' : '1. CONDUTA NÃO FARMACOLÓGICA & HIGIENE';
    const drugsPrefix = isPY ? '2. PRESCRIPCIÓN FARMACOLÓGICA' : '2. PRESCRIÇÃO FARMACOLÓGICA';
    const guidancePrefix = isPY ? '3. INDICACIONES AL PACIENTE' : '3. ORIENTAÇÕES AO PACIENTE';

    const fullPlanText = `${titlePrefix}: ${protocol.clinicalCondition}\n\n${nonPharmPrefix}:\n${nonPharmText}\n\n${drugsPrefix}:\n${drugsText}\n\n${guidancePrefix}:\n${protocol.patientGuidance}`;

    setCurrentEncounter({
      ...currentEncounter,
      conduct: fullPlanText,
      returnInstructions: protocol.recommendedReturn
    });

    setPendingPrescriptionDrugs(protocol.suggestedDrugs);
    setSaveMessage(`Plano para "${protocol.clinicalCondition}" aplicado com sucesso!`);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-800 overflow-hidden font-sans">
      
      {/* 1. Cabeçalho Principal do Atendimento */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between shadow-sm shrink-0 gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="h-6 w-px bg-slate-200" />

          {/* Identificação do Paciente */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm">
              {patient.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm tracking-tight">{patient.fullName}</span>
                
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-600 flex items-center gap-1">
                  <span>{patient.nationality === 'PY' ? '🇵🇾 PY' : '🇧🇷 BR'}</span>
                </span>

                <button
                  onClick={openEditModal}
                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                  title="Editar dados cadastrais do paciente"
                >
                  <Edit3 className="w-3 h-3" /> Editar
                </button>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                {patient.birthDate && (
                  <span>Nasc: <b>{new Date(patient.birthDate).toLocaleDateString(patient.nationality === 'PY' ? 'es-PY' : 'pt-BR')}</b></span>
                )}
                {patient.phone && <span>Tel: {patient.phone}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback de salvamento e Botões de Ação */}
        <div className="flex items-center gap-2 flex-wrap">
          {saveMessage && (
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full animate-bounce">
              {saveMessage}
            </span>
          )}

          {/* Grupo de Botões de Impressão Direta por Ícone */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleOpenPrintCenter('dual')}
              className="px-2.5 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Central de Impressão Completa (Dioptria + Fármaco)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={() => handleOpenPrintCenter('dioptria')}
              className="px-2 py-1.5 hover:bg-white text-slate-700 hover:text-blue-600 font-bold text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              title="Imprimir Apenas Receita de Dioptria (Óculos / Lentes)"
            >
              <Glasses className="w-3.5 h-3.5 text-blue-600" />
              <span>Só Dioptria</span>
            </button>

            <button
              onClick={() => handleOpenPrintCenter('farmaco')}
              className="px-2 py-1.5 hover:bg-white text-slate-700 hover:text-purple-600 font-bold text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              title="Imprimir Apenas Receita de Fármacos (Medicamentos / Colírios)"
            >
              <Pill className="w-3.5 h-3.5 text-purple-600" />
              <span>Só Fármaco</span>
            </button>
          </div>

          {/* Botão: Traçar Plano Terapêutico */}
          <button
            onClick={() => setIsTherapeuticPlanModalOpen(true)}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Traçar plano terapêutico autônomo baseado no quadro clínico"
          >
            <Compass className="w-4 h-4 text-blue-600" />
            <span>Plano Terapêutico</span>
          </button>

          {/* Relatório Clínico */}
          <button
            onClick={() => {
              handleSaveEncounter('in_progress');
              setIsReportModalOpen(true);
            }}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-indigo-600" /> 
            <span className="hidden sm:inline">Relatório</span>
          </button>

          {/* Concluir Atendimento */}
          <button
            onClick={() => handleSaveEncounter('completed')}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-transform cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> 
            <span>Concluir</span>
          </button>
        </div>
      </header>

      {/* 2. Trilha de Exame Clínico Guiada (Stepper) */}
      <div className="bg-slate-900 text-slate-100 px-6 py-2.5 flex items-center justify-between border-b border-slate-800 overflow-x-auto shadow-inner">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider mr-2 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> TRILHA DE EXAME:
          </span>

          <div className="flex items-center gap-1.5">
            {EXAM_TRAIL.map((step) => {
              const isActive = activeTab === step.tabKey;
              const isPast = step.id < currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105'
                      : isPast
                      ? 'bg-slate-800 text-emerald-400 hover:bg-slate-750'
                      : 'bg-slate-850 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Alternador de Modo do Controle Remoto */}
        <div className="hidden md:flex items-center gap-2">
          {remoteMode === 'sidebar' ? (
            <button
              onClick={() => {
                setRemoteMode('floating');
                setIsFloatingRemoteOpen(true);
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              title="Libera espaço na tela transformando o controle em widget flutuante suspenso"
            >
              <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Flutuar Controle (Mais Espaço)</span>
            </button>
          ) : (
            <button
              onClick={() => setRemoteMode('sidebar')}
              className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-blue-500/40 cursor-pointer"
              title="Fixa o controle remoto na barra lateral direita"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fixar Controle Lateral</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Área Central do Exame */}
      <div className="flex-1 w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto">
        
        {/* Coluna Esquerda: Detalhes Clínicos da Etapa Ativa */}
        <div className={remoteMode === 'sidebar' ? "lg:col-span-5 flex flex-col gap-4" : "lg:col-span-6 flex flex-col gap-4"}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {EXAM_TRAIL.find(t => t.tabKey === activeTab)?.label}
              </h2>
            </div>

            <div className="flex-1 space-y-4 text-xs">
              {/* Etapa 1: Anamnese & Histórico Clínico */}
              {activeTab === 'anamnesis' && (
                <div className="space-y-4">
                  {patientAge && (
                    <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                          {patientAge.years}a
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 text-xs uppercase tracking-wide">
                              Idade do Paciente:
                            </span>
                            <span className="font-extrabold text-blue-700 text-sm">
                              {patientAge.formatted}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Nascimento: <b>{new Date(patient.birthDate!).toLocaleDateString(patient.nationality === 'PY' ? 'es-PY' : 'pt-BR')}</b> &bull; Sexo: <b>{patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Feminino' : 'Não informado'}</b>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={openEditModal}
                          className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-blue-300 text-blue-700 font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Editar Cadastro
                        </button>
                      </div>
                    </div>
                  )}

                  {/* QUEIXA PRINCIPAL */}
                  <div>
                    <label className="font-bold text-slate-800 block mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>QUEIXA PRINCIPAL & MOTIVO DA CONSULTA:</span>
                    </label>
                    <textarea
                      rows={2}
                      value={currentEncounter.anamnesis?.chiefComplaint || ''}
                      onChange={(e) => setCurrentEncounter({
                        ...currentEncounter,
                        anamnesis: { ...currentEncounter.anamnesis!, chiefComplaint: e.target.value }
                      })}
                      placeholder="Ex: Dificuldade para leitura de perto, cefaleia frontal após uso de telas, sensação de areia nos olhos..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  {/* MEDICAMENTOS EM USO CONTÍNUO */}
                  <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-2">
                    <label className="font-black text-blue-950 block text-xs uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-blue-600" />
                        MEDICAMENTOS QUE O PACIENTE FAZ USO (CONTÍNUO / OCULAR):
                      </span>
                      <span className="text-[10px] text-blue-700 font-normal">Colírios, anti-hipertensivos, hipoglicemiantes...</span>
                    </label>
                    <textarea
                      rows={2}
                      value={currentEncounter.anamnesis?.medicationsInUse || ''}
                      onChange={(e) => setCurrentEncounter({
                        ...currentEncounter,
                        anamnesis: { ...currentEncounter.anamnesis!, medicationsInUse: e.target.value }
                      })}
                      placeholder="Ex: Losartana 50mg (1x/dia), Metformina 850mg, Colírio Lubrificante Systane UL 3x/dia, Glaucoma: Timolol..."
                      className="w-full bg-white border border-blue-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium shadow-xs"
                    />
                    
                    {/* Chips Rápidos de Medicamentos Comuns */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-500 font-bold self-center mr-1">Inserir rápido:</span>
                      {[
                        'Nega uso de medicamentos',
                        'Losartana 50mg',
                        'Enalapril 20mg',
                        'Metformina 850mg',
                        'Gliclazida 60mg',
                        'Colírio Lubrificante',
                        'Colírio Timolol 0.5%',
                        'Colírio Travoprosta',
                        'Levotiroxina Sódica'
                      ].map((med) => (
                        <button
                          key={med}
                          type="button"
                          onClick={() => {
                            const cur = currentEncounter.anamnesis?.medicationsInUse || '';
                            const updated = cur.trim() ? `${cur.trim()}, ${med}` : med;
                            setCurrentEncounter({
                              ...currentEncounter,
                              anamnesis: { ...currentEncounter.anamnesis!, medicationsInUse: updated }
                            });
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-bold text-blue-800 transition-colors cursor-pointer"
                        >
                          + {med}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* HISTÓRICO PATOLÓGICO PREGRESSO & OCULAR */}
                  <div className="p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-200/80 space-y-2">
                    <label className="font-black text-indigo-950 block text-xs uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-600" />
                        HISTÓRICO PATOLÓGICO PREGRESSO (SISTÊMICO & OCULAR):
                      </span>
                      <span className="text-[10px] text-indigo-700 font-normal">Patologias, cirurgias prévias e antecedentes</span>
                    </label>
                    <textarea
                      rows={2}
                      value={currentEncounter.anamnesis?.pathologicalHistory || ''}
                      onChange={(e) => setCurrentEncounter({
                        ...currentEncounter,
                        anamnesis: { ...currentEncounter.anamnesis!, pathologicalHistory: e.target.value }
                      })}
                      placeholder="Ex: Cirurgia refrativa PRK há 10 anos, facectomia com implante de LIO em OD (2022), histórico familiar de glaucoma paterno..."
                      className="w-full bg-white border border-indigo-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-medium shadow-xs"
                    />

                    {/* Chips Rápidos de Patologias */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-500 font-bold self-center mr-1">Inserir rápido:</span>
                      {[
                        'Nega antecedentes patológicos',
                        'Histórico familiar de Glaucoma',
                        'Catarata Senil inicial',
                        'Cirurgia de Pterígio prévia',
                        'Cirurgia de Catarata (Facectomia)',
                        'Cirurgia Refrativa LASIK/PRK',
                        'Olho Seco / Blefarite',
                        'Ceratocone',
                        'Retinopatia Diabética',
                        'Alergia Ocular / Rinite'
                      ].map((pat) => (
                        <button
                          key={pat}
                          type="button"
                          onClick={() => {
                            const cur = currentEncounter.anamnesis?.pathologicalHistory || '';
                            const updated = cur.trim() ? `${cur.trim()}, ${pat}` : pat;
                            setCurrentEncounter({
                              ...currentEncounter,
                              anamnesis: { ...currentEncounter.anamnesis!, pathologicalHistory: updated }
                            });
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-lg text-[10px] font-bold text-indigo-800 transition-colors cursor-pointer"
                        >
                          + {pat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PARÂMETROS VITAIS & CHECKBOXES SISTÊMICOS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* USO ATUAL */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wide">USO ATUAL DE CORREÇÃO:</span>
                      <label className="flex items-center gap-2 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentEncounter.anamnesis?.currentGlasses || false}
                          onChange={(e) => setCurrentEncounter({
                            ...currentEncounter,
                            anamnesis: { ...currentEncounter.anamnesis!, currentGlasses: e.target.checked }
                          })}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Usa óculos atualmente</span>
                      </label>
                      <label className="flex items-center gap-2 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentEncounter.anamnesis?.contactLenses || false}
                          onChange={(e) => setCurrentEncounter({
                            ...currentEncounter,
                            anamnesis: { ...currentEncounter.anamnesis!, contactLenses: e.target.checked }
                          })}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Usa lentes de contato</span>
                      </label>
                    </div>

                    {/* ANTECEDENTES SISTÊMICOS & PRESSÃO */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wide">CONDIÇÕES SISTÊMICAS:</span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentEncounter.anamnesis?.hasHypertension || false}
                            onChange={(e) => setCurrentEncounter({
                              ...currentEncounter,
                              anamnesis: { ...currentEncounter.anamnesis!, hasHypertension: e.target.checked }
                            })}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>HAS</span>
                        </label>
                        <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentEncounter.anamnesis?.hasDiabetes || false}
                            onChange={(e) => setCurrentEncounter({
                              ...currentEncounter,
                              anamnesis: { ...currentEncounter.anamnesis!, hasDiabetes: e.target.checked }
                            })}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>Diabetes</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">PA (mmHg):</label>
                          <input
                            type="text"
                            placeholder="120/80"
                            value={currentEncounter.anamnesis?.bloodPressure || ''}
                            onChange={(e) => setCurrentEncounter({
                              ...currentEncounter,
                              anamnesis: { ...currentEncounter.anamnesis!, bloodPressure: e.target.value }
                            })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Glicemia (mg/dL):</label>
                          <input
                            type="text"
                            placeholder="98"
                            value={currentEncounter.anamnesis?.bloodGlucoseMgDl || ''}
                            onChange={(e) => setCurrentEncounter({
                              ...currentEncounter,
                              anamnesis: { ...currentEncounter.anamnesis!, bloodGlucoseMgDl: e.target.value }
                            })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 2: AVsc (Longe & Perto com prefixo 20/ automático) */}
              {activeTab === 'av_sc' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-blue-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-blue-600" />
                        AGUDEZA VISUAL SEM CORREÇÃO (AVsc):
                      </h3>
                      <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md">
                        20/ fixado automaticamente
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* OD (Longe) */}
                      <div className="p-3 bg-white rounded-xl border border-emerald-300 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            OD (Olho Direito - Longe)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-slate-50 border-2 border-emerald-400 rounded-xl px-2 py-1.5 w-full focus-within:ring-2 focus-within:ring-emerald-500 shadow-inner">
                            <span className="text-sm font-mono font-black text-emerald-800 select-none mr-1">20/</span>
                            <input
                              type="text"
                              placeholder="40"
                              value={(() => {
                                const val = currentEncounter.visualAcuity?.entries?.find(e => e.eye === 'OD')?.uncorrected || '';
                                return val.startsWith('20/') ? val.replace(/^20\//, '') : val;
                              })()}
                              onChange={(e) => {
                                let num = e.target.value.trim();
                                if (num.startsWith('20/')) num = num.replace(/^20\//, '');
                                const formatted = num ? `20/${num}` : '';
                                const existingEntries = currentEncounter.visualAcuity?.entries || [];
                                const otherEntries = existingEntries.filter(ent => ent.eye !== 'OD');
                                const odEntry = existingEntries.find(ent => ent.eye === 'OD') || {
                                  eye: 'OD' as const,
                                  optotypeType: 'snellen_letters',
                                  distanceMeters: 6
                                };
                                setCurrentEncounter({
                                  ...currentEncounter,
                                  visualAcuity: {
                                    id: currentEncounter.visualAcuity?.id || generateUUID(),
                                    encounterId: currentEncounter.id,
                                    testedAt: new Date().toISOString(),
                                    entries: [...otherEntries, { ...odEntry, uncorrected: formatted }]
                                  }
                                });
                              }}
                              className="w-full bg-transparent text-sm font-mono font-black text-slate-900 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Chips Rápidos de Snellen OD */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {['20', '25', '30', '40', '50', '60', '70', '100', '200'].map((sn) => (
                            <button
                              key={`od-${sn}`}
                              type="button"
                              onClick={() => {
                                const formatted = `20/${sn}`;
                                const existingEntries = currentEncounter.visualAcuity?.entries || [];
                                const otherEntries = existingEntries.filter(ent => ent.eye !== 'OD');
                                const odEntry = existingEntries.find(ent => ent.eye === 'OD') || {
                                  eye: 'OD' as const,
                                  optotypeType: 'snellen_letters',
                                  distanceMeters: 6
                                };
                                setCurrentEncounter({
                                  ...currentEncounter,
                                  visualAcuity: {
                                    id: currentEncounter.visualAcuity?.id || generateUUID(),
                                    encounterId: currentEncounter.id,
                                    testedAt: new Date().toISOString(),
                                    entries: [...otherEntries, { ...odEntry, uncorrected: formatted }]
                                  }
                                });
                              }}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-800 transition-colors"
                            >
                              20/{sn}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* OE (Longe) */}
                      <div className="p-3 bg-white rounded-xl border border-amber-300 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            OE (Olho Esquerdo - Longe)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-slate-50 border-2 border-amber-400 rounded-xl px-2 py-1.5 w-full focus-within:ring-2 focus-within:ring-amber-500 shadow-inner">
                            <span className="text-sm font-mono font-black text-amber-800 select-none mr-1">20/</span>
                            <input
                              type="text"
                              placeholder="50"
                              value={(() => {
                                const val = currentEncounter.visualAcuity?.entries?.find(e => e.eye === 'OE')?.uncorrected || '';
                                return val.startsWith('20/') ? val.replace(/^20\//, '') : val;
                              })()}
                              onChange={(e) => {
                                let num = e.target.value.trim();
                                if (num.startsWith('20/')) num = num.replace(/^20\//, '');
                                const formatted = num ? `20/${num}` : '';
                                const existingEntries = currentEncounter.visualAcuity?.entries || [];
                                const otherEntries = existingEntries.filter(ent => ent.eye !== 'OE');
                                const oeEntry = existingEntries.find(ent => ent.eye === 'OE') || {
                                  eye: 'OE' as const,
                                  optotypeType: 'snellen_letters',
                                  distanceMeters: 6
                                };
                                setCurrentEncounter({
                                  ...currentEncounter,
                                  visualAcuity: {
                                    id: currentEncounter.visualAcuity?.id || generateUUID(),
                                    encounterId: currentEncounter.id,
                                    testedAt: new Date().toISOString(),
                                    entries: [...otherEntries, { ...oeEntry, uncorrected: formatted }]
                                  }
                                });
                              }}
                              className="w-full bg-transparent text-sm font-mono font-black text-slate-900 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Chips Rápidos de Snellen OE */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {['20', '25', '30', '40', '50', '60', '70', '100', '200'].map((sn) => (
                            <button
                              key={`oe-${sn}`}
                              type="button"
                              onClick={() => {
                                const formatted = `20/${sn}`;
                                const existingEntries = currentEncounter.visualAcuity?.entries || [];
                                const otherEntries = existingEntries.filter(ent => ent.eye !== 'OE');
                                const oeEntry = existingEntries.find(ent => ent.eye === 'OE') || {
                                  eye: 'OE' as const,
                                  optotypeType: 'snellen_letters',
                                  distanceMeters: 6
                                };
                                setCurrentEncounter({
                                  ...currentEncounter,
                                  visualAcuity: {
                                    id: currentEncounter.visualAcuity?.id || generateUUID(),
                                    encounterId: currentEncounter.id,
                                    testedAt: new Date().toISOString(),
                                    entries: [...otherEntries, { ...oeEntry, uncorrected: formatted }]
                                  }
                                });
                              }}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-amber-100 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-800 transition-colors"
                            >
                              20/{sn}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 3: Óculos Atual / Dioptria de Uso (OD / OE: Esférico, Cilíndrico x Eixo, Adição, Tipo de Lente & Tratamentos) */}
              {activeTab === 'lensometry' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-black text-slate-900 text-xs flex items-center gap-1.5 uppercase">
                      <Glasses className="w-4 h-4 text-emerald-600" />
                      DIOPTRIA DE USO (ÓCULOS ATUAL DO PACIENTE)
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Campos estruturados para Esférico, Cilindro, Eixo e Adição
                    </span>
                  </div>

                  {/* Grid de Óculos Atual: OD e OE */}
                  <div className="space-y-3">
                    {/* OLHO DIREITO (OD) */}
                    <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-emerald-950 text-xs flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          OD (Olho Direito - Óculos em Uso)
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Esférico (D)</label>
                          <input
                            type="text"
                            placeholder="+ / - 0.00"
                            value={lensOdSph}
                            onChange={(e) => {
                              const text = e.target.value;
                              setLensOdSph(text);
                              const parsed = parseInputDiopter(text);
                              const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                lensometry: { ...curLens, od: { ...curLens.od, sphere: parsed } }
                              });
                            }}
                            className="w-full bg-white border border-emerald-300 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Cilíndrico (D)</label>
                          <input
                            type="text"
                            placeholder="- 0.00"
                            value={lensOdCyl}
                            onChange={(e) => {
                              const text = e.target.value;
                              setLensOdCyl(text);
                              const parsed = parseInputDiopter(text);
                              const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                lensometry: { ...curLens, od: { ...curLens.od, cylinder: parsed } }
                              });
                            }}
                            className="w-full bg-white border border-emerald-300 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Eixo (°)</label>
                          <input
                            type="text"
                            placeholder="180"
                            value={lensOdAxis}
                            onChange={(e) => {
                              const text = e.target.value;
                              setLensOdAxis(text);
                              const parsed = parseInputAxis(text);
                              const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                lensometry: { ...curLens, od: { ...curLens.od, axis: parsed } }
                              });
                            }}
                            className="w-full bg-white border border-emerald-300 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* OLHO ESQUERDO (OE) */}
                    <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-amber-950 text-xs flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          OE (Olho Esquerdo - Óculos em Uso)
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Esférico (D)</label>
                          <input
                            type="text"
                            placeholder="+ / - 0.00"
                            value={lensOeSph}
                            onChange={(e) => {
                              const text = e.target.value;
                              setLensOeSph(text);
                              const parsed = parseInputDiopter(text);
                              const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                lensometry: { ...curLens, oe: { ...curLens.oe, sphere: parsed } }
                              });
                            }}
                            className="w-full bg-white border border-amber-300 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Cilíndrico (D)</label>
                          <input
                            type="text"
                            placeholder="- 0.00"
                            value={lensOeCyl}
                            onChange={(e) => {
                              const text = e.target.value;
                              setLensOeCyl(text);
                              const parsed = parseInputDiopter(text);
                              const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                lensometry: { ...curLens, oe: { ...curLens.oe, cylinder: parsed } }
                              });
                            }}
                            className="w-full bg-white border border-amber-300 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Eixo (°)</label>
                          <input
                            type="text"
                            placeholder="180"
                            value={lensOeAxis}
                            onChange={(e) => {
                              const text = e.target.value;
                              setLensOeAxis(text);
                              const parsed = parseInputAxis(text);
                              const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                lensometry: { ...curLens, oe: { ...curLens.oe, axis: parsed } }
                              });
                            }}
                            className="w-full bg-white border border-amber-300 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ADIÇÃO, TIPO DE LENTE & TRATAMENTO */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Adição */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Adição (Perto)</label>
                          <input
                            type="text"
                            placeholder="+2.00"
                            value={lensAddition}
                            onChange={(e) => {
                              const text = e.target.value;
                              setLensAddition(text);
                              const parsed = parseInputDiopter(text);
                              const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                lensometry: { ...curLens, addition: parsed }
                              });
                            }}
                            className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-indigo-700 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                          />
                        </div>

                        {/* Tipo de Lente em Uso */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Tipo de Lente de Uso</label>
                          <select
                            value={currentEncounter.lensometry?.lensType || 'multifocal'}
                            onChange={(e) => {
                              const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                lensometry: { ...curLens, lensType: e.target.value }
                              });
                            }}
                            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                          >
                            <option value="monofocal_longe">Monofocal (Longe)</option>
                            <option value="monofocal_perto">Monofocal (Perto / Leitura)</option>
                            <option value="multifocal">Multifocal / Progressivo</option>
                            <option value="bifocal">Bifocal (Topo Reto / Ultex)</option>
                            <option value="ocupacional">Ocupacional (Intermediário / Perto)</option>
                            <option value="contato">Lentes de Contato</option>
                          </select>
                        </div>
                      </div>

                      {/* Tratamentos da Lente Atual */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1.5">Tratamentos na Lente Atual:</label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            'Antirreflexo',
                            'Filtro Luz Azul (BlueCut)',
                            'Fotossensível (Transitions)',
                            'Proteção UV400',
                            'Solar / Escuro',
                            'Polarizado'
                          ].map((treatment) => {
                            const curTreatments = currentEncounter.lensometry?.treatments || [];
                            const isSelected = curTreatments.includes(treatment);
                            return (
                              <button
                                key={treatment}
                                type="button"
                                onClick={() => {
                                  const updated = isSelected
                                    ? curTreatments.filter(t => t !== treatment)
                                    : [...curTreatments, treatment];
                                  const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                                  setCurrentEncounter({
                                    ...currentEncounter,
                                    lensometry: { ...curLens, treatments: updated }
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {isSelected ? '✓ ' : '+ '}{treatment}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 4: Autorefração */}
              {activeTab === 'autorefraction' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-black text-slate-900 text-xs flex items-center gap-1.5 uppercase">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      AUTORREFRAÇÃO COMPUTADORIZADA (AR)
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Valores objetivos do autorefratômetro</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Auto OD */}
                    <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
                      <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        AR - Olho Direito (OD)
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Esf (D)</label>
                          <input
                            type="text"
                            placeholder="-1.25"
                            value={currentEncounter.autorefraction?.od?.sphere !== undefined ? (currentEncounter.autorefraction.od.sphere > 0 ? `+${currentEncounter.autorefraction.od.sphere.toFixed(2)}` : currentEncounter.autorefraction.od.sphere.toFixed(2)) : ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value.replace(',', '.')) || undefined;
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, od: { ...curAR.od, sphere: val } }
                              });
                            }}
                            className="w-full bg-white border border-emerald-300 rounded-xl px-2 py-1 text-xs font-mono font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Cil (D)</label>
                          <input
                            type="text"
                            placeholder="-0.50"
                            value={currentEncounter.autorefraction?.od?.cylinder !== undefined ? (currentEncounter.autorefraction.od.cylinder > 0 ? `+${currentEncounter.autorefraction.od.cylinder.toFixed(2)}` : currentEncounter.autorefraction.od.cylinder.toFixed(2)) : ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value.replace(',', '.')) || undefined;
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, od: { ...curAR.od, cylinder: val } }
                              });
                            }}
                            className="w-full bg-white border border-emerald-300 rounded-xl px-2 py-1 text-xs font-mono font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Eixo (°)</label>
                          <input
                            type="text"
                            placeholder="180"
                            value={currentEncounter.autorefraction?.od?.axis !== undefined ? String(currentEncounter.autorefraction.od.axis) : ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || undefined;
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, od: { ...curAR.od, axis: val } }
                              });
                            }}
                            className="w-full bg-white border border-emerald-300 rounded-xl px-2 py-1 text-xs font-mono font-bold text-center"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Auto OE */}
                    <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-2">
                      <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        AR - Olho Esquerdo (OE)
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Esf (D)</label>
                          <input
                            type="text"
                            placeholder="-1.00"
                            value={currentEncounter.autorefraction?.oe?.sphere !== undefined ? (currentEncounter.autorefraction.oe.sphere > 0 ? `+${currentEncounter.autorefraction.oe.sphere.toFixed(2)}` : currentEncounter.autorefraction.oe.sphere.toFixed(2)) : ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value.replace(',', '.')) || undefined;
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, oe: { ...curAR.oe, sphere: val } }
                              });
                            }}
                            className="w-full bg-white border border-amber-300 rounded-xl px-2 py-1 text-xs font-mono font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Cil (D)</label>
                          <input
                            type="text"
                            placeholder="-0.75"
                            value={currentEncounter.autorefraction?.oe?.cylinder !== undefined ? (currentEncounter.autorefraction.oe.cylinder > 0 ? `+${currentEncounter.autorefraction.oe.cylinder.toFixed(2)}` : currentEncounter.autorefraction.oe.cylinder.toFixed(2)) : ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value.replace(',', '.')) || undefined;
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, oe: { ...curAR.oe, cylinder: val } }
                              });
                            }}
                            className="w-full bg-white border border-amber-300 rounded-xl px-2 py-1 text-xs font-mono font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Eixo (°)</label>
                          <input
                            type="text"
                            placeholder="175"
                            value={currentEncounter.autorefraction?.oe?.axis !== undefined ? String(currentEncounter.autorefraction.oe.axis) : ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || undefined;
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, oe: { ...curAR.oe, axis: val } }
                              });
                            }}
                            className="w-full bg-white border border-amber-300 rounded-xl px-2 py-1 text-xs font-mono font-bold text-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 5: Refração */}
              {activeTab === 'refraction' && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
                    <p className="font-bold text-xs mb-1">Dica de Refração:</p>
                    <p className="text-xs">Utilize o painel de Dials ao lado para registrar o grau subjetivo do paciente. Digite diretamente com o sinal (+ ou -) para máxima rapidez.</p>
                  </div>
                </div>
              )}

              {/* Etapa 6: Binocular */}
              {activeTab === 'binocular' && (
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">TESTE DE ESTEREOPSIA (TITMUS / FLY):</label>
                    <input type="text" placeholder="Ex: 40 segundos de arco" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">PONTO PRÓXIMO DE CONVERGÊNCIA (NPC):</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" placeholder="Break (cm)" className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs" />
                      <input type="number" placeholder="Recovery (cm)" className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs" />
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 7: Conduta & Prescrição */}
              {activeTab === 'conduct' && (
                <div className="space-y-4">
                  {/* Banner de Sugestão Autônoma de Plano Terapêutico */}
                  <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-600 rounded-xl text-white">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-black text-blue-950 text-xs block">
                          SUGESTÃO AUTÔNOMA DE PLANO TERAPÊUTICO
                        </span>
                        <p className="text-[11px] text-blue-800">
                          Selecione o quadro clínico para preencher a conduta, fármacos e retorno automaticamente
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsTherapeuticPlanModalOpen(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all whitespace-nowrap cursor-pointer"
                    >
                      Traçar Plano
                    </button>
                  </div>

                  {/* Campo de Conduta Clínica */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 block">CONDUTA CLÍNICA & ORIENTAÇÕES AO PACIENTE:</label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsTherapeuticGuideOpen(true)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Pill className="w-3.5 h-3.5 text-indigo-600" />
                          <span>+ Fármaco</span>
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={5}
                      value={currentEncounter.conduct || ''}
                      onChange={(e) => setCurrentEncounter({ ...currentEncounter, conduct: e.target.value })}
                      placeholder="Prescrição de lentes multifocais, regras ergonômicas, plano terapêutico com colírios..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  {/* Indicação de Retorno */}
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                    <label className="font-black text-blue-950 block text-xs uppercase tracking-wider">
                      INDICAÇÃO DE RETORNO (APARECERÁ NO RECEITUÁRIO):
                    </label>
                    <input
                      type="text"
                      value={currentEncounter.returnInstructions || ''}
                      onChange={(e) => setCurrentEncounter({ ...currentEncounter, returnInstructions: e.target.value })}
                      placeholder="Ex: Retorno em 1 ano para controle visual de rotina."
                      className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
                    />

                    {/* Chips de Sugestões Rápidas */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'Retorno em 1 ano (Controle Anual)',
                        'Retorno em 6 meses (Acompanhamento)',
                        'Retorno em 30 a 60 dias (Controle de Sintomas)',
                        'Retorno em 7 a 15 dias (Reavaliação de Tratamento)'
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCurrentEncounter({ ...currentEncounter, returnInstructions: preset })}
                          className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-200 rounded-lg text-[11px] font-bold text-blue-800 transition-colors cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Botões de Emissão de Receitas */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
                    <div>
                      <span className="font-black text-slate-900 text-xs block">CENTRAL DE RECEITUÁRIOS & IMPRESSÃO:</span>
                      <p className="text-[11px] text-slate-500">Impressão em A4 Paisagem (2 em 1), A4 individual ou Cupom Térmico (BR 🇧🇷 / PY 🇵🇾)</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenPrintCenter('dual')}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        <Columns className="w-4 h-4" />
                        <span>Imprimir A4 Paisagem (2 em 1)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenPrintCenter('dioptria')}
                        className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Glasses className="w-4 h-4 text-indigo-600" />
                        <span>Receita Dioptria</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenPrintCenter('farmaco')}
                        className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Pill className="w-4 h-4 text-rose-600" />
                        <span>Receita Farmacológica</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Central / Dials de Refração Subjetiva */}
        <div className={remoteMode === 'sidebar' ? "lg:col-span-4 flex flex-col gap-4" : "lg:col-span-6 flex flex-col gap-4"}>
          <RefractionDials
            refraction={currentEncounter.subjectiveRefraction || {
              id: generateUUID(),
              encounterId: currentEncounter.id,
              od: { sphere: 0, cylinder: 0, axis: 180, visualAcuity: '20/20' },
              oe: { sphere: 0, cylinder: 0, axis: 180, visualAcuity: '20/20' },
              pdDistanceMm: 62
            }}
            patientAge={patientAge}
            onChange={(updatedRefraction) => setCurrentEncounter({
              ...currentEncounter,
              subjectiveRefraction: updatedRefraction
            })}
          />
        </div>

        {/* Coluna Direita: Painel de Controle Remoto Lateral (Apenas se em modo sidebar) */}
        {remoteMode === 'sidebar' && (
          <div className="lg:col-span-3 flex flex-col">
            <div className="flex items-center justify-between pb-1 px-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Controle Remoto TV</span>
              <button
                onClick={() => {
                  setRemoteMode('floating');
                  setIsFloatingRemoteOpen(true);
                }}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                title="Minimiza e transforma em controle móvel flutuante para ampliar o espaço dos dados"
              >
                <Minimize2 className="w-3 h-3" /> Flutuar
              </button>
            </div>
            <RemoteControlPanel onAcuityRecorded={handleAcuityRecorded} />
          </div>
        )}
      </div>

      {/* Widget / Botão Suspenso Móvel Flutuante de Controle Remoto */}
      {remoteMode === 'floating' && (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
          {isFloatingRemoteOpen && (
            <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-84 max-h-[82vh] overflow-y-auto p-2 animate-fadeIn mb-1 ring-1 ring-white/10">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-white">
                <span className="font-bold text-xs flex items-center gap-1.5 text-blue-400">
                  <Tv className="w-3.5 h-3.5" /> Controle Remoto Móvel
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setRemoteMode('sidebar')} 
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                    title="Fixar na barra lateral"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setIsFloatingRemoteOpen(false)} 
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                    title="Minimizar para botão"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-1">
                <RemoteControlPanel onAcuityRecorded={handleAcuityRecorded} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700 shadow-2xl">
            <button
              onClick={() => setIsFloatingRemoteOpen(!isFloatingRemoteOpen)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                isFloatingRemoteOpen ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              <Tv className="w-4 h-4 text-blue-400" />
              <span>{isFloatingRemoteOpen ? 'Ocultar Controle' : 'Abrir Controle TV'}</span>
            </button>
            <button
              onClick={() => setRemoteMode('sidebar')}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              title="Fixar na barra lateral"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Central Unificada de Impressão Bilíngue (A4 Paisagem 2 em 1 / Dioptria / Fármaco / BR / PY) */}
      <UnifiedPrintCenterModal
        isOpen={isUnifiedPrintModalOpen}
        initialMode={unifiedPrintMode}
        prescription={activePrescription}
        patient={patient}
        initialDrugs={pendingPrescriptionDrugs}
        onClose={() => setIsUnifiedPrintModalOpen(false)}
      />

      {/* 2. Modal de Impressão de Relatório Clínico */}
      <ClinicalReportModal
        isOpen={isReportModalOpen}
        encounter={currentEncounter}
        patient={patient}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* 3. Modal de Planos Terapêuticos Guiados por Diagnóstico */}
      <TherapeuticPlanModal
        isOpen={isTherapeuticPlanModalOpen}
        onClose={() => setIsTherapeuticPlanModalOpen(false)}
        onApplyPlan={handleApplyTherapeuticPlan}
        onGenerateMedicalPrescription={(drugs) => {
          setPendingPrescriptionDrugs(drugs);
          handleOpenPrintCenter('farmaco');
        }}
      />

      {/* 4. Modal de Guia de Fármacos Oftálmicos */}
      <TherapeuticGuideModal
        isOpen={isTherapeuticGuideOpen}
        onClose={() => setIsTherapeuticGuideOpen(false)}
        onSelectDrug={handleApplyDrugToEncounter}
      />

      {/* 5. Modal de Edição de Dados do Paciente Durante o Atendimento */}
      {isEditPatientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 text-slate-900 border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-blue-600 font-bold">
                <Edit3 className="w-5 h-5" />
                <span>EDITAR CADASTRO DO PACIENTE</span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsEditPatientModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePatientData} className="space-y-4 text-xs">
              {/* Seletor de Nacionalidade BR / PY */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">NACIONALIDADE DO PACIENTE:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleEditNationalityChange('BR')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editNationality === 'BR'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>🇧🇷 Brasil (CPF / Foz do Iguaçu)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEditNationalityChange('PY')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editNationality === 'PY'
                        ? 'bg-red-50 border-red-500 text-red-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>🇵🇾 Paraguai (C.I. / Ciudad del Este)</span>
                  </button>
                </div>
              </div>

              {/* Nome Completo */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">NOME COMPLETO *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Nome do paciente"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Data de Nascimento e Sexo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">DATA DE NASCIMENTO</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  {editBirthDate && calculateAge(editBirthDate) && (
                    <p className="text-[11px] font-bold text-blue-600 mt-1">
                      Idade Calculada: {calculateAge(editBirthDate)?.formatted}
                    </p>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">SEXO / GÊNERO</label>
                  <select
                    value={editSex}
                    onChange={(e) => setEditSex(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="uninformed">Não informado</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              </div>

              {/* Documento Binacional */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">TIPO DOCUMENTO</label>
                  <select
                    value={editDocumentType}
                    onChange={(e) => setEditDocumentType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    {editNationality === 'BR' ? (
                      <>
                        <option value="CPF">CPF (Brasil)</option>
                        <option value="RG">RG (Brasil)</option>
                        <option value="PASSPORT">Passaporte</option>
                        <option value="OTHER">Outro</option>
                      </>
                    ) : (
                      <>
                        <option value="CI_PY">Cédula de Identidad (PY)</option>
                        <option value="RUC_PY">RUC (Paraguai)</option>
                        <option value="PASSPORT">Passaporte</option>
                        <option value="OTHER">Outro</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">NÚMERO DO DOCUMENTO</label>
                  <input
                    type="text"
                    value={editDocumentNumber}
                    onChange={(e) => setEditDocumentNumber(e.target.value)}
                    placeholder={editNationality === 'PY' ? 'Ex: 4.821.902' : 'Ex: 000.000.000-00'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Telefone / WhatsApp */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">CÓDIGO PAÍS</label>
                  <select
                    value={editPhoneCountryCode}
                    onChange={(e) => setEditPhoneCountryCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  >
                    <option value="+55">🇧🇷 +55 (Brasil)</option>
                    <option value="+595">🇵🇾 +595 (Paraguai)</option>
                    <option value="+54">🇦🇷 +54 (Argentina)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">TELEFONE / WHATSAPP</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder={editNationality === 'PY' ? '981 123456' : '(45) 99999-9999'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Cidade e Endereço */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">CIDADE</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ENDEREÇO / BAIRRO</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Rua, número, bairro"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Responsável */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">NOME DO RESPONSÁVEL (SE MENOR OU ACOMPANHANTE)</label>
                <input
                  type="text"
                  value={editGuardianName}
                  onChange={(e) => setEditGuardianName(e.target.value)}
                  placeholder="Nome do pai, mãe ou tutor legal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">OBSERVAÇÕES DO CADASTRO</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Observações administrativas ou cadastrais..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditPatientModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-transform cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
