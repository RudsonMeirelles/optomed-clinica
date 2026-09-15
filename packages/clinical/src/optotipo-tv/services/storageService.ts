import { DisplayCalibrationData, DEFAULT_CALIBRATION } from '@optotipo/shared';

const CALIBRATION_KEY = 'optotipo_meirelles_calibration_v2';
const SETTINGS_KEY = 'optotipo_meirelles_settings_v2';

export interface TVAppSettings {
  defaultDistanceMeters: number;
  autoScreenSaverMinutes: number;
  soundFeedback: boolean;
  pinCode: string;
  roomName: string;
  serverIp: string;
}

export const DEFAULT_TV_SETTINGS: TVAppSettings = {
  defaultDistanceMeters: 3.5, // Padrão calibrado para o consultório (3,5 metros)
  autoScreenSaverMinutes: 30,
  soundFeedback: true,
  pinCode: '7492',
  roomName: 'Consultório Meirelles',
  serverIp: '192.168.1.144'
};

export function loadCalibration(): DisplayCalibrationData {
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY);
    if (!raw) {
      return {
        ...DEFAULT_CALIBRATION,
        defaultDistanceMeters: 3.5,
        screenWidthPx: 1600,
        screenHeightPx: 900
      };
    }
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      defaultDistanceMeters: parsed.defaultDistanceMeters || 3.5
    };
  } catch {
    return {
      ...DEFAULT_CALIBRATION,
      defaultDistanceMeters: 3.5,
      screenWidthPx: 1600,
      screenHeightPx: 900
    };
  }
}

export function saveCalibration(data: DisplayCalibrationData): void {
  try {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar calibração no armazenamento local:', err);
  }
}

export function loadSettings(): TVAppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_TV_SETTINGS;
    return { ...DEFAULT_TV_SETTINGS, ...JSON.parse(raw), defaultDistanceMeters: 3.5 };
  } catch {
    return DEFAULT_TV_SETTINGS;
  }
}

export function saveSettings(settings: TVAppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Erro ao salvar configurações no armazenamento local:', err);
  }
}
