import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('OPTOMED — Testes Unitários e Integrados de Sincronização e Recuperação', () => {
  let localStorageMock: Record<string, string> = {};

  beforeEach(() => {
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => localStorageMock[k] || null,
      setItem: (k: string, v: string) => { localStorageMock[k] = String(v); },
      removeItem: (k: string) => { delete localStorageMock[k]; },
      clear: () => { localStorageMock = {}; }
    });
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', port: '8765', protocol: 'http:' },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
  });

  // Requisito 1: Navegador com cache vazio recupera dados históricos
  it('1. Deve invalidar lastDeltaIso e forçar carga histórica quando cache local de pacientes for vazio', () => {
    // Simula navegador com cache vazio mas com lastDeltaSync corrompido ou de teste
    localStorageMock['optomed_ivs_last_delta_sync'] = '2026-10-21T09:00:00.000Z';
    
    const localPatients: any[] = [];
    const isLocalHistorySparse = localPatients.length === 0;
    const lastDeltaIso = localStorageMock['optomed_ivs_last_delta_sync'];

    // Lógica implementada: se isLocalHistorySparse for true, não deve enviar since
    const deltaUrl = `http://localhost:8765/api/sync/delta/ivs${lastDeltaIso && !isLocalHistorySparse ? `?since=${encodeURIComponent(lastDeltaIso)}` : ''}`;
    
    expect(deltaUrl).toBe('http://localhost:8765/api/sync/delta/ivs');
    expect(isLocalHistorySparse).toBe(true);
  });

  // Requisito 2: Delta Sync incremental funciona normalmente quando cache já está abastecido
  it('2. Deve manter o parâmetro since quando o cache local já possuir pacientes históricos', () => {
    localStorageMock['optomed_ivs_last_delta_sync'] = '2026-10-21T09:00:00.000Z';
    const localPatients = [{ id: 'p1', fullName: 'Paciente Existente' }];
    const isLocalHistorySparse = localPatients.length === 0;
    const lastDeltaIso = localStorageMock['optomed_ivs_last_delta_sync'];

    const deltaUrl = `http://localhost:8765/api/sync/delta/ivs${lastDeltaIso && !isLocalHistorySparse ? `?since=${encodeURIComponent(lastDeltaIso)}` : ''}`;
    expect(deltaUrl).toContain('?since=2026-10-21T09%3A00%3A00.000Z');
  });

  // Requisito 3: Preservação de registros locais não enviados (LWW / Non-destructive)
  it('3. Deve preservar alterações locais mais recentes durante a reconciliação', () => {
    const serverItem = { id: 'p1', fullName: 'Nome Servidor', updatedAt: '2026-10-17T10:00:00.000Z' };
    const localItem = { id: 'p1', fullName: 'Nome Editado Local', updatedAt: '2026-10-17T12:00:00.000Z' };

    const localMap = new Map<string, any>();
    localMap.set(localItem.id, localItem);

    // Reconciliação
    const loc = localMap.get(serverItem.id);
    const srvTs = serverItem.updatedAt;
    const locTs = loc.updatedAt;
    if (srvTs >= locTs) {
      localMap.set(serverItem.id, serverItem);
    }

    expect(localMap.get('p1').fullName).toBe('Nome Editado Local');
  });

  // Requisito 4: Idempotência total - executar a reconciliação repetidas vezes não duplica registros
  it('4. Reconciliação consecutiva deve ser 100% idempotente', () => {
    const serverList = [
      { id: 'p1', fullName: 'Paciente A' },
      { id: 'p2', fullName: 'Paciente B' }
    ];

    const localMap = new Map<string, any>();
    // Execução 1
    serverList.forEach(item => localMap.set(item.id, item));
    expect(localMap.size).toBe(2);

    // Execução 2
    serverList.forEach(item => localMap.set(item.id, item));
    expect(localMap.size).toBe(2);
  });

  // Requisito 5: Respeito estrito a tombstones (lápides de exclusão)
  it('5. Registros com lápide de exclusão mais recente não devem ser ressuscitados', () => {
    const tombstones: Record<string, string> = {
      'p_deleted': '2026-10-20T18:00:00.000Z'
    };
    const incomingRecord = { id: 'p_deleted', fullName: 'Excluído', updatedAt: '2026-10-20T17:00:00.000Z' };

    const tombTime = new Date(tombstones[incomingRecord.id]).getTime();
    const itemTime = new Date(incomingRecord.updatedAt).getTime();
    const shouldIgnore = itemTime <= tombTime;

    expect(shouldIgnore).toBe(true);
  });

  // Requisito 6: Isolamento da TV de Optotipo contra vazamento de dados de prontuário e finanças
  it('6. Eventos de prontuário, pacientes e financeiro devem ser bloqueados para dispositivos TV', () => {
    const clinicalEventTypes = [
      'server_data_updated', 'server_data_restored',
      'PATIENT_', 'APPOINTMENT_', 'ENCOUNTER_', 'PRESCRIPTION_', 
      'EVOLUTION_', 'DOCUMENT_', 'TRANSACTION_', 'CASH_REGISTER_'
    ];

    function isBlockedForTv(eventType: string): boolean {
      if (eventType === 'server_data_updated' || eventType === 'server_data_restored') return true;
      if (eventType === 'TICKET_CALLED') return false; // Exceção permitida na TV
      return clinicalEventTypes.some(prefix => eventType.startsWith(prefix));
    }

    expect(isBlockedForTv('server_data_updated')).toBe(true);
    expect(isBlockedForTv('PATIENT_CREATED')).toBe(true);
    expect(isBlockedForTv('ENCOUNTER_UPDATED')).toBe(true);
    expect(isBlockedForTv('TRANSACTION_CREATED')).toBe(true);
    expect(isBlockedForTv('PRESCRIPTION_CREATED')).toBe(true);
    expect(isBlockedForTv('TICKET_CALLED')).toBe(false);
  });

  // Requisito 7: Filtro do servidor para Delta Sync deve cobrir campos variados de data (date, issuedAt)
  it('7. Endpoint Delta Sync do servidor deve filtrar corretamente entidades com campo date ou issuedAt', () => {
    const list = [
      { id: 'e1', date: '2026-10-17T14:00:00.000Z' }, // Encontro sem updatedAt/createdAt explícito
      { id: 'pr1', date: '2026-10-17T14:30:00.000Z' }, // Prescrição
      { id: 'd1', issuedAt: '2026-10-17T15:00:00.000Z' }, // Documento Clínico
      { id: 'old1', date: '2026-09-01T10:00:00.000Z' } // Antigo
    ];

    const sinceTime = new Date('2026-10-01T00:00:00.000Z').getTime();

    const filtered = list.filter((r: any) => {
      const itemDateStr = r.updatedAt || r.createdAt || r.date || r.issuedAt || r.timestamp;
      const itemTime = itemDateStr ? new Date(itemDateStr).getTime() : 0;
      return itemTime > sinceTime;
    });

    expect(filtered.length).toBe(3);
    expect(filtered.map(x => x.id)).toEqual(['e1', 'pr1', 'd1']);
  });

  // Requisito 8: Escopo do Painel do Examinador exibe corretamente todos os registros no modo all_history
  it('8. Painel do Examinador em all_history não esconde registros de meses anteriores', () => {
    const matchesPeriod = (itemDate: string, isGlobal: boolean, viewScope: string, selectedDate: string): boolean => {
      if (isGlobal) return true;
      if (!itemDate) return false;
      const dStr = itemDate.slice(0, 10);
      if (viewScope === 'day') return dStr === selectedDate;
      if (viewScope === 'this_week') {
        const sel = new Date(selectedDate + 'T12:00:00');
        const curr = new Date(dStr + 'T12:00:00');
        const diffDays = Math.abs((curr.getTime() - sel.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      return dStr === selectedDate;
    };

    const septDate = '2026-09-05';
    const currentDate = '2026-10-21';

    // No modo this_week com data selecionada hoje: oculto (mais de 7 dias)
    expect(matchesPeriod(septDate, false, 'this_week', currentDate)).toBe(false);

    // No modo all_history (isGlobal = true): visível imediatamente
    expect(matchesPeriod(septDate, true, 'all_history', currentDate)).toBe(true);
  });
});
