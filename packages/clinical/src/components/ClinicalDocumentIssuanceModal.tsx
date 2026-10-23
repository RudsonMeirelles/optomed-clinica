import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Patient, ClinicalEncounter, ClinicalDocumentRecord, ClinicalDocumentType } from '@optotipo/shared';
import { 
  FileText, 
  Printer, 
  X, 
  CheckCircle2, 
  Send, 
  FileCheck, 
  Calendar, 
  User, 
  Building2, 
  FilePlus2,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { offlineDb } from '../services/offlineDb';
import { printIsolatedElement } from '../services/printService';

export type StandardDocType = 'exam_request' | 'referral_letter' | 'medical_certificate';

interface ClinicalDocumentIssuanceModalProps {
  isOpen: boolean;
  encounter: ClinicalEncounter | null;
  patient: Patient | null;
  initialType?: StandardDocType;
  onClose: () => void;
  onDocumentIssued?: (doc: ClinicalDocumentRecord) => void;
}

export const ClinicalDocumentIssuanceModal: React.FC<ClinicalDocumentIssuanceModalProps> = ({
  isOpen,
  encounter,
  patient,
  initialType = 'exam_request',
  onClose,
  onDocumentIssued
}) => {
  const [docType, setDocType] = useState<StandardDocType>(initialType);
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [issuedSuccess, setIssuedSuccess] = useState<string | null>(null);

  // Modelos pré-definidos para agilidade clínica
  const templates: Record<StandardDocType, { defaultTitle: string; defaultBody: (p: Patient, enc?: ClinicalEncounter) => string }> = {
    exam_request: {
      defaultTitle: 'SOLICITAÇÃO DE EXAMES COMPLEMENTARES',
      defaultBody: (p, enc) => {
        const exams = enc?.structuredConduct?.requestedExams && enc.structuredConduct.requestedExams.length > 0
          ? enc.structuredConduct.requestedExams.map((e, idx) => `${idx + 1}. ${e}`).join('\n')
          : `1. Retinografia Colorida Digital (AO)\n2. Campimetria Visual Computadorizada (AO)\n3. Paquimetria Corneana Ultrassônica (AO)\n4. Tonometria de Aplanação / Curva Tensional Diária`;

        const primaryDiag = enc?.diagnoses?.find(d => d.primary)?.description || enc?.diagnoses?.[0]?.description || 'Avaliação da integridade funcional ocular e segmento posterior';
        return `À equipe de diagnóstico / Centro Oftalmológico:\n\nSolicito a realização dos seguintes exames complementares para o(a) paciente ${p.fullName}:\n\n${exams}\n\nHipótese Diagnóstica / Indicação Clínica:\n${primaryDiag}.\n\nObservações:\nFavor anexar laudo e traçados originais com assinatura do examinador.`;
      }
    },
    referral_letter: {
      defaultTitle: 'ENCAMINHAMENTO MÉDICO ESPECIALIZADO',
      defaultBody: (p, enc) => {
        const primaryDiag = enc?.diagnoses?.find(d => d.primary)?.description || enc?.diagnoses?.[0]?.description || 'Alteração a esclarecer';
        return `Ao(À) Colega Especialista:\n\nEncaminho para vossa criteriosa avaliação e conduta conjunta o(a) paciente ${p.fullName}, portador(a) do documento ${p.documentType || 'DOC'}: ${p.documentNumber || 'não informado'}.\n\nHistórico e Motivo do Encaminhamento:\n${enc?.structuredConduct?.referrals || enc?.anamnesis?.chiefComplaint || 'Paciente compareceu para avaliação oftalmológica/optométrica apresentando queixas visuais que demandam avaliação de subespecialidade'}.\n\nHipótese Diagnóstica:\n${primaryDiag}.\n\nDioptria Refrativa Apurada:\nOD: ${enc?.subjectiveRefraction?.od?.sphere || '0.00'} DE ${enc?.subjectiveRefraction?.od?.cylinder || '0.00'} DC x ${enc?.subjectiveRefraction?.od?.axis || 0}°\nOE: ${enc?.subjectiveRefraction?.oe?.sphere || '0.00'} DE ${enc?.subjectiveRefraction?.oe?.cylinder || '0.00'} DC x ${enc?.subjectiveRefraction?.oe?.axis || 0}°\n\nColoco-me à inteira disposição para discussão do caso.`;
      }
    },
    medical_certificate: {
      defaultTitle: 'ATESTADO / DECLARAÇÃO DE COMPARECIMENTO CLÍNICO',
      defaultBody: (p, enc) => {
        const dateStr = enc?.date ? new Date(enc.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
        return `DECLARAÇÃO DE ATENDIMENTO CLÍNICO\n\nAtesto para os devidos fins que o(a) Sr(a). ${p.fullName}, portador(a) do documento ${p.documentType || 'DOC'} nº ${p.documentNumber || '—'}, esteve presente sob meus cuidados profissionais nesta unidade de saúde em ${dateStr}, realizando consulta de avaliação da saúde visual e função refrativa no período correspondente.\n\nRecomenda-se repouso visual e dispensa de atividades laborais/escolares durante o período restante do dia de hoje para recuperação da acuidade visual após exames sob refração e testes clínicos de rotina.`;
      }
    }
  };

  React.useEffect(() => {
    if (isOpen && patient) {
      const templ = templates[docType];
      setTitle(templ.defaultTitle);
      setBodyText(templ.defaultBody(patient, encounter || undefined));
      setIssuedSuccess(null);
    }
  }, [isOpen, docType, patient?.id, encounter?.id]);

  if (!isOpen || !patient) return null;

  const activeClinic = offlineDb.getActiveClinic();
  const currentDate = new Date().toLocaleDateString(patient.nationality === 'PY' ? 'es-PY' : 'pt-BR');
  const examinerName = encounter?.examinerName || 'Dr. Rudson Meirelles';
  const examinerRegistry = 'CRM/CROO 123456';

  const handleSaveAndPrint = () => {
    try {
      const activeClinicId = offlineDb.getActiveClinicId();
      const docTypeMapping: Record<StandardDocType, ClinicalDocumentType> = {
        exam_request: 'exam_request',
        referral_letter: 'referral_letter',
        medical_certificate: 'medical_certificate'
      };

      const docRecord: ClinicalDocumentRecord = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        encounterId: encounter?.id || '',
        patientId: patient.id,
        clinicId: activeClinicId,
        type: docTypeMapping[docType],
        title: title.trim() || templates[docType].defaultTitle,
        content: bodyText.trim(),
        structuredPayload: {
          docType,
          encounterId: encounter?.id,
          examinerName,
          date: encounter?.date || new Date().toISOString()
        },
        professionalId: encounter?.examinerId || 'dr-meirelles',
        professionalName: examinerName,
        professionalRegistry: examinerRegistry,
        issuedAt: new Date().toISOString(),
        version: 1,
        isSigned: true
      };

      const saved = offlineDb.saveClinicalDocument(docRecord, activeClinicId);
      if (onDocumentIssued) {
        onDocumentIssued(saved);
      }
      setIssuedSuccess('✓ Documento emitido, assinado e registrado com sucesso!');

      const printEl = document.getElementById('clinical-doc-issuance-sheet');
      if (printEl) {
        printIsolatedElement(printEl, {
          title: `${title} - ${patient.fullName}`,
          orientation: 'portrait',
          margins: '10mm 10mm'
        });
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('[ClinicalDocumentIssuanceModal] Erro ao emitir:', e);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] text-slate-900 border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-md">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base tracking-wide text-white">EMISSÃO DE DOCUMENTOS CLÍNICOS</h2>
              <p className="text-xs text-slate-400">Solicitação de exames, encaminhamentos e declarações com rastreabilidade</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAndPrint}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Emitir & Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Seleção do Tipo de Documento */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center gap-2 shrink-0 no-print flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-2">Tipo de Documento:</span>
          
          <button
            type="button"
            onClick={() => setDocType('exam_request')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              docType === 'exam_request'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            📋 Solicitação de Exames
          </button>

          <button
            type="button"
            onClick={() => setDocType('referral_letter')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              docType === 'referral_letter'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            ✉️ Carta de Encaminhamento
          </button>

          <button
            type="button"
            onClick={() => setDocType('medical_certificate')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              docType === 'medical_certificate'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            📜 Atestado / Declaração
          </button>

          {issuedSuccess && (
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full animate-bounce ml-auto">
              {issuedSuccess}
            </span>
          )}
        </div>

        {/* Formulário de Edição e Pré-visualização da Folha de Impressão */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col items-center">
          
          {/* Folha A4 de Impressão em Alta Fidelidade */}
          <div 
            id="clinical-doc-issuance-sheet"
            className="w-full max-w-[210mm] min-h-[260mm] bg-white rounded-xl shadow-lg border border-slate-300 p-8 sm:p-12 flex flex-col justify-between text-slate-900 font-sans print:shadow-none print:border-none print:p-0 print:m-0"
          >
            <div>
              {/* Cabeçalho da Clínica */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                    {activeClinic.name || 'OPTOMED CLÍNICA DE OLHOS'}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {activeClinic.address || 'Centro Médico Oftalmológico'} • {activeClinic.city || 'Foz do Iguaçu'}
                  </p>
                  <p className="text-xs text-slate-600">
                    Tel: {activeClinic.phone || '(45) 3025-1000'} • {activeClinic.ownerEmail || 'contato@optomed.com.br'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-slate-400 block">DOCUMENTO CLÍNICO OFICIAL</span>
                  <span className="text-xs font-bold text-blue-600">ID Atendimento: #{encounter?.id.slice(0, 8) || 'AVULSO'}</span>
                  <span className="text-xs text-slate-500 block">{currentDate}</span>
                </div>
              </div>

              {/* Identificação do Paciente */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Paciente:</span>
                  <strong className="text-slate-900 text-sm">{patient.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Documento:</span>
                  <strong className="text-slate-800">{patient.documentType || 'DOC'}: {patient.documentNumber || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Nascimento:</span>
                  <strong className="text-slate-800">
                    {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : '-'}
                  </strong>
                </div>
              </div>

              {/* Título do Documento (Editável) */}
              <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 no-print">
                  Título do Documento:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-center font-black text-base sm:text-lg text-slate-900 uppercase border-b-2 border-slate-300 pb-1 focus:outline-none focus:border-blue-600 print:border-none"
                />
              </div>

              {/* Conteúdo do Documento (Editável com visualização limpa na impressão) */}
              <div className="mb-8">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 no-print">
                  Corpo do Documento Clínico:
                </label>
                <textarea
                  rows={14}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full bg-slate-50/50 p-4 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium leading-relaxed focus:outline-none focus:border-blue-500 print:bg-white print:border-none print:p-0 print:text-sm print:leading-relaxed"
                />
              </div>
            </div>

            {/* Rodapé e Assinatura */}
            <div className="pt-8 border-t border-slate-200 mt-auto">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-[10px] text-slate-400">
                  <p>OptoMed Sistema de Gestão Oftalmológica Integrada</p>
                  <p>Documento emitido eletronicamente e arquivado no prontuário.</p>
                </div>

                <div className="text-center w-64">
                  <div className="border-b border-slate-900 pb-1 mb-1">
                    <span className="font-serif italic font-bold text-slate-800 text-sm block">
                      {examinerName}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 block uppercase">
                    {examinerName}
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    {examinerRegistry}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>,
    document.body
  );
};
