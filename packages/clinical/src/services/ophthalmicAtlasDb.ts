// Atlas Clínico Oftalmológico e Optométrico: Patologias e Ametropias
// Integra ilustrações anatômicas médicas oficiais em alta resolução para educação do paciente e laudos

import imgAstigmatismo from '../assets/atlas/astigmatismo.png';
import imgCatarata from '../assets/atlas/catarata.png';
import imgCeratocone from '../assets/atlas/ceratocone.png';
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
  // 1. ASTIGMATISMO (IMAGEM OFICIAL)
  {
    id: 'astigmatism',
    category: 'ametropia',
    name: 'Astigmatismo',
    scientificName: 'Astigmatismus regularis / irregularis',
    shortDescription: 'Córnea com curvatura irregular (mais curva em um meridiano e menos curva no perpendicular). A luz que entra no olho não é focalizada em um único ponto, gerando foco anterior e foco posterior, causando visão distorcida, borrada ou com duplicação de contornos.',
    symptoms: [
      'Visão distorcida para longe e para perto',
      'Borramento ou duplicação de contornos e letras',
      'Fadiga ocular, dor de cabeça frontal e astenopia',
      'Sensibilidade e ofuscamento com luzes à noite'
    ],
    findings: [
      'Curvatura irregular da superfície corneana',
      'Dois meridianos focais principais com potências distintas',
      'Avaliação pelo disco de plácido e ceratometria (K1 ≠ K2)'
    ],
    management: 'Correção com lentes esferocilíndricas (tóricas) com eixo orientado, lentes de contato tóricas ou cirurgia refrativa personalizada.',
    imageUrl: imgAstigmatismo
  },

  // 2. CATARATA (IMAGEM OFICIAL)
  {
    id: 'cataract',
    category: 'cristalino',
    name: 'Catarata',
    scientificName: 'Cataracta senilis / opacitas lentis',
    shortDescription: 'Com o envelhecimento ou por outras causas, as proteínas do cristalino se alteram e acumulam, tornando-o opaco. Isso dificulta a passagem da luz até a retina, provocando visão embaçada e perda de contraste.',
    symptoms: [
      'Visão embaçada, opaca e cores desbotadas',
      'Diminuição acentuada da sensibilidade ao contraste',
      'Halos e brilho incômodo ao redor de faróis e luzes',
      'Necessidade de trocas frequentes de óculos (miopização)'
    ],
    findings: [
      'Cristalino opacificado (nuclear, cortical ou subcapsular)',
      'Perda de transparência do meio refrativo ocular',
      'Diminuição da acuidade visual não corrigível totalmente por lentes'
    ],
    management: 'A catarata é tratável. A cirurgia de Facoemulsificação com implante de Lente Intraocular (LIO) é segura e eficaz, devolvendo a nitidez e as cores vivas na maioria dos casos.',
    imageUrl: imgCatarata
  },

  // 3. CERATOCONE (IMAGEM OFICIAL)
  {
    id: 'keratoconus',
    category: 'cornea',
    name: 'Ceratocone',
    scientificName: 'Keratoconus progressivus',
    shortDescription: 'Afinamento e protrusão progressiva da córnea em formato cônico, gerando astigmatismo irregular acentuado com assimetria e encurvamento inferior evidente no mapa topográfico.',
    symptoms: [
      'Distorção e diminuição progressiva da visão',
      'Troca rápida de óculos sem atingir nitidez de 100%',
      'Imagens fantasmas (poliopia monocular) e halos noturnos'
    ],
    findings: [
      'Perfil corneano com protrusão cônica (vermelho) comparado à curvatura regular (azul)',
      'Assimetria e encurvamento inferior no mapa topográfico',
      'Afinamento estromal apical, anel de Fleischer e estrias de Vogt'
    ],
    management: 'Avaliação especializada com topografia/tomografia corneana. Manejo com óculos (fases iniciais), Lentes de Contato Especiais (RGP / Esclerais), Crosslinking de Colágeno (CXL) para frear a progressão ou Anel Intraestromal.',
    imageUrl: imgCeratocone
  },

  // 4. ALTERAÇÕES MICROVASCULARES / RETINOPATIA DIABÉTICA (IMAGEM OFICIAL)
  {
    id: 'diabetic_retinopathy',
    category: 'retina',
    name: 'Alterações Microvasculares da Retina',
    scientificName: 'Retinopathia diabetica / vascularis',
    shortDescription: 'Comprometimento da microcirculação retiniana decorrente de hiperglicemia, hipertensão ou vasculopatias, levando a microaneurismas, hemorragias e exsudatos lipídicos na retina.',
    symptoms: [
      'Pode ser assintomático nas fases iniciais',
      'Visão embaçada, manchas escuras ou moscas volantes',
      'Distorção central caso haja presença de edema macular'
    ],
    findings: [
      'Microaneurismas e hemorragias puntiformes e em chama de vela',
      'Exsudatos duros lipídicos amarelos agrupados',
      'Potencial presença de edema macular com espessamento retiniano',
      'Necessita avaliação retiniana completa com dilatação e mapeamento de retina'
    ],
    management: 'Controle sistêmico rigoroso (glicemia e pressão arterial). Exame periódico de fundo de olho, mapeamento de retina, OCT e indicação de fotocoagulação a laser ou injeções anti-VEGF conforme gravidade.',
    imageUrl: imgRetinopatia
  },

  // 5. ALTERAÇÃO MACULAR CENTRAL / DMRI (IMAGEM OFICIAL)
  {
    id: 'macular_degeneration',
    category: 'retina',
    name: 'Alteração Macular Central (DMRI)',
    scientificName: 'Degeneratio maculae luteae / Maculopathia',
    shortDescription: 'Comprometimento da mácula (região central da retina responsável pela visão fina de detalhes), com presença de drusas e alterações pigmentares, podendo distorcer a visão central.',
    symptoms: [
      'Distorção central da visão (linhas retas parecem onduladas)',
      'Mancha escura ou borrada no centro do campo visual',
      'Dificuldade para reconhecer rostos e realizar leitura fina',
      'Distorção evidenciada na Tela de Amsler'
    ],
    findings: [
      'Comprometimento da mácula com presença de drusas (depósitos amarelados)',
      'Tela de Amsler alterada (metamorfopsia ou escotoma central)',
      'Alteração do reflexo foveal requerendo correlação com OCT'
    ],
    management: 'Suplementação vitamínica antioxidante específica (fórmula AREDS 2), monitoramento domiciliar regular com Tela de Amsler e acompanhamento com retinólogo.',
    imageUrl: imgMacula
  },

  // 6. MIOPIA (SIMULAÇÃO ÓPTICA)
  {
    id: 'myopia',
    category: 'ametropia',
    name: 'Miopia',
    scientificName: 'Myopia axialis / refractiva',
    shortDescription: 'O olho é mais longo que o normal ou a córnea é muito curva. Os raios luminosos convergem antes da retina, provocando visão borrada para objetos distantes.',
    symptoms: ['Visão turva para longe', 'Apertar as pálpebras para focar', 'Cansaço visual ao dirigir'],
    findings: ['Globo ocular longo', 'Refração com esférico negativo (-)', 'Ponto focal anterior à retina'],
    management: 'Lentes divergentes com dioptria negativa (-), lentes de contato ou cirurgia a laser.',
    svgIllustration: `<svg viewBox="0 0 400 240" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="myoEyeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1E293B" />
          <stop offset="100%" stop-color="#0F172A" />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#myoEyeGrad)" rx="16"/>
      <path d="M 80 120 C 80 60, 200 40, 340 55 C 370 120, 370 120, 340 185 C 200 200, 80 180, 80 120 Z" fill="#0284C7" fill-opacity="0.15" stroke="#38BDF8" stroke-width="2.5"/>
      <path d="M 80 75 C 50 95, 50 145, 80 165" fill="none" stroke="#60A5FA" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="120" cy="120" rx="10" ry="32" fill="#93C5FD" fill-opacity="0.6" stroke="#DBEAFE" stroke-width="2"/>
      <path d="M 330 65 C 360 100, 360 140, 330 175" fill="none" stroke="#F59E0B" stroke-width="4" stroke-dasharray="2 4"/>
      <text x="330" y="50" fill="#F59E0B" font-size="11" font-weight="bold" text-anchor="middle">Retina</text>
      <line x1="15" y1="95" x2="80" y2="95" stroke="#FBBF24" stroke-width="2.5"/>
      <line x1="15" y1="120" x2="80" y2="120" stroke="#FBBF24" stroke-width="2.5"/>
      <line x1="15" y1="145" x2="80" y2="145" stroke="#FBBF24" stroke-width="2.5"/>
      <path d="M 120 95 L 245 120 L 335 145" stroke="#EF4444" stroke-width="2.5" stroke-dasharray="4 2"/>
      <path d="M 120 145 L 245 120 L 335 95" stroke="#EF4444" stroke-width="2.5" stroke-dasharray="4 2"/>
      <line x1="120" y1="120" x2="335" y2="120" stroke="#EF4444" stroke-width="1.5" opacity="0.6"/>
      <circle cx="245" cy="120" r="6" fill="#EF4444"/>
      <circle cx="245" cy="120" r="12" fill="#EF4444" fill-opacity="0.3"/>
      <text x="245" y="105" fill="#F87171" font-size="11" font-weight="black" text-anchor="middle">Foco Anterior</text>
      <text x="200" y="225" fill="#94A3B8" font-size="11" font-weight="bold" text-anchor="middle">Raios convergem ANTES da retina</text>
    </svg>`
  },

  // 7. HIPERMETROPIA (SIMULAÇÃO ÓPTICA)
  {
    id: 'hyperopia',
    category: 'ametropia',
    name: 'Hipermetropia',
    scientificName: 'Hypermetropia axialis',
    shortDescription: 'O olho é mais curto ou a curvatura é menor. Os raios luminosos convergem teoricamente atrás da retina, exigindo acomodação constante do cristalino.',
    symptoms: ['Cansaço e queimação nos olhos ao ler', 'Dor de cabeça ao fim do dia', 'Dificuldade maior de foco para perto'],
    findings: ['Globo ocular curto', 'Refração com esférico positivo (+)', 'Foco virtual posterior à retina'],
    management: 'Lentes convergentes com dioptria positiva (+), relaxando a musculatura ciliar.',
    svgIllustration: `<svg viewBox="0 0 400 240" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="hypEyeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1E293B" />
          <stop offset="100%" stop-color="#0F172A" />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#hypEyeGrad)" rx="16"/>
      <path d="M 80 120 C 80 65, 180 50, 290 60 C 315 120, 315 120, 290 180 C 180 190, 80 175, 80 120 Z" fill="#10B981" fill-opacity="0.15" stroke="#34D399" stroke-width="2.5"/>
      <path d="M 80 75 C 55 95, 55 145, 80 165" fill="none" stroke="#6EE7B7" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="120" cy="120" rx="9" ry="30" fill="#A7F3D0" fill-opacity="0.6" stroke="#D1FAE5" stroke-width="2"/>
      <path d="M 285 68 C 305 100, 305 140, 285 172" fill="none" stroke="#F59E0B" stroke-width="4"/>
      <text x="285" y="52" fill="#F59E0B" font-size="11" font-weight="bold" text-anchor="middle">Retina</text>
      <line x1="15" y1="95" x2="80" y2="95" stroke="#FBBF24" stroke-width="2.5"/>
      <line x1="15" y1="120" x2="80" y2="120" stroke="#FBBF24" stroke-width="2.5"/>
      <line x1="15" y1="145" x2="80" y2="145" stroke="#FBBF24" stroke-width="2.5"/>
      <path d="M 120 95 L 285 110 L 360 120" stroke="#F59E0B" stroke-width="2.5"/>
      <path d="M 120 145 L 285 130 L 360 120" stroke="#F59E0B" stroke-width="2.5"/>
      <line x1="120" y1="120" x2="360" y2="120" stroke="#F59E0B" stroke-width="1.5" opacity="0.6"/>
      <circle cx="360" cy="120" r="6" fill="#F59E0B"/>
      <circle cx="360" cy="120" r="12" fill="#F59E0B" fill-opacity="0.3"/>
      <text x="360" y="105" fill="#FBBF24" font-size="11" font-weight="black" text-anchor="middle">Foco Posterior</text>
      <text x="200" y="225" fill="#94A3B8" font-size="11" font-weight="bold" text-anchor="middle">Raios convergem ATRÁS da retina</text>
    </svg>`
  },

  // 8. GLAUCOMA (SIMULAÇÃO ANATÔMICA)
  {
    id: 'glaucoma',
    category: 'glaucoma',
    name: 'Glaucoma',
    scientificName: 'Glaucoma simplex / GPAA',
    shortDescription: 'Aumento patológico da escavação da papila óptica e afinamento da camada de fibras nervosas, com perda concêntrica de campo visual.',
    symptoms: ['Silencioso nas fases iniciais', 'Perda gradual da visão periférica', 'Visão tubular tardia'],
    findings: ['Escavação aumentada (E/D > 0.6)', 'Rechaço vascular em baioneta', 'Pressão intraocular elevada ou limítrofe'],
    management: 'Colírios hipotensores oculares para preservação do campo visual e proteção do nervo óptico.',
    svgIllustration: `<svg viewBox="0 0 400 240" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="240" fill="#0B1329" rx="16"/>
      <circle cx="200" cy="120" r="90" fill="#9A3412" stroke="#EA580C" stroke-width="3"/>
      <circle cx="200" cy="120" r="42" fill="#FBBF24"/>
      <ellipse cx="202" cy="120" rx="34" ry="32" fill="#FEF08A" stroke="#F59E0B" stroke-width="2"/>
      <path d="M 200 120 Q 185 100, 160 80 Q 130 70, 115 65" stroke="#DC2626" stroke-width="3.5" fill="none"/>
      <path d="M 200 120 Q 185 140, 160 160 Q 130 170, 115 175" stroke="#DC2626" stroke-width="3.5" fill="none"/>
      <path d="M 200 120 Q 220 95, 250 85 Q 275 80, 290 75" stroke="#B91C1C" stroke-width="2.5" fill="none"/>
      <path d="M 200 120 Q 220 145, 250 155 Q 275 160, 290 165" stroke="#B91C1C" stroke-width="2.5" fill="none"/>
      <text x="200" y="25" fill="#EF4444" font-size="12" font-weight="black" text-anchor="middle">Papila Glaucomatosa (E/D 0.8)</text>
      <text x="200" y="225" fill="#FEF08A" font-size="10" font-weight="bold" text-anchor="middle">Escavação aumentada com rechaço vascular</text>
    </svg>`
  }
];
