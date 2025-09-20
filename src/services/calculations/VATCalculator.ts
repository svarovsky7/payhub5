/**
 * VAT calculation service
 * Replaces database functions: fn_recalc_invoice_amounts, calculate_payment_vat
 */

export interface VATCalculationResult {
  netAmount: number
  vatAmount: number
  totalAmount: number
  vatRate: number
}

export class VATCalculator {
  /**
   * Calculate VAT from gross amount (total with VAT)
   * Used when user enters total amount including VAT
   */
  static calculateFromGross(
    grossAmount: number,
    vatRate: number = 20
  ): VATCalculationResult {
    // Validate inputs
    if (grossAmount < 0) {
      throw new Error('Gross amount cannot be negative')
    }
    if (vatRate < 0 || vatRate > 100) {
      throw new Error('VAT rate must be between 0 and 100')
    }

    // Calculate VAT and net amounts
    const vatDivisor = 100 + vatRate
    const vatAmount = grossAmount * vatRate / vatDivisor
    const netAmount = grossAmount - vatAmount

    return {
      netAmount: this.roundMoney(netAmount),
      vatAmount: this.roundMoney(vatAmount),
      totalAmount: this.roundMoney(grossAmount),
      vatRate
    }
  }

  /**
   * Calculate VAT from net amount (amount without VAT)
   * Used when user enters amount excluding VAT
   */
  static calculateFromNet(
    netAmount: number,
    vatRate: number = 20
  ): VATCalculationResult {
    // Validate inputs
    if (netAmount < 0) {
      throw new Error('Net amount cannot be negative')
    }
    if (vatRate < 0 || vatRate > 100) {
      throw new Error('VAT rate must be between 0 and 100')
    }

    // Calculate VAT and total amounts
    const vatAmount = netAmount * vatRate / 100
    const totalAmount = netAmount + vatAmount

    return {
      netAmount: this.roundMoney(netAmount),
      vatAmount: this.roundMoney(vatAmount),
      totalAmount: this.roundMoney(totalAmount),
      vatRate
    }
  }

  /**
   * Recalculate all amounts based on what field was changed
   */
  static recalculateAmounts(
    changedField: 'total' | 'net' | 'vat',
    values: {
      total?: number
      net?: number
      vat?: number
      vatRate?: number
    }
  ): VATCalculationResult {
    const vatRate = values.vatRate ?? 20

    switch (changedField) {
      case 'total':
        // User changed total amount - recalculate net and VAT
        return this.calculateFromGross(values.total ?? 0, vatRate)

      case 'net':
        // User changed net amount - recalculate VAT and total
        return this.calculateFromNet(values.net ?? 0, vatRate)

      case 'vat': {
        // User changed VAT amount - recalculate net (keep total)
        const total = values.total ?? 0
        const vat = values.vat ?? 0
        const net = total - vat
        return {
          netAmount: this.roundMoney(net),
          vatAmount: this.roundMoney(vat),
          totalAmount: this.roundMoney(total),
          vatRate
        }
      }
    }
  }

  /**
   * Calculate VAT for multiple items
   */
  static calculateForItems(
    items: Array<{
      quantity: number
      unitPrice: number
      vatRate?: number
      discount?: number
    }>,
    defaultVatRate: number = 20
  ): {
    items: Array<VATCalculationResult & { quantity: number; unitPrice: number }>
    totals: VATCalculationResult
  } {
    const calculatedItems = items.map(item => {
      const subtotal = item.quantity * item.unitPrice
      const discountAmount = item.discount ? subtotal * item.discount / 100 : 0
      const netAmount = subtotal - discountAmount
      const result = this.calculateFromNet(netAmount, item.vatRate ?? defaultVatRate)

      return {
        ...result,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }
    })

    // Calculate totals
    const totals = calculatedItems.reduce(
      (acc, item) => ({
        netAmount: acc.netAmount + item.netAmount,
        vatAmount: acc.vatAmount + item.vatAmount,
        totalAmount: acc.totalAmount + item.totalAmount,
        vatRate: defaultVatRate
      }),
      { netAmount: 0, vatAmount: 0, totalAmount: 0, vatRate: defaultVatRate }
    )

    return {
      items: calculatedItems,
      totals: {
        netAmount: this.roundMoney(totals.netAmount),
        vatAmount: this.roundMoney(totals.vatAmount),
        totalAmount: this.roundMoney(totals.totalAmount),
        vatRate: totals.vatRate
      }
    }
  }

  /**
   * Validate VAT calculation consistency
   * Used for CHECK constraint validation
   */
  static validateAmounts(
    netAmount: number,
    vatAmount: number,
    totalAmount: number,
    tolerance: number = 0.01
  ): boolean {
    const calculatedTotal = this.roundMoney(netAmount + vatAmount)
    const difference = Math.abs(calculatedTotal - totalAmount)
    return difference <= tolerance
  }

  /**
   * Round money to 2 decimal places (kopecks)
   */
  private static roundMoney(amount: number): number {
    return Math.round(amount * 100) / 100
  }

  /**
   * Format money for display
   */
  static formatMoney(amount: number, currency: string = 'RUB'): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  /**
   * Parse money string to number
   */
  static parseMoney(value: string): number {
    // Remove all non-numeric characters except . and ,
    const cleanValue = value.replace(/[^\d.,-]/g, '')
    // Replace comma with dot for decimal separator
    const normalizedValue = cleanValue.replace(',', '.')
    const parsed = parseFloat(normalizedValue)
    return isNaN(parsed) ? 0 : this.roundMoney(parsed)
  }

  /**
   * Get VAT rates for different countries
   */
  static getVATRates(country: string = 'RU'): Array<{ value: number; label: string }> {
    const rates: Record<string, Array<{ value: number; label: string }>> = {
      RU: [
        { value: 0, label: 'Без НДС (0%)' },
        { value: 10, label: 'НДС 10%' },
        { value: 20, label: 'НДС 20%' }
      ],
      EU: [
        { value: 0, label: 'VAT 0%' },
        { value: 9, label: 'VAT 9%' },
        { value: 21, label: 'VAT 21%' }
      ]
    }
    return rates[country] || rates.RU
  }

  /**
   * Calculate reverse VAT (extract VAT from amount that includes it)
   */
  static extractVAT(
    amountWithVAT: number,
    vatRate: number = 20
  ): VATCalculationResult {
    return this.calculateFromGross(amountWithVAT, vatRate)
  }
}