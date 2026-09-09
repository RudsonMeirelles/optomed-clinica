import React from 'react';
import { ClinicalEncounter, Patient } from '@optotipo/shared';
import { Printer, X, ClipboardList, CheckCircle2 } from 'lucide-react';
import { offlineDb } from '../services/offlineDb';

interface ClinicalReportModalProps {
  isOpen: boolean;
  encounter: ClinicalEncounter | null;
  patient: Patient | null;
  onClose: () => void;
}

export const ClinicalReportModal: React.FC<ClinicalReportModalProps> = ({
  isOpen,
  encounter,
  patient,
  onClose
}) => {
  if (!isOpen || !encounter || !patient) return null;

  const activeClinic = offlineDb.getActiveClinic();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] text-slate-900 border border-slate-300 flex flex-col overflow-hidden animate-fadeIn">
        {/* Barra Superior FIXA */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-wide text-white">RELATÓRIO CLÍNICO</h2>
              <p className="text-[11px] text-slate-400">Prontuário completo de avaliação visual</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> IMPRIMIR RELATÓRIO
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

        {/* Área de Visualização e Rolagem */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/70 flex justify-center">
          {/* RELATÓRIO CLÍNICO FORMATADO */}
          <div className="bg-white border-2 border-slate-900 p-8 rounded-xl shadow-lg max-w-3xl w-full space-y-6 self-start print:shadow-none print:border-2 print:p-6 print:m-0">
            {/* Cabeçalho */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                {activeClinic.logoUrl && (
                  <img src={activeClinic.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                )}
                <div>
                  <h1 className="text-xl font-black text-slate-900">{activeClinic.name}</h1>
                  <p className="text-xs text-slate-600 font-medium">Relatório de Avaliação Visual & Refrativa</p>
                  {activeClinic.address && (
                    <p className="text-[10px] text-slate-500">
                      {activeClinic.address} • {activeClinic.city} • {activeClinic.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right text-xs text-slate-600 font-mono">
                <div>Data: <strong>{new Date(encounter.date).toLocaleDateString('pt-BR')}</strong></div>
                <div>ID: <strong>{encounter.id.slice(0, 8)}</strong></div>
              </div>
            </div>

            {/* Dados do Paciente */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Nome do Paciente:</span>
                <strong className="text-sm text-slate-900">{patient.fullName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Data de Nascimento:</span>
                <strong className="text-slate-900">{patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : '-'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Telefone:</span>
                <strong className="text-slate-900">{patient.phone || '-'}</strong>
              </div>
            </div>

            {/* Anamnese */}
            {encounter.anamnesis && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ANAMNESE & HISTÓRICO CLÍNICO</h3>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                  <div><strong>Queixa Principal:</strong> {encounter.anamnesis.chiefComplaint || 'Consulta de rotina / avaliação refrativa'}</div>
                  {encounter.anamnesis.medicationsInUse && (
                    <div><strong>Medicamentos em Uso Contínuo:</strong> {encounter.anamnesis.medicationsInUse}</div>
                  )}
                  {encounter.anamnesis.pathologicalHistory && (
                    <div><strong>Histórico Patológico Pregresso:</strong> {encounter.anamnesis.pathologicalHistory}</div>
                  )}
                  {encounter.anamnesis.allergies && (
                    <div><strong>Quadro Alérgico:</strong> {encounter.anamnesis.allergies}</div>
                  )}
                  {(encounter.anamnesis.bloodPressure || encounter.anamnesis.bloodGlucoseMgDl) && (
                    <div>
                      {encounter.anamnesis.bloodPressure && <span><strong>PA:</strong> {encounter.anamnesis.bloodPressure} </span>}
                      {encounter.anamnesis.bloodGlucoseMgDl && <span>| <strong>Glicemia:</strong> {encounter.anamnesis.bloodGlucoseMgDl}</span>}
                    </div>
                  )}
                  {encounter.anamnesis.ocularHistory && (
                    <div><strong>Histórico Ocular / Cirurgias:</strong> {encounter.anamnesis.ocularHistory}</div>
                  )}
                </div>
              </div>
            )}

            {/* Refração Subjetiva & Acuidade Visual */}
            {encounter.subjectiveRefraction && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">REFRAÇÃO & ACUIDADE VISUAL FINAL</h3>
                <table className="w-full border-collapse border border-slate-300 text-center text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-100 font-bold">
                      <th className="p-2 border border-slate-300">OLHO</th>
                      <th className="p-2 border border-slate-300">ESFÉRICO</th>
                      <th className="p-2 border border-slate-300">CILÍNDRICO</th>
                      <th className="p-2 border border-slate-300">EIXO</th>
                      <th className="p-2 border border-slate-300">AV FINAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-bold">
                      <td className="p-2.5 border border-slate-300 bg-slate-50">OD</td>
                      <td className="p-2.5 border border-slate-300">
                        {encounter.subjectiveRefraction.od.sphere ? `${encounter.subjectiveRefraction.od.sphere > 0 ? '+' : ''}${encounter.subjectiveRefraction.od.sphere.toFixed(2)}` : 'Plano'}
                      </td>
                      <td className="p-2.5 border border-slate-300">
                        {encounter.subjectiveRefraction.od.cylinder ? encounter.subjectiveRefraction.od.cylinder.toFixed(2) : '0.00'}
                      </td>
                      <td className="p-2.5 border border-slate-300">{encounter.subjectiveRefraction.od.axis ? `${encounter.subjectiveRefraction.od.axis}°` : '-'}</td>
                      <td className="p-2.5 border border-slate-300 font-black">{encounter.subjectiveRefraction.od.visualAcuity || '-'}</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="p-2.5 border border-slate-300 bg-slate-50">OE</td>
                      <td className="p-2.5 border border-slate-300">
                        {encounter.subjectiveRefraction.oe.sphere ? `${encounter.subjectiveRefraction.oe.sphere > 0 ? '+' : ''}${encounter.subjectiveRefraction.oe.sphere.toFixed(2)}` : 'Plano'}
                      </td>
                      <td className="p-2.5 border border-slate-300">
                        {encounter.subjectiveRefraction.oe.cylinder ? encounter.subjectiveRefraction.oe.cylinder.toFixed(2) : '0.00'}
                      </td>
                      <td className="p-2.5 border border-slate-300">{encounter.subjectiveRefraction.oe.axis ? `${encounter.subjectiveRefraction.oe.axis}°` : '-'}</td>
                      <td className="p-2.5 border border-slate-300 font-black">{encounter.subjectiveRefraction.oe.visualAcuity || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Conduta Clínica & Indicação de Retorno */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div>
                <span className="font-bold text-slate-700 block">Conduta & Observações Clínicas:</span>
                <p className="text-slate-900 mt-1">{encounter.conduct || 'Prescrição óptica emitida. Orientada ergonomia visual e pausas.'}</p>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="font-bold text-blue-900 block">Indicação de Retorno:</span>
                <p className="text-slate-900 font-bold mt-0.5">{encounter.returnInstructions || 'Retorno em 1 ano para controle de rotina.'}</p>
              </div>
            </div>

            {/* Assinatura Manual */}
            <div className="pt-16 flex justify-end items-end border-t border-slate-300 mt-8">
              <div className="text-center">
                <div className="w-64 border-b-2 border-slate-900 mb-1.5" />
                <div className="text-xs font-bold text-slate-900">Assinatura & Carimbo do Profissional</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
