export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'dirty' | 'cleaning' | 'maintenance';

export type UserRole = 'front_desk' | 'housekeeping' | 'manager' | 'owner';

export type PaymentMethod = 'cash' | 'momo' | 'orange_money' | 'card' | 'bank_transfer';

export type BookingStatus = 'reserved' | 'checked_in' | 'checked_out' | 'cancelled';

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

export interface Reservation {
  id: string;
  bookingCode: string;
  roomId: string;
  roomNumber: string;
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
  source: 'Walk-In' | 'Phone' | 'Direct Website' | 'OTA - Booking.com' | 'Corporate';
  specialRequests?: string;
  keyReturned?: boolean;
  createdAt: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  checkedInBy?: string;
}

export interface FolioTransaction {
  id: string;
  reservationId: string;
  guestId: string;
  roomNumber: string;
  category: 'room_charge' | 'restaurant' | 'beverage' | 'laundry' | 'maintenance_charge' | 'late_checkout' | 'payment' | 'deposit' | 'tax';
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
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  title: string;
  email: string;
  avatar: string;
  description: string;
  phone: string;
}

export interface NightAuditReport {
  id: string;
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
