import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Patient, 
  ClinicalEncounter, 
  SubjectiveRefraction, 
  FinalRefraction,
  Prescription,
  EyeTested,
  calculateAge,
  formatRefractionString,
  calculateSphericalEquivalent
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
  Sliders,
  Image as ImageIcon,
  ClipboardList,
  Info,
  HelpCircle,
  FilePlus2,
  Stethoscope,
  Plus,
  History,
  RotateCcw,
  Copy,
  FileCheck2,
  CalendarClock,
  Trash2,
  ChevronLeft
} from 'lucide-react';
import { SyncStatusBadge } from '../components/SyncStatusBadge';
import { RemoteControlPanel } from '../components/RemoteControlPanel';
import { RefractionDials } from '../components/RefractionDials';
import { PrescriptionModal } from '../components/PrescriptionModal';
import { MedicalPrescriptionModal } from '../components/MedicalPrescriptionModal';
import { UnifiedPrintCenterModal } from '../components/UnifiedPrintCenterModal';
import { ClinicalReportModal } from '../components/ClinicalReportModal';
import { TherapeuticGuideModal } from '../components/TherapeuticGuideModal';
import { TherapeuticPlanModal } from '../components/TherapeuticPlanModal';
import { ClinicalGalleryModal } from '../components/gallery/ClinicalGalleryModal';
import { PatientMedicalRecordModal } from '../components/PatientMedicalRecordModal';
import { ClinicalDocumentIssuanceModal, StandardDocType } from '../components/ClinicalDocumentIssuanceModal';
import { offlineDb, generateUUID } from '../services/offlineDb';
import { lanController } from '../services/lanController';

import { OphthalmicDrug } from '../services/ophthalmicDrugsDb';
import { TherapeuticProtocol, ClinicalProtocolDrug } from '../services/therapeuticProtocolsDb';
import { NationalityType, DocumentType, DiagnosisEntry, DiagnosisEye, DiagnosisStatus } from '@optotipo/shared';

interface ExaminationWorkspaceProps {
  patient: Patient;
  encounter?: ClinicalEncounter;
  onBack: () => void;
  onPatientUpdated?: (patient: Patient) => void;
  isReadOnly?: boolean;
  userRole?: string;
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
  onPatientUpdated,
  isReadOnly = false,
  userRole
}) => {
  const [patient, setPatient] = useState<Patient>(initialPatient);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<TrailStep['tabKey']>('anamnesis');
  const stepContainerRef = useRef<HTMLDivElement | null>(null);
  const saveMessageTimeoutRef = useRef<any>(null);

  // Limpeza de timers de feedback ao desmontar
  useEffect(() => {
    return () => {
      if (saveMessageTimeoutRef.current) {
        clearTimeout(saveMessageTimeoutRef.current);
      }
    };
  }, []);

  // Garante que o scroll vá para o topo sempre que a etapa/aba mudar
  useEffect(() => {
    if (stepContainerRef.current) {
      stepContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

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
  const [editCity, setEditCity] = useState<string>(patient.city || 'Ponta Porã');
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
    setEditCity(patient.city || (patient.nationality === 'PY' ? 'Pedro Juan Caballero' : 'Ponta Porã'));
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
      if (!editCity || editCity === 'Ponta Porã' || editCity === 'Foz do Iguaçu') setEditCity('Pedro Juan Caballero');
    } else {
      setEditDocumentType('CPF');
      setEditPhoneCountryCode('+55');
      if (!editCity || editCity === 'Pedro Juan Caballero' || editCity === 'Ciudad del Este') setEditCity('Ponta Porã');
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
    if (saveMessageTimeoutRef.current) {
      clearTimeout(saveMessageTimeoutRef.current);
    }
    setSaveMessage('Cadastro do paciente atualizado!');
    saveMessageTimeoutRef.current = setTimeout(() => {
      setSaveMessage(null);
      saveMessageTimeoutRef.current = null;
    }, 2500);
  };

  // Recupera histórico de consultas anteriores do paciente para referência e comparativo
  const patientEncounterHistory = useMemo(() => {
    return offlineDb.getEncounters()
      .filter(e => e.patientId === patient.id && e.id !== (initialEncounter?.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [patient.id, initialEncounter?.id]);

  const isReturnSession = (initialEncounter as any)?.isReturnEncounter || false;
  const previousReferenceEncounter = (initialEncounter as any)?.previousEncounter || (patientEncounterHistory.length > 0 ? patientEncounterHistory[0] : null);

  // Estado do Atendimento Atual com Auto-recuperação de dados existentes
  const [currentEncounter, setCurrentEncounter] = useState<ClinicalEncounter>(() => {
    if (initialEncounter && !(initialEncounter as any)?.isReturnEncounter) {
      return initialEncounter;
    }
    
    // Se for uma consulta de retorno ou se o examinador solicitou novo retorno:
    if (isReturnSession && previousReferenceEncounter) {
      const prevRx = previousReferenceEncounter.subjectiveRefraction;
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
          chiefComplaint: `Retorno clínico para reavaliação visual. Consulta anterior: ${new Date(previousReferenceEncounter.date).toLocaleDateString('pt-BR')}`,
          currentGlasses: true,
          contactLenses: false,
          hasHypertension: previousReferenceEncounter.anamnesis?.hasHypertension || false,
          hasDiabetes: previousReferenceEncounter.anamnesis?.hasDiabetes || false,
          medicationsInUse: previousReferenceEncounter.anamnesis?.medicationsInUse || '',
          pathologicalHistory: previousReferenceEncounter.anamnesis?.pathologicalHistory || '',
          allergies: previousReferenceEncounter.anamnesis?.allergies || '',
          ocularHistory: previousReferenceEncounter.anamnesis?.ocularHistory || '',
          clinicalNotes: `Retorno de paciente. Consulta de referência realizada em ${new Date(previousReferenceEncounter.date).toLocaleDateString('pt-BR')}.`
        },
        lensometry: {
          id: generateUUID(),
          encounterId: '',
          od: {
            sphere: prevRx?.od?.sphere,
            cylinder: prevRx?.od?.cylinder,
            axis: prevRx?.od?.axis
          },
          oe: {
            sphere: prevRx?.oe?.sphere,
            cylinder: prevRx?.oe?.cylinder,
            axis: prevRx?.oe?.axis
          },
          addition: prevRx?.addition || previousReferenceEncounter.lensometry?.addition,
          pdDistanceMm: prevRx?.pdDistanceMm,
          lensType: previousReferenceEncounter.lensometry?.lensType || 'multifocal',
          material: previousReferenceEncounter.lensometry?.material || 'resina',
          treatments: previousReferenceEncounter.lensometry?.treatments || ['Antirreflexo'],
          notes: `Dioptria da consulta anterior (${new Date(previousReferenceEncounter.date).toLocaleDateString('pt-BR')}) carregada como óculos atual.`
        },
        visualAcuity: {
          id: generateUUID(),
          encounterId: '',
          testedAt: new Date().toISOString(),
          entries: previousReferenceEncounter.visualAcuity?.entries?.length ? previousReferenceEncounter.visualAcuity.entries : [
            { eye: 'OD', optotypeType: 'snellen_letters', distanceMeters: 6, uncorrected: '20/' },
            { eye: 'OE', optotypeType: 'snellen_letters', distanceMeters: 6, uncorrected: '20/' }
          ]
        },
        subjectiveRefraction: {
          id: generateUUID(),
          encounterId: '',
          od: { 
            sphere: prevRx?.od?.sphere, 
            cylinder: prevRx?.od?.cylinder, 
            axis: prevRx?.od?.axis, 
            visualAcuity: prevRx?.od?.visualAcuity || '20/20' 
          },
          oe: { 
            sphere: prevRx?.oe?.sphere, 
            cylinder: prevRx?.oe?.cylinder, 
            axis: prevRx?.oe?.axis, 
            visualAcuity: prevRx?.oe?.visualAcuity || '20/20' 
          },
          addition: prevRx?.addition,
          pdDistanceMm: prevRx?.pdDistanceMm || 62
        },
        conduct: previousReferenceEncounter.conduct ? `Retorno clínico. Conduta anterior mantida/reavaliada: ${previousReferenceEncounter.conduct}` : 'Retorno clínico. Reavaliação de refração e acuidade visual.',
        returnInstructions: previousReferenceEncounter.returnInstructions || 'Retorno em 1 ano para acompanhamento de rotina.'
      };
    }


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

  // Salva no banco de dados offline toda vez que o atendimento for alterado (apenas se não estiver em modo somente leitura da recepção)
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isReadOnly) return;

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
  }, [currentEncounter, isReadOnly]);

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

  // Estados locais em string para digitação fluida da Autorrefração Computadorizada (AR)
  const [arOdSph, setArOdSph] = useState<string>(() => formatDiopterStr(currentEncounter.autorefraction?.od?.sphere));
  const [arOdCyl, setArOdCyl] = useState<string>(() => formatDiopterStr(currentEncounter.autorefraction?.od?.cylinder));
  const [arOdAxis, setArOdAxis] = useState<string>(() => currentEncounter.autorefraction?.od?.axis !== undefined ? String(currentEncounter.autorefraction.od.axis) : '');

  const [arOeSph, setArOeSph] = useState<string>(() => formatDiopterStr(currentEncounter.autorefraction?.oe?.sphere));
  const [arOeCyl, setArOeCyl] = useState<string>(() => formatDiopterStr(currentEncounter.autorefraction?.oe?.cylinder));
  const [arOeAxis, setArOeAxis] = useState<string>(() => currentEncounter.autorefraction?.oe?.axis !== undefined ? String(currentEncounter.autorefraction.oe.axis) : '');

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
    if (currentEncounter.autorefraction) {
      setArOdSph(formatDiopterStr(currentEncounter.autorefraction.od?.sphere));
      setArOdCyl(formatDiopterStr(currentEncounter.autorefraction.od?.cylinder));
      setArOdAxis(currentEncounter.autorefraction.od?.axis !== undefined ? String(currentEncounter.autorefraction.od.axis) : '');
      setArOeSph(formatDiopterStr(currentEncounter.autorefraction.oe?.sphere));
      setArOeCyl(formatDiopterStr(currentEncounter.autorefraction.oe?.cylinder));
      setArOeAxis(currentEncounter.autorefraction.oe?.axis !== undefined ? String(currentEncounter.autorefraction.oe.axis) : '');
    } else {
      setArOdSph('');
      setArOdCyl('');
      setArOdAxis('');
      setArOeSph('');
      setArOeCyl('');
      setArOeAxis('');
    }
  }, [currentEncounter.id]);

  const parseInputDiopter = (str: string): number | undefined => {
    if (!str || str.trim() === '' || str === '+' || str === '-') return undefined;
    const cleaned = str.trim().toLowerCase().replace(',', '.');
    if (cleaned === 'pl' || cleaned === 'plano') return 0;
    const num = parseFloat(cleaned);
    if (isNaN(num)) return undefined;
    return Math.round(num * 100) / 100;
  };

  const parseInputAxis = (str: string): number | undefined => {
    if (!str || str.trim() === '') return undefined;
    const num = parseInt(str.trim(), 10);
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
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState<boolean>(false);
  const [isClinicalDocModalOpen, setIsClinicalDocModalOpen] = useState<boolean>(false);
  const [clinicalDocModalType, setClinicalDocModalType] = useState<StandardDocType>('exam_request');
  const [activePrescription, setActivePrescription] = useState<Prescription | null>(null);

  const [pendingPrescriptionDrugs, setPendingPrescriptionDrugs] = useState<ClinicalProtocolDrug[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const showSaveFeedback = (msg: string, durationMs: number = 2500) => {
    if (saveMessageTimeoutRef.current) {
      clearTimeout(saveMessageTimeoutRef.current);
    }
    setSaveMessage(msg);
    saveMessageTimeoutRef.current = setTimeout(() => {
      setSaveMessage(null);
      saveMessageTimeoutRef.current = null;
    }, durationMs);
  };

  // Histórico completo de todas as consultas do paciente
  const allPatientEncounters = useMemo(() => {
    return offlineDb.getEncounters()
      .filter(e => e.patientId === patient.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [patient.id, currentEncounter.id, saveMessage]);

  // Estados para Gestão de Retorno e Prontuário Completo
  const [isPatientHistoryModalOpen, setIsPatientHistoryModalOpen] = useState<boolean>(false);
  const [isConfirmReturnModalOpen, setIsConfirmReturnModalOpen] = useState<boolean>(false);
  const [isReturnMode, setIsReturnMode] = useState<boolean>(Boolean(isReturnSession || (currentEncounter as any)?.isReturnEncounter));

  // Função para Iniciar Consulta de Retorno Preservando Dados Anteriores
  const handleStartReturnSession = (refEncounter?: ClinicalEncounter) => {
    const reference = refEncounter || previousReferenceEncounter || allPatientEncounters.find(e => e.id !== currentEncounter.id) || allPatientEncounters[0];
    const prevRx = reference?.subjectiveRefraction || reference?.lensometry;

    const newReturn: ClinicalEncounter = {
      id: generateUUID(),
      patientId: patient.id,
      date: new Date().toISOString(),
      status: 'in_progress',
      examinerId: currentEncounter.examinerId || 'dr-meirelles',
      examinerName: currentEncounter.examinerName || 'Dr. Rudson Meirelles (CRM/CROO 123456)',
      syncStatus: 'synced',
      updatedAt: new Date().toISOString(),
      isReturnEncounter: true,
      returnReferenceEncounterId: reference?.id,
      anamnesis: {
        id: generateUUID(),
        encounterId: '',
        chiefComplaint: `Retorno clínico para reavaliação visual.${reference ? ` Consulta anterior: ${new Date(reference.date).toLocaleDateString('pt-BR')}` : ''}`,
        currentGlasses: true,
        contactLenses: reference?.anamnesis?.contactLenses || false,
        hasHypertension: reference?.anamnesis?.hasHypertension || false,
        hasDiabetes: reference?.anamnesis?.hasDiabetes || false,
        medicationsInUse: reference?.anamnesis?.medicationsInUse || '',
        pathologicalHistory: reference?.anamnesis?.pathologicalHistory || '',
        allergies: reference?.anamnesis?.allergies || '',
        ocularHistory: reference?.anamnesis?.ocularHistory || '',
        clinicalNotes: `Retorno clínico do paciente. Consulta de referência: ${reference ? new Date(reference.date).toLocaleDateString('pt-BR') : 'Data anterior'}.`
      },
      lensometry: {
        id: generateUUID(),
        encounterId: '',
        od: {
          sphere: prevRx?.od?.sphere,
          cylinder: prevRx?.od?.cylinder,
          axis: prevRx?.od?.axis
        },
        oe: {
          sphere: prevRx?.oe?.sphere,
          cylinder: prevRx?.oe?.cylinder,
          axis: prevRx?.oe?.axis
        },
        addition: prevRx?.addition || reference?.lensometry?.addition,
        pdDistanceMm: prevRx?.pdDistanceMm || reference?.lensometry?.pdDistanceMm,
        lensType: reference?.lensometry?.lensType || 'multifocal',
        material: reference?.lensometry?.material || 'resina',
        treatments: reference?.lensometry?.treatments || ['Antirreflexo'],
        notes: reference ? `Dioptria da consulta anterior (${new Date(reference.date).toLocaleDateString('pt-BR')}) carregada como óculos atual.` : ''
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
        od: {
          sphere: prevRx?.od?.sphere,
          cylinder: prevRx?.od?.cylinder,
          axis: prevRx?.od?.axis,
          visualAcuity: prevRx?.od?.visualAcuity || '20/20'
        },
        oe: {
          sphere: prevRx?.oe?.sphere,
          cylinder: prevRx?.oe?.cylinder,
          axis: prevRx?.oe?.axis,
          visualAcuity: prevRx?.oe?.visualAcuity || '20/20'
        },
        addition: prevRx?.addition,
        pdDistanceMm: prevRx?.pdDistanceMm || 62
      },
      conduct: reference?.conduct ? `Retorno clínico. Reavaliação e nova conduta baseada na consulta anterior (${new Date(reference.date).toLocaleDateString('pt-BR')})` : 'Retorno clínico. Reavaliação de refração e acuidade visual.',
      returnInstructions: reference?.returnInstructions || (patient.nationality === 'PY' ? 'Control en 1 año para evaluación visual de rutina.' : 'Retorno em 1 ano para controle visual de rotina.')
    };

    offlineDb.saveEncounter(newReturn);
    setCurrentEncounter(newReturn);
    setIsReturnMode(true);

    if (newReturn.lensometry) {
      setLensOdSph(formatDiopterStr(newReturn.lensometry.od?.sphere));
      setLensOdCyl(formatDiopterStr(newReturn.lensometry.od?.cylinder));
      setLensOdAxis(newReturn.lensometry.od?.axis !== undefined ? String(newReturn.lensometry.od.axis) : '');
      setLensOeSph(formatDiopterStr(newReturn.lensometry.oe?.sphere));
      setLensOeCyl(formatDiopterStr(newReturn.lensometry.oe?.cylinder));
      setLensOeAxis(newReturn.lensometry.oe?.axis !== undefined ? String(newReturn.lensometry.oe.axis) : '');
      setLensAddition(formatDiopterStr(newReturn.lensometry.addition));
    }

    setIsConfirmReturnModalOpen(false);
    setIsPatientHistoryModalOpen(false);
    setSaveMessage('✓ Nova consulta de retorno iniciada! Consulta anterior arquivada com segurança.');
    setTimeout(() => setSaveMessage(null), 3500);
  };

  const patientAge = calculateAge(patient.birthDate);

  const handleStepClick = (step: TrailStep) => {
    setCurrentStep(step.id);
    setActiveTab(step.tabKey);
    if (stepContainerRef.current) {
      stepContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextStep = () => {
    const nextIdx = currentStep; // id é 1-based, logo se currentStep=1, next item no array tem id 2
    if (nextIdx < EXAM_TRAIL.length) {
      const nextStep = EXAM_TRAIL[nextIdx];
      handleStepClick(nextStep);
    }
  };

  const handlePrevStep = () => {
    const prevIdx = currentStep - 2;
    if (prevIdx >= 0) {
      const prevStep = EXAM_TRAIL[prevIdx];
      handleStepClick(prevStep);
    }
  };

  // FASE 29: Atalhos de Alta Produtividade no Consultório
  // - Ctrl+S / Cmd+S: Salvar progresso do atendimento
  // - Alt + 1..7: Pular diretamente para etapa correspondente da trilha de exame
  // - Alt + Seta Direita / Esquerda: Avançar / Retroceder etapa
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Se algum modal estiver aberto ou o usuário estiver digitando em textarea/input, não intercepta atalhos de digitação
      const target = e.target as HTMLElement | null;
      const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Ctrl+S / Cmd+S para salvar prontuário
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!isReadOnly) {
          handleSaveEncounter('in_progress');
        }
        return;
      }

      // Atalhos com Alt para navegação entre etapas da trilha (não conflita com digitação)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextStep();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevStep();
        } else {
          const num = parseInt(e.key, 10);
          if (num >= 1 && num <= EXAM_TRAIL.length) {
            e.preventDefault();
            const targetStep = EXAM_TRAIL.find(s => s.id === num);
            if (targetStep) {
              handleStepClick(targetStep);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isReadOnly, currentEncounter, patient]);

  const handleAcuityRecorded = (
    eye: EyeTested, 
    acuitySnellen: string, 
    correct: boolean, 
    target: 'av_sc' | 'refraction' = activeTab === 'av_sc' ? 'av_sc' : 'refraction'
  ) => {
    if (!correct) return;

    if (target === 'av_sc') {
      // Grava no VisualAcuityRecord (AVsc - Sem Correção)
      const existingVa = currentEncounter.visualAcuity || {
        id: generateUUID(),
        encounterId: currentEncounter.id,
        testedAt: new Date().toISOString(),
        entries: []
      };

      const otherEntries = (existingVa.entries || []).filter(e => e.eye !== eye);
      const currentEntry = (existingVa.entries || []).find(e => e.eye === eye) || {
        eye,
        optotypeType: 'snellen_letters',
        distanceMeters: 6
      };

      const updatedVa = {
        ...existingVa,
        testedAt: new Date().toISOString(),
        entries: [
          ...otherEntries,
          { ...currentEntry, uncorrected: acuitySnellen }
        ]
      };

      const updated = {
        ...currentEncounter,
        visualAcuity: updatedVa
      };

      setCurrentEncounter(updated);
      offlineDb.saveEncounter(updated);
      setSaveMessage(`✓ AVsc ${eye} (${acuitySnellen}) gravada no prontuário!`);
      setTimeout(() => setSaveMessage(null), 2500);
      return;
    }

    // Grava na Refração Subjetiva (AVcc / Acuidade do Exame Refrativo)
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
    setSaveMessage(`✓ AV Refração ${eye} (${acuitySnellen}) gravada no prontuário!`);
    setTimeout(() => setSaveMessage(null), 2500);
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

      // Sincroniza status do agendamento correspondente para 'completed'
      if (updated.appointmentId) {
        try {
          offlineDb.updateAppointmentStatus(updated.appointmentId, 'completed', activeClinicId);
        } catch (e) {
          console.warn('Erro ao atualizar agendamento após consulta:', e);
        }
      } else {
        // Tenta localizar agendamento de hoje deste paciente
        const todayStr = new Date().toISOString().split('T')[0];
        const dayApts = offlineDb.getAppointments(activeClinicId);
        const matchApt = dayApts.find(a => (a.patientId === patient.id || a.patientName.toLowerCase() === patient.fullName.toLowerCase()) && a.date === todayStr);
        if (matchApt) {
          try {
            offlineDb.updateAppointmentStatus(matchApt.id, 'completed', activeClinicId);
          } catch {}
        }
      }
    }

    setSaveMessage(status === 'completed' ? '✓ Atendimento concluído, prontuário salvo e financeiro atualizado!' : '✓ Progresso salvo!');
    setTimeout(() => setSaveMessage(null), 2500);
  };


  // Prepara Objeto de Prescrição Óptica (Dioptria) - 100% segregada da conduta médica/farmacológica
  const prepareOpticalPrescription = (): Prescription => {
    // FASE 26: A prescrição é derivada conscientemente da refração final homologada ou da refração subjetiva confirmada
    const ref = currentEncounter.finalRefraction || currentEncounter.subjectiveRefraction;
    const specialLensesText = ref?.specialLenses?.trim() ? ` [Lentes Especiais: ${ref.specialLenses.trim()}]` : '';
    const opticalInfoText = ref?.additionalOpticalInfo?.trim() || '';
    
    // As observações da receita óptica contêm exclusivamente informações sobre armação, lentes e adaptação visual
    const opticalNotes = opticalInfoText
      ? `${opticalInfoText}${specialLensesText}`
      : (specialLensesText ? specialLensesText.trim() : 'Adaptação progressiva.');

    const activeClinic = offlineDb.getActiveClinic();
    const existingEncounterRxs = offlineDb.getPrescriptionsByEncounter(currentEncounter.id);
    const existingIssued = existingEncounterRxs.find(r => r.isIssued);

    let rxId = generateUUID();
    let version = 1;
    let supersedesId: string | undefined = undefined;

    if (existingIssued) {
      // Já existe receita emitida para este encontro. Cria nova versão vinculada!
      rxId = `rx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      version = (existingIssued.version || 1) + 1;
      supersedesId = existingIssued.id;
    } else if (existingEncounterRxs.length > 0) {
      // Reutiliza o ID do rascunho anterior ainda não emitido
      rxId = existingEncounterRxs[0].id;
      version = existingEncounterRxs[0].version || 1;
    }

    const newRx: Prescription = {
      id: rxId,
      encounterId: currentEncounter.id,
      patientId: patient.id,
      patientName: patient.fullName,
      clinicId: currentEncounter.clinicId || activeClinic.id,
      clinicName: activeClinic.name,
      date: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      od: {
        sphere: ref?.od?.sphere || 0,
        cylinder: ref?.od?.cylinder || 0,
        axis: ref?.od?.axis || 0,
        addition: ref?.od?.addition || ref?.addition,
        prism: ref?.od?.prism,
        prismBase: ref?.od?.prismBase,
        visualAcuity: ref?.od?.visualAcuity
      },
      oe: {
        sphere: ref?.oe?.sphere || 0,
        cylinder: ref?.oe?.cylinder || 0,
        axis: ref?.oe?.axis || 0,
        addition: ref?.oe?.addition || ref?.addition,
        prism: ref?.oe?.prism,
        prismBase: ref?.oe?.prismBase,
        visualAcuity: ref?.oe?.visualAcuity
      },
      addition: ref?.addition,
      pdDistanceMm: ref?.pdDistanceMm || 62,
      lensType: (ref?.lensType as any) || (ref?.addition ? 'multifocal' : 'monofocal'),
      material: (ref?.material as any) || 'resina',
      treatments: ref?.treatments && ref.treatments.length > 0 ? ref.treatments : ['Antirreflexo Digital', 'Filtro Luz Azul (BlueCut)'],
      returnInstructions: currentEncounter.returnInstructions || (patient.nationality === 'PY' ? 'Control en 1 año para evaluación visual de rutina.' : 'Retorno em 1 ano para controle visual de rotina.'),
      additionalOpticalInfo: opticalInfoText || undefined,
      observations: opticalNotes,
      examinerName: currentEncounter.examinerName || 'Dr. Rudson Meirelles',
      examinerRegistry: 'CRM/CROO 123456',
      version,
      supersedesId,
      isIssued: false
    };
    const saved = offlineDb.savePrescription(newRx, currentEncounter.clinicId || activeClinic.id);
    setActivePrescription(saved);
    return saved;
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
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 overflow-hidden font-sans">
      
      {/* 1. Cabeçalho Principal do Atendimento */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between shadow-sm shrink-0 gap-2 no-print">
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
              <div className="flex items-center gap-2 flex-wrap">
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

                {/* Data e Hora do Atendimento */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-xs text-slate-700" title="Data do Atendimento Atual">
                  <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-bold text-slate-800">
                    {new Date(currentEncounter.date).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(currentEncounter.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Badge de Retorno Clínico */}
                {(isReturnMode || (currentEncounter as any)?.isReturnEncounter) && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-black text-[11px] flex items-center gap-1 shadow-xs animate-fadeIn">
                    <RotateCcw className="w-3 h-3" />
                    <span>RETORNO CLÍNICO</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                {patient.birthDate && (
                  <span>Nasc: <b>{new Date(patient.birthDate).toLocaleDateString(patient.nationality === 'PY' ? 'es-PY' : 'pt-BR')}</b></span>
                )}
                {patient.phone && <span>Tel: {patient.phone}</span>}
              </div>

              {/* Botões MUDADOS PARA O LADO ESQUERDO PARA VISIBILIDADE MÁXIMA */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsPatientHistoryModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 hover:border-amber-400 rounded-xl font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
                  title="Ver todo o histórico do paciente"
                >
                  <History className="w-3.5 h-3.5 text-amber-600" />
                  <span>📋 Histórico / Prontuário</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (allPatientEncounters.length === 0 && !isReturnMode && !(currentEncounter as any)?.isReturnEncounter) {
                      if (confirm(`Este paciente ainda não possui consultas arquivadas no sistema.\nDeseja iniciar uma Consulta de Retorno avulsa?`)) {
                        handleStartReturnSession();
                      }
                      return;
                    }
                    setIsConfirmReturnModalOpen(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                    isReturnMode || (currentEncounter as any)?.isReturnEncounter
                      ? 'bg-purple-700 text-white ring-2 ring-purple-400 shadow-purple-600/30'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 hover:border-purple-400'
                  }`}
                  title="Registrar Consulta de Retorno: Cria um novo atendimento hoje, preservando a consulta anterior intacta e carregando as dioptrias de referência"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isReturnMode || (currentEncounter as any)?.isReturnEncounter ? 'text-purple-200' : 'text-purple-600'}`} />
                  <span>{isReturnMode || (currentEncounter as any)?.isReturnEncounter ? '✓ Consulta de Retorno' : '↩ Nova Consulta de Retorno'}</span>
                </button>
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

          {/* Botão: Galeria de Imagens, Desenho Anatômico e Atlas */}
          <button
            onClick={() => setIsGalleryModalOpen(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-cyan-600/20 active:scale-95 transition-all cursor-pointer"
            title="Galeria de Imagens, Desenho Anatômico Ocular e Atlas de Patologias"
          >
            <ImageIcon className="w-4 h-4 text-cyan-200" />
            <span>Galeria & Desenho</span>
            {(currentEncounter.clinicalImages?.length || 0) > 0 && (
              <span className="bg-white text-blue-900 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {currentEncounter.clinicalImages?.length}
              </span>
            )}
          </button>

          {/* Botão: Traçar Plano Terapêutico (Apenas examinador) */}
          {!isReadOnly && (
            <button
              onClick={() => setIsTherapeuticPlanModalOpen(true)}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Traçar plano terapêutico autônomo baseado no quadro clínico"
            >
              <Compass className="w-4 h-4 text-blue-600" />
              <span>Plano Terapêutico</span>
            </button>
          )}

          {/* Relatório Clínico */}
          <button
            onClick={() => {
              if (!isReadOnly) handleSaveEncounter('in_progress');
              setIsReportModalOpen(true);
            }}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
            title="Relatório clínico completo de avaliação visual"
          >
            <FileText className="w-4 h-4 text-indigo-600" /> 
            <span className="hidden sm:inline">Relatório</span>
          </button>

          {/* FASE 26: Emissão Rápida de Documentos (Exames, Encaminhamentos, Atestados) */}
          <button
            type="button"
            onClick={() => {
              if (!isReadOnly) handleSaveEncounter('in_progress');
              setClinicalDocModalType('exam_request');
              setIsClinicalDocModalOpen(true);
            }}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
            title="Emitir solicitação de exames, encaminhamento ou atestado clínico"
          >
            <FilePlus2 className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Documentos</span>
          </button>

          {/* Indicador de Status Online / Offline / Sincronizado */}
          <div className="hidden md:flex items-center">
            <SyncStatusBadge />
          </div>

          {/* Ações de Salvamento e Conclusão (Apenas examinador) */}
          {!isReadOnly && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSaveEncounter('in_progress')}
                aria-label="Salvar rascunho do atendimento (Ctrl+S)"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-300 transition-all cursor-pointer active:scale-95"
                title="Salvar rascunho do atendimento (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Salvar</span>
                <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono text-slate-500 bg-white border border-slate-300 rounded shadow-2xs">Ctrl+S</kbd>
              </button>

              <button
                type="button"
                onClick={() => handleSaveEncounter('completed')}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/30 active:scale-95 transition-transform cursor-pointer"
                title="Concluir atendimento, arquivar prontuário e sincronizar financeiro"
              >
                <CheckCircle2 className="w-4 h-4" /> 
                <span>Concluir Atendimento</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Banner Informativo para Perfil Recepção */}
      {isReadOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between gap-3 text-amber-900 animate-fadeIn no-print">
          <div className="flex items-center gap-2 text-xs">
            <span className="p-1 bg-amber-200 text-amber-900 rounded-lg font-black text-[11px]">RECEPÇÃO</span>
            <span className="font-bold">
              Modo Visualização Ativo — Consulta de refração e emissão de receituários liberadas. Alteração de dioptrias e conduta médica restritas ao examinador.
            </span>
          </div>
          <button
            type="button"
            onClick={openEditModal}
            className="px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
            <span>Editar Cadastro do Paciente</span>
          </button>
        </div>
      )}

      {/* 2. Trilha de Exame Clínico Guiada (Stepper) */}
      <div className="bg-slate-900 text-slate-100 px-6 py-2.5 flex items-center justify-between border-b border-slate-800 overflow-x-auto shadow-inner no-print" role="navigation" aria-label="Trilha de Exame Clínico">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider mr-2 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> TRILHA DE EXAME:
          </span>

          <div className="flex items-center gap-1.5" role="tablist">
            {EXAM_TRAIL.map((step) => {
              const isActive = activeTab === step.tabKey;
              const isPast = step.id < currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step)}
                  role="tab"
                  aria-selected={isActive}
                  title={`Etapa ${step.id}: ${step.label} (Atalho: Alt+${step.id})`}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105'
                      : isPast
                      ? 'bg-slate-800 text-emerald-400 hover:bg-slate-750'
                      : 'bg-slate-850 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{step.label}</span>
                  <span className="text-[9px] opacity-60 hidden xl:inline font-mono">Alt+{step.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Alternador de Modo do Controle Remoto */}
        {!isReadOnly && (
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
        )}
      </div>

      {/* 3. Área Central do Exame */}
      <div ref={stepContainerRef} className="flex-1 w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto no-print">
        
        {/* Coluna Esquerda: Detalhes Clínicos da Etapa Ativa */}
        <div className={remoteMode === 'sidebar' ? "lg:col-span-5 flex flex-col gap-4" : "lg:col-span-6 flex flex-col gap-4"}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {EXAM_TRAIL.find(t => t.tabKey === activeTab)?.label}
              </h2>
            </div>

            <div className="flex-1 space-y-4 text-xs">
              {/* Banner de Consulta de Retorno */}
              {(isReturnSession || previousReferenceEncounter) && (
                <div className="p-3 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl shadow-sm flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-500 rounded-xl text-white shadow-xs">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs uppercase tracking-wider text-blue-200">
                          {isReturnSession ? '⚡ Consulta de Retorno Ativa' : 'Histórico de Retorno Disponível'}
                        </span>
                        {previousReferenceEncounter && (
                          <span className="text-[10px] bg-blue-800/80 px-2 py-0.5 rounded-md font-mono text-blue-100">
                            Ref: {new Date(previousReferenceEncounter.date).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-blue-100">
                        {previousReferenceEncounter ? (
                          <>
                            Grau anterior: <b>OD: {formatDiopterStr(previousReferenceEncounter.subjectiveRefraction?.od?.sphere)} {previousReferenceEncounter.subjectiveRefraction?.od?.cylinder ? `(${formatDiopterStr(previousReferenceEncounter.subjectiveRefraction?.od?.cylinder)})` : ''}</b> &bull; <b>OE: {formatDiopterStr(previousReferenceEncounter.subjectiveRefraction?.oe?.sphere)} {previousReferenceEncounter.subjectiveRefraction?.oe?.cylinder ? `(${formatDiopterStr(previousReferenceEncounter.subjectiveRefraction?.oe?.cylinder)})` : ''}</b>
                          </>
                        ) : 'Este paciente possui histórico clínico arquivado.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStepClick(EXAM_TRAIL[6])}
                      className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-900 font-black rounded-xl text-[11px] shadow-sm transition-all cursor-pointer"
                    >
                      Ver Comparativo
                    </button>
                  </div>
                </div>
              )}

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

                  {/* QUEIXA PRINCIPAL & HDA */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>QUEIXA PRINCIPAL (QP):</span>
                      </label>
                      <textarea
                        rows={2}
                        value={currentEncounter.anamnesis?.chiefComplaint || ''}
                        onChange={(e) => setCurrentEncounter({
                          ...currentEncounter,
                          anamnesis: { ...currentEncounter.anamnesis!, chiefComplaint: e.target.value }
                        })}
                        placeholder="Ex: Dificuldade para leitura de perto, cefaleia frontal após uso de telas..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>HISTÓRIA DA DOENÇA ATUAL (HDA):</span>
                      </label>
                      <textarea
                        rows={2}
                        value={currentEncounter.anamnesis?.historyOfPresentIllness || ''}
                        onChange={(e) => setCurrentEncounter({
                          ...currentEncounter,
                          anamnesis: { ...currentEncounter.anamnesis!, historyOfPresentIllness: e.target.value }
                        })}
                        placeholder="Início dos sintomas, evolução, fatores de melhora/piora, lateralidade..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* ANTECEDENTES CIRÚRGICOS, TRAUMAS E ALERGIAS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block uppercase">Cirurgias (Oculares/Gerais):</label>
                      <textarea
                        rows={2}
                        value={currentEncounter.anamnesis?.surgicalHistory || currentEncounter.anamnesis?.previousSurgeries || ''}
                        onChange={(e) => setCurrentEncounter({
                          ...currentEncounter,
                          anamnesis: { 
                            ...currentEncounter.anamnesis!, 
                            surgicalHistory: e.target.value,
                            previousSurgeries: e.target.value 
                          }
                        })}
                        placeholder="Ex: Facectomia OD (2023), Pterígio OE..."
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block uppercase">Histórico de Traumatismos:</label>
                      <textarea
                        rows={2}
                        value={currentEncounter.anamnesis?.traumaHistory || ''}
                        onChange={(e) => setCurrentEncounter({
                          ...currentEncounter,
                          anamnesis: { ...currentEncounter.anamnesis!, traumaHistory: e.target.value }
                        })}
                        placeholder="Ex: Trauma perfurante na infância, contusão..."
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="p-3 bg-rose-50/40 rounded-2xl border border-rose-200/70 space-y-1">
                      <label className="text-[11px] font-black text-rose-900 block uppercase flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Alergias Conhecidas:
                      </label>
                      <textarea
                        rows={2}
                        value={currentEncounter.anamnesis?.allergies || ''}
                        onChange={(e) => setCurrentEncounter({
                          ...currentEncounter,
                          anamnesis: { ...currentEncounter.anamnesis!, allergies: e.target.value }
                        })}
                        placeholder="Ex: Nega alergias; ou: Dipirona, Colírios com conservantes..."
                        className="w-full bg-white border border-rose-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
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
                      value={currentEncounter.anamnesis?.medicationsInUse || currentEncounter.anamnesis?.medications || ''}
                      onChange={(e) => setCurrentEncounter({
                        ...currentEncounter,
                        anamnesis: { 
                          ...currentEncounter.anamnesis!, 
                          medicationsInUse: e.target.value,
                          medications: e.target.value
                        }
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
                              anamnesis: { 
                                ...currentEncounter.anamnesis!, 
                                medicationsInUse: updated,
                                medications: updated
                              }
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
                      <span className="text-[10px] text-indigo-700 font-normal">Patologias, antecedentes familiares e sistêmicos</span>
                    </label>
                    <textarea
                      rows={2}
                      value={currentEncounter.anamnesis?.pathologicalHistory || currentEncounter.anamnesis?.systemicHistory || ''}
                      onChange={(e) => setCurrentEncounter({
                        ...currentEncounter,
                        anamnesis: { 
                          ...currentEncounter.anamnesis!, 
                          pathologicalHistory: e.target.value,
                          systemicHistory: e.target.value
                        }
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
                              anamnesis: { 
                                ...currentEncounter.anamnesis!, 
                                pathologicalHistory: updated,
                                systemicHistory: updated
                              }
                            });
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-lg text-[10px] font-bold text-indigo-800 transition-colors cursor-pointer"
                        >
                          + {pat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* OCUPAÇÃO, EXPOSIÇÃO A TELAS E HÁBITOS */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                    <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide block">
                      PERFIL OCUPACIONAL, EXPOSIÇÃO A TELAS & HÁBITOS:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Ocupação / Trabalho:</label>
                        <input
                          type="text"
                          placeholder="Ex: Analista de TI, Motorista, Estudante..."
                          value={currentEncounter.anamnesis?.occupationalHistory || ''}
                          onChange={(e) => setCurrentEncounter({
                            ...currentEncounter,
                            anamnesis: { ...currentEncounter.anamnesis!, occupationalHistory: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Exposição a Telas (horas/dia):</label>
                        <input
                          type="text"
                          placeholder="Ex: 8 a 10h/dia (computador + smartphone)"
                          value={currentEncounter.anamnesis?.screenExposure || ''}
                          onChange={(e) => setCurrentEncounter({
                            ...currentEncounter,
                            anamnesis: { ...currentEncounter.anamnesis!, screenExposure: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Hábitos & Atividades:</label>
                        <input
                          type="text"
                          placeholder="Ex: Nega tabagismo; Leitura noturna..."
                          value={currentEncounter.anamnesis?.habits || ''}
                          onChange={(e) => setCurrentEncounter({
                            ...currentEncounter,
                            anamnesis: { ...currentEncounter.anamnesis!, habits: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DADOS CLÍNICOS GERAIS DO PACIENTE */}
                  <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-indigo-600" />
                        <span className="font-extrabold text-indigo-950 text-xs uppercase tracking-wide">
                          OBSERVAÇÕES CLÍNICAS GERAIS & ANTECEDENTES:
                        </span>
                      </div>
                      <span className="text-[10px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md font-bold">
                        Avaliação & Antecedentes
                      </span>
                    </div>

                    <textarea
                      rows={2}
                      value={currentEncounter.anamnesis?.observations || currentEncounter.anamnesis?.clinicalNotes || ''}
                      onChange={(e) => setCurrentEncounter({
                        ...currentEncounter,
                        anamnesis: { 
                          ...currentEncounter.anamnesis!, 
                          observations: e.target.value,
                          clinicalNotes: e.target.value 
                        }
                      })}
                      placeholder="Observações clínicas gerais do paciente: histórico de cefaleia, queixas astenópicas, cirurgias oculares prévias, histórico familiar ou outras condições clínicas relevantes..."
                      className="w-full bg-white border border-indigo-300/80 rounded-xl p-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs resize-none"
                    />

                    {/* Chips Rápidos de Dados Clínicos */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[9px] font-bold text-indigo-800 uppercase flex items-center gap-1">
                        <Plus className="w-2.5 h-2.5" /> Adicionar:
                      </span>
                      {[
                        'Cefaleia frequente',
                        'Astenopia ao fim do dia',
                        'Sensibilidade à luz / Fotofobia',
                        'Lacrimejamento excessivo',
                        'Fadiga visual em telas',
                        'Visão embaçada para perto',
                        'Cirurgia refrativa prévia',
                        'Histórico familiar de glaucoma',
                        'Olho seco crônico',
                        'Miodesópsias (moscas volantes)'
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            const cur = currentEncounter.anamnesis?.observations || currentEncounter.anamnesis?.clinicalNotes || '';
                            const updated = cur.trim() ? `${cur.trim()}, ${chip}` : chip;
                            setCurrentEncounter({
                              ...currentEncounter,
                              anamnesis: { 
                                ...currentEncounter.anamnesis!, 
                                observations: updated,
                                clinicalNotes: updated 
                              }
                            });
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-lg text-[10px] font-bold text-indigo-800 transition-colors cursor-pointer active:scale-95 shadow-2xs"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PARÂMETROS VITAIS & CHECKBOXES SISTÊMICOS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* USO ATUAL */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wide">USO ATUAL DE CORREÇÃO:</span>
                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                          <Glasses className="w-3.5 h-3.5" />
                          Óculos & Lentes
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentEncounter.anamnesis?.currentGlasses || false}
                              onChange={(e) => setCurrentEncounter({
                                ...currentEncounter,
                                anamnesis: { 
                                  ...currentEncounter.anamnesis!, 
                                  currentGlasses: e.target.checked,
                                  previousGlasses: e.target.checked
                                }
                              })}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>Usa óculos atualmente</span>
                          </label>

                          {currentEncounter.anamnesis?.currentGlasses && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              {currentEncounter.lensometry?.usageTime || 'Dados adicionais ativos'}
                            </span>
                          )}
                        </div>

                        {/* Dados adicionais integrados de óculos de uso quando marcado */}
                        {currentEncounter.anamnesis?.currentGlasses && (
                          <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold text-blue-900 uppercase flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-600" />
                                Tempo de Uso do Óculos Atual:
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {['< 6 meses', '1 ano', '2 anos', '3 a 5 anos', '> 5 anos'].map((tempo) => {
                                const isSel = currentEncounter.lensometry?.usageTime === tempo;
                                return (
                                  <button
                                    key={tempo}
                                    type="button"
                                    onClick={() => {
                                      const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                                      setCurrentEncounter({
                                        ...currentEncounter,
                                        lensometry: { ...curLens, usageTime: isSel ? '' : tempo }
                                      });
                                    }}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                      isSel 
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                                        : 'bg-white text-slate-700 border-blue-200 hover:bg-blue-100/60'
                                    }`}
                                  >
                                    {isSel ? '✓ ' : ''}{tempo}
                                  </button>
                                );
                              })}
                            </div>

                            <div>
                              <input
                                type="text"
                                placeholder="Observações do óculos atual (ex: riscado, visão ruim para perto, armação frouxa)..."
                                value={currentEncounter.lensometry?.notes || ''}
                                onChange={(e) => {
                                  const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                                  setCurrentEncounter({
                                    ...currentEncounter,
                                    lensometry: { ...curLens, notes: e.target.value }
                                  });
                                }}
                                className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        )}

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
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-black text-blue-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-blue-600" />
                        AGUDEZA VISUAL SEM CORREÇÃO (AVsc):
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRemoteMode('floating');
                            setIsFloatingRemoteOpen(true);
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <Tv className="w-3 h-3 text-indigo-200" />
                          <span>Controle do Optotipo</span>
                        </button>
                        <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md">
                          20/ fixado automaticamente
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* OD (Longe) */}
                      <div className="p-3 bg-white rounded-xl border border-emerald-300 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            OD (Olho Direito - Longe)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              lanController.setEye('OD');
                              setRemoteMode('floating');
                              setIsFloatingRemoteOpen(true);
                            }}
                            className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Comandar TV para exibir teste de OD e abrir controle"
                          >
                            <Tv className="w-3 h-3 text-emerald-700" />
                            <span>Testar OD na TV</span>
                          </button>
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
                          <button
                            type="button"
                            onClick={() => {
                              lanController.setEye('OE');
                              setRemoteMode('floating');
                              setIsFloatingRemoteOpen(true);
                            }}
                            className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Comandar TV para exibir teste de OE e abrir controle"
                          >
                            <Tv className="w-3 h-3 text-amber-700" />
                            <span>Testar OE na TV</span>
                          </button>
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

                      {/* DADOS ADICIONAIS DO ÓCULOS DE USO (TEMPO DE USO & OBSERVAÇÕES) */}
                      <div className="p-3.5 bg-blue-50/70 border border-blue-200/90 rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-[11px] font-black text-blue-950 uppercase tracking-wide">
                              DADOS ADICIONAIS DO ÓCULOS DE USO:
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <FilePlus2 className="w-3 h-3" />
                            Tempo & Observações
                          </span>
                        </div>

                        {/* Tempo de Uso */}
                        <div>
                          <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                            Tempo aproximado de uso do óculos atual:
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {['Menos de 6 meses', '6 meses a 1 ano', '1 a 2 anos', '2 a 3 anos', 'Mais de 3 anos', 'Mais de 5 anos'].map((tempo) => {
                              const isSel = currentEncounter.lensometry?.usageTime === tempo;
                              return (
                                <button
                                  key={tempo}
                                  type="button"
                                  onClick={() => {
                                    const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                                    setCurrentEncounter({
                                      ...currentEncounter,
                                      lensometry: { ...curLens, usageTime: isSel ? '' : tempo }
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                    isSel
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {isSel ? '✓ ' : '+ '}{tempo}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Observações / Queixas do Óculos Atual */}
                        <div>
                          <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                            Observações e Estado do Óculos em Uso:
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Lentes riscadas, armação desgastada/torta, visão satisfatória para longe porém turva para perto..."
                            value={currentEncounter.lensometry?.notes || ''}
                            onChange={(e) => {
                              const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                lensometry: { ...curLens, notes: e.target.value }
                              });
                            }}
                            className="w-full bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                          />
                        </div>

                        {/* Chips Rápidos de Observações do Óculos */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Sugestões rápidas:</span>
                          {[
                            'Lentes muito riscadas',
                            'Desconforto para leitura',
                            'Armação torta / frouxa',
                            'Antirreflexo descascando',
                            'Perda de foco / visão cansada',
                            'Óculos reserva apenas'
                          ].map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => {
                                const curLens = currentEncounter.lensometry || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                                const cur = curLens.notes || '';
                                const updated = cur.trim() ? `${cur.trim()}, ${sug}` : sug;
                                setCurrentEncounter({
                                  ...currentEncounter,
                                  lensometry: { ...curLens, notes: updated }
                                });
                              }}
                              className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                            >
                              + {sug}
                            </button>
                          ))}
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
                            placeholder="+ / - 0.00"
                            value={arOdSph}
                            onChange={(e) => {
                              const text = e.target.value;
                              setArOdSph(text);
                              const parsed = parseInputDiopter(text);
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, od: { ...curAR.od, sphere: parsed } }
                              });
                            }}
                            onBlur={() => {
                              const parsed = parseInputDiopter(arOdSph);
                              setArOdSph(formatDiopterStr(parsed));
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, od: { ...curAR.od, sphere: parsed } }
                              });
                            }}
                            className="w-full bg-white border border-emerald-300 rounded-xl px-2 py-1 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Cil (D)</label>
                          <input
                            type="text"
                            placeholder="- 0.00"
                            value={arOdCyl}
                            onChange={(e) => {
                              const text = e.target.value;
                              setArOdCyl(text);
                              const parsed = parseInputDiopter(text);
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, od: { ...curAR.od, cylinder: parsed } }
                              });
                            }}
                            onBlur={() => {
                              const parsed = parseInputDiopter(arOdCyl);
                              setArOdCyl(formatDiopterStr(parsed));
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, od: { ...curAR.od, cylinder: parsed } }
                              });
                            }}
                            className="w-full bg-white border border-emerald-300 rounded-xl px-2 py-1 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Eixo (°)</label>
                          <input
                            type="text"
                            placeholder="180"
                            value={arOdAxis}
                            onChange={(e) => {
                              const text = e.target.value;
                              setArOdAxis(text);
                              const parsed = parseInputAxis(text);
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, od: { ...curAR.od, axis: parsed } }
                              });
                            }}
                            onBlur={() => {
                              const parsed = parseInputAxis(arOdAxis);
                              setArOdAxis(parsed !== undefined ? String(parsed) : '');
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, od: { ...curAR.od, axis: parsed } }
                              });
                            }}
                            className="w-full bg-white border border-emerald-300 rounded-xl px-2 py-1 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
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
                            placeholder="+ / - 0.00"
                            value={arOeSph}
                            onChange={(e) => {
                              const text = e.target.value;
                              setArOeSph(text);
                              const parsed = parseInputDiopter(text);
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, oe: { ...curAR.oe, sphere: parsed } }
                              });
                            }}
                            onBlur={() => {
                              const parsed = parseInputDiopter(arOeSph);
                              setArOeSph(formatDiopterStr(parsed));
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, oe: { ...curAR.oe, sphere: parsed } }
                              });
                            }}
                            className="w-full bg-white border border-amber-300 rounded-xl px-2 py-1 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Cil (D)</label>
                          <input
                            type="text"
                            placeholder="- 0.00"
                            value={arOeCyl}
                            onChange={(e) => {
                              const text = e.target.value;
                              setArOeCyl(text);
                              const parsed = parseInputDiopter(text);
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, oe: { ...curAR.oe, cylinder: parsed } }
                              });
                            }}
                            onBlur={() => {
                              const parsed = parseInputDiopter(arOeCyl);
                              setArOeCyl(formatDiopterStr(parsed));
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, oe: { ...curAR.oe, cylinder: parsed } }
                              });
                            }}
                            className="w-full bg-white border border-amber-300 rounded-xl px-2 py-1 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Eixo (°)</label>
                          <input
                            type="text"
                            placeholder="175"
                            value={arOeAxis}
                            onChange={(e) => {
                              const text = e.target.value;
                              setArOeAxis(text);
                              const parsed = parseInputAxis(text);
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, oe: { ...curAR.oe, axis: parsed } }
                              });
                            }}
                            onBlur={() => {
                              const parsed = parseInputAxis(arOeAxis);
                              setArOeAxis(parsed !== undefined ? String(parsed) : '');
                              const curAR = currentEncounter.autorefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                              setCurrentEncounter({
                                ...currentEncounter,
                                autorefraction: { ...curAR, oe: { ...curAR.oe, axis: parsed } }
                              });
                            }}
                            className="w-full bg-white border border-amber-300 rounded-xl px-2 py-1 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 5: Refração */}
              {activeTab === 'refraction' && (
                <div className="space-y-4">
                  {/* Comparativo com Consulta Anterior se for Retorno ou houver histórico */}
                  {previousReferenceEncounter?.subjectiveRefraction && (
                    <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-purple-600 rounded-xl text-white shadow-xs">
                          <RotateCcw className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-purple-950 text-xs uppercase tracking-wide">
                              Dioptria Prescrita na Consulta Anterior
                            </span>
                            <span className="text-[10px] bg-purple-200/80 text-purple-800 font-bold px-2 py-0.5 rounded-md font-mono">
                              Ref: {new Date(previousReferenceEncounter.date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-[11px] text-purple-900 font-mono mt-0.5">
                            OD: <b>{formatDiopterStr(previousReferenceEncounter.subjectiveRefraction.od?.sphere)} {previousReferenceEncounter.subjectiveRefraction.od?.cylinder ? `(${formatDiopterStr(previousReferenceEncounter.subjectiveRefraction.od?.cylinder)})` : ''} x {previousReferenceEncounter.subjectiveRefraction.od?.axis || 0}°</b> &bull; 
                            OE: <b>{formatDiopterStr(previousReferenceEncounter.subjectiveRefraction.oe?.sphere)} {previousReferenceEncounter.subjectiveRefraction.oe?.cylinder ? `(${formatDiopterStr(previousReferenceEncounter.subjectiveRefraction.oe?.cylinder)})` : ''} x {previousReferenceEncounter.subjectiveRefraction.oe?.axis || 0}°</b>
                            {previousReferenceEncounter.subjectiveRefraction.addition ? ` • Adição: +${previousReferenceEncounter.subjectiveRefraction.addition.toFixed(2)}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (isReadOnly) return;
                          const prevRx = previousReferenceEncounter.subjectiveRefraction;
                          if (!prevRx) return;
                          setCurrentEncounter(prev => ({
                            ...prev,
                            subjectiveRefraction: {
                              id: prev.subjectiveRefraction?.id || generateUUID(),
                              encounterId: prev.id,
                              od: { ...prevRx.od },
                              oe: { ...prevRx.oe },
                              addition: prevRx.addition,
                              pdDistanceMm: prevRx.pdDistanceMm || 62
                            }
                          }));
                          setSaveMessage('✓ Dioptria anterior copiada para a nova refração!');
                          setTimeout(() => setSaveMessage(null), 2500);
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all whitespace-nowrap cursor-pointer shrink-0"
                        title="Copiar dioptria da consulta anterior diretamente para a refração desta consulta"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Dioptria Anterior</span>
                      </button>
                    </div>
                  )}

                  {/* FASE 4.0: COMPARATIVO MULTI-MEDIÇÃO CLÍNICA & HOMOLOGAÇÃO DE REFRAÇÃO FINAL */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3.5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-black text-xs uppercase tracking-wide text-slate-900 block">
                            QUADRO COMPARATIVO DE MEDIÇÕES DO ENCONTRO
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Lensometria (Uso) &bull; Autorrefração (AR) &bull; Refração Subjetiva &bull; Refração Final
                          </span>
                        </div>
                      </div>

                      {/* Botões de Ação Segura: Copiar AR ou Copiar Óculos para Subjetiva */}
                      {!isReadOnly && (
                        <div className="flex items-center gap-1.5">
                          {(currentEncounter.autorefraction?.od?.sphere !== undefined || currentEncounter.autorefraction?.oe?.sphere !== undefined || currentEncounter.autorefraction?.od?.cylinder !== undefined || currentEncounter.autorefraction?.oe?.cylinder !== undefined) && (
                            <button
                              type="button"
                              onClick={() => {
                                const ar = currentEncounter.autorefraction;
                                if (!ar) return;
                                const curSub = currentEncounter.subjectiveRefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                                setCurrentEncounter({
                                  ...currentEncounter,
                                  subjectiveRefraction: {
                                    ...curSub,
                                    od: { ...curSub.od, sphere: ar.od?.sphere, cylinder: ar.od?.cylinder, axis: ar.od?.axis },
                                    oe: { ...curSub.oe, sphere: ar.oe?.sphere, cylinder: ar.oe?.cylinder, axis: ar.oe?.axis }
                                  }
                                });
                                setSaveMessage('✓ Valores de Autorrefração copiados para Subjetiva!');
                                setTimeout(() => setSaveMessage(null), 2500);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Copiar valores da Autorrefração para a Refração Subjetiva"
                            >
                              <Sliders className="w-3 h-3 text-indigo-600" />
                              <span>Importar AR</span>
                            </button>
                          )}

                          {currentEncounter.lensometry?.od?.sphere !== undefined && (
                            <button
                              type="button"
                              onClick={() => {
                                const lens = currentEncounter.lensometry;
                                if (!lens) return;
                                const curSub = currentEncounter.subjectiveRefraction || { id: generateUUID(), encounterId: currentEncounter.id, od: {}, oe: {} };
                                setCurrentEncounter({
                                  ...currentEncounter,
                                  subjectiveRefraction: {
                                    ...curSub,
                                    od: { ...curSub.od, sphere: lens.od?.sphere, cylinder: lens.od?.cylinder, axis: lens.od?.axis },
                                    oe: { ...curSub.oe, sphere: lens.oe?.sphere, cylinder: lens.oe?.cylinder, axis: lens.oe?.axis },
                                    addition: lens.addition
                                  }
                                });
                                setSaveMessage('✓ Valores da Lensometria copiados para Subjetiva!');
                                setTimeout(() => setSaveMessage(null), 2500);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Copiar valores do Óculos em Uso (Lensometria) para a Refração Subjetiva"
                            >
                              <Glasses className="w-3 h-3 text-emerald-600" />
                              <span>Importar Óculos</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Matriz Comparativa Paramétrica das 4 Medições */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-black text-[10px] uppercase">
                            <th className="p-2 border-r border-slate-200">Tipo de Medição</th>
                            <th className="p-2 border-r border-slate-200 text-emerald-950 bg-emerald-50/50">Olho Direito (OD)</th>
                            <th className="p-2 border-r border-slate-200 text-amber-950 bg-amber-50/50">Olho Esquerdo (OE)</th>
                            <th className="p-2 text-indigo-950 bg-indigo-50/50">Adição / DP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {/* 1. Lensometria */}
                          <tr>
                            <td className="p-2 font-bold font-sans text-slate-600 bg-slate-50/60 border-r border-slate-200">
                              Óculos em Uso (Lensometria)
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              {currentEncounter.lensometry?.od?.sphere !== undefined || currentEncounter.lensometry?.od?.cylinder !== undefined
                                ? formatRefractionString(currentEncounter.lensometry.od, { showSE: true })
                                : '—'}
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              {currentEncounter.lensometry?.oe?.sphere !== undefined || currentEncounter.lensometry?.oe?.cylinder !== undefined
                                ? formatRefractionString(currentEncounter.lensometry.oe, { showSE: true })
                                : '—'}
                            </td>
                            <td className="p-2">
                              {currentEncounter.lensometry?.addition ? `+${currentEncounter.lensometry.addition.toFixed(2)} D` : '—'}
                            </td>
                          </tr>

                          {/* 2. Autorrefração */}
                          <tr>
                            <td className="p-2 font-bold font-sans text-slate-600 bg-slate-50/60 border-r border-slate-200">
                              Autorrefração (AR Computadorizada)
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              {currentEncounter.autorefraction?.od?.sphere !== undefined || currentEncounter.autorefraction?.od?.cylinder !== undefined
                                ? formatRefractionString(currentEncounter.autorefraction.od, { showSE: true })
                                : '—'}
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              {currentEncounter.autorefraction?.oe?.sphere !== undefined || currentEncounter.autorefraction?.oe?.cylinder !== undefined
                                ? formatRefractionString(currentEncounter.autorefraction.oe, { showSE: true })
                                : '—'}
                            </td>
                            <td className="p-2">
                              {currentEncounter.autorefraction?.pdMm ? `${currentEncounter.autorefraction.pdMm} mm` : '—'}
                            </td>
                          </tr>

                          {/* 3. Refração Subjetiva */}
                          <tr className="bg-blue-50/30">
                            <td className="p-2 font-bold font-sans text-blue-900 bg-blue-50/60 border-r border-slate-200">
                              Refração Subjetiva (Em Teste)
                            </td>
                            <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                              {currentEncounter.subjectiveRefraction?.od?.sphere !== undefined
                                ? formatRefractionString(currentEncounter.subjectiveRefraction.od, { showSE: true, showVA: true })
                                : '—'}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                              {currentEncounter.subjectiveRefraction?.oe?.sphere !== undefined
                                ? formatRefractionString(currentEncounter.subjectiveRefraction.oe, { showSE: true, showVA: true })
                                : '—'}
                            </td>
                            <td className="p-2 font-bold text-indigo-900">
                              {currentEncounter.subjectiveRefraction?.addition ? `+${currentEncounter.subjectiveRefraction.addition.toFixed(2)} D` : '—'}
                            </td>
                          </tr>

                          {/* 4. Refração Final Homologada */}
                          <tr className={currentEncounter.finalRefraction ? "bg-emerald-50/60 font-black text-emerald-950" : "bg-slate-50/30 text-slate-400"}>
                            <td className="p-2 font-bold font-sans border-r border-slate-200 flex items-center gap-1.5">
                              <CheckCircle2 className={`w-3.5 h-3.5 ${currentEncounter.finalRefraction ? "text-emerald-600" : "text-slate-400"}`} />
                              <span>Refração Final Homologada</span>
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              {currentEncounter.finalRefraction?.od?.sphere !== undefined
                                ? formatRefractionString(currentEncounter.finalRefraction.od, { showSE: true, showVA: true })
                                : 'Pendente de homologação'}
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              {currentEncounter.finalRefraction?.oe?.sphere !== undefined
                                ? formatRefractionString(currentEncounter.finalRefraction.oe, { showSE: true, showVA: true })
                                : 'Pendente de homologação'}
                            </td>
                            <td className="p-2">
                              {currentEncounter.finalRefraction?.addition ? `+${currentEncounter.finalRefraction.addition.toFixed(2)} D` : (currentEncounter.finalRefraction ? 'Plano perto' : '—')}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Botão de Homologação da Refração Final */}
                    {!isReadOnly && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          {currentEncounter.finalRefraction ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Refração Final homologada em {new Date(currentEncounter.finalRefraction.confirmedAt || currentEncounter.updatedAt || '').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">
                              A prescrição óptica utilizará os valores da refração final homologada.
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {currentEncounter.finalRefraction && (
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentEncounter({
                                  ...currentEncounter,
                                  finalRefraction: undefined
                                });
                                setSaveMessage('Refração Final desvinculada (reaberta para edição).');
                                setTimeout(() => setSaveMessage(null), 2500);
                              }}
                              className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-[11px] font-bold cursor-pointer"
                            >
                              Reabrir Edição
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const sub = currentEncounter.subjectiveRefraction;
                              if (!sub) return;
                              const finalRef: FinalRefraction = {
                                ...sub,
                                id: currentEncounter.finalRefraction?.id || generateUUID(),
                                encounterId: currentEncounter.id,
                                confirmedAt: new Date().toISOString(),
                                confirmedBy: currentEncounter.examinerName
                              };
                              setCurrentEncounter({
                                ...currentEncounter,
                                finalRefraction: finalRef
                              });
                              setSaveMessage('✓ Refração Subjetiva HOMOLOGADA como Refração Final!');
                              setTimeout(() => setSaveMessage(null), 3000);
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                            title="Homologar os valores atuais da refração subjetiva como Refração Final para emissão da prescrição"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Definir como Refração Final</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
                    <p className="font-bold text-xs mb-1">Painel de Refração & Dials:</p>
                    <p className="text-xs">
                      Utilize o painel de Dials ao lado para registrar o grau subjetivo do paciente. Digite diretamente com o sinal (+ ou -) para máxima agilidade.
                    </p>
                  </div>

                  {/* Informações Adicionais da Dioptria na Trilha */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Glasses className="w-4 h-4 text-blue-600" />
                        INFORMAÇÕES ADICIONAIS DO RECEITUÁRIO ÓPTICO (DIOPTRIA):
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Exclusivo do receituário de óculos (não exposto na conduta médica)
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      disabled={isReadOnly}
                      readOnly={isReadOnly}
                      value={currentEncounter.subjectiveRefraction?.additionalOpticalInfo || ''}
                      onChange={(e) => {
                        if (isReadOnly) return;
                        const curRef = currentEncounter.subjectiveRefraction || {
                          id: generateUUID(),
                          encounterId: currentEncounter.id,
                          od: {},
                          oe: {}
                        };
                        setCurrentEncounter({
                          ...currentEncounter,
                          subjectiveRefraction: {
                            ...curRef,
                            additionalOpticalInfo: e.target.value
                          }
                        });
                      }}
                      placeholder="Ex: Adaptação progressiva; armação com ponte anatômica recomendada; uso preferencial em tela de computador; fotossensível para ambientes externos..."
                      className={`w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 shadow-xs ${isReadOnly ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>
              )}

              {/* Etapa 6: Binocular */}
              {activeTab === 'binocular' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <label className="font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
                      <span>TESTE DE ESTEREOPSIA (TITMUS / FLY):</span>
                      <span className="text-[10px] text-slate-500 font-normal">Acuidade Estereoscópica</span>
                    </label>
                    <input 
                      type="text" 
                      disabled={isReadOnly}
                      readOnly={isReadOnly}
                      value={(currentEncounter as any).binocular?.stereopsis || ''}
                      onChange={(e) => {
                        if (isReadOnly) return;
                        setCurrentEncounter({
                          ...currentEncounter,
                          binocular: {
                            ...((currentEncounter as any).binocular || {}),
                            stereopsis: e.target.value
                          }
                        } as any);
                      }}
                      placeholder="Ex: 40 segundos de arco (Normal) / Borboleta / Círculos 1 a 9" 
                      className={`w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs ${isReadOnly ? 'bg-slate-100 cursor-not-allowed' : ''}`} 
                    />
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <label className="font-bold text-slate-800 block mb-1.5">PONTO PRÓXIMO DE CONVERGÊNCIA (NPC):</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-slate-600 block mb-1">Ruptura (Break):</span>
                        <div className="relative">
                          <input 
                            type="number" 
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            value={(currentEncounter as any).binocular?.npcBreak ?? ''}
                            onChange={(e) => {
                              if (isReadOnly) return;
                              setCurrentEncounter({
                                ...currentEncounter,
                                binocular: {
                                  ...((currentEncounter as any).binocular || {}),
                                  npcBreak: e.target.value ? parseFloat(e.target.value) : undefined
                                }
                              } as any);
                            }}
                            placeholder="Ex: 6" 
                            className={`w-full bg-white border border-slate-300 rounded-xl p-2.5 pr-8 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs ${isReadOnly ? 'bg-slate-100 cursor-not-allowed' : ''}`} 
                          />
                          <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 font-bold">cm</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-600 block mb-1">Recuperação (Recovery):</span>
                        <div className="relative">
                          <input 
                            type="number" 
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            value={(currentEncounter as any).binocular?.npcRecovery ?? ''}
                            onChange={(e) => {
                              if (isReadOnly) return;
                              setCurrentEncounter({
                                ...currentEncounter,
                                binocular: {
                                  ...((currentEncounter as any).binocular || {}),
                                  npcRecovery: e.target.value ? parseFloat(e.target.value) : undefined
                                }
                              } as any);
                            }}
                            placeholder="Ex: 8" 
                            className={`w-full bg-white border border-slate-300 rounded-xl p-2.5 pr-8 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs ${isReadOnly ? 'bg-slate-100 cursor-not-allowed' : ''}`} 
                          />
                          <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 font-bold">cm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 7: Conduta & Prescrição */}
              {activeTab === 'conduct' && (
                <div className="space-y-4">
                  {/* Seção de Evolução de Retorno & Comparativo Refrativo */}
                  {(isReturnSession || previousReferenceEncounter) && (
                    <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 shadow-md animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                            <History className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-xs uppercase tracking-wide text-blue-300">
                              EVOLUÇÃO CLÍNICA & COMPARATIVO DE RETORNO
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Referência da consulta anterior: {previousReferenceEncounter ? new Date(previousReferenceEncounter.date).toLocaleDateString('pt-BR') : 'Histórico'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-blue-900/60 text-blue-200 border border-blue-700 px-2 py-0.5 rounded-full font-mono font-bold">
                          Retorno Não-Destrutivo
                        </span>
                      </div>

                      {/* Comparativo Refrativo: Anterior vs Atual */}
                      {previousReferenceEncounter?.subjectiveRefraction && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">1. Grau Anterior ({new Date(previousReferenceEncounter.date).toLocaleDateString('pt-BR')}):</span>
                            <div className="font-mono text-emerald-400 font-black text-[11px]">
                              OD: {formatDiopterStr(previousReferenceEncounter.subjectiveRefraction.od?.sphere)} {previousReferenceEncounter.subjectiveRefraction.od?.cylinder ? `(${formatDiopterStr(previousReferenceEncounter.subjectiveRefraction.od?.cylinder)})` : ''} x {previousReferenceEncounter.subjectiveRefraction.od?.axis || 0}°
                            </div>
                            <div className="font-mono text-emerald-400 font-black text-[11px]">
                              OE: {formatDiopterStr(previousReferenceEncounter.subjectiveRefraction.oe?.sphere)} {previousReferenceEncounter.subjectiveRefraction.oe?.cylinder ? `(${formatDiopterStr(previousReferenceEncounter.subjectiveRefraction.oe?.cylinder)})` : ''} x {previousReferenceEncounter.subjectiveRefraction.oe?.axis || 0}°
                            </div>
                            {previousReferenceEncounter.subjectiveRefraction.addition && (
                              <div className="text-[10px] text-slate-300 font-mono">
                                Adição: +{previousReferenceEncounter.subjectiveRefraction.addition.toFixed(2)}
                              </div>
                            )}
                          </div>

                          <div className="p-2.5 bg-blue-950/40 rounded-xl border border-blue-700/60 space-y-1">
                            <span className="text-[10px] font-bold text-blue-300 uppercase block">2. Nova Dioptria Atual (Desta Consulta):</span>
                            <div className="font-mono text-cyan-300 font-black text-[11px]">
                              OD: {formatDiopterStr(currentEncounter.subjectiveRefraction?.od?.sphere)} {currentEncounter.subjectiveRefraction?.od?.cylinder ? `(${formatDiopterStr(currentEncounter.subjectiveRefraction?.od?.cylinder)})` : ''} x {currentEncounter.subjectiveRefraction?.od?.axis || 0}°
                            </div>
                            <div className="font-mono text-cyan-300 font-black text-[11px]">
                              OE: {formatDiopterStr(currentEncounter.subjectiveRefraction?.oe?.sphere)} {currentEncounter.subjectiveRefraction?.oe?.cylinder ? `(${formatDiopterStr(currentEncounter.subjectiveRefraction?.oe?.cylinder)})` : ''} x {currentEncounter.subjectiveRefraction?.oe?.axis || 0}°
                            </div>
                            {currentEncounter.subjectiveRefraction?.addition && (
                              <div className="text-[10px] text-cyan-200 font-mono">
                                Nova Adição: +{currentEncounter.subjectiveRefraction.addition.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Conduta Anterior de Referência */}
                      {previousReferenceEncounter?.conduct && (
                        <div className="p-2 bg-slate-800/50 rounded-xl border border-slate-700/60 text-[11px] text-slate-300">
                          <b className="text-slate-400">Conduta anterior:</b> {previousReferenceEncounter.conduct}
                        </div>
                      )}
                    </div>
                  )}

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

                  {/* FASE 3.7: Diagnósticos Clínicos Estruturados */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-black text-xs uppercase tracking-wide text-slate-900 block">
                            DIAGNÓSTICOS CLÍNICOS ESTRUTURADOS (CID-10 / CID-11)
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Inserção manual pelo examinador (sem sugestão automatizada) com lateralidade e status clínico
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">
                        {currentEncounter.diagnoses?.length || 0} diagnósticos
                      </span>
                    </div>

                    {/* Lista de Diagnósticos Registrados */}
                    {currentEncounter.diagnoses && currentEncounter.diagnoses.length > 0 && (
                      <div className="space-y-2">
                        {currentEncounter.diagnoses.map((diag, idx) => (
                          <div
                            key={diag.id || idx}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                              diag.primary
                                ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-medium'
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = (currentEncounter.diagnoses || []).map((d, i) => ({
                                      ...d,
                                      primary: i === idx
                                    }));
                                    setCurrentEncounter({ ...currentEncounter, diagnoses: next });
                                  }}
                                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                                    diag.primary ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-blue-100 hover:text-blue-800'
                                  }`}
                                  title="Clique para definir como diagnóstico principal"
                                >
                                  {diag.primary ? '★ Principal' : 'Secundário (Tornar Principal)'}
                                </button>
                                {diag.code && (
                                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                    {diag.code}
                                  </span>
                                )}
                                <span className="font-bold text-xs">{diag.description}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  diag.eye === 'OD' ? 'bg-emerald-100 text-emerald-800' :
                                  diag.eye === 'OE' ? 'bg-amber-100 text-amber-800' :
                                  diag.eye === 'OU' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  Olho: {diag.eye}
                                </span>
                                <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                  Status: {
                                    diag.status === 'confirmed' ? 'Confirmado' :
                                    diag.status === 'suspected' ? 'Suspeita' :
                                    diag.status === 'historical' ? 'Histórico' : 'Resolvido'
                                  }
                                </span>
                              </div>
                              {diag.notes && (
                                <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100 mt-1.5 italic">
                                  Obs: {diag.notes}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const next = (currentEncounter.diagnoses || []).filter((_, i) => i !== idx);
                                setCurrentEncounter({ ...currentEncounter, diagnoses: next });
                              }}
                              className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Remover diagnóstico"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formulário Rápido para Adicionar Diagnóstico */}
                    <div className="space-y-2 pt-1 border-t border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-2">
                          <input
                            id="diag-code-input"
                            type="text"
                            placeholder="CID (ex: H52.1)"
                            className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <input
                            id="diag-desc-input"
                            type="text"
                            placeholder="Descrição do Diagnóstico (ex: Miopia, Astigmatismo...)"
                            className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <select
                            id="diag-eye-select"
                            defaultValue="OU"
                            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                          >
                            <option value="OU">OU (Ambos)</option>
                            <option value="OD">OD (Direito)</option>
                            <option value="OE">OE (Esquerdo)</option>
                            <option value="unspecified">Não especificado</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <select
                            id="diag-status-select"
                            defaultValue="confirmed"
                            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                          >
                            <option value="confirmed">Confirmado</option>
                            <option value="suspected">Suspeita</option>
                            <option value="historical">Histórico</option>
                            <option value="resolved">Resolvido</option>
                          </select>
                        </div>
                        <div className="sm:col-span-1 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              const codeEl = document.getElementById('diag-code-input') as HTMLInputElement;
                              const descEl = document.getElementById('diag-desc-input') as HTMLInputElement;
                              const eyeEl = document.getElementById('diag-eye-select') as HTMLSelectElement;
                              const statusEl = document.getElementById('diag-status-select') as HTMLSelectElement;
                              const notesEl = document.getElementById('diag-notes-input') as HTMLInputElement;

                              if (!descEl || !descEl.value.trim()) return;

                              const existing = currentEncounter.diagnoses || [];
                              const newDiag: DiagnosisEntry = {
                                id: generateUUID(),
                                encounterId: currentEncounter.id,
                                code: codeEl?.value.trim() || undefined,
                                codingSystem: codeEl?.value.trim() ? 'CID-10' : undefined,
                                description: descEl.value.trim(),
                                eye: (eyeEl?.value as DiagnosisEye) || 'OU',
                                status: (statusEl?.value as DiagnosisStatus) || 'confirmed',
                                primary: existing.length === 0,
                                notes: notesEl?.value.trim() || undefined,
                                createdAt: new Date().toISOString()
                              };

                              const next = [...existing, newDiag];
                              setCurrentEncounter({ ...currentEncounter, diagnoses: next });
                              descEl.value = '';
                              if (codeEl) codeEl.value = '';
                              if (notesEl) notesEl.value = '';
                            }}
                            className="w-full h-full min-h-[32px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                            title="Adicionar diagnóstico"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <input
                          id="diag-notes-input"
                          type="text"
                          placeholder="Observações complementares do diagnóstico (opcional)..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-400 placeholder:italic"
                        />
                      </div>
                    </div>

                    {/* Chips Rápidos de Diagnósticos Oftalmológicos Frequentes */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase self-center mr-1">Frequentes:</span>
                      {[
                        { code: 'H52.1', desc: 'Miopia' },
                        { code: 'H52.0', desc: 'Hipermetropia' },
                        { code: 'H52.2', desc: 'Astigmatismo' },
                        { code: 'H52.4', desc: 'Presbiopia' },
                        { code: 'H04.1', desc: 'Olho Seco (Ceratoconjuntivite Sicca)' },
                        { code: 'H10.9', desc: 'Conjuntivite não especificada' },
                        { code: 'H11.0', desc: 'Pterígio' },
                        { code: 'H25.9', desc: 'Catarata Senil' }
                      ].map(item => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => {
                            const existing = currentEncounter.diagnoses || [];
                            if (existing.some(d => d.description.toLowerCase() === item.desc.toLowerCase())) return;
                            const newDiag: DiagnosisEntry = {
                              id: generateUUID(),
                              encounterId: currentEncounter.id,
                              code: item.code,
                              codingSystem: 'CID-10',
                              description: item.desc,
                              eye: 'OU',
                              status: 'confirmed',
                              primary: existing.length === 0,
                              createdAt: new Date().toISOString()
                            };
                            setCurrentEncounter({ ...currentEncounter, diagnoses: [...existing, newDiag] });
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span className="font-mono text-blue-600">{item.code}</span>
                          <span>{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campo de Conduta Clínica & Estruturação */}
                  <div className="space-y-2">
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
                      rows={4}
                      value={currentEncounter.conduct || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCurrentEncounter({
                          ...currentEncounter,
                          conduct: val,
                          structuredConduct: {
                            ...(currentEncounter.structuredConduct || { id: generateUUID(), encounterId: currentEncounter.id }),
                            treatmentPlan: val
                          }
                        });
                      }}
                      placeholder="Prescrição de lentes multifocais, regras ergonômicas, plano terapêutico com colírios..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                    />

                    {/* Campos Clínicos Estruturados Adicionais */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Orientações Específicas:</label>
                        <input
                          type="text"
                          value={currentEncounter.structuredConduct?.orientations || ''}
                          onChange={(e) => {
                            const sc = currentEncounter.structuredConduct || { id: generateUUID(), encounterId: currentEncounter.id };
                            setCurrentEncounter({
                              ...currentEncounter,
                              structuredConduct: { ...sc, orientations: e.target.value }
                            });
                          }}
                          placeholder="Ex: Regra 20-20-20, higiene palpebral, pausas..."
                          className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Encaminhamento / Especialista:</label>
                        <input
                          type="text"
                          value={currentEncounter.structuredConduct?.referrals || ''}
                          onChange={(e) => {
                            const sc = currentEncounter.structuredConduct || { id: generateUUID(), encounterId: currentEncounter.id };
                            setCurrentEncounter({
                              ...currentEncounter,
                              structuredConduct: { ...sc, referrals: e.target.value }
                            });
                          }}
                          placeholder="Ex: Retinólogo, Cirurgião de Catarata, Neurologia..."
                          className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Exames Solicitados (separar por vírgula):</label>
                        <input
                          type="text"
                          value={currentEncounter.structuredConduct?.requestedExams?.join(', ') || ''}
                          onChange={(e) => {
                            const exams = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            const sc = currentEncounter.structuredConduct || { id: generateUUID(), encounterId: currentEncounter.id };
                            setCurrentEncounter({
                              ...currentEncounter,
                              structuredConduct: { ...sc, requestedExams: exams }
                            });
                          }}
                          placeholder="Ex: Campimetria, OCT Macular, Paquimetria..."
                          className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
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

              {/* Barra de Navegação Inferior Fluida da Esteira Clínica */}
              <div className="pt-4 mt-6 border-t border-slate-200/80 flex items-center justify-between gap-3 select-none">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={currentStep <= 1}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    currentStep <= 1
                      ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs cursor-pointer active:scale-95'
                  }`}
                  title="Voltar para a etapa anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Etapa Anterior</span>
                </button>

                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <span>Passo {currentStep} de {EXAM_TRAIL.length}</span>
                </div>

                {currentStep < EXAM_TRAIL.length ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer active:scale-95 transition-all"
                    title="Avançar para a próxima etapa clínica"
                  >
                    <span>Próxima: {EXAM_TRAIL[currentStep]?.label.replace(/^\d+\.\s*/, '')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSaveEncounter('completed')}
                    disabled={isReadOnly}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 transition-all"
                    title="Finalizar consulta médica"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Concluir Exame</span>
                  </button>
                )}
              </div>
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
            isReadOnly={isReadOnly}
            onChange={(updatedRefraction) => {
              if (isReadOnly) return;
              setCurrentEncounter({
                ...currentEncounter,
                subjectiveRefraction: updatedRefraction
              });
            }}
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
            <RemoteControlPanel 
              onAcuityRecorded={handleAcuityRecorded} 
              defaultRecordTarget={activeTab === 'av_sc' ? 'av_sc' : 'refraction'}
            />
          </div>
        )}
      </div>

      {/* Widget / Botão Suspenso Móvel Flutuante de Controle Remoto (Apenas examinador) */}
      {!isReadOnly && remoteMode === 'floating' && (
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
                <RemoteControlPanel 
                  onAcuityRecorded={handleAcuityRecorded} 
                  defaultRecordTarget={activeTab === 'av_sc' ? 'av_sc' : 'refraction'}
                />
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
        therapeuticPlan={currentEncounter.conduct}
        onClose={() => setIsUnifiedPrintModalOpen(false)}
      />

      {/* 2. Modal de Impressão de Relatório Clínico */}
      <ClinicalReportModal
        isOpen={isReportModalOpen}
        encounter={currentEncounter}
        patient={patient}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* FASE 26: Modal de Emissão de Documentos Clínicos (Exames, Encaminhamentos, Atestados) */}
      <ClinicalDocumentIssuanceModal
        isOpen={isClinicalDocModalOpen}
        encounter={currentEncounter}
        patient={patient}
        initialType={clinicalDocModalType}
        onClose={() => setIsClinicalDocModalOpen(false)}
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

      {/* 5. Modal de Galeria Clínica, Fotos do Paciente, Desenho Anatômico e Atlas */}
      <ClinicalGalleryModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        patientName={patient.fullName}
        images={currentEncounter.clinicalImages || []}
        eyeDrawing={currentEncounter.eyeDrawing}
        onUpdateImages={(updatedImages) => {
          const updated = {
            ...currentEncounter,
            clinicalImages: updatedImages
          };
          setCurrentEncounter(updated);
          offlineDb.saveEncounter(updated);
        }}
        onUpdateEyeDrawing={(updatedDrawing) => {
          const updated = {
            ...currentEncounter,
            eyeDrawing: updatedDrawing
          };
          setCurrentEncounter(updated);
          offlineDb.saveEncounter(updated);
        }}
      />

      {/* 6. Modal de Edição de Dados do Paciente Durante o Atendimento */}

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
                    <span>🇧🇷 Brasil (CPF / Ponta Porã)</span>
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
                    <span>🇵🇾 Paraguai (C.I. / Pedro Juan Caballero)</span>
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

      {/* Modal do Prontuário Clínico Completo com Histórico e Impressão */}
      <PatientMedicalRecordModal
        isOpen={isPatientHistoryModalOpen}
        patient={patient}
        encounters={allPatientEncounters}
        onClose={() => setIsPatientHistoryModalOpen(false)}
        onSelectEncounterForReport={(enc) => {
          setIsPatientHistoryModalOpen(false);
          setIsReportModalOpen(true);
        }}
        onStartReturn={(pat, prev) => {
          handleStartReturnSession(prev);
        }}
      />

      {/* Modal de Confirmação para Iniciar Consulta de Retorno */}
      {isConfirmReturnModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-2xl">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Iniciar Consulta de Retorno</h3>
                  <p className="text-xs text-slate-500">Preserva o histórico anterior e inicia novo atendimento hoje</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmReturnModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                  <span>Paciente: <b>{patient.fullName}</b></span>
                  <span>Data Hoje: <b>{new Date().toLocaleDateString('pt-BR')}</b></span>
                </div>
                {previousReferenceEncounter ? (
                  <div className="pt-2 border-t border-purple-200/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-purple-800 block">Consulta Anterior de Referência:</span>
                    <div className="font-mono text-purple-950 font-bold">
                      Data: {new Date(previousReferenceEncounter.date).toLocaleDateString('pt-BR')} às {new Date(previousReferenceEncounter.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {previousReferenceEncounter.subjectiveRefraction && (
                      <div className="text-[11px] font-mono text-purple-900 bg-white/80 p-2 rounded-lg border border-purple-200">
                        OD: {formatDiopterStr(previousReferenceEncounter.subjectiveRefraction.od?.sphere)} {previousReferenceEncounter.subjectiveRefraction.od?.cylinder ? `(${formatDiopterStr(previousReferenceEncounter.subjectiveRefraction.od?.cylinder)})` : ''} x {previousReferenceEncounter.subjectiveRefraction.od?.axis || 0}°<br/>
                        OE: {formatDiopterStr(previousReferenceEncounter.subjectiveRefraction.oe?.sphere)} {previousReferenceEncounter.subjectiveRefraction.oe?.cylinder ? `(${formatDiopterStr(previousReferenceEncounter.subjectiveRefraction.oe?.cylinder)})` : ''} x {previousReferenceEncounter.subjectiveRefraction.oe?.axis || 0}°
                        {previousReferenceEncounter.subjectiveRefraction.addition ? ` • Adição: +${previousReferenceEncounter.subjectiveRefraction.addition.toFixed(2)}` : ''}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    Atenção: Nenhuma consulta anterior encontrada no sistema. O retorno será iniciado como novo atendimento avulso.
                  </p>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <p className="font-bold text-slate-800">Ao confirmar o Retorno:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>O atendimento anterior fica <b>100% intacto</b> no prontuário do paciente;</li>
                  <li>Um novo atendimento com data e hora de <b>hoje</b> é criado;</li>
                  <li>A dioptria anterior é carregada no <b>Óculos Atual</b> e como base da <b>Refração</b>;</li>
                  <li>Você poderá alterar dioptrias, condutas e emitir novos receituários sem perder o passado.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmReturnModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleStartReturnSession(previousReferenceEncounter || undefined)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirmar e Iniciar Retorno</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
