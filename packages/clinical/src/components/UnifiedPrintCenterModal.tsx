import React, { useState, useEffect } from 'react';
import { Prescription, Patient } from '@optotipo/shared';
import { 
  Printer, 
  X, 
  FileText, 
  Pill, 
  Glasses, 
  LayoutTemplate, 
  FileSpreadsheet, 
  Receipt, 
  Globe, 
  Scissors, 
  Plus, 
  Trash2,
  Columns,
  Layers,
  Sparkles,
  Check
} from 'lucide-react';
import { offlineDb } from '../services/offlineDb';
import { PrescribedMedicationItem } from './MedicalPrescriptionModal';
import { OPHTHALMIC_DRUGS_DATABASE, OphthalmicDrug } from '../services/ophthalmicDrugsDb';
import { ClinicalProtocolDrug } from '../services/therapeuticProtocolsDb';

export type PrintLayoutMode = 'a4_landscape_dual' | 'a4_portrait' | 'a5_single' | 'thermal_80mm';
export type PrescriptionFilterType = 'all' | 'dioptria_only' | 'farmaco_only';
export type DualSheetCombination = 'dioptria_and_farmaco' | 'dioptria_dual' | 'farmaco_dual' | 'dioptria_single' | 'farmaco_single';
export type PrescriptionLanguage = 'pt' | 'es';

interface UnifiedPrintCenterModalProps {
  isOpen: boolean;
  initialMode?: 'dioptria' | 'farmaco' | 'dual';
  prescription: Prescription | null;
  patient: Patient | null;
  initialDrugs?: ClinicalProtocolDrug[];
  onClose: () => void;
}

export const UnifiedPrintCenterModal: React.FC<UnifiedPrintCenterModalProps> = ({
  isOpen,
  initialMode = 'dual',
  prescription,
  patient,
  initialDrugs = [],
  onClose
}) => {
  // Idioma (Padrão: clínica com defaultLanguage es-PY ou paciente PY -> 'es', senão -> 'pt')
  const [language, setLanguage] = useState<PrescriptionLanguage>(() => {
    const activeClinic = offlineDb.getActiveClinic();
    if (activeClinic?.defaultLanguage === 'es-PY' || activeClinic?.id === 'vision') return 'es';
    return patient?.nationality === 'PY' ? 'es' : 'pt';
  });

  // Filtro de Conteúdo Selecionado: Dioptria (Óculos), Fármaco (Medicamentos) ou Ambos
  const [filterType, setFilterType] = useState<PrescriptionFilterType>(() => {
    if (initialMode === 'dioptria') return 'dioptria_only';
    if (initialMode === 'farmaco') return 'farmaco_only';
    return 'all';
  });

  // Layout de Impressão (Padrão: A4 Paisagem 2 em 1 Meia Folha)
  const [layoutMode, setLayoutMode] = useState<PrintLayoutMode>('a4_landscape_dual');

  // Combinação da Folha Dupla (Padrão: 1 ÚNICA VIA para economizar papel, ou ambas se selecionado)
  const [dualCombination, setDualCombination] = useState<DualSheetCombination>(() => {
    if (initialMode === 'dioptria') return 'dioptria_single';
    if (initialMode === 'farmaco') return 'farmaco_single';
    return 'dioptria_and_farmaco';
  });

  // Medicamentos Farmacológicos
  const [medications, setMedications] = useState<PrescribedMedicationItem[]>([]);
  const [generalInstructions, setGeneralInstructions] = useState<string>('');

  useEffect(() => {
    const activeClinic = offlineDb.getActiveClinic();
    if (activeClinic?.defaultLanguage === 'es-PY' || activeClinic?.id === 'vision') {
      setLanguage('es');
    } else if (patient) {
      setLanguage(patient.nationality === 'PY' ? 'es' : 'pt');
    }
  }, [patient, isOpen]);

  useEffect(() => {
    if (initialMode === 'dioptria') {
      setFilterType('dioptria_only');
      setDualCombination('dioptria_single');
    } else if (initialMode === 'farmaco') {
      setFilterType('farmaco_only');
      setDualCombination('farmaco_single');
    } else {
      setFilterType('all');
      setDualCombination('dioptria_and_farmaco');
    }
  }, [initialMode, isOpen]);


  useEffect(() => {
    if (isOpen) {
      if (initialDrugs && initialDrugs.length > 0) {
        setMedications(initialDrugs.map((d, index) => ({
          id: `item-${Date.now()}-${index}`,
          commercialName: d.commercialName,
          activePrinciple: d.activePrinciple,
          concentration: d.concentration,
          presentation: d.presentation,
          route: d.route || 'Uso Tópico Ocular',
          dosage: d.dosage,
          quantity: d.quantity || '1 frasco'
        })));
      } else if (medications.length === 0) {
        const first = OPHTHALMIC_DRUGS_DATABASE[0];
        setMedications([
          {
            id: `item-${Date.now()}-0`,
            commercialName: first.commercialName,
            activePrinciple: first.activePrinciple,
            concentration: first.concentration,
            presentation: first.presentation,
            route: 'Uso Tópico Ocular',
            dosage: first.defaultPosology,
            quantity: '1 frasco'
          }
        ]);
      }

      setGeneralInstructions(language === 'es'
        ? 'Aguardar intervalo de 5 minutos entre la aplicación de colirios diferentes. Mantener frascos cerrados en lugar fresco.'
        : 'Aguardar intervalo mínimo de 5 minutos entre a aplicação de colírios diferentes. Manter frascos bem fechados em local fresco.'
      );
    }
  }, [isOpen, initialDrugs, language]);

  if (!isOpen || !patient) return null;

  const activeClinic = offlineDb.getActiveClinic();
  const currentDate = new Date().toLocaleDateString(language === 'es' ? 'es-PY' : 'pt-BR');

  const handlePrint = () => {
    window.print();
  };

  const handleSelectFilter = (type: PrescriptionFilterType) => {
    setFilterType(type);
    if (type === 'dioptria_only') {
      setDualCombination('dioptria_dual');
    } else if (type === 'farmaco_only') {
      setDualCombination('farmaco_dual');
    } else {
      setDualCombination('dioptria_and_farmaco');
    }
  };

  const handleAddMedication = (drug: OphthalmicDrug) => {
    const newItem: PrescribedMedicationItem = {
      id: `item-${Date.now()}`,
      commercialName: drug.commercialName,
      activePrinciple: drug.activePrinciple,
      concentration: drug.concentration,
      presentation: drug.presentation,
      route: drug.category === 'SUPLEMENTO' ? 'Uso Oral' : 'Uso Tópico Ocular',
      dosage: drug.defaultPosology,
      quantity: drug.category === 'SUPLEMENTO' ? '1 caja' : '1 frasco'
    };
    setMedications([...medications, newItem]);
  };

  const handleRemoveMedication = (id: string) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const handleUpdateMedication = (id: string, field: keyof PrescribedMedicationItem, value: string) => {
    setMedications(medications.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  // Dicionário de Textos Bilíngue (Português & Castellano Paraguay)
  const t = {
    pt: {
      rxOpticTitle: 'RECEITUÁRIO ÓPTICO',
      rxMedicalTitle: 'RECEITUÁRIO MÉDICO',
      patientLabel: 'Paciente',
      birthLabel: 'Nascimento',
      phoneLabel: 'Telefone',
      dateLabel: 'Data',
      validityLabel: 'Validade',
      eyeHeader: 'OLHO',
      sphereHeader: 'ESFÉRICO',
      cylHeader: 'CILÍNDRICO',
      axisHeader: 'EIXO',
      addHeader: 'ADIÇÃO',
      prismHeader: 'PRISMA',
      odLabel: 'OD',
      oeLabel: 'OE',
      lensTypeLabel: 'Tipo de Lente Sugerido',
      pdLabel: 'Distância Pupilar (DP)',
      treatmentsLabel: 'Tratamentos',
      observationsLabel: 'Observações',
      returnLabel: 'INDICAÇÃO DE RETORNO',
      signatureLabel: 'Assinatura & Carimbo do Profissional',
      patientCopy: 'Via do Paciente',
      pharmacyCopy: 'Via da Farmácia',
      medicationsHeader: 'MEDICAMENTOS PRESCRITOS',
      quantityLabel: 'Qtd',
      posologyLabel: 'Posologia / Modo de Usar',
      guidanceLabel: 'Orientações Gerais & Cuidados',
      planeSphere: 'Plano',
      defaultReturn: 'Retorno em 1 ano para controle visual de rotina.'
    },
    es: {
      rxOpticTitle: 'RECETA ÓPTICA',
      rxMedicalTitle: 'RECETA MÉDICA',
      patientLabel: 'Paciente',
      birthLabel: 'Fecha de Nacimiento',
      phoneLabel: 'Teléfono',
      dateLabel: 'Fecha',
      validityLabel: 'Validez',
      eyeHeader: 'OJO',
      sphereHeader: 'ESFÉRICO',
      cylHeader: 'CILÍNDRICO',
      axisHeader: 'EJE',
      addHeader: 'ADICIÓN',
      prismHeader: 'PRISMA',
      odLabel: 'OD (Derecho)',
      oeLabel: 'OI (Izquierdo)',
      lensTypeLabel: 'Tipo de Lente Sugerido',
      pdLabel: 'Distancia Pupilar (DP)',
      treatmentsLabel: 'Tratamientos',
      observationsLabel: 'Observaciones',
      returnLabel: 'INDICACIÓN DE CONTROL / RETORNO',
      signatureLabel: 'Firma y Sello Profesional',
      patientCopy: 'Vía del Paciente',
      pharmacyCopy: 'Vía de la Farmacia',
      medicationsHeader: 'MEDICAMENTOS PRESCRITOS',
      quantityLabel: 'Cant',
      posologyLabel: 'Posología / Modo de Uso',
      guidanceLabel: 'Indicaciones Generales y Cuidados',
      planeSphere: 'Neutro / Plano',
      defaultReturn: 'Control en 1 año para evaluación visual de rutina.'
    }
  }[language];

  // RENDERIZADOR DO BLOCO DE RECEITA ÓPTICA (DIOPTRIA)
  const renderOpticalBlock = (copyLabel?: string) => {
    if (!prescription) return null;

    return (
      <div className="bg-white border-2 border-slate-900 p-5 rounded-xl flex flex-col justify-between space-y-3.5 h-full text-xs">
        {/* Topo / Cabeçalho */}
        <div className="border-b-2 border-slate-900 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeClinic.logoUrl && (
              <img src={activeClinic.logoUrl} alt="Logo" className="w-9 h-9 object-contain" />
            )}
            <div>
              <h3 className="font-black text-sm tracking-tight text-slate-900 uppercase">{activeClinic.name}</h3>
              <p className="text-[10px] text-slate-600">{activeClinic.tagline || t.rxOpticTitle}</p>
            </div>
          </div>
          <div className="text-right text-[10px] font-mono text-slate-600">
            <div className="font-black text-slate-900 uppercase">{t.rxOpticTitle}</div>
            <div>{t.dateLabel}: <b>{currentDate}</b></div>
          </div>
        </div>

        {/* Paciente */}
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-300 flex justify-between items-center text-xs">
          <div>
            <div>{t.patientLabel}: <b className="text-slate-900 text-sm">{patient.fullName}</b></div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              {patient.birthDate && <span>{t.birthLabel}: {new Date(patient.birthDate).toLocaleDateString(language === 'es' ? 'es-PY' : 'pt-BR')} &bull; </span>}
              {patient.phone && <span>{t.phoneLabel}: {patient.phone}</span>}
            </div>
          </div>
          {copyLabel && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-700 uppercase">
              {copyLabel}
            </span>
          )}
        </div>

        {/* Tabela Refrativa */}
        <table className="w-full border-collapse border-2 border-slate-900 text-center font-mono text-xs">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-900 font-sans font-bold text-[10px]">
              <th className="p-1 border-r-2 border-slate-900">{t.eyeHeader}</th>
              <th className="p-1 border-r border-slate-900">{t.sphereHeader}</th>
              <th className="p-1 border-r border-slate-900">{t.cylHeader}</th>
              <th className="p-1 border-r border-slate-900">{t.axisHeader}</th>
              <th className="p-1">{t.addHeader}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-400 font-bold">
              <td className="p-1.5 border-r-2 border-slate-900 bg-slate-50 font-sans font-black">{t.odLabel}</td>
              <td className="p-1.5 border-r border-slate-900 font-black">
                {prescription.od.sphere === undefined || prescription.od.sphere === 0
                  ? t.planeSphere
                  : prescription.od.sphere > 0 ? `+${prescription.od.sphere.toFixed(2)}` : prescription.od.sphere.toFixed(2)}
              </td>
              <td className="p-1.5 border-r border-slate-900 font-black">
                {prescription.od.cylinder === undefined || prescription.od.cylinder === 0
                  ? '0.00'
                  : prescription.od.cylinder > 0 ? `+${prescription.od.cylinder.toFixed(2)}` : prescription.od.cylinder.toFixed(2)}
              </td>
              <td className="p-1.5 border-r border-slate-900 font-black">
                {prescription.od.axis !== undefined && prescription.od.axis !== null ? `${prescription.od.axis}°` : '-'}
              </td>
              <td rowSpan={2} className="p-1.5 align-middle bg-slate-50/50 font-black text-sm border-l border-slate-900">
                {prescription.addition ? `+${prescription.addition.toFixed(2)}` : '-'}
              </td>
            </tr>
            <tr className="font-bold">
              <td className="p-1.5 border-r-2 border-slate-900 bg-slate-50 font-sans font-black">{t.oeLabel}</td>
              <td className="p-1.5 border-r border-slate-900 font-black">
                {prescription.oe.sphere === undefined || prescription.oe.sphere === 0
                  ? t.planeSphere
                  : prescription.oe.sphere > 0 ? `+${prescription.oe.sphere.toFixed(2)}` : prescription.oe.sphere.toFixed(2)}
              </td>
              <td className="p-1.5 border-r border-slate-900 font-black">
                {prescription.oe.cylinder === undefined || prescription.oe.cylinder === 0
                  ? '0.00'
                  : prescription.oe.cylinder > 0 ? `+${prescription.oe.cylinder.toFixed(2)}` : prescription.oe.cylinder.toFixed(2)}
              </td>
              <td className="p-1.5 border-r border-slate-900 font-black">
                {prescription.oe.axis !== undefined && prescription.oe.axis !== null ? `${prescription.oe.axis}°` : '-'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Detalhes de Lentes, Material & DNP */}
        <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-300">
          <div>
            <span className="text-slate-500 font-semibold">{t.lensTypeLabel}:</span>{' '}
            <b className="text-slate-900 block truncate">
              {prescription.lensType ? prescription.lensType.replace('_', ' ').toUpperCase() : 'MULTIFOCAL'}
            </b>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Material:</span>{' '}
            <b className="text-slate-900 block truncate">
              {prescription.material ? prescription.material.replace('_', ' ').toUpperCase() : 'RESINA CR-39'}
            </b>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">{t.pdLabel}:</span>{' '}
            <b className="text-slate-900 block">{prescription.pdDistanceMm ? `${prescription.pdDistanceMm} mm` : 'Conforme DNP'}</b>
          </div>
        </div>

        {/* Tratamentos & Observações / Retorno */}
        <div className="text-[11px] space-y-1">
          {prescription.treatments && prescription.treatments.length > 0 && (
            <div>
              <span className="text-slate-500 font-bold">Tratamentos:</span>{' '}
              <span className="text-slate-900 font-semibold">{prescription.treatments.join(' • ')}</span>
            </div>
          )}
          {prescription.observations && (
            <div>
              <span className="text-slate-500 font-bold">{t.treatmentsLabel}:</span>{' '}
              <span className="text-slate-800 font-medium">{prescription.observations}</span>
            </div>
          )}
          <div>
            <span className="text-slate-500 font-bold">{t.returnLabel}:</span>{' '}
            <span className="text-slate-800 font-medium">
              {prescription.returnInstructions || t.defaultReturn}
            </span>
          </div>
        </div>

        {/* Rodapé / Assinatura e Carimbo Manual */}
        <div className="pt-5 text-center border-t border-slate-200 mt-auto">
          <div className="w-48 mx-auto border-b border-slate-400 mb-1" />
          <div className="font-medium text-slate-500 text-[10px] uppercase tracking-wider">{t.signatureLabel}</div>
          <div className="text-[8px] text-slate-400 font-mono">Assinatura &bull; Carimbo do Profissional</div>
        </div>
      </div>
    );
  };

  // RENDERIZADOR DO BLOCO DE RECEITA FARMACOLÓGICA (MÉDICA)
  const renderMedicalBlock = (copyLabel?: string) => {
    return (
      <div className="bg-white border-2 border-slate-900 p-5 rounded-xl flex flex-col justify-between space-y-3.5 h-full text-xs">
        {/* Topo / Cabeçalho */}
        <div className="border-b-2 border-slate-900 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase">
                {activeClinic.name}
              </h2>
              <p className="text-[10px] text-slate-600 font-medium">
                {t.rxMedicalTitle}
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] font-mono text-slate-600">
            {copyLabel && (
              <span className="inline-block bg-slate-900 text-white font-sans text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase mb-1">
                {copyLabel}
              </span>
            )}
            <div>
              {t.dateLabel}: <b>{currentDate}</b>
            </div>
          </div>
        </div>

        {/* Identificação do Paciente */}
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-500 font-bold">{t.patientLabel}:</span>{' '}
            <strong className="text-slate-900 text-sm">{patient.fullName}</strong>
          </div>
          {patient.birthDate && (
            <span className="text-[10px] text-slate-500 font-mono">
              {t.birthLabel}: {new Date(patient.birthDate).toLocaleDateString(language === 'es' ? 'es-PY' : 'pt-BR')}
            </span>
          )}
        </div>

        {/* Medicamentos Prescritos */}
        <div className="space-y-3 flex-1">
          {medications.map((item, idx) => (
            <div
              key={item.id}
              className="p-3 bg-slate-50 rounded-xl border border-slate-300 space-y-1 text-slate-800"
            >
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-900 text-xs">
                  {idx + 1}. {item.commercialName}{' '}
                  <span className="text-slate-500 text-[11px] font-normal">
                    ({item.activePrinciple})
                  </span>
                </span>
                <span className="text-[10px] text-slate-600 font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  {t.quantityLabel}: {item.quantity}
                </span>
              </div>
              <div className="text-[10px] text-blue-900 font-bold uppercase tracking-wider">
                {item.route} &bull; {item.presentation}
              </div>
              <p className="text-slate-700 text-xs font-medium leading-relaxed bg-white p-2 rounded border border-slate-200">
                {item.dosage}
              </p>
            </div>
          ))}
        </div>

        {/* Orientações Gerais */}
        {generalInstructions && (
          <div className="bg-amber-50/70 p-2 rounded border border-amber-200 text-[10px] text-amber-900">
            <b>{t.guidanceLabel}:</b> {generalInstructions}
          </div>
        )}

        {/* Rodapé / Assinatura e Carimbo Manual */}
        <div className="pt-5 text-center border-t border-slate-200 mt-auto">
          <div className="w-48 mx-auto border-b border-slate-400 mb-1" />
          <div className="font-medium text-slate-500 text-[10px] uppercase tracking-wider">{t.signatureLabel}</div>
          <div className="text-[8px] text-slate-400 font-mono">Assinatura &bull; Carimbo do Profissional</div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* ========================================================================= */}
        {/* BARRA SUPERIOR: SELEÇÃO DE TIPO (DIOPTRIA / FÁRMACO), FORMATO E IDIOMA */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between border-b border-slate-800 shrink-0 no-print gap-3">
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-wide text-white">CENTRAL DE IMPRESSÃO & RECEITUÁRIOS</h2>
              <p className="text-[11px] text-slate-300">Selecione o tipo de receituário, vias e formato de impressão</p>
            </div>
          </div>

          {/* 🌟 1. SELETOR PRINCIPAL POR ÍCONES: DIOPTRIA, FÁRMACO OU AMBOS */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-700 shadow-inner">
            <button
              onClick={() => handleSelectFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Imprimir Dioptria (Óculos) e Fármacos (Medicamentos) juntos"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Ambos (Dioptria + Fármaco)</span>
            </button>

            <button
              onClick={() => handleSelectFilter('dioptria_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                filterType === 'dioptria_only'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Imprimir apenas o receituário de Dioptria (Óculos / Lentes)"
            >
              <Glasses className="w-3.5 h-3.5 text-cyan-400" />
              <span>Só Dioptria (Óculos)</span>
            </button>

            <button
              onClick={() => handleSelectFilter('farmaco_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                filterType === 'farmaco_only'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Imprimir apenas o receituário de Medicamentos e Colírios"
            >
              <Pill className="w-3.5 h-3.5 text-pink-400" />
              <span>Só Fármaco (Remédios)</span>
            </button>
          </div>

          {/* 🇧🇷 🇵🇾 Seletor de Idioma Bilíngue */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setLanguage('pt')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                language === 'pt' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇧🇷 PT</span>
            </button>

            <button
              onClick={() => setLanguage('es')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                language === 'es' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇵🇾 ES</span>
            </button>
          </div>

          {/* Seletor de Formato de Papel */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setLayoutMode('a4_landscape_dual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'a4_landscape_dual' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Imprime 2 vias lado a lado na mesma folha A4 em paisagem (Meia Folha)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>A4 Paisagem (2 em 1)</span>
            </button>

            <button
              onClick={() => setLayoutMode('a4_portrait')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'a4_portrait' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>A4 Retrato</span>
            </button>

            <button
              onClick={() => setLayoutMode('thermal_80mm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'thermal_80mm' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>80mm</span>
            </button>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> IMPRIMIR
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-barra de Vias quando no modo A4 Paisagem (2 em 1) */}
        {layoutMode === 'a4_landscape_dual' && (
          <div className="px-6 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 no-print text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Scissors className="w-3.5 h-3.5 text-blue-600" /> Disposição das Vias na Folha:
              </span>
              <div className="flex items-center gap-1.5">
                
                {filterType === 'all' && (
                  <button
                    onClick={() => setDualCombination('dioptria_and_farmaco')}
                    className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                      dualCombination === 'dioptria_and_farmaco'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    👓 Dioptria (Esq) + 💊 Fármaco (Dir)
                  </button>
                )}

                {(filterType === 'all' || filterType === 'dioptria_only') && (
                  <button
                    onClick={() => setDualCombination('dioptria_dual')}
                    className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                      dualCombination === 'dioptria_dual'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    👓 2 Vias de Dioptria (1ª Via + 2ª Via)
                  </button>
                )}

                {(filterType === 'all' || filterType === 'farmaco_only') && (
                  <button
                    onClick={() => setDualCombination('farmaco_dual')}
                    className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                      dualCombination === 'farmaco_dual'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    💊 2 Vias de Fármacos (Paciente + Farmácia)
                  </button>
                )}

                {filterType === 'dioptria_only' && (
                  <button
                    onClick={() => setDualCombination('dioptria_single')}
                    className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                      dualCombination === 'dioptria_single'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    👓 1 Via Única de Dioptria (Meia Folha)
                  </button>
                )}

                {filterType === 'farmaco_only' && (
                  <button
                    onClick={() => setDualCombination('farmaco_single')}
                    className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                      dualCombination === 'farmaco_single'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    💊 1 Via Única de Fármacos (Meia Folha)
                  </button>
                )}
              </div>
            </div>

            <span className="text-[11px] text-slate-500 font-medium">
              Folha dividida ao meio com linha pontilhada de corte central.
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÁREA DE VISUALIZAÇÃO E IMPRESSÃO COM SUPORTE A FILTROS */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/70 flex justify-center">
          
          {/* MODO 1: A4 PAISAGEM DUPLO (2 EM 1) */}
          {layoutMode === 'a4_landscape_dual' && (
            <div className="bg-white border-2 border-slate-900 p-6 rounded-xl shadow-lg max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 relative self-start print:shadow-none print:border-none print:p-2 print:m-0 print:max-w-none print:w-full print:grid-cols-2">
              
              {/* Linha Guia Central de Corte (Pontilhada) */}
              <div className="hidden md:flex absolute left-1/2 top-4 bottom-4 w-px border-l-2 border-dashed border-slate-400 items-center justify-center -translate-x-1/2 pointer-events-none">
                <span className="bg-slate-100 text-slate-500 border border-slate-300 p-1 rounded-full shadow-xs">
                  <Scissors className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* LADO ESQUERDO DA FOLHA */}
              <div className="h-full">
                {dualCombination === 'dioptria_and_farmaco' && renderOpticalBlock(t.patientCopy)}
                {dualCombination === 'dioptria_dual' && renderOpticalBlock(`${t.patientCopy} (1ª Via)`)}
                {dualCombination === 'dioptria_single' && renderOpticalBlock(t.patientCopy)}
                {dualCombination === 'farmaco_dual' && renderMedicalBlock(`${t.patientCopy} (1ª Via)`)}
                {dualCombination === 'farmaco_single' && renderMedicalBlock(t.patientCopy)}
              </div>

              {/* LADO DIREITO DA FOLHA */}
              <div className="h-full">
                {dualCombination === 'dioptria_and_farmaco' && renderMedicalBlock(t.patientCopy)}
                {dualCombination === 'dioptria_dual' && renderOpticalBlock(`${t.patientCopy} (2ª Via)`)}
                {dualCombination === 'farmaco_dual' && renderMedicalBlock(t.pharmacyCopy)}
                {(dualCombination === 'dioptria_single' || dualCombination === 'farmaco_single') && (
                  <div className="h-full border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-xs italic p-6 text-center">
                    (Espaço em branco para corte e economia de papel)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODO 2: A4 RETRATO INDIVIDUAL */}
          {layoutMode === 'a4_portrait' && (
            <div className="max-w-3xl w-full self-start space-y-4">
              {(filterType === 'all' || filterType === 'dioptria_only') && prescription && (
                renderOpticalBlock(t.patientCopy)
              )}
              {(filterType === 'all' || filterType === 'farmaco_only') && medications.length > 0 && (
                renderMedicalBlock(t.patientCopy)
              )}
            </div>
          )}

          {/* MODO 3: CUPOM TÉRMICO 80MM */}
          {layoutMode === 'thermal_80mm' && (
            <div className="bg-white border-2 border-dashed border-slate-400 p-4 rounded-xl shadow-lg w-[320px] space-y-3 self-start font-mono text-[11px] leading-tight text-slate-900 print:shadow-none print:border-none print:p-2 print:m-0 print:w-full">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h1 className="text-xs font-black uppercase">{activeClinic.name}</h1>
                <p className="text-[9px] text-slate-500">{activeClinic.tagline || t.rxOpticTitle}</p>
                <div className="text-[9px] mt-1 text-slate-500">
                  {t.dateLabel}: {currentDate}
                </div>
              </div>

              <div className="py-1 border-b border-dashed border-slate-400">
                <div className="font-bold">{t.patientLabel.toUpperCase()}:</div>
                <div className="font-bold text-xs">{patient.fullName}</div>
              </div>

              {/* Refração */}
              {(filterType === 'all' || filterType === 'dioptria_only') && prescription && (
                <div className="py-1">
                  <div className="text-center font-bold mb-1">=== {t.rxOpticTitle} ===</div>
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-[10px]">
                        <th>{t.eyeHeader}</th>
                        <th>{t.sphereHeader.slice(0, 3)}</th>
                        <th>{t.cylHeader.slice(0, 3)}</th>
                        <th>{t.axisHeader}</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold">
                      <tr>
                        <td className="py-0.5">{t.odLabel.slice(0, 2)}</td>
                        <td>
                          {prescription.od.sphere === undefined || prescription.od.sphere === 0
                            ? 'PL'
                            : prescription.od.sphere > 0 ? `+${prescription.od.sphere.toFixed(2)}` : prescription.od.sphere.toFixed(2)}
                        </td>
                        <td>
                          {prescription.od.cylinder === undefined || prescription.od.cylinder === 0
                            ? '0.00'
                            : prescription.od.cylinder > 0 ? `+${prescription.od.cylinder.toFixed(2)}` : prescription.od.cylinder.toFixed(2)}
                        </td>
                        <td>{prescription.od.axis ? `${prescription.od.axis}°` : '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5">{t.oeLabel.slice(0, 2)}</td>
                        <td>
                          {prescription.oe.sphere === undefined || prescription.oe.sphere === 0
                            ? 'PL'
                            : prescription.oe.sphere > 0 ? `+${prescription.oe.sphere.toFixed(2)}` : prescription.oe.sphere.toFixed(2)}
                        </td>
                        <td>
                          {prescription.oe.cylinder === undefined || prescription.oe.cylinder === 0
                            ? '0.00'
                            : prescription.oe.cylinder > 0 ? `+${prescription.oe.cylinder.toFixed(2)}` : prescription.oe.cylinder.toFixed(2)}
                        </td>
                        <td>{prescription.oe.axis ? `${prescription.oe.axis}°` : '-'}</td>
                      </tr>
                    </tbody>
                  </table>

                  {prescription.addition && (
                    <div className="text-center font-bold mt-1 text-xs bg-slate-100 py-0.5 rounded">
                      {t.addHeader}: +{prescription.addition.toFixed(2)} D
                    </div>
                  )}
                </div>
              )}

              {/* Medicamentos se houver */}
              {(filterType === 'all' || filterType === 'farmaco_only') && medications.length > 0 && (
                <div className="py-1 border-t border-dashed border-slate-400 space-y-1">
                  <div className="text-center font-bold">=== {t.medicationsHeader} ===</div>
                  {medications.map((item, idx) => (
                    <div key={idx} className="text-[10px]">
                      <b>{idx + 1}. {item.commercialName}</b> ({item.activePrinciple})
                      <div>{item.dosage}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-8 text-center border-t border-dashed border-slate-400">
                <div className="w-36 mx-auto border-b border-slate-900 mb-1" />
                <div className="text-[9px] font-bold">{t.signatureLabel}</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
