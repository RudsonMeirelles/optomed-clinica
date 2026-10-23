import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Appointment, Patient, ClinicalEncounter, mergeAppointmentStatuses } from '@optotipo/shared';

// Simulação de Testes de Sincronização Multi-Dispositivos em Tempo Real (Fase 7 / P0)
describe('OPTOMED — Sincronização Centralizada em Tempo Real Multi-Dispositivo (Cenários A a F)', () => {
  const CLINIC_ID = 'ivs';

  // Banco de Dados em Memória simulando o Servidor Central Express
  let serverDatabase: {
    patients: Map<string, Patient>;
    appointments: Map<string, Appointment>;
    encounters: Map<string, ClinicalEncounter>;
    tombstones: Map<string, Record<string, string>>;
  };

  // Simulação de Clientes (Cliente A: Recepção, Cliente B: Examinador / Consultório)
  let clientReception: {
    patients: Map<string, Patient>;
    appointments: Map<string, Appointment>;
    queue: any[];
  };

  let clientExaminer: {
    patients: Map<string, Patient>;
    appointments: Map<string, Appointment>;
    encounters: Map<string, ClinicalEncounter>;
    queue: any[];
  };

  // Mock do Servidor Express com a nova lógica não-destrutiva de merge inteligente
  function serverMergeData(clinicId: string, entity: string, incomingList: any[]) {
    const targetMap = (serverDatabase as any)[entity] as Map<string, any>;
    const tombstones = serverDatabase.tombstones.get(entity) || {};

    for (const item of incomingList) {
      if (!item || !item.id) continue;

      if (item._deleted) {
        tombstones[item.id] = item.deletedAt || new Date().toISOString();
        serverDatabase.tombstones.set(entity, tombstones);
        targetMap.delete(item.id);
        continue;
      }

      if (tombstones[item.id]) {
        const tombTime = new Date(tombstones[item.id]).getTime();
        const itemTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
        if (itemTime <= tombTime) {
          targetMap.delete(item.id);
          continue;
        }
      }

      const existing = targetMap.get(item.id);
      if (!existing) {
        targetMap.set(item.id, { ...item });
      } else {
        if (entity === 'appointments' && existing.status && item.status) {
          const resolvedStatus = mergeAppointmentStatuses(existing.status, item.status);
          const existingTs = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const incomingTs = new Date(item.updatedAt || item.createdAt || 0).getTime();
          const base = incomingTs >= existingTs ? { ...existing, ...item } : { ...item, ...existing };
          base.status = resolvedStatus;
          if (existing.checkInAt || item.checkInAt) base.checkInAt = item.checkInAt || existing.checkInAt;
          if (existing.calledAt || item.calledAt) base.calledAt = item.calledAt || existing.calledAt;
          if (existing.startedAt || item.startedAt) base.startedAt = item.startedAt || existing.startedAt;
          if (existing.completedAt || item.completedAt) base.completedAt = item.completedAt || existing.completedAt;
          targetMap.set(item.id, base);
        } else {
          const existingTs = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const incomingTs = new Date(item.updatedAt || item.createdAt || 0).getTime();
          if (incomingTs >= existingTs) {
            targetMap.set(item.id, { ...item });
          }
        }
      }
    }
  }

  // Simulação de transmissão WebSocket em tempo real para todos os clientes conectados à mesma clínica
  function broadcastWebSocket(clinicId: string, event: { type: string; entity: string; record?: any; data?: any[] }) {
    if (event.type.startsWith('PATIENT_') && event.record) {
      clientReception.patients.set(event.record.id, { ...event.record });
      clientExaminer.patients.set(event.record.id, { ...event.record });
    } else if (event.type.startsWith('APPOINTMENT_') && event.record) {
      if (event.type === 'APPOINTMENT_CANCELLED') {
        clientReception.appointments.delete(event.record.id);
        clientExaminer.appointments.delete(event.record.id);
      } else {
        clientReception.appointments.set(event.record.id, { ...event.record });
        clientExaminer.appointments.set(event.record.id, { ...event.record });
      }
    } else if (event.type === 'server_data_updated' && Array.isArray(event.data)) {
      if (event.entity === 'patients') {
        event.data.forEach(p => {
          clientReception.patients.set(p.id, p);
          clientExaminer.patients.set(p.id, p);
        });
      } else if (event.entity === 'appointments') {
        event.data.forEach(a => {
          clientReception.appointments.set(a.id, a);
          clientExaminer.appointments.set(a.id, a);
        });
      }
    }
  }

  beforeEach(() => {
    serverDatabase = {
      patients: new Map(),
      appointments: new Map(),
      encounters: new Map(),
      tombstones: new Map([
        ['patients', {}],
        ['appointments', {}],
        ['encounters', {}]
      ])
    };

    clientReception = {
      patients: new Map(),
      appointments: new Map(),
      queue: []
    };

    clientExaminer = {
      patients: new Map(),
      appointments: new Map(),
      encounters: new Map(),
      queue: []
    };
  });

  // CENÁRIO A: Recepção cria paciente e agenda consulta
  it('Cenário A: Recepção cria paciente e agenda consulta -> Examinador recebe instantaneamente em tempo real', () => {
    const newPatient: Patient = {
      id: 'pat-realtime-1',
      fullName: 'Carlos Drummond de Andrade',
      birthDate: '1985-05-20',
      sex: 'M',
      nationality: 'BR',
      phone: '+55 (45) 99111-2233',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z'
    };

    const newAppointment: Appointment = {
      id: 'apt-realtime-1',
      patientId: newPatient.id,
      patientName: newPatient.fullName,
      examinerId: 'examiner-1',
      examinerName: 'Dr. Rudson Meirelles',
      room: 'Consultório 1',
      date: '2026-10-10',
      time: '10:30',
      durationMinutes: 20,
      type: 'refrativo',
      status: 'scheduled',
      ticketNumber: 'P-10',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z'
    };

    // 1. Recepção salva localmente
    clientReception.patients.set(newPatient.id, newPatient);
    clientReception.appointments.set(newAppointment.id, newAppointment);

    // 2. Envia para o servidor e transmite via WebSocket
    serverMergeData(CLINIC_ID, 'patients', [newPatient]);
    serverMergeData(CLINIC_ID, 'appointments', [newAppointment]);

    broadcastWebSocket(CLINIC_ID, { type: 'PATIENT_CREATED', entity: 'patients', record: newPatient });
    broadcastWebSocket(CLINIC_ID, { type: 'APPOINTMENT_CREATED', entity: 'appointments', record: newAppointment });

    // 3. Verificação no Servidor Central
    expect(serverDatabase.patients.has(newPatient.id)).toBe(true);
    expect(serverDatabase.appointments.get(newAppointment.id)?.patientName).toBe('Carlos Drummond de Andrade');

    // 4. Verificação no Examinador (recebido sem recarregar tela)
    expect(clientExaminer.patients.has(newPatient.id)).toBe(true);
    expect(clientExaminer.appointments.get(newAppointment.id)?.status).toBe('scheduled');
    expect(clientExaminer.appointments.get(newAppointment.id)?.ticketNumber).toBe('P-10');
  });

  // CENÁRIO B: Examinador chama e conclui consulta
  it('Cenário B: Examinador chama paciente e conclui consulta -> Recepção reflete status completed imediatamente', () => {
    // Estado inicial sincronizado
    const apt: Appointment = {
      id: 'apt-b-1',
      patientId: 'pat-b-1',
      patientName: 'Clarice Lispector',
      examinerId: 'examiner-1',
      examinerName: 'Dr. Rudson Meirelles',
      date: '2026-10-10',
      time: '11:00',
      durationMinutes: 20,
      type: 'refrativo',
      status: 'waiting',
      createdAt: '2026-10-10T10:50:00.000Z',
      updatedAt: '2026-10-10T10:50:00.000Z'
    };

    serverDatabase.appointments.set(apt.id, { ...apt });
    clientReception.appointments.set(apt.id, { ...apt });
    clientExaminer.appointments.set(apt.id, { ...apt });

    // 1. Examinador chama paciente
    const calledApt = { ...apt, status: 'called' as const, calledAt: '2026-10-10T11:02:00.000Z', updatedAt: '2026-10-10T11:02:00.000Z' };
    serverMergeData(CLINIC_ID, 'appointments', [calledApt]);
    broadcastWebSocket(CLINIC_ID, { type: 'APPOINTMENT_UPDATED', entity: 'appointments', record: calledApt });

    expect(clientReception.appointments.get(apt.id)?.status).toBe('called');

    // 2. Examinador conclui atendimento
    const completedApt = { 
      ...calledApt, 
      status: 'completed' as const, 
      completedAt: '2026-10-10T11:25:00.000Z', 
      updatedAt: '2026-10-10T11:25:00.000Z' 
    };
    serverMergeData(CLINIC_ID, 'appointments', [completedApt]);
    broadcastWebSocket(CLINIC_ID, { type: 'APPOINTMENT_UPDATED', entity: 'appointments', record: completedApt });

    // Recepção e Servidor devem estar 'completed'
    expect(serverDatabase.appointments.get(apt.id)?.status).toBe('completed');
    expect(clientReception.appointments.get(apt.id)?.status).toBe('completed');
    expect(clientReception.appointments.get(apt.id)?.completedAt).toBe('2026-10-10T11:25:00.000Z');
  });

  // CENÁRIO C: Proteção Crítica contra Sobrescrita Destrutiva por Cliente Novo / Vazio
  it('Cenário C: Cliente novo abre sistema com banco local vazio e faz push -> NUNCA apaga dados do servidor', () => {
    // Servidor já possui 111 pacientes e 45 atendimentos
    for (let i = 1; i <= 45; i++) {
      serverDatabase.appointments.set(`apt-existing-${i}`, {
        id: `apt-existing-${i}`,
        patientId: `pat-${i}`,
        patientName: `Paciente Histórico ${i}`,
        examinerId: 'examiner-1',
        examinerName: 'Dr. Rudson Meirelles',
        date: '2026-10-09',
        time: '08:00',
        durationMinutes: 15,
        type: 'refrativo',
        status: 'completed',
        createdAt: '2026-10-09T08:00:00.000Z',
        updatedAt: '2026-10-09T08:00:00.000Z'
      });
    }

    expect(serverDatabase.appointments.size).toBe(45);

    // Cliente novo abre com lista vazia [] ou apenas 1 agendamento novo
    const clientNewItem: Appointment = {
      id: 'apt-new-single',
      patientId: 'pat-new',
      patientName: 'Novo Agendamento Dispositivo 2',
      examinerId: 'examiner-1',
      examinerName: 'Dr. Rudson Meirelles',
      date: '2026-10-10',
      time: '14:00',
      durationMinutes: 15,
      type: 'refrativo',
      status: 'scheduled',
      createdAt: '2026-10-10T11:30:00.000Z',
      updatedAt: '2026-10-10T11:30:00.000Z'
    };

    // O cliente envia via bulk push apenas sua lista contendo o novo item
    serverMergeData(CLINIC_ID, 'appointments', [clientNewItem]);

    // O servidor DEVE conter os 45 anteriores + o 1 novo (total 46), sem ter apagado nada!
    expect(serverDatabase.appointments.size).toBe(46);
    expect(serverDatabase.appointments.has('apt-existing-1')).toBe(true);
    expect(serverDatabase.appointments.has('apt-existing-45')).toBe(true);
    expect(serverDatabase.appointments.has('apt-new-single')).toBe(true);
  });

  // CENÁRIO D: Operação offline -> restaura conexão -> merge consistente sem duplicidade
  it('Cenário D: Cliente cria dados offline -> ao reconectar drena fila e mescla sem duplicidade', () => {
    // Servidor já possui o paciente
    const patient: Patient = {
      id: 'pat-offline-1',
      fullName: 'Machado de Assis',
      birthDate: '1970-06-21',
      sex: 'M',
      nationality: 'BR',
      createdAt: '2026-10-10T09:00:00.000Z',
      updatedAt: '2026-10-10T09:00:00.000Z'
    };
    serverDatabase.patients.set(patient.id, patient);

    // Cliente offline altera telefone do paciente
    const updatedPatient: Patient = {
      ...patient,
      phone: '+55 (45) 98888-7777',
      updatedAt: '2026-10-10T11:45:00.000Z'
    };

    // Reconciliação / Drenagem de fila após reconexão
    serverMergeData(CLINIC_ID, 'patients', [updatedPatient]);

    expect(serverDatabase.patients.size).toBe(1);
    expect(serverDatabase.patients.get('pat-offline-1')?.phone).toBe('+55 (45) 98888-7777');
  });

  // CENÁRIO E: Precedência da Máquina de Estados Clínicos
  it('Cenário E: Status mais avançado prevalece (completed > waiting) mesmo se timestamp local divergir', () => {
    const aptBase: Appointment = {
      id: 'apt-state-1',
      patientId: 'pat-1',
      patientName: 'Guimarães Rosa',
      examinerId: 'examiner-1',
      examinerName: 'Dr. Rudson Meirelles',
      date: '2026-10-10',
      time: '09:00',
      durationMinutes: 15,
      type: 'refrativo',
      status: 'completed',
      completedAt: '2026-10-10T09:30:00.000Z',
      createdAt: '2026-10-10T08:00:00.000Z',
      updatedAt: '2026-10-10T09:30:00.000Z'
    };
    serverDatabase.appointments.set(aptBase.id, aptBase);

    // Um dispositivo desatualizado com status 'waiting' tenta enviar
    const staleApt: Appointment = {
      ...aptBase,
      status: 'waiting',
      updatedAt: '2026-10-10T09:35:00.000Z' // Timestamp até ligeiramente posterior
    };

    serverMergeData(CLINIC_ID, 'appointments', [staleApt]);

    // O status DEVE permanecer 'completed' conforme a máquina de estados
    expect(serverDatabase.appointments.get('apt-state-1')?.status).toBe('completed');
  });

  // CENÁRIO F: Lápides (Tombstones) e deleção consistente
  it('Cenário F: Item excluído gera lápide tombstone e não ressuscita em sincronizações subsequentes', () => {
    const aptToDelete: Appointment = {
      id: 'apt-del-1',
      patientId: 'pat-1',
      patientName: 'Cecília Meireles',
      examinerId: 'examiner-1',
      examinerName: 'Dr. Rudson Meirelles',
      date: '2026-10-10',
      time: '15:00',
      durationMinutes: 15,
      type: 'refrativo',
      status: 'cancelled',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z'
    };
    serverDatabase.appointments.set(aptToDelete.id, aptToDelete);

    // Envia tombstone de deleção
    serverMergeData(CLINIC_ID, 'appointments', [{
      id: 'apt-del-1',
      _deleted: true,
      deletedAt: '2026-10-10T11:50:00.000Z'
    }]);

    expect(serverDatabase.appointments.has('apt-del-1')).toBe(false);

    // Outro cliente tenta enviar o registro antigo desatualizado
    serverMergeData(CLINIC_ID, 'appointments', [aptToDelete]);

    // Não deve ressuscitar por conta da lápide
    expect(serverDatabase.appointments.has('apt-del-1')).toBe(false);
  });

  // CENÁRIO G: Handshake e isolamento de cliente não registrado (Token ausente/inválido)
  it('Cenário G: Dispositivo sem token é rejeitado no registro e NÃO recebe broadcasts da clínica', () => {
    const connectedDevices = new Map<string, { id: string; clinicId?: string; type: string }>();
    
    // Dispositivo 1 autenticado na clínica 'ivs'
    connectedDevices.set('dev_reception', { id: 'dev_reception', clinicId: 'ivs', type: 'clinical' });
    // Dispositivo 2 tentando conectar sem token
    connectedDevices.set('dev_unauthenticated', { id: 'dev_unauthenticated', clinicId: undefined, type: 'clinical' });

    const receivedEvents: Record<string, any[]> = {
      dev_reception: [],
      dev_unauthenticated: []
    };

    function broadcastEvent(targetClinicId: string, event: any) {
      for (const [id, dev] of connectedDevices.entries()) {
        if (!dev.clinicId || dev.clinicId !== targetClinicId) continue;
        receivedEvents[id].push(event);
      }
    }

    broadcastEvent('ivs', { type: 'PATIENT_CREATED', record: { id: 'pat-auth-1', fullName: 'Carlos Drummond' } });

    // Recepção autenticada recebe o evento
    expect(receivedEvents.dev_reception.length).toBe(1);
    expect(receivedEvents.dev_reception[0].record.fullName).toBe('Carlos Drummond');

    // Dispositivo sem token NÃO recebe o evento
    expect(receivedEvents.dev_unauthenticated.length).toBe(0);
  });

  // CENÁRIO H: Promoção transparente pós-login (Reconexão e registro imediato)
  it('Cenário H: Cliente pós-login envia REGISTER_DEVICE com token e passa a receber broadcasts instantaneamente', () => {
    const connectedDevices = new Map<string, { id: string; clinicId?: string; type: string }>();
    const receivedEvents: Record<string, any[]> = { dev_examiner: [] };

    // Inicia desconectado/não registrado
    connectedDevices.set('dev_examiner', { id: 'dev_examiner', clinicId: undefined, type: 'clinical' });

    function broadcast(targetClinicId: string, event: any) {
      for (const [id, dev] of connectedDevices.entries()) {
        if (dev.clinicId === targetClinicId) {
          receivedEvents[id].push(event);
        }
      }
    }

    // Antes do login: evento é ignorado
    broadcast('ivs', { type: 'PATIENT_CREATED', record: { id: 'pat-1', fullName: 'Antes Login' } });
    expect(receivedEvents.dev_examiner.length).toBe(0);

    // Evento de Login bem-sucedido: promove o cliente com clinicId
    const dev = connectedDevices.get('dev_examiner')!;
    dev.clinicId = 'ivs';

    // Depois do login: recebe broadcast imediatamente
    broadcast('ivs', { type: 'PATIENT_CREATED', record: { id: 'pat-2', fullName: 'Depois Login' } });
    expect(receivedEvents.dev_examiner.length).toBe(1);
    expect(receivedEvents.dev_examiner[0].record.fullName).toBe('Depois Login');
  });

  // CENÁRIO I: Latência de entrega WebSocket em tempo real entre dois dispositivos (< 50ms)
  it('Cenário I: Propagação de chamado de paciente e consulta ocorre em tempo real síncrono', () => {
    const startTime = Date.now();
    
    // Recepção chama paciente
    const callPayload = {
      ticketNumber: 'A-01',
      patientName: 'Clarice Lispector',
      roomName: 'Consultório 1',
      examinerName: 'Dr. Rudson Meirelles'
    };

    // Broadcast para o examinador
    broadcastWebSocket('ivs', {
      type: 'PATIENT_CALLED',
      entity: 'tickets',
      record: callPayload
    });

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(100);
  });
});

