import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { offlineDb } from './offlineDb';
import { ClinicalEncounter, DiagnosisEntry, ClinicalConduct, ClinicalEvolution } from '@optotipo/shared';

describe('OPTOMED — FASE 24: Diagnóstico, Conduta e Evolução Clínica', () => {
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
  });

  // 1. DIAGNÓSTICO
  describe('Diagnóstico Clínico Estruturado', () => {
    it('deve registrar diagnóstico principal e múltiplos secundários com descrição, lateralidade, status e observações', () => {
      const primaryDiag: DiagnosisEntry = {
        id: 'diag-1',
        encounterId: 'enc-fase24-1',
        code: 'H52.1',
        codingSystem: 'CID-10',
        description: 'Miopia de grau moderado',
        eye: 'OU',
        status: 'confirmed',
        primary: true,
        notes: 'Paciente queixa-se de baixa acuidade visual para longe há 6 meses',
        createdAt: new Date().toISOString()
      };

      const secondaryDiag1: DiagnosisEntry = {
        id: 'diag-2',
        encounterId: 'enc-fase24-1',
        code: 'H52.2',
        codingSystem: 'CID-10',
        description: 'Astigmatismo miópico regular',
        eye: 'OD',
        status: 'confirmed',
        primary: false,
        notes: 'Eixo estável em 90 graus',
        createdAt: new Date().toISOString()
      };

      const secondaryDiag2: DiagnosisEntry = {
        id: 'diag-3',
        encounterId: 'enc-fase24-1',
        description: 'Ceratoconjuntivite Sicca (Olho Seco)',
        // Sem código inventado quando não disponível
        eye: 'OU',
        status: 'suspected',
        primary: false,
        notes: 'Teste de Schirmer limítrofe, uso frequente de telas',
        createdAt: new Date().toISOString()
      };

      const encounter: ClinicalEncounter = {
        id: 'enc-fase24-1',
        patientId: 'pat-100',
        date: new Date().toISOString(),
        status: 'in_progress',
        diagnoses: [primaryDiag, secondaryDiag1, secondaryDiag2],
        syncStatus: 'synced',
        updatedAt: new Date().toISOString()
      };

      offlineDb.saveEncounter(encounter, 'ivs');

      const savedEnc = offlineDb.getEncounters('ivs').find(e => e.id === 'enc-fase24-1');
      expect(savedEnc).toBeDefined();
      expect(savedEnc?.diagnoses).toHaveLength(3);

      // Principal
      const principal = savedEnc?.diagnoses?.find(d => d.primary);
      expect(principal).toBeDefined();
      expect(principal?.description).toBe('Miopia de grau moderado');
      expect(principal?.code).toBe('H52.1');
      expect(principal?.eye).toBe('OU');
      expect(principal?.status).toBe('confirmed');
      expect(principal?.notes).toContain('baixa acuidade visual');

      // Secundários
      const secList = savedEnc?.diagnoses?.filter(d => !d.primary);
      expect(secList).toHaveLength(2);
      expect(secList?.[0].eye).toBe('OD');
      expect(secList?.[1].code).toBeUndefined(); // Não inventar códigos clínicos
      expect(secList?.[1].status).toBe('suspected');
    });

    it('não deve exigir código clínico quando o examinador registrar descrição livre', () => {
      const customDiag: DiagnosisEntry = {
        id: 'diag-custom',
        encounterId: 'enc-custom',
        description: 'Alteração pigmentar periférica sem tração vítrea',
        eye: 'OE',
        status: 'confirmed',
        primary: true,
        notes: 'Mapeamento periférico com oftalmoscopia binocular indireta',
        createdAt: new Date().toISOString()
      };

      expect(customDiag.code).toBeUndefined();
      expect(customDiag.description).toBeTruthy();
      expect(customDiag.eye).toBe('OE');
    });
  });

  // 2. CONDUTA
  describe('Conduta Clínica Estruturada', () => {
    it('deve registrar conduta, orientações, tratamento, encaminhamento, retorno e exames solicitados', () => {
      const conduct: ClinicalConduct = {
        id: 'cond-1',
        encounterId: 'enc-fase24-2',
        treatmentPlan: 'Prescrição de colírio lubrificante à base de hialuronato de sódio 0,15% 1 gota 4x ao dia',
        orientations: 'Regra ergonômica 20-20-20, higiene da borda palpebral com compressas mornas',
        referrals: 'Encaminhamento para especialista em Córnea e Superfície Ocular',
        returnWeeks: 4,
        returnInstructions: 'Retorno em 30 dias para avaliar resposta terapêutica ao colírio lubrificante',
        returnTargetDate: '2026-10-26',
        requestedExams: ['Teste de Schirmer I e II', 'Tempo de Ruptura do Filme Lacrimal (BUT)', 'Paquimetria Ultrassônica'],
        notes: 'Paciente esclarecido sobre a importância da adesão ao colírio sem conservantes'
      };

      const encounter: ClinicalEncounter = {
        id: 'enc-fase24-2',
        patientId: 'pat-101',
        date: new Date().toISOString(),
        status: 'in_progress',
        conduct: conduct.treatmentPlan,
        structuredConduct: conduct,
        returnInstructions: conduct.returnInstructions,
        syncStatus: 'synced',
        updatedAt: new Date().toISOString()
      };

      offlineDb.saveEncounter(encounter, 'ivs');

      const saved = offlineDb.getEncounters('ivs').find(e => e.id === 'enc-fase24-2');
      expect(saved?.structuredConduct).toBeDefined();
      expect(saved?.structuredConduct?.treatmentPlan).toContain('hialuronato');
      expect(saved?.structuredConduct?.orientations).toContain('Regra ergonômica 20-20-20');
      expect(saved?.structuredConduct?.referrals).toContain('Córnea e Superfície Ocular');
      expect(saved?.structuredConduct?.returnWeeks).toBe(4);
      expect(saved?.structuredConduct?.requestedExams).toEqual([
        'Teste de Schirmer I e II',
        'Tempo de Ruptura do Filme Lacrimal (BUT)',
        'Paquimetria Ultrassônica'
      ]);
      expect(saved?.structuredConduct?.notes).toContain('adesão ao colírio');
    });
  });

  // 3. EVOLUÇÃO E VERSIONAMENTO
  describe('Evolução Clínica e Versionamento Auditável', () => {
    it('deve registrar evolução vinculada ao encounter preservando data, usuário, clínica e versionamento', () => {
      const evo1: ClinicalEvolution = {
        id: 'evo-1',
        encounterId: 'enc-fase24-3',
        patientId: 'pat-102',
        clinicId: 'ivs',
        professionalId: 'prof-doc-1',
        professionalName: 'Dr. Rudson Meirelles',
        timestamp: '2026-09-26T10:00:00.000Z',
        text: 'Paciente comparece queixando-se de astenopia e ardência ocular ao fim do dia.',
        type: 'evolution',
        version: 1,
        createdAt: '2026-09-26T10:00:00.000Z',
        createdBy: 'Dr. Rudson Meirelles'
      };

      offlineDb.saveEvolution(evo1, 'ivs');

      const list1 = offlineDb.getEvolutionsByEncounter('enc-fase24-3', 'ivs');
      expect(list1).toHaveLength(1);
      expect(list1[0].version).toBe(1);
      expect(list1[0].professionalName).toBe('Dr. Rudson Meirelles');
      expect(list1[0].clinicId).toBe('ivs');

      // Nova evolução no mesmo encontro
      const evo2: ClinicalEvolution = {
        id: 'evo-2',
        encounterId: 'enc-fase24-3',
        patientId: 'pat-102',
        clinicId: 'ivs',
        professionalId: 'prof-doc-1',
        professionalName: 'Dr. Rudson Meirelles',
        timestamp: '2026-09-26T10:30:00.000Z',
        text: 'Instilado fluoresceína sódica 1%. BUT medido em 7 segundos em ambos os olhos.',
        type: 'evolution',
        version: 1,
        createdAt: '2026-09-26T10:30:00.000Z',
        createdBy: 'Dr. Rudson Meirelles'
      };

      offlineDb.saveEvolution(evo2, 'ivs');

      const list2 = offlineDb.getEvolutionsByEncounter('enc-fase24-3', 'ivs');
      expect(list2).toHaveLength(2);
      expect(list2[0].id).toBe('evo-2'); // ordenado decrescente
      expect(list2[1].id).toBe('evo-1');
    });

    it('ao editar evolução existente, deve incrementar a versão sem sobrescrever silenciosamente', () => {
      const original: ClinicalEvolution = {
        id: 'evo-version-test',
        encounterId: 'enc-fase24-3',
        patientId: 'pat-102',
        clinicId: 'ivs',
        professionalId: 'prof-doc-1',
        professionalName: 'Dr. Rudson Meirelles',
        timestamp: '2026-09-26T11:00:00.000Z',
        text: 'Biomicroscopia: Córnea transparente, câmara anterior profunda.',
        type: 'evolution',
        version: 1,
        createdAt: '2026-09-26T11:00:00.000Z',
        createdBy: 'Dr. Rudson Meirelles'
      };

      offlineDb.saveEvolution(original, 'ivs');
      expect(offlineDb.getEvolutions('ivs').find(e => e.id === original.id)?.version).toBe(1);

      // Atualização da mesma evolução
      const updated: ClinicalEvolution = {
        ...original,
        text: 'Biomicroscopia: Córnea transparente, discreta blefarite meibomiana em margens ciliares.'
      };

      offlineDb.saveEvolution(updated, 'ivs');
      const reloaded = offlineDb.getEvolutions('ivs').find(e => e.id === original.id);
      expect(reloaded?.version).toBe(2);
      expect(reloaded?.text).toContain('blefarite meibomiana');
    });
  });

  // 4. IMUTABILIDADE E ADENDO APÓS ENCERRAMENTO
  describe('Imutabilidade e Adendo Auditável', () => {
    it('não permite reverter status de encontro concluído de volta para in_progress silenciosamente', () => {
      const completedEnc: ClinicalEncounter = {
        id: 'enc-closed-1',
        patientId: 'pat-closed-1',
        date: '2026-09-20T10:00:00.000Z',
        status: 'completed',
        conduct: 'Conduta final homologada e prescrição entregue ao paciente',
        syncStatus: 'synced',
        updatedAt: '2026-09-20T10:30:00.000Z'
      };

      offlineDb.saveEncounter(completedEnc, 'ivs');

      // Tentativa de regressão / alteração indevida de status
      const tamperingAttempt: ClinicalEncounter = {
        ...completedEnc,
        status: 'in_progress',
        conduct: 'Tentativa de alteração silenciosa da conduta'
      };

      offlineDb.saveEncounter(tamperingAttempt, 'ivs');

      const reloaded = offlineDb.getEncounters('ivs').find(e => e.id === 'enc-closed-1');
      expect(reloaded?.status).toBe('completed');
      expect(reloaded?.conduct).toBe('Conduta final homologada e prescrição entregue ao paciente');
    });

    it('deve registrar adendo com createAmendment preservando conteúdo anterior e motivo da retificação', () => {
      const evoOriginal: ClinicalEvolution = {
        id: 'evo-to-amend',
        encounterId: 'enc-amend-1',
        patientId: 'pat-amend-1',
        clinicId: 'ivs',
        professionalId: 'prof-doc-1',
        professionalName: 'Dr. Rudson Meirelles',
        timestamp: '2026-09-26T08:00:00.000Z',
        text: 'Acuidade visual corrigida OD: 20/40.',
        type: 'evolution',
        version: 1,
        createdAt: '2026-09-26T08:00:00.000Z',
        createdBy: 'Dr. Rudson Meirelles'
      };

      offlineDb.saveEvolution(evoOriginal, 'ivs');

      // Cria adendo retificador
      const amendment = offlineDb.createAmendment({
        originalEvolutionId: 'evo-to-amend',
        encounterId: 'enc-amend-1',
        patientId: 'pat-amend-1',
        newText: 'Retificação: Acuidade visual com melhor correção óptica OD é 20/25 após refração refinada.',
        reason: 'Erro de digitação no registro original da AV',
        professionalId: 'prof-doc-1',
        professionalName: 'Dr. Rudson Meirelles',
        clinicId: 'ivs'
      });

      expect(amendment).toBeDefined();
      expect(amendment.type).toBe('amendment');
      expect(amendment.version).toBe(2);
      expect(amendment.supersedesId).toBe('evo-to-amend');
      expect(amendment.amendmentReason).toBe('Erro de digitação no registro original da AV');
      expect(amendment.previousContent).toBe('Acuidade visual corrigida OD: 20/40.');

      // Ambos os registros permanecem no histórico
      const allEvos = offlineDb.getEvolutionsByEncounter('enc-amend-1', 'ivs');
      expect(allEvos).toHaveLength(2);
      expect(allEvos.some(e => e.id === 'evo-to-amend')).toBe(true);
      expect(allEvos.some(e => e.id === amendment.id)).toBe(true);
    });
  });

  // 5. HISTÓRICO LONGITUDINAL MULTIUNIDADE E ISOLAMENTO
  describe('Isolamento Multiunidade e Histórico Longitudinal', () => {
    it('deve manter isolamento estrito entre clínicas preservando clínica de origem', () => {
      const evoIvs: ClinicalEvolution = {
        id: 'evo-ivs',
        encounterId: 'enc-ivs',
        patientId: 'pat-multi',
        clinicId: 'ivs',
        professionalId: 'dr-meirelles',
        professionalName: 'Dr. Rudson Meirelles',
        timestamp: '2026-09-20T10:00:00.000Z',
        text: 'Atendimento na unidade IVS',
        type: 'evolution',
        version: 1,
        createdAt: '2026-09-20T10:00:00.000Z',
        createdBy: 'Dr. Rudson Meirelles'
      };

      const evoMegastar: ClinicalEvolution = {
        id: 'evo-ms',
        encounterId: 'enc-ms',
        patientId: 'pat-multi',
        clinicId: 'megastar',
        professionalId: 'dr-meirelles',
        professionalName: 'Dr. Rudson Meirelles',
        timestamp: '2026-09-22T10:00:00.000Z',
        text: 'Atendimento na unidade Mega Star PY',
        type: 'evolution',
        version: 1,
        createdAt: '2026-09-22T10:00:00.000Z',
        createdBy: 'Dr. Rudson Meirelles'
      };

      offlineDb.saveEvolution(evoIvs, 'ivs');
      offlineDb.saveEvolution(evoMegastar, 'megastar');

      // Consultando IVS
      const ivsList = offlineDb.getEvolutions('ivs');
      expect(ivsList.map(e => e.id)).toContain('evo-ivs');
      expect(ivsList.map(e => e.id)).not.toContain('evo-ms');

      // Consultando Mega Star
      const msList = offlineDb.getEvolutions('megastar');
      expect(msList.map(e => e.id)).toContain('evo-ms');
      expect(msList.map(e => e.id)).not.toContain('evo-ivs');
    });
  });
});
