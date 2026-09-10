import React, { useState } from 'react';
import { Prescription, Patient } from '@optotipo/shared';
import { Printer, X, FileText, Settings, Check, Receipt, LayoutTemplate, FileSpreadsheet } from 'lucide-react';
import { offlineDb } from '../services/offlineDb';

export type PrintPaperFormat = 'a4' | 'a5' | 'thermal_80mm';

interface PrescriptionModalProps {
  isOpen: boolean;
  prescription: Prescription | null;
  patient: Patient | null;
  onClose: () => void;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  prescription: initialPrescription,
  patient,
  onClose
}) => {
  const [prescription, setPrescription] = useState<Prescription | null>(initialPrescription);
  const [paperFormat, setPaperFormat] = useState<PrintPaperFormat>('a4');

  React.useEffect(() => {
    setPrescription(initialPrescription);
  }, [initialPrescription]);

  if (!isOpen || !prescription || !patient) return null;

  const activeClinic = offlineDb.getActiveClinic();
  const isEs = activeClinic?.defaultLanguage === 'es-PY' || activeClinic?.id === 'vision' || patient.nationality === 'PY';

  const t = {
    title: isEs ? 'EMISIÓN DE RECETA ÓPTICA' : 'EMISSÃO DE RECEITUÁRIO ÓPTICO',
    subtitle: isEs ? 'Elija el formato de impresora y visualice en tiempo real' : 'Escolha o formato da impressora e visualize em tempo real',
    a4Format: isEs ? 'A4 Estándar' : 'A4 Padrão',
    a5Format: isEs ? 'A5 Reducido' : 'A5 Reduzido',
    ticketFormat: isEs ? 'Ticket 80mm' : 'Cupom 80mm',
    printBtn: isEs ? 'IMPRIMIR RECETA' : 'IMPRIMIR RECEITA',
    dateLabel: isEs ? 'Fecha' : 'Data',
    validityLabel: isEs ? 'Validez' : 'Validade',
    patientLabel: isEs ? 'Paciente' : 'Paciente',
    birthLabel: isEs ? 'Nacimiento' : 'Nascimento',
    phoneLabel: isEs ? 'Teléfono' : 'Telefone',
    notInformed: isEs ? 'No informado' : 'Não informado',
    eye: isEs ? 'OJO' : 'OLHO',
    sphere: isEs ? 'ESFÉRICO' : 'ESFÉRICO',
    cylinder: isEs ? 'CILÍNDRICO' : 'CILÍNDRICO',
    axis: isEs ? 'EJE (°)' : 'EIXO (°)',
    addition: isEs ? 'ADICIÓN' : 'ADIÇÃO',
    prism: isEs ? 'PRISMA' : 'PRISMA',
    flat: isEs ? 'Plano' : 'Plano',
    suggestedLens: isEs ? 'Tipo de Lente Sugerido:' : 'Tipo de Lente Sugerido:',
    pd: isEs ? 'Distancia Pupilar (DP):' : 'Distância Pupilar (DP):',
    treatments: isEs ? 'Tratamientos:' : 'Tratamentos:',
    observations: isEs ? 'Observaciones:' : 'Observações:',
    returnHeader: isEs ? 'INDICACIÓN DE CONTROL / RETORNO:' : 'INDICAÇÃO DE RETORNO:',
    defaultReturn: isEs ? 'Control según indicación clínica y seguimiento anual.' : 'Retorno conforme orientação clínica e controle anual.',
    signature: isEs ? 'Firma y Sello del Profesional' : 'Assinatura & Carimbo do Profissional',
    officialDoc: isEs ? 'Documento Clínico Oficial' : 'Documento Clínico Oficial'
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] text-slate-900 border border-slate-300 flex flex-col overflow-hidden animate-fadeIn">
        
        {/* Barra Superior de Ações e Seleção de Formato de Impressão */}
        <div className="px-4 sm:px-6 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between border-b border-slate-800 shrink-0 no-print gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-wide text-white">{t.title}</h2>
              <p className="text-[11px] text-slate-400">{t.subtitle}</p>
            </div>
          </div>

          {/* Seletor de Formato / Impressora */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setPaperFormat('a4')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                paperFormat === 'a4'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>{t.a4Format}</span>
            </button>

            <button
              onClick={() => setPaperFormat('a5')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                paperFormat === 'a5'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{t.a5Format}</span>
            </button>

            <button
              onClick={() => setPaperFormat('thermal_80mm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                paperFormat === 'thermal_80mm'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{t.ticketFormat}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> {t.printBtn}
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

        {/* Área de Visualização com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/70 flex justify-center">
          
          {/* ========================================================================= */}
          {/* FORMATO 1: A4 PADRÃO (RECEITUÁRIO COMPLETO) */}
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
                      {activeClinic.tagline || 'Avaliação Visual & Refração'}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs font-mono text-slate-600">
                  <div>{t.dateLabel}: <strong>{new Date(prescription.date).toLocaleDateString(isEs ? 'es-PY' : 'pt-BR')}</strong></div>
                  <div>{t.validityLabel}: <strong>{new Date(prescription.expirationDate).toLocaleDateString(isEs ? 'es-PY' : 'pt-BR')}</strong></div>
                </div>
              </div>

              {/* Dados do Paciente */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-300 text-sm">
                <div className="flex items-center justify-between">
                  <div>{t.patientLabel}: <strong className="text-slate-900 text-base">{patient.fullName}</strong></div>
                </div>
                <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-4">
                  <span>{t.birthLabel}: {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString(isEs ? 'es-PY' : 'pt-BR') : t.notInformed}</span>
                  <span>{t.phoneLabel}: {patient.phone || t.notInformed}</span>
                </div>
              </div>

              {/* Tabela Refrativa OD / OE */}
              <div>
                <table className="w-full border-collapse border-2 border-slate-900 text-center text-sm font-mono">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-900 font-sans font-bold text-xs">
                      <th className="p-2.5 border-r-2 border-slate-900">{t.eye}</th>
                      <th className="p-2.5 border-r border-slate-900">{t.sphere}</th>
                      <th className="p-2.5 border-r border-slate-900">{t.cylinder}</th>
                      <th className="p-2.5 border-r border-slate-900">{t.axis}</th>
                      <th className="p-2.5 border-r border-slate-900">{t.addition}</th>
                      <th className="p-2.5">{t.prism}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-400 font-bold text-base">
                      <td className="p-3 border-r-2 border-slate-900 bg-slate-50 font-sans font-black text-sm">OD</td>
                      <td className="p-3 border-r border-slate-900 font-black">
                        {prescription.od.sphere === undefined || prescription.od.sphere === 0
                          ? t.flat
                          : prescription.od.sphere > 0
                          ? `+${prescription.od.sphere.toFixed(2)}`
                          : prescription.od.sphere.toFixed(2)}
                      </td>
                      <td className="p-3 border-r border-slate-900 font-black">
                        {prescription.od.cylinder === undefined || prescription.od.cylinder === 0
                          ? '0.00'
                          : prescription.od.cylinder > 0
                          ? `+${prescription.od.cylinder.toFixed(2)}`
                          : prescription.od.cylinder.toFixed(2)}
                      </td>
                      <td className="p-3 border-r border-slate-900 font-black">{prescription.od.axis ? `${prescription.od.axis}°` : '-'}</td>
                      <td className="p-3 border-r border-slate-900 font-black" rowSpan={2}>
                        {prescription.addition ? `+${prescription.addition.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-3">{prescription.od.prism ? `${prescription.od.prism}Δ` : '-'}</td>
                    </tr>
                    <tr className="font-bold text-base">
                      <td className="p-3 border-r-2 border-slate-900 bg-slate-50 font-sans font-black text-sm">OE</td>
                      <td className="p-3 border-r border-slate-900 font-black">
                        {prescription.oe.sphere === undefined || prescription.oe.sphere === 0
                          ? t.flat
                          : prescription.oe.sphere > 0
                          ? `+${prescription.oe.sphere.toFixed(2)}`
                          : prescription.oe.sphere.toFixed(2)}
                      </td>
                      <td className="p-3 border-r border-slate-900 font-black">
                        {prescription.oe.cylinder === undefined || prescription.oe.cylinder === 0
                          ? '0.00'
                          : prescription.oe.cylinder > 0
                          ? `+${prescription.oe.cylinder.toFixed(2)}`
                          : prescription.oe.cylinder.toFixed(2)}
                      </td>
                      <td className="p-3 border-r border-slate-900 font-black">{prescription.oe.axis ? `${prescription.oe.axis}°` : '-'}</td>
                      <td className="p-3">{prescription.oe.prism ? `${prescription.oe.prism}Δ` : '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Especificações de Lentes */}
              <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-700 bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span>{t.suggestedLens} </span>
                  <strong className="text-slate-900 capitalize">{prescription.lensType || 'Multifocal Digital'}</strong>
                </div>
                <div>
                  <span>{t.pd} </span>
                  <strong className="text-slate-900">{prescription.pdDistanceMm || 62} mm</strong>
                </div>
                <div>
                  <span>{t.treatments} </span>
                  <strong className="text-slate-900">{prescription.treatments?.join(', ') || (isEs ? 'Antirreflejo, Protección UV' : 'Antirreflexo, Proteção UV')}</strong>
                </div>
                <div>
                  <span>{t.observations} </span>
                  <strong className="text-slate-900">{prescription.observations || (isEs ? 'Uso continuo según adaptación.' : 'Uso contínuo conforme adaptação.')}</strong>
                </div>
              </div>

              {/* INDICAÇÃO DE RETORNO DESTACADA */}
              <div className="p-3.5 bg-blue-50/60 border-2 border-blue-900/40 rounded-xl text-xs space-y-1">
                <span className="font-black text-blue-950 uppercase tracking-wider block">
                  {t.returnHeader}
                </span>
                <div className="text-slate-900 font-bold text-sm">
                  {prescription.returnInstructions || t.defaultReturn}
                </div>
              </div>

              {/* Assinatura e Carimbo Manual do Profissional */}
              <div className="pt-20 flex justify-end items-end border-t border-slate-200 mt-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-56 border-b border-slate-400 mb-1" />
                  <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                    {t.signature}
                  </div>
                  <div className="text-[8px] text-slate-400 font-mono">
                    {t.officialDoc}
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
                  <h1 className="text-base font-black tracking-tight text-slate-900">
                    {activeClinic.name}
                  </h1>
                  <p className="text-[10px] text-slate-600 font-medium">
                    {activeClinic.tagline || (isEs ? 'Receta Óptica' : 'Receituário Óptico')}
                  </p>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-600">
                  <div>{t.dateLabel}: <strong>{new Date(prescription.date).toLocaleDateString(isEs ? 'es-PY' : 'pt-BR')}</strong></div>
                  <div>{t.validityLabel}: <strong>{new Date(prescription.expirationDate).toLocaleDateString(isEs ? 'es-PY' : 'pt-BR')}</strong></div>
                </div>
              </div>

              {/* Paciente */}
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-300 flex justify-between items-center text-xs">
                <div>{t.patientLabel}: <strong className="text-slate-900">{patient.fullName}</strong></div>
                {patient.birthDate && <span className="text-[10px] text-slate-500">{t.birthLabel}: {new Date(patient.birthDate).toLocaleDateString(isEs ? 'es-PY' : 'pt-BR')}</span>}
              </div>

              {/* Tabela Refrativa Compacta */}
              <table className="w-full border-collapse border-2 border-slate-900 text-center font-mono text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-900 font-sans font-bold text-[10px]">
                    <th className="p-1.5 border-r-2 border-slate-900">{t.eye}</th>
                    <th className="p-1.5 border-r border-slate-900">{t.sphere}</th>
                    <th className="p-1.5 border-r border-slate-900">{t.cylinder}</th>
                    <th className="p-1.5 border-r border-slate-900">{t.axis}</th>
                    <th className="p-1.5">{t.addition}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-400 font-bold">
                    <td className="p-1.5 border-r-2 border-slate-900 bg-slate-50 font-sans font-black">OD</td>
                    <td className="p-1.5 border-r border-slate-900 font-black">
                      {prescription.od.sphere === undefined || prescription.od.sphere === 0
                        ? t.flat
                        : prescription.od.sphere > 0
                        ? `+${prescription.od.sphere.toFixed(2)}`
                        : prescription.od.sphere.toFixed(2)}
                    </td>
                    <td className="p-1.5 border-r border-slate-900 font-black">
                      {prescription.od.cylinder === undefined || prescription.od.cylinder === 0
                        ? '0.00'
                        : prescription.od.cylinder > 0
                        ? `+${prescription.od.cylinder.toFixed(2)}`
                        : prescription.od.cylinder.toFixed(2)}
                    </td>
                    <td className="p-1.5 border-r border-slate-900 font-black">{prescription.od.axis ? `${prescription.od.axis}°` : '-'}</td>
                    <td className="p-1.5 font-black" rowSpan={2}>
                      {prescription.addition ? `+${prescription.addition.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                  <tr className="font-bold">
                    <td className="p-1.5 border-r-2 border-slate-900 bg-slate-50 font-sans font-black">OE</td>
                    <td className="p-1.5 border-r border-slate-900 font-black">
                      {prescription.oe.sphere === undefined || prescription.oe.sphere === 0
                        ? t.flat
                        : prescription.oe.sphere > 0
                        ? `+${prescription.oe.sphere.toFixed(2)}`
                        : prescription.oe.sphere.toFixed(2)}
                    </td>
                    <td className="p-1.5 border-r border-slate-900 font-black">
                      {prescription.oe.cylinder === undefined || prescription.oe.cylinder === 0
                        ? '0.00'
                        : prescription.oe.cylinder > 0
                        ? `+${prescription.oe.cylinder.toFixed(2)}`
                        : prescription.oe.cylinder.toFixed(2)}
                    </td>
                    <td className="p-1.5 border-r border-slate-900 font-black">{prescription.oe.axis ? `${prescription.oe.axis}°` : '-'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Detalhes & Retorno */}
              <div className="text-[11px] space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div><b>{isEs ? 'Lentes:' : 'Lentes:'}</b> {prescription.lensType || (isEs ? 'Multifocal Digital' : 'Multifocal Digital')} &bull; <b>DP:</b> {prescription.pdDistanceMm || 62} mm</div>
                <div><b>{isEs ? 'Control:' : 'Retorno:'}</b> {prescription.returnInstructions || t.defaultReturn}</div>
                {prescription.observations && <div><b>Obs:</b> {prescription.observations}</div>}
              </div>

              {/* Assinatura */}
              <div className="pt-10 flex justify-end border-t border-slate-200">
                <div className="text-center">
                  <div className="w-40 border-b border-slate-300 mb-1" />
                  <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">{t.signature}</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMATO 3: CUPOM TÉRMICO 80MM (IMPRESSORA NÃO FISCAL POS) */}
          {/* ========================================================================= */}
          {paperFormat === 'thermal_80mm' && (
            <div className="bg-white border-2 border-dashed border-slate-400 p-4 rounded-xl shadow-lg w-[320px] space-y-3 self-start font-mono text-[11px] leading-tight text-slate-900 print:shadow-none print:border-none print:p-2 print:m-0 print:w-full">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h1 className="text-xs font-black uppercase">{activeClinic.name}</h1>
                <p className="text-[9px] text-slate-500">{activeClinic.tagline || (isEs ? 'Receta Óptica' : 'Receituário Óptico')}</p>
                <div className="text-[9px] mt-1 text-slate-500">
                  {t.dateLabel}: {new Date(prescription.date).toLocaleDateString(isEs ? 'es-PY' : 'pt-BR')} &bull; {t.validityLabel}: {new Date(prescription.expirationDate).toLocaleDateString(isEs ? 'es-PY' : 'pt-BR')}
                </div>
              </div>

              <div className="py-1 border-b border-dashed border-slate-400">
                <div className="font-bold">{t.patientLabel.toUpperCase()}:</div>
                <div className="font-bold text-xs">{patient.fullName}</div>
                {patient.phone && <div className="text-[9px] text-slate-500">{t.phoneLabel}: {patient.phone}</div>}
              </div>

              <div className="py-1">
                <div className="text-center font-bold mb-1">{isEs ? '=== REFRACCIÓN ÓPTICA ===' : '=== REFRAÇÃO ÓPTICA ==='}</div>
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-[10px]">
                      <th>{t.eye}</th>
                      <th>{isEs ? 'ESF' : 'ESF'}</th>
                      <th>{isEs ? 'CIL' : 'CIL'}</th>
                      <th>{isEs ? 'EJE' : 'EIXO'}</th>
                    </tr>
                  </thead>
                  <tbody className="font-bold">
                    <tr>
                      <td className="py-0.5">OD</td>
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
                      <td className="py-0.5">OE</td>
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
                    {t.addition}: +{prescription.addition.toFixed(2)} D
                  </div>
                )}
              </div>

              <div className="py-1 border-t border-dashed border-slate-400 space-y-0.5 text-[10px]">
                <div><b>{isEs ? 'Lente:' : 'Lente:'}</b> {prescription.lensType || 'Multifocal'}</div>
                <div><b>DP:</b> {prescription.pdDistanceMm || 62} mm</div>
                <div><b>{isEs ? 'Control:' : 'Retorno:'}</b> {prescription.returnInstructions || t.defaultReturn}</div>
                {prescription.observations && <div><b>Obs:</b> {prescription.observations}</div>}
              </div>

              <div className="pt-8 text-center border-t border-dashed border-slate-300">
                <div className="w-36 mx-auto border-b border-slate-300 mb-1" />
                <div className="text-[8px] text-slate-500 font-medium tracking-wide uppercase">{t.signature}</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
