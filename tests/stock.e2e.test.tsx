// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HMSProvider, useHMS } from '../src/context/HMSContext';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import {
  Branch,
  FolioTransaction,
  Guest,
  HotelConfig,
  PosItem,
  Reservation,
  Room,
  RoomType,
  StaffUser,
  StockMovement
} from '../src/types/hms';
import { DEFAULT_CANCELLATION_POLICY } from '../src/utils/cancellationPolicy';
import { getStockLevel } from '../src/utils/stock';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PREFIX = 'hms_v2';
const BUSINESS_DATE = '2026-11-10';

const BRANCH_1: Branch = {
  id: 'branch-1',
  name: 'Main Branch',
  city: 'Buea',
  address: 'Molyko',
  phone: '+237 600000000',
  isActive: true
};

const BRANCH_2: Branch = {
  id: 'branch-2',
  name: 'Douala Branch',
  city: 'Douala',
  address: 'Bonapriso',
  phone: '+237 600000099',
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

const FRONT_DESK_USER: StaffUser = {
  id: 'usr-fd-1',
  name: 'Claire Front Desk',
  username: 'frontdesk',
  role: 'front_desk',
  branchId: 'branch-1',
  title: 'Front Desk Agent',
  email: 'fd@hotel.test',
  phone: '+237 600000002',
  isActive: true,
  avatar: '',
  description: 'Front Desk'
};

const HOUSEKEEPING_USER: StaffUser = {
  id: 'usr-hk-1',
  name: 'Paul Housekeeping',
  username: 'housekeeping',
  role: 'housekeeping',
  branchId: 'branch-1',
  title: 'Housekeeping Lead',
  email: 'hk@hotel.test',
  phone: '+237 600000003',
  isActive: true,
  avatar: '',
  description: 'Housekeeping'
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
  cancellationPolicy: DEFAULT_CANCELLATION_POLICY,
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
    status: 'occupied',
    currentReservationId: 'res-1',
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
    bookingStatus: 'checked_in',
    paymentMethod: 'cash',
    source: 'Direct Website',
    rateType: 'flexible',
    createdAt: `${BUSINESS_DATE} 10:00`,
    ...overrides
  };
}

function makePosItem(overrides: Partial<PosItem> = {}): PosItem {
  return {
    id: 'pos-beer',
    name: 'Craft Beer',
    category: 'Beverages',
    price: 1500,
    available: true,
    isActive: true,
    trackStock: true,
    lowStockThreshold: 5,
    unit: 'bottle',
    ...overrides
  };
}

function seedStorage(opts: {
  posItems?: PosItem[];
  stockMovements?: StockMovement[];
  reservations?: Reservation[];
  rooms?: Room[];
  transactions?: FolioTransaction[];
  user?: StaffUser;
  activeBranchId?: string;
} = {}) {
  localStorage.setItem(`${PREFIX}_config`, JSON.stringify(BASE_CONFIG));
  localStorage.setItem(`${PREFIX}_branches`, JSON.stringify([BRANCH_1, BRANCH_2]));
  localStorage.setItem(`${PREFIX}_active_branch`, opts.activeBranchId ?? 'branch-1');
  localStorage.setItem(
    `${PREFIX}_branch_business_dates`,
    JSON.stringify({ 'branch-1': BUSINESS_DATE, 'branch-2': BUSINESS_DATE })
  );
  localStorage.setItem(`${PREFIX}_room_types`, JSON.stringify([ROOM_TYPE]));
  localStorage.setItem(`${PREFIX}_rooms`, JSON.stringify(opts.rooms ?? [makeRoom()]));
  localStorage.setItem(`${PREFIX}_guests`, JSON.stringify([makeGuest()]));
  localStorage.setItem(`${PREFIX}_reservations`, JSON.stringify(opts.reservations ?? [makeReservation()]));
  localStorage.setItem(`${PREFIX}_transactions`, JSON.stringify(opts.transactions ?? []));
  localStorage.setItem(`${PREFIX}_maintenance`, JSON.stringify([]));
  localStorage.setItem(`${PREFIX}_pos_items`, JSON.stringify(opts.posItems ?? [makePosItem()]));
  localStorage.setItem(`${PREFIX}_stock_movements`, JSON.stringify(opts.stockMovements ?? []));
  localStorage.setItem(`${PREFIX}_audits`, JSON.stringify([]));
  localStorage.setItem(
    `${PREFIX}_staff_users`,
    JSON.stringify([MANAGER_USER, FRONT_DESK_USER, HOUSEKEEPING_USER])
  );
  localStorage.setItem(`${PREFIX}_staff_activity_log`, JSON.stringify([]));

  sessionStorage.setItem(`${PREFIX}_user`, JSON.stringify(opts.user ?? MANAGER_USER));
}

type HMSValue = ReturnType<typeof useHMS>;

describe('POS stock tracking & inventory permissions E2E', () => {
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

  function mountHMS(): { getCtx: () => HMSValue } {
    let ctxRef!: HMSValue;
    const Harness: React.FC = () => {
      ctxRef = useHMS();
      return null;
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

  it('POS order for 3 of an item with stock 5 leaves level 2, posts folio charge once, and voiding does NOT restock', () => {
    seedStorage({
      posItems: [makePosItem({ id: 'pos-beer', price: 1500, trackStock: true })],
      stockMovements: [
        {
          id: 'sm-open-1',
          branchId: 'branch-1',
          itemId: 'pos-beer',
          type: 'opening',
          quantity: 5,
          createdAt: `${BUSINESS_DATE} 08:00`,
          recordedBy: 'Test Manager'
        }
      ]
    });

    const { getCtx } = mountHMS();

    let res!: ReturnType<HMSValue['processPosOrder']>;
    act(() => {
      res = getCtx().processPosOrder({
        mode: 'room',
        reservationId: 'res-1',
        lines: [{ itemId: 'pos-beer', qty: 3 }]
      });
    });

    expect(res.success).toBe(true);
    expect(getStockLevel(getCtx().allStockMovements, 'pos-beer', 'branch-1')).toBe(2);

    const charges = getCtx().allTransactions.filter(
      (t) => t.reservationId === 'res-1' && t.category === 'restaurant'
    );
    expect(charges).toHaveLength(1);
    expect(charges[0].amount).toBe(4500);

    // Voiding the folio transaction does NOT automatically restock
    let voided = false;
    act(() => {
      voided = getCtx().voidTransaction(charges[0].id, 'Guest disputed charge');
    });
    expect(voided).toBe(true);
    expect(getStockLevel(getCtx().allStockMovements, 'pos-beer', 'branch-1')).toBe(2);
  });

  it('POS order for 6 of an item with stock 5 is refused, leaves level 5, and adds no folio charge', () => {
    seedStorage({
      posItems: [makePosItem({ id: 'pos-beer', price: 1500, trackStock: true })],
      stockMovements: [
        {
          id: 'sm-open-1',
          branchId: 'branch-1',
          itemId: 'pos-beer',
          type: 'opening',
          quantity: 5,
          createdAt: `${BUSINESS_DATE} 08:00`,
          recordedBy: 'Test Manager'
        }
      ]
    });

    const { getCtx } = mountHMS();

    let res!: ReturnType<HMSValue['processPosOrder']>;
    act(() => {
      res = getCtx().processPosOrder({
        mode: 'room',
        reservationId: 'res-1',
        lines: [{ itemId: 'pos-beer', qty: 6 }]
      });
    });

    expect(res.success).toBe(false);
    expect(res.errorKey).toBe('err.stock.insufficient');
    expect(getStockLevel(getCtx().allStockMovements, 'pos-beer', 'branch-1')).toBe(5);
    expect(getCtx().allTransactions.filter((t) => t.reservationId === 'res-1')).toHaveLength(0);
  });

  it('Double call of the same POS order in the same moment sells only once', () => {
    seedStorage({
      posItems: [makePosItem({ id: 'pos-beer', price: 1500, trackStock: true })],
      stockMovements: [
        {
          id: 'sm-open-1',
          branchId: 'branch-1',
          itemId: 'pos-beer',
          type: 'opening',
          quantity: 5,
          createdAt: `${BUSINESS_DATE} 08:00`,
          recordedBy: 'Test Manager'
        }
      ]
    });

    const { getCtx } = mountHMS();

    let r1!: ReturnType<HMSValue['processPosOrder']>;
    let r2!: ReturnType<HMSValue['processPosOrder']>;
    act(() => {
      r1 = getCtx().processPosOrder({
        mode: 'room',
        reservationId: 'res-1',
        lines: [{ itemId: 'pos-beer', qty: 3 }]
      });
      r2 = getCtx().processPosOrder({
        mode: 'room',
        reservationId: 'res-1',
        lines: [{ itemId: 'pos-beer', qty: 3 }]
      });
    });

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(getStockLevel(getCtx().allStockMovements, 'pos-beer', 'branch-1')).toBe(2);
    expect(
      getCtx().allTransactions.filter((t) => t.reservationId === 'res-1' && t.category === 'restaurant')
    ).toHaveLength(1);
  });

  it('front_desk can add/update non-price item fields, CANNOT change price, CANNOT delete or toggle active', () => {
    seedStorage({
      user: FRONT_DESK_USER,
      posItems: [makePosItem({ id: 'pos-beer', name: 'Craft Beer', price: 1500, trackStock: true })]
    });

    const { getCtx } = mountHMS();

    // 1. Add item with opening stock
    let addRes!: ReturnType<HMSValue['addPosItem']>;
    act(() => {
      addRes = getCtx().addPosItem(
        {
          name: 'Fresh Juice',
          category: 'Beverages',
          price: 2000,
          available: true,
          isActive: true,
          trackStock: true,
          lowStockThreshold: 4,
          unit: 'glass'
        },
        { openingStock: 10, branchId: 'branch-1' }
      );
    });
    expect(addRes.success).toBe(true);
    expect(addRes.item).toBeDefined();
    expect(getStockLevel(getCtx().allStockMovements, addRes.item!.id, 'branch-1')).toBe(10);

    // 2. Update non-price fields (name, unit, threshold) -> allowed
    let updOk!: ReturnType<HMSValue['updatePosItem']>;
    act(() => {
      updOk = getCtx().updatePosItem('pos-beer', {
        name: 'Craft Lager',
        unit: 'can',
        lowStockThreshold: 8
      });
    });
    expect(updOk.success).toBe(true);
    expect(getCtx().posItems.find((i) => i.id === 'pos-beer')?.name).toBe('Craft Lager');

    // 3. Change price -> forbidden for front_desk
    let updPrice!: ReturnType<HMSValue['updatePosItem']>;
    act(() => {
      updPrice = getCtx().updatePosItem('pos-beer', { price: 2500 });
    });
    expect(updPrice.success).toBe(false);
    expect(updPrice.errorKey).toBe('err.menu.frontDeskPriceForbidden');
    expect(getCtx().posItems.find((i) => i.id === 'pos-beer')?.price).toBe(1500);

    // 4. Delete item -> forbidden for front_desk
    let delRes!: ReturnType<HMSValue['deletePosItem']>;
    act(() => {
      delRes = getCtx().deletePosItem('pos-beer');
    });
    expect(delRes.success).toBe(false);
    expect(delRes.errorKey).toBe('err.menu.unauthorizedDelete');

    // 5. Toggle active -> forbidden for front_desk
    let toggleRes!: ReturnType<HMSValue['togglePosItemActive']>;
    act(() => {
      toggleRes = getCtx().togglePosItemActive('pos-beer', false);
    });
    expect(toggleRes.success).toBe(false);
    expect(toggleRes.errorKey).toBe('err.menu.unauthorizedStatus');
  });

  it('housekeeping cannot record stock movements', () => {
    seedStorage({
      user: HOUSEKEEPING_USER,
      posItems: [makePosItem({ id: 'pos-beer', price: 1500, trackStock: true })]
    });

    const { getCtx } = mountHMS();

    let recRes!: ReturnType<HMSValue['recordStockMovement']>;
    act(() => {
      recRes = getCtx().recordStockMovement('pos-beer', 'receive', 5, 'Delivery', 'branch-1');
    });

    expect(recRes.success).toBe(false);
    expect(recRes.errorKey).toBe('err.stock.unauthorized');
    expect(getStockLevel(getCtx().allStockMovements, 'pos-beer', 'branch-1')).toBe(0);
  });

  it('maintains separate stock per branch without cross-branch leakage', () => {
    seedStorage({
      user: MANAGER_USER,
      activeBranchId: 'branch-1',
      posItems: [makePosItem({ id: 'pos-beer', price: 1500, trackStock: true })],
      stockMovements: [
        {
          id: 'sm-b1',
          branchId: 'branch-1',
          itemId: 'pos-beer',
          type: 'opening',
          quantity: 5,
          createdAt: `${BUSINESS_DATE} 08:00`,
          recordedBy: 'Test Manager'
        },
        {
          id: 'sm-b2',
          branchId: 'branch-2',
          itemId: 'pos-beer',
          type: 'opening',
          quantity: 12,
          createdAt: `${BUSINESS_DATE} 08:00`,
          recordedBy: 'Test Manager'
        }
      ]
    });

    const { getCtx } = mountHMS();

    // Receive 4 in branch-2 while activeBranchId is branch-1
    let recB2!: ReturnType<HMSValue['recordStockMovement']>;
    act(() => {
      recB2 = getCtx().recordStockMovement('pos-beer', 'receive', 4, 'Branch 2 restock', 'branch-2');
    });
    expect(recB2.success).toBe(true);

    // Sell 3 in branch-1 (cash order)
    let saleB1!: ReturnType<HMSValue['processPosOrder']>;
    act(() => {
      saleB1 = getCtx().processPosOrder({
        mode: 'cash',
        paymentMethod: 'cash',
        branchId: 'branch-1',
        lines: [{ itemId: 'pos-beer', qty: 3 }]
      });
    });
    expect(saleB1.success).toBe(true);

    expect(getStockLevel(getCtx().allStockMovements, 'pos-beer', 'branch-1')).toBe(2);
    expect(getStockLevel(getCtx().allStockMovements, 'pos-beer', 'branch-2')).toBe(16);

    // Switching activeBranchId exposes branch-scoped stockMovements
    act(() => {
      getCtx().setActiveBranchId('branch-2');
    });
    expect(getCtx().stockMovements.every((m) => m.branchId === 'branch-2')).toBe(true);
  });
});
