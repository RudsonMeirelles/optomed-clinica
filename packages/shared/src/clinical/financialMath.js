/**
 * Optomed - Utilitários de Matemática Financeira Segura (Fase 8.0)
 * Previne perdas de precisão por ponto flutuante em operações financeiras (moeda em centavos)
 */
/**
 * Converte valor decimal para centavos inteiros (ex: 50.25 -> 5025)
 */
export function toCents(amount) {
    if (typeof amount !== 'number' || isNaN(amount))
        return 0;
    return Math.round(amount * 100);
}
/**
 * Converte centavos inteiros para valor decimal formatado (ex: 5025 -> 50.25)
 */
export function fromCents(cents) {
    if (typeof cents !== 'number' || isNaN(cents))
        return 0;
    return Math.round(cents) / 100;
}
/**
 * Soma segura de múltiplos valores financeiros decimais via centavos inteiros
 */
export function safeSum(...amounts) {
    const totalCents = amounts.reduce((acc, curr) => acc + toCents(curr || 0), 0);
    return fromCents(totalCents);
}
/**
 * Subtração segura (a - b) via centavos inteiros
 */
export function safeSub(a, b) {
    return fromCents(toCents(a || 0) - toCents(b || 0));
}
/**
 * Multiplicação segura de valor por quantidade ou taxa com desconto opcional
 * Ex: safeMultiply(150.00, 2, 10) => 2 unidades de 150 com 10 de desconto = 290.00
 */
export function safeCalculateItemTotal(price, quantity = 1, discount = 0) {
    const qty = Math.max(0, quantity);
    const unitPriceCents = toCents(price);
    const subtotalCents = unitPriceCents * qty;
    const discountCents = Math.min(subtotalCents, toCents(discount));
    const finalCents = Math.max(0, subtotalCents - discountCents);
    return {
        subtotal: fromCents(subtotalCents),
        discount: fromCents(discountCents),
        total: fromCents(finalCents),
        totalCents: finalCents
    };
}
/**
 * Formata valor monetário para exibição com símbolo da moeda
 */
export function formatCurrencyValue(amount, currency = 'BRL') {
    const safeAmount = fromCents(toCents(amount));
    if (currency === 'PYG') {
        // Guaranis normalmente não usam decimais fracionados na prática clínica
        return `Gs. ${Math.round(safeAmount).toLocaleString('es-PY')}`;
    }
    if (currency === 'USD') {
        return `$ ${safeAmount.toFixed(2)}`;
    }
    return `R$ ${safeAmount.toFixed(2).replace('.', ',')}`;
}
//# sourceMappingURL=financialMath.js.map