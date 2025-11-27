import type { DeliveryOptionData } from "../types/deliveryOption";
import type { LineItem, TicketLineItem, CrossSellingLineItem } from "../types/lineItem";
import type { MainOrganizerData } from "../types/mainOrganizer";
import type { DeliveryOptionSnapshot, OrderFinancialBreakdown, VatBreakdownItem } from "../types/order";

/**
 * Calculates the complete financial breakdown for an order
 * as required by the new public order API
 * 
 * IMPORTANT: This function properly handles VAT calculation with discounts:
 * - Discounts are applied proportionally to line items BEFORE VAT calculation
 * - VAT is calculated on the discounted amounts per item
 * - System fees and VAT are already included in ticket prices
 */
export function calculateFinancialBreakdown(
  lineItems: LineItem[],
  mainOrganizer: MainOrganizerData,
  deliveryOption?: DeliveryOptionData | DeliveryOptionSnapshot,
  currency: string = 'EUR',
  options?: { includeDeliveryFee?: boolean; refundSystemFees?: boolean }
): OrderFinancialBreakdown {
  // Prepare sets
  const nonCouponItems = lineItems.filter(item => item.type !== 'coupon');
  // For CSP (and Ticket Add-ons) partial refund support: compute quantities explicitly instead of filtering out refunded items
  const nonRefundedNonExchangedItems = nonCouponItems.filter(item => {
    if (item.type === 'ticket') {
      const t = item as TicketLineItem;
      return t.refunded !== true && t.exchanged !== true;
    }
    if (item.type === 'crossselling') {
      // keep all cross-selling items; we'll account for kept/refunded quantities below
      return true;
    }
    // vouchers (purchased) can now be refunded
    if (item.type === 'voucher') {
      return (item as unknown as { refunded?: boolean }).refunded !== true;
    }
    return true;
  });

  // Step 1: Calculate subtotal with refund/exchange rules
  // - Include full total_price for non-refunded, non-exchanged items
  // - For refunded tickets/CSPs: include only their system fee portion
  // - Exchanged (old) tickets contribute 0 (no product, no system fee)
  const baseSubtotal = nonRefundedNonExchangedItems.reduce((sum, item) => {
    if (item.type === 'crossselling') {
      const cs = item as CrossSellingLineItem;
      // With unitary CSP semantics: quantity is 1; partial refunds are represented by multiple items
      const keptQty = cs.refunded === true ? 0 : item.quantity;
      const perUnit = Number(cs.unit_price) || 0;
      // Kept price uses the original per-unit price for kept quantity; refunded portion is handled via refunded system fee portion
      return sum + perUnit * keptQty;
    }
    return sum + Number(item.total_price);
  }, 0);

  const refundSystemFees = options?.refundSystemFees === true;

  const refundedSystemFeePortion = refundSystemFees ? 0 : nonCouponItems
    .filter(item => {
      if (item.type === 'ticket') {
        const t = item as TicketLineItem;
        // Treat exchanged tickets like refunded when not pending: keep their system fee portion
        return t.refunded === true || t.exchanged === true;
      }
      if (item.type === 'crossselling') {
        const cs = item as CrossSellingLineItem;
        return cs.refunded === true;
      }
      return false;
    })
    .reduce((sum, item) => {
      if (item.type === 'ticket') {
        const t = item as TicketLineItem;
        // If the price category excludes system fee, there was no system fee charged.
        // In that case, refund the full ticket price (i.e., keep 0 system fee).
        if (t.price_category?.exclude_system_fee) return sum;
        // If system fee was previously refunded, do not add it back in the portion; subtotal already excludes via kept-only calculation below
        if ((t as { system_fee_refunded?: boolean }).system_fee_refunded) return sum;
        const systemFee = computeTicketSystemFeeInclusiveAmount(item, mainOrganizer);
        return sum + systemFee;
      }
      if (item.type === 'crossselling') {
        const cs = item as CrossSellingLineItem;
        const refundedQty = cs.refunded === true ? item.quantity : 0;
        const perUnit = Number(cs.system_fee) || 0;
        // If system fee was previously refunded, do not add refunded portion back; only add system fee portion for newly refunded qty
        const wasPrevRefunded = cs.system_fee_refunded === true;
        const newlyRefundedQty = wasPrevRefunded ? 0 : refundedQty;
        const systemFee = perUnit * newlyRefundedQty;
        return sum + systemFee;
      }
      return sum;
    }, 0);

  const subtotal = baseSubtotal + refundedSystemFeePortion;

  // Step 2: Calculate total discounts (only active discount coupons, not vouchers, not refunded coupons)
  const couponDiscount = Math.abs(lineItems
    .filter(item => item.type === 'coupon' && !item.is_voucher && item.refunded !== true)
    .reduce((sum, item) => sum + Number(item.total_price), 0));

  // Step 2a: Calculate voucher payments (treated separately as payment method) - only if not refunded
  const voucherPayments = Math.abs(lineItems
    .filter(item => item.type === 'coupon' && item.is_voucher && item.refunded !== true)
    .reduce((sum, item) => sum + Number(item.total_price), 0));


  const totalDiscount = couponDiscount;

  // Step 3: Apply discounts proportionally to kept portions only and calculate VAT correctly
  // Build adjusted items list where cross-selling quantities/prices are reduced to kept quantity
  const adjustedItemsForVat: LineItem[] = nonRefundedNonExchangedItems.map((item) => {
    if (item.type !== 'crossselling') return item;
    const cs = item as CrossSellingLineItem;
    const keptQty = cs.refunded === true ? 0 : item.quantity;
    return {
      ...(cs as CrossSellingLineItem),
      quantity: keptQty,
      total_price: Number(cs.unit_price) * keptQty,
    } as LineItem;
  }).filter((i) => (i.type === 'crossselling' ? (i as CrossSellingLineItem).quantity > 0 : true));

  const discountedItemsWithVat = applyProportionalDiscountsAndCalculateVat(
    adjustedItemsForVat,
    totalDiscount,
    mainOrganizer
  );

  // Build map for discount ratio per line id (used for system fee VAT adjustments)
  const discountRatioByLineId = new Map<string, number>();
  discountedItemsWithVat.forEach(d => {
    const ratio = d.originalPrice === 0 ? 1 : (d.discountedPrice / d.originalPrice);
    const id = d.lineItem.id;
    if (id) discountRatioByLineId.set(id, ratio);
  });

  // Step 4: Calculate delivery fee (additional to ticket prices)
  const includeDeliveryFee = options?.includeDeliveryFee !== undefined ? options.includeDeliveryFee : true;

  const deliveryFee = includeDeliveryFee && deliveryOption?.fee_amount ? Number(deliveryOption.fee_amount) : 0;


  // Step 5: Extract system fees for reporting (aligned with refund/exchange rules)
  // Tickets: when refundSystemFees is true (pending), exclude refunded tickets AND exchanged old tickets;
  // otherwise include all (including exchanged old tickets) except those that exclude system fee or were previously refunded
  const ticketSystemFeeAmount = lineItems
    .filter(item => item.type === 'ticket')
    .reduce((sum, item) => {
      const t = item as TicketLineItem;
      if (t.price_category?.exclude_system_fee) return sum;
      // Skip exchanged old tickets only when refunding system fees (pending). When not pending, keep old ticket's system fee.
      if (t.exchanged && refundSystemFees) return sum;
      // If system fee was previously refunded (persisted flag), never add it back
      if ((t as TicketLineItem).system_fee_refunded) return sum;
      if (refundSystemFees && t.refunded) return sum;
      const fee = computeTicketSystemFeeInclusiveAmount(item, mainOrganizer);
      return sum + fee;
    }, 0);

  // Cross-selling: when refundSystemFees is true, count only kept quantity; otherwise full
  const crossSellingSystemFeeAmount = lineItems
    .filter(item => item.type === 'crossselling')
    .reduce((sum, item) => {
      const cs = item as CrossSellingLineItem;
      const perUnit = Number(cs.system_fee) || 0;
      // If system fee was previously refunded for this item (persisted flag), never add refunded portion back
      if ((cs as CrossSellingLineItem).system_fee_refunded) {
        const keptQty = cs.refunded === true ? 0 : item.quantity;
        return sum + perUnit * keptQty;
      }
      if (refundSystemFees) {
        const keptQty = cs.refunded === true ? 0 : item.quantity;
        return sum + perUnit * keptQty;
      }
      return sum + perUnit * item.quantity;
    }, 0);

  const systemFeeAmount = ticketSystemFeeAmount + crossSellingSystemFeeAmount;

  // Step 6: Build VAT breakdown
  const vatBreakdownMap = new Map<number, number>();

  // 6a) Add VAT from discounted product portions (kept portions only)
  discountedItemsWithVat.forEach(({ vatRate, vatAmount }) => {
    const currentVat = vatBreakdownMap.get(vatRate) || 0;
    vatBreakdownMap.set(vatRate, currentVat + vatAmount);
  });

  // 6b) Add ticket system fee VAT (single VAT rate from organizer)
  const ticketSystemFeeVatRate = Number(mainOrganizer.system_fee_vat_rate) || 0;
  if (ticketSystemFeeVatRate > 0) {
    lineItems
      .filter(item => item.type === 'ticket')
      .forEach(item => {
        const t = item as TicketLineItem;
        if (t.price_category?.exclude_system_fee) return;
        // exchanged old tickets: skip system fee VAT only when refundSystemFees (pending) is true
        if (t.exchanged && refundSystemFees) return;
        const fee = computeTicketSystemFeeInclusiveAmount(item, mainOrganizer);
        // Refunded tickets keep system fee with no discount unless refundSystemFees is enabled
        const isRefundedTicket = t.refunded === true;
        const ticketFeePreviouslyRefunded = (t as { system_fee_refunded?: boolean }).system_fee_refunded === true;
        const discountRatio = isRefundedTicket ? ((refundSystemFees || ticketFeePreviouslyRefunded) ? 0 : 1) : (discountRatioByLineId.get(t.id) ?? 1);
        const discountedFee = fee * discountRatio;
        const feeVat = (discountedFee * ticketSystemFeeVatRate) / (100 + ticketSystemFeeVatRate);
        if (feeVat > 0) {
          const currentVat = vatBreakdownMap.get(ticketSystemFeeVatRate) || 0;
          vatBreakdownMap.set(ticketSystemFeeVatRate, currentVat + feeVat);
        }
      });
  }

  // 6c) Add cross-selling system fee VAT (immer, mit Fallback auf Produkt-MwSt.)
  lineItems
    .filter(item => item.type === 'crossselling')
    .forEach(item => {
      const cs = item as CrossSellingLineItem;
      const productVatRate = item.vat_rate;
      const systemFeeVatRate = Number(cs.system_fee_vat_rate ?? productVatRate) || 0;
      if (systemFeeVatRate > 0) {
        const keptQty = cs.refunded === true ? 0 : item.quantity;
        const systemFeePerUnit = Number(cs.system_fee) || 0;

        // Kept portion ggf. rabattiert
        const systemFeeAmountKept = systemFeePerUnit * keptQty;
        const discountRatio = cs.refunded ? 1 : (discountRatioByLineId.get(cs.id) ?? 1);
        const discountedSystemFeeAmountKept = systemFeeAmountKept * discountRatio;

        // Refunded portion un-rabattiert (oder 0, falls refundSystemFees aktiv)
        const systemFeeAmountRefunded = refundSystemFees ? 0 : (systemFeePerUnit * (cs.refunded === true ? item.quantity : 0));

        const totalSystemFeeForVat = discountedSystemFeeAmountKept + systemFeeAmountRefunded;
        const systemFeeVat = (totalSystemFeeForVat * systemFeeVatRate) / (100 + systemFeeVatRate);
        const currentVat = vatBreakdownMap.get(systemFeeVatRate) || 0;
        vatBreakdownMap.set(systemFeeVatRate, currentVat + systemFeeVat);
      }
    });

  // 6d) Add delivery fee VAT (not affected by discounts)
  const deliveryVatRate = deliveryOption?.vat_rate || 0;
  const deliveryVat = deliveryFee > 0 ? (deliveryFee * deliveryVatRate) / (100 + deliveryVatRate) : 0;
  if (deliveryVat > 0) {
    const currentVat = vatBreakdownMap.get(deliveryVatRate) || 0;
    vatBreakdownMap.set(deliveryVatRate, currentVat + deliveryVat);
  }

  // Convert VAT breakdown map to array and calculate total
  const vatBreakdown: VatBreakdownItem[] = Array.from(vatBreakdownMap.entries())
    .filter(([, amount]) => amount > 0)
    .map(([rate, amount]) => ({
      rate: rate,
      amount: roundToCurrency(amount)
    }))
    .sort((a, b) => a.rate - b.rate);

  const totalVat = vatBreakdown.reduce((sum, item) => sum + item.amount, 0);

  // Step 7: Compute invoice_total and total_amount
  // - invoice_total: customer invoice amount after discounts + delivery, without subtracting voucher payments
  // - total_amount: amount the customer has to pay (subtract voucher payments, vouchers act as payment method)
  const netAmountAfterDiscounts = subtotal - totalDiscount;
  const invoiceTotal = roundToCurrency(netAmountAfterDiscounts + deliveryFee);
  // Allow negative totals in refund scenarios when vouchers covered the original payment
  const totalAmount = roundToCurrency(invoiceTotal - voucherPayments);

  return {
    subtotal: roundToCurrency(subtotal),
    total_amount: totalAmount,
    invoice_total: invoiceTotal,
    total_discount: roundToCurrency(totalDiscount),
    voucher_payments: roundToCurrency(voucherPayments),
    total_vat: roundToCurrency(totalVat),
    vat_breakdown: vatBreakdown,
    total_system_fee: roundToCurrency(systemFeeAmount),
    delivery_fee: roundToCurrency(deliveryFee),
    currency: currency
  };
}

/**
 * Interface for items with calculated discounts and VAT
 */
interface DiscountedItemWithVat {
  lineItem: LineItem;
  originalPrice: number;
  discountedPrice: number;
  vatRate: number;
  vatAmount: number;
}

/**
 * Apply discounts proportionally to line items and calculate VAT on discounted amounts
 * This ensures VAT is calculated correctly when discounts are applied across items with different VAT rates
 * 
 * IMPORTANT: For cross-selling items, the product.price already includes system fees and all VAT.
 * We only track system_fee and system_fee_vat_rate separately for accounting/reporting purposes.
 */
function applyProportionalDiscountsAndCalculateVat(
  lineItems: LineItem[],
  totalDiscountAmount: number,
  mainOrganizer: MainOrganizerData
): DiscountedItemWithVat[] {
  if (totalDiscountAmount === 0) {
    // No discounts to apply, just extract VAT from original prices
    return lineItems.map(item => {
      const originalPrice = Number(item.total_price);

      // Handle VAT calculation based on line item type
      let vatRate: number;
      let vatAmount: number;

      if (item.type === 'voucher') {
        // Vouchers always have 0% VAT (Multi-Purpose Voucher per EU regulation)
        vatRate = 0;
        vatAmount = 0;
      } else if (item.type === 'ticket') {
        // For tickets, system fees are included in total_price but have different VAT rate
        // We need to calculate VAT only on the ticket portion (excluding system fee)
        const ticketItem = item as TicketLineItem;
        const excludeSystemFee = ticketItem.price_category?.exclude_system_fee || false;

        const ticketSystemFeeAmount = excludeSystemFee ? 0 : computeTicketSystemFeeInclusiveAmount(item, mainOrganizer);

        // System fee already includes VAT (VAT-inclusive)
        const systemFeeInclusiveAmount = ticketSystemFeeAmount; // Already includes VAT

        // Ticket portion is total price minus system fee (which already includes VAT)
        const ticketPortionPrice = originalPrice - systemFeeInclusiveAmount;

        // Calculate VAT only on ticket portion
        vatRate = item.vat_rate;
        vatAmount = (ticketPortionPrice * vatRate) / (100 + vatRate);
      } else if (item.type === 'crossselling') {
        // For cross-selling items, system fees are included in total_price but have different VAT rate
        // We need to calculate VAT only on the product portion (excluding system fee)
        const crossSellingItem = item as CrossSellingLineItem;
        const systemFeeInclusiveAmount = (Number(crossSellingItem.system_fee) || 0) * item.quantity;

        // Product portion is total price minus system fee (which already includes VAT)
        const productPortionPrice = originalPrice - systemFeeInclusiveAmount;

        // Calculate VAT only on product portion
        vatRate = item.vat_rate;
        vatAmount = (productPortionPrice * vatRate) / (100 + vatRate);
      } else {
        // Standard VAT extraction from VAT-inclusive price for other items (vouchers, etc.)
        vatRate = item.vat_rate;
        vatAmount = (originalPrice * vatRate) / (100 + vatRate);
      }

      return {
        lineItem: item,
        originalPrice,
        discountedPrice: originalPrice,
        vatRate,
        vatAmount
      };
    });
  }

  // Calculate total price of all line items for proportional distribution
  const totalPrice = lineItems.reduce((sum, item) => sum + Number(item.total_price), 0);

  if (totalPrice === 0) {
    return [];
  }

  return lineItems.map(item => {
    const originalPrice = Number(item.total_price);

    // Calculate proportional discount for this item
    const itemDiscountAmount = (originalPrice / totalPrice) * totalDiscountAmount;
    const discountedPrice = Math.max(0, originalPrice - itemDiscountAmount);

    // Calculate VAT on the discounted price based on line item type
    let vatRate: number;
    let vatAmount: number;

    if (item.type === 'voucher') {
      // Vouchers always have 0% VAT (Multi-Purpose Voucher per EU regulation)
      vatRate = 0;
      vatAmount = 0;
    } else if (item.type === 'ticket') {
      // For tickets, system fees are included in total_price but have different VAT rate
      // Apply discount proportionally, then separate ticket and system fee portions
      const ticketItem = item as TicketLineItem;
      const excludeSystemFee = ticketItem.price_category?.exclude_system_fee || false;

      const ticketSystemFeeAmount = excludeSystemFee ? 0 : computeTicketSystemFeeInclusiveAmount(item, mainOrganizer);

      // System fee already includes VAT (VAT-inclusive)
      const systemFeeInclusiveAmount = ticketSystemFeeAmount; // Already includes VAT

      // Apply proportional discount to both ticket and system fee portions
      const discountRatio = discountedPrice / originalPrice;
      const discountedSystemFeeInclusiveAmount = systemFeeInclusiveAmount * discountRatio;

      // Discounted ticket portion is discounted total minus discounted system fee
      const discountedTicketPortionPrice = discountedPrice - discountedSystemFeeInclusiveAmount;

      // Calculate VAT only on discounted ticket portion
      vatRate = item.vat_rate;
      vatAmount = (discountedTicketPortionPrice * vatRate) / (100 + vatRate);
    } else if (item.type === 'crossselling') {
      // For cross-selling items, system fees are included in total_price but have different VAT rate
      // Apply discount proportionally, then separate product and system fee portions
      const crossSellingItem = item as CrossSellingLineItem;
      const systemFeeInclusiveAmount = (Number(crossSellingItem.system_fee) || 0) * item.quantity;

      // Apply proportional discount to both product and system fee portions
      const discountRatio = discountedPrice / originalPrice;
      const discountedSystemFeeInclusiveAmount = systemFeeInclusiveAmount * discountRatio;

      // Discounted product portion is discounted total minus discounted system fee
      const discountedProductPortionPrice = discountedPrice - discountedSystemFeeInclusiveAmount;

      // Calculate VAT only on discounted product portion
      vatRate = item.vat_rate;
      vatAmount = (discountedProductPortionPrice * vatRate) / (100 + vatRate);
    } else {
      // Standard VAT extraction from VAT-inclusive price for other items (vouchers, etc.)
      vatRate = item.vat_rate;
      vatAmount = (discountedPrice * vatRate) / (100 + vatRate);
    }

    return {
      lineItem: item,
      originalPrice,
      discountedPrice,
      vatRate,
      vatAmount
    };
  });
}


/**
 * Round amount to currency precision (2 decimal places)
 */
function roundToCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Calculate the final total amount from financial breakdown
 * IMPORTANT: System fees and VAT are already included in subtotal!
 * Vouchers are treated as payment method, subtracted at the end
 */
export function calculateTotalFromBreakdown(breakdown: OrderFinancialBreakdown): number {
  // Prefer canonical field if present
  if (typeof (breakdown as { total_amount?: number }).total_amount === 'number') {
    return roundToCurrency((breakdown as { total_amount: number }).total_amount);
  }
  const netAmount = breakdown.subtotal - breakdown.total_discount;
  const deliveryFee = breakdown.delivery_fee || 0;
  const voucherPayments = breakdown.voucher_payments || 0;
  return roundToCurrency(netAmount + deliveryFee - voucherPayments);
}

/**
 * Calculate basket totals for UI display
 * This is used by BookingContext to maintain basket state
 * IMPORTANT: System fees and VAT are already included in line item prices!
 */
// Deprecated: use calculateFinancialBreakdown instead. Kept for backward-compat during refactor.
export function calculateBasketTotals(
  lineItems: LineItem[],
  salesGroupBookingInitData: MainOrganizerData,
  deliveryOption?: DeliveryOptionData | DeliveryOptionSnapshot,
  currency: string = 'EUR'
): {
  subtotal: number;
  total_discount: number;
  voucher_payments: number;
  total_vat: number;
  vat_breakdown: VatBreakdownItem[];
  total: number;
  total_system_fee: number;
  delivery_fee: number;
} {
  const breakdown = calculateFinancialBreakdown(lineItems, salesGroupBookingInitData, deliveryOption, currency);

  // Calculate final total for basket display
  // subtotal already includes system fees and VAT, so just subtract discounts, subtract voucher payments, and add delivery
  const deliveryFee = breakdown.delivery_fee;
  const total = breakdown.total_amount;

  return {
    subtotal: breakdown.subtotal,
    total_discount: breakdown.total_discount,
    voucher_payments: breakdown.voucher_payments,
    total_vat: breakdown.total_vat,
    vat_breakdown: breakdown.vat_breakdown,
    total_system_fee: breakdown.total_system_fee,
    delivery_fee: deliveryFee,
    total: roundToCurrency(total)
  };
}

/**
 * Create financial breakdown for order API submission
 * This is the main function used for creating order requests
 */
export function createOrderFinancialBreakdown(
  lineItems: LineItem[],
  salesGroupBookingInitData: MainOrganizerData,
  deliveryOption?: DeliveryOptionData,
  currency: string = 'EUR'
): OrderFinancialBreakdown {
  return calculateFinancialBreakdown(lineItems, salesGroupBookingInitData, deliveryOption, currency);
}

/**
 * Compute the VAT-inclusive system fee amount for a ticket line item based on organizer settings
 * Handles either amount-per-ticket or percentage-of-line-price models
 */
function computeTicketSystemFeeInclusiveAmount(item: LineItem, mainOrganizer: MainOrganizerData): number {
  if (item.type !== 'ticket') return 0;
  const originalPrice = Number(item.total_price);
  if (mainOrganizer.system_fee_amount) {
    return Number(mainOrganizer.system_fee_amount) * item.quantity;
  }
  if (mainOrganizer.system_fee_percentage) {
    return (originalPrice * Number(mainOrganizer.system_fee_percentage)) / 100;
  }
  return 0;
}
