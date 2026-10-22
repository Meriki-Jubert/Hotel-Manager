export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'dirty' | 'cleaning' | 'maintenance';

export type UserRole = 'front_desk' | 'housekeeping' | 'manager' | 'owner';

export type PaymentMethod = 'cash' | 'momo' | 'orange_money' | 'card' | 'bank_transfer';

export type BookingStatus = 'reserved' | 'checked_in' | 'checked_out' | 'cancelled';

export type CancellationFeeType = 'percent' | 'nights';

export interface CancellationPolicyTier {
  daysBeforeArrival: number;
  feeType: CancellationFeeType;
  value: number;
}

export interface CancellationPolicy {
  tiers: CancellationPolicyTier[];
  noShow: {
    feeType: CancellationFeeType;
    value: number;
  };
  allowNonRefundable: boolean;
}

export interface HotelConfig {
  name: string;
  tagline: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  taxId: string; // NIU in Cameroon / Central Africa
  registryNumber: string;
  defaultCurrency: 'FCFA' | 'USD';
  usdExchangeRate: number;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy?: CancellationPolicy;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  isActive: boolean;
}

export interface RoomType {
  id: string;
  name: string;
  code: string;
  basePrice: number; // in FCFA (or converted)
  maxCapacity: number;
  bedType: string;
  amenities: string[];
  description: string;
  image?: string;
  isActive?: boolean;
}

export interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  roomTypeId: string;
  branchId?: string;
  status: RoomStatus;
  currentReservationId?: string;
  assignedHousekeeper?: string;
  maintenanceNote?: string;
  lastCleaned?: string;
  pricePerNight: number;
  image?: string;
  isActive?: boolean;
}

export interface Guest {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  idCardNumber: string;
  nationality: string;
  vipTier: 'Standard' | 'Silver' | 'Gold' | 'VIP';
  notes?: string;
  vehicleReg?: string;
  totalVisits: number;
  totalSpent: number;
  createdAt: string;
}

export type BookingSource =
  | 'Walk-In'
  | 'Phone'
  | 'WhatsApp'
  | 'Direct Website'
  | 'OTA - Booking.com'
  | 'Corporate'
  | 'Agency';

export interface Reservation {
  id: string;
  branchId?: string;
  bookingCode: string;
  roomId: string; // May be empty string if room is unassigned holding room type
  roomNumber: string; // 'Unassigned' or room number
  roomTypeId?: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  nightlyRate: number;
  totalNights: number;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  bookingStatus: BookingStatus;
  paymentMethod: PaymentMethod;
  source: BookingSource;
  specialRequests?: string;
  keyReturned?: boolean;
  createdAt: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  checkedInBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  cancellationFee?: number;
  settlement?: 'refund' | 'credit';
  refundAmount?: number;
  refundMethod?: PaymentMethod;
  rateType?: 'flexible' | 'non_refundable';
  suggestedFee?: number;
  feeOverrideReason?: string;
  feeOverriddenBy?: string;
  policyRuleText?: string;
  roomMoves?: Array<{
    fromRoom: string;
    toRoom: string;
    at: string;
    by: string;
    reason: string;
  }>;
}

export interface CreateReservationPayload {
  guestId?: string;
  guestName: string;
  phone: string;
  email?: string;
  idCardNumber?: string;
  nationality?: string;
  roomTypeId: string;
  roomId?: string; // Optional specific room
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  source: BookingSource;
  specialRequests?: string;
  depositAmount?: number;
  depositMethod?: PaymentMethod;
  rateType?: 'flexible' | 'non_refundable';
}

export interface UpdateReservationPayload {
  checkInDate: string;
  checkOutDate: string;
  roomTypeId: string;
  roomId?: string;
  adults: number;
  children: number;
  source?: BookingSource;
  specialRequests?: string;
  rateType?: 'flexible' | 'non_refundable';
}

export interface ConvertToCheckInPayload {
  reservationId: string;
  roomId: string;
  paymentMethod?: PaymentMethod;
  additionalDeposit?: number;
  idCardNumber?: string;
}

export interface FolioTransaction {
  id: string;
  branchId?: string;
  reservationId: string;
  guestId: string;
  roomNumber: string;
  category: 'room_charge' | 'restaurant' | 'beverage' | 'laundry' | 'maintenance_charge' | 'late_checkout' | 'cancellation_fee' | 'no_show_fee' | 'room_charge_void' | 'payment' | 'deposit' | 'tax' | 'refund';
  description: string;
  amount: number;
  type: 'charge' | 'payment';
  paymentMethod?: PaymentMethod;
  reference?: string;
  timestamp: string;
  recordedBy: string;
  voided?: boolean;
  voidedBy?: string;
  voidReason?: string;
}

export interface HousekeepingTask {
  id: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  status: 'dirty' | 'cleaning' | 'inspected' | 'available';
  priority: 'normal' | 'high' | 'urgent';
  assignedTo: string;
  notes?: string;
  updatedAt: string;
}

export interface MaintenanceTicket {
  id: string;
  branchId?: string;
  ticketNumber: string;
  roomId: string;
  roomNumber: string;
  category: 'Plumbing' | 'Electrical' | 'Air Conditioning' | 'Furniture' | 'Television' | 'Door Lock' | 'Other';
  severity: 'Low' | 'Medium' | 'High' | 'Emergency';
  description: string;
  blocksRoom: boolean;
  status: 'Reported' | 'In Progress' | 'Resolved';
  reportedBy: string;
  assignedTechnician?: string;
  reportedAt: string;
  resolvedAt?: string;
  repairCost?: number;
}

export interface PosItem {
  id: string;
  name: string;
  category: 'Meals' | 'Beverages' | 'Breakfast' | 'Snacks' | 'Laundry' | 'Room Amenities';
  price: number;
  available: boolean;
  image?: string;
}

export interface StaffUser {
  id: string;
  branchId?: string;
  name: string;
  username: string;
  role: UserRole;
  title: string;
  email: string;
  phone: string;
  isActive: boolean;
  passwordHash?: string;
  passwordSalt?: string;
  avatar?: string;
  description?: string;
}

export interface StaffActivityLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: string;
  details: string;
}

export interface NightAuditReport {
  id: string;
  branchId?: string;
  date: string;
  totalRooms: number;
  roomsOccupied: number;
  occupancyRate: number;
  totalRoomRevenue: number;
  totalPosRevenue: number;
  totalGrossRevenue: number;
  adr: number;
  revPar: number;
  cashCollected: number;
  momoCollected: number;
  orangeMoneyCollected: number;
  cardCollected: number;
  expectedCashFloat: number;
  actualCashFloat: number;
  discrepancy: number;
  notes: string;
  auditedBy: string;
  timestamp: string;
}
