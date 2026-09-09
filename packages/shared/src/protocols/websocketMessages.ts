/**
 * OPTOTIPO MEIRELLES - PROTOCOLO DE COMUNICAÇÃO LOCAL (LAN WEBSOCKET)
 * Especificação v2.0 - Conexão e Controle Remoto
 */

import { OptotypeType, TumblingEOrientation, LandoltCOrientation, SloanLetter, NumberOptotype, PediatricSymbol } from '../optics/optotypes';

export type ActiveModuleType =
  | 'menu'
  | 'av_distance'
  | 'av_near'
  | 'bichromatic'
  | 'astigmatic_clock'
  | 'jcc'
  | 'worth4dot'
  | 'schober'
  | 'cross_grid'
  | 'contrast'
  | 'amsler'
  | 'color_vision'
  | 'motility'
  | 'fixation'
  | 'low_vision'
  | 'pediatric'
  | 'quick_protocols'
  | 'settings'
  | 'screensaver';

export type EyeTested = 'OD' | 'OE' | 'AO';

export type PresentationDisplayMode = 'full_line' | 'reduced_line' | 'isolated' | 'crowding';

export interface OptotypeStimulusState {
  module: ActiveModuleType;
  eye: EyeTested;
  optotypeType: OptotypeType;
  acuityId: string; // ex: "20_40", "20_20"
  snellen20: string;
  snellen6: string;
  decimal: number;
  logMAR: number;
  relativeScale: number;
  presentationMode: PresentationDisplayMode;
  distanceMeters: number;
  
  // Dados dos estímulos gerados para exibição
  tumblingOrientations?: TumblingEOrientation[];
  landoltOrientations?: LandoltCOrientation[];
  sloanLetters?: SloanLetter[];
  numbers?: NumberOptotype[];
  pediatricSymbols?: PediatricSymbol[];
  
  // Configurações específicas de subtestes
  bichromaticType?: 'letters' | 'numbers' | 'e_chart' | 'rings';
  astigmaticContrast?: number; // 0 a 100%
  jccTargetType?: 'dots' | 'letters' | 'rings';
  worthDistance?: 'distance' | 'near';
  amslerType?: 'standard' | 'inverted' | 'diagonals' | 'macular_grid';
  contrastLevelPercent?: number;
  motilityMode?: 'pursuit' | 'saccades' | 'h_pattern' | 'circular' | 'horizontal' | 'vertical';
  motilitySpeed?: 'slow' | 'medium' | 'fast';
  fixationTarget?: 'dot' | 'cross' | 'star' | 'circle' | 'animated_balloon';
  lowVisionMode?: 'giant_optotype' | 'cf' | 'hm' | 'lp' | 'nlp';
}

export interface PatientTicketCall {
  ticketNumber: string; // Ex: 'P-01', 'A-05', '001'
  patientName: string;
  roomName: string; // Ex: 'Consultório 1'
  examinerName: string; // Ex: 'Dr. Rudson Meirelles'
  calledAt: string; // ISO
  priority?: boolean;
}

/**
 * Mensagens Cliente (Clinical) -> Servidor/TV (Offline TV)
 */
export type ClientMessage =
  | { type: 'PAIR_REQUEST'; pin: string; deviceName: string; clinicRoom: string }
  | { type: 'SET_MODULE'; module: ActiveModuleType }
  | { type: 'SET_OPTOTYPE_TYPE'; optotypeType: OptotypeType }
  | { type: 'SET_ACUITY'; snellen: string }
  | { type: 'RETURN_TO_MENU' }
  | { type: 'SET_STIMULUS'; state: Partial<OptotypeStimulusState> }
  | { type: 'NEXT_LINE' }
  | { type: 'PREV_LINE' }
  | { type: 'RANDOMIZE' }
  | { type: 'SET_EYE'; eye: EyeTested }
  | { type: 'SET_PRESENTATION_MODE'; mode: PresentationDisplayMode }
  | { type: 'SET_DISTANCE'; distanceMeters: number }
  | { type: 'TOGGLE_ISOLATED' }
  | { type: 'TOGGLE_CROWDING' }
  | { type: 'TRIGGER_SCREENSAVER' }
  | { type: 'WAKE_SCREEN' }
  | { type: 'CALL_PATIENT'; ticket: PatientTicketCall }
  | { type: 'CLEAR_PATIENT_CALL' }
  | { type: 'PING' };

/**
 * Mensagens TV -> Servidor/Clinical
 */
export type TVMessage =
  | { type: 'PAIR_CONFIRMED'; deviceId: string; deviceName: string; isCalibrated: boolean; defaultDistance: number }
  | { type: 'PAIR_REJECTED'; reason: string }
  | { type: 'STATE_CHANGED'; state: OptotypeStimulusState; isCalibrated: boolean }
  | { type: 'CALIBRATION_UPDATED'; isCalibrated: boolean; pixelsPerMm: number }
  | { type: 'PATIENT_CALLED'; ticket: PatientTicketCall }
  | { type: 'PONG' };
