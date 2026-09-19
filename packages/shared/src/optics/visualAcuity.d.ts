/**
 * OPTOTIPO MEIRELLES - CÁLCULOS DE ACUIDADE VISUAL E GEOMETRIA ÓPTICA
 * Especificação v2.0 - Alta Precisão Clínica
 */
export interface AcuityLevel {
    id: string;
    snellen20: string;
    snellen6: string;
    decimal: number;
    logMAR: number;
    marMinutes: number;
    relativeScale: number;
}
/**
 * Tabela padrão de níveis de Acuidade Visual (Passos logMAR padrão de 0.1)
 */
export declare const STANDARD_ACUITY_LEVELS: AcuityLevel[];
/**
 * Calcula a altura física exata do optotipo 20/20 (em milímetros) para uma dada distância (em metros).
 * Fórmula trigonométrica baseada no ângulo visual de 5 minutos de arco:
 * H = 2 * D * tan(5' / 2) = 2 * (distMeters * 1000) * tan((5 / 60) * (PI / 180) / 2)
 *
 * @param distanceMeters Distância do olho à tela em metros (ex: 3.0, 4.0, 6.0)
 * @returns Altura física total do optotipo 20/20 em milímetros (mm)
 */
export declare function calculate2020PhysicalHeightMm(distanceMeters: number): number;
/**
 * Calcula a altura física (em mm) para um nível de acuidade específico e distância dada.
 *
 * @param relativeScale Multiplicador relativo ao 20/20 (ex: 20/40 = 2.0, 20/200 = 10.0)
 * @param distanceMeters Distância em metros
 * @returns Altura do optotipo em mm
 */
export declare function calculateOptotypeHeightMm(relativeScale: number, distanceMeters: number): number;
/**
 * Converte altura física em milímetros (mm) para pixels (px) da tela
 * baseado no fator de calibração física da tela.
 *
 * @param heightMm Altura do elemento em mm
 * @param pixelsPerMm Fator de calibração (pixels por milímetro na tela atual)
 * @returns Tamanho em pixels (px)
 */
export declare function mmToPixels(heightMm: number, pixelsPerMm: number): number;
/**
 * Converte notações de acuidade visual
 */
export declare function convertAcuity(value: number, from: 'decimal' | 'logMAR'): AcuityLevel;
//# sourceMappingURL=visualAcuity.d.ts.map