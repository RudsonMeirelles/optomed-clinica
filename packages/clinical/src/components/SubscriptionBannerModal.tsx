import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  QrCode, 
  Copy, 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  Zap,
  ArrowRight,
  Clock,
  X
} from 'lucide-react';
import { 
  licensingService, 
  SUBSCRIPTION_PLANS, 
  PlanDetails 
} from '../services/licensingService';
import { BillingInvoice, SubscriptionPlan } from '@optotipo/shared';

interface SubscriptionBannerModalProps {
  clinicId: string;
  clinicName: string;
  isBlocked?: boolean;
  onRefresh?: () => void;
}

export const SubscriptionBannerModal: React.FC<SubscriptionBannerModalProps> = ({
  clinicId,
  clinicName,
  isBlocked = false,
  onRefresh
}) => {
  const statusInfo = licensingService.checkAccessStatus(clinicId);
  const [showModal, setShowModal] = useState<boolean>(isBlocked);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('annual');
  const [activeInvoice, setActiveInvoice] = useState<BillingInvoice | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [simulatedSuccess, setSimulatedSuccess] = useState<boolean>(false);

  // Não renderiza nada se estiver ativo e com mais de 5 dias
  if (statusInfo.hasAccess && !statusInfo.isTrial && statusInfo.daysRemaining > 5 && !showModal) {
    return null;
  }

  const handleSelectAndPay = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    const inv = licensingService.createInvoice(clinicId, plan, 'pix');
    setActiveInvoice(inv);
  };

  const handleCopyPix = () => {
    if (activeInvoice?.pixCode) {
      navigator.clipboard.writeText(activeInvoice.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleSimulatePayment = () => {
    if (activeInvoice) {
      licensingService.approveInvoiceAndActivate(activeInvoice.id);
      setSimulatedSuccess(true);
      setTimeout(() => {
        setSimulatedSuccess(false);
        setShowModal(false);
        if (onRefresh) onRefresh();
      }, 2000);
    }
  };

  return (
    <>
      {/* Banner Superior se estiver próximo do vencimento ou em teste */}
      {!isBlocked && (
        <div className={`w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold no-print transition-all ${
          statusInfo.isExpired 
            ? 'bg-rose-600 text-white' 
            : statusInfo.daysRemaining <= 3 
              ? 'bg-amber-500 text-slate-950' 
              : 'bg-indigo-600/90 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {statusInfo.isTrial ? (
                <>⭐ <b>Plano de Teste Gratuito:</b> Restam {statusInfo.daysRemaining} dias de avaliação para <b>{clinicName}</b>.</>
              ) : statusInfo.isExpired ? (
                <>🚨 <b>Assinatura Vencida:</b> Regularize seu plano para evitar interrupções no atendimento.</>
              ) : (
                <>⚡ <b>Aviso de Licença:</b> Sua assinatura expira em {statusInfo.daysRemaining} dias.</>
              )}
            </span>
          </div>

          <button 
            onClick={() => {
              handleSelectAndPay('annual');
              setShowModal(true);
            }}
            className="px-3 py-1 bg-white text-slate-950 rounded-lg shadow font-bold hover:bg-slate-100 flex items-center gap-1.5 transition-all text-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {statusInfo.isTrial ? 'Assinar Agora' : 'Renovar Licença'}
          </button>
        </div>
      )}

      {/* Modal / Tela de Bloqueio ou Checkout */}
      {(showModal || isBlocked) && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    {isBlocked ? 'Acesso Temporariamente Suspenso' : 'Planos de Licença • OPTOMED'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Clínica: <b className="text-slate-200">{clinicName}</b> • Liberação instantânea após confirmação
                  </p>
                </div>
              </div>

              {!isBlocked && (
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Conteúdo: Escolha de Planos ou QR Code PIX */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {!activeInvoice ? (
                <>
                  <div className="text-center max-w-lg mx-auto mb-4">
                    <h3 className="text-lg font-bold text-white">Escolha o plano ideal para o seu consultório</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Todos os planos incluem 17 módulos de Optotipo, Prontuário Eletrônico, Controle Remoto e Receituários.
                    </p>
                  </div>

                  {/* Grid de Planos */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <div 
                        key={plan.id}
                        onClick={() => handleSelectAndPay(plan.id)}
                        className={`relative rounded-2xl p-5 border flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 ${
                          plan.id === 'annual'
                            ? 'bg-gradient-to-b from-blue-950/60 to-slate-900 border-blue-500 shadow-xl shadow-blue-500/10'
                            : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {plan.badge && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black tracking-wider uppercase shadow-md">
                            {plan.badge}
                          </div>
                        )}

                        <div>
                          <h4 className="text-base font-bold text-white mb-1">{plan.name}</h4>
                          <div className="mt-3 mb-4">
                            <div className="text-3xl font-black text-white">
                              R$ {plan.monthlyEquivalent.toFixed(2)}
                              <span className="text-xs text-slate-400 font-normal"> /mês</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {plan.durationMonths === 1 
                                ? 'Cobrado mensalmente' 
                                : `R$ ${plan.price.toFixed(2)} faturado a cada ${plan.durationMonths} meses`}
                            </div>
                          </div>

                          <ul className="space-y-2 text-xs text-slate-300 mb-6">
                            {plan.features.map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          plan.id === 'annual'
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}>
                          <span>Selecionar e Pagar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Tela de Pagamento PIX */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-2xl mx-auto py-2">
                  <div className="flex flex-col items-center bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center">
                    <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                      Pague com PIX Instantâneo
                    </div>
                    
                    <div className="p-3 bg-white rounded-2xl shadow-lg my-2">
                      <img 
                        src={activeInvoice.pixQrUrl} 
                        alt="QR Code PIX" 
                        className="w-48 h-48 object-contain"
                      />
                    </div>

                    <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Vencimento: {activeInvoice.dueDate}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Resumo da Fatura</span>
                      <h3 className="text-2xl font-black text-white mt-1">
                        R$ {activeInvoice.amount.toFixed(2)}
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Plano: <b>{SUBSCRIPTION_PLANS.find(p => p.id === activeInvoice.plan)?.name}</b>
                      </p>
                    </div>

                    {/* Copia e Cola */}
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Código PIX Copia e Cola:
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={activeInvoice.pixCode} 
                          className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-xl flex-1 font-mono truncate focus:outline-none"
                        />
                        <button 
                          onClick={handleCopyPix}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>

                    {/* Botão de Liberação / Simulação */}
                    <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                      <button 
                        onClick={handleSimulatePayment}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                      >
                        {simulatedSuccess ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Pagamento Confirmado! Liberando...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            <span>Confirmar Pagamento e Liberar Sistema</span>
                          </>
                        )}
                      </button>

                      <button 
                        onClick={() => setActiveInvoice(null)}
                        className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        Voltar e Escolher Outro Plano
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé Seguro */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Ambiente Seguro • Emissão Automática de Nota Fiscal • Suporte (45) 99999-8888
            </div>

          </div>
        </div>
      )}
    </>
  );
};
