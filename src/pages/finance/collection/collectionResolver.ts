const FINAL_STATUSES = new Set([
  'delivered',
  'cancelled_cad',
  'exchange',
  'exchange_returnable',
  'partial_delivery',
]);

const CAD_COLLECTION_CEILING = 150;
const AMOUNT_BUFFER = 100;

interface ResolverInput {
  cs_status: string;
  payment_method: string | null;
  payment_status: string;
  total_amount: number;
  paid_amount: number | null;
  total_receivable: number | null;
  collected_amount: number;
  prepaid_amount: number;
  delivery_discount: number;
  invoice_type: string | null;
}

interface ResolverResult {
  shouldMarkPaid: boolean;
  reason: string;
}

export function resolvePaymentStatus(input: ResolverInput): ResolverResult {
  if (input.payment_status === 'paid') {
    return { shouldMarkPaid: false, reason: 'Already marked as paid' };
  }

  const pm = (input.payment_method ?? '').toLowerCase().trim();
  const isPrepaid = pm.startsWith('prepaid') || (pm !== '' && !pm.includes('cod') && !pm.includes('partial paid') && !pm.includes('+cod'));
  const isPartialPaid = pm.startsWith('partial paid') || pm.includes('+cod');
  const isCOD = !isPrepaid && !isPartialPaid;

  const isExchangeStatus = input.cs_status === 'exchange' || input.cs_status === 'exchange_returnable';
  const isDeliveryOrMixed = input.invoice_type !== 'return';

  if ((isCOD || isPartialPaid) && isDeliveryOrMixed && !isExchangeStatus) {
    if (input.collected_amount >= 0 && input.collected_amount <= CAD_COLLECTION_CEILING) {
      return {
        shouldMarkPaid: true,
        reason: `CAD inferred from invoice: collected ৳${input.collected_amount} (≤৳${CAD_COLLECTION_CEILING}, delivery charge only — product returned to warehouse)`,
      };
    }
  }

  if ((isCOD || isPartialPaid) && isDeliveryOrMixed) {
    const expectedReceivable = isCOD
      ? (input.total_receivable ?? input.total_amount) - input.delivery_discount
      : (input.total_receivable ?? (input.total_amount - (input.paid_amount ?? 0))) - input.delivery_discount;

    if (
      input.collected_amount > CAD_COLLECTION_CEILING &&
      input.collected_amount >= expectedReceivable - AMOUNT_BUFFER &&
      input.collected_amount <= expectedReceivable + AMOUNT_BUFFER
    ) {
      if (!FINAL_STATUSES.has(input.cs_status)) {
        return {
          shouldMarkPaid: true,
          reason: `Delivered inferred from invoice: collected ৳${input.collected_amount} matches expected ৳${expectedReceivable.toFixed(2)} within ±৳${AMOUNT_BUFFER} (status "${input.cs_status}" not yet synced to delivered)`,
        };
      }
    }
  }

  if (isPrepaid) {
    const totalConfirmed = input.prepaid_amount + input.collected_amount;
    const threshold = input.total_amount - AMOUNT_BUFFER;

    if (totalConfirmed >= threshold) {
      return {
        shouldMarkPaid: true,
        reason: `Prepaid: gateway credited ৳${input.prepaid_amount} + COD ৳${input.collected_amount} = ৳${totalConfirmed} >= order total ৳${input.total_amount} (threshold ৳${threshold.toFixed(2)})`,
      };
    }
    return {
      shouldMarkPaid: false,
      reason: `Prepaid: total confirmed ৳${totalConfirmed} (gateway ৳${input.prepaid_amount} + COD ৳${input.collected_amount}) < threshold ৳${threshold.toFixed(2)} (order ৳${input.total_amount} - buffer ৳${AMOUNT_BUFFER})`,
    };
  }

  if (!FINAL_STATUSES.has(input.cs_status)) {
    return { shouldMarkPaid: false, reason: 'Order not in a final status' };
  }

  if (isCOD) {
    const effectiveReceivable = (input.total_receivable ?? input.total_amount) - input.delivery_discount;
    if (input.collected_amount >= effectiveReceivable - AMOUNT_BUFFER && input.collected_amount > CAD_COLLECTION_CEILING && effectiveReceivable > 0) {
      return {
        shouldMarkPaid: true,
        reason: `COD collected ৳${input.collected_amount} within ±৳${AMOUNT_BUFFER} of effective receivable ৳${effectiveReceivable.toFixed(2)}`,
      };
    }
    return {
      shouldMarkPaid: false,
      reason: `COD collected ৳${input.collected_amount} < effective receivable ৳${effectiveReceivable.toFixed(2)} (outside ±৳${AMOUNT_BUFFER} buffer)`,
    };
  }

  if (isPartialPaid) {
    const expectedCOD = input.total_amount - (input.paid_amount ?? 0);
    const effectiveCOD = (input.total_receivable ?? expectedCOD) - input.delivery_discount;

    if (input.collected_amount >= effectiveCOD - AMOUNT_BUFFER && input.collected_amount > CAD_COLLECTION_CEILING && effectiveCOD > 0) {
      return {
        shouldMarkPaid: true,
        reason: `Partial+COD: courier collected ৳${input.collected_amount} within ±৳${AMOUNT_BUFFER} of remaining COD ৳${effectiveCOD.toFixed(2)}`,
      };
    }
    return {
      shouldMarkPaid: false,
      reason: `Partial+COD: courier collected ৳${input.collected_amount} < remaining COD ৳${effectiveCOD.toFixed(2)} (outside ±৳${AMOUNT_BUFFER} buffer)`,
    };
  }

  return { shouldMarkPaid: false, reason: 'Unknown payment method' };
}
