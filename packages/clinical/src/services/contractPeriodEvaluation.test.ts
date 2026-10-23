import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { isAppointmentOutOfContract } from '../pages/SchedulePage';
import { offlineDb } from './offlineDb';

describe('Optomed Clinical — Identificação de Consultas Fora do Período Contratado', () => {
  let store: Record<string, string> = {};

  beforeAll(() => {
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    (global as any).localStorage = localStorageMock;
    (global as any).window = {
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {}
    };
  });

  beforeEach(() => {
    store = {};
  });

  it('deve identificar como CONTRATADO o atendimento na IVS em Terça-feira entre 13:00 e 18:00', () => {
    // 2026-10-13 é uma Terça-feira
    const apt = {
      date: '2026-10-13',
      time: '14:30',
      clinicId: 'ivs'
    };

    const result = isAppointmentOutOfContract(apt, 'ivs');
    expect(result.isOutOfContract).toBe(false);
    expect(result.isNegotiatedPeriod).toBe(false);
    expect(result.label).toBe('Período Contratado');
  });

  it('deve identificar como FORA DO CONTRATO atendimento na IVS em Terça-feira antes das 13:00 ou após as 18:00', () => {
    // 2026-10-13 (Terça-feira), agendado às 10:00 (fora da grade de 13h-18h)
    const aptMorning = {
      date: '2026-10-13',
      time: '10:00',
      clinicId: 'ivs'
    };

    const resultMorning = isAppointmentOutOfContract(aptMorning, 'ivs');
    expect(resultMorning.isOutOfContract).toBe(true);
    expect(resultMorning.label).toBe('Fora do Horário (Terça)');

    // 2026-10-13 (Terça-feira), agendado às 18:30 (após as 18h)
    const aptNight = {
      date: '2026-10-13',
      time: '18:30',
      clinicId: 'ivs'
    };

    const resultNight = isAppointmentOutOfContract(aptNight, 'ivs');
    expect(resultNight.isOutOfContract).toBe(true);
    expect(resultNight.label).toBe('Fora do Horário (Terça)');
  });

  it('deve identificar como CONTRATADO o atendimento na IVS em Quarta-feira entre 08:00 e 12:00', () => {
    // 2026-10-14 é uma Quarta-feira
    const apt = {
      date: '2026-10-14',
      time: '09:15',
      clinicId: 'ivs'
    };

    const result = isAppointmentOutOfContract(apt, 'ivs');
    expect(result.isOutOfContract).toBe(false);
    expect(result.isNegotiatedPeriod).toBe(false);
    expect(result.label).toBe('Período Contratado');
  });

  it('deve identificar como FORA DO CONTRATO atendimento na IVS em Quarta-feira após as 12:00', () => {
    // 2026-10-14 (Quarta-feira), agendado às 12:30 (após as 12:00)
    const aptAfternoon = {
      date: '2026-10-14',
      time: '12:30',
      clinicId: 'ivs'
    };

    const resultAfternoon = isAppointmentOutOfContract(aptAfternoon, 'ivs');
    expect(resultAfternoon.isOutOfContract).toBe(true);
    expect(resultAfternoon.label).toBe('Fora do Horário (Quarta)');
  });

  it('deve identificar como FORA DO CONTRATO atendimentos em dias não contratados (ex: Quinta, Sexta ou Segunda)', () => {
    // 2026-10-15 é uma Quinta-feira
    const aptThursday = {
      date: '2026-10-15',
      time: '10:00',
      clinicId: 'ivs'
    };

    const resultThursday = isAppointmentOutOfContract(aptThursday, 'ivs');
    expect(resultThursday.isOutOfContract).toBe(true);
    expect(resultThursday.label).toBe('Fora do Contrato');
  });

  it('deve reconhecer override manual expresso (isOutOfContractPeriod = true)', () => {
    // Mesmo em Terça-feira às 15:00, se foi marcado manualmente como avulso/fora do contrato
    const aptOverride = {
      date: '2026-10-13',
      time: '15:00',
      isOutOfContractPeriod: true,
      clinicId: 'ivs'
    };

    const result = isAppointmentOutOfContract(aptOverride, 'ivs');
    expect(result.isOutOfContract).toBe(true);
    expect(result.label).toBe('Fora do Contrato (Avulso)');
  });

  it('deve reconhecer dia/período especial negociado na IVS', () => {
    // 2026-10-10 é Sábado (mutirão negociado cadastrado nos períodos especiais)
    const aptSpecial = {
      date: '2026-10-10',
      time: '09:00',
      clinicId: 'ivs'
    };

    const result = isAppointmentOutOfContract(aptSpecial, 'ivs');
    expect(result.isOutOfContract).toBe(false);
    expect(result.isNegotiatedPeriod).toBe(true);
    expect(result.label).toBe('Período Negociado');
  });

  // --------------------------------------------------------------------------
  // TESTES SINTÉTICOS DE CONFLITO DE CLASSIFICAÇÃO / PRECEDÊNCIA
  // --------------------------------------------------------------------------
  it('TESTE SINTÉTICO 1: Consulta com isOutOfContractPeriod === true dentro de período extraordinário negociado', () => {
    // 2026-10-10 é Sábado (mutirão extraordinário cadastrado das 08:00 às 12:00)
    // O examinador ou recepção marcou MANUALMENTE isOutOfContractPeriod = true
    const aptManualConflict = {
      date: '2026-10-10',
      time: '09:30',
      isOutOfContractPeriod: true,
      clinicId: 'ivs'
    };

    const result = isAppointmentOutOfContract(aptManualConflict, 'ivs');
    // Precedência atual implementada no código: Override Manual (regra 1) precede Período Negociado (regra 2.1)
    expect(result.isOutOfContract).toBe(true);
    expect(result.isNegotiatedPeriod).toBe(false);
    expect(result.label).toBe('Fora do Contrato (Avulso)');
    expect(result.reason).toBe('Marcado manualmente como fora do período contratado');
  });

  it('TESTE SINTÉTICO 2: Consulta sem marcação manual dentro do mesmo período extraordinário negociado', () => {
    // 2026-10-10 é Sábado (mutirão extraordinário cadastrado das 08:00 às 12:00)
    // Consulta sem marcação manual (isOutOfContractPeriod: undefined ou false)
    const aptWithoutManual = {
      date: '2026-10-10',
      time: '09:30',
      isOutOfContractPeriod: false,
      clinicId: 'ivs'
    };

    const result = isAppointmentOutOfContract(aptWithoutManual, 'ivs');
    // Precedência atual implementada no código: Período Especial/Negociado é aplicado
    expect(result.isOutOfContract).toBe(false);
    expect(result.isNegotiatedPeriod).toBe(true);
    expect(result.label).toBe('Período Negociado');
    expect(result.reason).toContain('Período Negociado');
  });
});
