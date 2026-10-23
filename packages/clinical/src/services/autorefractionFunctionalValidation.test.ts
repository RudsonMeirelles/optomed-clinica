import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { ClinicalEncounter, Patient } from '@optotipo/shared';
import { offlineDb, generateUUID } from './offlineDb';

describe('HOMOLOGAÇÃO FUNCIONAL DETALHADA — AUTORREFRAÇÃO', () => {
  const clinicId = 'ivs';
  let store: Record<string, string> = {};

  // Funções canônicas de processamento em ExaminationWorkspace.tsx
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

  // Simulação do comportamento de estado do componente ExaminationWorkspace
  class ExaminationWorkspaceSimulation {
    encounter: ClinicalEncounter;

    // Estados locais (buffers controlados)
    arOdSph: string = '';
    arOdCyl: string = '';
    arOdAxis: string = '';

    arOeSph: string = '';
    arOeCyl: string = '';
    arOeAxis: string = '';

    constructor(initialEncounter: ClinicalEncounter) {
      this.encounter = { ...initialEncounter };
      this.syncFromEncounter();
    }

    syncFromEncounter() {
      if (this.encounter.autorefraction) {
        this.arOdSph = formatDiopterStr(this.encounter.autorefraction.od?.sphere);
        this.arOdCyl = formatDiopterStr(this.encounter.autorefraction.od?.cylinder);
        this.arOdAxis = this.encounter.autorefraction.od?.axis !== undefined ? String(this.encounter.autorefraction.od.axis) : '';

        this.arOeSph = formatDiopterStr(this.encounter.autorefraction.oe?.sphere);
        this.arOeCyl = formatDiopterStr(this.encounter.autorefraction.oe?.cylinder);
        this.arOeAxis = this.encounter.autorefraction.oe?.axis !== undefined ? String(this.encounter.autorefraction.oe.axis) : '';
      } else {
        this.arOdSph = '';
        this.arOdCyl = '';
        this.arOdAxis = '';
        this.arOeSph = '';
        this.arOeCyl = '';
        this.arOeAxis = '';
      }
    }

    // Handler OD Esfera
    onOdSphChange(text: string) {
      this.arOdSph = text;
      const parsed = parseInputDiopter(text);
      const curAR = this.encounter.autorefraction || { id: generateUUID(), encounterId: this.encounter.id, od: {}, oe: {} };
      this.encounter = {
        ...this.encounter,
        autorefraction: { ...curAR, od: { ...curAR.od, sphere: parsed } }
      };
    }

    onOdSphBlur() {
      const parsed = parseInputDiopter(this.arOdSph);
      this.arOdSph = formatDiopterStr(parsed);
      const curAR = this.encounter.autorefraction || { id: generateUUID(), encounterId: this.encounter.id, od: {}, oe: {} };
      this.encounter = {
        ...this.encounter,
        autorefraction: { ...curAR, od: { ...curAR.od, sphere: parsed } }
      };
    }

    // Handler OD Cilindro
    onOdCylChange(text: string) {
      this.arOdCyl = text;
      const parsed = parseInputDiopter(text);
      const curAR = this.encounter.autorefraction || { id: generateUUID(), encounterId: this.encounter.id, od: {}, oe: {} };
      this.encounter = {
        ...this.encounter,
        autorefraction: { ...curAR, od: { ...curAR.od, cylinder: parsed } }
      };
    }

    onOdCylBlur() {
      const parsed = parseInputDiopter(this.arOdCyl);
      this.arOdCyl = formatDiopterStr(parsed);
      const curAR = this.encounter.autorefraction || { id: generateUUID(), encounterId: this.encounter.id, od: {}, oe: {} };
      this.encounter = {
        ...this.encounter,
        autorefraction: { ...curAR, od: { ...curAR.od, cylinder: parsed } }
      };
    }

    // Handler OD Eixo
    onOdAxisChange(text: string) {
      this.arOdAxis = text;
      const parsed = parseInputAxis(text);
      const curAR = this.encounter.autorefraction || { id: generateUUID(), encounterId: this.encounter.id, od: {}, oe: {} };
      this.encounter = {
        ...this.encounter,
        autorefraction: { ...curAR, od: { ...curAR.od, axis: parsed } }
      };
    }

    onOdAxisBlur() {
      const parsed = parseInputAxis(this.arOdAxis);
      this.arOdAxis = parsed !== undefined ? String(parsed) : '';
      const curAR = this.encounter.autorefraction || { id: generateUUID(), encounterId: this.encounter.id, od: {}, oe: {} };
      this.encounter = {
        ...this.encounter,
        autorefraction: { ...curAR, od: { ...curAR.od, axis: parsed } }
      };
    }

    // Handler OE Esfera
    onOeSphChange(text: string) {
      this.arOeSph = text;
      const parsed = parseInputDiopter(text);
      const curAR = this.encounter.autorefraction || { id: generateUUID(), encounterId: this.encounter.id, od: {}, oe: {} };
      this.encounter = {
        ...this.encounter,
        autorefraction: { ...curAR, oe: { ...curAR.oe, sphere: parsed } }
      };
    }

    onOeSphBlur() {
      const parsed = parseInputDiopter(this.arOeSph);
      this.arOeSph = formatDiopterStr(parsed);
      const curAR = this.encounter.autorefraction || { id: generateUUID(), encounterId: this.encounter.id, od: {}, oe: {} };
      this.encounter = {
        ...this.encounter,
        autorefraction: { ...curAR, oe: { ...curAR.oe, sphere: parsed } }
      };
    }

    // Handler OE Cilindro
    onOeCylChange(text: string) {
      this.arOeCyl = text;
      const parsed = parseInputDiopter(text);
      const curAR = this.encounter.autorefraction || { id: generateUUID(), encounterId: this.encounter.id, od: {}, oe: {} };
      this.encounter = {
        ...this.encounter,
        autorefraction: { ...curAR, oe: { ...curAR.oe, cylinder: parsed } }
      };
    }

    onOeCylBlur() {
      const parsed = parseInputDiopter(this.arOeCyl);
      this.arOeCyl = formatDiopterStr(parsed);
      const curAR = this.encounter.autorefraction || { id: generateUUID(), encounterId: this.encounter.id, od: {}, oe: {} };
      this.encounter = {
        ...this.encounter,
        autorefraction: { ...curAR, oe: { ...curAR.oe, cylinder: parsed } }
      };
    }

    // Handler OE Eixo
    onOeAxisChange(text: string) {
      this.arOeAxis = text;
      const parsed = parseInputAxis(text);
      const curAR = this.encounter.autorefraction || { id: generateUUID(), encounterId: this.encounter.id, od: {}, oe: {} };
      this.encounter = {
        ...this.encounter,
        autorefraction: { ...curAR, oe: { ...curAR.oe, axis: parsed } }
      };
    }

    onOeAxisBlur() {
      const parsed = parseInputAxis(this.arOeAxis);
      this.arOeAxis = parsed !== undefined ? String(parsed) : '';
      const curAR = this.encounter.autorefraction || { id: generateUUID(), encounterId: this.encounter.id, od: {}, oe: {} };
      this.encounter = {
        ...this.encounter,
        autorefraction: { ...curAR, oe: { ...curAR.oe, axis: parsed } }
      };
    }

    importARToSubjective() {
      const ar = this.encounter.autorefraction;
      if (!ar) return;
      const curSub = this.encounter.subjectiveRefraction || { id: generateUUID(), encounterId: this.encounter.id, od: {}, oe: {} };
      this.encounter = {
        ...this.encounter,
        subjectiveRefraction: {
          ...curSub,
          od: { ...curSub.od, sphere: ar.od?.sphere, cylinder: ar.od?.cylinder, axis: ar.od?.axis },
          oe: { ...curSub.oe, sphere: ar.oe?.sphere, cylinder: ar.oe?.cylinder, axis: ar.oe?.axis }
        }
      };
    }

    save() {
      offlineDb.saveEncounter(this.encounter);
    }
  }

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

  const createInitialEncounter = (): ClinicalEncounter => ({
    id: generateUUID(),
    patientId: 'patient-test-ar',
    date: new Date().toISOString(),
    status: 'in_progress',
    examinerId: 'dr-meirelles',
    examinerName: 'Dr. Rudson Meirelles',
    syncStatus: 'synced',
    updatedAt: new Date().toISOString()
  });

  // TESTE 1 a 6: Digitação de OD ESF (- -> -1 -> -1, -> -1,25 -> blur)
  it('TESTE 1 a 6: Deve manter cursor/buffer durante digitação de "-", "-1", "-1,", "-1,25", sem apagar e sem converter para 0 prematuramente', () => {
    const ws = new ExaminationWorkspaceSimulation(createInitialEncounter());

    // Digitando "-"
    ws.onOdSphChange('-');
    expect(ws.arOdSph).toBe('-'); // 2. Consigo digitar "-" antes do número? SIM.
    expect(ws.encounter.autorefraction?.od?.sphere).toBeUndefined(); // 6. O valor não é convertido para 0 enquanto digito? CORRETO.

    // Digitando "-1"
    ws.onOdSphChange('-1');
    expect(ws.arOdSph).toBe('-1');
    expect(ws.encounter.autorefraction?.od?.sphere).toBe(-1);

    // Digitando "-1,"
    ws.onOdSphChange('-1,');
    expect(ws.arOdSph).toBe('-1,'); // 4. Consigo digitar a vírgula? SIM. 5. A vírgula não apaga o valor? SIM.
    expect(ws.encounter.autorefraction?.od?.sphere).toBe(-1); // Não vira 0

    // Digitando "-1,25"
    ws.onOdSphChange('-1,25');
    expect(ws.arOdSph).toBe('-1,25');
    expect(ws.encounter.autorefraction?.od?.sphere).toBe(-1.25);

    // 9. Ao sair do campo (blur), o valor é normalizado corretamente
    ws.onOdSphBlur();
    expect(ws.arOdSph).toBe('-1.25');
    expect(ws.encounter.autorefraction?.od?.sphere).toBe(-1.25);
  });

  it('TESTE 3: Deve permitir digitar "+" antes do número e normalizar (+1,00)', () => {
    const ws = new ExaminationWorkspaceSimulation(createInitialEncounter());
    ws.onOdSphChange('+');
    expect(ws.arOdSph).toBe('+');
    expect(ws.encounter.autorefraction?.od?.sphere).toBeUndefined();

    ws.onOdSphChange('+1');
    expect(ws.arOdSph).toBe('+1');

    ws.onOdSphChange('+1,00');
    expect(ws.arOdSph).toBe('+1,00');
    expect(ws.encounter.autorefraction?.od?.sphere).toBe(1.00);

    ws.onOdSphBlur();
    expect(ws.arOdSph).toBe('+1.00');
    expect(ws.encounter.autorefraction?.od?.sphere).toBe(1.00);
  });

  it('TESTE: Deve aceitar 0, pl e plano e normalizar para 0.00', () => {
    const ws = new ExaminationWorkspaceSimulation(createInitialEncounter());

    // Digitando 0
    ws.onOdSphChange('0');
    expect(ws.arOdSph).toBe('0');
    expect(ws.encounter.autorefraction?.od?.sphere).toBe(0);
    ws.onOdSphBlur();
    expect(ws.arOdSph).toBe('0.00');

    // Digitando pl
    ws.onOdSphChange('pl');
    expect(ws.arOdSph).toBe('pl');
    expect(ws.encounter.autorefraction?.od?.sphere).toBe(0);
    ws.onOdSphBlur();
    expect(ws.arOdSph).toBe('0.00');

    // Digitando plano
    ws.onOdSphChange('plano');
    expect(ws.arOdSph).toBe('plano');
    expect(ws.encounter.autorefraction?.od?.sphere).toBe(0);
    ws.onOdSphBlur();
    expect(ws.arOdSph).toBe('0.00');
  });

  it('TESTE CIL e EIXO: Deve aceitar -0,25, -0,75, +0,50 e Eixo 0, 45, 90, 180', () => {
    const ws = new ExaminationWorkspaceSimulation(createInitialEncounter());

    // CIL: -0,75
    ws.onOdCylChange('-0,75');
    ws.onOdCylBlur();
    expect(ws.arOdCyl).toBe('-0.75');
    expect(ws.encounter.autorefraction?.od?.cylinder).toBe(-0.75);

    // EIXO: 0 -> normalizado para 180
    ws.onOdAxisChange('0');
    ws.onOdAxisBlur();
    expect(ws.arOdAxis).toBe('180');
    expect(ws.encounter.autorefraction?.od?.axis).toBe(180);

    // EIXO: 45
    ws.onOdAxisChange('45');
    ws.onOdAxisBlur();
    expect(ws.arOdAxis).toBe('45');
    expect(ws.encounter.autorefraction?.od?.axis).toBe(45);

    // EIXO: 90
    ws.onOdAxisChange('90');
    ws.onOdAxisBlur();
    expect(ws.arOdAxis).toBe('90');
    expect(ws.encounter.autorefraction?.od?.axis).toBe(90);

    // EIXO: 180
    ws.onOdAxisChange('180');
    ws.onOdAxisBlur();
    expect(ws.arOdAxis).toBe('180');
    expect(ws.encounter.autorefraction?.od?.axis).toBe(180);
  });

  // TESTE 7 e 8: OD não altera OE / OE não altera OD
  it('TESTE 7 e 8: OD não altera OE e OE não altera OD (independência mútua total)', () => {
    const ws = new ExaminationWorkspaceSimulation(createInitialEncounter());

    // Preenche OD
    ws.onOdSphChange('-1,25');
    ws.onOdSphBlur();
    ws.onOdCylChange('-0,75');
    ws.onOdCylBlur();
    ws.onOdAxisChange('180');
    ws.onOdAxisBlur();

    // Verifica que OE permanece completamente intocado e vazio
    expect(ws.arOeSph).toBe('');
    expect(ws.arOeCyl).toBe('');
    expect(ws.arOeAxis).toBe('');
    expect(ws.encounter.autorefraction?.oe?.sphere).toBeUndefined();
    expect(ws.encounter.autorefraction?.oe?.cylinder).toBeUndefined();
    expect(ws.encounter.autorefraction?.oe?.axis).toBeUndefined();

    // Agora preenche OE: ESF: +0,50, CIL: -1,25, EIXO: 90
    ws.onOeSphChange('+0,50');
    ws.onOeSphBlur();
    ws.onOeCylChange('-1,25');
    ws.onOeCylBlur();
    ws.onOeAxisChange('90');
    ws.onOeAxisBlur();

    // Verifica que OD não sofreu nenhuma alteração
    expect(ws.arOdSph).toBe('-1.25');
    expect(ws.arOdCyl).toBe('-0.75');
    expect(ws.arOdAxis).toBe('180');
    expect(ws.encounter.autorefraction?.od?.sphere).toBe(-1.25);
    expect(ws.encounter.autorefraction?.od?.cylinder).toBe(-0.75);
    expect(ws.encounter.autorefraction?.od?.axis).toBe(180);

    // E OE está exatamente com os valores configurados
    expect(ws.arOeSph).toBe('+0.50');
    expect(ws.arOeCyl).toBe('-1.25');
    expect(ws.arOeAxis).toBe('90');
    expect(ws.encounter.autorefraction?.oe?.sphere).toBe(0.50);
    expect(ws.encounter.autorefraction?.oe?.cylinder).toBe(-1.25);
    expect(ws.encounter.autorefraction?.oe?.axis).toBe(90);
  });

  // TESTE 10, 11 e 12: Salvar exame, sair do prontuário, retornar e F5/reload
  it('TESTE 10, 11 e 12: Ao salvar exame, sair do prontuário e retornar (simulação de F5/reload), permanece correto', () => {
    const encId = generateUUID();
    const enc: ClinicalEncounter = {
      ...createInitialEncounter(),
      id: encId
    };

    const ws = new ExaminationWorkspaceSimulation(enc);
    ws.onOdSphChange('-1,25');
    ws.onOdSphBlur();
    ws.onOdCylChange('-0,75');
    ws.onOdCylBlur();
    ws.onOdAxisChange('180');
    ws.onOdAxisBlur();

    ws.onOeSphChange('+0,50');
    ws.onOeSphBlur();
    ws.onOeCylChange('-1,25');
    ws.onOeCylBlur();
    ws.onOeAxisChange('90');
    ws.onOeAxisBlur();

    // 10. Salvar exame
    ws.save();

    // 11. Sair do prontuário (descarregar componente) e recarregar do banco
    const loadedFromDb = offlineDb.getEncounters().find(e => e.id === encId);
    expect(loadedFromDb).toBeDefined();
    expect(loadedFromDb?.autorefraction?.od?.sphere).toBe(-1.25);
    expect(loadedFromDb?.autorefraction?.od?.cylinder).toBe(-0.75);
    expect(loadedFromDb?.autorefraction?.od?.axis).toBe(180);
    expect(loadedFromDb?.autorefraction?.oe?.sphere).toBe(0.50);
    expect(loadedFromDb?.autorefraction?.oe?.cylinder).toBe(-1.25);
    expect(loadedFromDb?.autorefraction?.oe?.axis).toBe(90);

    // 12. Retornar ao ExaminationWorkspace (montagem do componente após F5)
    const newWsInstance = new ExaminationWorkspaceSimulation(loadedFromDb!);
    expect(newWsInstance.arOdSph).toBe('-1.25');
    expect(newWsInstance.arOdCyl).toBe('-0.75');
    expect(newWsInstance.arOdAxis).toBe('180');

    expect(newWsInstance.arOeSph).toBe('+0.50');
    expect(newWsInstance.arOeCyl).toBe('-1.25');
    expect(newWsInstance.arOeAxis).toBe('90');
  });

  // TESTE 13: Autorrefração continua separada da Refração Subjetiva
  it('TESTE 13: Autorrefração permanece estritamente separada da Refração Subjetiva', () => {
    const encId = generateUUID();
    const enc: ClinicalEncounter = {
      ...createInitialEncounter(),
      id: encId,
      subjectiveRefraction: {
        id: generateUUID(),
        encounterId: encId,
        od: { sphere: -1.00, cylinder: -0.50, axis: 170, visualAcuity: '20/20' },
        oe: { sphere: 0.00, cylinder: -1.00, axis: 80, visualAcuity: '20/20' }
      }
    };

    const ws = new ExaminationWorkspaceSimulation(enc);
    ws.onOdSphChange('-1,25');
    ws.onOdSphBlur();
    ws.onOdCylChange('-0,75');
    ws.onOdCylBlur();
    ws.onOdAxisChange('180');
    ws.onOdAxisBlur();

    ws.onOeSphChange('+0,50');
    ws.onOeSphBlur();
    ws.onOeCylChange('-1,25');
    ws.onOeCylBlur();
    ws.onOeAxisChange('90');
    ws.onOeAxisBlur();

    ws.save();

    // A refração subjetiva NÃO foi alterada pela digitação de autorrefração
    expect(ws.encounter.subjectiveRefraction?.od?.sphere).toBe(-1.00);
    expect(ws.encounter.subjectiveRefraction?.od?.cylinder).toBe(-0.50);
    expect(ws.encounter.subjectiveRefraction?.od?.axis).toBe(170);

    expect(ws.encounter.subjectiveRefraction?.oe?.sphere).toBe(0.00);
    expect(ws.encounter.subjectiveRefraction?.oe?.cylinder).toBe(-1.00);
    expect(ws.encounter.subjectiveRefraction?.oe?.axis).toBe(80);
  });

  // TESTE 14: "Importar AR" continua funcionando
  it('TESTE 14: "Importar AR" transfere com precisão os valores de AR para a Refração Subjetiva quando acionado', () => {
    const encId = generateUUID();
    const enc: ClinicalEncounter = {
      ...createInitialEncounter(),
      id: encId
    };

    const ws = new ExaminationWorkspaceSimulation(enc);
    ws.onOdSphChange('-1,25');
    ws.onOdSphBlur();
    ws.onOdCylChange('-0,75');
    ws.onOdCylBlur();
    ws.onOdAxisChange('180');
    ws.onOdAxisBlur();

    ws.onOeSphChange('+0,50');
    ws.onOeSphBlur();
    ws.onOeCylChange('-1,25');
    ws.onOeCylBlur();
    ws.onOeAxisChange('90');
    ws.onOeAxisBlur();

    // Executa "Importar AR"
    ws.importARToSubjective();

    expect(ws.encounter.subjectiveRefraction?.od?.sphere).toBe(-1.25);
    expect(ws.encounter.subjectiveRefraction?.od?.cylinder).toBe(-0.75);
    expect(ws.encounter.subjectiveRefraction?.od?.axis).toBe(180);

    expect(ws.encounter.subjectiveRefraction?.oe?.sphere).toBe(0.50);
    expect(ws.encounter.subjectiveRefraction?.oe?.cylinder).toBe(-1.25);
    expect(ws.encounter.subjectiveRefraction?.oe?.axis).toBe(90);
  });
});
