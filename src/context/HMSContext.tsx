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
  UserRole
} from '../types/hms';
import {
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

export type NavTab =
  | 'matrix'
  | 'reservations'
  | 'folios'
  | 'pos'
  | 'housekeeping'
  | 'maintenance'
  | 'audit'
  | 'analytics'
  | 'guests';

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
  roomTypes: RoomType[];
  rooms: Room[];
  guests: Guest[];
  reservations: Reservation[];
  transactions: FolioTransaction[];
  maintenanceTickets: MaintenanceTicket[];
  posItems: PosItem[];
  nightAuditReports: NightAuditReport[];
  currentUser: StaffUser;
  currency: 'FCFA' | 'USD';
  businessDate: string;
  activeTab: NavTab;
  selectedRoom: Room | null;
  selectedReservation: Reservation | null;
  notification: { message: string; type: 'success' | 'info' | 'warning' } | null;
  
  // Setters
  setCurrentUser: (user: StaffUser) => void;
  setCurrency: (c: 'FCFA' | 'USD') => void;
  setActiveTab: (tab: NavTab) => void;
  setSelectedRoom: (room: Room | null) => void;
  setSelectedReservation: (res: Reservation | null) => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'warning') => void;
  clearNotification: () => void;
  
  // Currency Formatter
  formatMoney: (amountInFcfa: number) => string;

  // Actions
  checkInGuest: (payload: CheckInPayload) => { success: boolean; reservationId?: string; error?: string };
  checkOutGuest: (reservationId: string, paymentMethod?: PaymentMethod, settlementAmount?: number) => { success: boolean; error?: string };
  updateRoomStatus: (roomId: string, status: RoomStatus, note?: string) => void;
  addFolioCharge: (charge: Omit<FolioTransaction, 'id' | 'timestamp'>) => void;
  recordFolioPayment: (payment: Omit<FolioTransaction, 'id' | 'timestamp' | 'type'>) => void;
  createMaintenanceTicket: (ticket: Omit<MaintenanceTicket, 'id' | 'ticketNumber' | 'reportedAt'>) => void;
  updateMaintenanceStatus: (ticketId: string, status: MaintenanceTicket['status'], cost?: number) => void;
  runNightAudit: (expectedCash: number, actualCash: number, notes: string) => NightAuditReport;
  addGuest: (guest: Omit<Guest, 'id' | 'createdAt' | 'totalVisits' | 'totalSpent'>) => Guest;
  resetToDemoData: () => void;
}

const HMSContext = createContext<HMSContextType | undefined>(undefined);

const STORAGE_KEY = 'hms_state_v1';

export const HMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state from localStorage or initial mock
  const [roomTypes] = useState<RoomType[]>(INITIAL_ROOM_TYPES);
  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_rooms`);
    return saved ? JSON.parse(saved) : INITIAL_ROOMS;
  });
  const [guests, setGuests] = useState<Guest[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_guests`);
    return saved ? JSON.parse(saved) : INITIAL_GUESTS;
  });
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_reservations`);
    return saved ? JSON.parse(saved) : INITIAL_RESERVATIONS;
  });
  const [transactions, setTransactions] = useState<FolioTransaction[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_transactions`);
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicket[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_maintenance`);
    return saved ? JSON.parse(saved) : INITIAL_MAINTENANCE_TICKETS;
  });
  const [posItems] = useState<PosItem[]>(INITIAL_POS_ITEMS);
  const [nightAuditReports, setNightAuditReports] = useState<NightAuditReport[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_audits`);
    return saved ? JSON.parse(saved) : INITIAL_NIGHT_AUDIT_HISTORY;
  });

  const [currentUser, setCurrentUser] = useState<StaffUser>(STAFF_USERS[0]);
  const [currency, setCurrency] = useState<'FCFA' | 'USD'>('FCFA');
  const [businessDate, setBusinessDate] = useState<string>('2026-10-14');
  const [activeTab, setActiveTab] = useState<NavTab>('matrix');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(rooms));
  }, [rooms]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_guests`, JSON.stringify(guests));
  }, [guests]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_reservations`, JSON.stringify(reservations));
  }, [reservations]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_transactions`, JSON.stringify(transactions));
  }, [transactions]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_maintenance`, JSON.stringify(maintenanceTickets));
  }, [maintenanceTickets]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_audits`, JSON.stringify(nightAuditReports));
  }, [nightAuditReports]);

  const showNotification = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const clearNotification = () => setNotification(null);

  const formatMoney = (amountInFcfa: number) => {
    if (currency === 'USD') {
      const usdAmount = amountInFcfa / 600;
      return `$${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${Math.round(amountInFcfa).toLocaleString('fr-FR')} FCFA`;
  };

  const updateRoomStatus = (roomId: string, status: RoomStatus, note?: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          status,
          maintenanceNote: note !== undefined ? note : r.maintenanceNote,
          lastCleaned: status === 'available' ? `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : r.lastCleaned
        };
      })
    );
    showNotification(`Room updated to status: ${status.toUpperCase()}`, 'info');
  };

  const checkInGuest = (payload: CheckInPayload) => {
    const room = rooms.find((r) => r.id === payload.roomId);
    if (!room) return { success: false, error: 'Target room not found' };
    if (room.status === 'occupied') return { success: false, error: 'Room is already occupied!' };
    if (room.status === 'maintenance') return { success: false, error: 'Room is blocked for maintenance!' };

    // Find or create guest
    let guest = guests.find(
      (g) => g.phone === payload.phone || (payload.email && g.email === payload.email) || g.idCardNumber === payload.idCardNumber
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
      // update visit count
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
      checkedInBy: currentUser.name
    };

    // Add initial room charge transaction
    const roomChargeTx: FolioTransaction = {
      id: `tx-${Date.now()}-1`,
      reservationId: resId,
      guestId: guest.id,
      roomNumber: room.roomNumber,
      category: 'room_charge',
      description: `${nights} Night(s) Stay Accommodation (${room.roomNumber})`,
      amount: totalAmount,
      type: 'charge',
      timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      recordedBy: currentUser.name
    };

    // Add deposit/payment transaction if paid > 0
    const paymentTxs: FolioTransaction[] = [roomChargeTx];
    if (payload.amountPaid > 0) {
      paymentTxs.push({
        id: `tx-${Date.now()}-2`,
        reservationId: resId,
        guestId: guest.id,
        roomNumber: room.roomNumber,
        category: 'deposit',
        description: `Check-in Payment (${payload.paymentMethod.toUpperCase()})`,
        amount: payload.amountPaid,
        type: 'payment',
        paymentMethod: payload.paymentMethod,
        reference: `${payload.paymentMethod.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        recordedBy: currentUser.name
      });
    }

    setReservations((prev) => [newReservation, ...prev]);
    setTransactions((prev) => [...paymentTxs, ...prev]);

    // Update Room status to occupied
    setRooms((prev) =>
      prev.map((r) =>
        r.id === room.id
          ? { ...r, status: 'occupied', currentReservationId: resId }
          : r
      )
    );

    showNotification(`Guest ${guest.fullName} checked into Room ${room.roomNumber} successfully!`, 'success');
    return { success: true, reservationId: resId };
  };

  const checkOutGuest = (reservationId: string, paymentMethod?: PaymentMethod, settlementAmount?: number) => {
    const res = reservations.find((r) => r.id === reservationId);
    if (!res) return { success: false, error: 'Reservation not found' };

    // Record settlement payment if any balance remaining
    if (settlementAmount && settlementAmount > 0 && paymentMethod) {
      const settlementTx: FolioTransaction = {
        id: `tx-${Date.now()}-stl`,
        reservationId: res.id,
        guestId: res.guestId,
        roomNumber: res.roomNumber,
        category: 'payment',
        description: `Check-Out Balance Settlement (${paymentMethod.toUpperCase()})`,
        amount: settlementAmount,
        type: 'payment',
        paymentMethod,
        reference: `STL-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        recordedBy: currentUser.name
      };
      setTransactions((prev) => [settlementTx, ...prev]);
    }

    // Mark reservation as checked out
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

    // Update room status to dirty (cleaning needed after check-out!)
    setRooms((prev) =>
      prev.map((room) =>
        room.id === res.roomId
          ? {
              ...room,
              status: 'dirty',
              currentReservationId: undefined,
              maintenanceNote: 'Requires full turnover cleaning and fresh linens.'
            }
          : room
      )
    );

    showNotification(`Room ${res.roomNumber} checked out! Room status is now marked DIRTY for Housekeeping turnover.`, 'success');
    return { success: true };
  };

  const addFolioCharge = (charge: Omit<FolioTransaction, 'id' | 'timestamp'>) => {
    const tx: FolioTransaction = {
      ...charge,
      id: `tx-${Date.now()}`,
      timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    };

    setTransactions((prev) => [tx, ...prev]);

    // Update reservation totalAmount if charge
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

    showNotification(`Payment recorded: ${formatMoney(payment.amount)} via ${payment.paymentMethod?.toUpperCase()}`, 'success');
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

    showNotification(`Ticket ${ticketNumber} logged. ${ticket.blocksRoom ? 'Room blocked for maintenance.' : ''}`, 'warning');
  };

  const updateMaintenanceStatus = (ticketId: string, status: MaintenanceTicket['status'], cost?: number) => {
    setMaintenanceTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        const updated = {
          ...t,
          status,
          repairCost: cost !== undefined ? cost : t.repairCost,
          resolvedAt: status === 'Resolved' ? `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : t.resolvedAt
        };

        // If resolved and had blocked room, unblock to dirty or available
        if (status === 'Resolved' && t.blocksRoom) {
          setRooms((roomsList) =>
            roomsList.map((r) =>
              r.id === t.roomId && r.status === 'maintenance'
                ? { ...r, status: 'dirty', maintenanceNote: 'Repairs completed. Turnover clean required.' }
                : r
            )
          );
        }

        return updated;
      })
    );

    showNotification(`Maintenance ticket marked as ${status}`, 'info');
  };

  const runNightAudit = (expectedCash: number, actualCash: number, notes: string) => {
    const occupied = rooms.filter((r) => r.status === 'occupied').length;
    const totalRooms = rooms.length;
    const occupancyRate = (occupied / totalRooms) * 100;

    // Calculate room revenue and POS revenue
    const roomRevenue = reservations
      .filter((r) => r.bookingStatus === 'checked_in')
      .reduce((sum, r) => sum + r.nightlyRate, 0);

    const posRevenue = transactions
      .filter((t) => t.category === 'restaurant' || t.category === 'beverage' || t.category === 'laundry')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalGrossRevenue = roomRevenue + posRevenue;
    const adr = occupied > 0 ? roomRevenue / occupied : 0;
    const revPar = totalRooms > 0 ? roomRevenue / totalRooms : 0;

    const cashCollected = transactions
      .filter((t) => t.type === 'payment' && t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.amount, 0);

    const momoCollected = transactions
      .filter((t) => t.type === 'payment' && t.paymentMethod === 'momo')
      .reduce((sum, t) => sum + t.amount, 0);

    const orangeMoneyCollected = transactions
      .filter((t) => t.type === 'payment' && t.paymentMethod === 'orange_money')
      .reduce((sum, t) => sum + t.amount, 0);

    const cardCollected = transactions
      .filter((t) => t.type === 'payment' && (t.paymentMethod === 'card' || t.paymentMethod === 'bank_transfer'))
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
      notes: notes || 'Daily night audit completed. All ledgers reconciled.',
      auditedBy: currentUser.name,
      timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    };

    setNightAuditReports((prev) => [report, ...prev]);

    // Roll over date by +1 day
    const currentDate = new Date(businessDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const nextDate = currentDate.toISOString().split('T')[0];
    setBusinessDate(nextDate);

    showNotification(`Night Audit completed! Business date rolled over to ${nextDate}`, 'success');
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
    localStorage.removeItem(`${STORAGE_KEY}_rooms`);
    localStorage.removeItem(`${STORAGE_KEY}_guests`);
    localStorage.removeItem(`${STORAGE_KEY}_reservations`);
    localStorage.removeItem(`${STORAGE_KEY}_transactions`);
    localStorage.removeItem(`${STORAGE_KEY}_maintenance`);
    localStorage.removeItem(`${STORAGE_KEY}_audits`);

    setRooms(INITIAL_ROOMS);
    setGuests(INITIAL_GUESTS);
    setReservations(INITIAL_RESERVATIONS);
    setTransactions(INITIAL_TRANSACTIONS);
    setMaintenanceTickets(INITIAL_MAINTENANCE_TICKETS);
    setNightAuditReports(INITIAL_NIGHT_AUDIT_HISTORY);
    setBusinessDate('2026-10-14');
    setSelectedRoom(null);
    setSelectedReservation(null);
    showNotification('System reset to initial sample demo data!', 'info');
  };

  return (
    <HMSContext.Provider
      value={{
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
        setCurrentUser,
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
