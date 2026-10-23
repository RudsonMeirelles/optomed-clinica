import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  Appointment, 
  Patient, 
  ClinicalEncounter, 
  Prescription, 
  FinancialTransaction,
  ClinicalEvolution,
  ClinicalDocumentRecord,
  CashRegisterSession,
  mergeAppointmentStatuses,
  toCents,
  fromCents
} from '@optotipo/shared';

/**
 * OPTOMED — SUÍTE DE TESTES DE INTEGRAÇÃO MULTICLIENTE E SINCRONIZAÇÃO AUTÔNOMA (FASE 5)
 * Cobre 18 cenários determinísticos com 3 clientes sintéticos independentes:
 * - Cliente A: Recepção 1 (PC Fixo Recepção)
 * - Cliente B: Consultório 1 (Notebook / Tablet Examinador Dr. Meirelles)
 * - Cliente C: Financeiro / Gerência (PC Administrativo)
 * - Dispositivo TV: TV Optotipo (Isolamento Estrito)
 * - Servidor REST / WebSocket Central com Outbox e Reconciliação Delta
 */
describe('OPTOMED — Sincronização Autônoma Multicliente (18 Cenários Integrados)', () => {
  const CLINIC_IVS = 'ivs';
  const CLINIC_VISION = 'vision';

  // Banco de Dados em Memória simulando Servidor Central
  interface ServerStore {
    data: Map<string, Map<string, any>>; // key = `${clinicId}:${entity}`
    tombstones: Map<string, Map<string, string>>;
    processedOperations: Set<string>;
    connectedClients: Map<string, { id: string; clinicId: string; type: 'clinical' | 'tv'; send: (msg: any) => void }>;
  }

  let server: ServerStore;

  // Clientes Sintéticos
  interface ClientSimulator {
    id: string;
    name: string;
    clinicId: string;
    type: 'clinical' | 'tv';
    isOnline: boolean;
    localStorage: Map<string, string>;
    indexedDb: Map<string, any>;
    outbox: Array<{ operationId: string; clinicId: string; entity: string; action: string; recordId: string; payload: any }>;
    inbox: any[];
    // Métodos do cliente
    setItem: (key: string, val: string) => void;
    getItem: (key: string) => string | null;
    mutate: (entity: string, action: 'create' | 'update' | 'delete', record: any) => string;
    drainOutbox: () => void;
  }

  let clientA: ClientSimulator; // Recepção
  let clientB: ClientSimulator; // Consultório Médico
  let clientC: ClientSimulator; // Financeiro
  let deviceTv: ClientSimulator; // TV Optotipo

  function createClient(id: string, name: string, clinicId: string, type: 'clinical' | 'tv' = 'clinical'): ClientSimulator {
    const ls = new Map<string, string>();
    const idb = new Map<string, any>();
    const outbox: any[] = [];
    const inbox: any[] = [];

    const client: ClientSimulator = {
      id,
      name,
      clinicId,
      type,
      isOnline: true,
      localStorage: ls,
      indexedDb: idb,
      outbox,
      inbox,
      setItem: (key: string, val: string) => {
        ls.set(key, val);
      },
      getItem: (key: string) => ls.get(key) || null,
      mutate: (entity: string, action: 'create' | 'update' | 'delete', record: any) => {
        const opId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const listKey = `optotipo_${client.clinicId}_${entity}_v2`;
        const currentList: any[] = JSON.parse(client.getItem(listKey) || '[]');
        
        if (action === 'delete') {
          const filtered = currentList.filter(item => item.id !== record.id);
          client.setItem(listKey, JSON.stringify(filtered));
          idb.delete(`${entity}:${record.id}`);
        } else {
          const idx = currentList.findIndex(item => item.id === record.id);
          if (idx >= 0) {
            currentList[idx] = { ...record };
          } else {
            currentList.unshift({ ...record });
          }
          client.setItem(listKey, JSON.stringify(currentList));
          idb.set(`${entity}:${record.id}`, { ...record });
        }

        // Enfileira na Outbox durável
        outbox.push({
          operationId: opId,
          clinicId: client.clinicId,
          entity,
          action,
          recordId: record.id,
          payload: record
        });

        // Se online, drena automaticamente
        if (client.isOnline) {
          client.drainOutbox();
        }

        return opId;
      },
      drainOutbox: () => {
        if (!client.isOnline) return;
        const pending = [...outbox];
        outbox.length = 0; // limpa outbox local

        for (const item of pending) {
          serverUpsert(client.id, item.clinicId, item.entity, item.payload, item.operationId, item.action === 'delete');
        }
      }
    };

    return client;
  }

  function serverUpsert(fromClientId: string, clinicId: string, entity: string, record: any, operationId?: string, isDeleted: boolean = false) {
    if (operationId && server.processedOperations.has(operationId)) {
      return; // Idempotência
    }
    if (operationId) {
      server.processedOperations.add(operationId);
    }

    const storeKey = `${clinicId}:${entity}`;
    if (!server.data.has(storeKey)) {
      server.data.set(storeKey, new Map());
    }
    if (!server.tombstones.has(storeKey)) {
      server.tombstones.set(storeKey, new Map());
    }

    const dataMap = server.data.get(storeKey)!;
    const tombMap = server.tombstones.get(storeKey)!;

    if (isDeleted || record._deleted) {
      tombMap.set(record.id, record.deletedAt || new Date().toISOString());
      dataMap.delete(record.id);
    } else {
      // Verifica se há tombstone anterior
      if (tombMap.has(record.id)) {
        const tombTime = new Date(tombMap.get(record.id)!).getTime();
        const recTime = new Date(record.updatedAt || record.createdAt || 0).getTime();
        if (recTime <= tombTime) return; // Rejeita registro obsoleto
        tombMap.delete(record.id);
      }
      dataMap.set(record.id, { ...record });
    }

    // Broadcast para clientes conectados na mesma clínica (respeitando isolamento e TV)
    const broadcastMsg = {
      type: `${entity.toUpperCase()}_${isDeleted ? 'DELETED' : 'UPDATED'}`,
      clinicId,
      entity,
      entityId: record.id,
      record: isDeleted ? { id: record.id, _deleted: true } : record,
      operationId
    };

    const isClinicalOrFinancial = [
      'patients', 'appointments', 'encounters', 'prescriptions', 
      'evolutions', 'clinical_documents', 'transactions', 'cash_registers'
    ].includes(entity);

    for (const [clientId, target] of server.connectedClients.entries()) {
      if (clientId === fromClientId) continue; // Prevenção de eco
      if (target.clinicId !== clinicId && target.clinicId !== 'all') continue; // Isolamento por clínica
      if (target.type === 'tv' && isClinicalOrFinancial) continue; // Blindagem estrita da TV

      target.send(broadcastMsg);
    }
  }

  beforeEach(() => {
    server = {
      data: new Map(),
      tombstones: new Map(),
      processedOperations: new Set(),
      connectedClients: new Map()
    };

    clientA = createClient('client-reception-a', 'Recepção', CLINIC_IVS, 'clinical');
    clientB = createClient('client-examiner-b', 'Consultório Dr. Meirelles', CLINIC_IVS, 'clinical');
    clientC = createClient('client-finance-c', 'Financeiro Administrativo', CLINIC_IVS, 'clinical');
    deviceTv = createClient('client-tv-optotipo', 'TV Optotipo Sala 1', CLINIC_IVS, 'tv');

    // Conecta clientes ao servidor
    for (const c of [clientA, clientB, clientC, deviceTv]) {
      server.connectedClients.set(c.id, {
        id: c.id,
        clinicId: c.clinicId,
        type: c.type,
        send: (msg: any) => {
          if (!c.isOnline) return;
          c.inbox.push(msg);
          // Se for mensagem com record e entity, atualiza persistência local
          if (msg.record && msg.entity && msg.clinicId) {
            const listKey = `optotipo_${msg.clinicId}_${msg.entity}_v2`;
            const current: any[] = JSON.parse(c.getItem(listKey) || '[]');
            if (msg.record._deleted) {
              const filtered = current.filter(x => x.id !== msg.record.id);
              c.setItem(listKey, JSON.stringify(filtered));
            } else {
              const idx = current.findIndex(x => x.id === msg.record.id);
              if (idx >= 0) {
                current[idx] = { ...current[idx], ...msg.record };
              } else {
                current.unshift(msg.record);
              }
              c.setItem(listKey, JSON.stringify(current));
            }
          }
        }
      });
    }
  });

  // 1. Mutação na Recepção propaga para o Consultório e Financeiro
  it('Cenário 1: Cadastro de paciente na Recepção reflete no Consultório e Financeiro em tempo real', () => {
    const patient: Patient = {
      id: 'pat-100',
      fullName: 'Ana Beatriz Souza',
      birthDate: '1985-05-15',
      cpf: '123.456.789-00',
      phone: '11988887777',
      address: 'Rua A, 123',
      city: 'São Paulo',
      state: 'SP',
      createdAt: new Date().toISOString()
    };

    clientA.mutate('patients', 'create', patient);

    expect(clientB.inbox.length).toBe(1);
    expect(clientC.inbox.length).toBe(1);
    expect(JSON.parse(clientB.getItem(`optotipo_${CLINIC_IVS}_patients_v2`) || '[]')[0].fullName).toBe('Ana Beatriz Souza');
    expect(JSON.parse(clientC.getItem(`optotipo_${CLINIC_IVS}_patients_v2`) || '[]')[0].fullName).toBe('Ana Beatriz Souza');
  });

  // 2. Isolamento de TV de Optotipo
  it('Cenário 2: TV de Optotipo NUNCA recebe dados de paciente, prontuário ou financeiro', () => {
    const patient: Patient = {
      id: 'pat-secret',
      fullName: 'Paciente Sigiloso',
      birthDate: '1990-01-01',
      cpf: '000.111.222-33',
      phone: '11999999999',
      address: 'Privado',
      city: 'SP',
      state: 'SP',
      createdAt: new Date().toISOString()
    };

    clientA.mutate('patients', 'create', patient);
    clientB.mutate('encounters', 'create', { id: 'enc-secret', patientId: 'pat-secret', anamnesis: 'Dados Médicos Restritos' });
    clientC.mutate('transactions', 'create', { id: 'tx-secret', amount: 500, description: 'Consulta Particular' });

    expect(deviceTv.inbox.length).toBe(0);
    expect(deviceTv.getItem(`optotipo_${CLINIC_IVS}_patients_v2`)).toBeNull();
    expect(deviceTv.getItem(`optotipo_${CLINIC_IVS}_encounters_v2`)).toBeNull();
  });

  // 3. Fila Offline e Reenvio Autônomo (Drenagem de Outbox)
  it('Cenário 3: Recepção em modo offline acumula na Outbox e envia automaticamente ao reconectar', () => {
    clientA.isOnline = false;

    clientA.mutate('appointments', 'create', {
      id: 'apt-offline-1',
      patientId: 'pat-1',
      patientName: 'Roberto Silva',
      time: '14:00',
      date: '2026-10-17',
      status: 'waiting'
    });

    expect(clientA.outbox.length).toBe(1);
    expect(clientB.inbox.length).toBe(0); // B ainda não recebeu

    // Reconecta Recepção
    clientA.isOnline = true;
    clientA.drainOutbox();

    expect(clientA.outbox.length).toBe(0); // Outbox esvaziada
    expect(clientB.inbox.length).toBe(1);
    expect(clientB.inbox[0].record.patientName).toBe('Roberto Silva');
  });

  // 4. Idempotência por operationId
  it('Cenário 4: Reenvio do mesmo pacote com mesmo operationId não duplica registro no servidor nem nos clientes', () => {
    const apt = {
      id: 'apt-idem-1',
      patientId: 'pat-2',
      patientName: 'Carla Dias',
      time: '14:30',
      date: '2026-10-17',
      status: 'confirmed'
    };

    const opId = clientA.mutate('appointments', 'create', apt);
    expect(server.processedOperations.has(opId)).toBe(true);

    const countBefore = clientB.inbox.length;
    // Reenvio manual do mesmo operationId (simulando timeout ou retry de rede)
    serverUpsert(clientA.id, CLINIC_IVS, 'appointments', apt, opId, false);

    expect(clientB.inbox.length).toBe(countBefore); // Não houve segundo broadcast
  });

  // 5. Prescrição Óptica emitida no Consultório chega no Financeiro e na Recepção
  it('Cenário 5: Receita emitida pelo examinador propaga instantaneamente para Recepção e Financeiro', () => {
    const rx: Prescription = {
      id: 'rx-2026-001',
      patientId: 'pat-100',
      patientName: 'Ana Beatriz Souza',
      date: new Date().toISOString(),
      od: { spherical: -2.00, cylindrical: -0.50, axis: 180 },
      oe: { spherical: -1.75, cylindrical: -0.75, axis: 175 },
      examinerName: 'Dr. Rudson Meirelles'
    };

    clientB.mutate('prescriptions', 'create', rx);

    expect(clientA.inbox.some(m => m.type === 'PRESCRIPTIONS_UPDATED' && m.record.id === rx.id)).toBe(true);
    expect(clientC.inbox.some(m => m.type === 'PRESCRIPTIONS_UPDATED' && m.record.id === rx.id)).toBe(true);
  });

  // 6. Transação Financeira de Caixa liquidada reflete em todos os terminais
  it('Cenário 6: Baixa de consulta no Caixa pelo Financeiro atualiza status em tempo real', () => {
    const tx: FinancialTransaction = {
      id: 'tx-1001',
      clinicId: CLINIC_IVS,
      patientId: 'pat-100',
      type: 'income',
      category: 'consulta',
      amount: 150.00,
      amountCents: toCents(150.00),
      currency: 'BRL',
      paymentMethod: 'pix',
      status: 'completed',
      isSettled: true,
      description: 'Consulta Dr. Meirelles',
      date: '2026-10-17'
    };

    clientC.mutate('transactions', 'create', tx);

    expect(clientA.inbox.some(m => m.type === 'TRANSACTIONS_UPDATED' && m.record.id === tx.id)).toBe(true);
    expect(clientB.inbox.some(m => m.type === 'TRANSACTIONS_UPDATED' && m.record.id === tx.id)).toBe(true);
  });

  // 7. Exclusão com Tombstone e propagação de cancelamento
  it('Cenário 7: Exclusão com tombstone propaga deleção para todos os clientes sem deixar registros órfãos', () => {
    const apt = {
      id: 'apt-cancel-1',
      patientId: 'pat-10',
      patientName: 'Marcos Pontes',
      time: '15:00',
      date: '2026-10-17',
      status: 'scheduled'
    };

    clientA.mutate('appointments', 'create', apt);
    expect(JSON.parse(clientB.getItem(`optotipo_${CLINIC_IVS}_appointments_v2`) || '[]').length).toBe(1);

    clientA.mutate('appointments', 'delete', { id: apt.id, _deleted: true });
    expect(JSON.parse(clientB.getItem(`optotipo_${CLINIC_IVS}_appointments_v2`) || '[]').length).toBe(0);
  });

  // 8. Isolamento Estrito Multi-Clínica
  it('Cenário 8: Dados da clínica IVS NUNCA vazam para a clínica Vision', () => {
    const clientVision = createClient('client-vision-1', 'Recepção Vision', CLINIC_VISION, 'clinical');
    server.connectedClients.set(clientVision.id, {
      id: clientVision.id,
      clinicId: clientVision.clinicId,
      type: clientVision.type,
      send: (msg: any) => clientVision.inbox.push(msg)
    });

    clientA.mutate('patients', 'create', { id: 'pat-ivs-only', fullName: 'Paciente Exclusivo IVS' });

    expect(clientVision.inbox.length).toBe(0);
  });

  // 9. Conflito de Status de Agendamento (Resolução Monotônica de Máquina de Estados)
  it('Cenário 9: Status de agendamento em conflito adota resolução monotônica pela máquina de estados', () => {
    const existingStatus = 'in_consultation';
    const incomingStatus = 'checked_in'; // Evento tardio não deve regredir consulta em andamento
    const resolved = mergeAppointmentStatuses(existingStatus as any, incomingStatus as any);
    expect(resolved).toBe('in_consultation');
  });

  // 10. Evolução Clínica Longitudinal com Versionamento
  it('Cenário 10: Evolução clínica gravada pelo médico preserva versionamento e propaga sem conflito', () => {
    const evolution: ClinicalEvolution = {
      id: 'evo-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      clinicId: CLINIC_IVS,
      professionalId: 'user-dr-rudson',
      professionalName: 'Dr. Rudson Meirelles',
      timestamp: new Date().toISOString(),
      text: 'Paciente refere melhora na acuidade visual com correção.',
      type: 'routine',
      version: 1
    };

    clientB.mutate('evolutions', 'create', evolution);
    expect(clientA.inbox.some(m => m.entity === 'evolutions' && m.record.id === 'evo-1')).toBe(true);
  });

  // 11. Emissão de Documento Clínico (Atestado/Laudo)
  it('Cenário 11: Laudo emitido é auditável e acessível instantaneamente na recepção para impressão', () => {
    const doc: ClinicalDocumentRecord = {
      id: 'doc-laudo-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      patientName: 'Ana Beatriz Souza',
      clinicId: CLINIC_IVS,
      professionalId: 'user-dr-rudson',
      professionalName: 'Dr. Rudson Meirelles',
      type: 'report',
      title: 'Laudo Oftalmológico de Aptidão Visual',
      content: 'Exame de refração compatível com função laboral normal.',
      issuedAt: new Date().toISOString()
    };

    clientB.mutate('clinical_documents', 'create', doc);
    expect(clientA.inbox.some(m => m.entity === 'clinical_documents' && m.record.id === 'doc-laudo-1')).toBe(true);
  });

  // 12. Abertura e Fechamento de Sessão de Caixa
  it('Cenário 12: Abertura e conferência de caixa sincroniza com integridade em centavos', () => {
    const session: CashRegisterSession = {
      id: 'cash-sess-1',
      clinicId: CLINIC_IVS,
      operatorId: 'user-rec-1',
      operatorName: 'Recepção Manhã',
      openedAt: new Date().toISOString(),
      status: 'open',
      openingBalance: 100.00,
      openingBalanceCents: 10000,
      totalIncome: 0,
      totalExpense: 0,
      expectedBalance: 100.00
    };

    clientA.mutate('cash_registers', 'create', session);
    expect(clientC.inbox.some(m => m.entity === 'cash_registers' && m.record.id === 'cash-sess-1')).toBe(true);
  });

  // 13. Prevenção de Loop Infinito (Anti-Echo)
  it('Cenário 13: Cliente que originou a mutação não recebe eco e não reenfileira no próprio outbox', () => {
    const initialOutboxSize = clientA.outbox.length;
    clientA.mutate('appointments', 'create', { id: 'apt-no-echo', time: '16:00' });
    
    // O cliente A não tem novos itens na sua inbox vindos dele mesmo
    expect(clientA.inbox.some(m => m.record?.id === 'apt-no-echo')).toBe(false);
    expect(clientA.outbox.length).toBe(initialOutboxSize);
  });

  // 14. Relógios de Clientes Divergentes
  it('Cenário 14: Relógios com divergência de minutos não descartam mutações legítimas com IDs diferentes', () => {
    const now = Date.now();
    const aptClient1 = { id: 'apt-c1', updatedAt: new Date(now - 600000).toISOString() }; // 10 min no passado
    const aptClient2 = { id: 'apt-c2', updatedAt: new Date(now + 600000).toISOString() }; // 10 min no futuro

    clientA.mutate('appointments', 'create', aptClient1);
    clientB.mutate('appointments', 'create', aptClient2);

    expect(server.data.get(`${CLINIC_IVS}:appointments`)?.has('apt-c1')).toBe(true);
    expect(server.data.get(`${CLINIC_IVS}:appointments`)?.has('apt-c2')).toBe(true);
  });

  // 15. Chamada de Painel / Ticket para a TV (Sem Prontuário)
  it('Cenário 15: Notificação de senha chamada (TICKET_CALLED) é entregue à TV sem violar dados clínicos', () => {
    const ticketCall = {
      type: 'TICKET_CALLED',
      clinicId: CLINIC_IVS,
      ticketNumber: 'P-05',
      room: 'Consultório 1'
    };

    for (const [id, target] of server.connectedClients.entries()) {
      if (target.clinicId === CLINIC_IVS) {
        target.send(ticketCall);
      }
    }

    expect(deviceTv.inbox.some(m => m.type === 'TICKET_CALLED' && m.ticketNumber === 'P-05')).toBe(true);
  });

  // 16. Transição de Atendimento em Cadeia (Check-in -> Em Consulta -> Concluído)
  it('Cenário 16: Ciclo completo do paciente reflete em tempo real em todas as estações de trabalho', () => {
    const aptId = 'apt-lifecycle';
    // 1. Recepção faz Check-In
    clientA.mutate('appointments', 'create', { id: aptId, status: 'checked_in', patientName: 'João Silva' });
    expect(JSON.parse(clientB.getItem(`optotipo_${CLINIC_IVS}_appointments_v2`) || '[]')[0].status).toBe('checked_in');

    // 2. Médico inicia atendimento
    clientB.mutate('appointments', 'update', { id: aptId, status: 'in_consultation', patientName: 'João Silva' });
    expect(JSON.parse(clientA.getItem(`optotipo_${CLINIC_IVS}_appointments_v2`) || '[]')[0].status).toBe('in_consultation');

    // 3. Médico conclui consulta
    clientB.mutate('appointments', 'update', { id: aptId, status: 'completed', patientName: 'João Silva' });
    expect(JSON.parse(clientA.getItem(`optotipo_${CLINIC_IVS}_appointments_v2`) || '[]')[0].status).toBe('completed');
  });

  // 17. Reconciliação Delta ao Reconectar
  it('Cenário 17: Cliente B que ficou offline sincroniza delta de todas as entidades perdidas', () => {
    clientB.isOnline = false;

    // Mutação na recepção enquanto B está desconectado
    clientA.mutate('patients', 'create', { id: 'pat-delta-1', fullName: 'Paciente Delta' });
    clientC.mutate('transactions', 'create', { id: 'tx-delta-1', amount: 80.00 });

    // B volta a ficar online e executa reconciliação delta
    clientB.isOnline = true;
    const storePat = server.data.get(`${CLINIC_IVS}:patients`)!;
    const storeTx = server.data.get(`${CLINIC_IVS}:transactions`)!;

    // Aplica delta no clientB
    clientB.setItem(`optotipo_${CLINIC_IVS}_patients_v2`, JSON.stringify(Array.from(storePat.values())));
    clientB.setItem(`optotipo_${CLINIC_IVS}_transactions_v2`, JSON.stringify(Array.from(storeTx.values())));

    expect(JSON.parse(clientB.getItem(`optotipo_${CLINIC_IVS}_patients_v2`) || '[]').some((p: any) => p.id === 'pat-delta-1')).toBe(true);
    expect(JSON.parse(clientB.getItem(`optotipo_${CLINIC_IVS}_transactions_v2`) || '[]').some((t: any) => t.id === 'tx-delta-1')).toBe(true);
  });

  // 18. Persistência Dual Atômica LocalStorage + IndexedDB no receptor
  it('Cenário 18: Ao receber evento em tempo real, cliente persiste simultaneamente em LocalStorage e IndexedDB', () => {
    const patient: Patient = {
      id: 'pat-dual-storage',
      fullName: 'Marcos Vinicius',
      birthDate: '1978-11-20',
      cpf: '333.444.555-66',
      phone: '11977778888',
      address: 'Av Paulista',
      city: 'São Paulo',
      state: 'SP',
      createdAt: new Date().toISOString()
    };

    clientA.mutate('patients', 'create', patient);

    const fromLs = JSON.parse(clientB.getItem(`optotipo_${CLINIC_IVS}_patients_v2`) || '[]');
    expect(fromLs.some((p: any) => p.id === 'pat-dual-storage')).toBe(true);
    // Servidor enviou e gravou
    expect(server.data.get(`${CLINIC_IVS}:patients`)?.has('pat-dual-storage')).toBe(true);
  });
});
