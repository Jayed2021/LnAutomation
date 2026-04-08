export type PaymentMethodType = 'prepaid' | 'partial_paid' | 'cod';

export function classifyPaymentMethod(rawPaymentMethod: string | null | undefined): PaymentMethodType {
  const pm = (rawPaymentMethod ?? '').toLowerCase().trim();

  if (pm === '') return 'cod';

  if (pm.startsWith('partial paid') || pm.includes('+cod')) return 'partial_paid';

  if (
    pm === 'cod' ||
    pm.includes('cash on delivery') ||
    pm.includes('cash on deliver') ||
    pm === 'cash'
  ) {
    return 'cod';
  }

  if (pm.startsWith('prepaid')) return 'prepaid';

  if (pm.includes('cod')) return 'cod';

  return 'prepaid';
}
