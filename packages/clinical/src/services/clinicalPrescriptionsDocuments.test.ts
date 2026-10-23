import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineDb } from './offlineDb';
import { Prescription, ClinicalDocumentRecord, Patient, ClinicalEncounter } from '@optotipo/shared';

describe('OPTOMED — FASE 26: Prescrições e Documentos Clínicos', () => {
  const clinicId = 'clinic-fase26-test';
  const patientId = 'patient-fase26-1';
  const encounterId = 'enc-fase26-101';
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    (global as any).localStorage = localStorageMock;
    offlineDb.setActiveClinicId(clinicId);
  });

  describe('1. Prescrição Óptica (Derivação Consciente e Imutabilidade)', () => {
    it('deve salvar e recuperar prescrição óptica com todos os campos estruturados', () => {
      const rx: Prescription = {
        id: 'rx-test-1',
        encounterId,
        patientId,
        patientName: 'Carlos Silveira',
        clinicId,
        clinicName: 'OptoMed Central',
        date: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        od: {
          sphere: -2.50,
          cylinder: -1.00,
          axis: 180,
          addition: 2.00,
          prism: 1.5,
          prismBase: 'UP',
          visualAcuity: '20/20'
        },
        oe: {
          sphere: -2.25,
          cylinder: -0.75,
          axis: 175,
          addition: 2.00,
          visualAcuity: '20/20'
        },
        addition: 2.00,
        pdDistanceMm: 63,
        lensType: 'multifocal',
        material: 'resina',
        treatments: ['Antirreflexo Digital', 'Filtro Luz Azul (BlueCut)'],
        observations: 'Adaptação progressiva com corredor ampliado.',
        returnInstructions: 'Retorno em 1 ano para controle visual de rotina.',
        examinerName: 'Dr. Rudson Meirelles',
        examinerRegistry: 'CRM/CROO 123456',
        version: 1,
        isIssued: false
      };

      const saved = offlineDb.savePrescription(rx, clinicId);
      expect(saved.id).toBe('rx-test-1');
      expect(saved.version).toBe(1);

      const list = offlineDb.getPrescriptions(clinicId);
      expect(list.length).toBe(1);
      expect(list[0].od.sphere).toBe(-2.50);
      expect(list[0].od.prism).toBe(1.5);
      expect(list[0].od.prismBase).toBe('UP');
      expect(list[0].oe.axis).toBe(175);
    });

    it('NÃO altera silenciosamente uma prescrição já emitida; gera nova versão vinculada por supersedesId', () => {
      const issuedRx: Prescription = {
        id: 'rx-issued-v1',
        encounterId,
        patientId,
        patientName: 'Maria Silva',
        clinicId,
        date: '2026-09-20T10:00:00.000Z',
        expirationDate: '2027-09-20T10:00:00.000Z',
        od: { sphere: -1.00, cylinder: 0, axis: 0 },
        oe: { sphere: -1.00, cylinder: 0, axis: 0 },
        version: 1,
        isIssued: true // Formalmente emitida e entregue ao paciente
      };

      offlineDb.savePrescription(issuedRx, clinicId);

      // Tentativa de modificar a receita com o mesmo ID
      const modifiedAttempt: Prescription = {
        ...issuedRx,
        od: { sphere: -1.50, cylinder: -0.50, axis: 90 } // Mudança refrativa subsequente
      };

      const result = offlineDb.savePrescription(modifiedAttempt, clinicId);

      // Deve criar nova versão sem sobrescrever a v1
      expect(result.id).not.toBe('rx-issued-v1');
      expect(result.version).toBe(2);
      expect(result.supersedesId).toBe('rx-issued-v1');
      expect(result.isIssued).toBe(true);

      const allRxs = offlineDb.getPrescriptionsByEncounter(encounterId, clinicId);
      expect(allRxs.length).toBe(2);

      const original = allRxs.find(r => r.id === 'rx-issued-v1');
      expect(original).toBeDefined();
      expect(original?.od.sphere).toBe(-1.00); // Intacta!
      expect(original?.version).toBe(1);

      const updated = allRxs.find(r => r.supersedesId === 'rx-issued-v1');
      expect(updated).toBeDefined();
      expect(updated?.od.sphere).toBe(-1.50);
      expect(updated?.version).toBe(2);
    });

    it('permite atualizar rascunho de prescrição que ainda NÃO foi formalmente emitida sem incrementar versão desnecessariamente', () => {
      const draftRx: Prescription = {
        id: 'rx-draft-1',
        encounterId,
        patientId,
        patientName: 'Joao Draft',
        clinicId,
        date: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        od: { sphere: +0.75, cylinder: 0, axis: 0 },
        oe: { sphere: +0.75, cylinder: 0, axis: 0 },
        version: 1,
        isIssued: false // Ainda rascunho em consulta
      };

      offlineDb.savePrescription(draftRx, clinicId);

      const updatedDraft: Prescription = {
        ...draftRx,
        od: { sphere: +1.00, cylinder: -0.25, axis: 180 }
      };

      const result = offlineDb.savePrescription(updatedDraft, clinicId);
      expect(result.id).toBe('rx-draft-1');
      expect(result.version).toBe(1);

      const list = offlineDb.getPrescriptionsByEncounter(encounterId, clinicId);
      expect(list.length).toBe(1);
      expect(list[0].od.sphere).toBe(+1.00);
    });
  });

  describe('2. Auditoria e Emissão de Documentos Clínicos', () => {
    it('audita e armazena todos os tipos requeridos de documentos com metadados completos', () => {
      const docTypes: Array<ClinicalDocumentRecord['type']> = [
        'optical_prescription',
        'medical_prescription',
        'exam_request',
        'referral_letter',
        'medical_certificate',
        'clinical_report'
      ];

      docTypes.forEach((type, idx) => {
        const doc: ClinicalDocumentRecord = {
          id: `doc-type-${type}-${idx}`,
          encounterId,
          patientId,
          clinicId,
          type,
          title: `Documento de Teste: ${type}`,
          content: `Conteúdo detalhado e formatado do documento ${type}`,
          structuredPayload: { testPayload: true, idx },
          professionalId: 'dr-meirelles',
          professionalName: 'Dr. Rudson Meirelles',
          professionalRegistry: 'CRM/CROO 123456',
          issuedAt: new Date().toISOString(),
          version: 1,
          isSigned: true
        };

        const saved = offlineDb.saveClinicalDocument(doc, clinicId);
        expect(saved.id).toBe(`doc-type-${type}-${idx}`);
        expect(saved.type).toBe(type);
        expect(saved.patientId).toBe(patientId);
        expect(saved.encounterId).toBe(encounterId);
        expect(saved.professionalName).toBe('Dr. Rudson Meirelles');
        expect(saved.clinicId).toBe(clinicId);
        expect(saved.version).toBe(1);
      });

      const docs = offlineDb.getClinicalDocumentsByEncounter(encounterId, clinicId);
      expect(docs.length).toBe(6);
    });

    it('isola os documentos por unidade/clínica garantindo integridade multiunidade', () => {
      const docClinicA: ClinicalDocumentRecord = {
        id: 'doc-clinic-A',
        encounterId: 'enc-A',
        patientId,
        clinicId: 'clinic-A',
        type: 'medical_certificate',
        title: 'Atestado Clínica A',
        content: 'Conteúdo A',
        professionalId: 'dr-1',
        professionalName: 'Dr. A',
        issuedAt: new Date().toISOString(),
        version: 1
      };

      const docClinicB: ClinicalDocumentRecord = {
        id: 'doc-clinic-B',
        encounterId: 'enc-B',
        patientId,
        clinicId: 'clinic-B',
        type: 'referral_letter',
        title: 'Encaminhamento Clínica B',
        content: 'Conteúdo B',
        professionalId: 'dr-2',
        professionalName: 'Dr. B',
        issuedAt: new Date().toISOString(),
        version: 1
      };

      offlineDb.saveClinicalDocument(docClinicA, 'clinic-A');
      offlineDb.saveClinicalDocument(docClinicB, 'clinic-B');

      const docsA = offlineDb.getClinicalDocuments('clinic-A');
      const docsB = offlineDb.getClinicalDocuments('clinic-B');

      expect(docsA.length).toBe(1);
      expect(docsA[0].id).toBe('doc-clinic-A');

      expect(docsB.length).toBe(1);
      expect(docsB[0].id).toBe('doc-clinic-B');
    });
  });

  describe('3. Privacidade e TV do Paciente', () => {
    it('confirma que os documentos e prescrições clínicas não são enviados para exibição pública na TV', () => {
      // Os documentos são armazenados em canais e chaves segregados
      const prescriptionKey = offlineDb.getKey('prescriptions', clinicId);
      const docsKey = offlineDb.getKey('clinical_documents', clinicId);

      expect(prescriptionKey).toContain('prescriptions');
      expect(docsKey).toContain('clinical_documents');

      // Verifica que nenhuma chave de documentos colide com canal de comunicação da TV
      expect(prescriptionKey).not.toContain('tv');
      expect(docsKey).not.toContain('tv');
    });
  });

  describe('4. Integridade da Emissão e Impressão do Receituário', () => {
    it('garante que a prescrição emitida preserva integridade óptica e marcação isIssued ao ser impressa', () => {
      const rx: Prescription = {
        id: 'rx-print-test-1',
        encounterId: 'enc-print-1',
        patientId,
        patientName: 'Paciente Teste Sintético',
        clinicId,
        clinicName: 'Clínica Oftalmológica OptoMed',
        date: '2026-10-16T12:00:00.000Z',
        od: { sphere: -1.75, cylinder: -0.50, axis: 90, addition: 1.50, visualAcuity: '20/20' },
        oe: { sphere: -1.50, cylinder: -0.25, axis: 85, addition: 1.50, visualAcuity: '20/20' },
        addition: 1.50,
        pdDistanceMm: 62,
        lensType: 'multifocal',
        observations: 'Uso contínuo para longe e perto',
        examinerName: 'Dr. Rudson Meirelles',
        examinerRegistry: 'CRM/CROO 123456',
        version: 1,
        isIssued: false
      };

      offlineDb.savePrescription(rx, clinicId);
      
      // Simula a confirmação de emissão disparada pelo UnifiedPrintCenterModal (handlePrint)
      const issuedRx = { ...rx, isIssued: true };
      offlineDb.savePrescription(issuedRx, clinicId);

      const recovered = offlineDb.getPrescriptions(clinicId).find(p => p.id === 'rx-print-test-1');
      expect(recovered).toBeDefined();
      expect(recovered?.isIssued).toBe(true);
      expect(recovered?.od.sphere).toBe(-1.75);
      expect(recovered?.oe.axis).toBe(85);
      expect(recovered?.observations).toContain('Uso contínuo');
    });
  });
});
