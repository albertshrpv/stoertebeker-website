/**
 * Formats a price value to German currency format with two decimal places
 * @param price - The price value (number or string)
 * @returns Formatted price string in German format (e.g., "12,50 €")
 */
export function formatPrice(price: number | string): string {
    const numericPrice = typeof price === 'string' ? parseFloat(price.replace(',', '.')) : price;
    return `${numericPrice.toFixed(2).replace('.', ',')} €`;
}

/**
 * Formats a price value to German currency format with two decimal places (without currency symbol)
 * @param price - The price value (number or string)
 * @returns Formatted price string in German format (e.g., "12,50")
 */
export function formatPriceValue(price: number | string): string {
    const numericPrice = typeof price === 'string' ? parseFloat(price.replace(',', '.')) : price;
    return numericPrice.toFixed(2).replace('.', ',');
}
