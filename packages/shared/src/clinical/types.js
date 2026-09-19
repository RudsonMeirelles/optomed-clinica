export function calculateAge(birthDateStr) {
    if (!birthDateStr || !birthDateStr.trim())
        return null;
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime()))
        return null;
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    const days = today.getDate() - birth.getDate();
    if (days < 0) {
        months -= 1;
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }
    if (years < 0)
        return null;
    let formatted = '';
    if (years === 0) {
        formatted = months <= 1 ? `${Math.max(0, months)} mês` : `${months} meses`;
    }
    else if (years === 1) {
        formatted = months > 0 ? `1 ano e ${months} m` : '1 ano';
    }
    else {
        formatted = `${years} anos`;
    }
    return {
        years,
        months,
        days: Math.max(0, days),
        formatted,
        isPediatric: years <= 12,
        isPresbyopic: years >= 40
    };
}
//# sourceMappingURL=types.js.map