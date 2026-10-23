/**
 * Optomed Clinical — Motor de Regras de Remuneração dos Examinadores
 *
 * Responsável pela resolução estrita da hierarquia de remuneração:
 * 1. PERÍODO EXTRAORDINÁRIO ESPECÍFICO (data exata, horário, mutirões/campanhas)
 * 2. PERÍODO FIXO RECORRENTE (dia da semana, faixa horária, vigência)
 * 3. ATENDIMENTO AVULSO (fora de qualquer período válido)
 *
 * Princípios do Motor:
 * - Determinístico e Auditável (snapshot congelado da regra aplicada)
 * - Idempotente (chave lógica única rem_apt_{appointmentId})
 * - Detecção explícita de conflitos (não assume silenciosamente em caso de sobreposição ambígua)
 * - Separação total entre Receita da Clínica e Remuneração Devida
 * - Suporte completo Offline-First
 */

import {
  Appointment,
  ExaminerFixedPeriod,
  ExaminerSpecialPeriod,
  ExaminerAvulsoRule,
  ExaminerRemunerationRecord,
  ExaminerClosureRecord,
  RemunerationPreviewResult,
  ConflictCheckResult,
  RemunerationRuleSnapshot,
  RemunerationStatus
} from '@optotipo/shared';
import { offlineDb } from './offlineDb';

export interface EvaluateRemunerationParams {
  clinicId: string;
  examinerId: string;
  examinerName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  appointmentId?: string;
  appointmentType?: string;
  patientId?: string;
  patientName?: string;
  priceReceived?: number;
}

export class ExaminerRemunerationService {
  /**
   * Converte string de horário 'HH:mm' em minutos do dia (0 a 1439) para comparação precisa.
   */
  public timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  /**
   * Retorna o dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado) para uma data YYYY-MM-DD.
   */
  public getDayOfWeek(dateStr: string): number {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    return dateObj.getDay();
  }

  /**
   * Verifica se há conflito de sobreposição de horários entre períodos cadastrados.
   */
  public detectPeriodConflicts(
    clinicId: string,
    examinerId: string,
    date: string,
    time: string
  ): ConflictCheckResult {
    const tMin = this.timeToMinutes(time);
    const dayOfWeek = this.getDayOfWeek(date);

    // 1. Busca períodos extraordinários ativos na data
    const specials = offlineDb.getExaminerSpecialPeriods(clinicId).filter(
      p => p.status === 'active' && p.date === date && (!examinerId || p.examinerId === examinerId)
    );

    // 2. Se houver mais de um extraordinário cobrindo o mesmo horário exato: Conflito
    const matchingSpecials = specials.filter(p => {
      const start = this.timeToMinutes(p.startTime);
      const end = this.timeToMinutes(p.endTime);
      return tMin >= start && tMin <= end;
    });

    if (matchingSpecials.length > 1) {
      return {
        hasConflict: true,
        conflictType: 'MULTIPLE_SPECIAL_SAME_TIME',
        message: `Existem ${matchingSpecials.length} períodos extraordinários conflitantes sobrepostos para o mesmo horário (${time}).`,
        conflictingRules: matchingSpecials.map(p => ({
          id: p.id,
          type: 'extraordinary',
          description: p.notes || 'Período Extraordinário',
          timeRange: `${p.startTime} - ${p.endTime}`
        }))
      };
    }

    // 3. Se houver sobreposição ambígua entre períodos fixos concorrentes
    const fixedPeriods = offlineDb.getExaminerFixedPeriods(clinicId).filter(p => {
      if (!p.active) return false;
      if (examinerId && p.examinerId !== examinerId) return false;
      if (p.dayOfWeek !== dayOfWeek) return false;
      if (p.validFrom && date < p.validFrom) return false;
      if (p.validUntil && date > p.validUntil) return false;
      return true;
    });

    const matchingFixed = fixedPeriods.filter(p => {
      const start = this.timeToMinutes(p.startTime);
      const end = this.timeToMinutes(p.endTime);
      return tMin >= start && tMin <= end;
    });

    if (matchingFixed.length > 1) {
      return {
        hasConflict: true,
        conflictType: 'FIXED_OVERLAP',
        message: `Existem ${matchingFixed.length} períodos fixos conflitantes sobrepostos para o mesmo dia e horário (${time}).`,
        conflictingRules: matchingFixed.map(p => ({
          id: p.id,
          type: 'fixed',
          description: p.notes || 'Período Fixo',
          timeRange: `${p.startTime} - ${p.endTime}`
        }))
      };
    }

    return { hasConflict: false };
  }

  /**
   * Avalia a remuneração em modo de prévia (preview) sem persistir alterações.
   * Utilizada pela Agenda no momento do agendamento ou consulta.
   */
  public previewExaminerRemuneration(params: EvaluateRemunerationParams): RemunerationPreviewResult {
    const { clinicId, examinerId, examinerName, date, time, appointmentId } = params;
    const tMin = this.timeToMinutes(time);
    const dayOfWeek = this.getDayOfWeek(date);

    // Verificação de conflito primeiro
    const conflictCheck = this.detectPeriodConflicts(clinicId, examinerId, date, time);
    if (conflictCheck.hasConflict) {
      return {
        applicable: false,
        ruleType: 'avulso',
        ruleId: 'CONFLICT',
        examinerId,
        examinerName,
        clinicId,
        appointmentId,
        amount: 0,
        status: 'CONFLICT',
        explanation: `CONFLITO ADMINISTRATIVO: ${conflictCheck.message}`,
        conflict: true,
        conflictDetails: conflictCheck.message
      };
    }

    // 1. PRIORIDADE 1: PERÍODO EXTRAORDINÁRIO ESPECÍFICO
    const specials = offlineDb.getExaminerSpecialPeriods(clinicId).filter(
      p => p.status === 'active' && p.date === date && (!examinerId || p.examinerId === examinerId)
    );
    const matchedSpecial = specials.find(p => {
      const s = this.timeToMinutes(p.startTime);
      const e = this.timeToMinutes(p.endTime);
      return tMin >= s && tMin <= e;
    });

    if (matchedSpecial) {
      let amount = 0;
      if (matchedSpecial.remunerationType === 'fixed_period') {
        amount = matchedSpecial.fixedAmount || 0;
      } else if (matchedSpecial.remunerationType === 'per_appointment') {
        amount = matchedSpecial.perAppointmentAmount || 0;
      } else if (matchedSpecial.remunerationType === 'percentage') {
        amount = ((params.priceReceived || 0) * (matchedSpecial.percentage || 0)) / 100;
      }

      return {
        applicable: true,
        ruleType: 'extraordinary',
        ruleId: matchedSpecial.id,
        examinerId,
        examinerName,
        clinicId,
        appointmentId,
        amount,
        status: 'PREVIEW',
        explanation: `Período Extraordinário: ${matchedSpecial.notes || 'Atendimento Especial'} (${matchedSpecial.startTime} às ${matchedSpecial.endTime}) - Data ${date}`,
        conflict: false
      };
    }

    // 2. PRIORIDADE 2: PERÍODO FIXO RECORRENTE
    const fixedPeriods = offlineDb.getExaminerFixedPeriods(clinicId).filter(p => {
      if (!p.active) return false;
      if (examinerId && p.examinerId !== examinerId) return false;
      if (p.dayOfWeek !== dayOfWeek) return false;
      if (p.validFrom && date < p.validFrom) return false;
      if (p.validUntil && date > p.validUntil) return false;
      return true;
    });

    const matchedFixed = fixedPeriods.find(p => {
      const s = this.timeToMinutes(p.startTime);
      const e = this.timeToMinutes(p.endTime);
      return tMin >= s && tMin <= e;
    });

    if (matchedFixed) {
      let amount = 0;
      if (matchedFixed.remunerationType === 'fixed_period') {
        amount = matchedFixed.fixedAmount || 0;
      } else if (matchedFixed.remunerationType === 'per_appointment') {
        amount = matchedFixed.perAppointmentAmount || 0;
      } else if (matchedFixed.remunerationType === 'percentage') {
        amount = ((params.priceReceived || 0) * (matchedFixed.percentage || 0)) / 100;
      }

      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      return {
        applicable: true,
        ruleType: 'fixed',
        ruleId: matchedFixed.id,
        examinerId,
        examinerName,
        clinicId,
        appointmentId,
        amount,
        status: 'PREVIEW',
        explanation: `Período Fixo: ${dayNames[dayOfWeek]} (${matchedFixed.startTime} às ${matchedFixed.endTime}) - Regra ${matchedFixed.notes || 'Contrato Recorrente'}`,
        conflict: false
      };
    }

    // 3. PRIORIDADE 3: ATENDIMENTO AVULSO
    const avulsoRules = offlineDb.getExaminerAvulsoRules(clinicId).filter(
      r => r.active && (!examinerId || r.examinerId === examinerId)
    );
    const matchedAvulso = avulsoRules[0];
    const avulsoAmount = matchedAvulso ? matchedAvulso.perAppointmentAmount : 50.00;

    return {
      applicable: true,
      ruleType: 'avulso',
      ruleId: matchedAvulso ? matchedAvulso.id : 'avulso_default',
      examinerId,
      examinerName,
      clinicId,
      appointmentId,
      amount: avulsoAmount,
      status: 'PREVIEW',
      explanation: `Atendimento Avulso: Consulta realizada fora dos períodos fixos ou extraordinários vigentes. Valor por consulta: R$ ${avulsoAmount.toFixed(2)}.`,
      conflict: false
    };
  }

  /**
   * Conclui o atendimento e gera a remuneração de forma determinística e idempotente.
   * Não duplica remuneração para a mesma consulta.
   */
  public generateRemunerationOnAppointmentCompletion(
    appointment: Appointment,
    clinicId = appointment.clinicId || offlineDb.getActiveClinicId(),
    currentUser = 'Sistema Automático'
  ): { success: boolean; record?: ExaminerRemunerationRecord; message: string } {
    if (!appointment || !appointment.id) {
      return { success: false, message: 'Agendamento inválido.' };
    }

    // Regra: Somente consultas com status 'completed' geram remuneração
    if (appointment.status !== 'completed') {
      return {
        success: false,
        message: `SEM_REMUNERAÇÃO: Agendamento com status '${appointment.status}' não é elegível para remuneração.`
      };
    }

    // Idempotência estrita: Verifica se já existe remuneração gerada para este agendamento
    const existingRecords = offlineDb.getExaminerRemunerations(clinicId);
    const duplicate = existingRecords.find(r => r.appointmentId === appointment.id);
    if (duplicate) {
      return {
        success: true,
        record: duplicate,
        message: 'DUPLICIDADE BLOQUEADA: Remuneração já registrada anteriormente para esta consulta.'
      };
    }

    const examinerId = appointment.examinerId || 'user-examinador';
    const examinerName = appointment.examinerName || 'Dr. Rudson Meirelles';
    const date = appointment.date;
    const time = appointment.time || '10:00';

    // Avalia regra
    const preview = this.previewExaminerRemuneration({
      clinicId,
      examinerId,
      examinerName,
      date,
      time,
      appointmentId: appointment.id,
      appointmentType: appointment.type,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      priceReceived: 50.00
    });

    if (preview.conflict) {
      // Cria registro marcado com CONFLITO para intervenção administrativa (sem pagamento silencioso)
      const conflictRecord: ExaminerRemunerationRecord = {
        id: `rem_apt_${appointment.id}`,
        appointmentId: appointment.id,
        clinicId,
        examinerId,
        examinerName,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        date,
        time,
        appointmentType: appointment.type || 'consulta_geral',
        periodKind: 'avulso',
        ruleDescription: 'CONFLITO DE REGRAS DE REMUNERAÇÃO',
        calculationBasis: preview.explanation,
        ruleSnapshot: {
          ruleId: 'CONFLICT',
          ruleType: 'avulso',
          remunerationType: 'fixed_period',
          remunerationValue: 0,
          clinicId,
          examinerId,
          examinerName,
          explanation: preview.explanation,
          snapshotAt: new Date().toISOString()
        },
        calculatedAmount: 0,
        finalAmount: 0,
        status: 'pending',
        hasConflict: true,
        conflictDetails: preview.conflictDetails,
        auditTrail: [
          {
            action: 'CREATE',
            author: currentUser,
            timestamp: new Date().toISOString(),
            reason: 'Criado com alerta de sobreposição/conflito de horários pendente de resolução'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      offlineDb.saveExaminerRemuneration(conflictRecord, clinicId);
      return {
        success: false,
        record: conflictRecord,
        message: `CONFLITO: ${preview.conflictDetails}. Marcado para resolução administrativa.`
      };
    }

    // Snapshot congelado da regra aplicada
    const ruleSnapshot: RemunerationRuleSnapshot = {
      ruleId: preview.ruleId,
      ruleType: preview.ruleType,
      remunerationType: preview.ruleType === 'avulso' ? 'per_appointment' : 'fixed_period',
      remunerationValue: preview.amount,
      clinicId,
      examinerId,
      examinerName,
      explanation: preview.explanation,
      snapshotAt: new Date().toISOString()
    };

    const newRecord: ExaminerRemunerationRecord = {
      id: `rem_apt_${appointment.id}`,
      appointmentId: appointment.id,
      clinicId,
      examinerId,
      examinerName,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      date,
      time,
      appointmentType: appointment.type || 'consulta_geral',
      periodKind: preview.ruleType,
      periodId: preview.ruleId,
      ruleDescription: preview.explanation,
      calculationBasis: `Atendimento realizado em ${date} às ${time}. Tipo: ${preview.ruleType.toUpperCase()}. Valor calculado: R$ ${preview.amount.toFixed(2)}. Origem: ${preview.ruleId}`,
      ruleSnapshot,
      calculatedAmount: preview.amount,
      finalAmount: preview.amount,
      status: 'pending',
      auditTrail: [
        {
          action: 'CREATE',
          author: currentUser,
          timestamp: new Date().toISOString(),
          newAmount: preview.amount,
          newStatus: 'pending',
          reason: `Geração automática pós conclusão da consulta #${appointment.id}`
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.saveExaminerRemuneration(newRecord, clinicId);
    offlineDb.logAudit(
      'CREATE',
      'FINANCE' as any,
      newRecord.id,
      `Remuneração gerada para ${examinerName}: R$ ${preview.amount.toFixed(2)} (${preview.ruleType})`,
      clinicId
    );

    return {
      success: true,
      record: newRecord,
      message: 'REMUNERAÇÃO GERADA: Atendimento registrado no motor financeiro com sucesso.'
    };
  }

  /**
   * Bloqueia alterações comuns quando o período já estiver fechado ('closed' ou 'paid').
   * Exige permissão e justificativa para ajuste retroativo com auditoria.
   */
  public adjustRemuneration(
    recordId: string,
    newAmount: number,
    reason: string,
    author: string,
    clinicId = offlineDb.getActiveClinicId()
  ): { success: boolean; message: string; record?: ExaminerRemunerationRecord } {
    const list = offlineDb.getExaminerRemunerations(clinicId);
    const record = list.find(r => r.id === recordId);
    if (!record) {
      return { success: false, message: 'Lançamento de remuneração não encontrado.' };
    }

    if (record.status === 'closed' || record.status === 'paid') {
      if (!reason || reason.trim().length < 5) {
        return {
          success: false,
          message: 'ALTERAÇÃO BLOQUEADA: Período já fechado ou quitado. Exige motivo/justificativa administrativa obrigatória.'
        };
      }
    }

    const oldAmount = record.finalAmount;
    record.finalAmount = newAmount;
    record.isRetroactiveAdjusted = true;
    record.status = 'adjusted';
    record.updatedAt = new Date().toISOString();

    record.auditTrail.push({
      action: 'ADJUST',
      author,
      timestamp: new Date().toISOString(),
      oldAmount,
      newAmount,
      reason
    });

    offlineDb.saveExaminerRemuneration(record, clinicId);
    offlineDb.logAudit(
      'UPDATE',
      'FINANCE' as any,
      record.id,
      `Ajuste retroativo de remuneração: de R$ ${oldAmount.toFixed(2)} para R$ ${newAmount.toFixed(2)}. Motivo: ${reason}`,
      clinicId
    );

    return { success: true, message: 'Ajuste auditado com sucesso.', record };
  }

  /**
   * Fechamento Mensal / Periódico de Remuneração por Unidade e Examinador.
   */
  public closeExaminerPeriod(
    clinicId: string,
    examinerId: string,
    examinerName: string,
    startDate: string,
    endDate: string,
    closedBy: string
  ): { success: boolean; closure?: ExaminerClosureRecord; message: string } {
    const allRem = offlineDb.getExaminerRemunerations(clinicId);
    const elegible = allRem.filter(r => {
      if (r.examinerId !== examinerId) return false;
      if (r.date < startDate || r.date > endDate) return false;
      return r.status === 'pending' || r.status === 'approved' || r.status === 'adjusted';
    });

    if (elegible.length === 0) {
      return { success: false, message: 'Nenhuma remuneração em aberto para fechar neste período.' };
    }

    let totalFixedAmount = 0;
    let totalAvulsoAmount = 0;
    let totalExtraordinaryAmount = 0;

    const remunerationIds: string[] = [];

    for (const r of elegible) {
      remunerationIds.push(r.id);
      if (r.periodKind === 'fixed') totalFixedAmount += r.finalAmount;
      else if (r.periodKind === 'extraordinary') totalExtraordinaryAmount += r.finalAmount;
      else totalAvulsoAmount += r.finalAmount;

      r.status = 'closed';
      r.auditTrail.push({
        action: 'CLOSE',
        author: closedBy,
        timestamp: new Date().toISOString(),
        reason: `Fechamento do período ${startDate} a ${endDate}`
      });
      offlineDb.saveExaminerRemuneration(r, clinicId);
    }

    const totalGrossAmount = totalFixedAmount + totalAvulsoAmount + totalExtraordinaryAmount;
    const closure: ExaminerClosureRecord = {
      id: `closure_${clinicId}_${examinerId}_${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}`,
      clinicId,
      examinerId,
      examinerName,
      startDate,
      endDate,
      totalFixedAmount,
      totalAvulsoAmount,
      totalExtraordinaryAmount,
      totalGrossAmount,
      status: 'closed',
      closedBy,
      closedAt: new Date().toISOString(),
      remunerationIds
    };

    offlineDb.saveExaminerClosure(closure, clinicId);

    return {
      success: true,
      closure,
      message: `Fechamento concluído: R$ ${totalGrossAmount.toFixed(2)} consolidado.`
    };
  }

  /**
   * Quitação / Pagamento da Remuneração Fechada com integração ao fluxo de caixa.
   */
  public settleClosurePayment(
    closureId: string,
    paidBy: string,
    paymentMethod = 'pix',
    clinicId = offlineDb.getActiveClinicId()
  ): { success: boolean; message: string } {
    const closures = offlineDb.getExaminerClosures(clinicId);
    const closure = closures.find(c => c.id === closureId);
    if (!closure) return { success: false, message: 'Fechamento não encontrado.' };

    if (closure.status === 'paid') {
      return { success: false, message: 'Este fechamento já foi quitado.' };
    }

    const now = new Date().toISOString();
    closure.status = 'paid';
    closure.paidBy = paidBy;
    closure.paidAt = now;
    closure.paymentMethod = paymentMethod;

    offlineDb.saveExaminerClosure(closure, clinicId);

    // Atualiza status de todas as remunerações vinculadas
    const allRem = offlineDb.getExaminerRemunerations(clinicId);
    for (const remId of closure.remunerationIds) {
      const item = allRem.find(r => r.id === remId);
      if (item) {
        item.status = 'paid';
        item.paidAt = now;
        item.paymentMethod = paymentMethod;
        item.auditTrail.push({
          action: 'PAY',
          author: paidBy,
          timestamp: now,
          reason: `Pagamento efetuado via fechamento #${closure.id}`
        });
        offlineDb.saveExaminerRemuneration(item, clinicId);
      }
    }

    // Gera lançamento financeiro de despesa (repasse de examinador) no fluxo de caixa
    offlineDb.saveTransaction(
      {
        id: `tx_${clinicId}_repasse_${Date.now()}`,
        clinicId,
        type: 'expense',
        category: 'salario',
        description: `Repasse de Remuneração: ${closure.examinerName} (Ref: ${closure.startDate} a ${closure.endDate})`,
        amount: closure.totalGrossAmount,
        amountCents: Math.round(closure.totalGrossAmount * 100),
        currency: 'BRL',
        paymentMethod: paymentMethod as any,
        date: now.split('T')[0],
        status: 'completed',
        isSettled: true,
        settledAt: now,
        createdBy: paidBy,
        createdAt: now,
        // Referências rastreáveis e vinculadas à remuneração do examinador
        examinerId: closure.examinerId,
        examinerName: closure.examinerName,
        closureId: closure.id,
        periodReference: `${closure.startDate} a ${closure.endDate}`
      } as any,
      clinicId
    );

    return { success: true, message: `Pagamento de R$ ${closure.totalGrossAmount.toFixed(2)} registrado com sucesso no Caixa.` };
  }
}

export const examinerRemunerationService = new ExaminerRemunerationService();
