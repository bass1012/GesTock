const formatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })

export function formatCFA(amount: number): string {
    return formatter.format(amount)
}
