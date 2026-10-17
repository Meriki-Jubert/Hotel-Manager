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
  HotelConfig
} from '../types/hms';
import {
  DEFAULT_HOTEL_CONFIG,
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

  // Auth Setters
  login: (username: string, password?: string) => boolean;
  fastLogin: (role: UserRole) => void;
  logout: () => void;

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
  updateRoomStatus: (roomId: string, status: RoomStatus, note?: string) => void;
  addFolioCharge: (charge: Omit<FolioTransaction, 'id' | 'timestamp'>) => void;
  recordFolioPayment: (payment: Omit<FolioTransaction, 'id' | 'timestamp' | 'type'>) => void;
  voidTransaction: (txId: string, reason: string) => boolean;
  createMaintenanceTicket: (ticket: Omit<MaintenanceTicket, 'id' | 'ticketNumber' | 'reportedAt'>) => void;
  updateMaintenanceStatus: (ticketId: string, status: MaintenanceTicket['status'], cost?: number) => void;
  runNightAudit: (expectedCash: number, actualCash: number, notes: string) => NightAuditReport;
  addGuest: (guest: Omit<Guest, 'id' | 'createdAt' | 'totalVisits' | 'totalSpent'>) => Guest;
  resetToDemoData: () => void;
}

const HMSContext = createContext<HMSContextType | undefined>(undefined);

const STORAGE_PREFIX = 'hms_v2';

export const HMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Active hotel config
  const [hotelConfig, setHotelConfig] = useState<HotelConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_config`);
    return saved ? JSON.parse(saved) : DEFAULT_HOTEL_CONFIG;
  });

  // Auth state (starts as null to force login page)
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    const saved = sessionStorage.getItem(`${STORAGE_PREFIX}_user`);
    return saved ? JSON.parse(saved) : null;
  });

  // State
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_room_types`);
    return saved ? JSON.parse(saved) : INITIAL_ROOM_TYPES;
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_rooms`);
    return saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_ROOMS : []);
  });

  const [guests, setGuests] = useState<Guest[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_guests`);
    return saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_GUESTS : []);
  });

  const [reservations, setReservations] = useState<Reservation[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_reservations`);
    return saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_RESERVATIONS : []);
  });

  const [transactions, setTransactions] = useState<FolioTransaction[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_transactions`);
    return saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_TRANSACTIONS : []);
  });

  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicket[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_maintenance`);
    return saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_MAINTENANCE_TICKETS : []);
  });

  const [posItems] = useState<PosItem[]>(INITIAL_POS_ITEMS);

  const [nightAuditReports, setNightAuditReports] = useState<NightAuditReport[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_audits`);
    return saved ? JSON.parse(saved) : (isDemoMode ? INITIAL_NIGHT_AUDIT_HISTORY : []);
  });

  const [currency, setCurrency] = useState<'FCFA' | 'USD'>(hotelConfig.defaultCurrency);
  const [businessDate, setBusinessDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<NavTab>('matrix');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Document title sync
  useEffect(() => {
    document.title = `${hotelConfig.name} — Hotel Management System`;
  }, [hotelConfig.name]);

  // Sync to Storage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_config`, JSON.stringify(hotelConfig));
  }, [hotelConfig]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_room_types`, JSON.stringify(roomTypes));
  }, [roomTypes]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_rooms`, JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_guests`, JSON.stringify(guests));
  }, [guests]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_reservations`, JSON.stringify(reservations));
  }, [reservations]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_transactions`, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_maintenance`, JSON.stringify(maintenanceTickets));
  }, [maintenanceTickets]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}_audits`, JSON.stringify(nightAuditReports));
  }, [nightAuditReports]);

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
    allowedTabs = ['analytics', 'matrix'];
  }

  const canEditRates = role === 'manager';
  const canVoidTransactions = role === 'manager';
  const canRunAudit = role === 'manager';
  const canCheckIn = role === 'front_desk' || role === 'manager';
  const canCheckOut = role === 'front_desk' || role === 'manager';
  const isReadOnly = role === 'owner';

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

  // Auth Actions
  const login = (username: string, password?: string) => {
    const user = STAFF_USERS.find(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() ||
        u.email.toLowerCase() === username.trim().toLowerCase()
    );

    if (user) {
      setCurrentUser(user);
      sessionStorage.setItem(`${STORAGE_PREFIX}_user`, JSON.stringify(user));

      // Direct to initial landing tab based on role
      if (user.role === 'housekeeping') setActiveTab('housekeeping');
      else if (user.role === 'owner') setActiveTab('analytics');
      else setActiveTab('matrix');

      showNotification(`Welcome back, ${user.name} (${user.title})!`, 'success');
      return true;
    }
    return false;
  };

  const fastLogin = (userRole: UserRole) => {
    const user = STAFF_USERS.find((u) => u.role === userRole) || STAFF_USERS[0];
    setCurrentUser(user);
    sessionStorage.setItem(`${STORAGE_PREFIX}_user`, JSON.stringify(user));

    if (user.role === 'housekeeping') setActiveTab('housekeeping');
    else if (user.role === 'owner') setActiveTab('analytics');
    else setActiveTab('matrix');

    showNotification(`Signed in as ${user.name} (${user.title})`, 'success');
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(`${STORAGE_PREFIX}_user`);
    showNotification('Logged out successfully.', 'info');
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
    // Also update any available room pricing
    setRooms((prev) =>
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

    setRooms((prev) =>
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

    const room = rooms.find((r) => r.id === payload.roomId);
    if (!room) return { success: false, error: 'Target room not found' };
    if (room.status === 'occupied') return { success: false, error: 'Room is already occupied!' };
    if (room.status === 'maintenance') return { success: false, error: 'Room is blocked for maintenance!' };

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
      bookingCode,
      roomId: room.id,
      roomNumber: room.roomNumber,
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

    setReservations((prev) => [newReservation, ...prev]);
    setTransactions((prev) => [...paymentTxs, ...prev]);

    setRooms((prev) =>
      prev.map((r) =>
        r.id === room.id
          ? { ...r, status: 'occupied', currentReservationId: resId }
          : r
      )
    );

    showNotification(`Guest ${guest.fullName} checked into Room ${room.roomNumber}!`, 'success');
    return { success: true, reservationId: resId };
  };

  const checkOutGuest = (reservationId: string, paymentMethod?: PaymentMethod, settlementAmount?: number) => {
    if (!canCheckOut) {
      return { success: false, error: 'Unauthorized: Your role does not have check-out permissions.' };
    }

    const res = reservations.find((r) => r.id === reservationId);
    if (!res) return { success: false, error: 'Reservation not found' };

    if (settlementAmount && settlementAmount > 0 && paymentMethod) {
      const settlementTx: FolioTransaction = {
        id: `tx-${Date.now()}-stl`,
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
      setTransactions((prev) => [settlementTx, ...prev]);
    }

    setReservations((prev) =>
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
    setRooms((prev) =>
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

    const tx: FolioTransaction = {
      ...charge,
      id: `tx-${Date.now()}`,
      timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    };

    setTransactions((prev) => [tx, ...prev]);

    setReservations((prev) =>
      prev.map((res) => {
        if (res.id !== charge.reservationId) return res;
        const newTotal = res.totalAmount + charge.amount;
        return {
          ...res,
          totalAmount: newTotal,
          paymentStatus: res.amountPaid >= newTotal ? 'paid' : 'partial'
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

    const tx: FolioTransaction = {
      ...payment,
      id: `tx-${Date.now()}`,
      type: 'payment',
      timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    };

    setTransactions((prev) => [tx, ...prev]);

    setReservations((prev) =>
      prev.map((res) => {
        if (res.id !== payment.reservationId) return res;
        const newPaid = res.amountPaid + payment.amount;
        return {
          ...res,
          amountPaid: newPaid,
          paymentStatus: newPaid >= res.totalAmount ? 'paid' : 'partial'
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

    const tx = transactions.find((t) => t.id === txId);
    if (!tx || tx.voided) return false;

    setTransactions((prev) =>
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
      setReservations((prev) =>
        prev.map((res) =>
          res.id === tx.reservationId
            ? { ...res, totalAmount: Math.max(0, res.totalAmount - tx.amount) }
            : res
        )
      );
    } else if (tx.type === 'payment') {
      setReservations((prev) =>
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
    const ticketNumber = `MT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: MaintenanceTicket = {
      ...ticket,
      id: `mt-${Date.now()}`,
      ticketNumber,
      reportedAt: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    };

    setMaintenanceTickets((prev) => [newTicket, ...prev]);

    if (ticket.blocksRoom) {
      setRooms((prev) =>
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
    setMaintenanceTickets((prev) =>
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
          setRooms((roomsList) =>
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

  const runNightAudit = (expectedCash: number, actualCash: number, notes: string) => {
    if (!canRunAudit) {
      throw new Error('Unauthorized: Only Manager / Lead Accountant can execute Night Audit.');
    }

    const occupied = rooms.filter((r) => r.status === 'occupied').length;
    const totalRooms = rooms.length;
    const occupancyRate = (occupied / totalRooms) * 100;

    const roomRevenue = reservations
      .filter((r) => r.bookingStatus === 'checked_in')
      .reduce((sum, r) => sum + r.nightlyRate, 0);

    const posRevenue = transactions
      .filter((t) => !t.voided && (t.category === 'restaurant' || t.category === 'beverage' || t.category === 'laundry'))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalGrossRevenue = roomRevenue + posRevenue;
    const adr = occupied > 0 ? roomRevenue / occupied : 0;
    const revPar = totalRooms > 0 ? roomRevenue / totalRooms : 0;

    const cashCollected = transactions
      .filter((t) => !t.voided && t.type === 'payment' && t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.amount, 0);

    const momoCollected = transactions
      .filter((t) => !t.voided && t.type === 'payment' && t.paymentMethod === 'momo')
      .reduce((sum, t) => sum + t.amount, 0);

    const orangeMoneyCollected = transactions
      .filter((t) => !t.voided && t.type === 'payment' && t.paymentMethod === 'orange_money')
      .reduce((sum, t) => sum + t.amount, 0);

    const cardCollected = transactions
      .filter((t) => !t.voided && t.type === 'payment' && (t.paymentMethod === 'card' || t.paymentMethod === 'bank_transfer'))
      .reduce((sum, t) => sum + t.amount, 0);

    const discrepancy = actualCash - expectedCash;

    const report: NightAuditReport = {
      id: `na-${businessDate}-${Date.now()}`,
      date: businessDate,
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
      notes: notes || 'Night audit reconciled by management.',
      auditedBy: currentUser?.name || 'General Manager',
      timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    };

    setNightAuditReports((prev) => [report, ...prev]);

    const currentDate = new Date(businessDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const nextDate = currentDate.toISOString().split('T')[0];
    setBusinessDate(nextDate);

    showNotification(`Night Audit closed! Rolled over business date to ${nextDate}`, 'success');
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

  const resetToDemoData = () => {
    localStorage.removeItem(`${STORAGE_PREFIX}_room_types`);
    localStorage.removeItem(`${STORAGE_PREFIX}_rooms`);
    localStorage.removeItem(`${STORAGE_PREFIX}_guests`);
    localStorage.removeItem(`${STORAGE_PREFIX}_reservations`);
    localStorage.removeItem(`${STORAGE_PREFIX}_transactions`);
    localStorage.removeItem(`${STORAGE_PREFIX}_maintenance`);
    localStorage.removeItem(`${STORAGE_PREFIX}_audits`);

    setRoomTypes(INITIAL_ROOM_TYPES);
    setRooms(INITIAL_ROOMS);
    setGuests(INITIAL_GUESTS);
    setReservations(INITIAL_RESERVATIONS);
    setTransactions(INITIAL_TRANSACTIONS);
    setMaintenanceTickets(INITIAL_MAINTENANCE_TICKETS);
    setNightAuditReports(INITIAL_NIGHT_AUDIT_HISTORY);
    setSelectedRoom(null);
    setSelectedReservation(null);
    showNotification('System reset to clean sample demo data!', 'info');
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
        login,
        fastLogin,
        logout,
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
        updateRoomStatus,
        addFolioCharge,
        recordFolioPayment,
        voidTransaction,
        createMaintenanceTicket,
        updateMaintenanceStatus,
        runNightAudit,
        addGuest,
        resetToDemoData
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
