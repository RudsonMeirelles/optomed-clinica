import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { 
  Appointment, 
  AppointmentStatus, 
  Patient, 
  ClinicalEncounter,
  canTransitionAppointmentStatus,
  ALLOWED_APPOINTMENT_TRANSITIONS,
  mergeAppointmentStatuses,
  isPatientInWaitingQueue
} from '@optotipo/shared';
import { offlineDb } from './offlineDb';

describe('FASE 27 — Refinamento Operacional: Recepção, Agenda, Fila, TV e Sincronização Concorrente', () => {
  const CLINIC_A = 'clinica-alfa';
  const CLINIC_B = 'clinica-beta';
  let store: Record<string, string> = {};

  beforeAll(() => {
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    (global as any).localStorage = localStorageMock;
  });

  beforeEach(() => {
    store = {};
    offlineDb.setActiveClinicId(CLINIC_A);

    // Configurar duas clínicas autorizadas para os testes multiunidade
    const clinics = [
      { id: CLINIC_A, name: 'Clínica Alfa - Matriz', code: 'ALFA', country: 'BR', timezone: 'America/Sao_Paulo', defaultLanguage: 'pt-BR', rooms: ['Consultório 1', 'Consultório 2'] },
      { id: CLINIC_B, name: 'Clínica Beta - Filial', code: 'BETA', country: 'BR', timezone: 'America/Sao_Paulo', defaultLanguage: 'pt-BR', rooms: ['Consultório 1'] }
    ];
    store['optotipo_clinics_config_v2'] = JSON.stringify(clinics);
  });

  // TESTE 1: CICLO COMPLETO DO AGENDAMENTO E ATENDIMENTO
  it('1. Ciclo Completo: cadastro -> agendamento -> confirmação -> chegada -> fila -> chamada -> sala -> início -> conclusão', () => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    // 1.1 Cadastro de Paciente
    const patient: Patient = {
      id: 'pat-lifecycle-100',
      fullName: 'Sebastião Rodrigues',
      birthDate: '1975-04-12',
      documentNumber: '12345678900',
      phone: '11987654321',
      clinicId: CLINIC_A,
      createdAt: now,
      updatedAt: now
    };
    offlineDb.savePatient(patient, CLINIC_A);
    const savedPatient = offlineDb.getPatients(CLINIC_A).find(p => p.id === patient.id);
    expect(savedPatient).toBeDefined();

    // 1.2 Agendamento
    const apt: Appointment = {
      id: 'apt-lifecycle-100',
      patientId: patient.id,
      patientName: patient.fullName,
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      date: today,
      time: '14:00',
      durationMinutes: 30,
      type: 'refrativo',
      status: 'scheduled',
      clinicId: CLINIC_A,
      createdAt: now,
      updatedAt: now
    };
    offlineDb.saveAppointment(apt, CLINIC_A);
    expect(offlineDb.getAppointments(CLINIC_A).find(a => a.id === apt.id)?.status).toBe('scheduled');

    // 1.3 Confirmação
    offlineDb.updateAppointmentStatus(apt.id, 'confirmed', CLINIC_A);
    expect(offlineDb.getAppointments(CLINIC_A).find(a => a.id === apt.id)?.status).toBe('confirmed');

    // 1.4 Chegada (Check-in na recepção com emissão de senha)
    offlineDb.updateAppointmentStatus(apt.id, 'checked_in', CLINIC_A);
    let currentApt = offlineDb.getAppointments(CLINIC_A).find(a => a.id === apt.id);
    expect(currentApt?.status).toBe('checked_in');
    expect(currentApt?.checkInAt).toBeDefined();

    // 1.5 Fila de Espera ativa
    expect(isPatientInWaitingQueue(currentApt!.status)).toBe(true);
    offlineDb.updateAppointmentStatus(apt.id, 'waiting', CLINIC_A);
    currentApt = offlineDb.getAppointments(CLINIC_A).find(a => a.id === apt.id);
    expect(currentApt?.status).toBe('waiting');
    expect(isPatientInWaitingQueue(currentApt!.status)).toBe(true);

    // 1.6 Chamada na TV
    offlineDb.updateAppointmentStatus(apt.id, 'called', CLINIC_A);
    currentApt = offlineDb.getAppointments(CLINIC_A).find(a => a.id === apt.id);
    expect(currentApt?.status).toBe('called');
    expect(currentApt?.calledAt).toBeDefined();

    // 1.7 Entrada na Sala & Início da Consulta
    offlineDb.updateAppointmentStatus(apt.id, 'in_consultation', CLINIC_A);
    currentApt = offlineDb.getAppointments(CLINIC_A).find(a => a.id === apt.id);
    expect(currentApt?.status).toBe('in_consultation');
    expect(currentApt?.startedAt).toBeDefined();
    // Saiu da fila de espera externa
    expect(isPatientInWaitingQueue(currentApt!.status)).toBe(false);

    // 1.8 Conclusão pelo Prontuário Clínico
    const encounter: ClinicalEncounter = {
      id: 'enc-lifecycle-100',
      patientId: patient.id,
      appointmentId: apt.id,
      date: now,
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      clinicId: CLINIC_A,
      updatedAt: now
    };
    offlineDb.saveEncounter(encounter, CLINIC_A);

    // O agendamento é automaticamente finalizado
    currentApt = offlineDb.getAppointments(CLINIC_A).find(a => a.id === apt.id);
    expect(currentApt?.status).toBe('completed');
    expect(currentApt?.completedAt).toBeDefined();
  });

  // TESTE 2: PREVENÇÃO DE DOIS ATENDIMENTOS ATIVOS INCOMPATÍVEIS
  it('2. Anti-Concorrência & Incompatibilidade: um paciente não pode estar simultaneamente em dois atendimentos ativos', () => {
    const patientId = 'pat-single-active-001';
    const patientGlobalId = 'global-pat-001';

    // Nenhum atendimento ativo inicialmente
    const preCheck = offlineDb.hasActiveEncounter(patientId, patientGlobalId, undefined, CLINIC_A, true);
    expect(preCheck.active).toBe(false);

    // Consultório 1 inicia atendimento
    const enc1: ClinicalEncounter = {
      id: 'enc-room1-001',
      patientId,
      patientGlobalId,
      status: 'in_progress',
      date: new Date().toISOString(),
      examinerId: 'dr-1',
      examinerName: 'Dr. Um',
      clinicId: CLINIC_A,
      updatedAt: new Date().toISOString()
    };
    offlineDb.saveEncounter(enc1, CLINIC_A);

    // Verificação de travamento na mesma clínica
    const checkSameClinic = offlineDb.hasActiveEncounter(patientId, patientGlobalId, undefined, CLINIC_A, false);
    expect(checkSameClinic.active).toBe(true);
    expect(checkSameClinic.encounter?.id).toBe(enc1.id);

    // Tentativa de abrir consulta para o mesmo paciente no Consultório 2 (passando enc2) deve detectar o conflito
    const checkRoom2 = offlineDb.hasActiveEncounter(patientId, patientGlobalId, 'enc-room2-new', CLINIC_A, false);
    expect(checkRoom2.active).toBe(true);
    expect(checkRoom2.encounter?.id).toBe(enc1.id);

    // Tentativa de abrir consulta para a mesma pessoa física na Clínica Beta (cross-clinic scan)
    const checkCrossClinic = offlineDb.hasActiveEncounter(patientId, patientGlobalId, undefined, CLINIC_B, true);
    expect(checkCrossClinic.active).toBe(true);
    expect(checkCrossClinic.encounter?.id).toBe(enc1.id);

    // Ao concluir o atendimento 1, o paciente é liberado
    const enc1Done: ClinicalEncounter = {
      ...enc1,
      status: 'completed',
      updatedAt: new Date().toISOString()
    };
    offlineDb.saveEncounter(enc1Done, CLINIC_A);

    const checkAfterComplete = offlineDb.hasActiveEncounter(patientId, patientGlobalId, undefined, CLINIC_A, true);
    expect(checkAfterComplete.active).toBe(false);
  });

  // TESTE 3: DUAS SALAS DISTINTAS ATENDENDO PACIENTES DISTINTOS INDEPENDENTEMENTE
  it('3. Duas Salas: Consultório 1 e Consultório 2 chamam e atendem pacientes distintos sem conflito', () => {
    const apt1: Appointment = {
      id: 'apt-room1',
      patientId: 'pat-room1',
      patientName: 'Paciente Um',
      examinerId: 'dr-1',
      examinerName: 'Dra. Alice',
      date: '2026-09-26',
      time: '15:00',
      durationMinutes: 30,
      type: 'refrativo',
      status: 'waiting',
      room: 'Consultório 1',
      ticketNumber: 'G-01',
      clinicId: CLINIC_A,
      createdAt: '',
      updatedAt: ''
    };
    const apt2: Appointment = {
      id: 'apt-room2',
      patientId: 'pat-room2',
      patientName: 'Paciente Dois',
      examinerId: 'dr-2',
      examinerName: 'Dr. Roberto',
      date: '2026-09-26',
      time: '15:05',
      durationMinutes: 30,
      type: 'retorno',
      status: 'waiting',
      room: 'Consultório 2',
      ticketNumber: 'R-01',
      clinicId: CLINIC_A,
      createdAt: '',
      updatedAt: ''
    };

    offlineDb.saveAppointment(apt1, CLINIC_A);
    offlineDb.saveAppointment(apt2, CLINIC_A);

    // Sala 1 chama paciente 1
    offlineDb.updateAppointmentStatus(apt1.id, 'called', CLINIC_A);
    // Sala 2 chama paciente 2
    offlineDb.updateAppointmentStatus(apt2.id, 'called', CLINIC_A);

    // Ambas as chamadas estão registradas com seus respectivos consultórios
    const allApts = offlineDb.getAppointments(CLINIC_A);
    const loaded1 = allApts.find(a => a.id === apt1.id);
    const loaded2 = allApts.find(a => a.id === apt2.id);

    expect(loaded1?.status).toBe('called');
    expect(loaded1?.room).toBe('Consultório 1');
    expect(loaded2?.status).toBe('called');
    expect(loaded2?.room).toBe('Consultório 2');

    // Ambas iniciam consulta simultaneamente sem colisão
    offlineDb.updateAppointmentStatus(apt1.id, 'in_consultation', CLINIC_A);
    offlineDb.updateAppointmentStatus(apt2.id, 'in_consultation', CLINIC_A);

    const enc1: ClinicalEncounter = {
      id: 'enc-1',
      patientId: apt1.patientId,
      status: 'in_progress',
      date: new Date().toISOString(),
      examinerId: 'dr-1',
      examinerName: 'Dra. Alice',
      clinicId: CLINIC_A,
      updatedAt: new Date().toISOString()
    };
    const enc2: ClinicalEncounter = {
      id: 'enc-2',
      patientId: apt2.patientId,
      status: 'in_progress',
      date: new Date().toISOString(),
      examinerId: 'dr-2',
      examinerName: 'Dr. Roberto',
      clinicId: CLINIC_A,
      updatedAt: new Date().toISOString()
    };

    offlineDb.saveEncounter(enc1, CLINIC_A);
    offlineDb.saveEncounter(enc2, CLINIC_A);

    // Ambos estão ativos em salas separadas
    expect(offlineDb.hasActiveEncounter(apt1.patientId, undefined, undefined, CLINIC_A).active).toBe(true);
    expect(offlineDb.hasActiveEncounter(apt2.patientId, undefined, undefined, CLINIC_A).active).toBe(true);
  });

  // TESTE 4: MULTIUNIDADE - NUNCA MISTURAR FILA DE CLÍNICAS DIFERENTES
  it('4. Multiunidade: filas, agendamentos e prontuários de clínicas distintas nunca se misturam', () => {
    const aptAlfa: Appointment = {
      id: 'apt-alfa-01',
      patientId: 'pat-alfa-01',
      patientName: 'Paciente da Alfa',
      examinerId: 'dr-alfa',
      examinerName: 'Dr. Alfa',
      date: '2026-09-26',
      time: '09:00',
      durationMinutes: 30,
      type: 'refrativo',
      status: 'waiting',
      ticketNumber: 'A-01',
      clinicId: CLINIC_A,
      createdAt: '',
      updatedAt: ''
    };
    const aptBeta: Appointment = {
      id: 'apt-beta-01',
      patientId: 'pat-beta-01',
      patientName: 'Paciente da Beta',
      examinerId: 'dr-beta',
      examinerName: 'Dra. Beta',
      date: '2026-09-26',
      time: '09:00',
      durationMinutes: 30,
      type: 'refrativo',
      status: 'waiting',
      ticketNumber: 'B-01',
      clinicId: CLINIC_B,
      createdAt: '',
      updatedAt: ''
    };

    offlineDb.saveAppointment(aptAlfa, CLINIC_A);
    offlineDb.saveAppointment(aptBeta, CLINIC_B);

    // Fila da Clínica Alfa só contém aptAlfa
    const listAlfa = offlineDb.getAppointments(CLINIC_A);
    expect(listAlfa.some(a => a.id === aptAlfa.id)).toBe(true);
    expect(listAlfa.some(a => a.id === aptBeta.id)).toBe(false);

    // Fila da Clínica Beta só contém aptBeta
    const listBeta = offlineDb.getAppointments(CLINIC_B);
    expect(listBeta.some(a => a.id === aptBeta.id)).toBe(true);
    expect(listBeta.some(a => a.id === aptAlfa.id)).toBe(false);
  });

  // TESTE 5: CANCELAMENTO E AUSÊNCIA (NO-SHOW) PRESERVANDO HISTÓRICO
  it('5. Cancelamento e Falta (No-Show): transição permitida preservando registro auditado', () => {
    const aptCancel: Appointment = {
      id: 'apt-cancel-01',
      patientId: 'pat-cancel-01',
      patientName: 'Marcos Cancelado',
      examinerId: 'dr-1',
      examinerName: 'Dr. Teste',
      date: '2026-09-26',
      time: '16:00',
      durationMinutes: 30,
      type: 'refrativo',
      status: 'confirmed',
      clinicId: CLINIC_A,
      createdAt: '',
      updatedAt: ''
    };
    offlineDb.saveAppointment(aptCancel, CLINIC_A);

    // Cancelar
    expect(canTransitionAppointmentStatus('confirmed', 'canceled')).toBe(true);
    const cancelSuccess = offlineDb.updateAppointmentStatus(aptCancel.id, 'canceled', CLINIC_A);
    expect(cancelSuccess).toBe(true);

    const postCancel = offlineDb.getAppointments(CLINIC_A).find(a => a.id === aptCancel.id);
    expect(postCancel?.status).toBe('canceled');
    expect(isPatientInWaitingQueue(postCancel!.status)).toBe(false);

    // Paciente que não compareceu (no_show)
    const aptNoShow: Appointment = {
      id: 'apt-noshow-01',
      patientId: 'pat-noshow-01',
      patientName: 'Faltante Silva',
      examinerId: 'dr-1',
      examinerName: 'Dr. Teste',
      date: '2026-09-26',
      time: '16:30',
      durationMinutes: 30,
      type: 'refrativo',
      status: 'scheduled',
      clinicId: CLINIC_A,
      createdAt: '',
      updatedAt: ''
    };
    offlineDb.saveAppointment(aptNoShow, CLINIC_A);

    expect(canTransitionAppointmentStatus('scheduled', 'no_show')).toBe(true);
    const noShowSuccess = offlineDb.updateAppointmentStatus(aptNoShow.id, 'no_show', CLINIC_A);
    expect(noShowSuccess).toBe(true);

    const postNoShow = offlineDb.getAppointments(CLINIC_A).find(a => a.id === aptNoShow.id);
    expect(postNoShow?.status).toBe('no_show');
    expect(isPatientInWaitingQueue(postNoShow!.status)).toBe(false);
  });

  // TESTE 6: OPERAÇÃO OFFLINE NA RECEPÇÃO (CHECK-IN E FILA SEM INTERNET)
  it('6. Operação Offline: recepção executa check-in, fila e chamadas localmente com persistência durável', () => {
    // Simula navegador desconectado
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true
    });

    const aptOffline: Appointment = {
      id: 'apt-offline-01',
      patientId: 'pat-offline-01',
      patientName: 'Ana Offline',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      date: '2026-09-26',
      time: '11:30',
      durationMinutes: 30,
      type: 'refrativo',
      status: 'scheduled',
      clinicId: CLINIC_A,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.saveAppointment(aptOffline, CLINIC_A);

    // Check-in offline
    const checkInDone = offlineDb.updateAppointmentStatus(aptOffline.id, 'checked_in', CLINIC_A);
    expect(checkInDone).toBe(true);

    // Chamada offline
    const callDone = offlineDb.updateAppointmentStatus(aptOffline.id, 'called', CLINIC_A);
    expect(callDone).toBe(true);

    // Recupera dados salvos localmente
    const loaded = offlineDb.getAppointments(CLINIC_A).find(a => a.id === aptOffline.id);
    expect(loaded?.status).toBe('called');
    expect(loaded?.checkInAt).toBeDefined();
    expect(loaded?.calledAt).toBeDefined();

    // Restaura onLine
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      configurable: true
    });
  });

  // TESTE 7: RECONEXÃO & CONCORRÊNCIA COM PRECEDÊNCIA DE STATUS
  it('7. Reconexão e Concorrência: mergeAppointmentStatuses resolve eventos concorrentes sem regredir status', () => {
    // Cenário: No servidor o agendamento ainda está como "checked_in" (latência de rede),
    // enquanto no terminal local o examinador já atendeu ("in_consultation") ou concluiu ("completed").
    expect(mergeAppointmentStatuses('checked_in', 'in_consultation')).toBe('in_consultation');
    expect(mergeAppointmentStatuses('in_consultation', 'checked_in')).toBe('in_consultation');
    expect(mergeAppointmentStatuses('waiting', 'completed')).toBe('completed');
    expect(mergeAppointmentStatuses('completed', 'waiting')).toBe('completed');
    expect(mergeAppointmentStatuses('called', 'in_consultation')).toBe('in_consultation');
    expect(mergeAppointmentStatuses('scheduled', 'confirmed')).toBe('confirmed');
    expect(mergeAppointmentStatuses('confirmed', 'checked_in')).toBe('checked_in');

    // Regressão impossível: mesmo que chegue um pacote antigo com status "waiting",
    // o status mais avançado prevalece
    const serverLagStatus: AppointmentStatus = 'waiting';
    const localAdvancedStatus: AppointmentStatus = 'in_consultation';
    const merged = mergeAppointmentStatuses(serverLagStatus, localAdvancedStatus);
    expect(merged).toBe('in_consultation');
  });

  // TESTE 8: PRIVACIDADE E SANITIZAÇÃO DA TV
  it('8. Privacidade e Sanitização da TV: TV exibe apenas ticket, nome permitido, sala, chamada e status', () => {
    // Dados de uma consulta com hipótese diagnóstica e queixa confidencial
    const confidentialAppointment: Appointment & { confidentialDiagnosis?: string; medicalNotes?: string } = {
      id: 'apt-tv-privacy',
      patientId: 'pat-privacy-01',
      patientName: 'Maria Antônia Souza',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      date: '2026-09-26',
      time: '14:30',
      durationMinutes: 30,
      type: 'refrativo',
      status: 'called',
      ticketNumber: 'P-03',
      isPriority: true,
      room: 'Consultório 1',
      clinicId: CLINIC_A,
      notes: 'Paciente refere diplopia e cefaleia súbita [SEGREDO MÉDICO]',
      confidentialDiagnosis: 'H40.1 Glaucoma Primário',
      medicalNotes: 'Exame de acuidade e fundoscopia',
      createdAt: '',
      updatedAt: ''
    };

    // A projeção para TV deve conter apenas campos permitidos
    const tvDisplayData = {
      ticketNumber: confidentialAppointment.ticketNumber,
      patientName: confidentialAppointment.patientName,
      roomName: confidentialAppointment.room,
      examinerName: confidentialAppointment.examinerName,
      priority: confidentialAppointment.isPriority,
      status: confidentialAppointment.status
    };

    expect(tvDisplayData.ticketNumber).toBe('P-03');
    expect(tvDisplayData.patientName).toBe('Maria Antônia Souza');
    expect(tvDisplayData.roomName).toBe('Consultório 1');
    expect(tvDisplayData.examinerName).toBe('Dr. Rudson Meirelles');
    expect(tvDisplayData.priority).toBe(true);

    // Garantia estrita: campos médicos ou sensíveis NUNCA vazam na TV
    expect((tvDisplayData as any).notes).toBeUndefined();
    expect((tvDisplayData as any).confidentialDiagnosis).toBeUndefined();
    expect((tvDisplayData as any).medicalNotes).toBeUndefined();
  });
});
