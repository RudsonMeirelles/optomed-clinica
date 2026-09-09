import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  QrCode, 
  Download, 
  X, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Lock, 
  Sparkles,
  Award
} from 'lucide-react';
import { ClinicConfig, SubscriptionPlan } from '@optotipo/shared';
import { SUBSCRIPTION_PLANS, licensingService } from '../services/licensingService';
import { OptomedBrandLogo } from '../components/SyncStatusBadge';

interface LicenseProposalModalProps {
  clinic: ClinicConfig;
  isOpen: boolean;
  onClose: () => void;
  onLicenseActivated?: () => void;
}

export const LicenseProposalModal: React.FC<LicenseProposalModalProps> = ({
  clinic,
  isOpen,
  onClose,
  onLicenseActivated
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(clinic.subscription?.plan || 'annual');
  const [copiedPix, setCopiedPix] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [activationDone, setActivationDone] = useState<boolean>(false);

  if (!isOpen) return null;

  const planInfo = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan) || SUBSCRIPTION_PLANS[3];
  const licenseKey = clinic.subscription?.licenseKey || licensingService.generateLicenseKey(clinic.id, selectedPlan);

  // PIX Dinâmico padrão BACEN
  const pixCode = `00020126580014br.gov.bcb.pix0136optomed-licenca-${clinic.id}-${Date.now()}520400005303986540${planInfo.price.toFixed(2)}5802BR5916OPTOMED CLINICA6009FOZ IGUACU62070503***6304${Math.floor(1000 + Math.random() * 9000)}`;
  const pixQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(licenseKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDirectActivation = () => {
    setIsActivating(true);
    setTimeout(() => {
      const months = planInfo.durationMonths || 12;
      licensingService.setClinicSubscriptionManually(clinic.id, selectedPlan, months);
      setIsActivating(false);
      setActivationDone(true);
      setTimeout(() => {
        setActivationDone(false);
        if (onLicenseActivated) onLicenseActivated();
      }, 1500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:fixed">
      <div className="bg-slate-900 border border-slate-800 print:border-none rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] print:max-h-none print:h-auto print:shadow-none print:bg-white">
        
        {/* Barra Superior - Ações de Fechamento e Impressão */}
        <div className="bg-slate-950/90 border-b border-slate-800 p-4 px-6 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Proposta Comercial & Termo de Licenciamento
              </h2>
              <p className="text-[11px] text-slate-400">
                Documento formal pronto para envio ao cliente ou impressão
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Seletor Rápido de Plano para a Proposta (No-Print) */}
        <div className="bg-slate-950 border-b border-slate-800/80 p-4 px-6 flex flex-wrap items-center justify-between gap-3 no-print shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Selecionar Plano para Proposta:</span>
            <div className="flex items-center gap-1.5">
              {SUBSCRIPTION_PLANS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedPlan === p.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  {p.name.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Botão de Ativação Instantânea (Master Admin) */}
          <button
            onClick={handleDirectActivation}
            disabled={isActivating || activationDone}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            {activationDone ? (
              <>
                <Check className="w-4 h-4" />
                <span>Licença Ativada!</span>
              </>
            ) : isActivating ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Award className="w-4 h-4" />
                <span>Aprovar & Ativar Agora</span>
              </>
            )}
          </button>
        </div>

        {/* ================= CORPO DA PROPOSTA (LAYOUT OFICIAL TIMBRADO) ================= */}
        <div className="p-8 space-y-6 overflow-y-auto text-slate-200 print:text-black print:p-8 print:overflow-visible">
          
          {/* Cabeçalho Corporativo Timbrado */}
          <div className="flex items-start justify-between border-b-2 border-slate-700/80 print:border-black pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-slate-950 print:bg-transparent p-3 rounded-2xl border border-slate-800 print:border-none">
                <OptomedBrandLogo size="md" showText={true} />
              </div>
              <div>
                <div className="text-xs text-blue-400 print:text-blue-700 font-bold uppercase tracking-widest">
                  Tecnologia Oftalmológica & Optometria
                </div>
                <div className="text-lg font-black text-white print:text-black mt-0.5">
                  Termo de Adesão & Licenciamento de Software
                </div>
                <div className="text-xs text-slate-400 print:text-slate-600">
                  Documento Proposta Nº OPT-{clinic.code}-{new Date().getFullYear()}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 print:text-slate-600 font-bold">
                Data de Emissão
              </div>
              <div className="text-sm font-black text-white print:text-black">
                {new Date().toLocaleDateString('pt-BR')}
              </div>
              <div className="text-[11px] text-emerald-400 print:text-emerald-700 font-semibold mt-0.5">
                Validade da Proposta: 7 dias
              </div>
            </div>
          </div>

          {/* Dados do Licenciado / Consultório */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 print:bg-slate-100 p-4 rounded-2xl border border-slate-800 print:border-slate-300">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 tracking-wider">
                Dados da Clínica Contratante
              </div>
              <div className="text-base font-black text-white print:text-black mt-0.5">
                {clinic.name}
              </div>
              <div className="text-xs text-slate-300 print:text-slate-700 mt-1 space-y-0.5">
                <div>Responsável: <span className="font-semibold text-white print:text-black">{clinic.ownerName || 'Não informado'}</span></div>
                <div>E-mail: <span className="font-semibold text-white print:text-black">{clinic.ownerEmail || 'Não informado'}</span></div>
                <div>Telefone: <span className="font-semibold text-white print:text-black">{clinic.phone || 'Não informado'}</span></div>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 tracking-wider">
                Unidade & Localização
              </div>
              <div className="text-sm font-bold text-white print:text-black mt-0.5">
                {clinic.city || 'Foz do Iguaçu'} — {clinic.country || 'Brasil'}
              </div>
              <div className="text-xs text-slate-300 print:text-slate-700 mt-1">
                <div>Código Tenant: <span className="font-mono font-bold text-blue-400 print:text-blue-700">{clinic.code}</span></div>
                <div>Isolamento: <span className="text-emerald-400 print:text-emerald-700 font-semibold">Banco de Dados Dedicado (LGPD)</span></div>
                <div>Status Atual: <span className="font-bold uppercase text-amber-400 print:text-amber-700">{clinic.subscription?.status || 'trial'}</span></div>
              </div>
            </div>
          </div>

          {/* Chave de Licença Serial Segura */}
          <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 print:bg-slate-50 border border-blue-500/30 print:border-blue-300 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-blue-400 print:text-blue-800 tracking-wider">
                  Chave Digital de Licenciamento Autêntico
                </div>
                <div className="text-lg font-mono font-black text-white print:text-black tracking-wider">
                  {licenseKey}
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyKey}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 print:hidden rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700 shrink-0"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Copiado!' : 'Copiar Chave'}</span>
            </button>
          </div>

          {/* Escopo do Plano & Investimento */}
          <div className="border border-slate-800 print:border-slate-300 rounded-2xl overflow-hidden">
            <div className="bg-slate-950 print:bg-slate-200 p-4 flex items-center justify-between border-b border-slate-800 print:border-slate-300">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-blue-400 print:text-blue-800 font-black">
                  Plano Selecionado
                </span>
                <h3 className="text-base font-black text-white print:text-black">
                  {planInfo.name}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-emerald-400 print:text-emerald-800">
                  R$ {planInfo.price.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400 print:text-slate-600">
                  Vigência: {planInfo.durationMonths} {planInfo.durationMonths === 1 ? 'mês' : 'meses'}
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-900/40 print:bg-white space-y-2.5">
              <div className="text-xs font-bold text-slate-300 print:text-slate-800 uppercase tracking-wider mb-2">
                Recursos Inclusos nesta Licença:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {planInfo.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 print:text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pagamento via PIX com QR Code */}
          <div className="bg-slate-950/80 print:bg-slate-100 border border-slate-800 print:border-slate-300 p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-white p-2.5 rounded-xl shrink-0 shadow-md">
              <img 
                src={pixQrUrl} 
                alt="QR Code PIX OptoMed" 
                className="w-36 h-36 object-contain"
              />
            </div>

            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 print:text-emerald-700 tracking-wider">
                  Chave PIX Instantâneo Oficial
                </span>
                <h4 className="text-sm font-bold text-white print:text-black">
                  Escaneie o QR Code ou utilize o código Copia e Cola
                </h4>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                  Após o pagamento, a liberação e ativação da licença é imediata.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 print:hidden">
                <input 
                  type="text" 
                  readOnly 
                  value={pixCode}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 select-all flex-1"
                />
                <button
                  onClick={handleCopyPix}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer shrink-0"
                >
                  {copiedPix ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPix ? 'Código Copiado!' : 'Copiar PIX'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Termos e Assinatura */}
          <div className="pt-4 border-t border-slate-800 print:border-slate-400 text-[11px] text-slate-400 print:text-slate-600 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="font-bold text-slate-300 print:text-black block mb-1">Garantia & SLA de Disponibilidade</span>
                O sistema OptoMed Clínica opera com arquitetura híbrida (offline-first permanente com sincronização em nuvem e túnel seguro). O contratante possui acesso contínuo aos prontuários e ao optotipo mesmo em eventuais quedas de internet.
              </div>
              <div>
                <span className="font-bold text-slate-300 print:text-black block mb-1">Privacidade & Conformidade LGPD</span>
                Todos os dados de pacientes, anamneses e exames refrativos são de titularidade exclusiva do consultório médico/optométrico, armazenados em contêiner de dados isolado com criptografia local.
              </div>
            </div>

            {/* Linhas de Assinatura (Para impressão) */}
            <div className="hidden print:grid grid-cols-2 gap-12 pt-12 text-center text-xs text-black">
              <div className="border-t border-black pt-2">
                <div className="font-bold">OptoMed Tecnologia Oftalmológica</div>
                <div className="text-[10px] text-slate-600">Diretoria de Licenciamento SaaS</div>
              </div>
              <div className="border-t border-black pt-2">
                <div className="font-bold">{clinic.ownerName || clinic.name}</div>
                <div className="text-[10px] text-slate-600">Contratante / Responsável Legal</div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
