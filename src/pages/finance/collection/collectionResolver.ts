const FINAL_STATUSES = new Set([
  'delivered',
  'cancelled_cad',
  'exchange',
  'exchange_returnable',
  'partial_delivery',
]);

interface ResolverInput {
  cs_status: string;
  payment_method: string | null;
  payment_status: string;
  total_amount: number;
  paid_amount: number | null;
  total_receivable: number | null;
  collected_amount: number;
  delivery_discount: number;
}

interface ResolverResult {
  shouldMarkPaid: boolean;
  reason: string;
}

export function resolvePaymentStatus(input: ResolverInput): ResolverResult {
  if (!FINAL_STATUSES.has(input.cs_status)) {
    return { shouldMarkPaid: false, reason: 'Order not in a final status' };
  }

  if (input.payment_status === 'paid') {
    return { shouldMarkPaid: false, reason: 'Already marked as paid' };
  }

  const pm = (input.payment_method ?? '').toLowerCase().trim();
  const isPrepaid = pm.startsWith('prepaid') || (pm !== '' && !pm.includes('cod') && !pm.includes('partial paid') && !pm.includes('+cod'));
  const isPartialPaid = pm.startsWith('partial paid') || pm.includes('+cod');
  const isCOD = !isPrepaid && !isPartialPaid;

  if (isCOD) {
    const effectiveReceivable = (input.total_receivable ?? input.total_amount) - input.delivery_discount;
    if (input.collected_amount >= effectiveReceivable && effectiveReceivable > 0) {
      return {
        shouldMarkPaid: true,
        reason: `COD collected ৳${input.collected_amount} >= effective receivable ৳${effectiveReceivable}`,
      };
    }
    return {
      shouldMarkPaid: false,
      reason: `COD collected ৳${input.collected_amount} < effective receivable ৳${effectiveReceivable}`,
    };
  }

  if (isPartialPaid) {
    const prepaidAmount = input.paid_amount ?? 0;
    const expectedCOD = input.total_amount - prepaidAmount;
    const effectiveCOD = (input.total_receivable ?? expectedCOD) - input.delivery_discount;

    if (input.collected_amount >= effectiveCOD && effectiveCOD > 0) {
      return {
        shouldMarkPaid: true,
        reason: `Partial+COD: courier collected ৳${input.collected_amount} >= remaining COD ৳${effectiveCOD}`,
      };
    }
    return {
      shouldMarkPaid: false,
      reason: `Partial+COD: courier collected ৳${input.collected_amount} < remaining COD ৳${effectiveCOD}`,
    };
  }

  if (isPrepaid) {
    if (input.collected_amount >= input.total_amount) {
      return {
        shouldMarkPaid: true,
        reason: `Prepaid: gateway credited ৳${input.collected_amount} >= order total ৳${input.total_amount}`,
      };
    }
    return {
      shouldMarkPaid: false,
      reason: `Prepaid: gateway credited ৳${input.collected_amount} < order total ৳${input.total_amount}`,
    };
  }

  return { shouldMarkPaid: false, reason: 'Unknown payment method' };
}
