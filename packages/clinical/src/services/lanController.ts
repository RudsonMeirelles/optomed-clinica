import { ClientMessage, TVMessage, ActiveModuleType, EyeTested, PresentationDisplayMode, OptotypeType } from '@optotipo/shared';

class LanControllerService {
  private socket: WebSocket | null = null;
  private channel: BroadcastChannel | null = null;
  private isConnected: boolean = false;
  private pairedTvRoom: string = 'Consultório 1';

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('optotipo_meirelles_lan_bridge');
    }
  }

  public connect(serverUrl?: string): void {
    const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    const targetUrl = serverUrl || `ws://${host}:8765/clinical`;

    try {
      this.socket = new WebSocket(targetUrl);
      this.socket.onopen = () => {
        this.isConnected = true;
      };
      this.socket.onclose = () => {
        this.isConnected = false;
        setTimeout(() => this.connect(targetUrl), 4000);
      };
      this.socket.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.isConnected = false;
    }
  }

  public sendCommand(msg: ClientMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    }
    if (this.channel) {
      this.channel.postMessage(msg);
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
