/**
 * Optomed - Utilitários de Matemática Financeira Segura (Fase 8.0)
 * Previne perdas de precisão por ponto flutuante em operações financeiras (moeda em centavos)
 */
/**
 * Converte valor decimal para centavos inteiros (ex: 50.25 -> 5025)
 */
export declare function toCents(amount: number): number;
/**
 * Converte centavos inteiros para valor decimal formatado (ex: 5025 -> 50.25)
 */
export declare function fromCents(cents: number): number;
/**
 * Soma segura de múltiplos valores financeiros decimais via centavos inteiros
 */
export declare function safeSum(...amounts: number[]): number;
/**
 * Subtração segura (a - b) via centavos inteiros
 */
export declare function safeSub(a: number, b: number): number;
/**
 * Multiplicação segura de valor por quantidade ou taxa com desconto opcional
 * Ex: safeMultiply(150.00, 2, 10) => 2 unidades de 150 com 10 de desconto = 290.00
 */
export declare function safeCalculateItemTotal(price: number, quantity?: number, discount?: number): {
    subtotal: number;
    discount: number;
    total: number;
    totalCents: number;
};
/**
 * Formata valor monetário para exibição com símbolo da moeda
 */
export declare function formatCurrencyValue(amount: number, currency?: 'BRL' | 'PYG' | 'USD'): string;
//# sourceMappingURL=financialMath.d.ts.map