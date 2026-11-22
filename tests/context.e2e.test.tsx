// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HMSProvider, useHMS } from '../src/context/HMSContext';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CancelReservationModal } from '../src/components/CancelReservationModal';
import { CheckOutModal } from '../src/components/CheckOutModal';
import {
  Branch,
  FolioTransaction,
  Guest,
  HotelConfig,
  Reservation,
  Room,
  RoomType,
  StaffUser
} from '../src/types/hms';
import { DEFAULT_CANCELLATION_POLICY } from '../src/utils/cancellationPolicy';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PREFIX = 'hms_v2';
const BUSINESS_DATE = '2026-11-10';
const BRANCH: Branch = {
  id: 'branch-1',
  name: 'Main Branch',
  city: 'Buea',
  address: 'Molyko',
  phone: '+237 600000000',
  isActive: true
};

const MANAGER_USER: StaffUser = {
  id: 'usr-mgr-1',
  name: 'Test Manager',
  username: 'manager',
  role: 'manager',
  branchId: 'branch-1',
  title: 'General Manager',
  email: 'manager@hotel.test',
  phone: '+237 600000001',
  isActive: true,
  avatar: '',
  description: 'Manager'
};

const ROOM_TYPE: RoomType = {
  id: 'rt-std',
  name: 'Standard',
  code: 'STD',
  basePrice: 25000,
  maxCapacity: 2,
  bedType: 'Queen',
  description: 'Standard room',
  amenities: [],
  isActive: true
};

const BASE_CONFIG: HotelConfig = {
  name: 'Test Hotel',
  tagline: '',
  city: 'Buea',
  address: 'Molyko',
  phone: '+237 600000000',
  email: 'info@hotel.test',
  taxId: '',
  registryNumber: '',
  defaultCurrency: 'FCFA',
  defaultLanguage: 'en',
  usdExchangeRate: 600,
  checkInTime: '14:00',
  checkOutTime: '12:00',
  cancellationPolicy: {
    tiers: [{ daysBeforeArrival: 0, feeType: 'nights', value: 1 }],
    noShow: { feeType: 'nights', value: 1 },
    allowNonRefundable: true
  },
  taxSettings: { enabled: false, label: 'VAT', ratePercent: 0 },
  timeZone: 'Africa/Douala',
  checkOutReminderMinutes: 30,
  autoCheckOut: 'settled_only',
  nightAuditReminderTime: '04:00',
  autoNoShow: { enabled: true, afterDays: 0, cutoffTime: '23:59' }
};

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-101',
    branchId: 'branch-1',
    roomNumber: '101',
    floor: 1,
    roomTypeId: 'rt-std',
    status: 'available',
    pricePerNight: 25000,
    isActive: true,
    ...overrides
  };
}

function makeGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: 'gst-1',
    fullName: 'Alice Guest',
    phone: '+237 670000000',
    email: 'alice@example.com',
    idCardNumber: 'CM-123456',
    nationality: 'Cameroonian',
    vipTier: 'Standard',
    notes: '',
    totalVisits: 1,
    totalSpent: 0,
    createdAt: BUSINESS_DATE,
    ...overrides
  };
}

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'res-1',
    branchId: 'branch-1',
    bookingCode: 'BK-101-1111',
    roomId: 'room-101',
    roomNumber: '101',
    roomTypeId: 'rt-std',
    guestId: 'gst-1',
    guestName: 'Alice Guest',
    guestPhone: '+237 670000000',
    checkInDate: BUSINESS_DATE,
    checkOutDate: '2026-11-12',
    adults: 1,
    children: 0,
    nightlyRate: 25000,
    totalNights: 2,
    totalAmount: 50000,
    amountPaid: 0,
    paymentStatus: 'unpaid',
    bookingStatus: 'reserved',
    paymentMethod: 'cash',
    source: 'Direct Website',
    rateType: 'flexible',
    createdAt: `${BUSINESS_DATE} 10:00`,
    ...overrides
  };
}

function seedStorage(opts: {
  rooms?: Room[];
  guests?: Guest[];
  reservations?: Reservation[];
  transactions?: FolioTransaction[];
  config?: Partial<HotelConfig>;
  user?: StaffUser | null;
}) {
  localStorage.setItem(
    `${PREFIX}_config`,
    JSON.stringify({
      ...BASE_CONFIG,
      ...opts.config,
      cancellationPolicy: opts.config?.cancellationPolicy ?? BASE_CONFIG.cancellationPolicy ?? DEFAULT_CANCELLATION_POLICY
    })
  );
  localStorage.setItem(`${PREFIX}_branches`, JSON.stringify([BRANCH]));
  localStorage.setItem(`${PREFIX}_active_branch`, 'branch-1');
  localStorage.setItem(`${PREFIX}_branch_business_dates`, JSON.stringify({ 'branch-1': BUSINESS_DATE }));
  localStorage.setItem(`${PREFIX}_room_types`, JSON.stringify([ROOM_TYPE]));
  localStorage.setItem(`${PREFIX}_rooms`, JSON.stringify(opts.rooms ?? [makeRoom()]));
  localStorage.setItem(`${PREFIX}_guests`, JSON.stringify(opts.guests ?? [makeGuest()]));
  localStorage.setItem(`${PREFIX}_reservations`, JSON.stringify(opts.reservations ?? []));
  localStorage.setItem(`${PREFIX}_transactions`, JSON.stringify(opts.transactions ?? []));
  localStorage.setItem(`${PREFIX}_maintenance`, JSON.stringify([]));
  localStorage.setItem(`${PREFIX}_pos_items`, JSON.stringify([]));
  localStorage.setItem(`${PREFIX}_audits`, JSON.stringify([]));
  localStorage.setItem(`${PREFIX}_staff_users`, JSON.stringify([MANAGER_USER]));
  localStorage.setItem(`${PREFIX}_staff_activity_log`, JSON.stringify([]));

  if (opts.user !== null) {
    sessionStorage.setItem(`${PREFIX}_user`, JSON.stringify(opts.user ?? MANAGER_USER));
  }
}

type HMSValue = ReturnType<typeof useHMS>;

describe('HMSContext same-moment duplicate prevention & modal locks', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  function mountHMS(extraUi?: React.ReactNode): { getCtx: () => HMSValue } {
    let ctxRef!: HMSValue;
    const Harness: React.FC = () => {
      ctxRef = useHMS();
      return <>{extraUi}</>;
    };
    act(() => {
      root.render(
        <HMSProvider>
          <LanguageProvider>
            <Harness />
          </LanguageProvider>
        </HMSProvider>
      );
    });
    return { getCtx: () => ctxRef };
  }

  it('autoMarkNoShow called twice in the same moment posts only one no-show fee and stays idempotent', () => {
    const res = makeReservation({
      id: 'res-ns-1',
      bookingStatus: 'reserved',
      amountPaid: 20000
    });
    const room = makeRoom({ id: 'room-101', status: 'reserved', currentReservationId: 'res-ns-1' });
    const roomChargeTx: FolioTransaction = {
      id: 'tx-rc-1',
      branchId: 'branch-1',
      reservationId: 'res-ns-1',
      guestId: 'gst-1',
      roomNumber: '101',
      category: 'room_charge',
      description: '2 Night(s) Stay',
      amount: 50000,
      type: 'charge',
      timestamp: `${BUSINESS_DATE} 10:00`,
      recordedBy: 'Test Manager'
    };
    seedStorage({ rooms: [room], reservations: [res], transactions: [roomChargeTx] });

    const { getCtx } = mountHMS();

    let r1!: ReturnType<HMSValue['autoMarkNoShow']>;
    let r2!: ReturnType<HMSValue['autoMarkNoShow']>;
    act(() => {
      r1 = getCtx().autoMarkNoShow('res-ns-1');
      r2 = getCtx().autoMarkNoShow('res-ns-1');
    });

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);

    const txs = getCtx().allTransactions.filter((t) => t.reservationId === 'res-ns-1');
    const noShowFees = txs.filter((t) => t.category === 'no_show_fee');
    expect(noShowFees).toHaveLength(1);
    expect(noShowFees[0].amount).toBe(25000);

    const updatedRes = getCtx().allReservations.find((r) => r.id === 'res-ns-1');
    expect(updatedRes?.bookingStatus).toBe('cancelled');
    expect(updatedRes?.autoNoShow).toBe(true);
    expect(updatedRes?.isNoShow).toBe(true);

    const updatedRoom = getCtx().allRooms.find((r) => r.id === 'room-101');
    expect(updatedRoom?.status).toBe('available');
    expect(updatedRoom?.currentReservationId).toBeUndefined();
  });

  it('cancelReservation called twice in the same moment rejects the second call and posts fee/refund once', () => {
    const res = makeReservation({
      id: 'res-cx-1',
      bookingStatus: 'reserved',
      amountPaid: 40000,
      paymentStatus: 'partial'
    });
    const room = makeRoom({ id: 'room-101', status: 'reserved', currentReservationId: 'res-cx-1' });
    const txs: FolioTransaction[] = [
      {
        id: 'tx-rc-1',
        branchId: 'branch-1',
        reservationId: 'res-cx-1',
        guestId: 'gst-1',
        roomNumber: '101',
        category: 'room_charge',
        description: 'Room charge',
        amount: 50000,
        type: 'charge',
        timestamp: `${BUSINESS_DATE} 10:00`,
        recordedBy: 'Manager'
      },
      {
        id: 'tx-dep-1',
        branchId: 'branch-1',
        reservationId: 'res-cx-1',
        guestId: 'gst-1',
        roomNumber: '101',
        category: 'deposit',
        description: 'Deposit',
        amount: 40000,
        type: 'payment',
        paymentMethod: 'cash',
        timestamp: `${BUSINESS_DATE} 10:00`,
        recordedBy: 'Manager'
      }
    ];
    seedStorage({ rooms: [room], reservations: [res], transactions: txs });

    const { getCtx } = mountHMS();

    let r1!: ReturnType<HMSValue['cancelReservation']>;
    let r2!: ReturnType<HMSValue['cancelReservation']>;
    act(() => {
      r1 = getCtx().cancelReservation('res-cx-1', 'Plans changed', 25000, false, 'refund', 'cash', {
        suggestedFee: 25000,
        policyRuleText: 'First night'
      });
      r2 = getCtx().cancelReservation('res-cx-1', 'Plans changed', 25000, false, 'refund', 'cash', {
        suggestedFee: 25000,
        policyRuleText: 'First night'
      });
    });

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(false);
    expect((r2 as { errorKey?: string }).errorKey).toBe('err.res.cancelOnlyReserved');

    const resTxs = getCtx().allTransactions.filter((t) => t.reservationId === 'res-cx-1');
    expect(resTxs.filter((t) => t.category === 'cancellation_fee')).toHaveLength(1);
    const refunds = resTxs.filter((t) => t.category === 'refund');
    expect(refunds).toHaveLength(1);
    expect(refunds[0].amount).toBe(-15000);
  });

  it('autoCheckOutGuest called twice in the same moment is idempotent and writes one activity log', () => {
    const res = makeReservation({
      id: 'res-aco-1',
      bookingStatus: 'checked_in',
      amountPaid: 50000,
      paymentStatus: 'paid'
    });
    const room = makeRoom({ id: 'room-101', status: 'occupied', currentReservationId: 'res-aco-1' });
    const txs: FolioTransaction[] = [
      {
        id: 'tx-rc-1',
        branchId: 'branch-1',
        reservationId: 'res-aco-1',
        guestId: 'gst-1',
        roomNumber: '101',
        category: 'room_charge',
        description: 'Room charge',
        amount: 50000,
        type: 'charge',
        timestamp: `${BUSINESS_DATE} 10:00`,
        recordedBy: 'Manager'
      },
      {
        id: 'tx-pay-1',
        branchId: 'branch-1',
        reservationId: 'res-aco-1',
        guestId: 'gst-1',
        roomNumber: '101',
        category: 'payment',
        description: 'Paid in full',
        amount: 50000,
        type: 'payment',
        paymentMethod: 'cash',
        timestamp: `${BUSINESS_DATE} 10:00`,
        recordedBy: 'Manager'
      }
    ];
    seedStorage({ rooms: [room], reservations: [res], transactions: txs });

    const { getCtx } = mountHMS();

    let r1!: ReturnType<HMSValue['autoCheckOutGuest']>;
    let r2!: ReturnType<HMSValue['autoCheckOutGuest']>;
    act(() => {
      r1 = getCtx().autoCheckOutGuest('res-aco-1');
      r2 = getCtx().autoCheckOutGuest('res-aco-1');
    });

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);

    const updatedRes = getCtx().allReservations.find((r) => r.id === 'res-aco-1');
    expect(updatedRes?.bookingStatus).toBe('checked_out');
    expect(updatedRes?.keyReturned).toBe(false);

    const updatedRoom = getCtx().allRooms.find((r) => r.id === 'room-101');
    expect(updatedRoom?.status).toBe('dirty');

    const autoCoLogs = getCtx().staffActivityLogs.filter((l) => l.action === 'Auto check-out (system)');
    expect(autoCoLogs).toHaveLength(1);
  });

  it('checkOutGuest called twice in the same moment rejects the second call and posts settlement once', () => {
    const res = makeReservation({
      id: 'res-co-1',
      bookingStatus: 'checked_in',
      amountPaid: 0,
      paymentStatus: 'unpaid'
    });
    const room = makeRoom({ id: 'room-101', status: 'occupied', currentReservationId: 'res-co-1' });
    const roomChargeTx: FolioTransaction = {
      id: 'tx-rc-1',
      branchId: 'branch-1',
      reservationId: 'res-co-1',
      guestId: 'gst-1',
      roomNumber: '101',
      category: 'room_charge',
      description: 'Room charge',
      amount: 50000,
      type: 'charge',
      timestamp: `${BUSINESS_DATE} 10:00`,
      recordedBy: 'Manager'
    };
    seedStorage({ rooms: [room], reservations: [res], transactions: [roomChargeTx] });

    const { getCtx } = mountHMS();

    let r1!: ReturnType<HMSValue['checkOutGuest']>;
    let r2!: ReturnType<HMSValue['checkOutGuest']>;
    act(() => {
      r1 = getCtx().checkOutGuest('res-co-1', 'cash', 50000);
      r2 = getCtx().checkOutGuest('res-co-1', 'cash', 50000);
    });

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(false);
    expect((r2 as { errorKey?: string }).errorKey).toBe('err.checkout.onlyCheckedIn');

    const payments = getCtx().allTransactions.filter(
      (t) => t.reservationId === 'res-co-1' && t.type === 'payment'
    );
    expect(payments).toHaveLength(1);
    expect(payments[0].amount).toBe(50000);
  });

  it('checkInGuest and convertReservationToCheckIn reject same-moment duplicate calls', () => {
    const reservedRes = makeReservation({
      id: 'res-conv-1',
      roomId: 'room-102',
      roomNumber: '102',
      bookingStatus: 'reserved'
    });
    const room101 = makeRoom({ id: 'room-101', roomNumber: '101', status: 'available' });
    const room102 = makeRoom({ id: 'room-102', roomNumber: '102', status: 'reserved', currentReservationId: 'res-conv-1' });
    seedStorage({ rooms: [room101, room102], reservations: [reservedRes], transactions: [] });

    const { getCtx } = mountHMS();

    let ci1!: ReturnType<HMSValue['checkInGuest']>;
    let ci2!: ReturnType<HMSValue['checkInGuest']>;
    let cv1!: ReturnType<HMSValue['convertReservationToCheckIn']>;
    let cv2!: ReturnType<HMSValue['convertReservationToCheckIn']>;

    act(() => {
      ci1 = getCtx().checkInGuest({
        guestName: 'Walk In Guest',
        phone: '+237 680000001',
        idCardNumber: 'ID-999',
        roomId: 'room-101',
        checkInDate: BUSINESS_DATE,
        checkOutDate: '2026-11-12',
        adults: 1,
        children: 0,
        paymentMethod: 'cash',
        amountPaid: 25000,
        source: 'Walk-In'
      });
      ci2 = getCtx().checkInGuest({
        guestName: 'Walk In Guest',
        phone: '+237 680000001',
        idCardNumber: 'ID-999',
        roomId: 'room-101',
        checkInDate: BUSINESS_DATE,
        checkOutDate: '2026-11-12',
        adults: 1,
        children: 0,
        paymentMethod: 'cash',
        amountPaid: 25000,
        source: 'Walk-In'
      });

      cv1 = getCtx().convertReservationToCheckIn({
        reservationId: 'res-conv-1',
        roomId: 'room-102',
        paymentMethod: 'cash',
        additionalDeposit: 10000,
        idCardNumber: 'CM-123456'
      });
      cv2 = getCtx().convertReservationToCheckIn({
        reservationId: 'res-conv-1',
        roomId: 'room-102',
        paymentMethod: 'cash',
        additionalDeposit: 10000,
        idCardNumber: 'CM-123456'
      });
    });

    expect(ci1.success).toBe(true);
    expect(ci2.success).toBe(false);
    expect(cv1.success).toBe(true);
    expect(cv2.success).toBe(false);
    expect((cv2 as { errorKey?: string }).errorKey).toBe('err.checkin.onlyReserved');

    expect(
      getCtx().allTransactions.filter((t) => t.reservationId === 'res-conv-1' && t.category === 'deposit')
    ).toHaveLength(1);
    expect(
      getCtx().allReservations.filter((r) => r.roomId === 'room-101' && r.bookingStatus === 'checked_in')
    ).toHaveLength(1);
  });

  it('reinstateNoShow called twice in the same moment rejects the second call', () => {
    const res = makeReservation({
      id: 'res-rein-1',
      bookingStatus: 'cancelled',
      isNoShow: true,
      autoNoShow: true
    });
    const txs: FolioTransaction[] = [
      {
        id: 'tx-rc-1',
        branchId: 'branch-1',
        reservationId: 'res-rein-1',
        guestId: 'gst-1',
        roomNumber: '101',
        category: 'room_charge',
        description: 'Room charge',
        amount: 50000,
        type: 'charge',
        voided: true,
        voidReason: 'Reservation cancelled',
        timestamp: `${BUSINESS_DATE} 10:00`,
        recordedBy: 'Manager'
      },
      {
        id: 'tx-ns-1',
        branchId: 'branch-1',
        reservationId: 'res-rein-1',
        guestId: 'gst-1',
        roomNumber: '101',
        category: 'no_show_fee',
        description: 'No-Show Fee',
        amount: 25000,
        type: 'charge',
        timestamp: `${BUSINESS_DATE} 23:59`,
        recordedBy: 'System'
      }
    ];
    seedStorage({ rooms: [makeRoom()], reservations: [res], transactions: txs });

    const { getCtx } = mountHMS();

    let r1!: ReturnType<HMSValue['reinstateNoShow']>;
    let r2!: ReturnType<HMSValue['reinstateNoShow']>;
    act(() => {
      r1 = getCtx().reinstateNoShow('res-rein-1', 'Flight delayed, guest arrived');
      r2 = getCtx().reinstateNoShow('res-rein-1', 'Flight delayed, guest arrived');
    });

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(false);
    expect((r2 as { errorKey?: string }).errorKey).toBe('err.reinstate.onlyAutoNoShow');
    expect(getCtx().allReservations.find((r) => r.id === 'res-rein-1')?.bookingStatus).toBe('reserved');
    expect(getCtx().allTransactions.find((t) => t.id === 'tx-ns-1')?.voided).toBe(true);
    expect(getCtx().allTransactions.find((t) => t.id === 'tx-rc-1')?.voided).toBe(false);
  });

  it('posting functions ignore identical calls in the same moment and allow new calls on a later tick', async () => {
    const res = makeReservation({
      id: 'res-post-1',
      bookingStatus: 'checked_in',
      totalAmount: 100000,
      amountPaid: 0
    });
    const room = makeRoom({ id: 'room-101', status: 'occupied', currentReservationId: 'res-post-1' });
    const baseCharge: FolioTransaction = {
      id: 'tx-rc-1',
      branchId: 'branch-1',
      reservationId: 'res-post-1',
      guestId: 'gst-1',
      roomNumber: '101',
      category: 'room_charge',
      description: 'Room charge',
      amount: 100000,
      type: 'charge',
      timestamp: `${BUSINESS_DATE} 10:00`,
      recordedBy: 'Manager'
    };
    seedStorage({ rooms: [room], reservations: [res], transactions: [baseCharge] });

    const { getCtx } = mountHMS();

    // Same-moment duplicate calls for addFolioCharge, recordFolioPayment, applyDiscount, recordSplitPayment
    act(() => {
      getCtx().addFolioCharge({
        reservationId: 'res-post-1',
        guestId: 'gst-1',
        roomNumber: '101',
        category: 'restaurant',
        description: 'Dinner Special',
        amount: 10000,
        type: 'charge',
        recordedBy: 'Manager'
      });
      getCtx().addFolioCharge({
        reservationId: 'res-post-1',
        guestId: 'gst-1',
        roomNumber: '101',
        category: 'restaurant',
        description: 'Dinner Special',
        amount: 10000,
        type: 'charge',
        recordedBy: 'Manager'
      });

      getCtx().recordFolioPayment({
        reservationId: 'res-post-1',
        guestId: 'gst-1',
        roomNumber: '101',
        category: 'payment',
        description: 'Cash partial payment',
        amount: 20000,
        paymentMethod: 'cash',
        recordedBy: 'Manager'
      });
      getCtx().recordFolioPayment({
        reservationId: 'res-post-1',
        guestId: 'gst-1',
        roomNumber: '101',
        category: 'payment',
        description: 'Cash partial payment',
        amount: 20000,
        paymentMethod: 'cash',
        recordedBy: 'Manager'
      });

      getCtx().applyDiscount('res-post-1', 'fixed', 5000, 'Loyalty guest comp');
      getCtx().applyDiscount('res-post-1', 'fixed', 5000, 'Loyalty guest comp');

      getCtx().recordSplitPayment(
        'res-post-1',
        [
          { method: 'momo', amount: 15000 },
          { method: 'cash', amount: 15000 }
        ],
        'GRP-1'
      );
      getCtx().recordSplitPayment(
        'res-post-1',
        [
          { method: 'momo', amount: 15000 },
          { method: 'cash', amount: 15000 }
        ],
        'GRP-1'
      );
    });

    const txsAfterSameTick = getCtx().allTransactions.filter((t) => t.reservationId === 'res-post-1');
    expect(txsAfterSameTick.filter((t) => t.description === 'Dinner Special')).toHaveLength(1);
    expect(txsAfterSameTick.filter((t) => t.description === 'Cash partial payment')).toHaveLength(1);
    expect(txsAfterSameTick.filter((t) => t.category === 'discount')).toHaveLength(1);
    expect(txsAfterSameTick.filter((t) => Boolean(t.splitGroupId))).toHaveLength(2); // 1 split group of 2 lines

    // Advance to next macrotask so the guard clears
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    act(() => {
      getCtx().recordFolioPayment({
        reservationId: 'res-post-1',
        guestId: 'gst-1',
        roomNumber: '101',
        category: 'payment',
        description: 'Cash partial payment',
        amount: 20000,
        paymentMethod: 'cash',
        recordedBy: 'Manager'
      });
    });

    const paymentsAfterNextTick = getCtx().allTransactions.filter(
      (t) => t.reservationId === 'res-post-1' && t.description === 'Cash partial payment'
    );
    expect(paymentsAfterNextTick).toHaveLength(2);
  });

  it('CancelReservationModal disables submit button after click and re-enables only on failure', () => {
    const res = makeReservation({
      id: 'res-modal-1',
      bookingStatus: 'reserved',
      amountPaid: 0
    });
    const room = makeRoom({ id: 'room-101', status: 'reserved', currentReservationId: 'res-modal-1' });
    seedStorage({ rooms: [room], reservations: [res], transactions: [] });

    let ctxRef!: HMSValue;
    let closedCount = 0;
    const Harness: React.FC = () => {
      ctxRef = useHMS();
      return <CancelReservationModal reservation={res} onClose={() => { closedCount++; }} />;
    };

    act(() => {
      root.render(
        <HMSProvider>
          <LanguageProvider>
            <Harness />
          </LanguageProvider>
        </HMSProvider>
      );
    });

    const textarea = container.querySelector('#cancellationReasonInput') as HTMLTextAreaElement;
    const form = container.querySelector('form') as HTMLFormElement;
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(submitBtn.disabled).toBe(false);

    // Fill reason and pre-cancel reservation in background so modal submit sees failure from context
    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      nativeSetter?.call(textarea, 'Guest changed plans');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      ctxRef.autoMarkNoShow('res-modal-1');
    });

    // Submit when reservation is already cancelled -> fails, button must re-enable
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(closedCount).toBe(0);
    expect(submitBtn.disabled).toBe(false);

    // Reinstate so next submit succeeds -> button must stay disabled on success
    act(() => {
      ctxRef.reinstateNoShow('res-modal-1', 'Retry cancellation flow');
    });
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(closedCount).toBe(1);
    expect(submitBtn.disabled).toBe(true);
  });

  it('CheckOutModal locks confirm button on success and re-enables on failure', () => {
    const res = makeReservation({
      id: 'res-co-modal',
      bookingStatus: 'checked_in',
      amountPaid: 50000,
      paymentStatus: 'paid'
    });
    const room = makeRoom({ id: 'room-101', status: 'occupied', currentReservationId: 'res-co-modal' });
    const txs: FolioTransaction[] = [
      {
        id: 'tx-rc-1',
        branchId: 'branch-1',
        reservationId: 'res-co-modal',
        guestId: 'gst-1',
        roomNumber: '101',
        category: 'room_charge',
        description: 'Room charge',
        amount: 50000,
        type: 'charge',
        timestamp: `${BUSINESS_DATE} 10:00`,
        recordedBy: 'Manager'
      },
      {
        id: 'tx-pay-1',
        branchId: 'branch-1',
        reservationId: 'res-co-modal',
        guestId: 'gst-1',
        roomNumber: '101',
        category: 'payment',
        description: 'Paid',
        amount: 50000,
        type: 'payment',
        paymentMethod: 'cash',
        timestamp: `${BUSINESS_DATE} 10:00`,
        recordedBy: 'Manager'
      }
    ];
    seedStorage({ rooms: [room], reservations: [res], transactions: txs });

    let ctxRef!: HMSValue;
    let successCount = 0;
    const Harness: React.FC = () => {
      ctxRef = useHMS();
      return (
        <CheckOutModal
          reservation={res}
          onClose={() => {}}
          onSuccess={() => {
            successCount++;
          }}
          onOpenFolio={() => {}}
        />
      );
    };

    act(() => {
      root.render(
        <HMSProvider>
          <LanguageProvider>
            <Harness />
          </LanguageProvider>
        </HMSProvider>
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const confirmBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);

    // Check out first via context so modal attempt fails -> button re-enables
    act(() => {
      ctxRef.checkOutGuest('res-co-modal');
    });
    act(() => {
      confirmBtn.click();
    });
    expect(successCount).toBe(0);
    expect(confirmBtn.disabled).toBe(false);
  });
});
