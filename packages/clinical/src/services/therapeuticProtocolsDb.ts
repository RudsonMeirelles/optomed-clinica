export interface ClinicalProtocolDrug {
  commercialName: string;
  activePrinciple: string;
  concentration: string;
  presentation: string;
  dosage: string;
  route: 'Uso Tópico Ocular' | 'Uso Oral' | 'Uso Tópico Palpebral';
  quantity: string;
}

export interface TherapeuticProtocol {
  id: string;
  clinicalCondition: string; // Quadro Clínico / Diagnóstico
  category: 'SUPERFICIE_OCULAR' | 'ALERGIA' | 'INFECCAO' | 'PALPEBRAS' | 'REFRAVAO_ASTENOPIA' | 'RETINA_GLAUCOMA';
  summary: string;
  nonPharmacologicalActions: string[]; // Medidas Comportamentais & Higiene
  suggestedDrugs: ClinicalProtocolDrug[]; // Fármacos indicados
  recommendedReturn: string; // Tempo e conduta de retorno
  patientGuidance: string; // Orientações de educação ao paciente
  warnings?: string;
}

export const THERAPEUTIC_PROTOCOLS_DATABASE: TherapeuticProtocol[] = [
  // 1. OLHO SECO & DISFUNÇÃO DE GLÂNDULAS DE MEIBOMIUS (DGM)
  {
    id: 'protocol-dry-eye',
    clinicalCondition: 'Olho Seco Evaporativo / Disfunção de Glândulas de Meibomius (DGM)',
    category: 'SUPERFICIE_OCULAR',
    summary: 'Instabilidade do filme lacrimal com queixa de ardência, sensação de areia, flutuação visual e hiperemia conjuntival.',
    nonPharmacologicalActions: [
      'Compressas mornas com água filtrada sobre as pálpebras fechadas por 5 a 10 minutos (1 a 2x ao dia).',
      'Massagem suave vertical nas pálpebras em direção à borda palpebral após a compressa para desobstrução meibomiana.',
      'Regra 20-20-20 ao usar telas (a cada 20 minutos, olhar para 6 metros por 20 segundos e piscar conscientemente).',
      'Umidificação do ambiente e evitar fluxo direto de ar-condicionado ou ventilador no rosto.'
    ],
    suggestedDrugs: [
      {
        commercialName: 'Hyabak / Systane Ultra',
        activePrinciple: 'Hialuronato de Sódio 0.15% / PEG 400 + PG',
        concentration: '0.15%',
        presentation: 'Frasco conta-gotas 10 mL (sem conservantes)',
        dosage: 'Instilar 1 gota em ambos os olhos de 4 a 6 vezes ao dia, ou conforme necessidade e sintomas.',
        route: 'Uso Tópico Ocular',
        quantity: '1 frasco'
      },
      {
        commercialName: 'Lacrilube / Liposic Gel',
        activePrinciple: 'Carbômer 0.2% / Óleo Mineral',
        concentration: 'Gel Oftálmico 0.2%',
        presentation: 'Bisnaga 10g',
        dosage: 'Aplicar uma pequena quantidade (0.5 cm) no fundo de saco conjuntival inferior de ambos os olhos ao deitar.',
        route: 'Uso Tópico Ocular',
        quantity: '1 bisnaga'
      }
    ],
    recommendedReturn: 'Retorno em 30 a 60 dias para reavaliação da estabilidade lacrimal (BUT) e alívio sintomático.',
    patientGuidance: 'O tratamento do olho seco é contínuo e preventivo. O uso regular dos lubrificantes melhora a qualidade óptica e previne microlesões na córnea.',
    warnings: 'Caso utilize lentes de contato, prefira lubrificantes sem conservantes (PF) e retire as lentes antes de aplicar o gel noturno.'
  },

  // 2. CONJUNTIVITE ALÉRGICA OCULAR / PRURIDO INTENSO
  {
    id: 'protocol-allergic-conjunctivitis',
    clinicalCondition: 'Conjuntivite Alérgica (Sazonal / Perene / Prurido Ocular)',
    category: 'ALERGIA',
    summary: 'Prurido ocular intenso (coceira), hiperemia conjuntival, quemose leve, lacrimejamento e secreção filamentosa hialina.',
    nonPharmacologicalActions: [
      'NUNCA COÇAR OS OLHOS (o atrito mecânico pode agravar ceratocone e aumentar a liberação de histamina).',
      'Compressas frias com água filtrada ou soro fisiológico fechado por 10 minutos para alívio imediato do prurido e vasoconstrição.',
      'Controle ambiental: higienização de travesseiros com capas antiácaro, evitar poeira, pólen e pelos de animais no quarto.',
      'Lavar os olhos com lágrimas artificiais geladas após exposição a fatores desencadeantes.'
    ],
    suggestedDrugs: [
      {
        commercialName: 'Patanol S / Opatanol (Olopatadina)',
        activePrinciple: 'Cloridrato de Olopatadina',
        concentration: '0.2%',
        presentation: 'Frasco conta-gotas 2.5 mL',
        dosage: 'Instilar 1 gota em cada olho 1 vez ao dia (preferencialmente pela manhã). Manter por 30 a 60 dias.',
        route: 'Uso Tópico Ocular',
        quantity: '1 frasco'
      },
      {
        commercialName: 'Fresh Tears / Optive',
        activePrinciple: 'Carmelose Sódica 0.5%',
        concentration: '0.5%',
        presentation: 'Frasco conta-gotas 15 mL',
        dosage: 'Instilar 1 gota em ambos os olhos 3 a 4 vezes ao dia (preferencialmente refrigerado) para remoção mecânica de alérgenos.',
        route: 'Uso Tópico Ocular',
        quantity: '1 frasco'
      }
    ],
    recommendedReturn: 'Retorno em 20 a 30 dias para controle de resposta clínica e desmame se estabilizado.',
    patientGuidance: 'O antialérgico tópico de dupla ação estabiliza as células de defesa prevenindo novas crises alérgicas. Não suspender subitamente.',
    warnings: 'Evitar uso de colírios vasoconstritores simples (com nafazolina/tetrizolina) por risco de efeito rebote e piora progressiva.'
  },

  // 3. BLEFARITE & MEIBOMITE CRÔNICA
  {
    id: 'protocol-blepharitis',
    clinicalCondition: 'Blefarite Anterior / Seborreica / Colaretes Ciliares',
    category: 'PALPEBRAS',
    summary: 'Formação de crostas/colaretes na base dos cílios, prurido palpebral matinal, escamas, irritação e madarose leve.',
    nonPharmacologicalActions: [
      'Higiene palpebral diária com xampu neutro infantil ou loção específica (Blephagel/Frex Clean) 1 a 2x ao dia.',
      'Uso de cotonete ou gaze embebida para limpeza suave da raiz dos cílios, removendo crostas aderidas.',
      'Compressas úmidas e mornas por 5 a 10 minutos antes da higiene para amolecer secreções secas.',
      'Substituir maquiagens perioculares e nunca dormir sem higienização completa.'
    ],
    suggestedDrugs: [
      {
        commercialName: 'Blephagel / Frex Clean T',
        activePrinciple: 'Gel de Limpeza Palpebral com Tea Tree Oil / Polissorbato',
        concentration: 'Gel Hipoalergênico',
        presentation: 'Frasco com bomba dosadora / Tubo 30g',
        dosage: 'Aplicar uma pequena quantidade em gaze estéril ou na ponta dos dedos limpos e massagear a base dos cílios fechados 2x ao dia. Não enxaguar.',
        route: 'Uso Tópico Palpebral',
        quantity: '1 frasco'
      },
      {
        commercialName: 'Maxitrol Pomada (se inflamação com crostas intensas)',
        activePrinciple: 'Dexametasona + Neomicina + Polimixina B',
        concentration: 'Pomada Oftálmica',
        presentation: 'Bisnaga 3.5g',
        dosage: 'Aplicar uma fina camada sobre a margem palpebral ao deitar durante 7 dias (após higiene).',
        route: 'Uso Tópico Palpebral',
        quantity: '1 bisnaga'
      }
    ],
    recommendedReturn: 'Retorno em 30 dias para controle do quadro blefarítico e estado dos bordos palpebrais.',
    patientGuidance: 'A blefarite é uma condição de controle crônico. A manutenção da higiene diária evita recidivas e terçóis (hordéolos/calázios).'
  },

  // 4. SÍNDROME VISUAL DIGITAL / ASTENOPIA POR TELAS (CVS)
  {
    id: 'protocol-computer-vision',
    clinicalCondition: 'Astenopia Acomodativa & Fadiga Visual Digital (Computer Vision Syndrome)',
    category: 'REFRAVAO_ASTENOPIA',
    summary: 'Cefaleia frontal ou temporal após horas de estudo/trabalho no computador, olhos pesados, ardor, diplopia transitória e embaçamento ao longe pós-trabalho.',
    nonPharmacologicalActions: [
      'Ajustar altura do monitor: a borda superior da tela deve ficar ligeiramente abaixo da linha dos olhos (15° a 20° de inclinação para baixo).',
      'Distância ideal da tela: cerca de 50 a 70 cm (comprimento do braço estendido).',
      'Reduzir brilho da tela e ativar modo noturno / redução de luz azul ao entardecer.',
      'Pausas programadas: Regra 20-20-20.'
    ],
    suggestedDrugs: [
      {
        commercialName: 'Systane Complete / Hyabak',
        activePrinciple: 'Hialuronato de Sódio / Fosfolipídios Nanoemulsionados',
        concentration: '0.15%',
        presentation: 'Frasco conta-gotas 10 mL',
        dosage: 'Instilar 1 gota em cada olho no meio da manhã, após o almoço e no meio da tarde durante a jornada no computador.',
        route: 'Uso Tópico Ocular',
        quantity: '1 frasco'
      }
    ],
    recommendedReturn: 'Retorno em 1 ano ou em 30 dias caso os sintomas de astenopia persistam com os novos óculos prescritos.',
    patientGuidance: 'A taxa de piscamento cai em mais de 60% em frente às telas. A combinação de lentes com filtro azul e lubrificação restaura o conforto visual.'
  },

  // 5. CONJUNTIVITE BACTERIANA AGUDA
  {
    id: 'protocol-bacterial-conjunctivitis',
    clinicalCondition: 'Conjuntivite Bacteriana Aguda / Secreção Mucopurulenta',
    category: 'INFECCAO',
    summary: 'Secreção amarelada ou esverdeada abundante (olho "colado" pela manhã), hiperemia conjuntival intensa, sensação de corpo estranho.',
    nonPharmacologicalActions: [
      'Lavagem frequente com soro fisiológico estéril 0.9% para remover o excesso de secreção antes de pingar o colírio.',
      'Isolamento de toalhas de rosto, fronhas e objetos pessoais para evitar contaminação de familiares.',
      'Lavar as mãos antes e após qualquer manipulação ocular.',
      'Suspender imediatamente o uso de lentes de contato até a resolução completa.'
    ],
    suggestedDrugs: [
      {
        commercialName: 'Vigamox (Moxifloxacino) / Tobrex (Tobramicina)',
        activePrinciple: 'Cloridrato de Moxifloxacino 0.5% ou Tobramicina 0.3%',
        concentration: '0.5%',
        presentation: 'Frasco conta-gotas 5 mL',
        dosage: 'Instilar 1 gota no olho afetado de 4 em 4 horas (4 a 6 vezes ao dia) por 7 dias consecutivos.',
        route: 'Uso Tópico Ocular',
        quantity: '1 frasco'
      }
    ],
    recommendedReturn: 'Retorno em 7 dias para conferência de cura clínica. Procurar atendimento imediato se houver dor intensa, queda brusca da visão ou fotofobia severa.',
    patientGuidance: 'Completar rigorosamente os 7 dias de antibiótico, mesmo se os sintomas melhorarem nas primeiras 48 horas, evitando resistência bacteriana.'
  },

  // 6. DEGENERAÇÃO MACULAR RELACIONADA À IDADE (DMRI SECA)
  {
    id: 'protocol-areds2-macular',
    clinicalCondition: 'DMRI Seca (Drusas Maculares Intermediárias / Prevenção de Progressão)',
    category: 'RETINA_GLAUCOMA',
    summary: 'Presença de drusas maculares confluentes em pacientes com mais de 55 anos. Prevenção de evolução para atrofia geográfica ou neovascularização.',
    nonPharmacologicalActions: [
      'Autoavaliação semanal da visão central monocular utilizando a Tela de Amsler (verificar se linhas retas parecem tortas ou onduladas).',
      'Cessação imediata do tabagismo (o fumo é o principal fator de risco modificável para perda visual na DMRI).',
      'Dieta rica em vegetais verdes escuros (espinafre, couve, brócolis) ricos em luteína, e peixes ricos em Ômega-3 (salmão, sardinha).',
      'Uso de óculos de sol com proteção 100% UVA/UVB em ambientes externos.'
    ],
    suggestedDrugs: [
      {
        commercialName: 'PreserVision AREDS 2 / Vitalux Plus / Ocuvite',
        activePrinciple: 'Luteína 10mg + Zeaxantina 2mg + Vitamina C 500mg + Vitamina E 400UI + Zinco 80mg + Cobre 2mg',
        concentration: 'Fórmula AREDS 2 Estudo Multicêntrico NIH',
        presentation: 'Frasco com 60 cápsulas',
        dosage: 'Tomar 1 cápsula por via oral 2 vezes ao dia (ou 1 cápsula ao dia conforme apresentação do fabricante) junto às principais refeições.',
        route: 'Uso Oral',
        quantity: '1 caixa'
      }
    ],
    recommendedReturn: 'Retorno em 6 meses para retinografia / mapeamento de retina e teste de sensibilidade ao contraste. Se notar distorção súbita na Tela de Amsler, procurar imediatamente.',
    patientGuidance: 'A suplementação com a fórmula AREDS 2 reduz em até 25% o risco de progressão da DMRI para estágios avançados com perda de visão.'
  },

  // 7. CERATITE PONTILHADA / EROSÃO EPITELIAL SUPERFICIAL
  {
    id: 'protocol-punctate-keratitis',
    clinicalCondition: 'Ceratite Pontilhada Superficial (Punctata) / Desepitelização',
    category: 'SUPERFICIE_OCULAR',
    summary: 'Microulcerações epiteliais difusas por ressecamento severo, toxicidade a conservantes ou exposição solar/solda.',
    nonPharmacologicalActions: [
      'Uso estrito de colírios sem conservantes (flaconetes de dose única ou frascos com filtro esterilizante).',
      'Proteção contra vento e radiação ultravioleta.',
      'Suspender lentes de contato até reepitelização total confirmada por biomicroscopia.'
    ],
    suggestedDrugs: [
      {
        commercialName: 'Hyabak PF / Systane Hydration PF',
        activePrinciple: 'Hialuronato de Sódio Sem Conservantes',
        concentration: '0.15%',
        presentation: 'Frasco conta-gotas 10 mL sistema ABAK',
        dosage: 'Instilar 1 gota em cada olho de 2 em 2 horas nas primeiras 48h, reduzindo para 4x ao dia nos dias seguintes.',
        route: 'Uso Tópico Ocular',
        quantity: '1 frasco'
      },
      {
        commercialName: 'Epitezan / Regencel (Pomada Cicatrizante)',
        activePrinciple: 'Retinol (Vitamina A) + Aminoácidos',
        concentration: 'Pomada Epitelizante',
        presentation: 'Bisnaga 3.5g',
        dosage: 'Aplicar uma pequena quantidade no olho afetado ao deitar por 7 a 10 noites.',
        route: 'Uso Tópico Ocular',
        quantity: '1 bisnaga'
      }
    ],
    recommendedReturn: 'Retorno em 48 a 72 horas para reavaliação com fluoresceína do fechamento do epitélio corneano.',
    patientGuidance: 'A córnea cicatriza rapidamente com a lubrificação intensiva e proteção noturna. Evitar esfregar os olhos.'
  }
];
