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
  isValidDateString
} from '../utils/dateUtils';
import { generateSalt, hashPassword, verifyPassword } from '../utils/cryptoUtils';

export type NavTab =
  | 'matrix'
  | 'reservations'
  | 'folios'
  | 'pos'
  | 'housekeeping'
  | 'maintenance'
  | 'audit'
  | 'analytics'
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
  notification: { message: string; type: 'success' | 'info' | 'warning' } | null;

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
  createInitialOwner: (payload: { fullName: string; username: string; password: string; email?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  login: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  fastLogin: (role: UserRole) => void;
  logout: () => void;
  addStaff: (data: { name: string; username: string; password: string; role: UserRole; branchId?: string; title?: string; email?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  updateStaff: (id: string, data: Partial<Omit<StaffUser, 'id' | 'passwordHash' | 'passwordSalt'>>) => { success: boolean; error?: string };
  toggleStaffActive: (id: string, active: boolean) => { success: boolean; error?: string };
  resetStaffPassword: (id: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  changeMyPassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;

  // Config Setters
  updateHotelConfig: (newConfig: Partial<HotelConfig>) => void;
  updateRoomTypePricing: (roomTypeId: string, newBasePrice: number) => void;

  // General Setters
  setCurrency: (c: 'FCFA' | 'USD') => void;
  setActiveTab: (tab: NavTab) => void;
  setSelectedRoom: (room: Room | null) => void;
  setSelectedReservation: (res: Reservation | null) => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'warning') => void;
  clearNotification: () => void;

  // Helpers & Formatter
  formatMoney: (amountInFcfa: number) => string;

  // Actions
  checkInGuest: (payload: CheckInPayload) => { success: boolean; reservationId?: string; error?: string };
  checkOutGuest: (reservationId: string, paymentMethod?: PaymentMethod, settlementAmount?: number) => { success: boolean; error?: string };
  createReservation: (payload: CreateReservationPayload) => { success: boolean; reservationId?: string; error?: string };
  updateReservation: (reservationId: string, payload: UpdateReservationPayload) => { success: boolean; error?: string };
  cancelReservation: (reservationId: string, reason: string, cancellationFee?: number, isNoShow?: boolean) => { success: boolean; error?: string };
  convertReservationToCheckIn: (payload: ConvertToCheckInPayload) => { success: boolean; error?: string };
  getAvailableRoomsForDateRange: (checkInDate: string, checkOutDate: string, roomTypeId?: string, excludeReservationId?: string) => Room[];
  isRoomAvailableForDateRange: (roomId: string, checkInDate: string, checkOutDate: string, excludeReservationId?: string) => boolean;
  getNextUpcomingReservationForRoom: (roomId: string) => Reservation | undefined;
  updateRoomStatus: (roomId: string, status: RoomStatus, note?: string) => void;
  addFolioCharge: (charge: Omit<FolioTransaction, 'id' | 'timestamp'>) => void;
  recordFolioPayment: (payment: Omit<FolioTransaction, 'id' | 'timestamp' | 'type'>) => void;
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
  addBranch: (branch: Omit<Branch, 'id'>) => { success: boolean; error?: string };
  updateBranch: (id: string, branch: Partial<Branch>) => { success: boolean; error?: string };
  deleteBranch: (id: string) => { success: boolean; error?: string; canDeactivateInstead?: boolean };
  toggleBranchActive: (id: string, active: boolean) => void;

  // Master Unfiltered Collections (for multi-branch analytics and settings inventory)
  allRooms: Room[];
  allReservations: Reservation[];
  allTransactions: FolioTransaction[];
  allMaintenanceTickets: MaintenanceTicket[];
  allNightAuditReports: NightAuditReport[];

  // Room Type & Room Management (Manager Scope)
  addRoomType: (roomType: Omit<RoomType, 'id'>) => { success: boolean; error?: string };
  updateRoomType: (id: string, roomType: Partial<RoomType>) => { success: boolean; error?: string };
  deleteRoomType: (id: string) => { success: boolean; error?: string; canDeactivateInstead?: boolean };
  toggleRoomTypeActive: (id: string, active: boolean) => void;

  addRoom: (room: { roomNumber: string; floor: number; roomTypeId: string; pricePerNight: number; branchId?: string; image?: string }) => { success: boolean; error?: string };
  bulkAddRooms: (params: { startNumber: number; endNumber: number; floor: number; roomTypeId: string; pricePerNight: number; branchId?: string }) => { success: boolean; count: number; error?: string };
  updateRoom: (id: string, room: Partial<Room>) => { success: boolean; error?: string };
  deleteRoom: (id: string) => { success: boolean; error?: string; canDeactivateInstead?: boolean };
  toggleRoomActive: (id: string, active: boolean) => void;
}

const HMSContext = createContext<HMSContextType | undefined>(undefined);

const STORAGE_PREFIX = 'hms_v2';

export const HMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Active hotel config
  const [hotelConfig, setHotelConfig] = useState<HotelConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_config`);
    return saved ? JSON.parse(saved) : DEFAULT_HOTEL_CONFIG;
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
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

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
      'guests',
      'settings'
    ];
  } else if (role === 'owner') {
    allowedTabs = ['analytics', 'matrix', 'settings'];
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

  const showNotification = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
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
  const createInitialOwner = async (payload: { fullName: string; username: string; password: string; email?: string; phone?: string }): Promise<{ success: boolean; error?: string }> => {
    if (staffUsers.some((u) => u.role === 'owner')) {
      return { success: false, error: 'An owner account already exists.' };
    }
    const name = payload.fullName.trim();
    const uname = payload.username.trim().toLowerCase();
    const pw = payload.password;
    if (!name) return { success: false, error: 'Full name is required.' };
    if (!uname || uname.length < 3) return { success: false, error: 'Username must be at least 3 characters.' };
    if (!pw || pw.length < 8) return { success: false, error: 'Password must be at least 8 characters long.' };

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
    showNotification(`Owner account "${name}" created successfully. Welcome to your HMS!`, 'success');
    return { success: true };
  };

  const login = async (username: string, password = ''): Promise<{ success: boolean; error?: string }> => {
    const now = Date.now();
    if (failedLoginLockoutUntil > now) {
      const remainingSecs = Math.ceil((failedLoginLockoutUntil - now) / 1000);
      const msg = `Sign-in is locked due to 5 consecutive failed attempts. Please wait ${remainingSecs} second${remainingSecs === 1 ? '' : 's'}.`;
      showNotification(msg, 'warning');
      return { success: false, error: msg };
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
        const msg = 'Too many failed login attempts. Sign-in is locked for 30 seconds.';
        showNotification(msg, 'warning');
        return { success: false, error: msg };
      }
      logStaffActivity('Failed Login Attempt', `Unknown username attempted: "${username}"`);
      return { success: false, error: 'Invalid username or password.' };
    }

    if (!user.isActive) {
      logStaffActivity('Deactivated Login Blocked', `Deactivated staff member "${user.name}" (${user.username}) attempted login.`);
      return { success: false, error: 'This staff account has been deactivated. Please contact your property administrator.' };
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
        const msg = 'Too many failed login attempts. Sign-in is locked for 30 seconds.';
        showNotification(msg, 'warning');
        return { success: false, error: msg };
      }
      logStaffActivity('Failed Login Attempt', `Incorrect password for staff: "${user.name}" (${user.username})`);
      return { success: false, error: 'Invalid username or password.' };
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
    showNotification(`Welcome back, ${resolvedUser.name}!`, 'success');
    return { success: true };
  };

  const fastLogin = (userRole: UserRole) => {
    if (!isDemoMode) {
      showNotification('Fast role switching is only available in demo mode.', 'warning');
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

    showNotification(`Signed in as ${resolvedUser.name} (${resolvedUser.title})`, 'success');
  };

  const logout = () => {
    if (currentUser) {
      logStaffActivity('Staff Logout', `Staff signed out: ${currentUser.name} (${currentUser.username})`);
    }
    setCurrentUser(null);
    sessionStorage.removeItem(`${STORAGE_PREFIX}_user`);
    showNotification('Logged out successfully.', 'info');
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
  }): Promise<{ success: boolean; error?: string }> => {
    if (currentUser?.role !== 'owner' && currentUser?.role !== 'manager') {
      return { success: false, error: 'Unauthorized: Only owners and managers can add staff.' };
    }

    // Role creation rules: Managers can only create front_desk and housekeeping staff; only owners can create managers or owners.
    if (currentUser?.role === 'manager' && (data.role === 'owner' || data.role === 'manager')) {
      return { success: false, error: 'Unauthorized: Managers can only create Front Desk and Housekeeping staff.' };
    }

    const name = data.name.trim();
    const uname = data.username.trim().toLowerCase();
    const pw = data.password;

    if (!name) return { success: false, error: 'Staff full name is required.' };
    if (!uname || uname.length < 3) return { success: false, error: 'Username must be at least 3 characters.' };
    if (!pw || pw.length < 8) return { success: false, error: 'Password must be at least 8 characters long.' };

    if (staffUsers.some((u) => u.username.toLowerCase() === uname)) {
      return { success: false, error: `Username "${uname}" is already taken.` };
    }

    // Branch assignment rules: front_desk and housekeeping must have a branch (owners have none)
    if ((data.role === 'front_desk' || data.role === 'housekeeping') && !data.branchId) {
      return { success: false, error: 'A specific branch is required for Front Desk and Housekeeping staff.' };
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
    showNotification(`Staff member "${name}" created successfully.`, 'success');
    return { success: true };
  };

  const updateStaff = (id: string, data: Partial<Omit<StaffUser, 'id' | 'passwordHash' | 'passwordSalt'>>): { success: boolean; error?: string } => {
    if (currentUser?.role !== 'owner' && currentUser?.role !== 'manager') {
      return { success: false, error: 'Unauthorized: Only owners and managers can edit staff.' };
    }

    const targetUser = staffUsers.find((u) => u.id === id);
    if (!targetUser) return { success: false, error: 'Staff user not found.' };

    // Manager scope check: Managers can only edit front_desk and housekeeping staff
    if (currentUser?.role === 'manager') {
      if (targetUser.role === 'owner' || targetUser.role === 'manager') {
        return { success: false, error: 'Unauthorized: Managers can only edit Front Desk and Housekeeping staff.' };
      }
      if (data.role && (data.role === 'owner' || data.role === 'manager')) {
        return { success: false, error: 'Unauthorized: Managers cannot promote staff to Manager or Owner.' };
      }
    }

    // The last active owner can never be deactivated or demoted
    if (targetUser.role === 'owner' && data.role && data.role !== 'owner') {
      const activeOwners = staffUsers.filter((u) => u.role === 'owner' && u.isActive && u.id !== id);
      if (activeOwners.length === 0) {
        return { success: false, error: 'Cannot demote the last active Owner account.' };
      }
    }

    // Role & branch check
    const resolvedRole = data.role || targetUser.role;
    let resolvedBranch = data.branchId !== undefined ? data.branchId : targetUser.branchId;
    if (resolvedRole === 'owner') {
      resolvedBranch = undefined;
    } else if ((resolvedRole === 'front_desk' || resolvedRole === 'housekeeping') && !resolvedBranch) {
      return { success: false, error: 'Front Desk and Housekeeping staff must have an assigned branch.' };
    }

    // Username uniqueness check if changed
    if (data.username && data.username.trim().toLowerCase() !== targetUser.username.toLowerCase()) {
      const newUname = data.username.trim().toLowerCase();
      if (staffUsers.some((u) => u.id !== id && u.username.toLowerCase() === newUname)) {
        return { success: false, error: `Username "${newUname}" is already taken.` };
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
    showNotification(`Staff member "${updatedUser.name}" updated successfully.`, 'success');
    return { success: true };
  };

  const toggleStaffActive = (id: string, active: boolean): { success: boolean; error?: string } => {
    if (currentUser?.role !== 'owner' && currentUser?.role !== 'manager') {
      return { success: false, error: 'Unauthorized: Only owners and managers can manage staff status.' };
    }

    const targetUser = staffUsers.find((u) => u.id === id);
    if (!targetUser) return { success: false, error: 'Staff user not found.' };

    // Nobody can deactivate themselves
    if (currentUser?.id === id && !active) {
      return { success: false, error: 'You cannot deactivate your own account.' };
    }

    // Managers cannot alter managers or owners
    if (currentUser?.role === 'manager' && (targetUser.role === 'owner' || targetUser.role === 'manager')) {
      return { success: false, error: 'Unauthorized: Managers cannot alter Manager or Owner accounts.' };
    }

    // The last active owner can never be deactivated or demoted
    if (targetUser.role === 'owner' && !active) {
      const activeOwners = staffUsers.filter((u) => u.role === 'owner' && u.isActive && u.id !== id);
      if (activeOwners.length === 0) {
        return { success: false, error: 'Cannot deactivate the last active Owner account. The system must retain at least one active owner.' };
      }
    }

    setStaffUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: active } : u))
    );

    logStaffActivity(
      active ? 'Reactivate Staff Member' : 'Deactivate Staff Member',
      `${active ? 'Reactivated' : 'Deactivated'} staff member ${targetUser.name} (${targetUser.username}).`
    );
    showNotification(
      `Staff member "${targetUser.name}" has been ${active ? 'reactivated' : 'deactivated'}.`,
      active ? 'success' : 'info'
    );
    return { success: true };
  };

  const resetStaffPassword = async (id: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser?.role !== 'owner' && currentUser?.role !== 'manager') {
      return { success: false, error: 'Unauthorized: Only owners and managers can reset passwords.' };
    }

    const targetUser = staffUsers.find((u) => u.id === id);
    if (!targetUser) return { success: false, error: 'Staff user not found.' };

    if (currentUser?.role === 'manager' && (targetUser.role === 'owner' || targetUser.role === 'manager')) {
      return { success: false, error: 'Unauthorized: Managers cannot reset passwords for Managers or Owners.' };
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    const salt = generateSalt();
    const hash = await hashPassword(newPassword, salt);

    setStaffUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, passwordSalt: salt, passwordHash: hash } : u))
    );

    logStaffActivity('Reset Staff Password', `Reset password for staff member ${targetUser.name} (${targetUser.username}).`);
    showNotification(`Password for "${targetUser.name}" has been reset successfully.`, 'success');
    return { success: true };
  };

  const changeMyPassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'No user signed in.' };

    const targetUser = staffUsers.find((u) => u.id === currentUser.id);
    if (!targetUser) return { success: false, error: 'User record not found.' };

    const isOldPwValid = await verifyPassword(oldPassword, targetUser.passwordSalt || '', targetUser.passwordHash || '');
    if (!isOldPwValid) {
      return { success: false, error: 'Current password does not match.' };
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
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
    showNotification('Your password has been changed successfully.', 'success');
    return { success: true };
  };

  // Property Config
  const updateHotelConfig = (newConfig: Partial<HotelConfig>) => {
    setHotelConfig((prev) => ({ ...prev, ...newConfig }));
    showNotification('Property profile & branding updated successfully!', 'success');
  };

  const updateRoomTypePricing = (roomTypeId: string, newBasePrice: number) => {
    if (!canEditRates) {
      showNotification('Permission denied: Only Manager/Accountant can alter base room rates.', 'warning');
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
    showNotification('Base room type pricing updated across inventory.', 'success');
  };

  // HMS Operational Mutations
  const updateRoomStatus = (roomId: string, status: RoomStatus, note?: string) => {
    if (isReadOnly) {
      showNotification('Owner account has read-only access.', 'warning');
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
    showNotification(`Room updated to status: ${status.toUpperCase()}`, 'info');
  };

  const checkInGuest = (payload: CheckInPayload) => {
    if (!canCheckIn) {
      return { success: false, error: 'Unauthorized: Your role does not have check-in permissions.' };
    }

    const room = allRooms.find((r) => r.id === payload.roomId);
    if (!room) return { success: false, error: 'Target room not found' };
    
    // Validate dates
    if (!isValidDateString(payload.checkInDate) || !isValidDateString(payload.checkOutDate)) {
      return { success: false, error: 'Invalid dates provided.' };
    }
    if (payload.checkOutDate <= payload.checkInDate) {
      return { success: false, error: 'Check-out date must be strictly after check-in date.' };
    }
    if (payload.checkInDate < businessDate) {
      return { success: false, error: 'Check-in date cannot be in the past.' };
    }

    // Check date availability overlap
    const isFree = isRoomAvailableForDateRange(room.id, payload.checkInDate, payload.checkOutDate);
    if (!isFree) {
      return {
        success: false,
        error: `Room #${room.roomNumber} is already booked or occupied for the selected dates!`
      };
    }

    // Check-in Valve: block immediate check-in for future dates
    if (payload.checkInDate > businessDate) {
      return {
        success: false,
        error: `Early check-in blocked: Cannot check in for a future date (${payload.checkInDate}). Today is ${businessDate}. Please use 'New Reservation' to book for future arrival dates.`
      };
    }

    if (room.status === 'occupied') return { success: false, error: 'Room is already occupied!' };
    if (room.status === 'maintenance') return { success: false, error: 'Room is blocked for maintenance!' };

    const targetBranchId = room.branchId || (activeBranchId !== 'all' ? activeBranchId : defaultBranchId);

    let guest = guests.find(
      (g) =>
        g.phone === payload.phone ||
        (payload.email && g.email === payload.email) ||
        g.idCardNumber === payload.idCardNumber
    );

    if (!guest) {
      guest = {
        id: `gst-${Date.now()}`,
        fullName: payload.guestName,
        phone: payload.phone,
        email: payload.email || `${payload.guestName.toLowerCase().replace(/\s+/g, '.')}@guest.com`,
        idCardNumber: payload.idCardNumber,
        nationality: payload.nationality || 'Cameroonian',
        vipTier: 'Standard',
        notes: payload.specialRequests || '',
        totalVisits: 1,
        totalSpent: payload.amountPaid,
        createdAt: businessDate
      };
      setGuests((prev) => [guest!, ...prev]);
    } else {
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guest!.id
            ? { ...g, totalVisits: g.totalVisits + 1, totalSpent: g.totalSpent + payload.amountPaid }
            : g
        )
      );
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

    showNotification(`Guest ${guest.fullName} checked into Room ${room.roomNumber}!`, 'success');
    return { success: true, reservationId: resId };
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

      const hasOverlap = allReservations.some((res) => {
        if (excludeReservationId && res.id === excludeReservationId) return false;
        if (res.roomId !== room.id) return false;
        if (res.bookingStatus !== 'reserved' && res.bookingStatus !== 'checked_in') return false;
        return doDateRangesOverlap(res.checkInDate, res.checkOutDate, checkInDate, checkOutDate);
      });

      return !hasOverlap;
    });
  };

  const isRoomAvailableForDateRange = (
    roomId: string,
    checkInDate: string,
    checkOutDate: string,
    excludeReservationId?: string
  ): boolean => {
    const room = allRooms.find((r) => r.id === roomId);
    if (!room || room.isActive === false) return false;

    const hasOverlap = allReservations.some((res) => {
      if (excludeReservationId && res.id === excludeReservationId) return false;
      if (res.roomId !== room.id) return false;
      if (res.bookingStatus !== 'reserved' && res.bookingStatus !== 'checked_in') return false;
      return doDateRangesOverlap(res.checkInDate, res.checkOutDate, checkInDate, checkOutDate);
    });

    return !hasOverlap;
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
  ): { success: boolean; reservationId?: string; error?: string } => {
    if (!isValidDateString(payload.checkInDate) || !isValidDateString(payload.checkOutDate)) {
      return { success: false, error: 'Please enter valid check-in and check-out dates (YYYY-MM-DD).' };
    }
    if (payload.checkOutDate <= payload.checkInDate) {
      return { success: false, error: 'Check-out date must be strictly after check-in date.' };
    }
    if (payload.checkInDate < businessDate) {
      return { success: false, error: 'Check-in date cannot be in the past.' };
    }
    if (payload.adults < 1) {
      return { success: false, error: 'At least 1 adult is required.' };
    }

    const roomType = roomTypes.find((rt) => rt.id === payload.roomTypeId);
    if (!roomType) {
      return { success: false, error: 'Selected room category is not found.' };
    }

    const totalGuests = payload.adults + (payload.children || 0);
    if (totalGuests > roomType.maxCapacity) {
      return {
        success: false,
        error: `Total guests (${totalGuests}) exceeds the maximum capacity of ${roomType.maxCapacity} for ${roomType.name}.`
      };
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
        return { success: false, error: 'Selected room not found or is deactivated.' };
      }
      const isFree = isRoomAvailableForDateRange(assignedRoom.id, payload.checkInDate, payload.checkOutDate);
      if (!isFree) {
        return {
          success: false,
          error: `Room #${assignedRoom.roomNumber} already has an overlapping reservation for these dates. Please choose another room or date range.`
        };
      }
    } else {
      const activeRoomsOfType = allRooms.filter(
        (r) => r.branchId === targetBranchId && r.isActive !== false && r.roomTypeId === roomType.id
      );
      if (activeRoomsOfType.length === 0) {
        return { success: false, error: `No active rooms of type ${roomType.name} configured in this branch.` };
      }
      const overlappingBookings = allReservations.filter((res) => {
        if (res.branchId !== targetBranchId) return false;
        if (res.bookingStatus !== 'reserved' && res.bookingStatus !== 'checked_in') return false;
        const resRoomTypeId = res.roomTypeId || allRooms.find((r) => r.id === res.roomId)?.roomTypeId;
        if (resRoomTypeId !== roomType.id) return false;
        return doDateRangesOverlap(res.checkInDate, res.checkOutDate, payload.checkInDate, payload.checkOutDate);
      });

      if (overlappingBookings.length >= activeRoomsOfType.length) {
        return {
          success: false,
          error: `All ${activeRoomsOfType.length} rooms of type ${roomType.name} are fully booked for these dates.`
        };
      }
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
        email: payload.email || `${payload.guestName.toLowerCase().replace(/\s+/g, '.')}@guest.com`,
        idCardNumber: payload.idCardNumber || 'PENDING',
        nationality: payload.nationality || 'Cameroonian',
        vipTier: 'Standard',
        notes: payload.specialRequests || '',
        totalVisits: 1,
        totalSpent: deposit,
        createdAt: businessDate
      };
      setGuests((prev) => [guest!, ...prev]);
    } else {
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guest!.id
            ? { ...g, totalVisits: g.totalVisits + 1, totalSpent: g.totalSpent + deposit }
            : g
        )
      );
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

    showNotification(`Reservation ${bookingCode} confirmed for ${guest.fullName}!`, 'success');
    return { success: true, reservationId: resId };
  };

  const updateReservation = (
    reservationId: string,
    payload: UpdateReservationPayload
  ): { success: boolean; error?: string } => {
    const res = allReservations.find((r) => r.id === reservationId);
    if (!res) return { success: false, error: 'Reservation not found.' };
    if (res.bookingStatus !== 'reserved') {
      return { success: false, error: 'Only bookings in "reserved" status can be edited.' };
    }

    if (!isValidDateString(payload.checkInDate) || !isValidDateString(payload.checkOutDate)) {
      return { success: false, error: 'Invalid dates.' };
    }
    if (payload.checkOutDate <= payload.checkInDate) {
      return { success: false, error: 'Check-out date must be strictly after check-in date.' };
    }
    if (payload.checkInDate < businessDate) {
      return { success: false, error: 'Check-in date cannot be in the past.' };
    }

    const roomType = roomTypes.find((rt) => rt.id === payload.roomTypeId);
    if (!roomType) return { success: false, error: 'Invalid room category.' };

    const totalGuests = payload.adults + (payload.children || 0);
    if (totalGuests > roomType.maxCapacity) {
      return {
        success: false,
        error: `Guest count (${totalGuests}) exceeds capacity of ${roomType.maxCapacity} for ${roomType.name}.`
      };
    }

    let assignedRoom: Room | undefined;
    if (payload.roomId) {
      assignedRoom = allRooms.find((r) => r.id === payload.roomId && r.isActive !== false);
      if (!assignedRoom) return { success: false, error: 'Selected room not found or deactivated.' };

      const isFree = isRoomAvailableForDateRange(assignedRoom.id, payload.checkInDate, payload.checkOutDate, reservationId);
      if (!isFree) {
        return { success: false, error: `Room #${assignedRoom.roomNumber} is unavailable for the selected dates.` };
      }
    } else {
      const activeRoomsOfType = allRooms.filter(
        (r) => r.branchId === res.branchId && r.isActive !== false && r.roomTypeId === roomType.id
      );
      const overlapping = allReservations.filter((r) => {
        if (r.id === reservationId) return false;
        if (r.branchId !== res.branchId) return false;
        if (r.bookingStatus !== 'reserved' && r.bookingStatus !== 'checked_in') return false;
        const resRoomTypeId = r.roomTypeId || allRooms.find((rm) => rm.id === r.roomId)?.roomTypeId;
        if (resRoomTypeId !== roomType.id) return false;
        return doDateRangesOverlap(r.checkInDate, r.checkOutDate, payload.checkInDate, payload.checkOutDate);
      });
      if (overlapping.length >= activeRoomsOfType.length) {
        return { success: false, error: `All rooms of type ${roomType.name} are booked for these dates.` };
      }
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
              specialRequests: payload.specialRequests !== undefined ? payload.specialRequests : r.specialRequests
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

    showNotification(`Reservation ${res.bookingCode} updated successfully.`, 'success');
    return { success: true };
  };

  const cancelReservation = (
    reservationId: string,
    reason: string,
    cancellationFee?: number,
    isNoShow?: boolean
  ): { success: boolean; error?: string } => {
    const res = allReservations.find((r) => r.id === reservationId);
    if (!res) return { success: false, error: 'Reservation not found.' };
    if (res.bookingStatus === 'cancelled' || res.bookingStatus === 'checked_out') {
      return { success: false, error: `Cannot cancel booking in ${res.bookingStatus} status.` };
    }

    if (!reason.trim()) {
      return { success: false, error: 'A cancellation reason is required.' };
    }

    const timestamp = `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    const staffName = currentUser?.name || 'Staff';
    const fullReason = isNoShow ? `No-Show: ${reason.trim()}` : reason.trim();
    const fee = cancellationFee && cancellationFee > 0 ? cancellationFee : 0;

    if (fee > 0) {
      const feeTx: FolioTransaction = {
        id: `tx-${Date.now()}-cancel-fee`,
        branchId: res.branchId,
        reservationId: res.id,
        guestId: res.guestId,
        roomNumber: res.roomNumber,
        category: 'late_checkout',
        description: isNoShow ? `No-Show Fee: ${fullReason}` : `Cancellation Fee: ${fullReason}`,
        amount: fee,
        type: 'charge',
        timestamp,
        recordedBy: staffName
      };
      setAllTransactions((prev) => [feeTx, ...prev]);
    }

    setAllReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId
          ? {
              ...r,
              bookingStatus: 'cancelled',
              cancelledAt: timestamp,
              cancelledBy: staffName,
              cancellationReason: fullReason,
              cancellationFee: fee
            }
          : r
      )
    );

    setAllRooms((prev) =>
      prev.map((room) =>
        room.currentReservationId === reservationId
          ? { ...room, status: 'dirty', currentReservationId: undefined }
          : room
      )
    );

    logStaffActivity(
      isNoShow ? 'Reservation No-Show' : 'Cancel Reservation',
      `Reservation ${res.bookingCode} for ${res.guestName} marked ${isNoShow ? 'No-Show' : 'Cancelled'}. Reason: "${fullReason}". Fee: ${formatMoney(fee)}.`
    );

    showNotification(`Reservation ${res.bookingCode} has been ${isNoShow ? 'marked No-Show' : 'cancelled'}.`, 'info');
    return { success: true };
  };

  const convertReservationToCheckIn = (
    payload: ConvertToCheckInPayload
  ): { success: boolean; error?: string } => {
    const res = allReservations.find((r) => r.id === payload.reservationId);
    if (!res) return { success: false, error: 'Reservation not found.' };
    if (res.bookingStatus !== 'reserved') {
      return { success: false, error: 'Only reserved bookings can be checked in.' };
    }

    // Check-in Valve: strictly block checking in before scheduled check-in date
    if (res.checkInDate > businessDate) {
      return {
        success: false,
        error: `Early check-in blocked: Reservation is scheduled for arrival on ${res.checkInDate}. Current business date is ${businessDate}. Guests cannot be checked in before their arrival date.`
      };
    }

    const room = allRooms.find((r) => r.id === payload.roomId);
    if (!room) return { success: false, error: 'Selected room not found.' };
    if (room.isActive === false) return { success: false, error: `Room #${room.roomNumber} is deactivated.` };
    if (room.status === 'occupied') return { success: false, error: `Room #${room.roomNumber} is currently occupied!` };

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

    showNotification(`Guest ${res.guestName} checked in to Room #${room.roomNumber}!`, 'success');
    return { success: true };
  };

  const checkOutGuest = (reservationId: string, paymentMethod?: PaymentMethod, settlementAmount?: number) => {
    if (!canCheckOut) {
      return { success: false, error: 'Unauthorized: Your role does not have check-out permissions.' };
    }

    const res = allReservations.find((r) => r.id === reservationId);
    if (!res) return { success: false, error: 'Reservation not found' };

    const targetBranchId = res.branchId || defaultBranchId;

    if (settlementAmount && settlementAmount > 0 && paymentMethod) {
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
              amountPaid: r.amountPaid + (settlementAmount || 0),
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

    showNotification(`Room ${res.roomNumber} checked out! Status flipped to DIRTY for Housekeeping turnover.`, 'success');
    return { success: true };
  };

  const addFolioCharge = (charge: Omit<FolioTransaction, 'id' | 'timestamp'>) => {
    if (isReadOnly) {
      showNotification('Owner account cannot add charges.', 'warning');
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

    showNotification(`Posted ${charge.description} (${formatMoney(charge.amount)}) to Room ${charge.roomNumber}`, 'info');
  };

  const recordFolioPayment = (payment: Omit<FolioTransaction, 'id' | 'timestamp' | 'type'>) => {
    if (isReadOnly) {
      showNotification('Owner account cannot record payments.', 'warning');
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

    showNotification(`Payment of ${formatMoney(payment.amount)} recorded via ${payment.paymentMethod?.toUpperCase()}`, 'success');
  };

  const voidTransaction = (txId: string, reason: string): boolean => {
    if (!canVoidTransactions) {
      showNotification('Permission denied: Only Manager/Accountant can void transactions.', 'warning');
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
              voidReason: reason
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

    showNotification(`Transaction voided by Manager approval: ${reason}`, 'info');
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

    showNotification(`Maintenance alert ${ticketNumber} logged. ${ticket.blocksRoom ? 'Room blocked.' : ''}`, 'warning');
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

    showNotification(`Work order updated to ${status}`, 'info');
  };

  // Night Audit (Per-Branch Execution & Isolated Rollover)
  const runNightAudit = (expectedCash: number, actualCash: number, notes: string) => {
    if (!canRunAudit) {
      throw new Error('Unauthorized: Only Manager / Lead Accountant can execute Night Audit.');
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
          (t.category === 'restaurant' || t.category === 'beverage' || t.category === 'laundry')
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const totalGrossRevenue = roomRevenue + posRevenue;
    const adr = occupied > 0 ? roomRevenue / occupied : 0;
    const revPar = totalRooms > 0 ? roomRevenue / totalRooms : 0;

    const cashCollected = allTransactions
      .filter((t) => t.branchId === targetBranchId && !t.voided && t.type === 'payment' && t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.amount, 0);

    const momoCollected = allTransactions
      .filter((t) => t.branchId === targetBranchId && !t.voided && t.type === 'payment' && t.paymentMethod === 'momo')
      .reduce((sum, t) => sum + t.amount, 0);

    const orangeMoneyCollected = allTransactions
      .filter((t) => t.branchId === targetBranchId && !t.voided && t.type === 'payment' && t.paymentMethod === 'orange_money')
      .reduce((sum, t) => sum + t.amount, 0);

    const cardCollected = allTransactions
      .filter(
        (t) =>
          t.branchId === targetBranchId &&
          !t.voided &&
          t.type === 'payment' &&
          (t.paymentMethod === 'card' || t.paymentMethod === 'bank_transfer')
      )
      .reduce((sum, t) => sum + t.amount, 0);

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

    showNotification(`Night Audit closed for ${branchLabel}! Rolled over business date to ${nextDate}`, 'success');
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
    showNotification(`Guest profile created for ${newGuest.fullName}`, 'success');
    return newGuest;
  };

  // Branch Management (Manager / Owner)
  const addBranch = (branchData: Omit<Branch, 'id'>) => {
    const name = branchData.name.trim();
    const city = branchData.city.trim();
    if (!name) return { success: false, error: 'Branch name is required.' };
    if (!city) return { success: false, error: 'Branch city is required.' };

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

    showNotification(`Branch "${name}" added successfully!`, 'success');
    return { success: true };
  };

  const updateBranch = (id: string, branchData: Partial<Branch>) => {
    if (branchData.name !== undefined && !branchData.name.trim()) {
      return { success: false, error: 'Branch name cannot be empty.' };
    }
    if (branchData.city !== undefined && !branchData.city.trim()) {
      return { success: false, error: 'Branch city cannot be empty.' };
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
    showNotification('Branch updated successfully.', 'success');
    return { success: true };
  };

  const toggleBranchActive = (id: string, active: boolean) => {
    if (!active) {
      const activeCount = branches.filter((b) => b.isActive).length;
      if (activeCount <= 1) {
        showNotification('Cannot deactivate the only active branch. The system must always have at least one active branch.', 'warning');
        return;
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
    showNotification(`Branch ${active ? 'activated' : 'deactivated'}.`, 'info');
  };

  const deleteBranch = (id: string) => {
    if (branches.length <= 1) {
      return { success: false, error: 'Cannot delete the only branch in the system.' };
    }

    const roomCount = allRooms.filter((r) => r.branchId === id).length;
    const resCount = allReservations.filter((r) => r.branchId === id).length;
    const txCount = allTransactions.filter((t) => t.branchId === id).length;
    const mtCount = allMaintenanceTickets.filter((m) => m.branchId === id).length;
    const auditCount = allNightAuditReports.filter((a) => a.branchId === id).length;

    if (roomCount > 0 || resCount > 0 || txCount > 0 || mtCount > 0 || auditCount > 0) {
      return {
        success: false,
        error: `Cannot delete branch with active rooms or history (${roomCount} rooms, ${resCount} reservations, ${txCount} transactions).`,
        canDeactivateInstead: true
      };
    }

    setBranches((prev) => prev.filter((b) => b.id !== id));
    if (activeBranchId === id) {
      const fallback = branches.find((b) => b.id !== id && b.isActive) || branches[0];
      if (fallback) {
        setActiveBranchIdState(fallback.id);
      }
    }
    showNotification('Branch deleted permanently.', 'info');
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
    setSelectedReservation(null);
    showNotification(isDemoMode ? 'System reset to clean sample demo data!' : 'System cleared to fresh empty state.', 'info');
  };

  // Room Type & Room Management (Manager Scope)
  const addRoomType = (newTypeData: Omit<RoomType, 'id'>) => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      showNotification('Unauthorized: Only managers and owners can configure room types.', 'warning');
      return { success: false, error: 'Unauthorized: Only managers and owners can configure room types.' };
    }
    const name = newTypeData.name?.trim();
    const code = newTypeData.code?.trim().toUpperCase();
    if (!name) return { success: false, error: 'Room type name is required.' };
    if (!code) return { success: false, error: 'Room type code (e.g. STD, DLX) is required.' };
    if (!newTypeData.basePrice || newTypeData.basePrice <= 0) return { success: false, error: 'Base price must be greater than 0.' };
    if (!newTypeData.maxCapacity || newTypeData.maxCapacity < 1) return { success: false, error: 'Maximum capacity must be at least 1 guest.' };
    if (!newTypeData.bedType?.trim()) return { success: false, error: 'Bed type is required.' };
    if (!newTypeData.description?.trim()) return { success: false, error: 'Room type description is required.' };

    const newType: RoomType = {
      ...newTypeData,
      id: `rt-${Date.now()}`,
      name,
      code,
      isActive: true,
      amenities: newTypeData.amenities || []
    };
    setRoomTypes((prev) => [...prev, newType]);
    showNotification(`Room type "${newType.name}" added successfully.`, 'success');
    return { success: true };
  };

  const updateRoomType = (id: string, updatedData: Partial<RoomType>) => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      showNotification('Unauthorized: Only managers and owners can edit room types.', 'warning');
      return { success: false, error: 'Unauthorized: Only managers and owners can edit room types.' };
    }
    if (updatedData.name !== undefined && !updatedData.name.trim()) {
      return { success: false, error: 'Room type name cannot be empty.' };
    }
    if (updatedData.code !== undefined && !updatedData.code.trim()) {
      return { success: false, error: 'Room type code cannot be empty.' };
    }
    if (updatedData.basePrice !== undefined && updatedData.basePrice <= 0) {
      return { success: false, error: 'Base price must be greater than 0.' };
    }
    if (updatedData.maxCapacity !== undefined && updatedData.maxCapacity < 1) {
      return { success: false, error: 'Maximum capacity must be at least 1.' };
    }

    setRoomTypes((prev) =>
      prev.map((rt) => (rt.id === id ? { ...rt, ...updatedData } : rt))
    );
    showNotification('Room type updated successfully.', 'success');
    return { success: true };
  };

  const deleteRoomType = (id: string) => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      showNotification('Unauthorized: Only managers and owners can delete room types.', 'warning');
      return { success: false, error: 'Unauthorized.' };
    }
    const hasRooms = allRooms.some((r) => r.roomTypeId === id);
    if (hasRooms) {
      return {
        success: false,
        error: 'This room type is assigned to existing rooms and cannot be deleted. You can deactivate it instead.',
        canDeactivateInstead: true
      };
    }
    setRoomTypes((prev) => prev.filter((rt) => rt.id !== id));
    showNotification('Room type deleted.', 'info');
    return { success: true };
  };

  const toggleRoomTypeActive = (id: string, active: boolean) => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      showNotification('Unauthorized: Only managers and owners can alter room type status.', 'warning');
      return;
    }
    setRoomTypes((prev) =>
      prev.map((rt) => (rt.id === id ? { ...rt, isActive: active } : rt))
    );
    showNotification(`Room type ${active ? 'activated' : 'deactivated'}.`, 'info');
  };

  // Rooms Management (Per-Branch Creation & Uniqueness)
  const addRoom = (roomData: {
    roomNumber: string;
    floor: number;
    roomTypeId: string;
    pricePerNight: number;
    branchId?: string;
    image?: string;
  }) => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      showNotification('Unauthorized: Only managers and owners can add rooms.', 'warning');
      return { success: false, error: 'Unauthorized.' };
    }
    const num = roomData.roomNumber?.trim();
    if (!num) return { success: false, error: 'Room number is required.' };
    if (!roomData.roomTypeId) return { success: false, error: 'Please choose a valid room type.' };
    if (isNaN(roomData.floor)) return { success: false, error: 'Floor must be a valid number.' };
    if (roomData.pricePerNight <= 0) return { success: false, error: 'Nightly rate must be greater than 0.' };

    const targetBranchId = roomData.branchId || (activeBranchId !== 'all' ? activeBranchId : defaultBranchId);

    // Room numbers must be unique within a branch, not across the whole hotel
    const duplicate = allRooms.some(
      (r) => r.branchId === targetBranchId && r.roomNumber.toLowerCase() === num.toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: `Room number "${num}" already exists in this branch.` };
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
    showNotification(`Room #${newRoom.roomNumber} created in branch.`, 'success');
    return { success: true };
  };

  const bulkAddRooms = (params: {
    startNumber: number;
    endNumber: number;
    floor: number;
    roomTypeId: string;
    pricePerNight: number;
    branchId?: string;
  }) => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      showNotification('Unauthorized: Only managers and owners can bulk-add rooms.', 'warning');
      return { success: false, count: 0, error: 'Unauthorized.' };
    }
    const { startNumber, endNumber, floor, roomTypeId, pricePerNight } = params;
    if (isNaN(startNumber) || isNaN(endNumber)) return { success: false, count: 0, error: 'Start and end numbers must be valid numbers.' };
    if (startNumber > endNumber) return { success: false, count: 0, error: 'Start room number cannot exceed end room number.' };
    if (endNumber - startNumber > 100) return { success: false, count: 0, error: 'Maximum batch addition is 100 rooms at a time.' };
    if (pricePerNight <= 0) return { success: false, count: 0, error: 'Price per night must be greater than 0.' };
    if (!roomTypeId) return { success: false, count: 0, error: 'Please select a room type.' };

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
      return {
        success: false,
        count: 0,
        error: `Cannot create rooms: Room number(s) ${conflicts.slice(0, 6).join(', ')}${conflicts.length > 6 ? '...' : ''} already exist in this branch.`
      };
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
    showNotification(`Added ${created.length} rooms (${startNumber} to ${endNumber}) on Floor ${floor} to branch!`, 'success');
    return { success: true, count: created.length };
  };

  const updateRoom = (id: string, updatedData: Partial<Room>) => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      showNotification('Unauthorized: Only managers and owners can edit rooms.', 'warning');
      return { success: false, error: 'Unauthorized.' };
    }

    const existingRoom = allRooms.find((r) => r.id === id);
    if (!existingRoom) return { success: false, error: 'Room not found.' };

    const targetBranchId = updatedData.branchId || existingRoom.branchId;

    if (updatedData.roomNumber !== undefined) {
      const num = updatedData.roomNumber.trim();
      if (!num) return { success: false, error: 'Room number cannot be empty.' };
      const duplicate = allRooms.some(
        (r) => r.id !== id && r.branchId === targetBranchId && r.roomNumber.toLowerCase() === num.toLowerCase()
      );
      if (duplicate) return { success: false, error: `Room number "${num}" is already in use by another room in this branch.` };
    }
    if (updatedData.pricePerNight !== undefined && updatedData.pricePerNight <= 0) {
      return { success: false, error: 'Price per night must be greater than 0.' };
    }

    setAllRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updatedData, branchId: targetBranchId } : r))
    );
    showNotification('Room updated successfully.', 'success');
    return { success: true };
  };

  const deleteRoom = (id: string) => {
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'owner') {
      showNotification('Unauthorized: Only managers and owners can delete rooms.', 'warning');
      return { success: false, error: 'Unauthorized.' };
    }
    const targetRoom = allRooms.find((r) => r.id === id);
    if (!targetRoom) return { success: false, error: 'Room not found.' };

    if (targetRoom.status === 'occupied' || targetRoom.currentReservationId) {
      return {
        success: false,
        error: `Room #${targetRoom.roomNumber} has an active checked-in guest and cannot be deleted. Deactivate it instead.`,
        canDeactivateInstead: true
      };
    }

    const hasResHistory = allReservations.some(
      (res) => res.roomId === id || (res.branchId === targetRoom.branchId && res.roomNumber === targetRoom.roomNumber)
    );
    if (hasResHistory) {
      return {
        success: false,
        error: `Room #${targetRoom.roomNumber} has reservation history and cannot be deleted. Deactivate it instead.`,
        canDeactivateInstead: true
      };
    }

    setAllRooms((prev) => prev.filter((r) => r.id !== id));
    showNotification(`Room #${targetRoom.roomNumber} removed from inventory.`, 'info');
    return { success: true };
  };

  const toggleRoomActive = (id: string, active: boolean) => {
    if (currentUser?.role !== 'manager') {
      showNotification('Unauthorized: Only managers can alter room status.', 'warning');
      return;
    }
    setAllRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: active } : r))
    );
    showNotification(`Room ${active ? 'activated' : 'deactivated'}.`, 'info');
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
        clearNotification,
        formatMoney,
        checkInGuest,
        checkOutGuest,
        createReservation,
        updateReservation,
        cancelReservation,
        convertReservationToCheckIn,
        getAvailableRoomsForDateRange,
        isRoomAvailableForDateRange,
        getNextUpcomingReservationForRoom,
        updateRoomStatus,
        addFolioCharge,
        recordFolioPayment,
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
        toggleRoomActive
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
