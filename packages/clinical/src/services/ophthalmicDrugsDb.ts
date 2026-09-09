export interface OphthalmicDrug {
  id: string;
  category: 'LUBRIFICANTE' | 'ANTI_INFLAMATORIO' | 'ANTIBIOTICO' | 'ANTIALERGICO' | 'HIPOTENSOR' | 'MIDRIATICO_CICLOPLEGICO' | 'SUPLEMENTO';
  commercialName: string;
  activePrinciple: string;
  concentration: string;
  presentation: string; // Ex: Frasco conta-gotas 10ml, Caixa 30 flaconetes
  defaultPosology: string;
  indication: string;
  clinicalNotes: string;
}

export const OPHTHALMIC_DRUGS_DATABASE: OphthalmicDrug[] = [
  // LUBRIFICANTES OCULARES / LÁGRIMAS ARTIFICIAIS
  {
    id: 'drug-lub-1',
    category: 'LUBRIFICANTE',
    commercialName: 'Hyabak / Systane Ultra',
    activePrinciple: 'Hialuronato de Sódio / Polietilenoglicol + Propilenoglicol',
    concentration: '0.15% / 0.4% + 0.3%',
    presentation: 'Frasco conta-gotas 10 mL',
    defaultPosology: 'Instilar 1 gota em ambos os olhos de 4 a 6 vezes ao dia, ou conforme necessidade e sintomas de ressecamento.',
    indication: 'Olho Seco evaporativo, fadiga visual digital (telas), uso prolongado de lentes de contato e pós-refrativa.',
    clinicalNotes: 'Livre de conservantes ou compatível com lentes de contato. Alta tolerabilidade e alívio prolongado.'
  },
  {
    id: 'drug-lub-2',
    category: 'LUBRIFICANTE',
    commercialName: 'Optive / Fresh Tears',
    activePrinciple: 'Carmelose Sódica',
    concentration: '0.5%',
    presentation: 'Frasco conta-gotas 15 mL',
    defaultPosology: 'Instilar 1 gota no(s) olho(s) afetado(s) 3 a 4 vezes ao dia.',
    indication: 'Alívio da ardência, irritação, secura ocular e desconforto ambiental (vento, ar-condicionado).',
    clinicalNotes: 'Osmoprotetor celular. Seguro para uso diário contínuo.'
  },
  {
    id: 'drug-lub-3',
    category: 'LUBRIFICANTE',
    commercialName: 'Lacrilube / Liposic Gel',
    activePrinciple: 'Carbômer / Óleo Mineral',
    concentration: '0.2% / Gel Oftálmico',
    presentation: 'Bisnaga 10g',
    defaultPosology: 'Aplicar uma pequena quantidade (0.5 cm) no fundo de saco conjuntival inferior ao deitar.',
    indication: 'Olho seco moderado a severo, ceratite por exposição, proteção noturna.',
    clinicalNotes: 'Pode turvar temporariamente a visão. Uso preferencialmente noturno.'
  },

  // ANTIALÉRGICOS OCULARES
  {
    id: 'drug-alg-1',
    category: 'ANTIALERGICO',
    commercialName: 'Patanol S / Opatanol (Olopatadina)',
    activePrinciple: 'Cloridrato de Olopatadina',
    concentration: '0.2%',
    presentation: 'Frasco conta-gotas 2.5 mL',
    defaultPosology: 'Instilar 1 gota em cada olho 1 vez ao dia (ou 0.1% a cada 12 horas).',
    indication: 'Conjuntivite alérgica sazonal e perene, prurido ocular intenso, hiperemia alérgica.',
    clinicalNotes: 'Ação dupla: anti-histamínico H1 e estabilizador de mastócitos. Rápido alívio dos sintomas.'
  },
  {
    id: 'drug-alg-2',
    category: 'ANTIALERGICO',
    commercialName: 'Relestat (Epinastina)',
    activePrinciple: 'Cloridrato de Epinastina',
    concentration: '0.05%',
    presentation: 'Frasco conta-gotas 5 mL',
    defaultPosology: 'Instilar 1 gota em cada olho afetado a cada 12 horas.',
    indication: 'Prurido associado a conjuntivite alérgica.',
    clinicalNotes: 'Não afeta os receptores pupilares.'
  },

  // ANTI-INFLAMATÓRIOS E CORTICOIDES
  {
    id: 'drug-aie-1',
    category: 'ANTI_INFLAMATORIO',
    commercialName: 'Loteprol / Pred Fort',
    activePrinciple: 'Etabonato de Loteprednol / Acetato de Prednisolona',
    concentration: '0.5% / 1.0%',
    presentation: 'Frasco suspensão 5 mL',
    defaultPosology: 'Instilar 1 gota no olho afetado a cada 6 a 8 horas por 7 dias com desmame regressivo.',
    indication: 'Inflamações oculares pós-operatórias, uveítes anteriores, ceratites inflamatórias.',
    clinicalNotes: 'Loteprednol possui baixo risco de elevação da pressão intraocular (PIO).'
  },
  {
    id: 'drug-aie-2',
    category: 'ANTI_INFLAMATORIO',
    commercialName: 'Acular LS / Nevanac (AINE)',
    activePrinciple: 'Cetotrometamol de Trometamol / Nepafenaco',
    concentration: '0.4% / 0.1%',
    presentation: 'Frasco conta-gotas 5 mL',
    defaultPosology: 'Instilar 1 gota no olho afetado a cada 8 horas por 5 a 7 dias.',
    indication: 'Dor e inflamação ocular, pós-cirurgia refrativa, ceratite.',
    clinicalNotes: 'AINE tópico não esteroidal. Monitorar epitélio corneal.'
  },

  // ANTIBIÓTICOS TÓPICOS
  {
    id: 'drug-atb-1',
    category: 'ANTIBIOTICO',
    commercialName: 'Vigamox / Zymar (Moxifloxacino / Gatifloxacino)',
    activePrinciple: 'Cloridrato de Moxifloxacino',
    concentration: '0.5%',
    presentation: 'Frasco conta-gotas 5 mL',
    defaultPosology: 'Instilar 1 gota no olho afetado a cada 8 horas por 7 dias.',
    indication: 'Conjuntivite bacteriana aguda, úlceras de córnea bacterianas, profilaxia cirúrgica.',
    clinicalNotes: 'Fluoroquinolona de 4ª geração com amplo espectro contra gram-positivos e gram-negativos.'
  },
  {
    id: 'drug-atb-2',
    category: 'ANTIBIOTICO',
    commercialName: 'Tobrex / Tobradex (+Dexametasona)',
    activePrinciple: 'Tobramicina (+ Dexametasona)',
    concentration: '0.3% (+ 0.1%)',
    presentation: 'Frasco 5 mL ou Pomada Oftálmica 3.5g',
    defaultPosology: 'Instilar 1 gota a cada 6 horas por 7 dias.',
    indication: 'Infecções bacterianas superficiais e processos inflamatórios infecciosos.',
    clinicalNotes: 'Aminoglicosídeo clássico. Opção em pomada para uso noturno.'
  },

  // HIPOTENSORES OCULARES / GLAUCOMA
  {
    id: 'drug-glau-1',
    category: 'HIPOTENSOR',
    commercialName: 'Lumigan / Xalatan / Travatan (Análogos de Prostaglandina)',
    activePrinciple: 'Bimatoprosta / Latanoprosta / Travoprosta',
    concentration: '0.01% / 0.005% / 0.004%',
    presentation: 'Frasco conta-gotas 2.5 mL ou 3.0 mL',
    defaultPosology: 'Instilar 1 gota no(s) olho(s) afetado(s) 1 vez ao dia, impreterivelmente à noite (às 21h).',
    indication: 'Glaucoma primário de ângulo aberto, hipertensão ocular.',
    clinicalNotes: 'Primeira linha de tratamento do glaucoma. Efeitos adversos: hiperpigmentação de íris/cílios e hiperemia.'
  },
  {
    id: 'drug-glau-2',
    category: 'HIPOTENSOR',
    commercialName: 'Timolol / Combigan (+Brimonidina)',
    activePrinciple: 'Maleato de Timolol (+ Tartarato de Brimonidina)',
    concentration: '0.5% (+ 0.2%)',
    presentation: 'Frasco conta-gotas 5 mL',
    defaultPosology: 'Instilar 1 gota a cada 12 horas.',
    indication: 'Redução da pressão intraocular em glaucoma e hipertensão ocular.',
    clinicalNotes: 'Atenção a pacientes com asma, DPOC, bradicardia ou bloqueio atrioventricular.'
  },

  // SUPLEMENTOS E ANTIOXIDANTES RETINIANOS (AREDS 2)
  {
    id: 'drug-sup-1',
    category: 'SUPLEMENTO',
    commercialName: 'Vitalux Plus / Retimax / Luteína + Zeaxantina (Fórmula AREDS 2)',
    activePrinciple: 'Luteína + Zeaxantina + Ômega 3 + Zinco + Vitaminas C e E',
    concentration: 'Doses clínicas padronizadas',
    presentation: 'Caixa com 30 ou 60 cápsulas gelatinosas',
    defaultPosology: 'Ingerir 1 cápsula ao dia junto à principal refeição.',
    indication: 'Prevenção da progressão da Degeneração Macular Relacionada à Idade (DMRI) e proteção do estresse oxidativo na retina.',
    clinicalNotes: 'Baseado no estudo clínico internacional AREDS 2.'
  }
];
