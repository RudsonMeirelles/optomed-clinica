/**
 * OPTOTIPO MEIRELLES - PROTOCOLOS RÁPIDOS DE ATENDIMENTO
 * Especificação v2.0 - Automação e sequências clínicas
 */

import { ActiveModuleType } from '../protocols/websocketMessages';

export interface ProtocolStep {
  stepNumber: number;
  title: string;
  description: string;
  module: ActiveModuleType;
  defaultAcuityId?: string;
  defaultEye?: 'OD' | 'OE' | 'AO';
  notes?: string;
}

export interface ClinicalProtocol {
  id: string;
  name: string;
  category: 'geral' | 'pediatrico' | 'especializado';
  description: string;
  steps: ProtocolStep[];
}

export const DEFAULT_CLINICAL_PROTOCOLS: ClinicalProtocol[] = [
  {
    id: 'general_consultation',
    name: 'Consulta Geral / Rotina',
    category: 'geral',
    description: 'Fluxo completo para avaliação visual e refrativa padrão',
    steps: [
      { stepNumber: 1, title: 'AVsc OD (Longe)', description: 'Acuidade Visual sem correção Olho Direito', module: 'av_distance', defaultEye: 'OD', defaultAcuityId: '20_40' },
      { stepNumber: 2, title: 'AVsc OE (Longe)', description: 'Acuidade Visual sem correção Olho Esquerdo', module: 'av_distance', defaultEye: 'OE', defaultAcuityId: '20_40' },
      { stepNumber: 3, title: 'AVsc AO (Longe)', description: 'Acuidade Visual sem correção Ambos os Olhos', module: 'av_distance', defaultEye: 'AO', defaultAcuityId: '20_30' },
      { stepNumber: 4, title: 'Teste Bicromático', description: 'Refinamento esférico vermelho/verde', module: 'bichromatic', defaultEye: 'OD' },
      { stepNumber: 5, title: 'Relógio Astigmático', description: 'Pesquisa de astigmatismo e meridianos principais', module: 'astigmatic_clock', defaultEye: 'OD' },
      { stepNumber: 6, title: 'Cilindro Cruzado (JCC)', description: 'Refinamento de eixo e potência cilíndrica', module: 'jcc', defaultEye: 'OD' },
      { stepNumber: 7, title: 'Worth 4 Dot', description: 'Avaliação de fusão, diplopia e supressão', module: 'worth4dot', defaultEye: 'AO' },
      { stepNumber: 8, title: 'AV Perto / Adição', description: 'Leitura de perto e teste de presbiopia', module: 'av_near', defaultEye: 'AO' }
    ]
  },
  {
    id: 'pediatric_protocol',
    name: 'Protocolo Pediátrico',
    category: 'pediatrico',
    description: 'Sequência adaptada para crianças com símbolos e fixação animada',
    steps: [
      { stepNumber: 1, title: 'Alvo de Fixação / Atenção', description: 'Captura da atenção visual com alvo lúdico', module: 'fixation', defaultEye: 'AO' },
      { stepNumber: 2, title: 'Motilidade Ocular', description: 'Acompanhamento suave e movimentos sacádicos', module: 'motility', defaultEye: 'AO' },
      { stepNumber: 3, title: 'Optotipos Pediátricos OD', description: 'Acuidade com figuras geométricas padronizadas', module: 'pediatric', defaultEye: 'OD', defaultAcuityId: '20_60' },
      { stepNumber: 4, title: 'Optotipos Pediátricos OE', description: 'Acuidade com figuras geométricas padronizadas', module: 'pediatric', defaultEye: 'OE', defaultAcuityId: '20_60' },
      { stepNumber: 5, title: 'Worth 4 Dot Perto', description: 'Avaliação da visão binocular com luzes coloridas', module: 'worth4dot', defaultEye: 'AO' }
    ]
  },
  {
    id: 'macular_retina_protocol',
    name: 'Avaliação Macular / Retina',
    category: 'especializado',
    description: 'Investigação funcional de metamorfopsias, escotomas e sensibilidade',
    steps: [
      { stepNumber: 1, title: 'Tela de Amsler OD', description: 'Pesquisa de distorção de linhas e escotomas centrais', module: 'amsler', defaultEye: 'OD' },
      { stepNumber: 2, title: 'Tela de Amsler OE', description: 'Pesquisa de distorção de linhas e escotomas centrais', module: 'amsler', defaultEye: 'OE' },
      { stepNumber: 3, title: 'Sensibilidade ao Contraste', description: 'Avaliação da resposta em níveis reduzidos de contraste', module: 'contrast', defaultEye: 'AO' },
      { stepNumber: 4, title: 'Triagem Cromática Digital', description: 'Triagem informativa de discriminação de cores', module: 'color_vision', defaultEye: 'AO' }
    ]
  },
  {
    id: 'low_vision_protocol',
    name: 'Protocolo Baixa Visão / Visão Subnormal',
    category: 'especializado',
    description: 'Optotipos ampliados, graduação de estímulos e registros operacionais CF/HM/LP/NLP',
    steps: [
      { stepNumber: 1, title: 'Optotipo Gigante 20/400+', description: 'Avaliação em distâncias adaptadas (1m a 3m)', module: 'low_vision', defaultEye: 'OD' },
      { stepNumber: 2, title: 'Sensibilidade a Alto Contraste', description: 'Detecção de estímulos em alto contraste reverso', module: 'contrast', defaultEye: 'OD' },
      { stepNumber: 3, title: 'Registro Operacional (CF/HM/LP/NLP)', description: 'Anotação estruturada da capacidade funcional', module: 'low_vision', defaultEye: 'OE' }
    ]
  }
];
