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

/**
 * Shared helper for translating folio transaction categories
 */
export function tFolioCategory(t: TFunction, category: string): string {
  switch (category) {
    case 'room_charge':
      return t('folio.cat.room_charge');
    case 'restaurant':
      return t('folio.cat.restaurant');
    case 'beverage':
      return t('folio.cat.beverage');
    case 'laundry':
      return t('folio.cat.laundry');
    case 'maintenance_charge':
      return t('folio.cat.maintenance_charge');
    case 'late_checkout':
      return t('folio.cat.late_checkout');
    case 'cancellation_fee':
      return t('folio.cat.cancellation_fee');
    case 'no_show_fee':
      return t('folio.cat.no_show_fee');
    case 'room_charge_void':
      return t('folio.cat.room_charge_void');
    case 'discount':
      return t('folio.cat.discount');
    case 'payment':
      return t('folio.cat.payment');
    case 'deposit':
      return t('folio.cat.deposit');
    case 'tax':
      return t('folio.cat.tax');
    case 'refund':
      return t('folio.cat.refund');
    default:
      return category.replace(/_/g, ' ');
  }
}

/**
 * Shared helper for translating room move reasons
 */
export function tRoomMoveReason(t: TFunction, reason: string): string {
  switch (reason) {
    case 'AC/fault':
      return t('roomMove.reason.acFault');
    case 'guest request':
      return t('roomMove.reason.guestRequest');
    case 'upgrade':
      return t('roomMove.reason.upgrade');
    case 'downgrade':
      return t('roomMove.reason.downgrade');
    case 'noise':
      return t('roomMove.reason.noise');
    case 'other':
      return t('roomMove.reason.other');
    default:
      return reason;
  }
}

/**
 * Shared helper for translating housekeeping task states
 */
export function tHousekeepingStatus(t: TFunction, status: string): string {
  switch (status) {
    case 'dirty':
      return t('housekeeping.status.dirty');
    case 'cleaning':
      return t('housekeeping.status.cleaning');
    case 'inspected':
      return t('housekeeping.status.inspected');
    case 'available':
      return t('housekeeping.status.available');
    default:
      return status;
  }
}

/**
 * Shared helper for translating housekeeping priorities
 */
export function tHousekeepingPriority(t: TFunction, priority: string): string {
  switch (priority.toLowerCase()) {
    case 'normal':
      return t('housekeeping.priority.normal');
    case 'high':
      return t('housekeeping.priority.high');
    case 'urgent':
      return t('housekeeping.priority.urgent');
    default:
      return priority;
  }
}

/**
 * Shared helper for translating maintenance priorities / severity
 */
export function tMaintenancePriority(t: TFunction, priority: string): string {
  switch (priority.toLowerCase()) {
    case 'low':
      return t('maintenance.priority.low');
    case 'medium':
      return t('maintenance.priority.medium');
    case 'high':
      return t('maintenance.priority.high');
    case 'emergency':
    case 'urgent':
      return t('maintenance.priority.emergency');
    default:
      return priority;
  }
}

export function tMaintenancePriorityShort(t: TFunction, priority: string): string {
  switch (priority.toLowerCase()) {
    case 'low':
      return t('maintenance.priorityShort.low');
    case 'medium':
      return t('maintenance.priorityShort.medium');
    case 'high':
      return t('maintenance.priorityShort.high');
    case 'emergency':
    case 'urgent':
      return t('maintenance.priorityShort.emergency');
    default:
      return priority;
  }
}

/**
 * Shared helper for translating maintenance categories
 */
export function tMaintenanceCategory(t: TFunction, category: string): string {
  switch (category) {
    case 'Air Conditioning':
      return t('maintenance.cat.airConditioning');
    case 'Plumbing':
      return t('maintenance.cat.plumbing');
    case 'Electrical':
      return t('maintenance.cat.electrical');
    case 'Television':
      return t('maintenance.cat.television');
    case 'Door Lock':
      return t('maintenance.cat.doorLock');
    case 'Furniture':
      return t('maintenance.cat.furniture');
    case 'Other':
      return t('maintenance.cat.other');
    default:
      return category;
  }
}

/**
 * Shared helper for translating maintenance ticket status
 */
export function tMaintenanceStatus(t: TFunction, status: string): string {
  switch (status) {
    case 'All':
      return t('maintenance.status.all');
    case 'Reported':
      return t('maintenance.status.reported');
    case 'In Progress':
      return t('maintenance.status.inProgress');
    case 'Resolved':
      return t('maintenance.status.resolved');
    default:
      return status;
  }
}

/**
 * Shared helper for translating VIP tier
 */
export function tVipTier(t: TFunction, tier: string): string {
  switch (tier) {
    case 'Standard':
      return t('vip.standard');
    case 'Silver':
      return t('vip.silver');
    case 'Gold':
      return t('vip.gold');
    case 'VIP':
      return t('vip.vip');
    default:
      return tier;
  }
}

