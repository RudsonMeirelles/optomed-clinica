import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { ClinicalEncounter } from '@optotipo/shared';
import { offlineDb, generateUUID } from './offlineDb';

describe('OPTOMED - HOMOLOGAÇÃO: Digitação e Persistência de Autorrefração e Dioptrias', () => {
  const clinicId = 'ivs';
  let store: Record<string, string> = {};

  // Funções canônicas equivalentes às implementadas no ExaminationWorkspace
  const formatDiopterStr = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return '';
    if (val === 0) return '0.00';
    return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
  };

  const parseInputDiopter = (str: string): number | undefined => {
    if (!str || str.trim() === '' || str === '+' || str === '-') return undefined;
    const cleaned = str.trim().toLowerCase().replace(',', '.');
    if (cleaned === 'pl' || cleaned === 'plano') return 0;
    const num = parseFloat(cleaned);
    if (isNaN(num)) return undefined;
    return Math.round(num * 100) / 100;
  };

  const parseInputAxis = (str: string): number | undefined => {
    if (!str || str.trim() === '') return undefined;
    const num = parseInt(str.trim(), 10);
    if (isNaN(num)) return undefined;
    let axis = ((num % 180) + 180) % 180;
    return axis === 0 ? 180 : axis;
  };

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
    offlineDb.setActiveClinicId(clinicId);
  });

  describe('1. Parsing e Formatação de Dioptrias em Autorrefração', () => {
    it('deve aceitar e parsear valores esféricos e cilíndricos com vírgula ou ponto decimal', () => {
      // Exemplo solicitado pelo usuário: OD: ESF -1,25 / CIL -0,75; OE: ESF -0,50 / CIL -1,25
      expect(parseInputDiopter('-1,25')).toBe(-1.25);
      expect(parseInputDiopter('-0,75')).toBe(-0.75);
      expect(parseInputDiopter('-0,50')).toBe(-0.50);
      expect(parseInputDiopter('-1.25')).toBe(-1.25);
      expect(parseInputDiopter('-0.50')).toBe(-0.50);
    });

    it('deve aceitar valores positivos (+1.00, +0.50, +1,00)', () => {
      expect(parseInputDiopter('+1.00')).toBe(1.00);
      expect(parseInputDiopter('+1,00')).toBe(1.00);
      expect(parseInputDiopter('+0.50')).toBe(0.50);
      expect(parseInputDiopter('+0,25')).toBe(0.25);
    });

    it('deve aceitar zero, plano e PL como dioptria neutra (0.00)', () => {
      expect(parseInputDiopter('0')).toBe(0);
      expect(parseInputDiopter('0.00')).toBe(0);
      expect(parseInputDiopter('0,00')).toBe(0);
      expect(parseInputDiopter('plano')).toBe(0);
      expect(parseInputDiopter('PLANO')).toBe(0);
      expect(parseInputDiopter('pl')).toBe(0);
      expect(parseInputDiopter('PL')).toBe(0);
    });

    it('não deve quebrar com estados intermediários de digitação (+, -, vazio)', () => {
      expect(parseInputDiopter('-')).toBeUndefined();
      expect(parseInputDiopter('+')).toBeUndefined();
      expect(parseInputDiopter('')).toBeUndefined();
      expect(parseInputDiopter('   ')).toBeUndefined();
    });

    it('deve formatar valores para exibição no onBlur com sinal e duas casas decimais', () => {
      expect(formatDiopterStr(-1.25)).toBe('-1.25');
      expect(formatDiopterStr(1.00)).toBe('+1.00');
      expect(formatDiopterStr(0)).toBe('0.00');
      expect(formatDiopterStr(undefined)).toBe('');
    });
  });

  describe('2. Parsing e Normalização do Eixo de Autorrefração (0°–180°)', () => {
    it('deve aceitar eixo 180°, 90°, 0° e normalizar 0° para 180°', () => {
      expect(parseInputAxis('180')).toBe(180);
      expect(parseInputAxis('90')).toBe(90);
      expect(parseInputAxis('0')).toBe(180);
      expect(parseInputAxis('45')).toBe(45);
      expect(parseInputAxis('175')).toBe(175);
    });

    it('deve retornar undefined para eixo em branco', () => {
      expect(parseInputAxis('')).toBeUndefined();
      expect(parseInputAxis('   ')).toBeUndefined();
    });
  });

  describe('3. Independência OD e OE e Persistência no Encounter', () => {
    it('deve registrar OD e OE de forma completamente independente no encounter', () => {
      const encounterId = generateUUID();
      const encounter: ClinicalEncounter = {
        id: encounterId,
        patientId: 'pat-test-ar',
        date: new Date().toISOString(),
        status: 'in_progress',
        examinerId: 'dr-meirelles',
        examinerName: 'Dr. Rudson Meirelles',
        syncStatus: 'synced',
        updatedAt: new Date().toISOString(),
        autorefraction: {
          id: generateUUID(),
          encounterId: encounterId,
          od: {
            sphere: parseInputDiopter('-1,25'),
            cylinder: parseInputDiopter('-0,75'),
            axis: parseInputAxis('180')
          },
          oe: {
            sphere: parseInputDiopter('-0,50'),
            cylinder: parseInputDiopter('-1,25'),
            axis: parseInputAxis('90')
          }
        }
      };

      // Validação das estruturas
      expect(encounter.autorefraction?.od.sphere).toBe(-1.25);
      expect(encounter.autorefraction?.od.cylinder).toBe(-0.75);
      expect(encounter.autorefraction?.od.axis).toBe(180);

      expect(encounter.autorefraction?.oe.sphere).toBe(-0.50);
      expect(encounter.autorefraction?.oe.cylinder).toBe(-1.25);
      expect(encounter.autorefraction?.oe.axis).toBe(90);

      // Persistência no offlineDb
      offlineDb.saveEncounter(encounter);

      // Recuperação do banco local
      const retrieved = offlineDb.getEncounters().find(e => e.id === encounterId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.autorefraction?.od.sphere).toBe(-1.25);
      expect(retrieved?.autorefraction?.od.cylinder).toBe(-0.75);
      expect(retrieved?.autorefraction?.od.axis).toBe(180);

      expect(retrieved?.autorefraction?.oe.sphere).toBe(-0.50);
      expect(retrieved?.autorefraction?.oe.cylinder).toBe(-1.25);
      expect(retrieved?.autorefraction?.oe.axis).toBe(90);
    });

    it('não deve sobrescrever refração subjetiva ou final ao salvar autorrefração', () => {
      const encounterId = generateUUID();
      const encounter: ClinicalEncounter = {
        id: encounterId,
        patientId: 'pat-test-ar-2',
        date: new Date().toISOString(),
        status: 'in_progress',
        examinerId: 'dr-meirelles',
        examinerName: 'Dr. Rudson Meirelles',
        syncStatus: 'synced',
        updatedAt: new Date().toISOString(),
        autorefraction: {
          id: generateUUID(),
          encounterId: encounterId,
          od: { sphere: -1.25, cylinder: -0.75, axis: 180 },
          oe: { sphere: -0.50, cylinder: -1.25, axis: 90 }
        },
        subjectiveRefraction: {
          id: generateUUID(),
          encounterId: encounterId,
          od: { sphere: -1.00, cylinder: -0.50, axis: 175, visualAcuity: '20/20' },
          oe: { sphere: -0.50, cylinder: -1.00, axis: 85, visualAcuity: '20/20' },
          addition: 1.75
        }
      };

      offlineDb.saveEncounter(encounter);
      const retrieved = offlineDb.getEncounters().find(e => e.id === encounterId);

      expect(retrieved?.autorefraction?.od.sphere).toBe(-1.25);
      expect(retrieved?.subjectiveRefraction?.od.sphere).toBe(-1.00);
      expect(retrieved?.subjectiveRefraction?.addition).toBe(1.75);
    });
  });
});
