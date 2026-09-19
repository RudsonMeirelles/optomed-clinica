/**
 * OPTOTIPO MEIRELLES - CALIBRAÇÃO FÍSICA DA TELA
 * Especificação v2.0 - Requisito Crítico
 */
/**
 * Calibração padrão inicial (estimativa para 1080p típica ~96 DPI = ~3.78 px/mm)
 * Requer calibração real com régua de 100mm pelo examinador.
 */
export const DEFAULT_CALIBRATION = {
    isCalibrated: false,
    referenceBarLengthMm: 100,
    referenceBarPixels: 378,
    pixelsPerMm: 3.78,
    displayScale: 1.0,
    calibratedAt: null,
    defaultDistanceMeters: 3.0,
    screenWidthPx: 1920,
    screenHeightPx: 1080
};
/**
 * Calcula o fator pixelsPerMm a partir do comprimento da barra em pixels
 */
export function calculatePixelsPerMm(barPixels, barLengthMm = 100, fineScale = 1.0) {
    if (barLengthMm <= 0)
        return 3.78;
    return (barPixels / barLengthMm) * fineScale;
}
//# sourceMappingURL=calibration.js.map