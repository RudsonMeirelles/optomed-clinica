// Atlas Clínico Oftalmológico e Optométrico: Patologias e Ametropias
// Fornece ilustrações anatômicas e ópticas realistas para educação do paciente e laudos

export interface OphthalmicCondition {
  id: string;
  category: 'ametropia' | 'cornea' | 'retina' | 'cristalino' | 'glaucoma' | 'anexos';
  name: string;
  scientificName: string;
  shortDescription: string;
  symptoms: string[];
  findings: string[];
  management: string;
  illustrationType: 'optics_diagram' | 'anterior_segment' | 'fundus' | 'slit_lamp';
  svgIllustration: string;
}

export const OPHTHALMIC_ATLAS: OphthalmicCondition[] = [
  // ================= AMETROPIAS =================
  {
    id: 'myopia',
    category: 'ametropia',
    name: 'Miopia',
    scientificName: 'Myopia axialis / refractiva',
    shortDescription: 'O olho é mais longo que o normal ou a córnea tem curvatura excessiva. O ponto focal dos raios luminosos converge antes da retina, provocando visão borrada para longe.',
    symptoms: ['Visão turva para longe', 'Apertar os olhos para focar', 'Cefaleia frontal ao dirigir ou na lousa'],
    findings: ['Globo ocular axialmente aumentado', 'Refração com esférico negativo (-)', 'Melhora imediata com lente divergente'],
    management: 'Lentes esféricas negativas (-), lentes de contato ou cirurgia refrativa (LASIK/PRK).',
    illustrationType: 'optics_diagram',
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
  {
    id: 'hyperopia',
    category: 'ametropia',
    name: 'Hipermetropia',
    scientificName: 'Hypermetropia axialis',
    shortDescription: 'O olho é mais curto no sentido anteroposterior ou o sistema dióptrico é mais plano. Os raios convergem virtualmente atrás da retina, exigindo esforço acomodativo constante.',
    symptoms: ['Astenopia (cansaço ocular)', 'Dor de cabeça ao ler ou usar telas', 'Dificuldade maior para perto'],
    findings: ['Globo ocular curto', 'Câmara anterior mais rasa', 'Refração com esférico positivo (+)'],
    management: 'Lentes esféricas convergentes (+), aliviando o esforço acomodativo do músculo ciliar.',
    illustrationType: 'optics_diagram',
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
  {
    id: 'astigmatism',
    category: 'ametropia',
    name: 'Astigmatismo',
    scientificName: 'Astigmatismus regularis',
    shortDescription: 'Assimetria nas curvaturas corneanas ou cristalinianas, gerando múltiplos pontos focais (Conoide de Sturm).',
    symptoms: ['Distorção das bordas das letras', 'Trocar letras parecidas', 'Visão borrada para longe e perto'],
    findings: ['Diferença de curvatura em ceratometria', 'Refração com componente cilíndrico (-) e eixo'],
    management: 'Lentes cilíndricas/tóricas orientadas no contra-eixo refrativo.',
    illustrationType: 'optics_diagram',
    svgIllustration: `<svg viewBox="0 0 400 240" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="240" fill="#0F172A" rx="16"/>
      <ellipse cx="90" cy="120" rx="18" ry="50" fill="none" stroke="#818CF8" stroke-width="3.5"/>
      <ellipse cx="90" cy="120" rx="12" ry="35" fill="#6366F1" fill-opacity="0.2"/>
      <line x1="90" y1="80" x2="250" y2="120" stroke="#38BDF8" stroke-width="2.5" stroke-dasharray="3 3"/>
      <line x1="90" y1="160" x2="250" y2="120" stroke="#38BDF8" stroke-width="2.5" stroke-dasharray="3 3"/>
      <circle cx="250" cy="120" r="5" fill="#38BDF8"/>
      <text x="250" y="105" fill="#38BDF8" font-size="10" font-weight="bold" text-anchor="middle">Foco Meridiano 1</text>
      <line x1="90" y1="100" x2="330" y2="120" stroke="#F43F5E" stroke-width="2.5"/>
      <line x1="90" y1="140" x2="330" y2="120" stroke="#F43F5E" stroke-width="2.5"/>
      <circle cx="330" cy="120" r="5" fill="#F43F5E"/>
      <text x="330" y="105" fill="#F43F5E" font-size="10" font-weight="bold" text-anchor="middle">Foco Meridiano 2</text>
      <line x1="300" y1="60" x2="300" y2="180" stroke="#F59E0B" stroke-width="3"/>
      <text x="300" y="50" fill="#F59E0B" font-size="11" font-weight="bold" text-anchor="middle">Plano Retiniano</text>
      <text x="200" y="220" fill="#E2E8F0" font-size="11" font-weight="bold" text-anchor="middle">Conoide de Sturm: 2 planos focais distintos</text>
    </svg>`
  },
  {
    id: 'pterygium',
    category: 'cornea',
    name: 'Pterígio',
    scientificName: 'Pterygium conjunctivae',
    shortDescription: 'Crescimento fibrovascular benigno da conjuntiva bulbar que avança sobre a superfície corneana límbica, frequentemente no setor nasal.',
    symptoms: ['Hiperemia conjuntival (olho vermelho)', 'Sensação de corpo estranho ou areia', 'Ardor e queimação'],
    findings: ['Tecido fibrovascular triangular com ápice em direção ao centro da córnea', 'Linha de Stocker'],
    management: 'Óculos com proteção UV400, lubrificantes sem conservante e exérese cirúrgica com transplante conjuntival quando indicado.',
    illustrationType: 'anterior_segment',
    svgIllustration: `<svg viewBox="0 0 400 240" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="240" fill="#0B1329" rx="16"/>
      <ellipse cx="200" cy="120" rx="130" ry="75" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2"/>
      <path d="M 90 120 Q 120 110, 145 118" stroke="#F87171" stroke-width="1.5" fill="none"/>
      <path d="M 85 105 Q 115 108, 140 112" stroke="#EF4444" stroke-width="1.8" fill="none"/>
      <circle cx="200" cy="120" r="50" fill="#0284C7" stroke="#0369A1" stroke-width="3"/>
      <circle cx="200" cy="120" r="22" fill="#0F172A"/>
      <circle cx="192" cy="112" r="5" fill="white" fill-opacity="0.8"/>
      <path d="M 70 120 Q 110 95, 175 116 Q 165 125, 110 145 Z" fill="#FCA5A5" fill-opacity="0.85" stroke="#EF4444" stroke-width="2"/>
      <path d="M 90 120 Q 130 112, 170 118" stroke="#B91C1C" stroke-width="2" fill="none"/>
      <path d="M 100 128 Q 135 122, 165 121" stroke="#DC2626" stroke-width="1.5" fill="none"/>
      <text x="140" y="80" fill="#F87171" font-size="11" font-weight="black">Pterígio Nasal</text>
      <text x="200" y="220" fill="#94A3B8" font-size="11" text-anchor="middle">Proliferação fibrovascular conjuntival sobre o limbo</text>
    </svg>`
  },
  {
    id: 'cataract',
    category: 'cristalino',
    name: 'Catarata Senil',
    scientificName: 'Cataracta senilis nuclearis',
    shortDescription: 'Opacificação progressiva das fibras do cristalino por oxidação proteica, perda de transparência e dispersão anômala da luz.',
    symptoms: ['Visão embaçada como vidro sujo', 'Piora da sensibilidade ao contraste', 'Ofuscamento com faróis à noite'],
    findings: ['Opacidade visível à iluminação oblíqua', 'Esclerose e amarelamento nuclear'],
    management: 'Cirurgia de Facoemulsificação com implante de Lente Intraocular (LIO).',
    illustrationType: 'anterior_segment',
    svgIllustration: `<svg viewBox="0 0 400 240" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="240" fill="#0B1329" rx="16"/>
      <ellipse cx="200" cy="120" rx="130" ry="75" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="2"/>
      <circle cx="200" cy="120" r="50" fill="#78350F" stroke="#451A03" stroke-width="3"/>
      <circle cx="200" cy="120" r="24" fill="#D97706" fill-opacity="0.8"/>
      <circle cx="200" cy="120" r="16" fill="#FDE68A" fill-opacity="0.9"/>
      <circle cx="188" cy="110" r="4" fill="white" fill-opacity="0.7"/>
      <text x="200" y="45" fill="#FBBF24" font-size="12" font-weight="black" text-anchor="middle">Opacidade Cristaliniana Nuclear</text>
      <text x="200" y="220" fill="#94A3B8" font-size="11" text-anchor="middle">Bloqueio e dispersão da luz para a retina</text>
    </svg>`
  },
  {
    id: 'glaucoma',
    category: 'glaucoma',
    name: 'Glaucoma Primário de Ângulo Aberto',
    scientificName: 'Glaucoma simplex / GPAA',
    shortDescription: 'Neuropatia óptica crônica com escavação patológica aumentada, perda do anel neurorretiniano e campo visual concêntrico.',
    symptoms: ['Assintomático até fases avançadas', 'Perda gradual da visão periférica'],
    findings: ['Relação Escavação/Disco (E/D) > 0.6', 'Rechaço dos vasos em baioneta', 'Regra ISNT violada'],
    management: 'Colírios hipotensores oculares, Trabeculoplastia a Laser (SLT) ou cirurgia fistulizante.',
    illustrationType: 'fundus',
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
  },
  {
    id: 'diabetic_retinopathy',
    category: 'retina',
    name: 'Retinopatia Diabética',
    scientificName: 'Retinopathia diabetica',
    shortDescription: 'Microangiopatia oclusiva causada por hiperglicemia crônica, com microaneurismas, hemorragias e exsudatos.',
    symptoms: ['Moscas volantes', 'Visão embaçada ou torta', 'Perda súbita de visão'],
    findings: ['Microaneurismas', 'Hemorragias em chama de vela', 'Exsudatos duros lipídicos e algodonosos'],
    management: 'Controle glicêmico rigoroso (HbA1c < 7%), Fotocoagulação a Laser e anti-VEGF para edema.',
    illustrationType: 'fundus',
    svgIllustration: `<svg viewBox="0 0 400 240" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="240" fill="#0B1329" rx="16"/>
      <circle cx="200" cy="120" r="95" fill="#B45309" stroke="#EA580C" stroke-width="3"/>
      <circle cx="150" cy="120" r="22" fill="#FDE68A"/>
      <circle cx="230" cy="120" r="16" fill="#78350F" fill-opacity="0.6"/>
      <path d="M 150 120 Q 180 85, 230 75 Q 265 72, 290 70" stroke="#991B1B" stroke-width="2.5" fill="none"/>
      <path d="M 150 120 Q 180 155, 230 165 Q 265 168, 290 170" stroke="#991B1B" stroke-width="2.5" fill="none"/>
      <circle cx="210" cy="105" r="2.5" fill="#DC2626"/>
      <circle cx="240" cy="98" r="2" fill="#DC2626"/>
      <ellipse cx="195" cy="90" rx="8" ry="4" fill="#991B1B" transform="rotate(-20 195 90)"/>
      <circle cx="245" cy="135" r="2.5" fill="#FEF08A"/>
      <circle cx="250" cy="138" r="2" fill="#FEF08A"/>
      <text x="200" y="220" fill="#FEF08A" font-size="11" font-weight="bold" text-anchor="middle">Microaneurismas • Hemorragias • Exsudatos</text>
    </svg>`
  },
  {
    id: 'keratoconus',
    category: 'cornea',
    name: 'Ceratocone',
    scientificName: 'Keratoconus progressivus',
    shortDescription: 'Ectasia corneana bilateral progressiva com afinamento estromal e protrusão apical cônica.',
    symptoms: ['Piora rápida do astigmatismo', 'Fantasmas nas imagens', 'Dificuldade de acuidade com óculos'],
    findings: ['Protrusão cônica da córnea', 'Anel de Fleischer', 'Estrias de Vogt'],
    management: 'Lentes de contato RGP/Esclerais, Crosslinking de Colágeno (CXL) ou Anel Intraestromal.',
    illustrationType: 'slit_lamp',
    svgIllustration: `<svg viewBox="0 0 400 240" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="240" fill="#0B1329" rx="16"/>
      <path d="M 60 40 C 90 80, 120 100, 200 100 C 230 100, 250 115, 270 120 C 250 125, 230 140, 200 140 C 120 140, 90 160, 60 200" fill="none" stroke="#38BDF8" stroke-width="4"/>
      <path d="M 120 60 Q 230 110, 260 120 Q 230 130, 120 180" fill="none" stroke="#22D3EE" stroke-width="6" stroke-linecap="round" opacity="0.85"/>
      <circle cx="265" cy="120" r="5" fill="#F43F5E"/>
      <text x="290" y="110" fill="#F43F5E" font-size="11" font-weight="black">Ápice Cônico</text>
      <text x="200" y="225" fill="#94A3B8" font-size="11" text-anchor="middle">Afinamento estromal e protrusão cônica</text>
    </svg>`
  }
];
