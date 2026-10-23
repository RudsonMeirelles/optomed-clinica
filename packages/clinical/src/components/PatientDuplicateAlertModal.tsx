import React from 'react';
import { AlertTriangle, UserCheck, UserPlus, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { DuplicateCandidateMatch } from '@optotipo/shared';

interface PatientDuplicateAlertModalProps {
  isOpen: boolean;
  newCandidateName: string;
  newCandidateBirthDate?: string;
  newCandidateDoc?: string;
  matches: DuplicateCandidateMatch[];
  onConfirmLink: (match: DuplicateCandidateMatch) => void;
  onProceedAsNew: () => void;
  onClose: () => void;
}

export const PatientDuplicateAlertModal: React.FC<PatientDuplicateAlertModalProps> = ({
  isOpen,
  newCandidateName,
  newCandidateBirthDate,
  newCandidateDoc,
  matches,
  onConfirmLink,
  onProceedAsNew,
  onClose
}) => {
  if (!isOpen || matches.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full text-slate-900 border border-amber-300 flex flex-col overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-wide">POSSÍVEL PACIENTE DUPLICADO DETECTADO</h2>
              <p className="text-xs text-amber-100">Confirmação de identidade requer intervenção humana</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Informativo */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
            <p className="font-bold mb-1">Dados que você está cadastrando:</p>
            <p className="font-black text-slate-900">{newCandidateName}</p>
            {newCandidateBirthDate && <p>Nascimento: {newCandidateBirthDate}</p>}
            {newCandidateDoc && <p>Documento: {newCandidateDoc}</p>}
          </div>

          <div className="space-y-3">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              Cadastros correspondentes encontrados:
            </span>

            {matches.map((match, idx) => (
              <div key={idx} className="p-4 border-2 border-amber-200 bg-white rounded-2xl shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                    match.strength === 'STRONG' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {match.strength === 'STRONG' ? 'Correspondência Forte (Score: ' + match.score + '%)' : 'Possível Duplicidade (' + match.score + '%)'}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Clínica: {match.existingClinicId.toUpperCase()}
                  </span>
                </div>

                <div>
                  <h4 className="font-black text-sm text-slate-900">{match.existingFullName}</h4>
                  <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 mt-0.5">
                    {match.existingBirthDate && <span>Nasc: {match.existingBirthDate}</span>}
                    {match.existingDocumentNumber && <span>Doc: {match.existingDocumentNumber}</span>}
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-0.5">
                  <span className="font-bold block text-[10px] text-slate-500 uppercase">Evidências de correspondência:</span>
                  {match.reasons.map((r, rIdx) => (
                    <p key={rIdx} className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {r}
                    </p>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onConfirmLink(match)}
                  className="w-full mt-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>É a mesma pessoa (Vincular à Identidade Global)</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé / Ação Alternativa */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onProceedAsNew}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>Não é a mesma pessoa (Cadastrar como Novo)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
};
