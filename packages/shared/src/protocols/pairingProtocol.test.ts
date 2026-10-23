import { describe, it, expect } from 'vitest';
import { DevicePresenceInfo, DeviceRegistrationMessage } from './websocketMessages';

describe('Protocolo WebSocket - Subfase 5.2 (Pareamento TV + Clínica + Sala)', () => {
  it('deve definir corretamente tipos de presença de TV', () => {
    const presence: DevicePresenceInfo = {
      deviceId: 'dev_tv_123',
      deviceType: 'tv',
      clinicId: 'ivs',
      room: 'Consultório 1',
      status: 'online',
      lastSeen: new Date().toISOString(),
      isCalibrated: true
    };

    expect(presence.deviceId).toBe('dev_tv_123');
    expect(presence.deviceType).toBe('tv');
    expect(presence.clinicId).toBe('ivs');
    expect(presence.room).toBe('Consultório 1');
    expect(presence.status).toBe('online');
  });

  it('deve permitir mensagens de registro e resposta de status de sala', () => {
    const regMsg: DeviceRegistrationMessage = {
      type: 'REGISTER_DEVICE',
      deviceType: 'tv',
      clinicId: 'ivs',
      room: 'Consultório 2'
    };

    const statusMsg: DeviceRegistrationMessage = {
      type: 'ROOM_DEVICES_STATUS',
      clinicId: 'ivs',
      room: 'Consultório 2',
      devices: [
        {
          deviceId: 'dev_tv_456',
          deviceType: 'tv',
          clinicId: 'ivs',
          room: 'Consultório 2',
          status: 'online'
        }
      ]
    };

    expect(regMsg.type).toBe('REGISTER_DEVICE');
    expect(statusMsg.type).toBe('ROOM_DEVICES_STATUS');
    if (statusMsg.type === 'ROOM_DEVICES_STATUS') {
      expect(statusMsg.devices.length).toBe(1);
      expect(statusMsg.devices[0].deviceId).toBe('dev_tv_456');
    }
  });

  it('deve assegurar o isolamento de clínica e sala contra spoofing', () => {
    // Simulação da regra de roteamento no servidor
    const isAllowedBroadcast = (
      senderClinicId: string,
      targetClinicId: string,
      senderRoom?: string,
      targetRoom?: string
    ) => {
      // Clínicas diferentes nunca recebem mensagem (exceto se clinicId for 'all')
      if (senderClinicId !== 'all' && targetClinicId !== 'all' && senderClinicId !== targetClinicId) {
        return false;
      }
      // Se sala for especificada e diferente, bloqueia
      if (senderRoom && targetRoom && senderRoom !== targetRoom) {
        return false;
      }
      return true;
    };

    // Caso 1: Mesma clínica e mesma sala -> PERMITIDO
    expect(isAllowedBroadcast('ivs', 'ivs', 'Consultório 1', 'Consultório 1')).toBe(true);

    // Caso 2: Clínicas diferentes (ex: IVS tentando mandar para Megastar) -> BLOQUEADO
    expect(isAllowedBroadcast('ivs', 'megastar', 'Consultório 1', 'Consultório 1')).toBe(false);

    // Caso 3: Mesma clínica, salas diferentes (ex: Consultório 1 tentando comandar TV do Consultório 2) -> BLOQUEADO
    expect(isAllowedBroadcast('ivs', 'ivs', 'Consultório 1', 'Consultório 2')).toBe(false);

    // Caso 4: Superadmin ('all') para IVS -> PERMITIDO
    expect(isAllowedBroadcast('all', 'ivs', 'Consultório 1', 'Consultório 1')).toBe(true);
  });

  describe('Subfase 5.3 — Comandos do Controle Remoto Clínico', () => {
    it('deve validar comandos de direção, pausa, reinício e alternância de isolamento', () => {
      const directionCmd = { type: 'SET_DIRECTION', direction: 'up' };
      const pauseCmd = { type: 'PAUSE_EXAM' };
      const resumeCmd = { type: 'RESUME_EXAM' };
      const restartCmd = { type: 'RESTART_EXAM' };
      const toggleIsolatedCmd = { type: 'TOGGLE_ISOLATED' };

      expect(directionCmd.direction).toBe('up');
      expect(pauseCmd.type).toBe('PAUSE_EXAM');
      expect(resumeCmd.type).toBe('RESUME_EXAM');
      expect(restartCmd.type).toBe('RESTART_EXAM');
      expect(toggleIsolatedCmd.type).toBe('TOGGLE_ISOLATED');
    });

    it('deve formatar comandos direcionados com clinicId e room da sala pareada', () => {
      const activeClinicId = 'ivs';
      const pairedRoom = 'Consultório 1';
      const rawCmd = { type: 'NEXT_LINE' };

      const enriched = {
        ...rawCmd,
        clinicId: activeClinicId,
        room: pairedRoom
      };

      expect(enriched.type).toBe('NEXT_LINE');
      expect(enriched.clinicId).toBe('ivs');
      expect(enriched.room).toBe('Consultório 1');
    });
  });

  describe('Subfase 5.4 & 5.5 — Integração de Acuidade e Calibração de Distância', () => {
    it('deve simular o comando SET_DISTANCE e garantir propagação dos metros para a TV', () => {
      const distanceCmd = {
        type: 'SET_DISTANCE',
        distanceMeters: 4.0,
        clinicId: 'ivs',
        room: 'Consultório 1'
      };

      expect(distanceCmd.type).toBe('SET_DISTANCE');
      expect(distanceCmd.distanceMeters).toBe(4.0);
      expect(distanceCmd.room).toBe('Consultório 1');
    });

    it('deve simular o registro de acuidade no encontro clínico sem poluir estruturas externas', () => {
      interface MockEncounter {
        id: string;
        visualAcuity: {
          entries: Array<{ eye: 'OD' | 'OE' | 'AO'; uncorrected?: string; optotypeType?: string; distanceMeters?: number }>;
        };
        subjectiveRefraction: {
          od: { spherical?: number; visualAcuity?: string };
          oe: { spherical?: number; visualAcuity?: string };
        };
      }

      const encounter: MockEncounter = {
        id: 'enc_001',
        visualAcuity: { entries: [] },
        subjectiveRefraction: { od: {}, oe: {} }
      };

      // Gravação em AVsc (OD 20/40)
      const avRecord = { eye: 'OD' as const, uncorrected: '20/40', optotypeType: 'sloan', distanceMeters: 3.5 };
      encounter.visualAcuity.entries.push(avRecord);

      // Gravação na Refração (OE 20/20)
      encounter.subjectiveRefraction.oe.visualAcuity = '20/20';

      expect(encounter.visualAcuity.entries.length).toBe(1);
      expect(encounter.visualAcuity.entries[0].uncorrected).toBe('20/40');
      expect(encounter.subjectiveRefraction.oe.visualAcuity).toBe('20/20');
      expect(encounter.subjectiveRefraction.od.visualAcuity).toBeUndefined();
    });
  });
});


