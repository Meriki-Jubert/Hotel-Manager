import { TranslationKey } from './en';

export type TFunction = (key: TranslationKey | string, vars?: Record<string, string | number>) => string;

/**
 * Shared helper for translating room status
 */
export function tRoomStatus(t: TFunction, status: string): string {
  switch (status) {
    case 'available':
      return t('status.room.available');
    case 'occupied':
      return t('status.room.occupied');
    case 'dirty':
      return t('status.room.dirty');
    case 'cleaning':
      return t('status.room.cleaning');
    case 'maintenance':
      return t('status.room.maintenance');
    case 'reserved':
      return t('status.room.reserved');
    default:
      return status;
  }
}

/**
 * Shared helper for translating booking status
 */
export function tBookingStatus(t: TFunction, status: string): string {
  switch (status) {
    case 'reserved':
      return t('status.booking.reserved');
    case 'checked_in':
      return t('status.booking.checked_in');
    case 'checked_out':
      return t('status.booking.checked_out');
    case 'cancelled':
      return t('status.booking.cancelled');
    default:
      return status;
  }
}

/**
 * Shared helper for translating payment methods
 */
export function tPaymentMethod(t: TFunction, method: string): string {
  switch (method) {
    case 'cash':
      return t('payment.method.cash');
    case 'card':
      return t('payment.method.card');
    case 'mobile_money':
    case 'momo':
      return t('payment.method.momo');
    case 'orange_money':
      return t('payment.method.orange_money');
    case 'bank_transfer':
      return t('payment.method.bank_transfer');
    case 'other':
      return t('payment.method.other');
    default:
      return method;
  }
}

/**
 * Shared helper for translating booking sources
 */
export function tBookingSource(t: TFunction, source: string): string {
  const normalized = source.toLowerCase().replace(/[^a-z0-9]/g, '_');
  if (normalized.includes('walk')) return t('source.walk_in');
  if (normalized.includes('phone')) return t('source.phone');
  if (normalized.includes('website') || normalized.includes('direct')) return t('source.website');
  if (normalized.includes('ota') || normalized.includes('booking')) return t('source.ota');
  if (normalized.includes('corporate')) return t('source.corporate');
  if (normalized.includes('agent') || normalized.includes('agency')) return t('source.agency');
  if (normalized.includes('whatsapp')) return t('source.whatsapp');

  switch (source) {
    case 'walk_in':
    case 'Walk-In':
      return t('source.walk_in');
    case 'phone':
    case 'Phone':
      return t('source.phone');
    case 'website':
    case 'Direct Website':
      return t('source.website');
    case 'ota':
    case 'OTA - Booking.com':
      return t('source.ota');
    case 'corporate':
    case 'Corporate':
      return t('source.corporate');
    case 'agent':
    case 'Agency':
      return t('source.agency');
    case 'whatsapp':
    case 'WhatsApp':
      return t('source.whatsapp');
    default:
      return source;
  }
}
