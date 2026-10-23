import { 
  ClientMessage, 
  TVMessage, 
  ActiveModuleType, 
  EyeTested, 
  PresentationDisplayMode, 
  OptotypeType, 
  DevicePresenceInfo,
  mergeAppointmentStatuses
} from '@optotipo/shared';
import { getApiBase, remoteSync } from './remoteSync';
import { indexedDbStorage } from './indexedDbStorage';

function getCurrentActiveClinicId(): string {
  if (typeof localStorage === 'undefined') return 'ivs';
  return localStorage.getItem('optotipo_active_clinic_id_v2') || 
         localStorage.getItem('optotipo_active_clinic_id') || 
         'ivs';
}

class LanControllerService {
  private socket: WebSocket | null = null;
  private channel: BroadcastChannel | null = null;
  private isConnected: boolean = false;
  private isRegistered: boolean = false;
  private pairedTvRoom: string = 'Consultório 1';
  private pairedTvOnline: boolean = false;
  private lastTvHeartbeat: string | null = null;
  private roomDevices: DevicePresenceInfo[] = [];
  private heartbeatTimer: any = null;
  private lastPingSentTime: number = 0;
  private currentPingLatencyMs: number | null = null;
  private currentClinicId: string = 'ivs';
  private currentAuthToken: string | undefined = undefined;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('optotipo_meirelles_lan_bridge');
      this.channel.onmessage = (event) => {
        try {
          const data = event.data;
          if (data && data.type === 'DEVICE_PRESENCE_CHANGED' && data.device) {
            this.handlePresenceChange(data.device);
          }
        } catch {}
      };
    }
  }

  public connect(serverUrl?: string): void {
    let targetUrl = serverUrl;
    if (!targetUrl) {
      if (typeof localStorage !== 'undefined') {
        const customUrl = localStorage.getItem('optomed_ws_url') || localStorage.getItem('optomed_server_url');
        if (customUrl && customUrl.trim()) {
          targetUrl = customUrl.trim().replace(/^http/, 'ws').replace(/\/$/, '') + '/clinical';
        }
      }
    }
    if (!targetUrl) {
      const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const port = typeof window !== 'undefined' && window.location.port ? window.location.port : '';
      
      let effectivePort = port ? `:${port}` : (isHttps ? '' : ':8765');
      if (isHttps) {
        // Em HTTPS, portas não padrão (ex: 8765) são frequentemente bloqueadas por proxies reversos, Cloudflare e firewalls corporativos.
        // Se a porta for vazia, 443 ou não for explicitamente 8765, conecta na mesma origem sem forçar porta.
        if (!port || port === '443' || host.includes('optomed.app.br')) {
          effectivePort = '';
        }
      }
      targetUrl = `${isHttps ? 'wss' : 'ws'}://${host}${effectivePort}/clinical`;
    }

    try {
      this.socket = new WebSocket(targetUrl);
      this.socket.onopen = () => {
        this.isConnected = true;
        this.sendRegisterHandshake();

        // Inicia Heartbeat ativo a cada 15s com medição de latência LAN (RTT)
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.lastPingSentTime = Date.now();
            try {
              this.socket.send(JSON.stringify({ type: 'PING', timestamp: this.lastPingSentTime }));
            } catch {}
          }
        }, 15000);
      };
      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Confirmação de registro aceito pelo servidor com clínica confirmada
          if (msg.type === 'DEVICE_REGISTERED') {
            this.isRegistered = true;
            console.log(`[LAN Realtime] Dispositivo registrado com sucesso na clínica: ${msg.effectiveClinicId}`);
            this.queryRoomDevices();
            this.reconcileWithServer(msg.effectiveClinicId);
            this.notifyStatusChanged();
            // Dispara imediatamente o processamento de qualquer pendência na fila offline
            try {
              remoteSync.triggerQueueProcessing(msg.effectiveClinicId);
            } catch {}
            return;
          }

          // Registro rejeitado (token ausente ou inválido)
          if (msg.type === 'REGISTER_REJECTED') {
            this.isRegistered = false;
            console.warn(`[LAN Realtime] Registro rejeitado pelo servidor: ${msg.reason || 'Token inválido'}`);
            this.notifyStatusChanged();
            return;
          }

          // Resposta de Heartbeat (PONG) do servidor
          if (msg.type === 'PONG') {
            if (this.lastPingSentTime > 0) {
              this.currentPingLatencyMs = Math.max(1, Date.now() - this.lastPingSentTime);
            }
            this.notifyStatusChanged();
            return;
          }

          // Resposta inicial de status de dispositivos da sala
          if (msg.type === 'ROOM_DEVICES_STATUS' && Array.isArray(msg.devices)) {
            this.roomDevices = msg.devices;
            // Procura TV na mesma sala ou a primeira TV online da clínica
            const tvInRoom = this.roomDevices.find(d => d.deviceType === 'tv' && (d.room === this.pairedTvRoom || !d.room)) 
                          || this.roomDevices.find(d => d.deviceType === 'tv');

            this.pairedTvOnline = !!tvInRoom && tvInRoom.status === 'online';
            if (tvInRoom) {
              if (tvInRoom.room && tvInRoom.room !== this.pairedTvRoom) {
                // Sincroniza a sala automaticamente com a TV ativa encontrada
                this.pairedTvRoom = tvInRoom.room;
              }
              if (tvInRoom.lastSeen) {
                this.lastTvHeartbeat = tvInRoom.lastSeen;
              }
            }
            this.notifyStatusChanged();
          }

          // Notificação de presença em tempo real (online/offline)
          if (msg.type === 'DEVICE_PRESENCE_CHANGED' && msg.device) {
            this.handlePresenceChange(msg.device);
          }

          // Processa atualizações de dados enviadas pelo servidor via broadcast isolado
          if (msg.type === 'server_data_updated' && msg.clinicId && msg.entity && Array.isArray(msg.data)) {
            const eventId = msg.operationId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const storageEntity = msg.entity === 'transactions' ? 'financial_transactions' : msg.entity;
            const key = `optotipo_${msg.clinicId}_${storageEntity}_v2`;
            
            // Gravação segura no banco local
            try {
              localStorage.setItem(key, JSON.stringify(msg.data));
              console.log(`[SyncTrace] [${new Date().toISOString()}] eventId=${eventId} type=server_data_updated clinic=${msg.clinicId} entity=${msg.entity} count=${msg.data.length} localPersist=ok`);
            } catch (err) {
              console.warn(`[SyncTrace] eventId=${eventId} localPersist=failed:`, err);
            }

            // Dispara evento DOM para componentes React re-renderizarem
            const eventMap: Record<string, string> = {
              patients: 'optomed_patient_updated',
              encounters: 'optomed_encounter_updated',
              appointments: 'optomed_appointment_updated',
              transactions: 'optomed_finance_updated'
            };
            const eventName = eventMap[msg.entity];
            if (eventName && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent(eventName, { detail: { clinicId: msg.clinicId } }));
            }
          }

          // Processa eventos granulares de alta velocidade (atualiza cache local imediatamente sem esperar F5)
          if (msg.clinicId && msg.record && (
            msg.type === 'PATIENT_CREATED' || 
            msg.type === 'PATIENT_UPDATED' || 
            msg.type === 'APPOINTMENT_CREATED' || 
            msg.type === 'APPOINTMENT_UPDATED' || 
            msg.type === 'APPOINTMENT_CANCELLED' ||
            msg.type === 'ENCOUNTER_CREATED' ||
            msg.type === 'ENCOUNTER_UPDATED' ||
            msg.type === 'PRESCRIPTION_CREATED' ||
            msg.type === 'PRESCRIPTION_UPDATED' ||
            msg.type === 'EVOLUTION_CREATED' ||
            msg.type === 'EVOLUTION_UPDATED' ||
            msg.type === 'DOCUMENT_CREATED' ||
            msg.type === 'DOCUMENT_UPDATED' ||
            msg.type === 'TRANSACTION_CREATED' ||
            msg.type === 'TRANSACTION_UPDATED' ||
            msg.type === 'TRANSACTION_DELETED' ||
            msg.type === 'CASH_REGISTER_OPENED' ||
            msg.type === 'CASH_REGISTER_UPDATED'
          )) {
            const eventId = msg.operationId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const receiveTime = Date.now();
            try {
              if (msg.type.startsWith('PATIENT_')) {
                const key = `optotipo_${msg.clinicId}_patients_v2`;
                const raw = localStorage.getItem(key);
                const list = raw ? JSON.parse(raw) : [];
                const idx = list.findIndex((p: any) => p.id === msg.record.id);
                if (idx >= 0) {
                  list[idx] = { ...list[idx], ...msg.record };
                } else {
                  list.unshift(msg.record);
                }
                localStorage.setItem(key, JSON.stringify(list));
                indexedDbStorage.saveItem('patients' as any, msg.clinicId, msg.record).catch(() => {});
                console.log(`[SyncTrace] [${new Date(receiveTime).toISOString()}] eventId=${eventId} type=${msg.type} clinic=${msg.clinicId} recordId=${msg.record.id} localPersist=ok`);
              } else if (msg.type.startsWith('APPOINTMENT_')) {
                const key = `optotipo_${msg.clinicId}_appointments_v2`;
                const raw = localStorage.getItem(key);
                const list = raw ? JSON.parse(raw) : [];
                const idx = list.findIndex((a: any) => a.id === msg.record.id);
                if (msg.type === 'APPOINTMENT_CANCELLED') {
                  if (idx >= 0) list.splice(idx, 1);
                  indexedDbStorage.deleteItem('appointments' as any, msg.clinicId, msg.record.id).catch(() => {});
                } else if (idx >= 0) {
                  const existing = list[idx];
                  const resolvedStatus = (existing.status && msg.record.status)
                    ? mergeAppointmentStatuses(existing.status, msg.record.status)
                    : (msg.record.status || existing.status);
                  const mergedApt = { 
                    ...existing, 
                    ...msg.record,
                    status: resolvedStatus,
                    checkInAt: msg.record.checkInAt || existing.checkInAt,
                    calledAt: msg.record.calledAt || existing.calledAt,
                    startedAt: msg.record.startedAt || existing.startedAt,
                    completedAt: msg.record.completedAt || existing.completedAt
                  };
                  list[idx] = mergedApt;
                  indexedDbStorage.saveItem('appointments' as any, msg.clinicId, mergedApt).catch(() => {});
                } else {
                  list.push(msg.record);
                  list.sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''));
                  indexedDbStorage.saveItem('appointments' as any, msg.clinicId, msg.record).catch(() => {});
                }
                localStorage.setItem(key, JSON.stringify(list));
                console.log(`[SyncTrace] [${new Date(receiveTime).toISOString()}] eventId=${eventId} type=${msg.type} clinic=${msg.clinicId} recordId=${msg.record.id} status=${msg.record.status} localPersist=ok`);
              } else if (msg.type.startsWith('ENCOUNTER_')) {
                const key = `optotipo_${msg.clinicId}_encounters_v2`;
                const raw = localStorage.getItem(key);
                const list = raw ? JSON.parse(raw) : [];
                const idx = list.findIndex((e: any) => e.id === msg.record.id);
                if (idx >= 0) {
                  list[idx] = { ...list[idx], ...msg.record };
                } else {
                  list.unshift(msg.record);
                }
                localStorage.setItem(key, JSON.stringify(list));
                indexedDbStorage.saveItem('encounters' as any, msg.clinicId, msg.record).catch(() => {});
                console.log(`[SyncTrace] [${new Date(receiveTime).toISOString()}] eventId=${eventId} type=${msg.type} clinic=${msg.clinicId} recordId=${msg.record.id} localPersist=ok`);
              } else if (msg.type.startsWith('PRESCRIPTION_')) {
                const key = `optotipo_${msg.clinicId}_prescriptions_v2`;
                const raw = localStorage.getItem(key);
                const list = raw ? JSON.parse(raw) : [];
                const idx = list.findIndex((p: any) => p.id === msg.record.id);
                if (idx >= 0) {
                  list[idx] = { ...list[idx], ...msg.record };
                } else {
                  list.unshift(msg.record);
                }
                localStorage.setItem(key, JSON.stringify(list));
                indexedDbStorage.saveItem('prescriptions' as any, msg.clinicId, msg.record).catch(() => {});
              } else if (msg.type.startsWith('EVOLUTION_')) {
                const key = `optotipo_${msg.clinicId}_evolutions_v2`;
                const raw = localStorage.getItem(key);
                const list = raw ? JSON.parse(raw) : [];
                const idx = list.findIndex((e: any) => e.id === msg.record.id);
                if (idx >= 0) {
                  list[idx] = { ...list[idx], ...msg.record };
                } else {
                  list.unshift(msg.record);
                }
                localStorage.setItem(key, JSON.stringify(list));
                indexedDbStorage.saveItem('evolutions' as any, msg.clinicId, msg.record).catch(() => {});
              } else if (msg.type.startsWith('DOCUMENT_')) {
                const key = `optotipo_${msg.clinicId}_clinical_documents_v2`;
                const raw = localStorage.getItem(key);
                const list = raw ? JSON.parse(raw) : [];
                const idx = list.findIndex((d: any) => d.id === msg.record.id);
                if (idx >= 0) {
                  list[idx] = { ...list[idx], ...msg.record };
                } else {
                  list.unshift(msg.record);
                }
                localStorage.setItem(key, JSON.stringify(list));
                indexedDbStorage.saveItem('clinical_documents' as any, msg.clinicId, msg.record).catch(() => {});
              } else if (msg.type.startsWith('TRANSACTION_')) {
                const key = `optotipo_${msg.clinicId}_financial_transactions_v2`;
                const raw = localStorage.getItem(key);
                const list = raw ? JSON.parse(raw) : [];
                const idx = list.findIndex((t: any) => t.id === msg.record.id);
                if (msg.type === 'TRANSACTION_DELETED') {
                  if (idx >= 0) list.splice(idx, 1);
                  indexedDbStorage.deleteItem('transactions' as any, msg.clinicId, msg.record.id).catch(() => {});
                } else if (idx >= 0) {
                  list[idx] = { ...list[idx], ...msg.record };
                  indexedDbStorage.saveItem('transactions' as any, msg.clinicId, msg.record).catch(() => {});
                } else {
                  list.unshift(msg.record);
                  indexedDbStorage.saveItem('transactions' as any, msg.clinicId, msg.record).catch(() => {});
                }
                localStorage.setItem(key, JSON.stringify(list));
              } else if (msg.type.startsWith('CASH_REGISTER_')) {
                const key = `optotipo_${msg.clinicId}_cash_registers_v2`;
                const raw = localStorage.getItem(key);
                const list = raw ? JSON.parse(raw) : [];
                const idx = list.findIndex((c: any) => c.id === msg.record.id);
                if (idx >= 0) {
                  list[idx] = { ...list[idx], ...msg.record };
                } else {
                  list.unshift(msg.record);
                }
                localStorage.setItem(key, JSON.stringify(list));
                indexedDbStorage.saveItem('cash_registers' as any, msg.clinicId, msg.record).catch(() => {});
              }
            } catch (err) {
              console.warn(`[SyncTrace] eventId=${eventId} type=${msg.type} localPersist=failed:`, err);
            }

            if (typeof window !== 'undefined') {
              if (msg.type.startsWith('PATIENT_')) {
                window.dispatchEvent(new CustomEvent('optomed_patient_updated', { detail: { clinicId: msg.clinicId, patient: msg.record } }));
                if (msg.type === 'PATIENT_CREATED') {
                  window.dispatchEvent(new CustomEvent('optomed_new_patient_registered', {
                    detail: {
                      clinicId: msg.clinicId,
                      patientName: msg.record?.fullName,
                      patientId: msg.record?.id,
                      ticketNumber: msg.record?.ticketNumber || 'P-01',
                      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                      type: 'Consulta / Refração'
                    }
                  }));
                }
              } else if (msg.type.startsWith('APPOINTMENT_')) {
                window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: { clinicId: msg.clinicId, appointment: msg.record, deleted: msg.type === 'APPOINTMENT_CANCELLED' } }));
              } else if (msg.type.startsWith('ENCOUNTER_')) {
                window.dispatchEvent(new CustomEvent('optomed_encounter_updated', { detail: { clinicId: msg.clinicId, encounter: msg.record } }));
              } else if (msg.type.startsWith('PRESCRIPTION_')) {
                window.dispatchEvent(new CustomEvent('optomed_prescription_updated', { detail: { clinicId: msg.clinicId, prescription: msg.record } }));
              } else if (msg.type.startsWith('EVOLUTION_')) {
                window.dispatchEvent(new CustomEvent('optomed_evolution_updated', { detail: { clinicId: msg.clinicId, evolution: msg.record } }));
              } else if (msg.type.startsWith('DOCUMENT_')) {
                window.dispatchEvent(new CustomEvent('optomed_document_updated', { detail: { clinicId: msg.clinicId, document: msg.record } }));
              } else if (msg.type.startsWith('TRANSACTION_')) {
                window.dispatchEvent(new CustomEvent('optomed_finance_updated', { detail: { clinicId: msg.clinicId } }));
              } else if (msg.type.startsWith('CASH_REGISTER_')) {
                window.dispatchEvent(new CustomEvent('optomed_cash_register_updated', { detail: { clinicId: msg.clinicId } }));
              }
            }
          }
        } catch {}
      };
      this.socket.onclose = () => {
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
        this.isConnected = false;
        this.pairedTvOnline = false;
        this.currentPingLatencyMs = null;
        this.notifyStatusChanged();
        setTimeout(() => this.connect(targetUrl), 4000);
      };
      this.socket.onerror = () => {
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
        this.isConnected = false;
        this.pairedTvOnline = false;
        this.currentPingLatencyMs = null;
        this.notifyStatusChanged();
      };
    } catch {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      this.isConnected = false;
      this.pairedTvOnline = false;
      this.currentPingLatencyMs = null;
      this.notifyStatusChanged();
    }
  }

  public sendRegisterHandshake(clinicId?: string, authToken?: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const activeClinicId = clinicId || this.currentClinicId || getCurrentActiveClinicId();
    const token = authToken || this.currentAuthToken || (typeof localStorage !== 'undefined' ? (localStorage.getItem('optotipo_clinical_auth_token_v2') || undefined) : undefined);
    
    this.currentClinicId = activeClinicId;
    this.currentAuthToken = token;

    // Detecta se está acessando a tela de controle remoto móvel
    const isRemoteMode = typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/controle') ||
      window.location.search.includes('controle=1') ||
      window.location.search.includes('remote=1')
    );

    const regMsg = {
      type: 'REGISTER_DEVICE',
      deviceType: (!token && isRemoteMode) ? 'remote' : 'clinical',
      clinicId: activeClinicId,
      room: this.pairedTvRoom,
      authToken: token
    };
    try {
      this.socket.send(JSON.stringify(regMsg));
    } catch {}
  }

  public reconnect(clinicId?: string, authToken?: string): void {
    if (clinicId) this.currentClinicId = clinicId;
    if (authToken) this.currentAuthToken = authToken;

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // Reenvia registro imediatamente se socket já estiver aberto
      this.sendRegisterHandshake(this.currentClinicId, this.currentAuthToken);
    } else {
      // Reconecta o socket do zero
      try {
        if (this.socket) {
          this.socket.onclose = null;
          this.socket.onerror = null;
          this.socket.close();
        }
      } catch {}
      this.connect();
    }
  }

  public isRegisteredWithServer(): boolean {
    return this.isRegistered;
  }

  private handlePresenceChange(device: DevicePresenceInfo): void {
    if (device.deviceType === 'tv') {
      // Auto-pareia com a TV da clínica mesmo se o nome da sala tiver pequena diferença
      if (device.room && (!this.pairedTvRoom || this.pairedTvRoom === 'Consultório 1' || this.pairedTvRoom === 'Consultório Meirelles')) {
        this.pairedTvRoom = device.room;
      }
      this.pairedTvOnline = device.status === 'online';
      this.lastTvHeartbeat = device.lastSeen || new Date().toISOString();
      this.notifyStatusChanged();
    }
  }

  public queryRoomDevices(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const activeClinicId = this.currentClinicId || getCurrentActiveClinicId();
      this.socket.send(JSON.stringify({
        type: 'QUERY_ROOM_DEVICES',
        clinicId: activeClinicId,
        room: this.pairedTvRoom
      }));
    }
  }

  private notifyStatusChanged(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_tv_status_changed', {
        detail: {
          isSocketConnected: this.isConnected,
          isRegistered: this.isRegistered,
          isTvOnline: this.pairedTvOnline,
          pairedRoom: this.pairedTvRoom,
          lastTvHeartbeat: this.lastTvHeartbeat,
          pingLatencyMs: this.currentPingLatencyMs
        }
      }));
    }
  }

  public getPingLatencyMs(): number | null {
    return this.currentPingLatencyMs;
  }

  public isTvOnline(): boolean {
    return this.pairedTvOnline;
  }


  public sendCommand(msg: ClientMessage): void {
    const activeClinicId = getCurrentActiveClinicId();
    const enriched = {
      ...msg,
      clinicId: (msg as any).clinicId || activeClinicId,
      room: (msg as any).room || this.pairedTvRoom
    };
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(enriched));
    }
    if (this.channel) {
      this.channel.postMessage(enriched);
    }
  }

  public setModule(module: ActiveModuleType): void {
    this.sendCommand({ type: 'SET_MODULE', module });
  }

  public setOptotypeType(optotypeType: OptotypeType): void {
    this.sendCommand({ type: 'SET_OPTOTYPE_TYPE', optotypeType });
  }

  public setAcuity(snellen: string): void {
    this.sendCommand({ type: 'SET_ACUITY', snellen });
  }

  public returnToMenu(): void {
    this.sendCommand({ type: 'RETURN_TO_MENU' });
  }

  public setEye(eye: EyeTested): void {
    this.sendCommand({ type: 'SET_EYE', eye });
  }

  public nextLine(): void {
    this.sendCommand({ type: 'NEXT_LINE' });
  }

  public prevLine(): void {
    this.sendCommand({ type: 'PREV_LINE' });
  }

  public randomize(): void {
    this.sendCommand({ type: 'RANDOMIZE' });
  }

  public setDistance(distanceMeters: number): void {
    this.sendCommand({ type: 'SET_DISTANCE', distanceMeters });
  }

  public setDirection(direction: 'up' | 'down' | 'left' | 'right'): void {
    this.sendCommand({ type: 'SET_DIRECTION', direction });
  }

  public pauseExam(): void {
    this.sendCommand({ type: 'PAUSE_EXAM' });
  }

  public resumeExam(): void {
    this.sendCommand({ type: 'RESUME_EXAM' });
  }

  public restartExam(): void {
    this.sendCommand({ type: 'RESTART_EXAM' });
  }

  public toggleIsolated(): void {
    this.sendCommand({ type: 'TOGGLE_ISOLATED' });
  }

  public toggleCrowding(): void {
    this.sendCommand({ type: 'TOGGLE_CROWDING' });
  }

  public toggleScreenSaver(active: boolean): void {
    this.sendCommand({ type: active ? 'TRIGGER_SCREENSAVER' : 'WAKE_SCREEN' });
  }

  public callPatient(ticket: { ticketNumber: string; patientName: string; roomName: string; examinerName: string; priority?: boolean }): void {
    const payload = {
      ...ticket,
      calledAt: new Date().toISOString()
    };
    this.sendCommand({ type: 'CALL_PATIENT', ticket: payload });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_patient_called', { detail: payload }));
      localStorage.setItem('optomed_latest_ticket_call', JSON.stringify(payload));
    }
  }

  public clearPatientCall(): void {
    this.sendCommand({ type: 'CLEAR_PATIENT_CALL' });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_patient_cleared'));
      localStorage.removeItem('optomed_latest_ticket_call');
    }
  }

  public async reconcileWithServer(clinicId?: string): Promise<void> {
    const targetClinic = clinicId || getCurrentActiveClinicId();
    try {
      const base = getApiBase();
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('optotipo_clinical_auth_token_v2') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Puxa as principais entidades em paralelo com tolerância a falhas
      const entities = ['patients', 'appointments', 'encounters', 'prescriptions', 'clinical_documents', 'transactions'];
      for (const ent of entities) {
        try {
          const res = await fetch(`${base}/api/data/${targetClinic}/${ent}`, {
            headers,
            signal: AbortSignal.timeout(6000)
          });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json.data)) {
              const storageEntity = ent === 'transactions' ? 'financial_transactions' : ent;
              const key = `optotipo_${targetClinic}_${storageEntity}_v2`;
              
              // Mescla de forma não-destrutiva com dados locais existentes
              const localRaw = localStorage.getItem(key);
              const localList = localRaw ? JSON.parse(localRaw) : [];
              const localMap = new Map<string, any>();
              localList.forEach((item: any) => { if (item?.id) localMap.set(item.id, item); });

              // Servidor tem precedência na carga inicial, preservando registros locais mais novos
              json.data.forEach((srvItem: any) => {
                if (!srvItem?.id) return;
                const locItem = localMap.get(srvItem.id);
                if (!locItem) {
                  localMap.set(srvItem.id, srvItem);
                } else {
                  const srvTs = srvItem.updatedAt || srvItem.createdAt || srvItem.date || '';
                  const locTs = locItem.updatedAt || locItem.createdAt || locItem.date || '';
                  if (srvTs >= locTs) {
                    localMap.set(srvItem.id, srvItem);
                  }
                }
              });

              const mergedList = Array.from(localMap.values());
              localStorage.setItem(key, JSON.stringify(mergedList));
              indexedDbStorage.saveAll(ent as any, targetClinic, mergedList).catch(() => {});

              if (typeof window !== 'undefined') {
                const eventMap: Record<string, string> = {
                  patients: 'optomed_patient_updated',
                  appointments: 'optomed_appointment_updated',
                  encounters: 'optomed_encounter_updated',
                  prescriptions: 'optomed_prescription_updated',
                  clinical_documents: 'optomed_document_updated',
                  transactions: 'optomed_finance_updated'
                };
                window.dispatchEvent(new CustomEvent(eventMap[ent], { detail: { clinicId: targetClinic } }));
              }
            }
          }
        } catch {}
      }
    } catch (e) {
      console.warn('[Realtime] Falha na reconciliação pós-conexão:', e);
    }
  }

  public isSocketConnected(): boolean {
    return this.isConnected;
  }

  public getPairedRoom(): string {
    return this.pairedTvRoom;
  }

  public setPairedRoom(room: string): void {
    this.pairedTvRoom = room;
  }
}

export const lanController = new LanControllerService();
