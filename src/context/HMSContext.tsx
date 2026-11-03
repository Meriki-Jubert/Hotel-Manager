import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  RoomType,
  Room,
  Guest,
  Reservation,
  FolioTransaction,
  MaintenanceTicket,
  PosItem,
  StaffUser,
  NightAuditReport,
  RoomStatus,
  PaymentMethod,
  UserRole,
  HotelConfig,
  Branch,
  StaffActivityLog,
  BookingSource,
  CreateReservationPayload,
  UpdateReservationPayload,
  ConvertToCheckInPayload
} from '../types/hms';
import {
  DEFAULT_HOTEL_CONFIG,
  DEFAULT_BRANCH,
  INITIAL_ROOM_TYPES,
  INITIAL_ROOMS,
  INITIAL_GUESTS,
  INITIAL_RESERVATIONS,
  INITIAL_TRANSACTIONS,
  INITIAL_MAINTENANCE_TICKETS,
  INITIAL_POS_ITEMS,
  STAFF_USERS,
  INITIAL_NIGHT_AUDIT_HISTORY
} from '../data/mockData';
import { isDemoMode } from '../config/appConfig';
import {
  getLocalDateString,
  getNextLocalDateString,
  getLocalTimestampString,
  doDateRangesOverlap,
  calculateStayNights,
  isValidDateString,
  listNights
} from '../utils/dateUtils';
import { checkAvailability } from '../utils/availability';
import { getFolioTotals, sumPaymentsByMethod } from '../utils/folio';
import { getHotelNow } from '../utils/hotelClock';
import { DEFAULT_CANCELLATION_POLICY, calculateCancellationFee } from '../utils/cancellationPolicy';
import { generateSalt, hashPassword, verifyPassword } from '../utils/cryptoUtils';
import {
  calculateExtension,
  calculateShortening,
  calculateRoomMoveAdjustment
} from '../utils/stayChanges';
import { calculateDiscount, validateSplitPayment } from '../utils/folioAdjustments';
import { validatePosItem, POS_CATEGORIES } from '../utils/posItems';
import { fail, Result, KeyedError } from '../i18n/messages';
import { translate } from '../i18n/translate';

export interface NotificationPayload {
  message: string;
  key?: string;
  vars?: Record<string, string | number>;
  type: 'success' | 'info' | 'warning';
}

export type NavTab =
  | 'matrix'
  | 'reservations'
  | 'folios'
  | 'pos'
  | 'housekeeping'
  | 'maintenance'
  | 'audit'
  | 'analytics'
  | 'reports'
  | 'guests'
  | 'settings';

interface CheckInPayload {
  guestName: string;
  phone: string;
  email?: string;
  idCardNumber: string;
  nationality?: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  source: Reservation['source'];
  specialRequests?: string;
}

interface HMSContextType {
  hotelConfig: HotelConfig;
  roomTypes: RoomType[];
  rooms: Room[];
  guests: Guest[];
  reservations: Reservation[];
  transactions: FolioTransaction[];
  maintenanceTickets: MaintenanceTicket[];
  posItems: PosItem[];
  nightAuditReports: NightAuditReport[];
  currentUser: StaffUser | null;
  currency: 'FCFA' | 'USD';
  businessDate: string;
  activeTab: NavTab;
  selectedRoom: Room | null;
  selectedReservation: Reservation | null;
  notification: NotificationPayload | null;

  // Role Scopes & Permissions
  allowedTabs: NavTab[];
  canEditRates: boolean;
  canVoidTransactions: boolean;
  canRunAudit: boolean;
  canCheckIn: boolean;
  canCheckOut: boolean;
  isReadOnly: boolean;

  // Auth & Staff Management
  staffUsers: StaffUser[];
  staffActivityLogs: StaffActivityLog[];
  failedLoginLockoutUntil: number;
  createInitialOwner: (payload: { fullName: string; username: string; password: string; email?: string; phone?: string }) => Promise<Result>;
  login: (username: string, password?: string) => Promise<Result>;
  fastLogin: (role: UserRole) => void;
  logout: () => void;
  addStaff: (data: { name: string; username: string; password: string; role: UserRole; branchId?: string; title?: string; email?: string; phone?: string }) => Promise<Result>;
  updateStaff: (id: string, data: Partial<Omit<StaffUser, 'id' | 'passwordHash' | 'passwordSalt'>>) => Result;
  toggleStaffActive: (id: string, active: boolean) => Result;
  resetStaffPassword: (id: string, newPassword: string) => Promise<Result>;
  changeMyPassword: (oldPassword: string, newPassword: string) => Promise<Result>;

  // Config Setters
  updateHotelConfig: (newConfig: Partial<HotelConfig>) => Result;
  updateRoomTypePricing: (roomTypeId: string, newBasePrice: number) => void;

  // General Setters
  setCurrency: (c: 'FCFA' | 'USD') => void;
  setActiveTab: (tab: NavTab) => void;
  setSelectedRoom: (room: Room | null) => void;
  setSelectedReservation: (res: Reservation | null) => void;
  showNotification: (
    messageOrObj: string | { key: string; vars?: Record<string, string | number> },
    type?: 'success' | 'info' | 'warning'
  ) => void;
  notify: (
    key: string,
    vars?: Record<string, string | number>,
    type?: 'success' | 'info' | 'warning'
  ) => void;
  clearNotification: () => void;

  // Helpers & Formatter
  formatMoney: (amountInFcfa: number) => string;

  // Actions
  checkInGuest: (payload: CheckInPayload) => { success: boolean; reservationId?: string; error?: string };
  checkOutGuest: (
    reservationId: string,
    paymentMethod?: PaymentMethod,
    settlementAmount?: number,
    splitLines?: Array<{ method: PaymentMethod; amount: number }>
  ) => { success: boolean; error?: string };
  autoCheckOutGuest: (reservationId: string) => Result;
  applyDiscount: (
    reservationId: string,
    type: 'percent' | 'fixed',
    value: number,
    reason: string
  ) => { success: boolean; error?: string };
  createReservation: (payload: CreateReservationPayload) => { success: boolean; reservationId?: string; error?: string };
  updateReservation: (reservationId: string, payload: UpdateReservationPayload) => { success: boolean; error?: string };
  cancelReservation: (
    reservationId: string,
    reason: string,
    cancellationFee?: number,
    isNoShow?: boolean,
    settlement?: 'refund' | 'credit',
    refundMethod?: PaymentMethod,
    feeMeta?: {
      suggestedFee: number;
      policyRuleText?: string;
      feeOverrideReason?: string;
    }
  ) => { success: boolean; error?: string };
  convertReservationToCheckIn: (payload: ConvertToCheckInPayload) => { success: boolean; error?: string };
  extendStay: (reservationId: string, newCheckOutDate: string) => { success: boolean; error?: string };
  shortenStay: (reservationId: string, newCheckOutDate: string, reason: string) => { success: boolean; error?: string };
  changeRoom: (reservationId: string, newRoomId: string, reason: string, keepCurrentRate: boolean) => { success: boolean; error?: string };
  getAvailableRoomsForDateRange: (checkInDate: string, checkOutDate: string, roomTypeId?: string, excludeReservationId?: string) => Room[];
  isRoomAvailableForDateRange: (roomId: string, checkInDate: string, checkOutDate: string, excludeReservationId?: string) => boolean;
  getNextUpcomingReservationForRoom: (roomId: string) => Reservation | undefined;
  updateRoomStatus: (roomId: string, status: RoomStatus, note?: string) => void;
  addFolioCharge: (charge: Omit<FolioTransaction, 'id' | 'timestamp'>) => void;
  recordFolioPayment: (payment: Omit<FolioTransaction, 'id' | 'timestamp' | 'type'>) => void;
  recordSplitPayment: (
    reservationId: string,
    lines: Array<{ method: PaymentMethod; amount: number }>,
    reference?: string
  ) => { success: boolean; error?: string; splitGroupId?: string };
  voidTransaction: (txId: string, reason: string) => boolean;
  createMaintenanceTicket: (ticket: Omit<MaintenanceTicket, 'id' | 'ticketNumber' | 'reportedAt'>) => void;
  updateMaintenanceStatus: (ticketId: string, status: MaintenanceTicket['status'], cost?: number) => void;
  runNightAudit: (expectedCash: number, actualCash: number, notes: string) => NightAuditReport;
  addGuest: (guest: Omit<Guest, 'id' | 'createdAt' | 'totalVisits' | 'totalSpent'>) => Guest;
  resetToDemoData: () => void;

  // Branches & Multi-Branch Hierarchy
  branches: Branch[];
  activeBranchId: string;
  activeBranch: Branch | null;
  hasMultipleActiveBranches: boolean;
  branchBusinessDates: Record<string, string>;
  setActiveBranchId: (id: string) => void;
  addBranch: (branch: Omit<Branch, 'id'>) => Result;
  updateBranch: (id: string, branch: Partial<Branch>) => Result;
  deleteBranch: (id: string) => Result & { canDeactivateInstead?: boolean };
  toggleBranchActive: (id: string, active: boolean) => Result;

  // Master Unfiltered Collections (for multi-branch analytics and settings inventory)
  allRooms: Room[];
  allReservations: Reservation[];
  allTransactions: FolioTransaction[];
  allMaintenanceTickets: MaintenanceTicket[];
  allNightAuditReports: NightAuditReport[];

  // Room Type & Room Management (Manager Scope)
  addRoomType: (roomType: Omit<RoomType, 'id'>) => Result;
  updateRoomType: (id: string, roomType: Partial<RoomType>) => Result;
  deleteRoomType: (id: string) => Result & { canDeactivateInstead?: boolean };
  toggleRoomTypeActive: (id: string, active: boolean) => void;

  addRoom: (room: { roomNumber: string; floor: number; roomTypeId: string; pricePerNight: number; branchId?: string; image?: string }) => Result;
  bulkAddRooms: (params: { startNumber: number; endNumber: number; floor: number; roomTypeId: string; pricePerNight: number; branchId?: string }) => Result & { count: number };
  updateRoom: (id: string, room: Partial<Room>) => Result;
  deleteRoom: (id: string) => Result & { canDeactivateInstead?: boolean };
  toggleRoomActive: (id: string, active: boolean) => void;

  // POS & Menu Items (Manager Scope)
  addPosItem: (item: Omit<PosItem, 'id'>) => Result & { item?: PosItem };
  updatePosItem: (id: string, item: Partial<Omit<PosItem, 'id'>>) => Result;
  togglePosItemActive: (id: string, active?: boolean) => Result;
  deletePosItem: (id: string) => Result;
}

const HMSContext = createContext<HMSContextType | undefined>(undefined);

const STORAGE_PREFIX = 'hms_v2';

export const HMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Active hotel config
  const [hotelConfig, setHotelConfig] = useState<HotelConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_config`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_HOTEL_CONFIG,
          ...parsed,
          cancellationPolicy: parsed.cancellationPolicy
            ? {
                tiers: Array.isArray(parsed.cancellationPolicy.tiers) ? parsed.cancellationPolicy.tiers : [],
                noShow: parsed.cancellationPolicy.noShow || DEFAULT_CANCELLATION_POLICY.noShow,
                allowNonRefundable: !!parsed.cancellationPolicy.allowNonRefundable
              }
            : { ...DEFAULT_CANCELLATION_POLICY, tiers: [], noShow: { ...DEFAULT_CANCELLATION_POLICY.noShow } },
          taxSettings: parsed.taxSettings
            ? {
                enabled: !!parsed.taxSettings.enabled,
                label: typeof parsed.taxSettings.label === 'string' && parsed.taxSettings.label.trim() ? parsed.taxSettings.label.trim() : 'VAT',
                ratePercent: typeof parsed.taxSettings.ratePercent === 'number' && !isNaN(parsed.taxSettings.ratePercent) ? parsed.taxSettings.ratePercent : 0
              }
            : { enabled: false, label: 'VAT', ratePercent: 0 },
          defaultLanguage: parsed.defaultLanguage === 'fr' ? 'fr' : 'en',
          timeZone: parsed.timeZone || 'Africa/Douala',
          checkOutReminderMinutes: typeof parsed.checkOutReminderMinutes === 'number' ? parsed.checkOutReminderMinutes : 30,
          autoCheckOut: parsed.autoCheckOut === 'off' ? 'off' : 'settled_only',
          nightAuditReminderTime: parsed.nightAuditReminderTime || '04:00'
        };
      } catch {
        return {
          ...DEFAULT_HOTEL_CONFIG,
          cancellationPolicy: { ...DEFAULT_CANCELLATION_POLICY, tiers: [], noShow: { ...DEFAULT_CANCELLATION_POLICY.noShow } }
        };
      }
    }
    return {
      ...DEFAULT_HOTEL_CONFIG,
      cancellationPolicy: { ...DEFAULT_CANCELLATION_POLICY, tiers: [], noShow: { ...DEFAULT_CANCELLATION_POLICY.noShow } }
    };
  });

  // Branches state - app must always have at least one branch
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_branches`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    const defaultBranch: Branch = {
      id: 'branch-1',
      name: hotelConfig.name || 'Main Branch',
      city: hotelConfig.city || '',
      address: hotelConfig.address || '',
      phone: hotelConfig.phone || '',
      isActive: true
    };
    return [defaultBranch];
  });

  const defaultBranchId = branches[0]?.id || 'branch-1';

  // Active branch ID state
  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_active_branch`);
    return saved || defaultBranchId;
  });

  // Business date per branch
  const [branchBusinessDates, setBranchBusinessDates] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_branch_business_dates`);
    const oldSavedDate = localStorage.getItem(`${STORAGE_PREFIX}_business_date`);
    const today = getLocalDateString();
    const initialDate = oldSavedDate || today;
    const initialObj: Record<string, string> = {};
    branches.forEach((b) => {
      initialObj[b.id] = initialDate;
    });
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...initialObj, ...parsed };
        }
      } catch (e) {
        // fallback
      }
    }
    return initialObj;
  });

  // Staff Users State (persisted in localStorage)
  // Demo staff (STAFF_USERS) load ONLY when VITE_DEMO_MODE=true. Otherwise start empty.
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_staff_users`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return isDemoMode ? STAFF_USERS : [];
  });

  // Staff Activity Log State (persisted in localStorage)
  const [staffActivityLogs, setStaffActivityLogs] = useState<StaffActivityLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_staff_activity_log`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return [];
  });

  // Failed login tracking: lock sign-in for 30s after 5 failed attempts
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [failedLoginLockoutUntil, setFailedLoginLockoutUntil] = useState<number>(() => {
    const saved = sessionStorage.getItem(`${STORAGE_PREFIX}_lockout_until`);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Auth state
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    const saved = sessionStorage.getItem(`${STORAGE_PREFIX}_user`);
    if (saved) {
      try {
        const parsed: StaffUser = JSON.parse(saved);
        if (parsed.role === 'owner') {
          return { ...parsed, branchId: undefined };
        }
        return parsed.branchId ? parsed : { ...parsed, branchId: defaultBranchId };
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Room Types (Shared across branches)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_room_types`);
    return saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_ROOM_TYPES : []);
  });

  // Master Room Inventory (Safe migration for missing branchId)
  const [allRooms, setAllRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_rooms`);
    const raw: Room[] = saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_ROOMS : []);
    const defId = branches[0]?.id || 'branch-1';
    return raw.map((r) => (r.branchId ? r : { ...r, branchId: defId }));
  });

  // Guests (Hotel-wide)
  const [guests, setGuests] = useState<Guest[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_guests`);
    return saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_GUESTS : []);
  });

  // Master Reservations (Safe migration for missing branchId)
  const [allReservations, setAllReservations] = useState<Reservation[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_reservations`);
    const raw: Reservation[] = saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_RESERVATIONS : []);
    const defId = branches[0]?.id || 'branch-1';
    return raw.map((r) => (r.branchId ? r : { ...r, branchId: defId }));
  });

  // Master Transactions (Safe migration for missing branchId)
  const [allTransactions, setAllTransactions] = useState<FolioTransaction[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_transactions`);
    const raw: FolioTransaction[] = saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_TRANSACTIONS : []);
    const defId = branches[0]?.id || 'branch-1';
    return raw.map((t) => (t.branchId ? t : { ...t, branchId: defId }));
  });

  // Master Maintenance Tickets (Safe migration for missing branchId)
  const [allMaintenanceTickets, setAllMaintenanceTickets] = useState<MaintenanceTicket[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_maintenance`);
    const raw: MaintenanceTicket[] = saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_MAINTENANCE_TICKETS : []);
    const defId = branches[0]?.id || 'branch-1';
    return raw.map((m) => (m.branchId ? m : { ...m, branchId: defId }));
  });

  const [posItems, setPosItems] = useState<PosItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_pos_items`);
    return saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_POS_ITEMS : []);
  });

  // Master Night Audit Reports (Safe migration for missing branchId)
  const [allNightAuditReports, setAllNightAuditReports] = useState<NightAuditReport[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_audits`);
    const raw: NightAuditReport[] = saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_NIGHT_AUDIT_HISTORY : []);
    const defId = branches[0]?.id || 'branch-1';
    return raw.map((a) => (a.branchId ? a : { ...a, branchId: defId }));
  });

  const [currency, setCurrency] = useState<'FCFA' | 'USD'>(hotelConfig.defaultCurrency);
  const [activeTab, setActiveTab] = useState<NavTab>('matrix');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [notification, setNotification] = useState<NotificationPayload | null>(null);

  // Derived Branch Status
  const activeBranches = branches.filter((b) => b.isActive);
  const hasMultipleActiveBranches = activeBranches.length > 1;
  const activeBranch = branches.find((b) => b.id === activeBranchId) || null;

  // Active Business Date (Per-branch) - Never fall back to branches[0] for another branch's operations
  const businessDate = (activeBranchId !== 'all' && branchBusinessDates[activeBranchId])
    ? branchBusinessDates[activeBranchId]
    : getLocalDateString();

  // Scoped views for active branch (matrix, reservations, folios, POS, housekeeping, maintenance, audit)
  const rooms = activeBranchId === 'all'
    ? allRooms
    : allRooms.filter((r) => r.branchId === activeBranchId);

  const reservations = activeBranchId === 'all'
    ? allReservations
    : allReservations.filter((r) => r.branchId === activeBranchId);

  const transactions = activeBranchId === 'all'
    ? allTransactions
    : allTransactions.filter((t) => t.branchId === activeBranchId);

  const maintenanceTickets = activeBranchId === 'all'
    ? allMaintenanceTickets
    : allMaintenanceTickets.filter((m) => m.branchId === activeBranchId);

  const nightAuditReports = activeBranchId === 'all'
    ? allNightAuditReports
    : allNightAuditReports.filter((a) => a.branchId === activeBranchId);

  // Document title sync
  useEffect(() => {
    document.title = `${hotelConfig.name} — Hotel Management System`;
  }, [hotelConfig.name]);

  // Sync to Storage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_branches`, JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_branch_business_dates`, JSON.stringify(branchBusinessDates));
  }, [branchBusinessDates]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_active_branch`, activeBranchId);
  }, [activeBranchId]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_pos_items`, JSON.stringify(posItems));
  }, [posItems]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_config`, JSON.stringify(hotelConfig));
  }, [hotelConfig]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_room_types`, JSON.stringify(roomTypes));
  }, [roomTypes]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_rooms`, JSON.stringify(allRooms));
  }, [allRooms]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_guests`, JSON.stringify(guests));
  }, [guests]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_reservations`, JSON.stringify(allReservations));
  }, [allReservations]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_transactions`, JSON.stringify(allTransactions));
  }, [allTransactions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_maintenance`, JSON.stringify(allMaintenanceTickets));
  }, [allMaintenanceTickets]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_audits`, JSON.stringify(allNightAuditReports));
  }, [allNightAuditReports]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_staff_users`, JSON.stringify(staffUsers));
  }, [staffUsers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_staff_activity_log`, JSON.stringify(staffActivityLogs));
  }, [staffActivityLogs]);

  const logStaffActivity = (action: string, details: string, actor?: { id: string; name: string }) => {
    const currentActor = actor || (currentUser ? { id: currentUser.id, name: currentUser.name } : { id: 'system', name: 'System' });
    const newLog: StaffActivityLog = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: `${getLocalDateString()} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
      actorId: currentActor.id,
      actorName: currentActor.name,
      action,
      details
    };
    setStaffActivityLogs((prev) => [newLog, ...prev.slice(0, 199)]);
  };

  // Role Permissions
  const role = currentUser?.role;

  let allowedTabs: NavTab[] = [];
  if (role === 'front_desk') {
    allowedTabs = ['matrix', 'reservations', 'folios', 'pos', 'guests'];
  } else if (role === 'housekeeping') {
    allowedTabs = ['housekeeping', 'maintenance'];
  } else if (role === 'manager') {
    allowedTabs = [
      'matrix',
      'reservations',
      'folios',
      'pos',
      'housekeeping',
      'maintenance',
      'audit',
      'analytics',
      'reports',
      'guests',
      'settings'
    ];
  } else if (role === 'owner') {
    allowedTabs = ['analytics', 'reports', 'matrix', 'settings'];
  }

  const canEditRates = role === 'manager';
  const canVoidTransactions = role === 'manager';
  const canRunAudit = role === 'manager';
  const canCheckIn = role === 'front_desk' || role === 'manager';
  const canCheckOut = role === 'front_desk' || role === 'manager';
  const isReadOnly = role === 'owner';

  // Enforce staff branch assignment (staff cannot switch branches)
  useEffect(() => {
    if (currentUser?.role === 'front_desk' || currentUser?.role === 'housekeeping') {
      const assigned = currentUser.branchId || branches[0]?.id || 'branch-1';
      if (activeBranchId !== assigned) {
        setActiveBranchIdState(assigned);
      }
    }
  }, [currentUser, branches, activeBranchId]);

  // Deactivated active branch fallback
  useEffect(() => {
    if (activeBranchId !== 'all') {
      const current = branches.find((b) => b.id === activeBranchId);
      if (current && !current.isActive) {
        const nextActive = branches.find((b) => b.isActive);
        if (nextActive) {
          setActiveBranchIdState(nextActive.id);
        }
      }
    }
  }, [branches, activeBranchId]);

  // Ensure active tab is allowed when role changes
  useEffect(() => {
    if (currentUser) {
      if (!allowedTabs.includes(activeTab)) {
        if (role === 'housekeeping') setActiveTab('housekeeping');
        else if (role === 'owner') setActiveTab('analytics');
        else setActiveTab('matrix');
      }
    }
  }, [currentUser, role]);

  const showNotification = (
    messageOrObj: string | { key: string; vars?: Record<string, string | number> },
    type: 'success' | 'info' | 'warning' = 'success'
  ) => {
    const notif: NotificationPayload =
      typeof messageOrObj === 'string'
        ? { message: messageOrObj, type }
        : {
            message: translate('en', messageOrObj.key, messageOrObj.vars),
            key: messageOrObj.key,
            vars: messageOrObj.vars,
            type
          };
    setNotification(notif);
    setTimeout(() => {
      setNotification((curr) => (curr?.message === notif.message ? null : curr));
    }, 4500);
  };

  const notify = (
    key: string,
    vars?: Record<string, string | number>,
    type: 'success' | 'info' | 'warning' = 'success'
  ) => {
    showNotification({ key, vars }, type);
  };

  const clearNotification = () => setNotification(null);

  const formatMoney = (amountInFcfa: number) => {
    const rate = hotelConfig.usdExchangeRate || 600;
    if (currency === 'USD') {
      const usdAmount = amountInFcfa / rate;
      return `$${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${Math.round(amountInFcfa).toLocaleString('fr-FR')} FCFA`;
  };

  // Branch Switcher Setter (Respects role permissions)
  const setActiveBranchId = (id: string) => {
    if (currentUser?.role === 'front_desk' || currentUser?.role === 'housekeeping') {
      // Staff are assigned to one branch and cannot switch
      return;
    }
    if (currentUser?.role === 'manager' && id === 'all') {
      // Only owners get 'all'
      return;
    }
    setActiveBranchIdState(id);
    localStorage.setItem(`${STORAGE_PREFIX}_active_branch`, id);
  };

  // Auth & Staff Management Actions
  const createInitialOwner = async (payload: { fullName: string; username: string; password: string; email?: string; phone?: string }): Promise<Result> => {
    if (staffUsers.some((u) => u.role === 'owner')) {
      return fail('err.auth.ownerExists');
    }
    const name = payload.fullName.trim();
    const uname = payload.username.trim().toLowerCase();
    const pw = payload.password;
    if (!name) return fail('err.auth.nameRequired');
    if (!uname || uname.length < 3) return fail('err.auth.usernameMin');
    if (!pw || pw.length < 8) return fail('err.auth.passwordMin');

    const salt = generateSalt();
    const hash = await hashPassword(pw, salt);

    const ownerUser: StaffUser = {
      id: `usr-owner-${Date.now()}`,
      name,
      username: uname,
      role: 'owner',
      branchId: undefined, // Owners have none
      title: 'Property Owner / Principal',
      email: payload.email?.trim() || `${uname}@${hotelConfig.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'hotel'}.com`,
      phone: payload.phone?.trim() || hotelConfig.phone || '',
      isActive: true,
      passwordSalt: salt,
      passwordHash: hash,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      description: 'Property Owner: Full executive analytics, staff access, and hotel management.'
    };

    setStaffUsers([ownerUser]);
    setCurrentUser(ownerUser);
    sessionStorage.setItem(`${STORAGE_PREFIX}_user`, JSON.stringify(ownerUser));
    setActiveTab('analytics');

    logStaffActivity('Create Owner Account', `Initial owner account created: ${name} (${uname})`, { id: ownerUser.id, name: ownerUser.name });
    notify('msg.auth.ownerCreated', { name }, 'success');
    return { success: true };
  };

  const login = async (username: string, password = ''): Promise<Result> => {
    const now = Date.now();
    if (failedLoginLockoutUntil > now) {
      const remainingSecs = Math.ceil((failedLoginLockoutUntil - now) / 1000);
      notify('err.auth.lockoutActive', { seconds: remainingSecs, plural: remainingSecs === 1 ? '' : 's' }, 'warning');
      return fail('err.auth.lockoutActive', { seconds: remainingSecs, plural: remainingSecs === 1 ? '' : 's' });
    }

    const trimmedUser = username.trim().toLowerCase();
    const user = staffUsers.find(
      (u) => u.username.toLowerCase() === trimmedUser || u.email.toLowerCase() === trimmedUser
    );

    if (!user) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 5) {
        const lockoutTime = Date.now() + 30000;
        setFailedLoginLockoutUntil(lockoutTime);
        sessionStorage.setItem(`${STORAGE_PREFIX}_lockout_until`, lockoutTime.toString());
        logStaffActivity('Security Alert', `Sign-in locked for 30 seconds after 5 failed attempts for username: "${username}"`);
        notify('err.auth.lockoutTriggered', undefined, 'warning');
        return fail('err.auth.lockoutTriggered');
      }
      logStaffActivity('Failed Login Attempt', `Unknown username attempted: "${username}"`);
      return fail('err.auth.invalidCredentials');
    }

    if (!user.isActive) {
      logStaffActivity('Deactivated Login Blocked', `Deactivated staff member "${user.name}" (${user.username}) attempted login.`);
      return fail('err.auth.accountDeactivated');
    }

    const isPwValid = await verifyPassword(password, user.passwordSalt || '', user.passwordHash || '');
    if (!isPwValid) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 5) {
        const lockoutTime = Date.now() + 30000;
        setFailedLoginLockoutUntil(lockoutTime);
        sessionStorage.setItem(`${STORAGE_PREFIX}_lockout_until`, lockoutTime.toString());
        logStaffActivity('Security Alert', `Sign-in locked for 30 seconds after 5 failed attempts for staff: "${user.name}" (${user.username})`);
        notify('err.auth.lockoutTriggered', undefined, 'warning');
        return fail('err.auth.lockoutTriggered');
      }
      logStaffActivity('Failed Login Attempt', `Incorrect password for staff: "${user.name}" (${user.username})`);
      return fail('err.auth.invalidCredentials');
    }

    // Success! Reset failed attempts
    setFailedAttempts(0);
    setFailedLoginLockoutUntil(0);
    sessionStorage.removeItem(`${STORAGE_PREFIX}_lockout_until`);

    const resolvedUser: StaffUser = user.role === 'owner'
      ? { ...user, branchId: undefined }
      : (user.branchId ? user : { ...user, branchId: defaultBranchId });

    setCurrentUser(resolvedUser);
    sessionStorage.setItem(`${STORAGE_PREFIX}_user`, JSON.stringify(resolvedUser));

    if (resolvedUser.role === 'front_desk' || resolvedUser.role === 'housekeeping') {
      const staffBranch = resolvedUser.branchId || defaultBranchId;
      setActiveBranchIdState(staffBranch);
      localStorage.setItem(`${STORAGE_PREFIX}_active_branch`, staffBranch);
    }

    if (resolvedUser.role === 'housekeeping') setActiveTab('housekeeping');
    else if (resolvedUser.role === 'owner') setActiveTab('analytics');
    else setActiveTab('matrix');

    logStaffActivity('Staff Login', `Staff signed in: ${resolvedUser.name} (${resolvedUser.username}, ${resolvedUser.role})`, { id: resolvedUser.id, name: resolvedUser.name });
    notify('msg.auth.welcome', { name: resolvedUser.name }, 'success');
    return { success: true };
  };

  const fastLogin = (userRole: UserRole) => {
    if (!isDemoMode) {
      notify('msg.auth.demoOnly', undefined, 'warning');
      return;
    }
    const baseUser = staffUsers.find((u) => u.role === userRole) || STAFF_USERS.find((u) => u.role === userRole) || staffUsers[0];
    if (!baseUser) return;
    const resolvedUser: StaffUser = baseUser.role === 'owner'
      ? { ...baseUser, branchId: undefined }
      : (baseUser.branchId ? baseUser : { ...baseUser, branchId: defaultBranchId });
    setCurrentUser(resolvedUser);
    sessionStorage.setItem(`${STORAGE_PREFIX}_user`, JSON.stringify(resolvedUser));

    if (resolvedUser.role === 'front_desk' || resolvedUser.role === 'housekeeping') {
      const staffBranch = resolvedUser.branchId || defaultBranchId;
      setActiveBranchIdState(staffBranch);
      localStorage.setItem(`${STORAGE_PREFIX}_active_branch`, staffBranch);
    }

    if (resolvedUser.role === 'housekeeping') setActiveTab('housekeeping');
    else if (resolvedUser.role === 'owner') setActiveTab('analytics');
    else setActiveTab('matrix');

    notify('msg.auth.signedInAs', { name: resolvedUser.name, title: resolvedUser.title }, 'success');
  };

  const logout = () => {
    if (currentUser) {
      logStaffActivity('Staff Logout', `Staff signed out: ${currentUser.name} (${currentUser.username})`);
    }
    setCurrentUser(null);
    sessionStorage.removeItem(`${STORAGE_PREFIX}_user`);
    notify('msg.auth.loggedOut', undefined, 'info');
  };

  const addStaff = async (data: {
    name: string;
    username: string;
    password: string;
    role: UserRole;
    branchId?: string;
    title?: string;
    email?: string;
    phone?: string;
  }): Promise<Result> => {
    if (currentUser?.role !== 'owner' && currentUser?.role !== 'manager') {
      return fail('err.staff.unauthorizedAdd');
    }

    // Role creation rules: Managers can only create front_desk and housekeeping staff; only owners can create managers or owners.
    if (currentUser?.role === 'manager' && (data.role === 'owner' || data.role === 'manager')) {
      return fail('err.staff.managerRoleLimit');
    }

    const name = data.name.trim();
    const uname = data.username.trim().toLowerCase();
    const pw = data.password;

    if (!name) return fail('err.staff.nameRequired');
    if (!uname || uname.length < 3) return fail('err.staff.usernameMin');
    if (!pw || pw.length < 8) return fail('err.staff.passwordMin');

    if (staffUsers.some((u) => u.username.toLowerCase() === uname)) {
      return fail('err.staff.usernameTaken', { username: uname });
    }

    // Branch assignment rules: front_desk and housekeeping must have a branch (owners have none)
    if ((data.role === 'front_desk' || data.role === 'housekeeping') && !data.branchId) {
      return fail('err.staff.branchRequired');
    }

    const assignedBranchId = data.role === 'owner' ? undefined : (data.branchId || undefined);

    const salt = generateSalt();
    const hash = await hashPassword(pw, salt);

    const defaultTitle = data.title?.trim() || (
      data.role === 'owner'
        ? 'Property Owner'
        : data.role === 'manager'
        ? 'Property Manager'
        : data.role === 'front_desk'
        ? 'Front Desk Agent'
        : 'Housekeeping Specialist'
    );

    const newStaff: StaffUser = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      username: uname,
      role: data.role,
      branchId: assignedBranchId,
      title: defaultTitle,
      email: data.email?.trim() || `${uname}@${hotelConfig.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'hotel'}.com`,
      phone: data.phone?.trim() || '',
      isActive: true,
      passwordSalt: salt,
      passwordHash: hash
    };

    setStaffUsers((prev) => [...prev, newStaff]);
    logStaffActivity('Create Staff Member', `Created staff account for ${name} (${uname}) as ${data.role.replace('_', ' ')}.`);
    notify('msg.staff.created', { name }, 'success');
    return { success: true };
  };

  const updateStaff = (id: string, data: Partial<Omit<StaffUser, 'id' | 'passwordHash' | 'passwordSalt'>>): Result => {
    if (currentUser?.role !== 'owner' && currentUser?.role !== 'manager') {
      return fail('err.staff.unauthorizedEdit');
    }

    const targetUser = staffUsers.find((u) => u.id === id);
    if (!targetUser) return fail('err.staff.notFound');

    // Manager scope check: Managers can only edit front_desk and housekeeping staff
    if (currentUser?.role === 'manager') {
      if (targetUser.role === 'owner' || targetUser.role === 'manager') {
        return fail('err.staff.managerEditLimit');
      }
      if (data.role && (data.role === 'owner' || data.role === 'manager')) {
        return fail('err.staff.managerPromoteLimit');
      }
    }

    // The last active owner can never be deactivated or demoted
    if (targetUser.role === 'owner' && data.role && data.role !== 'owner') {
      const activeOwners = staffUsers.filter((u) => u.role === 'owner' && u.isActive && u.id !== id);
      if (activeOwners.length === 0) {
        return fail('err.staff.demoteLastOwner');
      }
    }

    // Role & branch check
    const resolvedRole = data.role || targetUser.role;
    let resolvedBranch = data.branchId !== undefined ? data.branchId : targetUser.branchId;
    if (resolvedRole === 'owner') {
      resolvedBranch = undefined;
    } else if ((resolvedRole === 'front_desk' || resolvedRole === 'housekeeping') && !resolvedBranch) {
      return fail('err.staff.branchRequiredAssigned');
    }

    // Username uniqueness check if changed
    if (data.username && data.username.trim().toLowerCase() !== targetUser.username.toLowerCase()) {
      const newUname = data.username.trim().toLowerCase();
      if (staffUsers.some((u) => u.id !== id && u.username.toLowerCase() === newUname)) {
        return fail('err.staff.usernameTaken', { username: newUname });
      }
    }

    const updatedUser: StaffUser = {
      ...targetUser,
      ...data,
      role: resolvedRole,
      branchId: resolvedBranch,
      name: data.name !== undefined ? data.name.trim() : targetUser.name,
      username: data.username !== undefined ? data.username.trim().toLowerCase() : targetUser.username,
      title: data.title !== undefined ? data.title.trim() : targetUser.title
    };

    setStaffUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));

    // If updating current user, sync current user
    if (currentUser?.id === id) {
      setCurrentUser(updatedUser);
      sessionStorage.setItem(`${STORAGE_PREFIX}_user`, JSON.stringify(updatedUser));
    }

    logStaffActivity('Update Staff Member', `Updated details for staff member ${updatedUser.name} (${updatedUser.username}).`);
    notify('msg.staff.updated', { name: updatedUser.name }, 'success');
    return { success: true };
  };

  const toggleStaffActive = (id: string, active: boolean): Result => {
    if (currentUser?.role !== 'owner' && currentUser?.role !== 'manager') {
      return fail('err.staff.unauthorizedStatus');
    }

    const targetUser = staffUsers.find((u) => u.id === id);
    if (!targetUser) return fail('err.staff.notFound');

    // Nobody can deactivate themselves
    if (currentUser?.id === id && !active) {
      return fail('err.staff.cannotDeactivateSelf');
    }

    // Managers cannot alter managers or owners
    if (currentUser?.role === 'manager' && (targetUser.role === 'owner' || targetUser.role === 'manager')) {
      return fail('err.staff.managerStatusLimit');
    }

    // The last active owner can never be deactivated or demoted
    if (targetUser.role === 'owner' && !active) {
      const activeOwners = staffUsers.filter((u) => u.role === 'owner' && u.isActive && u.id !== id);
      if (activeOwners.length === 0) {
        return fail('err.staff.deactivateLastOwner');
      }
    }

    setStaffUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: active } : u))
    );

    logStaffActivity(
      active ? 'Reactivate Staff Member' : 'Deactivate Staff Member',
      `${active ? 'Reactivated' : 'Deactivated'} staff member ${targetUser.name} (${targetUser.username}).`
    );
    notify(
      active ? 'msg.staff.activated' : 'msg.staff.deactivated',
      { name: targetUser.name },
      active ? 'success' : 'info'
    );
    return { success: true };
  };

  const resetStaffPassword = async (id: string, newPassword: string): Promise<Result> => {
    if (currentUser?.role !== 'owner' && currentUser?.role !== 'manager') {
      return fail('err.staff.unauthorizedReset');
    }

    const targetUser = staffUsers.find((u) => u.id === id);
    if (!targetUser) return fail('err.staff.notFound');

    if (currentUser?.role === 'manager' && (targetUser.role === 'owner' || targetUser.role === 'manager')) {
      return fail('err.staff.managerResetLimit');
    }

    if (!newPassword || newPassword.length < 8) {
      return fail('err.staff.passwordMin');
    }

    const salt = generateSalt();
    const hash = await hashPassword(newPassword, salt);

    setStaffUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, passwordSalt: salt, passwordHash: hash } : u))
    );

    logStaffActivity('Reset Staff Password', `Reset password for staff member ${targetUser.name} (${targetUser.username}).`);
    notify('msg.staff.passwordReset', { name: targetUser.name }, 'success');
    return { success: true };
  };

  const changeMyPassword = async (oldPassword: string, newPassword: string): Promise<Result> => {
    if (!currentUser) return fail('err.staff.noUserSignedIn');

    const targetUser = staffUsers.find((u) => u.id === currentUser.id);
    if (!targetUser) return fail('err.staff.notFound');

    const isOldPwValid = await verifyPassword(oldPassword, targetUser.passwordSalt || '', targetUser.passwordHash || '');
    if (!isOldPwValid) {
      return fail('err.staff.oldPasswordMismatch');
    }

    if (!newPassword || newPassword.length < 8) {
      return fail('err.staff.passwordMin');
    }

    const salt = generateSalt();
    const hash = await hashPassword(newPassword, salt);

    const updatedUser: StaffUser = {
      ...targetUser,
      passwordSalt: salt,
      passwordHash: hash
    };

    setStaffUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    setCurrentUser(updatedUser);
    sessionStorage.setItem(`${STORAGE_PREFIX}_user`, JSON.stringify(updatedUser));

    logStaffActivity('Change Own Password', `${currentUser.name} successfully changed their account password.`);
    notify('msg.staff.passwordChanged', undefined, 'success');
    return { success: true };
  };

  // Property Config
  const updateHotelConfig = (newConfig: Partial<HotelConfig>): Result => {
    if (!currentUser || !['manager', 'owner'].includes(currentUser.role)) {
      notify('err.hotel.unauthorized', undefined, 'warning');
      return fail('err.hotel.unauthorized');
    }

    const changedKeys = Object.keys(newConfig).filter((key) => {
      const k = key as keyof HotelConfig;
      return newConfig[k] !== undefined && JSON.stringify(newConfig[k]) !== JSON.stringify(hotelConfig[k]);
    });

    setHotelConfig((prev) => ({ ...prev, ...newConfig }));

    const changedFieldNames = changedKeys.length > 0 ? changedKeys.join(', ') : Object.keys(newConfig).join(', ');
    logStaffActivity(
      'Update Hotel Config',
      `Staff member ${currentUser.name} (${currentUser.role}) updated hotel settings: ${changedFieldNames}`
    );

    notify('msg.hotel.updated', undefined, 'success');
    return { success: true };
  };

  const updateRoomTypePricing = (roomTypeId: string, newBasePrice: number) => {
    if (!canEditRates) {
      notify('err.room.rateEditUnauthorized', undefined, 'warning');
      return;
    }
    setRoomTypes((prev) =>
      prev.map((rt) => (rt.id === roomTypeId ? { ...rt, basePrice: newBasePrice } : rt))
    );
    // Also update any available room pricing across inventory
    setAllRooms((prev) =>
      prev.map((r) =>
        r.roomTypeId === roomTypeId && r.status === 'available'
          ? { ...r, pricePerNight: newBasePrice }
          : r
      )
    );
    notify('msg.room.pricingUpdated', undefined, 'success');
  };

  // HMS Operational Mutations
  const updateRoomStatus = (roomId: string, status: RoomStatus, note?: string) => {
    if (isReadOnly) {
      notify('err.room.readOnly', undefined, 'warning');
      return;
    }

    setAllRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          status,
          maintenanceNote: note !== undefined ? note : r.maintenanceNote,
          lastCleaned:
            status === 'available'
              ? `${businessDate} ${new Date().toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}`
              : r.lastCleaned
        };
      })
    );
    notify('msg.room.statusUpdated', { status: status.toUpperCase() }, 'info');
  };

  const checkInGuest = (payload: CheckInPayload): Result & { reservationId?: string } => {
    if (!canCheckIn) {
      return fail('err.checkin.unauthorized');
    }

    const room = allRooms.find((r) => r.id === payload.roomId);
    if (!room) return fail('err.checkin.targetRoomNotFound');
    
    // Validate dates
    if (!isValidDateString(payload.checkInDate) || !isValidDateString(payload.checkOutDate)) {
      return fail('err.checkin.invalidDates');
    }
    if (payload.checkOutDate <= payload.checkInDate) {
      return fail('err.res.checkoutBeforeCheckin');
    }
    if (payload.checkInDate < businessDate) {
      return fail('err.res.checkinPast');
    }

    // Check date availability overlap
    const isFree = isRoomAvailableForDateRange(room.id, payload.checkInDate, payload.checkOutDate);
    if (!isFree) {
      return fail('err.checkin.roomBooked', { number: room.roomNumber });
    }

    // Check-in Valve: block immediate check-in for future dates
    if (payload.checkInDate > businessDate) {
      return fail('err.checkin.earlyBlocked', { date: payload.checkInDate, today: businessDate });
    }

    if (['occupied', 'dirty', 'cleaning', 'maintenance'].includes(room.status)) {
      return fail('err.checkin.roomNotAvailable', { number: room.roomNumber, status: room.status });
    }

    const effectiveIdCard = payload.idCardNumber || '';
    if (!effectiveIdCard.trim()) {
      return fail('err.checkin.idCardRequired');
    }

    const targetBranchId = room.branchId || (activeBranchId !== 'all' ? activeBranchId : defaultBranchId);

    let guest = guests.find(
      (g) =>
        g.phone === payload.phone ||
        (payload.email && g.email === payload.email) ||
        g.idCardNumber === effectiveIdCard
    );

    if (!guest) {
      guest = {
        id: `gst-${Date.now()}`,
        fullName: payload.guestName,
        phone: payload.phone,
        email: payload.email || '',
        idCardNumber: effectiveIdCard,
        nationality: payload.nationality || 'Cameroonian',
        vipTier: 'Standard',
        notes: payload.specialRequests || '',
        totalVisits: 0,
        totalSpent: 0,
        createdAt: businessDate
      };
      setGuests((prev) => [guest!, ...prev]);
    }

    const start = new Date(payload.checkInDate).getTime();
    const end = new Date(payload.checkOutDate).getTime();
    const nights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    const totalAmount = room.pricePerNight * nights;
    const resId = `res-${Date.now()}`;
    const bookingCode = `BK-${room.roomNumber}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReservation: Reservation = {
      id: resId,
      branchId: targetBranchId,
      bookingCode,
      roomId: room.id,
      roomNumber: room.roomNumber,
      roomTypeId: room.roomTypeId,
      guestId: guest.id,
      guestName: guest.fullName,
      guestPhone: guest.phone,
      checkInDate: payload.checkInDate,
      checkOutDate: payload.checkOutDate,
      adults: payload.adults,
      children: payload.children,
      nightlyRate: room.pricePerNight,
      totalNights: nights,
      totalAmount,
      amountPaid: payload.amountPaid,
      paymentStatus: payload.amountPaid >= totalAmount ? 'paid' : payload.amountPaid > 0 ? 'partial' : 'unpaid',
      bookingStatus: 'checked_in',
      paymentMethod: payload.paymentMethod,
      source: payload.source,
      specialRequests: payload.specialRequests,
      keyReturned: false,
      createdAt: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      checkedInAt: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      checkedInBy: currentUser?.name || 'Staff'
    };

    const roomChargeTx: FolioTransaction = {
      id: `tx-${Date.now()}-1`,
      branchId: targetBranchId,
      reservationId: resId,
      guestId: guest.id,
      roomNumber: room.roomNumber,
      category: 'room_charge',
      description: `${nights} Night(s) Accommodation (Room ${room.roomNumber})`,
      amount: totalAmount,
      type: 'charge',
      timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      recordedBy: currentUser?.name || 'Front Desk'
    };

    const paymentTxs: FolioTransaction[] = [roomChargeTx];
    if (payload.amountPaid > 0) {
      paymentTxs.push({
        id: `tx-${Date.now()}-2`,
        branchId: targetBranchId,
        reservationId: resId,
        guestId: guest.id,
        roomNumber: room.roomNumber,
        category: 'deposit',
        description: `Check-in Deposit (${payload.paymentMethod.toUpperCase()})`,
        amount: payload.amountPaid,
        type: 'payment',
        paymentMethod: payload.paymentMethod,
        reference: `${payload.paymentMethod.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        recordedBy: currentUser?.name || 'Front Desk'
      });
    }

    setAllReservations((prev) => [newReservation, ...prev]);
    setAllTransactions((prev) => [...paymentTxs, ...prev]);

    setAllRooms((prev) =>
      prev.map((r) =>
        r.id === room.id
          ? { ...r, status: 'occupied', currentReservationId: resId }
          : r
      )
    );

    logStaffActivity(
      'Check In Guest',
      `Walk-in check-in for ${guest.fullName} into Room #${room.roomNumber} (${nights} nights, ${payload.checkInDate} to ${payload.checkOutDate}).`
    );

    notify('msg.checkin.success', { guest: guest.fullName, number: room.roomNumber }, 'success');
    return { success: true, reservationId: resId };
  };

  const isRoomAvailableForDateRange = (
    roomId: string,
    checkInDate: string,
    checkOutDate: string,
    excludeReservationId?: string
  ): boolean => {
    const room = allRooms.find((r) => r.id === roomId);
    if (!room || room.isActive === false) return false;

    const branchId = room.branchId || defaultBranchId;
    const branchRooms = allRooms.filter((r) => (r.branchId || defaultBranchId) === branchId);
    const branchReservations = allReservations.filter((res) => (res.branchId || defaultBranchId) === branchId);

    const check = checkAvailability({
      branchId,
      roomTypeId: room.roomTypeId,
      checkInDate,
      checkOutDate,
      rooms: branchRooms,
      reservations: branchReservations,
      excludeReservationId,
      requestedRoomId: roomId
    });

    return check.available;
  };

  const getAvailableRoomsForDateRange = (
    checkInDate: string,
    checkOutDate: string,
    roomTypeId?: string,
    excludeReservationId?: string
  ): Room[] => {
    const targetBranchId = activeBranchId === 'all' ? undefined : activeBranchId;
    return allRooms.filter((room) => {
      if (room.isActive === false) return false;
      if (targetBranchId && room.branchId !== targetBranchId) return false;
      if (roomTypeId && room.roomTypeId !== roomTypeId) return false;

      return isRoomAvailableForDateRange(room.id, checkInDate, checkOutDate, excludeReservationId);
    });
  };

  const getNextUpcomingReservationForRoom = (roomId: string): Reservation | undefined => {
    const upcoming = allReservations
      .filter(
        (res) =>
          res.roomId === roomId &&
          res.bookingStatus === 'reserved' &&
          res.checkInDate >= businessDate
      )
      .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));

    return upcoming[0];
  };

  const createReservation = (
    payload: CreateReservationPayload
  ): Result & { reservationId?: string } => {
    if (!isValidDateString(payload.checkInDate) || !isValidDateString(payload.checkOutDate)) {
      return fail('err.res.invalidDates');
    }
    if (payload.checkOutDate <= payload.checkInDate) {
      return fail('err.res.checkoutBeforeCheckin');
    }
    if (payload.checkInDate < businessDate) {
      return fail('err.res.checkinPast');
    }
    if (payload.adults < 1) {
      return fail('err.res.adultMin');
    }

    const roomType = roomTypes.find((rt) => rt.id === payload.roomTypeId);
    if (!roomType) {
      return fail('err.res.roomTypeNotFound');
    }

    const totalGuests = payload.adults + (payload.children || 0);
    if (totalGuests > roomType.maxCapacity) {
      return fail('err.res.exceedsCapacity', { total: totalGuests, capacity: roomType.maxCapacity, name: roomType.name });
    }

    const targetBranchId =
      activeBranchId !== 'all'
        ? activeBranchId
        : payload.roomId
        ? (allRooms.find((r) => r.id === payload.roomId)?.branchId || defaultBranchId)
        : defaultBranchId;

    let assignedRoom: Room | undefined;
    if (payload.roomId) {
      assignedRoom = allRooms.find(
        (r) => r.id === payload.roomId && r.branchId === targetBranchId && r.isActive !== false
      );
      if (!assignedRoom) {
        return fail('err.res.roomNotFoundOrDeactivated');
      }
    }

    const branchRooms = allRooms.filter((r) => (r.branchId || defaultBranchId) === targetBranchId);
    const branchReservations = allReservations.filter((res) => (res.branchId || defaultBranchId) === targetBranchId);

    const availCheck = checkAvailability({
      branchId: targetBranchId,
      roomTypeId: roomType.id,
      checkInDate: payload.checkInDate,
      checkOutDate: payload.checkOutDate,
      rooms: branchRooms,
      reservations: branchReservations,
      requestedRoomId: assignedRoom ? assignedRoom.id : undefined
    });

    if (!availCheck.available) {
      return fail(availCheck.reasonKey || 'err.res.noRoomsAvailable', availCheck.reasonVars || { name: roomType.name });
    }

    let guest = payload.guestId ? guests.find((g) => g.id === payload.guestId) : undefined;
    if (!guest) {
      guest = guests.find(
        (g) =>
          g.phone === payload.phone ||
          (payload.email && g.email && g.email.toLowerCase() === payload.email.toLowerCase()) ||
          (payload.idCardNumber && g.idCardNumber && g.idCardNumber === payload.idCardNumber)
      );
    }

    const deposit = payload.depositAmount && payload.depositAmount > 0 ? payload.depositAmount : 0;

    if (!guest) {
      guest = {
        id: `gst-${Date.now()}`,
        fullName: payload.guestName,
        phone: payload.phone,
        email: payload.email || '',
        idCardNumber: payload.idCardNumber || '',
        nationality: payload.nationality || 'Cameroonian',
        vipTier: 'Standard',
        notes: payload.specialRequests || '',
        totalVisits: 0,
        totalSpent: 0,
        createdAt: businessDate
      };
      setGuests((prev) => [guest!, ...prev]);
    }

    const nights = calculateStayNights(payload.checkInDate, payload.checkOutDate);
    const nightlyRate = assignedRoom ? assignedRoom.pricePerNight : roomType.basePrice;
    const totalAmount = nightlyRate * nights;
    const resId = `res-${Date.now()}`;
    const codeSuffix = assignedRoom ? assignedRoom.roomNumber : roomType.code;
    const bookingCode = `BK-${codeSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRes: Reservation = {
      id: resId,
      branchId: targetBranchId,
      bookingCode,
      roomId: assignedRoom ? assignedRoom.id : '',
      roomNumber: assignedRoom ? assignedRoom.roomNumber : 'Unassigned',
      roomTypeId: roomType.id,
      guestId: guest.id,
      guestName: guest.fullName,
      guestPhone: guest.phone,
      checkInDate: payload.checkInDate,
      checkOutDate: payload.checkOutDate,
      adults: payload.adults,
      children: payload.children || 0,
      nightlyRate,
      totalNights: nights,
      totalAmount,
      amountPaid: deposit,
      paymentStatus: deposit >= totalAmount ? 'paid' : deposit > 0 ? 'partial' : 'unpaid',
      bookingStatus: 'reserved',
      paymentMethod: payload.depositMethod || 'cash',
      source: payload.source,
      specialRequests: payload.specialRequests,
      keyReturned: false,
      rateType: payload.rateType === 'non_refundable' ? 'non_refundable' : 'flexible',
      createdAt: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    };

    const timestamp = `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    const staffName = currentUser?.name || 'Staff';

    const roomChargeTx: FolioTransaction = {
      id: `tx-${Date.now()}-1`,
      branchId: targetBranchId,
      reservationId: resId,
      guestId: guest.id,
      roomNumber: assignedRoom ? assignedRoom.roomNumber : 'Unassigned',
      category: 'room_charge',
      description: `${nights} Night(s) Stay (${roomType.name}${assignedRoom ? ` - Room #${assignedRoom.roomNumber}` : ''})`,
      amount: totalAmount,
      type: 'charge',
      timestamp,
      recordedBy: staffName
    };

    const txs: FolioTransaction[] = [roomChargeTx];
    if (deposit > 0 && payload.depositMethod) {
      txs.push({
        id: `tx-${Date.now()}-2`,
        branchId: targetBranchId,
        reservationId: resId,
        guestId: guest.id,
        roomNumber: assignedRoom ? assignedRoom.roomNumber : 'Unassigned',
        category: 'deposit',
        description: `Reservation Advance Deposit (${payload.depositMethod.toUpperCase()})`,
        amount: deposit,
        type: 'payment',
        paymentMethod: payload.depositMethod,
        reference: `${payload.depositMethod.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp,
        recordedBy: staffName
      });
    }

    setAllReservations((prev) => [newRes, ...prev]);
    setAllTransactions((prev) => [...txs, ...prev]);

    logStaffActivity(
      'Create Reservation',
      `Created reservation ${bookingCode} for ${guest.fullName} (${roomType.name}, ${payload.checkInDate} to ${payload.checkOutDate}${assignedRoom ? `, Room #${assignedRoom.roomNumber}` : ', Hold Room Type'}${deposit > 0 ? `, Deposit: ${formatMoney(deposit)}` : ''})`
    );

    notify('msg.res.confirmed', { code: bookingCode, guest: guest.fullName }, 'success');
    return { success: true, reservationId: resId };
  };

  const updateReservation = (
    reservationId: string,
    payload: UpdateReservationPayload
  ): Result => {
    const res = allReservations.find((r) => r.id === reservationId);
    if (!res) return fail('err.res.notFound');
    if (res.bookingStatus !== 'reserved') {
      return fail('err.res.editOnlyReserved');
    }

    if (!isValidDateString(payload.checkInDate) || !isValidDateString(payload.checkOutDate)) {
      return fail('err.res.invalidDates');
    }
    if (payload.checkOutDate <= payload.checkInDate) {
      return fail('err.res.checkoutBeforeCheckin');
    }
    if (payload.checkInDate < businessDate) {
      return fail('err.res.checkinPast');
    }

    const roomType = roomTypes.find((rt) => rt.id === payload.roomTypeId);
    if (!roomType) return fail('err.res.roomTypeInvalid');

    const totalGuests = payload.adults + (payload.children || 0);
    if (totalGuests > roomType.maxCapacity) {
      return fail('err.res.exceedsCapacity', { total: totalGuests, capacity: roomType.maxCapacity, name: roomType.name });
    }

    const targetBranchId = res.branchId || defaultBranchId;

    let assignedRoom: Room | undefined;
    if (payload.roomId) {
      assignedRoom = allRooms.find((r) => r.id === payload.roomId && r.isActive !== false);
      if (!assignedRoom) return fail('err.res.roomNotFoundOrDeactivated');
    }

    const branchRooms = allRooms.filter((r) => (r.branchId || defaultBranchId) === targetBranchId);
    const branchReservations = allReservations.filter((r) => (r.branchId || defaultBranchId) === targetBranchId);

    const availCheck = checkAvailability({
      branchId: targetBranchId,
      roomTypeId: roomType.id,
      checkInDate: payload.checkInDate,
      checkOutDate: payload.checkOutDate,
      rooms: branchRooms,
      reservations: branchReservations,
      excludeReservationId: reservationId,
      requestedRoomId: assignedRoom ? assignedRoom.id : undefined
    });

    if (!availCheck.available) {
      return fail(availCheck.reasonKey || 'err.res.noRoomsAvailable', availCheck.reasonVars || { name: roomType.name });
    }

    const nights = calculateStayNights(payload.checkInDate, payload.checkOutDate);
    const nightlyRate = assignedRoom ? assignedRoom.pricePerNight : roomType.basePrice;
    const newTotalAmount = nightlyRate * nights;

    setAllReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId
          ? {
              ...r,
              checkInDate: payload.checkInDate,
              checkOutDate: payload.checkOutDate,
              roomTypeId: roomType.id,
              roomId: assignedRoom ? assignedRoom.id : '',
              roomNumber: assignedRoom ? assignedRoom.roomNumber : 'Unassigned',
              adults: payload.adults,
              children: payload.children || 0,
              nightlyRate,
              totalNights: nights,
              totalAmount: newTotalAmount,
              paymentStatus: r.amountPaid >= newTotalAmount ? 'paid' : r.amountPaid > 0 ? 'partial' : 'unpaid',
              source: payload.source || r.source,
              specialRequests: payload.specialRequests !== undefined ? payload.specialRequests : r.specialRequests,
              rateType: payload.rateType !== undefined
                ? (payload.rateType === 'non_refundable' ? 'non_refundable' : 'flexible')
                : (r.rateType || 'flexible')
            }
          : r
      )
    );

    // Update room charge transaction
    setAllTransactions((prev) =>
      prev.map((tx) =>
        tx.reservationId === reservationId && tx.category === 'room_charge'
          ? {
              ...tx,
              amount: newTotalAmount,
              description: `${nights} Night(s) Stay (${roomType.name}${assignedRoom ? ` - Room #${assignedRoom.roomNumber}` : ''})`,
              roomNumber: assignedRoom ? assignedRoom.roomNumber : 'Unassigned'
            }
          : tx
      )
    );

    logStaffActivity(
      'Update Reservation',
      `Modified reservation ${res.bookingCode} for ${res.guestName}: Dates ${payload.checkInDate} to ${payload.checkOutDate}, ${roomType.name}${assignedRoom ? `, Room #${assignedRoom.roomNumber}` : ', Unassigned'}`
    );

    notify('msg.res.updated', { code: res.bookingCode }, 'success');
    return { success: true };
  };

  const cancelReservation = (
    reservationId: string,
    reason: string,
    cancellationFee?: number,
    isNoShow?: boolean,
    settlement?: 'refund' | 'credit',
    refundMethod?: PaymentMethod,
    feeMeta?: {
      suggestedFee: number;
      policyRuleText?: string;
      feeOverrideReason?: string;
    }
  ): Result => {
    const res = allReservations.find((r) => r.id === reservationId);
    if (!res) return fail('err.res.notFound');

    // Only bookings with status 'reserved' can be cancelled or marked no-show
    if (res.bookingStatus !== 'reserved') {
      if (res.bookingStatus === 'checked_in') {
        return fail('err.res.cancelCheckedIn');
      }
      return fail('err.res.cancelOnlyReserved', { status: res.bookingStatus });
    }

    if (!reason.trim()) {
      return fail('err.res.cancellationReasonRequired');
    }

    const timestamp = `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    const staffName = currentUser?.name || 'Staff';
    const fullReason = isNoShow ? `No-Show: ${reason.trim()}` : reason.trim();

    // Calculate suggested fee directly from stored hotelConfig and the reservation
    const feeCalculation = calculateCancellationFee({
      policy: hotelConfig.cancellationPolicy || DEFAULT_CANCELLATION_POLICY,
      booking: res,
      businessDate,
      isNoShow
    });
    const calculatedSuggestedFee = feeCalculation.suggestedFee;
    const calculatedRuleText = feeCalculation.ruleText;

    // Cap the fee at the booking's original total
    const rawFee = typeof cancellationFee === 'number' && cancellationFee > 0 ? cancellationFee : 0;
    const fee = Math.min(rawFee, res.totalAmount);
    
    let feeOverrideReason: string | undefined;
    let feeOverriddenBy: string | undefined;

    if (fee < calculatedSuggestedFee) {
      if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
        return fail('err.res.feeOverrideUnauthorized');
      }
      const overrideReason = feeMeta?.feeOverrideReason?.trim() || '';
      if (overrideReason.length < 5) {
        return fail('err.res.feeOverrideReasonMin');
      }
      feeOverrideReason = overrideReason;
      feeOverriddenBy = currentUser?.name || 'Manager';
    }

    // Sum non-voided payments/deposits on this folio using shared getFolioTotals
    const paid = getFolioTotals(allTransactions, res.id).netPaid;

    const newTransactions: FolioTransaction[] = [];

    // If fee > 0, post the fee as a charge with category 'cancellation_fee' or 'no_show_fee'
    if (fee > 0) {
      const feeTx: FolioTransaction = {
        id: `tx-${Date.now()}-fee`,
        branchId: res.branchId,
        reservationId: res.id,
        guestId: res.guestId,
        roomNumber: res.roomNumber,
        category: isNoShow ? 'no_show_fee' : 'cancellation_fee',
        description: isNoShow ? `No-Show Fee: ${fullReason}` : `Cancellation Fee: ${fullReason}`,
        amount: fee,
        type: 'charge',
        timestamp,
        recordedBy: staffName
      };
      newTransactions.push(feeTx);
    }

    // Settlement calculation
    let finalSettlement: 'refund' | 'credit' | undefined;
    let actualRefundAmount: number | undefined;
    let chosenRefundMethod: PaymentMethod | undefined;

    if (paid > fee) {
      const refundDue = paid - fee;
      if (settlement === 'refund') {
        finalSettlement = 'refund';
        actualRefundAmount = refundDue;
        chosenRefundMethod = refundMethod || res.paymentMethod || 'cash';

        const refundTx: FolioTransaction = {
          id: `tx-${Date.now()}-refund`,
          branchId: res.branchId,
          reservationId: res.id,
          guestId: res.guestId,
          roomNumber: res.roomNumber,
          category: 'refund',
          description: `Refund for Cancelled Reservation (${chosenRefundMethod.toUpperCase()})`,
          amount: -refundDue, // stored as a NEGATIVE amount
          type: 'payment',
          paymentMethod: chosenRefundMethod,
          reference: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
          timestamp,
          recordedBy: staffName
        };
        newTransactions.push(refundTx);
      } else {
        // settlement 'credit': post nothing more; folio shows a credit of (paid - fee)
        finalSettlement = 'credit';
      }
    }

    // Void the reservation's room_charge and discount transactions using the existing voided flag
    setAllTransactions((prev) => {
      const updated = prev.map((tx) =>
        tx.reservationId === res.id && (tx.category === 'room_charge' || tx.category === 'discount') && !tx.voided
          ? { ...tx, voided: true, voidedBy: staffName, voidReason: 'Reservation cancelled' }
          : tx
      );
      return [...newTransactions, ...updated];
    });

    // Store on the reservation: settlement, refundAmount, refundMethod, cancelledAt, cancelledBy, cancellationReason, cancellationFee
    setAllReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId
          ? {
              ...r,
              bookingStatus: 'cancelled',
              isNoShow: Boolean(isNoShow),
              cancelledAt: timestamp,
              cancelledBy: staffName,
              cancellationReason: fullReason,
              cancellationFee: fee,
              settlement: finalSettlement,
              refundAmount: actualRefundAmount,
              refundMethod: chosenRefundMethod,
              suggestedFee: calculatedSuggestedFee,
              policyRuleText: calculatedRuleText,
              feeOverrideReason,
              feeOverriddenBy
            }
          : r
      )
    );

    // Release any room holding this reservation
    setAllRooms((prev) =>
      prev.map((room) =>
        room.currentReservationId === reservationId
          ? {
              ...room,
              currentReservationId: undefined,
              status: room.status === 'reserved' ? 'available' : room.status
            }
          : room
      )
    );

    logStaffActivity(
      isNoShow ? 'Reservation No-Show' : 'Cancel Reservation',
      `Reservation ${res.bookingCode} for ${res.guestName} marked ${isNoShow ? 'No-Show' : 'Cancelled'}. Reason: "${fullReason}". Fee: ${formatMoney(fee)} (Suggested: ${formatMoney(calculatedSuggestedFee)}).${feeOverriddenBy ? ` Fee Overridden by ${feeOverriddenBy}: "${feeOverrideReason}".` : ''}${finalSettlement ? ` Settlement: ${finalSettlement}.` : ''}`
    );

    notify(
      isNoShow ? 'msg.res.noShow' : 'msg.res.cancelled',
      { code: res.bookingCode },
      'info'
    );
    return { success: true };
  };

  const convertReservationToCheckIn = (
    payload: ConvertToCheckInPayload
  ): Result => {
    const res = allReservations.find((r) => r.id === payload.reservationId);
    if (!res) return fail('err.res.notFound');
    if (res.bookingStatus !== 'reserved') {
      return fail('err.checkin.onlyReserved');
    }

    // Check-in Valve: strictly block checking in before scheduled check-in date
    if (res.checkInDate > businessDate) {
      return fail('err.checkin.earlyBlockedRes', { date: res.checkInDate, today: businessDate });
    }

    const room = allRooms.find((r) => r.id === payload.roomId);
    if (!room) return fail('err.checkin.targetRoomNotFound');
    if (room.isActive === false) return fail('err.checkin.roomDeactivated', { number: room.roomNumber });
    if (['occupied', 'dirty', 'cleaning', 'maintenance'].includes(room.status)) {
      return fail('err.checkin.roomNotAvailable', { number: room.roomNumber, status: room.status });
    }
    if (!isRoomAvailableForDateRange(room.id, res.checkInDate, res.checkOutDate, res.id)) {
      return fail('err.checkin.roomDatesUnavailable', { number: room.roomNumber });
    }

    const guest = guests.find((g) => g.id === res.guestId);
    const effectiveIdCard = payload.idCardNumber || guest?.idCardNumber || '';
    if (!effectiveIdCard.trim()) {
      return fail('err.checkin.idCardRequired');
    }
    if (payload.idCardNumber && payload.idCardNumber.trim()) {
      setGuests((prev) => prev.map((g) => g.id === res.guestId ? { ...g, idCardNumber: payload.idCardNumber!.trim() } : g));
    }

    const timestamp = `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    const staffName = currentUser?.name || 'Staff';

    const extraDeposit = payload.additionalDeposit && payload.additionalDeposit > 0 ? payload.additionalDeposit : 0;
    if (extraDeposit > 0 && payload.paymentMethod) {
      const depositTx: FolioTransaction = {
        id: `tx-${Date.now()}-extra-dep`,
        branchId: res.branchId,
        reservationId: res.id,
        guestId: res.guestId,
        roomNumber: room.roomNumber,
        category: 'deposit',
        description: `Check-in Deposit (${payload.paymentMethod.toUpperCase()})`,
        amount: extraDeposit,
        type: 'payment',
        paymentMethod: payload.paymentMethod,
        reference: `${payload.paymentMethod.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp,
        recordedBy: staffName
      };
      setAllTransactions((prev) => [depositTx, ...prev]);
    }

    const newAmountPaid = res.amountPaid + extraDeposit;

    setAllReservations((prev) =>
      prev.map((r) =>
        r.id === res.id
          ? {
              ...r,
              roomId: room.id,
              roomNumber: room.roomNumber,
              bookingStatus: 'checked_in',
              checkedInAt: timestamp,
              checkedInBy: staffName,
              amountPaid: newAmountPaid,
              paymentStatus: newAmountPaid >= r.totalAmount ? 'paid' : newAmountPaid > 0 ? 'partial' : 'unpaid'
            }
          : r
      )
    );

    setAllRooms((prev) =>
      prev.map((r) =>
        r.id === room.id
          ? { ...r, status: 'occupied', currentReservationId: res.id }
          : r
      )
    );

    logStaffActivity(
      'Check In Guest',
      `Guest ${res.guestName} checked into Room #${room.roomNumber} (Converted from Reservation ${res.bookingCode}).`
    );

    notify('msg.checkin.success', { guest: res.guestName, number: room.roomNumber }, 'success');
    return { success: true };
  };

  const checkOutGuest = (
    reservationId: string,
    paymentMethod?: PaymentMethod,
    settlementAmount?: number,
    splitLines?: Array<{ method: PaymentMethod; amount: number }>
  ): Result => {
    if (!canCheckOut) {
      return fail('err.checkout.unauthorized');
    }

    const res = allReservations.find((r) => r.id === reservationId);
    if (!res) return fail('err.res.notFound');

    const targetBranchId = res.branchId || defaultBranchId;
    let totalSettled = 0;

    if (splitLines && splitLines.length > 0) {
      const totals = getFolioTotals(allTransactions, res.id);
      const balanceDue = Math.max(0, totals.balance);
      totalSettled = splitLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

      const validation = validateSplitPayment({
        totalAmount: totalSettled,
        lines: splitLines
      });

      if (!validation.valid) {
        return fail(validation.errorKey || 'err.checkout.splitInvalid', validation.errorVars);
      }

      if (totalSettled > balanceDue) {
        return fail('err.checkout.amountExceedsBalance', {
          amount: formatMoney(totalSettled),
          balance: formatMoney(balanceDue)
        });
      }

      const splitGroupId = `SPLIT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const splitTxs: FolioTransaction[] = splitLines.map((line, idx) => ({
        id: `tx-${Date.now()}-stl-${idx}`,
        branchId: targetBranchId,
        reservationId: res.id,
        guestId: res.guestId,
        roomNumber: res.roomNumber,
        category: 'payment',
        description: `Check-Out Settlement (${line.method.toUpperCase()} - Split ${idx + 1}/${splitLines.length})`,
        amount: line.amount,
        type: 'payment',
        paymentMethod: line.method,
        reference: `STL-${Math.floor(100000 + Math.random() * 900000)}`,
        splitGroupId,
        timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        recordedBy: currentUser?.name || 'Front Desk'
      }));
      setAllTransactions((prev) => [...splitTxs, ...prev]);
    } else if (settlementAmount && settlementAmount > 0 && paymentMethod) {
      totalSettled = settlementAmount;
      const settlementTx: FolioTransaction = {
        id: `tx-${Date.now()}-stl`,
        branchId: targetBranchId,
        reservationId: res.id,
        guestId: res.guestId,
        roomNumber: res.roomNumber,
        category: 'payment',
        description: `Check-Out Settlement (${paymentMethod.toUpperCase()})`,
        amount: settlementAmount,
        type: 'payment',
        paymentMethod,
        reference: `STL-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        recordedBy: currentUser?.name || 'Front Desk'
      };
      setAllTransactions((prev) => [settlementTx, ...prev]);
    }

    setAllReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId
          ? {
              ...r,
              bookingStatus: 'checked_out',
              keyReturned: true,
              amountPaid: r.amountPaid + totalSettled,
              paymentStatus: 'paid',
              checkedOutAt: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            }
          : r
      )
    );

    // Turnover room to dirty for Housekeeping
    setAllRooms((prev) =>
      prev.map((room) =>
        room.id === res.roomId
          ? {
              ...room,
              status: 'dirty',
              currentReservationId: undefined,
              maintenanceNote: 'Turnover cleaning required after guest checkout.'
            }
          : room
      )
    );

    notify('msg.checkout.success', { number: res.roomNumber }, 'success');
    return { success: true };
  };

  const autoCheckOutGuest = (reservationId: string): Result => {
    if (hotelConfig.autoCheckOut === 'off') {
      return fail('err.checkout.autoDisabled');
    }

    const res = allReservations.find((r) => r.id === reservationId);
    if (!res) {
      return fail('err.res.notFound');
    }

    // Idempotent: if already checked out or not checked_in, return success gracefully
    if (res.bookingStatus !== 'checked_in') {
      return { success: true };
    }

    // Balance check: never auto-checkout if balance is above 0
    const totals = getFolioTotals(allTransactions, res.id);
    if (totals.balance > 0) {
      return fail('err.checkout.balanceRemaining');
    }

    const hotelNow = getHotelNow(hotelConfig.timeZone || 'Africa/Douala');

    setAllReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId
          ? {
              ...r,
              bookingStatus: 'checked_out',
              keyReturned: true,
              paymentStatus: 'paid',
              checkedOutAt: `${hotelNow.date} ${hotelNow.time}`
            }
          : r
      )
    );

    // Room becomes dirty for Housekeeping
    setAllRooms((prev) =>
      prev.map((room) =>
        room.id === res.roomId
          ? {
              ...room,
              status: 'dirty',
              currentReservationId: undefined,
              maintenanceNote: 'Turnover cleaning required after guest checkout.'
            }
          : room
      )
    );

    logStaffActivity(
      'Auto check-out (system)',
      `Room ${res.roomNumber} checked out automatically (${res.guestName})`,
      { id: 'system', name: 'System' }
    );
    notify('msg.autoCheckoutNotification', { room: res.roomNumber }, 'info');

    return { success: true };
  };

  const applyDiscount = (
    reservationId: string,
    type: 'percent' | 'fixed',
    value: number,
    reason: string
  ): Result => {
    if (!currentUser || !['manager', 'owner'].includes(currentUser.role)) {
      return fail('err.folio.discountUnauthorized');
    }

    if (!reason || reason.trim().length < 5) {
      return fail('err.folio.discountReasonMin');
    }

    const res = allReservations.find((r) => r.id === reservationId);
    if (!res) {
      return fail('err.res.notFound');
    }

    if (res.bookingStatus !== 'reserved' && res.bookingStatus !== 'checked_in') {
      return fail('err.folio.discountOnlyActive');
    }

    const totals = getFolioTotals(allTransactions, res.id);
    const baseCharges = totals.charges;

    if (baseCharges <= 0) {
      return fail('err.folio.discountNoCharges');
    }

    const { discountAmount } = calculateDiscount({
      type,
      value,
      chargesTotal: baseCharges
    });

    if (discountAmount <= 0) {
      return fail('err.folio.discountPositive');
    }

    if (baseCharges - discountAmount < 0) {
      return fail('err.folio.discountExceedsCharges');
    }

    const descPrefix = type === 'percent' ? `Discount (${value}%)` : `Discount (fixed)`;
    const description = `${descPrefix}: ${reason.trim()}`;
    const targetBranchId = res.branchId || defaultBranchId;

    const tx: FolioTransaction = {
      id: `tx-${Date.now()}-disc`,
      branchId: targetBranchId,
      reservationId: res.id,
      guestId: res.guestId,
      roomNumber: res.roomNumber,
      category: 'discount',
      description,
      amount: -discountAmount, // NEGATIVE charge!
      type: 'charge',
      timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      recordedBy: currentUser.name
    };

    setAllTransactions((prev) => [tx, ...prev]);

    const newTotalAmount = Math.max(0, res.totalAmount - discountAmount);
    setAllReservations((prev) =>
      prev.map((r) =>
        r.id === res.id
          ? {
              ...r,
              totalAmount: newTotalAmount,
              paymentStatus: r.amountPaid >= newTotalAmount ? 'paid' : r.amountPaid > 0 ? 'partial' : 'unpaid'
            }
          : r
      )
    );

    logStaffActivity(
      'Apply Discount',
      `Applied ${descPrefix} of ${formatMoney(discountAmount)} to reservation ${res.bookingCode} (Room #${res.roomNumber}). Reason: ${reason.trim()}`
    );

    notify('msg.folio.discountApplied', { amount: formatMoney(discountAmount) }, 'success');
    return { success: true };
  };

  const extendStay = (reservationId: string, newCheckOutDate: string): Result => {
    if (!currentUser || !['front_desk', 'manager', 'owner'].includes(currentUser.role)) {
      return fail('err.stay.extendUnauthorized');
    }

    const res = allReservations.find((r) => r.id === reservationId);
    if (!res) {
      return fail('err.res.notFound');
    }

    if (res.bookingStatus !== 'checked_in') {
      return fail('err.stay.extendOnlyCheckedIn');
    }

    const { addedNights, addedAmount } = calculateExtension({
      nightlyRate: res.nightlyRate,
      currentCheckOut: res.checkOutDate,
      newCheckOut: newCheckOutDate
    });

    if (addedNights <= 0) {
      return fail('err.stay.extendDateAfter');
    }

    const targetBranchId = res.branchId || defaultBranchId;
    const room = allRooms.find((r) => r.id === res.roomId);
    if (!room) {
      return fail('err.stay.roomNotFound');
    }

    const branchRooms = allRooms.filter((r) => (r.branchId || defaultBranchId) === targetBranchId);
    const branchReservations = allReservations.filter((r) => (r.branchId || defaultBranchId) === targetBranchId);

    const availCheck = checkAvailability({
      branchId: targetBranchId,
      roomTypeId: room.roomTypeId,
      checkInDate: res.checkOutDate,
      checkOutDate: newCheckOutDate,
      rooms: branchRooms,
      reservations: branchReservations,
      excludeReservationId: res.id,
      requestedRoomId: res.roomId
    });

    if (!availCheck.available) {
      return fail(availCheck.reasonKey || 'err.stay.extendNotAvailable', availCheck.reasonVars);
    }

    const tx: FolioTransaction = {
      id: `tx-${Date.now()}-ext`,
      branchId: targetBranchId,
      reservationId: res.id,
      guestId: res.guestId,
      roomNumber: res.roomNumber,
      category: 'room_charge',
      description: `Stay extension: ${addedNights} night(s) to ${newCheckOutDate}`,
      amount: addedAmount,
      type: 'charge',
      timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      recordedBy: currentUser.name
    };

    setAllTransactions((prev) => [tx, ...prev]);

    const newTotalAmount = res.totalAmount + addedAmount;
    const newTotalNights = res.totalNights + addedNights;

    setAllReservations((prev) =>
      prev.map((r) =>
        r.id === res.id
          ? {
              ...r,
              checkOutDate: newCheckOutDate,
              totalNights: newTotalNights,
              totalAmount: newTotalAmount,
              paymentStatus: r.amountPaid >= newTotalAmount ? 'paid' : r.amountPaid > 0 ? 'partial' : 'unpaid'
            }
          : r
      )
    );

    logStaffActivity(
      'Extend Stay',
      `Extended stay for reservation ${res.bookingCode} (Room #${res.roomNumber}) by ${addedNights} night(s) to ${newCheckOutDate}. Added amount: ${formatMoney(addedAmount)}.`
    );

    notify('msg.stay.extended', { number: res.roomNumber, date: newCheckOutDate, nights: addedNights }, 'success');
    return { success: true };
  };

  const shortenStay = (
    reservationId: string,
    newCheckOutDate: string,
    reason: string
  ): Result => {
    if (!currentUser || !['manager', 'owner'].includes(currentUser.role)) {
      return fail('err.stay.shortenUnauthorized');
    }

    if (!reason || reason.trim().length < 5) {
      return fail('err.stay.shortenReasonMin');
    }

    const res = allReservations.find((r) => r.id === reservationId);
    if (!res) {
      return fail('err.res.notFound');
    }

    if (res.bookingStatus !== 'checked_in') {
      return fail('err.stay.shortenOnlyCheckedIn');
    }

    const targetBranchId = res.branchId || defaultBranchId;
    const branchCurrentDate = (targetBranchId && branchBusinessDates[targetBranchId]) || businessDate || getLocalDateString();

    if (newCheckOutDate <= branchCurrentDate) {
      return fail('err.stay.shortenAfterBusinessDate', { date: branchCurrentDate });
    }

    const { removedNights, creditAmount } = calculateShortening({
      nightlyRate: res.nightlyRate,
      currentCheckOut: res.checkOutDate,
      newCheckOut: newCheckOutDate
    });

    if (removedNights <= 0) {
      return fail('err.stay.shortenDateBefore');
    }

    const tx: FolioTransaction = {
      id: `tx-${Date.now()}-shrt`,
      branchId: targetBranchId,
      reservationId: res.id,
      guestId: res.guestId,
      roomNumber: res.roomNumber,
      category: 'room_charge_void',
      description: `Early departure: ${removedNights} night(s) removed`,
      amount: -creditAmount,
      type: 'charge',
      timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      recordedBy: currentUser.name
    };

    setAllTransactions((prev) => [tx, ...prev]);

    const newTotalAmount = Math.max(0, res.totalAmount - creditAmount);
    const newTotalNights = Math.max(1, res.totalNights - removedNights);

    setAllReservations((prev) =>
      prev.map((r) =>
        r.id === res.id
          ? {
              ...r,
              checkOutDate: newCheckOutDate,
              totalNights: newTotalNights,
              totalAmount: newTotalAmount,
              paymentStatus: r.amountPaid >= newTotalAmount ? 'paid' : r.amountPaid > 0 ? 'partial' : 'unpaid'
            }
          : r
      )
    );

    logStaffActivity(
      'Shorten Stay',
      `Shortened stay for reservation ${res.bookingCode} (Room #${res.roomNumber}) by ${removedNights} night(s) to ${newCheckOutDate}. Credit: ${formatMoney(creditAmount)}. Reason: ${reason.trim()}`
    );

    notify('msg.stay.shortened', { number: res.roomNumber, date: newCheckOutDate, nights: removedNights }, 'success');
    return { success: true };
  };

  const changeRoom = (
    reservationId: string,
    newRoomId: string,
    reason: string,
    keepCurrentRate: boolean
  ): Result => {
    if (!currentUser || !['front_desk', 'manager', 'owner'].includes(currentUser.role)) {
      return fail('err.stay.moveUnauthorized');
    }

    if (!reason || reason.trim().length === 0) {
      return fail('err.stay.moveReasonRequired');
    }

    if (!keepCurrentRate && !['manager', 'owner'].includes(currentUser.role)) {
      return fail('err.stay.moveRateUnauthorized');
    }

    const res = allReservations.find((r) => r.id === reservationId);
    if (!res) {
      return fail('err.res.notFound');
    }

    if (res.bookingStatus !== 'checked_in') {
      return fail('err.stay.moveOnlyCheckedIn');
    }

    const newRoom = allRooms.find((r) => r.id === newRoomId);
    if (!newRoom) {
      return fail('err.stay.moveTargetNotFound');
    }

    if (newRoom.id === res.roomId) {
      return fail('err.stay.moveSameRoom');
    }

    const targetBranchId = res.branchId || defaultBranchId;

    if ((newRoom.branchId || defaultBranchId) !== targetBranchId) {
      return fail('err.stay.moveSameBranch');
    }

    if (newRoom.isActive === false) {
      return fail('err.stay.moveNotActive');
    }

    if (newRoom.status !== 'available') {
      return fail('err.stay.moveNotAvailableStatus', { status: newRoom.status });
    }

    const branchCurrentDate = (targetBranchId && branchBusinessDates[targetBranchId]) || businessDate || getLocalDateString();
    const branchRooms = allRooms.filter((r) => (r.branchId || defaultBranchId) === targetBranchId);
    const branchReservations = allReservations.filter((r) => (r.branchId || defaultBranchId) === targetBranchId);

    const availCheck = checkAvailability({
      branchId: targetBranchId,
      roomTypeId: newRoom.roomTypeId,
      checkInDate: branchCurrentDate,
      checkOutDate: res.checkOutDate,
      rooms: branchRooms,
      reservations: branchReservations,
      excludeReservationId: res.id,
      requestedRoomId: newRoom.id
    });

    if (!availCheck.available) {
      return fail(availCheck.reasonKey || 'err.stay.moveNotAvailableDates', availCheck.reasonVars);
    }

    const remainingNightsList = listNights(branchCurrentDate, res.checkOutDate);
    const remainingNights = Math.max(1, remainingNightsList.length);
    const oldRate = res.nightlyRate;
    const newRate = keepCurrentRate ? oldRate : newRoom.pricePerNight;

    const { adjustmentAmount } = calculateRoomMoveAdjustment({
      remainingNights,
      oldRate,
      newRate,
      keepCurrentRate
    });

    if (adjustmentAmount !== 0) {
      const isPositive = adjustmentAmount > 0;
      const tx: FolioTransaction = {
        id: `tx-${Date.now()}-mv-adj`,
        branchId: targetBranchId,
        reservationId: res.id,
        guestId: res.guestId,
        roomNumber: newRoom.roomNumber,
        category: isPositive ? 'room_charge' : 'room_charge_void',
        description: `Room move rate adjustment: #${res.roomNumber} -> #${newRoom.roomNumber} (${remainingNights} night(s) @ ${newRate - oldRate > 0 ? '+' : ''}${newRate - oldRate} FCFA)`,
        amount: adjustmentAmount,
        type: 'charge',
        timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        recordedBy: currentUser.name
      };

      setAllTransactions((prev) => [tx, ...prev]);
    }

    setAllRooms((prev) =>
      prev.map((r) => {
        if (r.id === res.roomId) {
          return {
            ...r,
            status: 'dirty',
            currentReservationId: undefined,
            maintenanceNote: `Turnover cleaning required after room move to #${newRoom.roomNumber}.`
          };
        }
        if (r.id === newRoom.id) {
          return {
            ...r,
            status: 'occupied',
            currentReservationId: res.id
          };
        }
        return r;
      })
    );

    const moveEntry = {
      fromRoom: res.roomNumber,
      toRoom: newRoom.roomNumber,
      at: new Date().toISOString(),
      by: currentUser.name,
      reason: reason.trim()
    };

    const newTotalAmount = res.totalAmount + adjustmentAmount;

    setAllReservations((prev) =>
      prev.map((r) =>
        r.id === res.id
          ? {
              ...r,
              roomId: newRoom.id,
              roomNumber: newRoom.roomNumber,
              roomTypeId: newRoom.roomTypeId,
              nightlyRate: newRate,
              totalAmount: newTotalAmount,
              roomMoves: [...(r.roomMoves || []), moveEntry],
              paymentStatus: r.amountPaid >= newTotalAmount ? 'paid' : r.amountPaid > 0 ? 'partial' : 'unpaid'
            }
          : r
      )
    );

    logStaffActivity(
      'Change Room',
      `Moved reservation ${res.bookingCode} from Room #${res.roomNumber} to Room #${newRoom.roomNumber}. Rate: ${oldRate} -> ${newRate} FCFA (Adj: ${formatMoney(adjustmentAmount)}). Reason: ${reason.trim()}`
    );

    notify('msg.stay.moved', { guest: res.guestName, from: res.roomNumber, to: newRoom.roomNumber }, 'success');
    return { success: true };
  };

  const addFolioCharge = (charge: Omit<FolioTransaction, 'id' | 'timestamp'>) => {
    if (isReadOnly) {
      notify('err.folio.ownerNoCharges', undefined, 'warning');
      return;
    }

    const res = allReservations.find((r) => r.id === charge.reservationId);
    const targetBranchId = charge.branchId || res?.branchId || defaultBranchId;

    const tx: FolioTransaction = {
      ...charge,
      branchId: targetBranchId,
      id: `tx-${Date.now()}`,
      timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    };

    setAllTransactions((prev) => [tx, ...prev]);

    setAllReservations((prev) =>
      prev.map((r) => {
        if (r.id !== charge.reservationId) return r;
        const newTotal = r.totalAmount + charge.amount;
        return {
          ...r,
          totalAmount: newTotal,
          paymentStatus: r.amountPaid >= newTotal ? 'paid' : 'partial'
        };
      })
    );

    notify('msg.folio.chargePosted', { desc: charge.description, amount: formatMoney(charge.amount), number: charge.roomNumber }, 'info');
  };

  const recordFolioPayment = (payment: Omit<FolioTransaction, 'id' | 'timestamp' | 'type'>) => {
    if (isReadOnly) {
      notify('err.folio.ownerNoPayments', undefined, 'warning');
      return;
    }

    const res = allReservations.find((r) => r.id === payment.reservationId);
    const targetBranchId = payment.branchId || res?.branchId || defaultBranchId;

    const tx: FolioTransaction = {
      ...payment,
      branchId: targetBranchId,
      id: `tx-${Date.now()}`,
      type: 'payment',
      timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    };

    setAllTransactions((prev) => [tx, ...prev]);

    setAllReservations((prev) =>
      prev.map((r) => {
        if (r.id !== payment.reservationId) return r;
        const newPaid = r.amountPaid + payment.amount;
        return {
          ...r,
          amountPaid: newPaid,
          paymentStatus: newPaid >= r.totalAmount ? 'paid' : 'partial'
        };
      })
    );

    notify('msg.folio.paymentRecorded', { amount: formatMoney(payment.amount), method: (payment.paymentMethod || 'cash').toUpperCase() }, 'success');
  };

  const recordSplitPayment = (
    reservationId: string,
    lines: Array<{ method: PaymentMethod; amount: number }>,
    reference?: string
  ): Result & { splitGroupId?: string } => {
    if (isReadOnly) {
      notify('err.folio.ownerNoPayments', undefined, 'warning');
      return fail('err.folio.ownerNoPayments');
    }

    const res = allReservations.find((r) => r.id === reservationId);
    if (!res) {
      return fail('err.res.notFound');
    }

    const totals = getFolioTotals(allTransactions, res.id);
    const balanceDue = Math.max(0, totals.balance);

    const totalLinesAmount = Array.isArray(lines)
      ? lines.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
      : 0;

    const validation = validateSplitPayment({
      totalAmount: totalLinesAmount,
      lines: lines || []
    });

    if (!validation.valid) {
      return fail(validation.errorKey || 'err.checkout.splitInvalid', validation.errorVars);
    }

    if (totalLinesAmount > balanceDue) {
      return fail('err.checkout.amountExceedsBalance', {
        amount: formatMoney(totalLinesAmount),
        balance: formatMoney(balanceDue)
      });
    }

    const targetBranchId = res.branchId || defaultBranchId;
    const splitGroupId = `SPLIT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const staffName = currentUser?.name || 'Front Desk';
    const timestamp = `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

    const newTransactions: FolioTransaction[] = lines.map((line, idx) => ({
      id: `tx-${Date.now()}-${idx}-${Math.floor(100 + Math.random() * 900)}`,
      branchId: targetBranchId,
      reservationId: res.id,
      guestId: res.guestId,
      roomNumber: res.roomNumber,
      category: 'payment',
      description: `Folio Payment (${line.method.toUpperCase()} - Split ${idx + 1}/${lines.length})${reference ? ` - Ref: ${reference}` : ''}`,
      amount: line.amount,
      type: 'payment',
      paymentMethod: line.method,
      reference: reference ? `${reference}-${idx + 1}` : `SPLIT-${Math.floor(100000 + Math.random() * 900000)}`,
      splitGroupId,
      timestamp,
      recordedBy: staffName
    }));

    setAllTransactions((prev) => [...newTransactions, ...prev]);

    setAllReservations((prev) =>
      prev.map((r) => {
        if (r.id !== res.id) return r;
        const newPaid = r.amountPaid + totalLinesAmount;
        return {
          ...r,
          amountPaid: newPaid,
          paymentStatus: newPaid >= r.totalAmount ? 'paid' : 'partial'
        };
      })
    );

    logStaffActivity(
      'Record Split Payment',
      `Recorded split payment of ${formatMoney(totalLinesAmount)} across ${lines.length} lines for ${res.guestName} (${res.bookingCode})`
    );

    notify('msg.folio.splitRecorded', { amount: formatMoney(totalLinesAmount) }, 'success');

    return { success: true, splitGroupId };
  };

  const voidTransaction = (txId: string, reason: string): boolean => {
    if (!canVoidTransactions) {
      notify('err.folio.voidUnauthorized', undefined, 'warning');
      return false;
    }

    const trimmedReason = reason?.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      notify('err.folio.voidReasonMin', undefined, 'warning');
      return false;
    }

    const tx = allTransactions.find((t) => t.id === txId);
    if (!tx || tx.voided) return false;

    setAllTransactions((prev) =>
      prev.map((t) =>
        t.id === txId
          ? {
              ...t,
              voided: true,
              voidedBy: currentUser?.name || 'Manager',
              voidReason: trimmedReason
            }
          : t
      )
    );

    // Re-adjust reservation balance
    if (tx.type === 'charge') {
      setAllReservations((prev) =>
        prev.map((res) =>
          res.id === tx.reservationId
            ? { ...res, totalAmount: Math.max(0, res.totalAmount - tx.amount) }
            : res
        )
      );
    } else if (tx.type === 'payment') {
      setAllReservations((prev) =>
        prev.map((res) =>
          res.id === tx.reservationId
            ? { ...res, amountPaid: Math.max(0, res.amountPaid - tx.amount) }
            : res
        )
      );
    }

    logStaffActivity(
      'Void Transaction',
      `Staff member ${currentUser?.name || 'Manager'} voided transaction #${tx.id} (${tx.description || tx.category}, ${formatMoney(tx.amount)}). Reason: ${trimmedReason}`
    );

    notify('msg.folio.voided', { reason: trimmedReason }, 'info');
    return true;
  };

  const createMaintenanceTicket = (ticket: Omit<MaintenanceTicket, 'id' | 'ticketNumber' | 'reportedAt'>) => {
    const room = allRooms.find((r) => r.id === ticket.roomId);
    const targetBranchId = ticket.branchId || room?.branchId || defaultBranchId;

    const ticketNumber = `MT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: MaintenanceTicket = {
      ...ticket,
      branchId: targetBranchId,
      id: `mt-${Date.now()}`,
      ticketNumber,
      reportedAt: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    };

    setAllMaintenanceTickets((prev) => [newTicket, ...prev]);

    if (ticket.blocksRoom) {
      setAllRooms((prev) =>
        prev.map((r) =>
          r.id === ticket.roomId
            ? { ...r, status: 'maintenance', maintenanceNote: ticket.description }
            : r
        )
      );
    }

    notify(ticket.blocksRoom ? 'msg.maint.createdBlocked' : 'msg.maint.created', { number: ticketNumber }, 'warning');
  };

  const updateMaintenanceStatus = (ticketId: string, status: MaintenanceTicket['status'], cost?: number) => {
    setAllMaintenanceTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        const updated = {
          ...t,
          status,
          repairCost: cost !== undefined ? cost : t.repairCost,
          resolvedAt:
            status === 'Resolved'
              ? `${businessDate} ${new Date().toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}`
              : t.resolvedAt
        };

        if (status === 'Resolved' && t.blocksRoom) {
          setAllRooms((roomsList) =>
            roomsList.map((r) =>
              r.id === t.roomId && r.status === 'maintenance'
                ? { ...r, status: 'dirty', maintenanceNote: 'Repairs completed. Turnover cleaning required.' }
                : r
            )
          );
        }

        return updated;
      })
    );

    notify('msg.maint.updated', { status }, 'info');
  };

  // Night Audit (Per-Branch Execution & Isolated Rollover)
  const runNightAudit = (expectedCash: number, actualCash: number, notes: string) => {
    if (!canRunAudit) {
      throw new KeyedError('err.audit.unauthorized');
    }

    const targetBranchId = (activeBranchId && activeBranchId !== 'all') ? activeBranchId : defaultBranchId;
    const targetBranch = branches.find((b) => b.id === targetBranchId);
    const branchLabel = targetBranch?.name || 'Branch';

    const activeRoomTypeIds = new Set(roomTypes.filter((rt) => rt.isActive !== false).map((rt) => rt.id));
    const branchRooms = allRooms.filter(
      (r) => r.branchId === targetBranchId && r.isActive !== false && activeRoomTypeIds.has(r.roomTypeId)
    );
    const occupied = branchRooms.filter((r) => r.status === 'occupied').length;
    const totalRooms = branchRooms.length;
    const occupancyRate = totalRooms > 0 ? (occupied / totalRooms) * 100 : 0;

    const roomRevenue = allReservations
      .filter((r) => r.branchId === targetBranchId && r.bookingStatus === 'checked_in')
      .reduce((sum, r) => sum + r.nightlyRate, 0);

    const posRevenue = allTransactions
      .filter(
        (t) =>
          t.branchId === targetBranchId &&
          !t.voided &&
          (t.category === 'restaurant' ||
            t.category === 'beverage' ||
            t.category === 'laundry' ||
            t.category === 'cancellation_fee' ||
            t.category === 'no_show_fee')
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const totalGrossRevenue = roomRevenue + posRevenue;
    const adr = occupied > 0 ? roomRevenue / occupied : 0;
    const revPar = totalRooms > 0 ? roomRevenue / totalRooms : 0;

    const cashCollected = sumPaymentsByMethod(allTransactions, 'cash', (t) => t.branchId === targetBranchId);
    const momoCollected = sumPaymentsByMethod(allTransactions, 'momo', (t) => t.branchId === targetBranchId);
    const orangeMoneyCollected = sumPaymentsByMethod(allTransactions, 'orange_money', (t) => t.branchId === targetBranchId);
    const cardCollected =
      sumPaymentsByMethod(allTransactions, 'card', (t) => t.branchId === targetBranchId) +
      sumPaymentsByMethod(allTransactions, 'bank_transfer', (t) => t.branchId === targetBranchId);

    const discrepancy = actualCash - expectedCash;
    const branchCurrentDate = branchBusinessDates[targetBranchId] || getLocalDateString();

    const report: NightAuditReport = {
      id: `na-${targetBranchId}-${branchCurrentDate}-${Date.now()}`,
      branchId: targetBranchId,
      date: branchCurrentDate,
      totalRooms,
      roomsOccupied: occupied,
      occupancyRate: Number(occupancyRate.toFixed(1)),
      totalRoomRevenue: roomRevenue,
      totalPosRevenue: posRevenue,
      totalGrossRevenue,
      adr: Math.round(adr),
      revPar: Math.round(revPar),
      cashCollected,
      momoCollected,
      orangeMoneyCollected,
      cardCollected,
      expectedCashFloat: expectedCash,
      actualCashFloat: actualCash,
      discrepancy,
      notes: notes || `Night audit reconciled for ${branchLabel}.`,
      auditedBy: currentUser?.name || 'General Manager',
      timestamp: `${branchCurrentDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    };

    setAllNightAuditReports((prev) => [report, ...prev]);

    // Rollover business date ONLY for this specific branch
    const nextDate = getNextLocalDateString(branchCurrentDate);

    setBranchBusinessDates((prev) => ({
      ...prev,
      [targetBranchId]: nextDate
    }));

    notify('msg.audit.completed', { branch: branchLabel, date: nextDate }, 'success');
    return report;
  };

  const addGuest = (guestData: Omit<Guest, 'id' | 'createdAt' | 'totalVisits' | 'totalSpent'>) => {
    const newGuest: Guest = {
      ...guestData,
      id: `gst-${Date.now()}`,
      totalVisits: 0,
      totalSpent: 0,
      createdAt: businessDate
    };
    setGuests((prev) => [newGuest, ...prev]);
    notify('msg.guest.created', { name: newGuest.fullName }, 'success');
    return newGuest;
  };

  // Branch Management (Manager / Owner)
  const addBranch = (branchData: Omit<Branch, 'id'>): Result => {
    if (!currentUser || !['manager', 'owner'].includes(currentUser.role)) {
      notify('err.branch.unauthorizedAdd', undefined, 'warning');
      return fail('err.branch.unauthorizedAdd');
    }

    const name = branchData.name.trim();
    const city = branchData.city.trim();
    if (!name) return fail('err.branch.nameRequired');
    if (!city) return fail('err.branch.cityRequired');

    const newId = `branch-${Date.now()}`;
    const newBranch: Branch = {
      ...branchData,
      id: newId,
      name,
      city,
      address: branchData.address?.trim() || '',
      phone: branchData.phone?.trim() || '',
      isActive: branchData.isActive !== false
    };

    setBranches((prev) => [...prev, newBranch]);
    const today = getLocalDateString();
    setBranchBusinessDates((prev) => ({
      ...prev,
      [newId]: today
    }));

    logStaffActivity(
      'Add Branch',
      `Staff member ${currentUser.name} (${currentUser.role}) added branch "${name}" in ${city}.`
    );

    notify('msg.branch.created', { name }, 'success');
    return { success: true };
  };

  const updateBranch = (id: string, branchData: Partial<Branch>): Result => {
    if (!currentUser || !['manager', 'owner'].includes(currentUser.role)) {
      notify('err.branch.unauthorizedUpdate', undefined, 'warning');
      return fail('err.branch.unauthorizedUpdate');
    }

    const targetBranch = branches.find((b) => b.id === id);
    if (!targetBranch) {
      return fail('err.branch.notFound');
    }

    if (branchData.name !== undefined && !branchData.name.trim()) {
      return fail('err.branch.nameEmpty');
    }
    if (branchData.city !== undefined && !branchData.city.trim()) {
      return fail('err.branch.cityEmpty');
    }

    setBranches((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              ...branchData,
              name: branchData.name !== undefined ? branchData.name.trim() : b.name,
              city: branchData.city !== undefined ? branchData.city.trim() : b.city,
              address: branchData.address !== undefined ? branchData.address.trim() : b.address,
              phone: branchData.phone !== undefined ? branchData.phone.trim() : b.phone
            }
          : b
      )
    );

    logStaffActivity(
      'Update Branch',
      `Staff member ${currentUser.name} (${currentUser.role}) updated branch "${targetBranch.name}".`
    );

    notify('msg.branch.updated', undefined, 'success');
    return { success: true };
  };

  const toggleBranchActive = (id: string, active: boolean): Result => {
    if (!currentUser || !['manager', 'owner'].includes(currentUser.role)) {
      notify('err.branch.unauthorizedStatus', undefined, 'warning');
      return fail('err.branch.unauthorizedStatus');
    }

    const targetBranch = branches.find((b) => b.id === id);
    if (!targetBranch) {
      return fail('err.branch.notFound');
    }

    if (!active) {
      const activeCount = branches.filter((b) => b.isActive).length;
      if (activeCount <= 1) {
        notify('err.branch.deactivateOnlyActive', undefined, 'warning');
        return fail('err.branch.deactivateOnlyActive');
      }
    }

    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: active } : b))
    );
    if (!active && activeBranchId === id) {
      const fallback = branches.find((b) => b.id !== id && b.isActive);
      if (fallback) {
        setActiveBranchIdState(fallback.id);
      }
    }

    logStaffActivity(
      active ? 'Activate Branch' : 'Deactivate Branch',
      `Staff member ${currentUser.name} (${currentUser.role}) ${active ? 'activated' : 'deactivated'} branch "${targetBranch.name}".`
    );

    notify(active ? 'msg.branch.activated' : 'msg.branch.deactivated', undefined, 'info');
    return { success: true };
  };

  const deleteBranch = (id: string): Result & { canDeactivateInstead?: boolean } => {
    if (!currentUser || !['manager', 'owner'].includes(currentUser.role)) {
      notify('err.branch.unauthorizedDelete', undefined, 'warning');
      return fail('err.branch.unauthorizedDelete');
    }

    const targetBranch = branches.find((b) => b.id === id);
    if (!targetBranch) {
      return fail('err.branch.notFound');
    }

    if (branches.length <= 1) {
      return fail('err.branch.deleteOnlyBranch');
    }

    const roomCount = allRooms.filter((r) => r.branchId === id).length;
    const resCount = allReservations.filter((r) => r.branchId === id).length;
    const txCount = allTransactions.filter((t) => t.branchId === id).length;
    const mtCount = allMaintenanceTickets.filter((m) => m.branchId === id).length;
    const auditCount = allNightAuditReports.filter((a) => a.branchId === id).length;

    if (roomCount > 0 || resCount > 0 || txCount > 0 || mtCount > 0 || auditCount > 0) {
      return fail(
        'err.branch.deleteActiveHistory',
        { roomCount, resCount, txCount },
        { canDeactivateInstead: true }
      );
    }

    setBranches((prev) => prev.filter((b) => b.id !== id));
    if (activeBranchId === id) {
      const fallback = branches.find((b) => b.id !== id && b.isActive) || branches[0];
      if (fallback) {
        setActiveBranchIdState(fallback.id);
      }
    }

    logStaffActivity(
      'Delete Branch',
      `Staff member ${currentUser.name} (${currentUser.role}) deleted branch "${targetBranch.name}".`
    );

    notify('msg.branch.deleted', undefined, 'info');
    return { success: true };
  };

  // Reset to Demo Data
  const resetToDemoData = () => {
    localStorage.removeItem(`${STORAGE_PREFIX}_branches`);
    localStorage.removeItem(`${STORAGE_PREFIX}_branch_business_dates`);
    localStorage.removeItem(`${STORAGE_PREFIX}_active_branch`);
    localStorage.removeItem(`${STORAGE_PREFIX}_room_types`);
    localStorage.removeItem(`${STORAGE_PREFIX}_rooms`);
    localStorage.removeItem(`${STORAGE_PREFIX}_guests`);
    localStorage.removeItem(`${STORAGE_PREFIX}_reservations`);
    localStorage.removeItem(`${STORAGE_PREFIX}_transactions`);
    localStorage.removeItem(`${STORAGE_PREFIX}_maintenance`);
    localStorage.removeItem(`${STORAGE_PREFIX}_audits`);
    localStorage.removeItem(`${STORAGE_PREFIX}_pos_items`);
    localStorage.removeItem(`${STORAGE_PREFIX}_business_date`);
    localStorage.removeItem(`${STORAGE_PREFIX}_staff_users`);
    localStorage.removeItem(`${STORAGE_PREFIX}_staff_activity_log`);
    sessionStorage.removeItem(`${STORAGE_PREFIX}_lockout_until`);

    const initialDate = getLocalDateString();
    const defaultBranch: Branch = {
      id: 'branch-1',
      name: hotelConfig.name || 'Main Branch',
      city: hotelConfig.city || '',
      address: hotelConfig.address || '',
      phone: hotelConfig.phone || '',
      isActive: true
    };

    setBranches([defaultBranch]);
    setActiveBranchIdState('branch-1');
    setBranchBusinessDates({ 'branch-1': initialDate });

    setRoomTypes(isDemoMode ? INITIAL_ROOM_TYPES : []);
    setAllRooms(isDemoMode ? INITIAL_ROOMS.map((r) => ({ ...r, branchId: 'branch-1' })) : []);
    setGuests(isDemoMode ? INITIAL_GUESTS : []);
    setAllReservations(isDemoMode ? INITIAL_RESERVATIONS.map((res) => ({ ...res, branchId: 'branch-1' })) : []);
    setAllTransactions(isDemoMode ? INITIAL_TRANSACTIONS.map((t) => ({ ...t, branchId: 'branch-1' })) : []);
    setAllMaintenanceTickets(isDemoMode ? INITIAL_MAINTENANCE_TICKETS.map((m) => ({ ...m, branchId: 'branch-1' })) : []);
    setPosItems(isDemoMode ? INITIAL_POS_ITEMS : []);
    setAllNightAuditReports(isDemoMode ? INITIAL_NIGHT_AUDIT_HISTORY.map((a) => ({ ...a, branchId: 'branch-1' })) : []);
    setStaffUsers(isDemoMode ? STAFF_USERS : []);
    setStaffActivityLogs([]);
    setFailedAttempts(0);
    setFailedLoginLockoutUntil(0);
    setSelectedRoom(null);
    notify(isDemoMode ? 'msg.demo.resetDemo' : 'msg.demo.resetEmpty', undefined, 'info');
  };

  // Room Type & Room Management (Manager Scope)
  const addRoomType = (newTypeData: Omit<RoomType, 'id'>): Result => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      notify('err.roomType.unauthorizedAdd', undefined, 'warning');
      return fail('err.roomType.unauthorizedAdd');
    }
    const name = newTypeData.name?.trim();
    const code = newTypeData.code?.trim().toUpperCase();
    if (!name) return fail('err.roomType.nameRequired');
    if (!code) return fail('err.roomType.codeRequired');
    if (!newTypeData.basePrice || newTypeData.basePrice <= 0) return fail('err.roomType.pricePositive');
    if (!newTypeData.maxCapacity || newTypeData.maxCapacity < 1) return fail('err.roomType.capacityMin');
    if (!newTypeData.bedType?.trim()) return fail('err.roomType.bedTypeRequired');
    if (!newTypeData.description?.trim()) return fail('err.roomType.descRequired');

    const newType: RoomType = {
      ...newTypeData,
      id: `rt-${Date.now()}`,
      name,
      code,
      isActive: true,
      amenities: newTypeData.amenities || []
    };
    setRoomTypes((prev) => [...prev, newType]);
    notify('msg.roomType.created', { name: newType.name }, 'success');
    return { success: true };
  };

  const updateRoomType = (id: string, updatedData: Partial<RoomType>): Result => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      notify('err.roomType.unauthorizedEdit', undefined, 'warning');
      return fail('err.roomType.unauthorizedEdit');
    }
    if (updatedData.name !== undefined && !updatedData.name.trim()) {
      return fail('err.roomType.nameEmpty');
    }
    if (updatedData.code !== undefined && !updatedData.code.trim()) {
      return fail('err.roomType.codeEmpty');
    }
    if (updatedData.basePrice !== undefined && updatedData.basePrice <= 0) {
      return fail('err.roomType.pricePositive');
    }
    if (updatedData.maxCapacity !== undefined && updatedData.maxCapacity < 1) {
      return fail('err.roomType.capacityMinOne');
    }

    setRoomTypes((prev) =>
      prev.map((rt) => (rt.id === id ? { ...rt, ...updatedData } : rt))
    );
    notify('msg.roomType.updated', undefined, 'success');
    return { success: true };
  };

  const deleteRoomType = (id: string): Result & { canDeactivateInstead?: boolean } => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      notify('err.roomType.unauthorizedDelete', undefined, 'warning');
      return fail('err.roomType.unauthorizedDelete');
    }
    const hasRooms = allRooms.some((r) => r.roomTypeId === id);
    if (hasRooms) {
      return fail('err.roomType.inUse', undefined, { canDeactivateInstead: true });
    }
    setRoomTypes((prev) => prev.filter((rt) => rt.id !== id));
    notify('msg.roomType.deleted', undefined, 'info');
    return { success: true };
  };

  const toggleRoomTypeActive = (id: string, active: boolean) => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      notify('err.roomType.unauthorizedStatus', undefined, 'warning');
      return;
    }
    setRoomTypes((prev) =>
      prev.map((rt) => (rt.id === id ? { ...rt, isActive: active } : rt))
    );
    notify(active ? 'msg.roomType.activated' : 'msg.roomType.deactivated', undefined, 'info');
  };

  // Rooms Management (Per-Branch Creation & Uniqueness)
  const addRoom = (roomData: {
    roomNumber: string;
    floor: number;
    roomTypeId: string;
    pricePerNight: number;
    branchId?: string;
    image?: string;
  }): Result => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      notify('err.room.unauthorizedAdd', undefined, 'warning');
      return fail('err.room.unauthorizedAdd');
    }
    const num = roomData.roomNumber?.trim();
    if (!num) return fail('err.room.numberRequired');
    if (!roomData.roomTypeId) return fail('err.room.typeRequired');
    if (isNaN(roomData.floor)) return fail('err.room.floorInvalid');
    if (roomData.pricePerNight <= 0) return fail('err.room.pricePositive');

    const targetBranchId = roomData.branchId || (activeBranchId !== 'all' ? activeBranchId : defaultBranchId);

    // Room numbers must be unique within a branch, not across the whole hotel
    const duplicate = allRooms.some(
      (r) => r.branchId === targetBranchId && r.roomNumber.toLowerCase() === num.toLowerCase()
    );
    if (duplicate) {
      return fail('err.room.duplicateInBranch', { number: num });
    }

    const newRoom: Room = {
      id: `rm-${targetBranchId}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      roomNumber: num,
      floor: roomData.floor,
      roomTypeId: roomData.roomTypeId,
      branchId: targetBranchId,
      pricePerNight: roomData.pricePerNight,
      status: 'available',
      isActive: true,
      image: roomData.image
    };

    setAllRooms((prev) => [...prev, newRoom]);
    notify('msg.room.created', { number: newRoom.roomNumber }, 'success');
    return { success: true };
  };

  const bulkAddRooms = (params: {
    startNumber: number;
    endNumber: number;
    floor: number;
    roomTypeId: string;
    pricePerNight: number;
    branchId?: string;
  }): Result & { count: number } => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      notify('err.room.unauthorizedBulk', undefined, 'warning');
      return fail('err.room.unauthorizedBulk', undefined, { count: 0 });
    }
    const { startNumber, endNumber, floor, roomTypeId, pricePerNight } = params;
    if (isNaN(startNumber) || isNaN(endNumber)) return fail('err.room.bulkNumbersInvalid', undefined, { count: 0 });
    if (startNumber > endNumber) return fail('err.room.bulkRangeOrder', undefined, { count: 0 });
    if (endNumber - startNumber > 100) return fail('err.room.bulkRangeMax', undefined, { count: 0 });
    if (pricePerNight <= 0) return fail('err.room.pricePositive', undefined, { count: 0 });
    if (!roomTypeId) return fail('err.room.typeRequired', undefined, { count: 0 });

    const targetBranchId = params.branchId || (activeBranchId !== 'all' ? activeBranchId : defaultBranchId);

    const existingBranchRooms = new Set(
      allRooms
        .filter((r) => r.branchId === targetBranchId)
        .map((r) => r.roomNumber.toLowerCase())
    );

    const conflicts: string[] = [];
    for (let n = startNumber; n <= endNumber; n++) {
      if (existingBranchRooms.has(String(n).toLowerCase())) {
        conflicts.push(String(n));
      }
    }

    if (conflicts.length > 0) {
      return fail(
        'err.room.bulkConflicts',
        { conflicts: conflicts.slice(0, 6).join(', ') + (conflicts.length > 6 ? '...' : '') },
        { count: 0 }
      );
    }

    const created: Room[] = [];
    for (let n = startNumber; n <= endNumber; n++) {
      created.push({
        id: `rm-${targetBranchId}-${Date.now()}-${n}`,
        roomNumber: String(n),
        floor,
        roomTypeId,
        branchId: targetBranchId,
        pricePerNight,
        status: 'available',
        isActive: true
      });
    }

    setAllRooms((prev) => [...prev, ...created]);
    notify('msg.room.bulkCreated', { count: created.length, start: startNumber, end: endNumber, floor }, 'success');
    return { success: true, count: created.length };
  };

  const updateRoom = (id: string, updatedData: Partial<Room>): Result => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      notify('err.room.unauthorizedEdit', undefined, 'warning');
      return fail('err.room.unauthorizedEdit');
    }

    const existingRoom = allRooms.find((r) => r.id === id);
    if (!existingRoom) return fail('err.room.notFound');

    const targetBranchId = updatedData.branchId || existingRoom.branchId;

    if (updatedData.roomNumber !== undefined) {
      const num = updatedData.roomNumber.trim();
      if (!num) return fail('err.room.numberEmpty');
      const duplicate = allRooms.some(
        (r) => r.id !== id && r.branchId === targetBranchId && r.roomNumber.toLowerCase() === num.toLowerCase()
      );
      if (duplicate) return fail('err.room.numberInUse', { number: num });
    }
    if (updatedData.pricePerNight !== undefined && updatedData.pricePerNight <= 0) {
      return fail('err.room.pricePositive');
    }

    setAllRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updatedData, branchId: targetBranchId } : r))
    );
    notify('msg.room.updated', undefined, 'success');
    return { success: true };
  };

  const deleteRoom = (id: string): Result & { canDeactivateInstead?: boolean } => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      notify('err.room.unauthorizedDelete', undefined, 'warning');
      return fail('err.room.unauthorizedDelete');
    }
    const targetRoom = allRooms.find((r) => r.id === id);
    if (!targetRoom) return fail('err.room.notFound');

    if (targetRoom.status === 'occupied' || targetRoom.currentReservationId) {
      return fail('err.room.deleteOccupied', { number: targetRoom.roomNumber }, { canDeactivateInstead: true });
    }

    const hasResHistory = allReservations.some(
      (res) => res.roomId === id || (res.branchId === targetRoom.branchId && res.roomNumber === targetRoom.roomNumber)
    );
    if (hasResHistory) {
      return fail('err.room.deleteHistory', { number: targetRoom.roomNumber }, { canDeactivateInstead: true });
    }

    setAllRooms((prev) => prev.filter((r) => r.id !== id));
    notify('msg.room.deleted', { number: targetRoom.roomNumber }, 'info');
    return { success: true };
  };

  const toggleRoomActive = (id: string, active: boolean) => {
    if (currentUser?.role !== 'manager') {
      notify('err.room.unauthorizedStatus', undefined, 'warning');
      return;
    }
    setAllRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: active } : r))
    );
    notify(active ? 'msg.room.activated' : 'msg.room.deactivated', undefined, 'info');
  };

  // POS & Menu Items Management (Manager and Owner Scope)
  const addPosItem = (
    item: Omit<PosItem, 'id'>
  ): Result & { item?: PosItem } => {
    if (!currentUser || !['manager', 'owner'].includes(currentUser.role)) {
      notify('err.menu.unauthorizedAdd', undefined, 'warning');
      return fail('err.menu.unauthorizedAdd');
    }

    const trimmedName = typeof item.name === 'string' ? item.name.trim() : '';
    if (trimmedName.length < 2) {
      return fail('err.menu.nameMin');
    }
    if (!POS_CATEGORIES.includes(item.category as PosItem['category'])) {
      return fail('err.menu.categoryInvalid', { categories: POS_CATEGORIES.join(', ') });
    }
    if (typeof item.price !== 'number' || isNaN(item.price) || !Number.isInteger(item.price) || item.price <= 0) {
      return fail('err.menu.priceWhole');
    }
    if (posItems.some((i) => i.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      return fail('err.menu.duplicateName', { name: trimmedName });
    }

    const newItem: PosItem = {
      ...item,
      id: `pos-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      name: trimmedName,
      isActive: true,
      available: item.available !== false
    };

    setPosItems((prev) => [newItem, ...prev]);

    logStaffActivity(
      'Add Menu Item',
      `Added "${newItem.name}" (${newItem.category}, ${formatMoney(newItem.price)}) to POS menu.`
    );

    notify('msg.menu.created', { name: newItem.name }, 'success');
    return { success: true, item: newItem };
  };

  const updatePosItem = (
    id: string,
    updates: Partial<Omit<PosItem, 'id'>>
  ): Result => {
    if (!currentUser || !['manager', 'owner'].includes(currentUser.role)) {
      notify('err.menu.unauthorizedUpdate', undefined, 'warning');
      return fail('err.menu.unauthorizedUpdate');
    }

    const existing = posItems.find((i) => i.id === id);
    if (!existing) {
      return fail('err.menu.notFound');
    }

    const merged = {
      name: updates.name !== undefined ? updates.name : existing.name,
      category: updates.category !== undefined ? updates.category : existing.category,
      price: updates.price !== undefined ? updates.price : existing.price
    };

    const trimmedName = typeof merged.name === 'string' ? merged.name.trim() : '';
    if (trimmedName.length < 2) {
      return fail('err.menu.nameMin');
    }
    if (!POS_CATEGORIES.includes(merged.category as PosItem['category'])) {
      return fail('err.menu.categoryInvalid', { categories: POS_CATEGORIES.join(', ') });
    }
    if (typeof merged.price !== 'number' || isNaN(merged.price) || !Number.isInteger(merged.price) || merged.price <= 0) {
      return fail('err.menu.priceWhole');
    }
    if (posItems.some((i) => i.id !== id && i.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      return fail('err.menu.duplicateName', { name: trimmedName });
    }

    setPosItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              ...updates,
              name: trimmedName,
              category: merged.category as PosItem['category'],
              price: merged.price
            }
          : i
      )
    );

    logStaffActivity(
      'Update Menu Item',
      `Updated "${merged.name}" (${merged.category}, ${formatMoney(merged.price)}) in POS menu.`
    );

    notify('msg.menu.updated', { name: merged.name }, 'success');
    return { success: true };
  };

  const togglePosItemActive = (
    id: string,
    active?: boolean
  ): Result => {
    if (!currentUser || !['manager', 'owner'].includes(currentUser.role)) {
      notify('err.menu.unauthorizedStatus', undefined, 'warning');
      return fail('err.menu.unauthorizedStatus');
    }

    const existing = posItems.find((i) => i.id === id);
    if (!existing) {
      return fail('err.menu.notFound');
    }

    const newActive = active !== undefined ? active : (existing.isActive === false ? true : false);

    setPosItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isActive: newActive } : i))
    );

    logStaffActivity(
      newActive ? 'Activate Menu Item' : 'Deactivate Menu Item',
      `${newActive ? 'Activated' : 'Deactivated'} "${existing.name}" in POS menu.`
    );

    notify(
      newActive ? 'msg.menu.activated' : 'msg.menu.deactivated',
      { name: existing.name },
      'info'
    );
    return { success: true };
  };

  const deletePosItem = (
    id: string
  ): Result => {
    if (!currentUser || !['manager', 'owner'].includes(currentUser.role)) {
      notify('err.menu.unauthorizedDelete', undefined, 'warning');
      return fail('err.menu.unauthorizedDelete');
    }

    const existing = posItems.find((i) => i.id === id);
    if (!existing) {
      return fail('err.menu.notFound');
    }

    setPosItems((prev) => prev.filter((i) => i.id !== id));

    logStaffActivity(
      'Delete Menu Item',
      `Deleted "${existing.name}" (${existing.category}) from POS menu.`
    );

    notify('msg.menu.deleted', { name: existing.name }, 'info');
    return { success: true };
  };

  return (
    <HMSContext.Provider
      value={{
        hotelConfig,
        roomTypes,
        rooms,
        guests,
        reservations,
        transactions,
        maintenanceTickets,
        posItems,
        nightAuditReports,
        currentUser,
        currency,
        businessDate,
        activeTab,
        selectedRoom,
        selectedReservation,
        notification,
        allowedTabs,
        canEditRates,
        canVoidTransactions,
        canRunAudit,
        canCheckIn,
        canCheckOut,
        isReadOnly,
        branches,
        activeBranchId,
        activeBranch,
        hasMultipleActiveBranches,
        branchBusinessDates,
        setActiveBranchId,
        addBranch,
        updateBranch,
        deleteBranch,
        toggleBranchActive,
        allRooms,
        allReservations,
        allTransactions,
        allMaintenanceTickets,
        allNightAuditReports,
        staffUsers,
        staffActivityLogs,
        failedLoginLockoutUntil,
        createInitialOwner,
        login,
        fastLogin,
        logout,
        addStaff,
        updateStaff,
        toggleStaffActive,
        resetStaffPassword,
        changeMyPassword,
        updateHotelConfig,
        updateRoomTypePricing,
        setCurrency,
        setActiveTab,
        setSelectedRoom,
        setSelectedReservation,
        showNotification,
        notify,
        clearNotification,
        formatMoney,
        checkInGuest,
        checkOutGuest,
        autoCheckOutGuest,
        createReservation,
        updateReservation,
        cancelReservation,
        convertReservationToCheckIn,
        applyDiscount,
        extendStay,
        shortenStay,
        changeRoom,
        getAvailableRoomsForDateRange,
        isRoomAvailableForDateRange,
        getNextUpcomingReservationForRoom,
        updateRoomStatus,
        addFolioCharge,
        recordFolioPayment,
        recordSplitPayment,
        voidTransaction,
        createMaintenanceTicket,
        updateMaintenanceStatus,
        runNightAudit,
        addGuest,
        resetToDemoData,
        addRoomType,
        updateRoomType,
        deleteRoomType,
        toggleRoomTypeActive,
        addRoom,
        bulkAddRooms,
        updateRoom,
        deleteRoom,
        toggleRoomActive,
        addPosItem,
        updatePosItem,
        togglePosItemActive,
        deletePosItem
      }}
    >
      {children}
    </HMSContext.Provider>
  );
};

export const useHMS = () => {
  const context = useContext(HMSContext);
  if (!context) throw new Error('useHMS must be used within a HMSProvider');
  return context;
};
