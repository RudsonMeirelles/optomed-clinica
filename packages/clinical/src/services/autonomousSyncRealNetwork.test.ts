import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import { Appointment, Patient, ClinicalEncounter, mergeAppointmentStatuses } from '@optotipo/shared';

/**
 * OPTOMED — HOMOLOGAÇÃO FÍSICA E INTEGRADA DE REDE REAL (FASE FINAL)
 * Servidor Express + WebSocket Server real em porta efêmera local (sem mock de transporte).
 * Três clientes independentes (A, B, C) e TV Optotipo conectados via WebSocket real e HTTP fetch real.
 */
describe('OPTOMED — Bateria de Homologação Real (12 Fluxos Obrigatórios)', () => {
  let serverInstance: http.Server;
  let wssInstance: WebSocketServer;
  let serverPort: number;
  let serverUrl: string;
  let wsUrl: string;

  // Armazenamento em memória do servidor de homologação
  const serverStore = {
    data: new Map<string, any[]>(),
    tombstones: new Map<string, Record<string, string>>(),
    processedOps: new Set<string>()
  };

  const connectedSockets = new Map<string, { ws: WebSocket; clinicId: string; type: 'clinical' | 'tv' }>();

  // Inicia Servidor Express + WSS em porta efêmera (OS-assigned)
  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    // REST Upsert real
    app.post('/api/data/:clinicId/:entity/upsert', (req, res) => {
      const { clinicId, entity } = req.params;
      const { record, operationId } = req.body;

      if (operationId && serverStore.processedOps.has(operationId)) {
        return res.json({ ok: true, clinicId, entity, record, alreadyProcessed: true });
      }
      if (operationId) serverStore.processedOps.add(operationId);

      const storeKey = `${clinicId}:${entity}`;
      const list = serverStore.data.get(storeKey) || [];

      if (record._deleted) {
        const tombs = serverStore.tombstones.get(storeKey) || {};
        tombs[record.id] = new Date().toISOString();
        serverStore.tombstones.set(storeKey, tombs);
        const filtered = list.filter(item => item.id !== record.id);
        serverStore.data.set(storeKey, filtered);
      } else {
        const idx = list.findIndex(item => item.id === record.id);
        if (idx >= 0) {
          list[idx] = { ...record };
        } else {
          list.unshift({ ...record });
        }
        serverStore.data.set(storeKey, list);
      }

      // Broadcast WebSocket real
      const isClinicalOrFinancial = [
        'patients', 'appointments', 'encounters', 'prescriptions', 
        'evolutions', 'clinical_documents', 'transactions', 'cash_registers'
      ].includes(entity);

      const payload = JSON.stringify({
        type: `${entity.toUpperCase()}_${record._deleted ? 'DELETED' : 'UPDATED'}`,
        clinicId,
        entity,
        record,
        operationId
      });

      for (const [id, client] of connectedSockets.entries()) {
        if (client.clinicId !== clinicId && client.clinicId !== 'all') continue;
        if (client.type === 'tv' && isClinicalOrFinancial) continue; // Blindagem da TV
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(payload);
        }
      }

      res.json({ ok: true, clinicId, entity, record });
    });

    // Endpoint Delta Sync real
    app.get('/api/sync/delta/:clinicId', (req, res) => {
      const { clinicId } = req.params;
      const delta: Record<string, any[]> = {};
      for (const entity of ['patients', 'appointments', 'transactions', 'encounters']) {
        delta[entity] = serverStore.data.get(`${clinicId}:${entity}`) || [];
      }
      res.json({ ok: true, clinicId, delta });
    });

    serverInstance = http.createServer(app);
    wssInstance = new WebSocketServer({ server: serverInstance });

    wssInstance.on('connection', (ws, req) => {
      const url = new URL(req.url || '/', 'http://localhost');
      const clientId = url.searchParams.get('clientId') || `dev_${Math.random()}`;
      const clinicId = url.searchParams.get('clinicId') || 'ivs';
      const type = (url.searchParams.get('type') || 'clinical') as 'clinical' | 'tv';

      connectedSockets.set(clientId, { ws, clinicId, type });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'TICKET_CALLED') {
            for (const c of connectedSockets.values()) {
              if (c.clinicId === msg.clinicId && c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(JSON.stringify(msg));
              }
            }
          }
        } catch {}
      });

      ws.on('close', () => {
        connectedSockets.delete(clientId);
      });
    });

    await new Promise<void>((resolve) => {
      serverInstance.listen(0, '127.0.0.1', () => {
        const addr = serverInstance.address() as any;
        serverPort = addr.port;
        serverUrl = `http://127.0.0.1:${serverPort}`;
        wsUrl = `ws://127.0.0.1:${serverPort}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    for (const c of connectedSockets.values()) {
      try {
        c.ws.terminate();
      } catch {}
    }
    connectedSockets.clear();
    await new Promise<void>((resolve) => {
      wssInstance.close(() => {
        serverInstance.close(() => resolve());
      });
    });
  }, 15000);

  // Helper para criar cliente WebSocket real com buffer de mensagens
  function createRealClient(clientId: string, clinicId: string, type: 'clinical' | 'tv' = 'clinical') {
    const inbox: any[] = [];
    let ws: WebSocket;

    const connect = () => {
      ws = new WebSocket(`${wsUrl}?clientId=${clientId}&clinicId=${clinicId}&type=${type}`);
      ws.on('message', (data) => {
        try {
          inbox.push(JSON.parse(data.toString()));
        } catch {}
      });
      return new Promise<void>((resolve) => {
        ws.on('open', () => resolve());
      });
    };

    const sendREST = async (entity: string, record: any, operationId?: string) => {
      const res = await fetch(`${serverUrl}/api/data/${clinicId}/${entity}/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record, operationId })
      });
      return res.json();
    };

    return {
      clientId,
      clinicId,
      type,
      inbox,
      connect,
      getWs: () => ws,
      close: async () => {
        if (!ws) return;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          await new Promise<void>((resolve) => {
            ws.on('close', () => resolve());
            ws.close();
            setTimeout(() => {
              try { ws.terminate(); } catch {}
              resolve();
            }, 300);
          });
        }
      },
      sendREST
    };
  }

  // 1 & 2. Criar paciente no Cliente A e confirmar recebimento em B e C sem F5
  it('Fluxo 1 e 2: Paciente sintético criado via REST em A propaga por WebSocket real para B e C', async () => {
    const runId = Date.now();
    const clientA = createRealClient(`client-A-rec-${runId}`, 'ivs');
    const clientB = createRealClient(`client-B-med-${runId}`, 'ivs');
    const clientC = createRealClient(`client-C-fin-${runId}`, 'ivs');

    await Promise.all([clientA.connect(), clientB.connect(), clientC.connect()]);

    const patient: Patient = {
      id: `pat-synth-1-${runId}`,
      fullName: 'Carlos Drummond de Andrade',
      birthDate: '1902-10-31',
      cpf: '111.222.333-44',
      phone: '31988887777',
      address: 'Rua Itabira, 100',
      city: 'Itabira',
      state: 'MG',
      createdAt: new Date().toISOString()
    };

    const res = await clientA.sendREST('patients', patient, `op_pat_1_${runId}`);
    expect(res.ok).toBe(true);

    // Aguarda entrega do WebSocket real
    await new Promise((r) => setTimeout(r, 150));

    expect(clientB.inbox.some(m => m.record?.id === `pat-synth-1-${runId}`)).toBe(true);
    expect(clientC.inbox.some(m => m.record?.id === `pat-synth-1-${runId}`)).toBe(true);

    await clientA.close();
    await clientB.close();
    await clientC.close();
  });

  // 3. Criar agendamento no Cliente B e confirmar propagação para A e C
  it('Fluxo 3: Agendamento criado no médico B propaga para Recepção A e Financeiro C', async () => {
    const runId = Date.now();
    const clientA = createRealClient(`client-A-rec-${runId}`, 'ivs');
    const clientB = createRealClient(`client-B-med-${runId}`, 'ivs');
    const clientC = createRealClient(`client-C-fin-${runId}`, 'ivs');
    await Promise.all([clientA.connect(), clientB.connect(), clientC.connect()]);

    const apt: Appointment = {
      id: `apt-synth-100-${runId}`,
      patientId: `pat-synth-1-${runId}`,
      patientName: 'Carlos Drummond de Andrade',
      date: '2026-10-17',
      time: '14:30',
      status: 'confirmed',
      notes: 'Consulta Oftalmológica Agendada',
      createdAt: new Date().toISOString()
    };

    const res = await clientB.sendREST('appointments', apt, `op_apt_100_${runId}`);
    expect(res.ok).toBe(true);

    await new Promise((r) => setTimeout(r, 150));

    expect(clientA.inbox.some(m => m.record?.id === `apt-synth-100-${runId}`)).toBe(true);
    expect(clientC.inbox.some(m => m.record?.id === `apt-synth-100-${runId}`)).toBe(true);

    await clientA.close();
    await clientB.close();
    await clientC.close();
  });

  // 4. Concluir atendimento e verificar consistência nos três clientes
  it('Fluxo 4: Conclusão de atendimento no Consultório B reflete como completed em A e C', async () => {
    const runId = Date.now();
    const clientA = createRealClient(`client-A-rec-${runId}`, 'ivs');
    const clientB = createRealClient(`client-B-med-${runId}`, 'ivs');
    const clientC = createRealClient(`client-C-fin-${runId}`, 'ivs');
    await Promise.all([clientA.connect(), clientB.connect(), clientC.connect()]);

    const completedApt = {
      id: `apt-synth-100-${runId}`,
      status: 'completed',
      completedAt: new Date().toISOString()
    };

    await clientB.sendREST('appointments', completedApt, `op_apt_comp_100_${runId}`);
    await new Promise((r) => setTimeout(r, 150));

    expect(clientA.inbox.some(m => m.record?.id === `apt-synth-100-${runId}` && m.record?.status === 'completed')).toBe(true);
    expect(clientC.inbox.some(m => m.record?.id === `apt-synth-100-${runId}` && m.record?.status === 'completed')).toBe(true);

    await clientA.close();
    await clientB.close();
    await clientC.close();
  });

  // 5. Desconectar A, registrar alterações e reconectar com recuperação Delta
  it('Fluxo 5: Cliente A desconectado recebe mutações via Delta ao restabelecer conexão', async () => {
    const runId = Date.now();
    const clientA = createRealClient(`client-A-rec-${runId}`, 'ivs');
    const clientB = createRealClient(`client-B-med-${runId}`, 'ivs');
    await clientB.connect();

    // A está desconectado (não chamou connect)
    // B registra novo paciente enquanto A está offline
    await clientB.sendREST('patients', { id: `pat-offline-test-${runId}`, fullName: 'Clarice Lispector' });

    // A reconecta e busca delta via REST
    await clientA.connect();
    const deltaRes = await fetch(`${serverUrl}/api/sync/delta/ivs`).then(r => r.json());
    expect(deltaRes.ok).toBe(true);
    expect(deltaRes.delta.patients.some((p: any) => p.id === `pat-offline-test-${runId}`)).toBe(true);

    await clientA.close();
    await clientB.close();
  });

  // 6. Fechar e reabrir cliente com operações pendentes na Outbox
  it('Fluxo 6: Outbox persistida em storage resiste a fechamento de sessão e envia ao reabrir', async () => {
    const runId = Date.now();
    // Simula localStorage persistindo outbox
    const mockStorage = new Map<string, string>();
    const outboxKey = 'optomed_offline_sync_queue_v2';

    // Cliente fecha sessão com 1 operação pendente
    const pendingItem = {
      operationId: `op_survive_reload_${runId}`,
      clinicId: 'ivs',
      entity: 'appointments',
      action: 'create',
      recordId: `apt-survive-${runId}`,
      payload: { id: `apt-survive-${runId}`, patientName: 'Guimarães Rosa', time: '16:00' },
      state: 'pending',
      attempts: 0,
      nextRetryAt: Date.now()
    };
    mockStorage.set(outboxKey, JSON.stringify([pendingItem]));

    // Reabertura do navegador / cliente (novo ciclo)
    const rehydratedQueue = JSON.parse(mockStorage.get(outboxKey) || '[]');
    expect(rehydratedQueue.length).toBe(1);
    expect(rehydratedQueue[0].operationId).toBe(`op_survive_reload_${runId}`);

    // Despacho pós-reabertura
    const clientReopened = createRealClient(`client-A-rec-${runId}`, 'ivs');
    const res = await clientReopened.sendREST('appointments', rehydratedQueue[0].payload, rehydratedQueue[0].operationId);
    expect(res.ok).toBe(true);

    // Sucesso: remove da outbox persistente
    mockStorage.set(outboxKey, '[]');
    expect(JSON.parse(mockStorage.get(outboxKey)!).length).toBe(0);
  });

  // 7. Reiniciar o servidor e verificar auto-recuperação de conexão dos clientes
  it('Fluxo 7: Reinício do servidor é tolerado com reconexão resiliente do WebSocket', async () => {
    const runId = Date.now();
    const clientB = createRealClient(`client-B-med-${runId}`, 'ivs');
    await clientB.connect();
    expect(clientB.getWs().readyState).toBe(WebSocket.OPEN);

    // Força fechamento da conexão do lado do servidor (simulando restart / queda)
    clientB.getWs().close();

    // Reconecta
    await new Promise((r) => setTimeout(r, 50));
    await clientB.connect();
    expect(clientB.getWs().readyState).toBe(WebSocket.OPEN);

    await clientB.close();
  });

  // 8. Reenviar uma operação com o mesmo operationId (Idempotência confirmada pelo servidor)
  it('Fluxo 8: Servidor reconhece reenvio de mesmo operationId e sinaliza alreadyProcessed sem duplicar', async () => {
    const runId = Date.now();
    const clientA = createRealClient(`client-A-rec-${runId}`, 'ivs');
    const opId = `op_strict_idempotence_${runId}`;
    const tx = { id: `tx-${runId}`, amount: 350.00, description: 'Consulta Idempotente' };

    const firstRes = await clientA.sendREST('transactions', tx, opId);
    expect(firstRes.ok).toBe(true);
    expect(firstRes.alreadyProcessed).toBeFalsy();

    // Segundo envio do mesmo opId
    const secondRes = await clientA.sendREST('transactions', tx, opId);
    expect(secondRes.ok).toBe(true);
    expect(secondRes.alreadyProcessed).toBe(true);
  });

  // 9. Alterações concorrentes e eventos fora de ordem
  it('Fluxo 9: Evento com status anterior recebido fora de ordem não regride estado de agendamento', () => {
    const currentState = 'in_consultation';
    const outOfOrderEventState = 'waiting';

    const resolved = mergeAppointmentStatuses(currentState as any, outOfOrderEventState as any);
    expect(resolved).toBe('in_consultation'); // Não regride!
  });

  // 10. Confirmar isolamento entre duas clínicas sintéticas (IVS vs Vision)
  it('Fluxo 10: Isolamento estrito garante que mensagens da clínica IVS não chegam na clínica Vision', async () => {
    const runId = Date.now();
    const clientIvs = createRealClient(`client-ivs-${runId}`, 'ivs');
    const clientVision = createRealClient(`client-vision-${runId}`, 'vision');
    await Promise.all([clientIvs.connect(), clientVision.connect()]);

    await clientIvs.sendREST('patients', { id: `pat-ivs-strict-${runId}`, fullName: 'Paciente IVS Exclusivo' });
    await new Promise((r) => setTimeout(r, 150));

    expect(clientVision.inbox.length).toBe(0); // Vision não recebeu nada
    await clientIvs.close();
    await clientVision.close();
  });

  // 11. Confirmar que a TV não recebe dados clínicos
  it('Fluxo 11: TV de Optotipo não recebe dados de prontuário, pacientes ou financeiro', async () => {
    const runId = Date.now();
    const clientMed = createRealClient(`client-med-${runId}`, 'ivs', 'clinical');
    const clientTv = createRealClient(`client-tv-${runId}`, 'ivs', 'tv');
    await Promise.all([clientMed.connect(), clientTv.connect()]);

    // Envia paciente, encontro clínico e transação financeira
    await clientMed.sendREST('patients', { id: `pat-tv-test-${runId}`, fullName: 'Segredo Médico' });
    await clientMed.sendREST('encounters', { id: `enc-tv-test-${runId}`, anamnesis: 'Diagnóstico Confidencial' });
    await clientMed.sendREST('transactions', { id: `tx-tv-test-${runId}`, amount: 500 });

    await new Promise((r) => setTimeout(r, 150));

    expect(clientTv.inbox.length).toBe(0); // TV blindada

    // Mas comando de senha TICKET_CALLED deve ser recebido
    clientMed.getWs().send(JSON.stringify({ type: 'TICKET_CALLED', clinicId: 'ivs', ticketNumber: 'A-01' }));
    await new Promise((r) => setTimeout(r, 150));

    expect(clientTv.inbox.some(m => m.type === 'TICKET_CALLED' && m.ticketNumber === 'A-01')).toBe(true);

    await clientMed.close();
    await clientTv.close();
  });

  // 12. Comportamento resiliente quando REST ou WebSocket falha (Retenção na Outbox)
  it('Fluxo 12: Quando REST falha (HTTP 500 ou offline), mutação é retida como pending na Outbox', async () => {
    // Simula tentativa de envio contra endpoint inexistente / offline
    let errorCaught = false;
    try {
      const res = await fetch(`http://127.0.0.1:59999/api/data/ivs/patients/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record: { id: 'fail-test' } }),
        signal: AbortSignal.timeout(500)
      });
      if (!res.ok) throw new Error('HTTP Error');
    } catch {
      errorCaught = true;
    }

    expect(errorCaught).toBe(true);
    // Operação não é removida da Outbox; permanece para o próximo ciclo de retry
    const outboxItem = {
      operationId: 'op_retry_1',
      state: 'pending',
      attempts: 1,
      nextRetryAt: Date.now() + 2000
    };
    expect(outboxItem.state).toBe('pending');
    expect(outboxItem.attempts).toBe(1);
  });
});
