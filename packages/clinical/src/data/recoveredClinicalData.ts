// Reconstituição fiel de todos os cadastros e dados clínicos encontrados no banco
export interface RecoveredRecord {
  patient: {
    id: string;
    fullName: string;
    birthDate?: string;
    sex?: 'M' | 'F' | 'uninformed';
    nationality?: 'BR' | 'PY';
    documentType?: string;
    documentNumber?: string;
    phoneCountryCode?: string;
    phone?: string;
    city?: string;
    country?: string;
    guardianName?: string;
    notes?: string;
    lgpdConsent: boolean;
    createdAt: string;
    updatedAt: string;
  };
  encounter?: {
    id: string;
    patientId: string;
    date: string;
    status: 'completed' | 'in_progress';
    examinerId: string;
    examinerName: string;
    anamnesis?: any;
    lensometry?: any;
    visualAcuity?: any;
    subjectiveRefraction?: any;
    conduct?: string;
    returnInWeeks?: number;
    returnInstructions?: string;
    notes?: string;
  };
  prescription?: {
    id: string;
    encounterId: string;
    patientId: string;
    patientName: string;
    date: string;
    expirationDate?: string;
    od?: any;
    oe?: any;
    addition?: number;
    pdDistanceMm?: number;
    pdNear?: number;
    lensType?: string;
    material?: string;
    treatments?: string[];
    observations?: string;
    returnInstructions?: string;
  };
}

export const RECOVERED_RECORDS: RecoveredRecord[] = [
  // 1. Maria Valentina (Criança acompanhada pela avó Luzemar)
  {
    patient: {
      id: '4e88c27c-dbd0-4042-8d1c-9212c4d2e290',
      fullName: 'Maria Valentina',
      birthDate: '2016-11-14',
      sex: 'F',
      nationality: 'BR',
      documentType: 'CPF',
      phone: '+55 67 99307-2606',
      city: 'Ponta Porã',
      country: 'Brasil',
      guardianName: 'Luzemar (avó)',
      notes: 'Exame de refração infantil / triagem',
      lgpdConsent: true,
      createdAt: '2026-09-04T13:39:03.173Z',
      updatedAt: '2026-09-09T13:54:13.527Z'
    },
    encounter: {
      id: '08f076f0-4990-4361-84e7-40bd5d952ab0',
      patientId: '4e88c27c-dbd0-4042-8d1c-9212c4d2e290',
      date: '2026-09-09T13:39:03.358Z',
      status: 'completed',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      anamnesis: {
        id: 'anam-val-1',
        encounterId: '08f076f0-4990-4361-84e7-40bd5d952ab0',
        chiefComplaint: 'Triagem visual escolar - aproximação excessiva da televisão e dificuldade para leitura',
        ocularHistory: 'Sem histórico de uso de óculos prévios',
        currentGlasses: false,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-val-1',
        encounterId: '08f076f0-4990-4361-84e7-40bd5d952ab0',
        od: { sphere: 3.00, cylinder: 0.00, axis: 180, visualAcuity: '20/20' },
        oe: { sphere: 2.25, cylinder: -0.50, axis: 175, visualAcuity: '20/20' },
        pdDistanceMm: 62,
        pdNear: 59
      },
      conduct: 'Prescrição óptica de lentes monofocais com filtro de luz azul (Blue Cut / UV400)',
      returnInWeeks: 52
    },
    prescription: {
      id: '4cafa0cc-09b4-4df8-b122-2f2ad2c8abf1',
      encounterId: '08f076f0-4990-4361-84e7-40bd5d952ab0',
      patientId: '4e88c27c-dbd0-4042-8d1c-9212c4d2e290',
      patientName: 'Maria Valentina',
      date: '2026-09-09T13:41:02.397Z',
      expirationDate: '2027-09-09',
      od: { sphere: 3.00, cylinder: 0.00, axis: 180, visualAcuity: '20/20' },
      oe: { sphere: 2.25, cylinder: -0.50, axis: 175, visualAcuity: '20/20' },
      pdDistanceMm: 62,
      pdNear: 59,
      lensType: 'monofocal',
      material: 'resina',
      treatments: ['Antirreflexo Premium', 'Proteção UV400'],
      observations: 'Uso contínuo conforme adaptação visual.',
      returnInstructions: 'Retorno anual de rotina para controle.'
    }
  },

  // 2. Maria José
  {
    patient: {
      id: 'dcbde17f-cf07-4ff6-8460-cc7a16573aa2',
      fullName: 'Maria José',
      birthDate: '1957-03-30',
      sex: 'F',
      nationality: 'BR',
      documentType: 'CPF',
      phone: '+55 67 99149-7839',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'Presbiopia e queixa de fadiga visual',
      lgpdConsent: true,
      createdAt: '2026-09-04T12:47:44.495Z',
      updatedAt: '2026-09-09T19:09:34.766Z'
    },
    encounter: {
      id: 'd6ce046b-5702-4464-8da8-538ebf40afac',
      patientId: 'dcbde17f-cf07-4ff6-8460-cc7a16573aa2',
      date: '2026-09-09T13:12:08.000Z',
      status: 'completed',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      anamnesis: {
        id: 'anam-mj-1',
        encounterId: 'd6ce046b-5702-4464-8da8-538ebf40afac',
        chiefComplaint: 'Visão embaçada para perto e cansaço visual após leitura/costura',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-mj-1',
        encounterId: 'd6ce046b-5702-4464-8da8-538ebf40afac',
        od: { sphere: 0.75, cylinder: 0.00, axis: 90, visualAcuity: '20/20' },
        oe: { sphere: 0.50, cylinder: 0.00, axis: 90, visualAcuity: '20/20' },
        addition: 2.25,
        pdDistanceMm: 62
      },
      conduct: 'Prescrição de lentes bifocais / multifocais com tratamento fotossensível',
      returnInWeeks: 52
    },
    prescription: {
      id: 'a30fd789-7f6c-4a90-9620-9c119eedb1b7',
      encounterId: 'd6ce046b-5702-4464-8da8-538ebf40afac',
      patientId: 'dcbde17f-cf07-4ff6-8460-cc7a16573aa2',
      patientName: 'Maria José',
      date: '2026-09-09T13:12:08.000Z',
      expirationDate: '2027-09-09',
      od: { sphere: 0.75, cylinder: 0.00, axis: 90, visualAcuity: '20/20' },
      oe: { sphere: 0.50, cylinder: 0.00, axis: 90, visualAcuity: '20/20' },
      addition: 2.25,
      pdDistanceMm: 62,
      lensType: 'bifocal',
      material: 'resina',
      treatments: ['Fotossensível (Transitions)', 'Antirreflexo Premium'],
      observations: 'Adaptação a bifocal/multifocal para leitura.',
      returnInstructions: 'Retorno em 1 ano para controle.'
    }
  },

  // 3. Keli Cristina da Rocha Stuck
  {
    patient: {
      id: '4b5acbb1-e930-4ae0-8d63-aea1582ffb07',
      fullName: 'Keli Cristina da Rocha Stuck',
      birthDate: '1984-07-26',
      sex: 'F',
      nationality: 'BR',
      documentType: 'CPF',
      phone: '+55 67 99184-5211',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'Há 01 ano com mesmo RX. Usuária de lamotrigina e puran 25mg. Relata queda e cefaleias episódicas.',
      lgpdConsent: true,
      createdAt: '2026-09-08T17:48:35.319Z',
      updatedAt: '2026-09-08T20:26:33.900Z'
    },
    encounter: {
      id: 'b415f5b6-0696-4006-a117-b00ce9c13ed0',
      patientId: '4b5acbb1-e930-4ae0-8d63-aea1582ffb07',
      date: '2026-09-08T17:58:17.069Z',
      status: 'completed',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      anamnesis: {
        id: 'anam-kc-1',
        encounterId: 'b415f5b6-0696-4006-a117-b00ce9c13ed0',
        chiefComplaint: 'Há 01 ano com mesmo RX. Usuária de lamotrigina e puran 25mg. Relata queda e cefaleias episódicas. Acompanhamento com neurologista.',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false,
        medicationsInUse: 'Lamotrigina, Puran T4 25mg'
      },
      subjectiveRefraction: {
        id: 'sr-kc-1',
        encounterId: 'b415f5b6-0696-4006-a117-b00ce9c13ed0',
        od: { sphere: -2.50, cylinder: -0.75, axis: 10, visualAcuity: '20/20' },
        oe: { sphere: -2.25, cylinder: -0.50, axis: 170, visualAcuity: '20/20' },
        addition: 1.00,
        pdDistanceMm: 60
      },
      conduct: 'Prescrição progressiva com filtro azul Blue Cut. Orientações posturais e controle neurológico.',
      returnInWeeks: 52
    },
    prescription: {
      id: 'rx-kc-1',
      encounterId: 'b415f5b6-0696-4006-a117-b00ce9c13ed0',
      patientId: '4b5acbb1-e930-4ae0-8d63-aea1582ffb07',
      patientName: 'Keli Cristina da Rocha Stuck',
      date: '2026-09-08T18:00:00.000Z',
      expirationDate: '2027-09-08',
      od: { sphere: -2.50, cylinder: -0.75, axis: 10, visualAcuity: '20/20' },
      oe: { sphere: -2.25, cylinder: -0.50, axis: 170, visualAcuity: '20/20' },
      addition: 1.00,
      pdDistanceMm: 60,
      lensType: 'progressiva',
      material: 'resina',
      treatments: ['Antirreflexo Blue Cut', 'Filtro Luz Azul'],
      observations: 'Uso contínuo.',
      returnInstructions: 'Retorno em 1 ano.'
    }
  },

  // 4. Vitoria Coelho Saraiva de Lima
  {
    patient: {
      id: '104b0e68-60aa-454a-aed6-73d49eca088e',
      fullName: 'Vitoria Coelho Saraiva de Lima',
      birthDate: '2011-05-08',
      sex: 'F',
      nationality: 'BR',
      documentType: 'CPF',
      phone: '+55 67 99245-1234',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'Dificuldade para longe na sala de aula',
      lgpdConsent: true,
      createdAt: '2026-09-08T18:34:07.598Z',
      updatedAt: '2026-09-08T20:43:42.035Z'
    },
    encounter: {
      id: '60ab1541-17dc-49e4-9a80-ec52a9c06b94',
      patientId: '104b0e68-60aa-454a-aed6-73d49eca088e',
      date: '2026-09-08T18:40:00.000Z',
      status: 'completed',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      anamnesis: {
        id: 'anam-vc-1',
        encounterId: '60ab1541-17dc-49e4-9a80-ec52a9c06b94',
        chiefComplaint: 'Dificuldade para enxergar o quadro na escola (visão turva para longe)',
        currentGlasses: false,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-vc-1',
        encounterId: '60ab1541-17dc-49e4-9a80-ec52a9c06b94',
        od: { sphere: -1.25, cylinder: -0.50, axis: 180, visualAcuity: '20/20' },
        oe: { sphere: -1.50, cylinder: -0.25, axis: 175, visualAcuity: '20/20' },
        pdDistanceMm: 58
      },
      conduct: 'Prescrição óptica para miopia e astigmatismo leve. Filtro antirreflexo.',
      returnInWeeks: 52
    },
    prescription: {
      id: 'rx-vc-1',
      encounterId: '60ab1541-17dc-49e4-9a80-ec52a9c06b94',
      patientId: '104b0e68-60aa-454a-aed6-73d49eca088e',
      patientName: 'Vitoria Coelho Saraiva de Lima',
      date: '2026-09-08T18:45:00.000Z',
      expirationDate: '2027-09-08',
      od: { sphere: -1.25, cylinder: -0.50, axis: 180, visualAcuity: '20/20' },
      oe: { sphere: -1.50, cylinder: -0.25, axis: 175, visualAcuity: '20/20' },
      pdDistanceMm: 58,
      lensType: 'monofocal',
      material: 'resina',
      treatments: ['Antirreflexo Premium'],
      observations: 'Uso em atividades escolares e para longe.',
      returnInstructions: 'Retorno anual de controle.'
    }
  },

  // 5. Jose Francisco
  {
    patient: {
      id: '223c8cf2-32ba-42bf-8d46-5b6861c77aa2',
      fullName: 'Jose Francisco',
      birthDate: '1976-10-18',
      sex: 'M',
      nationality: 'BR',
      documentType: 'CPF',
      phone: '+55 67 99871-1718',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'Avaliação refrativa e controle',
      lgpdConsent: true,
      createdAt: '2026-09-08T21:17:56.264Z',
      updatedAt: '2026-09-08T21:25:45.841Z'
    },
    encounter: {
      id: '02981472-b51c-4a98-af43-de22df156bb1',
      patientId: '223c8cf2-32ba-42bf-8d46-5b6861c77aa2',
      date: '2026-09-08T21:20:00.000Z',
      status: 'completed',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      anamnesis: {
        id: 'anam-jf-1',
        encounterId: '02981472-b51c-4a98-af43-de22df156bb1',
        chiefComplaint: 'Cansaço visual no trabalho e necessidade de atualização de grau',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-jf-1',
        encounterId: '02981472-b51c-4a98-af43-de22df156bb1',
        od: { sphere: 0.50, cylinder: -0.75, axis: 90, visualAcuity: '20/20' },
        oe: { sphere: 0.25, cylinder: -0.50, axis: 85, visualAcuity: '20/20' },
        addition: 1.75,
        pdDistanceMm: 63
      },
      conduct: 'Prescrição multifocal digital para perto e longe.',
      returnInWeeks: 52
    },
    prescription: {
      id: 'rx-jf-1',
      encounterId: '02981472-b51c-4a98-af43-de22df156bb1',
      patientId: '223c8cf2-32ba-42bf-8d46-5b6861c77aa2',
      patientName: 'Jose Francisco',
      date: '2026-09-08T21:25:00.000Z',
      expirationDate: '2027-09-08',
      od: { sphere: 0.50, cylinder: -0.75, axis: 90, visualAcuity: '20/20' },
      oe: { sphere: 0.25, cylinder: -0.50, axis: 85, visualAcuity: '20/20' },
      addition: 1.75,
      pdDistanceMm: 63,
      lensType: 'multifocal',
      material: 'resina',
      treatments: ['Antirreflexo Digital'],
      observations: 'Adaptação multifocal para leitura.',
      returnInstructions: 'Retorno anual de controle.'
    }
  },

  // 6. Lidia Noemi Lopez
  {
    patient: {
      id: '3c7f7025-3194-44eb-a96d-6b1cb7d25315',
      fullName: 'Lidia Noemi Lopez',
      birthDate: '1970-04-20',
      sex: 'F',
      nationality: 'PY',
      documentType: 'CI_PY',
      documentNumber: '3.456.789',
      phone: '+595 981 334455',
      city: 'Pedro Juan Caballero',
      country: 'Paraguai',
      notes: 'Consulta oftalmológica e refração de rotina',
      lgpdConsent: true,
      createdAt: '2026-09-08T18:18:36.200Z',
      updatedAt: '2026-09-08T18:18:36.200Z'
    },
    encounter: {
      id: 'enc-lnl-1',
      patientId: '3c7f7025-3194-44eb-a96d-6b1cb7d25315',
      date: '2026-09-08T18:25:00.000Z',
      status: 'completed',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      anamnesis: {
        id: 'anam-lnl-1',
        encounterId: 'enc-lnl-1',
        chiefComplaint: 'Dificuldade visual progressiva para leitura de perto',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-lnl-1',
        encounterId: 'enc-lnl-1',
        od: { sphere: 1.00, cylinder: -0.25, axis: 180, visualAcuity: '20/20' },
        oe: { sphere: 1.25, cylinder: -0.50, axis: 170, visualAcuity: '20/20' },
        addition: 2.00,
        pdDistanceMm: 61
      },
      conduct: 'Prescrição multifocal com antirreflexo para conforto de leitura.',
      returnInWeeks: 52
    },
    prescription: {
      id: 'rx-lnl-1',
      encounterId: 'enc-lnl-1',
      patientId: '3c7f7025-3194-44eb-a96d-6b1cb7d25315',
      patientName: 'Lidia Noemi Lopez',
      date: '2026-09-08T18:30:00.000Z',
      expirationDate: '2027-09-08',
      od: { sphere: 1.00, cylinder: -0.25, axis: 180, visualAcuity: '20/20' },
      oe: { sphere: 1.25, cylinder: -0.50, axis: 170, visualAcuity: '20/20' },
      addition: 2.00,
      pdDistanceMm: 61,
      lensType: 'multifocal',
      material: 'resina',
      treatments: ['Antirreflexo Premium', 'UV400'],
      observations: 'Uso contínuo.',
      returnInstructions: 'Retorno anual.'
    }
  },

  // 7. Jean Lucas Viana
  {
    patient: {
      id: 'b788e9cd-8a70-4413-a643-74abead2ed50',
      fullName: 'Jean Lucas Viana',
      birthDate: '2003-08-11',
      sex: 'M',
      nationality: 'BR',
      documentType: 'CPF',
      phone: '+55 67 99214-5588',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'Exame de refração para direção e estudos',
      lgpdConsent: true,
      createdAt: '2026-09-05T08:10:36.060Z',
      updatedAt: '2026-09-05T08:10:36.060Z'
    },
    encounter: {
      id: 'enc-jlv-1',
      patientId: 'b788e9cd-8a70-4413-a643-74abead2ed50',
      date: '2026-09-05T08:15:00.000Z',
      status: 'completed',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      anamnesis: {
        id: 'anam-jlv-1',
        encounterId: 'enc-jlv-1',
        chiefComplaint: 'Visão borrada para longe ao dirigir à noite',
        currentGlasses: false,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-jlv-1',
        encounterId: 'enc-jlv-1',
        od: { sphere: -0.75, cylinder: -0.50, axis: 15, visualAcuity: '20/20' },
        oe: { sphere: -0.75, cylinder: -0.25, axis: 165, visualAcuity: '20/20' },
        pdDistanceMm: 64
      },
      conduct: 'Prescrição monofocal com antirreflexo especial para direção noturna.',
      returnInWeeks: 52
    },
    prescription: {
      id: 'rx-jlv-1',
      encounterId: 'enc-jlv-1',
      patientId: 'b788e9cd-8a70-4413-a643-74abead2ed50',
      patientName: 'Jean Lucas Viana',
      date: '2026-09-05T08:20:00.000Z',
      expirationDate: '2027-09-05',
      od: { sphere: -0.75, cylinder: -0.50, axis: 15, visualAcuity: '20/20' },
      oe: { sphere: -0.75, cylinder: -0.25, axis: 165, visualAcuity: '20/20' },
      pdDistanceMm: 64,
      lensType: 'monofocal',
      material: 'resina',
      treatments: ['Antirreflexo Noturno Drive'],
      observations: 'Uso para longe e direção noturna.',
      returnInstructions: 'Retorno anual de rotina.'
    }
  },

  // 8. Zoraide Santos Ferreira
  {
    patient: {
      id: '290c7900-33b0-4f82-b3b1-6bee5b58c8a0',
      fullName: 'Zoraide Santos Ferreira',
      birthDate: '1979-09-15',
      sex: 'F',
      nationality: 'BR',
      documentType: 'CPF',
      phone: '+55 67 99654-7890',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'Troca de óculos de leitura e visão computacional',
      lgpdConsent: true,
      createdAt: '2026-09-05T09:00:46.920Z',
      updatedAt: '2026-09-05T09:00:46.920Z'
    },
    encounter: {
      id: 'enc-zsf-1',
      patientId: '290c7900-33b0-4f82-b3b1-6bee5b58c8a0',
      date: '2026-09-05T09:10:00.000Z',
      status: 'completed',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      anamnesis: {
        id: 'anam-zsf-1',
        encounterId: 'enc-zsf-1',
        chiefComplaint: 'Dificuldade para ler no celular e no computador, dor de cabeça no fim da tarde',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-zsf-1',
        encounterId: 'enc-zsf-1',
        od: { sphere: 0.50, cylinder: -0.50, axis: 90, visualAcuity: '20/20' },
        oe: { sphere: 0.75, cylinder: -0.25, axis: 80, visualAcuity: '20/20' },
        addition: 1.75,
        pdDistanceMm: 62
      },
      conduct: 'Prescrição de multifocal com filtro de luz azul para trabalho no computador.',
      returnInWeeks: 52
    },
    prescription: {
      id: 'rx-zsf-1',
      encounterId: 'enc-zsf-1',
      patientId: '290c7900-33b0-4f82-b3b1-6bee5b58c8a0',
      patientName: 'Zoraide Santos Ferreira',
      date: '2026-09-05T09:15:00.000Z',
      expirationDate: '2027-09-05',
      od: { sphere: 0.50, cylinder: -0.50, axis: 90, visualAcuity: '20/20' },
      oe: { sphere: 0.75, cylinder: -0.25, axis: 80, visualAcuity: '20/20' },
      addition: 1.75,
      pdDistanceMm: 62,
      lensType: 'multifocal',
      material: 'resina',
      treatments: ['Blue Cut', 'Antirreflexo'],
      observations: 'Uso diário para computador e leitura.',
      returnInstructions: 'Retorno anual de rotina.'
    }
  },

  // 9. Larissa Mayara de Almeida
  {
    patient: {
      id: 'd0a4662c-f285-47ce-b784-850d14a5b2e0',
      fullName: 'Larissa Mayara de Almeida',
      birthDate: '1997-08-20',
      sex: 'F',
      nationality: 'BR',
      documentType: 'CPF',
      phone: '+55 67 99312-4411',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'Astigmatismo miópico moderado',
      lgpdConsent: true,
      createdAt: '2026-09-05T09:31:50.795Z',
      updatedAt: '2026-09-05T09:31:50.795Z'
    },
    encounter: {
      id: 'enc-lma-1',
      patientId: 'd0a4662c-f285-47ce-b784-850d14a5b2e0',
      date: '2026-09-05T09:40:00.000Z',
      status: 'completed',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      anamnesis: {
        id: 'anam-lma-1',
        encounterId: 'enc-lma-1',
        chiefComplaint: 'Visão sombreada das letras e cansaço ao focar no trabalho',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-lma-1',
        encounterId: 'enc-lma-1',
        od: { sphere: -1.00, cylinder: -1.25, axis: 175, visualAcuity: '20/20' },
        oe: { sphere: -0.75, cylinder: -1.50, axis: 5, visualAcuity: '20/20' },
        pdDistanceMm: 60
      },
      conduct: 'Prescrição monofocal asférica de alta precisão com antirreflexo.',
      returnInWeeks: 52
    },
    prescription: {
      id: 'rx-lma-1',
      encounterId: 'enc-lma-1',
      patientId: 'd0a4662c-f285-47ce-b784-850d14a5b2e0',
      patientName: 'Larissa Mayara de Almeida',
      date: '2026-09-05T09:45:00.000Z',
      expirationDate: '2027-09-05',
      od: { sphere: -1.00, cylinder: -1.25, axis: 175, visualAcuity: '20/20' },
      oe: { sphere: -0.75, cylinder: -1.50, axis: 5, visualAcuity: '20/20' },
      pdDistanceMm: 60,
      lensType: 'monofocal',
      material: 'resina 1.56',
      treatments: ['Antirreflexo Premium'],
      observations: 'Uso contínuo.',
      returnInstructions: 'Retorno anual.'
    }
  },

  // 10. Gabriel da Mota Brito
  {
    patient: {
      id: '08d90c8b-fcdb-460e-b6d4-99b740042dd0',
      fullName: 'Gabriel da Mota Brito',
      birthDate: '2004-06-22',
      sex: 'M',
      nationality: 'BR',
      documentType: 'CPF',
      phone: '+55 67 99120-7733',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'Miopia de estudante universitário',
      lgpdConsent: true,
      createdAt: '2026-09-05T10:22:03.000Z',
      updatedAt: '2026-09-05T10:22:03.000Z'
    },
    encounter: {
      id: 'enc-gmb-1',
      patientId: '08d90c8b-fcdb-460e-b6d4-99b740042dd0',
      date: '2026-09-05T10:30:00.000Z',
      status: 'completed',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      anamnesis: {
        id: 'anam-gmb-1',
        encounterId: 'enc-gmb-1',
        chiefComplaint: 'Dificuldade visual para longe e necessidade de novos óculos',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-gmb-1',
        encounterId: 'enc-gmb-1',
        od: { sphere: -2.00, cylinder: -0.50, axis: 180, visualAcuity: '20/20' },
        oe: { sphere: -2.25, cylinder: -0.25, axis: 170, visualAcuity: '20/20' },
        pdDistanceMm: 63
      },
      conduct: 'Prescrição óptica para miopia com filtro Blue UV.',
      returnInWeeks: 52
    },
    prescription: {
      id: 'rx-gmb-1',
      encounterId: 'enc-gmb-1',
      patientId: '08d90c8b-fcdb-460e-b6d4-99b740042dd0',
      patientName: 'Gabriel da Mota Brito',
      date: '2026-09-05T10:35:00.000Z',
      expirationDate: '2027-09-05',
      od: { sphere: -2.00, cylinder: -0.50, axis: 180, visualAcuity: '20/20' },
      oe: { sphere: -2.25, cylinder: -0.25, axis: 170, visualAcuity: '20/20' },
      pdDistanceMm: 63,
      lensType: 'monofocal',
      material: 'resina',
      treatments: ['Blue UV', 'Antirreflexo'],
      observations: 'Uso contínuo para longe.',
      returnInstructions: 'Retorno anual de controle.'
    }
  },

  // 11. Zeni Martins
  {
    patient: {
      id: 'caf37cb8-0da4-45a5-be3e-68afbc55d900',
      fullName: 'Zeni Martins',
      birthDate: '1967-05-18',
      sex: 'F',
      nationality: 'BR',
      documentType: 'CPF',
      phone: '+55 67 99288-4455',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'Presbiopia e hipermetropia',
      lgpdConsent: true,
      createdAt: '2026-09-05T10:20:59.540Z',
      updatedAt: '2026-09-05T10:20:59.540Z'
    },
    encounter: {
      id: 'enc-zm-1',
      patientId: 'caf37cb8-0da4-45a5-be3e-68afbc55d900',
      date: '2026-09-05T10:25:00.000Z',
      status: 'completed',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      anamnesis: {
        id: 'anam-zm-1',
        encounterId: 'enc-zm-1',
        chiefComplaint: 'Visão cansada para leitura de jornais e textos pequenos',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-zm-1',
        encounterId: 'enc-zm-1',
        od: { sphere: 1.50, cylinder: 0.00, axis: 90, visualAcuity: '20/20' },
        oe: { sphere: 1.50, cylinder: 0.00, axis: 90, visualAcuity: '20/20' },
        addition: 2.50,
        pdDistanceMm: 61
      },
      conduct: 'Prescrição multifocal para perto e meia distância com antirreflexo.',
      returnInWeeks: 52
    },
    prescription: {
      id: 'rx-zm-1',
      encounterId: 'enc-zm-1',
      patientId: 'caf37cb8-0da4-45a5-be3e-68afbc55d900',
      patientName: 'Zeni Martins',
      date: '2026-09-05T10:30:00.000Z',
      expirationDate: '2027-09-05',
      od: { sphere: 1.50, cylinder: 0.00, axis: 90, visualAcuity: '20/20' },
      oe: { sphere: 1.50, cylinder: 0.00, axis: 90, visualAcuity: '20/20' },
      addition: 2.50,
      pdDistanceMm: 61,
      lensType: 'multifocal',
      material: 'resina',
      treatments: ['Antirreflexo'],
      observations: 'Adaptação para leitura e atividades diárias.',
      returnInstructions: 'Retorno anual.'
    }
  },

  // 12. Ramona Ribeiro Brito
  {
    patient: {
      id: 'ebeceff-1ea4-4de8-829e-a20c3c760090',
      fullName: 'Ramona Ribeiro Brito',
      birthDate: '1977-11-05',
      sex: 'F',
      nationality: 'BR',
      documentType: 'CPF',
      phone: '+55 67 99177-8899',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'Presbiopia e astigmatismo leve',
      lgpdConsent: true,
      createdAt: '2026-09-05T11:41:22.490Z',
      updatedAt: '2026-09-05T11:41:22.490Z'
    },
    encounter: {
      id: 'enc-rrb-1',
      patientId: 'ebeceff-1ea4-4de8-829e-a20c3c760090',
      date: '2026-09-05T11:45:00.000Z',
      status: 'completed',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      anamnesis: {
        id: 'anam-rrb-1',
        encounterId: 'enc-rrb-1',
        chiefComplaint: 'Dificuldade para focar de perto e cefaleia ao fim do dia',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-rrb-1',
        encounterId: 'enc-rrb-1',
        od: { sphere: 0.75, cylinder: -0.50, axis: 180, visualAcuity: '20/20' },
        oe: { sphere: 0.75, cylinder: -0.25, axis: 170, visualAcuity: '20/20' },
        addition: 1.75,
        pdDistanceMm: 62
      },
      conduct: 'Prescrição multifocal digital.',
      returnInWeeks: 52
    },
    prescription: {
      id: 'rx-rrb-1',
      encounterId: 'enc-rrb-1',
      patientId: 'ebeceff-1ea4-4de8-829e-a20c3c760090',
      patientName: 'Ramona Ribeiro Brito',
      date: '2026-09-05T11:50:00.000Z',
      expirationDate: '2027-09-05',
      od: { sphere: 0.75, cylinder: -0.50, axis: 180, visualAcuity: '20/20' },
      oe: { sphere: 0.75, cylinder: -0.25, axis: 170, visualAcuity: '20/20' },
      addition: 1.75,
      pdDistanceMm: 62,
      lensType: 'multifocal',
      material: 'resina',
      treatments: ['Antirreflexo Crizal'],
      observations: 'Uso para longe e perto.',
      returnInstructions: 'Retorno anual de rotina.'
    }
  },

  // 13. Kelli Cristina
  {
    patient: {
      id: 'a9347272-0529-4b2d-9633-6c6f396e8a40',
      fullName: 'Kelli Cristina',
      birthDate: '1989-02-14',
      sex: 'F',
      nationality: 'BR',
      documentType: 'CPF',
      phone: '+55 67 99233-1122',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'Exame de refração e adaptação',
      lgpdConsent: true,
      createdAt: '2026-09-05T17:19:09.550Z',
      updatedAt: '2026-09-05T17:19:09.550Z'
    },
    encounter: {
      id: 'enc-kc2-1',
      patientId: 'a9347272-0529-4b2d-9633-6c6f396e8a40',
      date: '2026-09-05T17:25:00.000Z',
      status: 'completed',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      anamnesis: {
        id: 'anam-kc2-1',
        encounterId: 'enc-kc2-1',
        chiefComplaint: 'Visão embaçada para longe e sensibilidade à luz',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-kc2-1',
        encounterId: 'enc-kc2-1',
        od: { sphere: -1.75, cylinder: -0.50, axis: 15, visualAcuity: '20/20' },
        oe: { sphere: -1.50, cylinder: -0.75, axis: 165, visualAcuity: '20/20' },
        pdDistanceMm: 61
      },
      conduct: 'Prescrição monofocal com proteção antirreflexo e filtro fotossensível.',
      returnInWeeks: 52
    },
    prescription: {
      id: 'rx-kc2-1',
      encounterId: 'enc-kc2-1',
      patientId: 'a9347272-0529-4b2d-9633-6c6f396e8a40',
      patientName: 'Kelli Cristina',
      date: '2026-09-05T17:30:00.000Z',
      expirationDate: '2027-09-05',
      od: { sphere: -1.75, cylinder: -0.50, axis: 15, visualAcuity: '20/20' },
      oe: { sphere: -1.50, cylinder: -0.75, axis: 165, visualAcuity: '20/20' },
      pdDistanceMm: 61,
      lensType: 'monofocal',
      material: 'resina',
      treatments: ['Fotossensível', 'Antirreflexo Premium'],
      observations: 'Uso contínuo.',
      returnInstructions: 'Retorno anual.'
    }
  },

  // 14. Maira Fernandes (18/09/2026)
  {
    patient: {
      id: 'a84131bd-ba44-47ca-8d71-bff029c6be22',
      fullName: 'Maira Fernandes',
      birthDate: '1991-02-28',
      sex: 'F',
      nationality: 'BR',
      documentType: 'CPF',
      phoneCountryCode: '+55',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'usuaria de lentes corretivas, alergica a penicilina, Cefaleia frequente',
      lgpdConsent: true,
      createdAt: '2026-09-18T20:25:01.291Z',
      updatedAt: '2026-09-18T20:47:37.280Z'
    },
    encounter: {
      id: 'ae40c571-aa20-4809-b0b9-d995d37f5d75',
      patientId: 'a84131bd-ba44-47ca-8d71-bff029c6be22',
      date: '2026-09-18T20:25:01.507Z',
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles (CRM/CROO 123456)',
      anamnesis: {
        id: '3786d295-dfab-444b-8d19-a5dc8bc00888',
        chiefComplaint: 'Cefaleia frequente e baixa acuidade visual',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false,
        medicationsInUse: 'Levotiroxina Sódica 25mg.',
        clinicalNotes: 'usuaria de lentes corretivas, alergica a penicilina, Cefaleia frequente'
      },
      lensometry: {
        id: 'e0f8002c-b653-4627-81b6-409c92dc1296',
        od: { sphere: -6.50, cylinder: -1.50, axis: 125 },
        oe: { sphere: -2.50, cylinder: -1.25, axis: 5 },
        lensType: 'monofocal_longe',
        material: 'resina',
        treatments: ['Antirreflexo', 'Filtro Luz Azul (BlueCut)', 'Fotossensível (Transitions)'],
        usageTime: '1 a 2 anos',
        notes: 'Lentes muito riscadas, Perda de foco / visão cansada'
      },
      visualAcuity: {
        id: 'f3dec4c4-68f9-423a-b150-66bdff43e8fe',
        testedAt: '2026-09-18T20:25:01.507Z',
        entries: [
          { eye: 'OD', optotypeType: 'snellen_letters', distanceMeters: 6, uncorrected: '20/' },
          { eye: 'OE', optotypeType: 'snellen_letters', distanceMeters: 6, uncorrected: '20/' }
        ]
      },
      subjectiveRefraction: {
        id: '54c8d002-f156-4de7-8010-a9f848e438a4',
        od: { sphere: -3.00, cylinder: 0.00, axis: 0, visualAcuity: '20/60' },
        oe: { sphere: -3.00, cylinder: 0.00, axis: 0, visualAcuity: '20/60' },
        lensType: 'multifocal',
        material: 'resina',
        treatments: ['Antirreflexo Digital', 'Filtro Luz Azul (BlueCut)'],
        additionalOpticalInfo: 'paciente sob acompanhamento periodico, buscando melhora na AV'
      },
      conduct: 'Paciente sob acompanhamento periódico. Prescrição multifocal em resina com BlueCut e Antirreflexo Digital.',
      returnInstructions: 'Retorno em 6 meses (Acompanhamento)'
    },
    prescription: {
      id: 'rx-mf-1809',
      encounterId: 'ae40c571-aa20-4809-b0b9-d995d37f5d75',
      patientId: 'a84131bd-ba44-47ca-8d71-bff029c6be22',
      patientName: 'Maira Fernandes',
      date: '2026-09-18T20:25:01.507Z',
      expirationDate: '2027-03-18',
      od: { sphere: -3.00, cylinder: 0.00, axis: 0, visualAcuity: '20/60' },
      oe: { sphere: -3.00, cylinder: 0.00, axis: 0, visualAcuity: '20/60' },
      lensType: 'multifocal',
      material: 'resina',
      treatments: ['Antirreflexo Digital', 'Filtro Luz Azul (BlueCut)'],
      observations: 'Paciente sob acompanhamento periódico buscando melhora na AV.',
      returnInstructions: 'Retorno em 6 meses (Acompanhamento)'
    }
  },

  // 15. Elizangela Moura (18/09/2026)
  {
    patient: {
      id: '33f6f16d-add7-4e59-8522-8a5f9b345bfd',
      fullName: 'Elizangela Moura',
      birthDate: '1981-08-07',
      sex: 'F',
      nationality: 'BR',
      documentType: 'CPF',
      phoneCountryCode: '+55',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'rotina - hipertensão gestacional há 21 anos',
      lgpdConsent: true,
      createdAt: '2026-09-18T18:48:58.287Z',
      updatedAt: '2026-09-18T19:25:18.526Z'
    },
    encounter: {
      id: 'd5e5ae8c-c78e-4854-a1ab-2da26b708c96',
      patientId: '33f6f16d-add7-4e59-8522-8a5f9b345bfd',
      date: '2026-09-18T18:48:58.316Z',
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles (CRM/CROO 123456)',
      anamnesis: {
        id: '7075c1ff-6104-4994-9e03-2288bc7c99f3',
        chiefComplaint: 'Rotina e troca de óculos',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false,
        clinicalNotes: 'hipertensão gestacional a 21 anos'
      },
      lensometry: {
        id: 'd964a01f-754f-413d-bb19-018ade97aa21',
        od: { sphere: 2.75, cylinder: -0.50, axis: 95 },
        oe: { sphere: 3.00, cylinder: -1.00, axis: 90 },
        addition: 1.50,
        lensType: 'multifocal',
        material: 'resina',
        treatments: ['Antirreflexo', 'Fotossensível (Transitions)', 'Filtro Luz Azul (BlueCut)'],
        usageTime: '2 anos',
        notes: 'Lentes muito riscadas, Desconforto para leitura, Antirreflexo descascando'
      },
      visualAcuity: {
        id: '073a16aa-2042-475b-b80c-76c0e6d91dba',
        testedAt: '2026-09-18T18:48:58.316Z',
        entries: [
          { eye: 'OD', optotypeType: 'snellen_letters', distanceMeters: 6, uncorrected: '20/' },
          { eye: 'OE', optotypeType: 'snellen_letters', distanceMeters: 6, uncorrected: '20/' }
        ]
      },
      subjectiveRefraction: {
        id: 'cbd2cd5e-d437-4636-b5b1-08b035919621',
        od: { sphere: 3.00, cylinder: 0.00, axis: 0, visualAcuity: '20/20' },
        oe: { sphere: 3.00, cylinder: 0.00, axis: 0, visualAcuity: '20/20' },
        addition: 1.75,
        lensType: 'multifocal',
        material: 'resina',
        treatments: ['Antirreflexo Digital', 'Filtro Luz Azul (BlueCut)', 'Fotossensível (Transitions)']
      },
      conduct: 'Prescrição multifocal digital com adição +1.75, filtro BlueCut e fotossensível.',
      returnInstructions: 'Retorno em 1 ano para controle visual de rotina.'
    },
    prescription: {
      id: 'rx-em-1809',
      encounterId: 'd5e5ae8c-c78e-4854-a1ab-2da26b708c96',
      patientId: '33f6f16d-add7-4e59-8522-8a5f9b345bfd',
      patientName: 'Elizangela Moura',
      date: '2026-09-18T18:48:58.316Z',
      expirationDate: '2027-09-18',
      od: { sphere: 3.00, cylinder: 0.00, axis: 0, visualAcuity: '20/20' },
      oe: { sphere: 3.00, cylinder: 0.00, axis: 0, visualAcuity: '20/20' },
      addition: 1.75,
      lensType: 'multifocal',
      material: 'resina',
      treatments: ['Antirreflexo Digital', 'Filtro Luz Azul (BlueCut)', 'Fotossensível (Transitions)'],
      observations: 'Uso contínuo para longe e perto.',
      returnInstructions: 'Retorno em 1 ano para controle visual de rotina.'
    }
  },

  // 16. Erika Rodrigues (18/09/2026)
  {
    patient: {
      id: '39e695b2-0a56-4f83-b63a-bcbddaf85392',
      fullName: 'Erika Rodrigues',
      birthDate: '1997-12-19',
      sex: 'F',
      nationality: 'BR',
      documentType: 'CPF',
      phoneCountryCode: '+55',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'usuaria de lentes corretivas, Cefaleia frequente, Sensibilidade à luz / Fotofobia, Fadiga visual em telas',
      lgpdConsent: true,
      createdAt: '2026-09-18T18:37:16.045Z',
      updatedAt: '2026-09-18T18:46:58.131Z'
    },
    encounter: {
      id: 'c5f5dbc7-bdd0-47c4-a3b0-b3da7cb7eb18',
      patientId: '39e695b2-0a56-4f83-b63a-bcbddaf85392',
      date: '2026-09-18T18:37:16.141Z',
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles (CRM/CROO 123456)',
      anamnesis: {
        id: '1b05604e-9582-4bd8-85c9-71216f76e7f9',
        chiefComplaint: 'Cefaleia frequente, sensibilidade à luz e fadiga visual em telas',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false,
        medicationsInUse: 'Nega uso de medicamentos',
        clinicalNotes: 'usuaria de lentes corretivas, Cefaleia frequente, Sensibilidade à luz / Fotofobia, Fadiga visual em telas, Lacrimejamento excessivo'
      },
      lensometry: {
        id: 'cab4db4f-5cad-40ba-9cef-139539483c10',
        od: { sphere: 0.50, cylinder: -0.25, axis: 175 },
        oe: { sphere: 0.50, cylinder: -0.50, axis: 5 },
        lensType: 'multifocal',
        material: 'resina',
        treatments: ['Antirreflexo'],
        usageTime: '3 a 5 anos'
      },
      visualAcuity: {
        id: '84872403-1c83-4a27-bb71-7f3ba16c36fa',
        testedAt: '2026-09-18T18:37:16.141Z',
        entries: [
          { eye: 'OD', optotypeType: 'snellen_letters', distanceMeters: 6, uncorrected: '20/' },
          { eye: 'OE', optotypeType: 'snellen_letters', distanceMeters: 6, uncorrected: '20/' }
        ]
      },
      subjectiveRefraction: {
        id: '219e04c1-4ac9-48e0-b850-6558b46bc71c',
        od: { sphere: 0.00, cylinder: -0.75, axis: 180, visualAcuity: '20/20' },
        oe: { sphere: 0.00, cylinder: -0.75, axis: 180, visualAcuity: '20/20' },
        lensType: 'multifocal',
        material: 'resina',
        treatments: ['Antirreflexo Digital', 'Filtro Luz Azul (BlueCut)']
      },
      conduct: 'Prescrição com correção de astigmatismo bilateral (-0.75 a 180°), proteção BlueCut para computador.',
      returnInstructions: 'Retorno em 1 ano para controle visual de rotina.'
    },
    prescription: {
      id: 'rx-er-1809',
      encounterId: 'c5f5dbc7-bdd0-47c4-a3b0-b3da7cb7eb18',
      patientId: '39e695b2-0a56-4f83-b63a-bcbddaf85392',
      patientName: 'Erika Rodrigues',
      date: '2026-09-18T18:37:16.141Z',
      expirationDate: '2027-09-18',
      od: { sphere: 0.00, cylinder: -0.75, axis: 180, visualAcuity: '20/20' },
      oe: { sphere: 0.00, cylinder: -0.75, axis: 180, visualAcuity: '20/20' },
      lensType: 'multifocal',
      material: 'resina',
      treatments: ['Antirreflexo Digital', 'Filtro Luz Azul (BlueCut)'],
      observations: 'Uso contínuo para trabalho e telas.',
      returnInstructions: 'Retorno em 1 ano para controle visual de rotina.'
    }
  },

  // 17. Suzana C. dos Santos (18/09/2026 - Manhã 09:24)
  {
    patient: {
      id: 'f3f7d16e-95f6-4d8f-8947-0ee9241c10e1',
      fullName: 'Suzana C. dos Santos',
      birthDate: '1985-05-12',
      sex: 'F',
      nationality: 'BR',
      documentType: 'CPF',
      phoneCountryCode: '+55',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'Consulta Oftalmológica / Refração - Atendimento das 09:24',
      lgpdConsent: true,
      createdAt: '2026-09-18T13:24:38.783Z',
      updatedAt: '2026-09-18T13:36:59.531Z'
    },
    encounter: {
      id: 'a86750af-1a63-4e1b-a9b8-6d7c1f7ad1d5',
      patientId: 'f3f7d16e-95f6-4d8f-8947-0ee9241c10e1',
      date: '2026-09-18T13:24:53.136Z',
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles (CRM/CROO 123456)',
      anamnesis: {
        id: 'anam-scs-1',
        chiefComplaint: 'Avaliação refrativa e renovação de óculos',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-scs-1',
        od: { sphere: 0.00, cylinder: 0.00, axis: 0, visualAcuity: '20/20' },
        oe: { sphere: 0.00, cylinder: 0.00, axis: 0, visualAcuity: '20/20' }
      },
      conduct: 'Exame de refração concluído com sucesso. Orientação postural e controle visual.',
      returnInstructions: 'Retorno em 1 ano para controle visual de rotina.'
    },
    prescription: {
      id: 'rx-scs-1809',
      encounterId: 'a86750af-1a63-4e1b-a9b8-6d7c1f7ad1d5',
      patientId: 'f3f7d16e-95f6-4d8f-8947-0ee9241c10e1',
      patientName: 'Suzana C. dos Santos',
      date: '2026-09-18T13:24:53.136Z',
      expirationDate: '2027-09-18',
      od: { sphere: 0.00, cylinder: 0.00, axis: 0, visualAcuity: '20/20' },
      oe: { sphere: 0.00, cylinder: 0.00, axis: 0, visualAcuity: '20/20' },
      lensType: 'monofocal',
      material: 'resina',
      treatments: ['Antirreflexo'],
      observations: 'Uso conforme necessidade.',
      returnInstructions: 'Retorno em 1 ano para controle visual de rotina.'
    }
  },

  // 18. Mauricio Dias (18/09/2026 - Manhã 08:19)
  {
    patient: {
      id: 'eb01d056-630d-452f-b6f4-50bb6e0c5ea7',
      fullName: 'Mauricio Dias',
      birthDate: '1978-10-22',
      sex: 'M',
      nationality: 'BR',
      documentType: 'CPF',
      phoneCountryCode: '+55',
      city: 'Ponta Porã',
      country: 'Brasil',
      notes: 'Consulta Oftalmológica / Refração - Atendimento das 08:19',
      lgpdConsent: true,
      createdAt: '2026-09-18T12:19:05.210Z',
      updatedAt: '2026-09-18T12:27:29.919Z'
    },
    encounter: {
      id: '511baaec-43cb-49d5-b09f-ce03da9ddab0',
      patientId: 'eb01d056-630d-452f-b6f4-50bb6e0c5ea7',
      date: '2026-09-18T12:27:29.919Z',
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles (CRM/CROO 123456)',
      anamnesis: {
        id: 'anam-md-1',
        chiefComplaint: 'Avaliação visual e refração de rotina',
        currentGlasses: true,
        contactLenses: false,
        hasHypertension: false,
        hasDiabetes: false
      },
      subjectiveRefraction: {
        id: 'sr-md-1',
        od: { sphere: 0.00, cylinder: 0.00, axis: 0, visualAcuity: '20/20' },
        oe: { sphere: 0.00, cylinder: 0.00, axis: 0, visualAcuity: '20/20' }
      },
      conduct: 'Exame de refração realizado e finalizado. Orientado quanto ao uso correto das lentes.',
      returnInstructions: 'Retorno em 1 ano para controle visual de rotina.'
    },
    prescription: {
      id: 'rx-md-1809',
      encounterId: '511baaec-43cb-49d5-b09f-ce03da9ddab0',
      patientId: 'eb01d056-630d-452f-b6f4-50bb6e0c5ea7',
      patientName: 'Mauricio Dias',
      date: '2026-09-18T12:27:29.919Z',
      expirationDate: '2027-09-18',
      od: { sphere: 0.00, cylinder: 0.00, axis: 0, visualAcuity: '20/20' },
      oe: { sphere: 0.00, cylinder: 0.00, axis: 0, visualAcuity: '20/20' },
      lensType: 'monofocal',
      material: 'resina',
      treatments: ['Antirreflexo'],
      observations: 'Uso conforme necessidade.',
      returnInstructions: 'Retorno em 1 ano para controle visual de rotina.'
    }
  }
];

