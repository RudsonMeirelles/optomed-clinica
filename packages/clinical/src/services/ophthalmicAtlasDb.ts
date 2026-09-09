// Atlas Clínico Oftalmológico e Optométrico: Patologias e Ametropias
// Coleção Completa de Ilustrações Médicas Oficiais em Alta Resolução

import imgAstigmatismo from '../assets/atlas/astigmatismo.png';
import imgMiopia from '../assets/atlas/miopia.png';
import imgHipermetropia from '../assets/atlas/hipermetropia.png';
import imgPresbiopia from '../assets/atlas/presbiopia.png';
import imgCatarata from '../assets/atlas/catarata.png';
import imgCeratocone from '../assets/atlas/ceratocone.png';
import imgGlaucomaDisco from '../assets/atlas/glaucoma_disco_optico.png';
import imgRetinopatia from '../assets/atlas/retinopatia_diabetica.png';
import imgMacula from '../assets/atlas/degeneracao_macular.png';

export interface OphthalmicCondition {
  id: string;
  category: 'ametropia' | 'cornea' | 'retina' | 'cristalino' | 'glaucoma';
  name: string;
  scientificName: string;
  shortDescription: string;
  symptoms: string[];
  findings: string[];
  management: string;
  imageUrl?: string;
  svgIllustration?: string;
}

export const OPHTHALMIC_ATLAS: OphthalmicCondition[] = [
  // 1. MIOPIA (IMAGEM OFICIAL)
  {
    id: 'myopia',
    category: 'ametropia',
    name: 'Miopia',
    scientificName: 'Myopia axialis / refractiva',
    shortDescription: 'Na miopia, a imagem se forma antes da retina. Os raios de luz convergem antes do plano retiniano, geralmente devido ao alongamento axial do olho ou ao excesso de poder refracional da córnea/cristalino, causando grande dificuldade para ver de longe.',
    symptoms: [
      'Dificuldade e visão embaçada para ver de longe',
      'Apertar os olhos para melhorar o foco (efeito estenopeico)',
      'Visão normal ou confortável para leitura próxima',
      'Fadiga ocular ao dirigir ou assistir televisão'
    ],
    findings: [
      'A imagem do objeto distante foca ANTES da retina',
      'Olho axialmente mais longo ou curvatura corneana acentuada',
      'Necessidade de correção com lentes divergentes (côncavas / esférico negativo -)'
    ],
    management: 'Correção óptica com lentes esféricas divergentes (-), lentes de contato ou cirurgia refrativa (LASIK / PRK) após estabilização.',
    imageUrl: imgMiopia
  },

  // 2. HIPERMETROPIA (IMAGEM OFICIAL)
  {
    id: 'hyperopia',
    category: 'ametropia',
    name: 'Hipermetropia',
    scientificName: 'Hypermetropia axialis / refractiva',
    shortDescription: 'Na hipermetropia, a imagem tende a se formar atrás da retina. O ponto focal dos raios luminosos fica posterior ao plano retiniano, ocorrendo por um olho mais curto ou por curvatura insuficiente da córnea/cristalino, exigindo grande esforço de acomodação para perto.',
    symptoms: [
      'Dificuldade e visão próxima desfocada para leitura de perto',
      'Esforço visual e astenopia (cansaço, queimação, lacrimejamento)',
      'Cefaleia frontal no final do dia ou após esforço visual',
      'Em graus elevados, embaçamento também para longe'
    ],
    findings: [
      'Ponto focal virtual posicionado ATRÁS da retina',
      'Globo ocular com comprimento axial menor',
      'Contração constante do músculo ciliar para manter a acomodação'
    ],
    management: 'Correção óptica com lentes convergentes (convexas / esférico positivo +), relaxando o esforço acomodativo e aliviando as queixas de dor de cabeça.',
    imageUrl: imgHipermetropia
  },

  // 3. ASTIGMATISMO (IMAGEM OFICIAL)
  {
    id: 'astigmatism',
    category: 'ametropia',
    name: 'Astigmatismo',
    scientificName: 'Astigmatismus regularis / irregularis',
    shortDescription: 'No astigmatismo, a curvatura irregular da córnea (mais curva em um meridiano e menos curva no meridiano perpendicular) faz com que a luz não seja focalizada em um único ponto, gerando foco anterior e foco posterior, causando visão distorcida, borrada ou com duplicação de contornos.',
    symptoms: [
      'Visão distorcida e borrada tanto para longe quanto para perto',
      'Duplicação de contornos e confusão de letras similares',
      'Fadiga ocular, dor de cabeça frontal e astenopia',
      'Ofuscamento e sensação de raios ao redor de luzes à noite'
    ],
    findings: [
      'Curvatura irregular da córnea com meridianos de potências diferentes',
      'Presença de foco anterior em um meridiano e foco posterior em outro',
      'Eixos de refração distribuídos de 0° a 180°'
    ],
    management: 'Correção com lentes cilíndricas ou tóricas orientadas no eixo refrativo, lentes de contato tóricas ou cirurgia refrativa personalizada.',
    imageUrl: imgAstigmatismo
  },

  // 4. PRESBIOPIA (IMAGEM OFICIAL)
  {
    id: 'presbyopia',
    category: 'ametropia',
    name: 'Presbiopia (Vista Cansada)',
    scientificName: 'Presbyopia senilis',
    shortDescription: 'Redução progressiva da capacidade de acomodação para a visão de perto. Ocorre com o avanço da idade devido à perda de elasticidade do cristalino e à diminuição da potência do músculo ciliar.',
    symptoms: [
      'Dificuldade para leitura de textos pequenos de perto',
      'Necessidade de afastar objetos, livros e o celular para focalizar',
      'Cansaço visual, sonolência e cefaleia ao ler',
      'Mais comum e evidente a partir dos 40 anos de idade'
    ],
    findings: [
      'Perda fisiológica da amplitude de acomodação de Donders',
      'A luz de objetos próximos não converge a tempo na retina',
      'Necessidade de adição esférica positiva (+) de +0.75 até +3.00 D'
    ],
    management: 'A correção depende da necessidade visual do paciente e da avaliação refracional: óculos de leitura monofocais, lentes bifocais ou lentes multifocais progressivas.',
    imageUrl: imgPresbiopia
  },

  // 5. CATARATA (IMAGEM OFICIAL)
  {
    id: 'cataract',
    category: 'cristalino',
    name: 'Catarata',
    scientificName: 'Cataracta senilis / opacitas lentis',
    shortDescription: 'Com o envelhecimento ou por outras causas, as proteínas do cristalino se alteram e acumulam, tornando-o opaco. Isso dificulta a passagem da luz até a retina, causando visão embaçada e redução significativa do contraste.',
    symptoms: [
      'Visão embaçada, opaca e cores desbotadas',
      'Perda de nitidez e sensibilidade ao contraste',
      'Ofuscamento com a luz do sol ou faróis de veículos à noite',
      'Trocas frequentes de grau sem melhora completa'
    ],
    findings: [
      'Cristalino opacificado (nuclear, cortical ou subcapsular)',
      'Bloqueio da passagem de luz transparente para a retina',
      'Acuidade visual com correção refrativa limitada pela opacidade'
    ],
    management: 'A catarata é tratável. A cirurgia de Facoemulsificação com implante de Lente Intraocular (LIO) é segura e altamente eficaz, devolvendo a nitidez e o contraste na grande maioria dos casos.',
    imageUrl: imgCatarata
  },

  // 6. CERATOCONE (IMAGEM OFICIAL)
  {
    id: 'keratoconus',
    category: 'cornea',
    name: 'Ceratocone',
    scientificName: 'Keratoconus progressivus',
    shortDescription: 'Afinamento e protrusão progressiva da córnea, que adquire formato cônico irregular com astigmatismo irregular e assimetria visível na topografia corneana.',
    symptoms: [
      'Distorção e baixa progressiva da visão',
      'Mudança rápida e frequente do grau de astigmatismo',
      'Diplopia monocular (visão dupla ou imagens fantasmas)'
    ],
    findings: [
      'Perfil corneano com protrusão cônica (vermelho) comparado à curvatura regular (azul)',
      'Assimetria e encurvamento acentuado no setor inferior no mapa topográfico',
      'Afinamento estromal apical e estrias de estresse'
    ],
    management: 'Achados suspeitos requerem avaliação com topografia/tomografia corneana. Manejo com óculos (fases iniciais), Lentes de Contato Rígidas/Esclerais, Crosslinking (CXL) para estabilização ou Anel Intraestromal.',
    imageUrl: imgCeratocone
  },

  // 7. REPRESENTAÇÃO DO DISCO ÓPTICO / GLAUCOMA (IMAGEM OFICIAL)
  {
    id: 'glaucoma',
    category: 'glaucoma',
    name: 'Representação do Disco Óptico (Glaucoma)',
    scientificName: 'Glaucoma simplex / Excavatio papillae',
    shortDescription: 'Aumento patológico da relação escavação/disco no nervo óptico, indicando dano progressivo das fibras nervosas que pode comprometer o campo visual de forma silenciosa.',
    symptoms: [
      'Geralmente assintomático nas fases iniciais e intermediárias',
      'Perda gradual da visão periférica e lateral',
      'Necessidade de exames preventivos de rotina'
    ],
    findings: [
      'Aumento da relação escavação/disco (E/D alargada)',
      'Dano progressivo das fibras do nervo óptico',
      'Pode comprometer o campo visual concêntrico',
      'Necessita avaliar pressão intraocular (PIO), papila óptica e campimetria'
    ],
    management: 'Avaliação clínica minuciosa com tonometria, fundoscopia, paquimetria e campo visual. Controle com colírios hipotensores oculares para manter a pressão em níveis seguros e proteger o nervo óptico.',
    imageUrl: imgGlaucomaDisco
  },

  // 8. ALTERAÇÕES MICROVASCULARES DA RETINA (IMAGEM OFICIAL)
  {
    id: 'diabetic_retinopathy',
    category: 'retina',
    name: 'Alterações Microvasculares da Retina',
    scientificName: 'Retinopathia diabetica / vascularis',
    shortDescription: 'Comprometimento dos microvasos retinianos decorrente de diabetes mellitus ou hipertensão arterial, com presença de microaneurismas, hemorragias e exsudatos lipídicos na retina.',
    symptoms: [
      'Pode ser assintomático no início',
      'Visão turva, embaçada ou com manchas',
      'Risco de perda visual se houver edema macular'
    ],
    findings: [
      'Microaneurismas e hemorragias retinianas',
      'Exsudatos lipídicos presentes',
      'Possibilidade de edema macular associado',
      'Necessita avaliação retiniana completa com dilatação'
    ],
    management: 'Controle metabólico e cardiovascular rigoroso. Acompanhamento com mapeamento de retina, retinografia digital, OCT e fotocoagulação a laser ou anti-VEGF conforme orientação médica.',
    imageUrl: imgRetinopatia
  },

  // 9. ALTERAÇÃO MACULAR CENTRAL (IMAGEM OFICIAL)
  {
    id: 'macular_degeneration',
    category: 'retina',
    name: 'Alteração Macular Central (DMRI)',
    scientificName: 'Degeneratio maculae / Maculopathia',
    shortDescription: 'Comprometimento da mácula com presença de drusas e alterações do epitélio pigmentar retiniano, podendo provocar distorção e embaçamento no centro da visão.',
    symptoms: [
      'Comprometimento da visão central fina',
      'Distorção central da imagem (linhas retas tortas)',
      'Presença de drusas e manchas escuras centrais'
    ],
    findings: [
      'Comprometimento macular foveal com drusas presentes',
      'Alteração no teste da Tela de Amsler (metamorfopsia/escotoma)',
      'Requer correlação clínica e exame de OCT de mácula'
    ],
    management: 'Acompanhamento periódico, monitoramento domiciliar regular com Tela de Amsler, controle de fatores de risco (tabagismo, dieta) e suplementação antioxidante conforme protocolo clínico.',
    imageUrl: imgMacula
  }
];
