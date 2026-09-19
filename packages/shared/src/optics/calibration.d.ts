/**
 * OPTOTIPO MEIRELLES - CALIBRAÇÃO FÍSICA DA TELA
 * Especificação v2.0 - Requisito Crítico
 */
export interface DisplayCalibrationData {
    isCalibrated: boolean;
    referenceBarLengthMm: number;
    referenceBarPixels: number;
    pixelsPerMm: number;
    displayScale: number;
    calibratedAt: string | null;
    defaultDistanceMeters: number;
    screenWidthPx: number;
    screenHeightPx: number;
}
/**
 * Calibração padrão inicial (estimativa para 1080p típica ~96 DPI = ~3.78 px/mm)
 * Requer calibração real com régua de 100mm pelo examinador.
 */
export declare const DEFAULT_CALIBRATION: DisplayCalibrationData;
/**
 * Calcula o fator pixelsPerMm a partir do comprimento da barra em pixels
 */
export declare function calculatePixelsPerMm(barPixels: number, barLengthMm?: number, fineScale?: number): number;
//# sourceMappingURL=calibration.d.ts.map