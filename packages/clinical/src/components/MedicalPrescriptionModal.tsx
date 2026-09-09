import React, { useState } from 'react';
import { Patient } from '@optotipo/shared';
import { Printer, X, Pill, Plus, Trash2, LayoutTemplate, FileSpreadsheet, Receipt, Sparkles, Check, AlertCircle } from 'lucide-react';
import { offlineDb } from '../services/offlineDb';
import { ClinicalProtocolDrug } from '../services/therapeuticProtocolsDb';
import { OPHTHALMIC_DRUGS_DATABASE, OphthalmicDrug } from '../services/ophthalmicDrugsDb';

export type MedicalPaperFormat = 'a4' | 'a5' | 'thermal_80mm';

export interface PrescribedMedicationItem {
  id: string;
  commercialName: string;
  activePrinciple: string;
  concentration?: string;
  presentation?: string;
  route: string; // 'Uso Tópico Ocular' | 'Uso Oral' | 'Uso Tópico Palpebral'
  dosage: string;
  quantity: string;
}

interface MedicalPrescriptionModalProps {
  isOpen: boolean;
  patient: Patient | null;
  initialDrugs?: ClinicalProtocolDrug[];
  onClose: () => void;
}

export const MedicalPrescriptionModal: React.FC<MedicalPrescriptionModalProps> = ({
  isOpen,
  patient,
  initialDrugs = [],
  onClose
}) => {
  const [paperFormat, setPaperFormat] = useState<MedicalPaperFormat>('a4');
  const [medications, setMedications] = useState<PrescribedMedicationItem[]>([]);
  const [generalInstructions, setGeneralInstructions] = useState<string>(
    'Aguardar intervalo mínimo de 5 minutos entre a aplicação de colírios diferentes. Manter frascos bem fechados em local fresco.'
  );

  // Inicializar medicamentos quando abrir
  React.useEffect(() => {
    if (isOpen) {
      if (initialDrugs && initialDrugs.length > 0) {
        const mapped = initialDrugs.map((d, index) => ({
          id: `item-${Date.now()}-${index}`,
          commercialName: d.commercialName,
          activePrinciple: d.activePrinciple,
          concentration: d.concentration,
          presentation: d.presentation,
          route: d.route || 'Uso Tópico Ocular',
          dosage: d.dosage,
          quantity: d.quantity || '1 frasco'
        }));
        setMedications(mapped);
      } else if (medications.length === 0) {
        // Exemplo padrão se abrir em branco
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
    }
  }, [isOpen, initialDrugs]);

  if (!isOpen || !patient) return null;

  const activeClinic = offlineDb.getActiveClinic();
  const currentDate = new Date().toLocaleDateString('pt-BR');

  const handleAddMedication = (drug: OphthalmicDrug) => {
    const newItem: PrescribedMedicationItem = {
      id: `item-${Date.now()}`,
      commercialName: drug.commercialName,
      activePrinciple: drug.activePrinciple,
      concentration: drug.concentration,
      presentation: drug.presentation,
      route: drug.category === 'SUPLEMENTO' ? 'Uso Oral' : 'Uso Tópico Ocular',
      dosage: drug.defaultPosology,
      quantity: drug.category === 'SUPLEMENTO' ? '1 caixa' : '1 frasco'
    };
    setMedications([...medications, newItem]);
  };

  const handleRemoveMedication = (id: string) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const handleUpdateMedication = (id: string, field: keyof PrescribedMedicationItem, value: string) => {
    setMedications(medications.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[96vh] text-slate-900 border border-slate-300 flex flex-col overflow-hidden">
        
        {/* Barra Superior com Controles */}
        <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between border-b border-slate-800 shrink-0 no-print gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600 rounded-xl text-white shadow-md">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-wide text-white">RECEITUÁRIO MÉDICO / FARMACOLÓGICO</h2>
              <p className="text-[11px] text-slate-300">Prescrição de colírios, pomadas e fármacos com posologia detalhada</p>
            </div>
          </div>

          {/* Seletor de Formato / Impressora */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setPaperFormat('a4')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                paperFormat === 'a4' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>A4 Padrão</span>
            </button>

            <button
              onClick={() => setPaperFormat('a5')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                paperFormat === 'a5' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>A5 Reduzido</span>
            </button>

            <button
              onClick={() => setPaperFormat('thermal_80mm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                paperFormat === 'thermal_80mm' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Cupom 80mm</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> IMPRIMIR RECEITA
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Seletor Rápido de Inserção de Medicamento Adicional (Não impresso) */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 no-print text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-rose-600" /> Adicionar Rápido à Receita:
            </span>
            <select
              onChange={(e) => {
                const found = OPHTHALMIC_DRUGS_DATABASE.find(d => d.id === e.target.value);
                if (found) handleAddMedication(found);
                e.target.value = '';
              }}
              defaultValue=""
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:border-rose-500"
            >
              <option value="" disabled>Selecionar medicamento do banco de dados...</option>
              {OPHTHALMIC_DRUGS_DATABASE.map(drug => (
                <option key={drug.id} value={drug.id}>
                  {drug.commercialName} ({drug.activePrinciple} {drug.concentration})
                </option>
              ))}
            </select>
          </div>

          <span className="text-[11px] text-slate-500">
            Você pode editar os textos, doses e quantidades diretamente na folha abaixo.
          </span>
        </div>

        {/* Área de Visualização e Impressão da Folha */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/70 flex justify-center">
          
          {/* ========================================================================= */}
          {/* FORMATO 1: A4 PADRÃO (RECEITA MÉDICA OFICIAL) */}
          {/* ========================================================================= */}
          {paperFormat === 'a4' && (
            <div className="bg-white border-2 border-slate-900 p-8 rounded-xl shadow-lg max-w-3xl w-full space-y-6 self-start print:shadow-none print:border-2 print:p-6 print:m-0 print:max-w-none">
              
              {/* Cabeçalho */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  {activeClinic.logoUrl && (
                    <img src={activeClinic.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                  )}
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900">
                      {activeClinic.name}
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">
                      {activeClinic.tagline || 'Prescrição & Avaliação Terapêutica'}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs font-mono text-slate-600">
                  <div className="font-bold text-slate-900 uppercase text-xs tracking-wider">RECEITUÁRIO MÉDICO</div>
                  <div>Data: <strong>{currentDate}</strong></div>
                </div>
              </div>

              {/* Dados do Paciente */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-300 text-sm flex justify-between items-center">
                <div>
                  <div>Paciente: <strong className="text-slate-900 text-base">{patient.fullName}</strong></div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {patient.birthDate && <span>Nasc: {new Date(patient.birthDate).toLocaleDateString('pt-BR')} &bull; </span>}
                    {patient.phone && <span>Tel: {patient.phone}</span>}
                  </div>
                </div>
                <div className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 uppercase">
                  Via do Paciente
                </div>
              </div>

              {/* Lista de Medicamentos Prescritos com Posologia Detalhada */}
              <div className="space-y-4 pt-2">
                {medications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl">
                    Nenhum medicamento adicionado à receita. Selecione um fármaco acima.
                  </div>
                ) : (
                  medications.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50/50 rounded-xl border border-slate-300 space-y-2 relative group"
                    >
                      {/* Botão de exclusão (apenas em tela) */}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(item.id)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-red-600 p-1 rounded-lg no-print"
                        title="Remover medicamento da receita"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Título do Medicamento e Via */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={item.commercialName}
                            onChange={(e) => handleUpdateMedication(item.id, 'commercialName', e.target.value)}
                            className="font-black text-sm sm:text-base text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-rose-500 focus:bg-white px-1 py-0.5"
                            placeholder="Nome Comercial do Medicamento"
                          />
                          <span className="text-xs text-slate-500 font-semibold">({item.activePrinciple})</span>
                        </div>

                        <div className="flex items-center gap-2 pr-6 sm:pr-8">
                          <span className="text-xs font-bold text-slate-700">Qtd:</span>
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => handleUpdateMedication(item.id, 'quantity', e.target.value)}
                            className="font-bold text-xs text-slate-900 w-24 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center"
                          />
                        </div>
                      </div>

                      {/* Via de Administração e Posologia */}
                      <div className="pt-1 space-y-1 text-xs">
                        <div className="flex items-center gap-2 text-rose-800 font-bold uppercase tracking-wider text-[11px]">
                          <span>{item.route}</span> &bull; <span>{item.presentation}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-800">Posologia / Modo de Usar:</span>
                          <textarea
                            rows={2}
                            value={item.dosage}
                            onChange={(e) => handleUpdateMedication(item.id, 'dosage', e.target.value)}
                            className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-rose-500 font-sans"
                            placeholder="Descreva a posologia completa (ex: Instilar 1 gota de 4 em 4 horas)..."
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Instruções Gerais ao Paciente */}
              <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-800 uppercase text-[11px] tracking-wide block">
                  Orientações Gerais & Cuidados de Uso:
                </span>
                <textarea
                  rows={2}
                  value={generalInstructions}
                  onChange={(e) => setGeneralInstructions(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Assinatura e Carimbo Manual do Profissional */}
              <div className="pt-16 flex justify-end items-end border-t border-slate-200 mt-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-56 border-b border-slate-400 mb-1" />
                  <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                    Assinatura & Carimbo do Profissional
                  </div>
                  <div className="text-[8px] text-slate-400 font-mono">
                    Data: {currentDate}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMATO 2: A5 REDUZIDO (MEIA FOLHA) */}
          {/* ========================================================================= */}
          {paperFormat === 'a5' && (
            <div className="bg-white border-2 border-slate-900 p-5 rounded-xl shadow-lg max-w-xl w-full space-y-4 self-start print:shadow-none print:border-2 print:p-4 print:m-0 print:max-w-none text-xs">
              {/* Cabeçalho */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5">
                <div>
                  <h1 className="text-base font-black tracking-tight text-slate-900">{activeClinic.name}</h1>
                  <p className="text-[10px] text-slate-600 font-medium">Receituário Médico</p>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-600">
                  <div>Data: <strong>{currentDate}</strong></div>
                </div>
              </div>

              {/* Paciente */}
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-300 flex justify-between items-center text-xs">
                <div>Paciente: <strong className="text-slate-900">{patient.fullName}</strong></div>
                {patient.birthDate && <span className="text-[10px] text-slate-500">Nasc: {new Date(patient.birthDate).toLocaleDateString('pt-BR')}</span>}
              </div>

              {/* Medicamentos */}
              <div className="space-y-3">
                {medications.map((item, index) => (
                  <div key={item.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-300 space-y-1">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-900">{index + 1}. {item.commercialName} ({item.activePrinciple})</span>
                      <span className="text-[10px] text-slate-600 font-mono">Qtd: {item.quantity}</span>
                    </div>
                    <div className="text-[10px] text-rose-800 font-bold uppercase">{item.route} - {item.presentation}</div>
                    <p className="text-slate-800 text-[11px] font-medium leading-tight">{item.dosage}</p>
                  </div>
                ))}
              </div>

              {/* Orientações */}
              {generalInstructions && (
                <div className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                  <b>Obs:</b> {generalInstructions}
                </div>
              )}

              {/* Assinatura */}
              <div className="pt-10 flex justify-end border-t border-slate-200">
                <div className="text-center">
                  <div className="w-40 border-b border-slate-300 mb-1" />
                  <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">Assinatura & Carimbo</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMATO 3: CUPOM TÉRMICO 80MM */}
          {/* ========================================================================= */}
          {paperFormat === 'thermal_80mm' && (
            <div className="bg-white border-2 border-dashed border-slate-400 p-4 rounded-xl shadow-lg w-[320px] space-y-3 self-start font-mono text-[11px] leading-tight text-slate-900 print:shadow-none print:border-none print:p-2 print:m-0 print:w-full">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h1 className="text-xs font-black uppercase">{activeClinic.name}</h1>
                <p className="text-[9px] text-slate-500">Receituário Farmacológico</p>
                <div className="text-[9px] mt-1 text-slate-500">Data: {currentDate}</div>
              </div>

              <div className="py-1 border-b border-dashed border-slate-400">
                <div className="font-bold">PACIENTE:</div>
                <div className="font-bold text-xs">{patient.fullName}</div>
              </div>

              <div className="py-1 space-y-2">
                <div className="text-center font-bold">=== MEDICAMENTOS ===</div>
                {medications.map((item, index) => (
                  <div key={item.id} className="border-b border-dashed border-slate-300 pb-1.5 space-y-0.5">
                    <div className="font-bold text-xs">{index + 1}. {item.commercialName}</div>
                    <div className="text-[10px] text-slate-600">({item.activePrinciple} - Qtd: {item.quantity})</div>
                    <div className="text-[10px] font-semibold">{item.route}</div>
                    <div className="text-[10px] text-slate-800">{item.dosage}</div>
                  </div>
                ))}
              </div>

              {generalInstructions && (
                <div className="text-[9px] text-slate-600 py-1">
                  <b>Obs:</b> {generalInstructions}
                </div>
              )}

              <div className="pt-8 text-center border-t border-dashed border-slate-300">
                <div className="w-36 mx-auto border-b border-slate-300 mb-1" />
                <div className="text-[8px] text-slate-500 font-medium tracking-wide uppercase">Assinatura &bull; Carimbo</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
