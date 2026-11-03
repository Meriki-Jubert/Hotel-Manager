import { getHotelNow, parseHHMM, getDepartureStatus } from '../src/utils/hotelClock';
import { computeTimedEvents } from '../src/utils/timedEvents';
import { Reservation, FolioTransaction, HotelConfig } from '../src/types/hms';

let passed = 0;
let total = 0;

function assert(condition: boolean, desc: string) {
  total++;
  if (!condition) {
    console.error(`❌ FAILED: ${desc}`);
    process.exit(1);
  }
  passed++;
  console.log(`✅ [${passed}] ${desc}`);
}

console.log('--- Testing Hotel Clock & Timed Events ---');

// 1. parseHHMM
assert(parseHHMM('12:00') === 720, 'parseHHMM parses 12:00 to 720');
assert(parseHHMM('04:00') === 240, 'parseHHMM parses 04:00 to 240');
assert(parseHHMM('invalid') === null, 'parseHHMM returns null for invalid input');

// 2. reminder at exactly 30 minutes before, none at 31
const reminderStatus30 = getDepartureStatus({
  checkOutDate: '2026-11-05',
  checkOutTime: '12:00',
  now: { date: '2026-11-05', time: '11:30', minutes: 690 },
  reminderMinutes: 30
});
assert(
  reminderStatus30.state === 'reminder' && reminderStatus30.minutesLeft === 30,
  'reminder at exactly 30 minutes before'
);

const reminderStatus31 = getDepartureStatus({
  checkOutDate: '2026-11-05',
  checkOutTime: '12:00',
  now: { date: '2026-11-05', time: '11:29', minutes: 689 },
  reminderMinutes: 30
});
assert(
  reminderStatus31.state === 'upcoming' && reminderStatus31.minutesLeft === 31,
  'none at 31 (state is upcoming)'
);

// 3. 'due' at the check-out minute
const dueStatus = getDepartureStatus({
  checkOutDate: '2026-11-05',
  checkOutTime: '12:00',
  now: { date: '2026-11-05', time: '12:00', minutes: 720 },
  reminderMinutes: 30
});
assert(
  dueStatus.state === 'due' && dueStatus.minutesLeft === 0,
  "'due' at the check-out minute"
);

// 4. overdue one minute later
const overdueStatus1m = getDepartureStatus({
  checkOutDate: '2026-11-05',
  checkOutTime: '12:00',
  now: { date: '2026-11-05', time: '12:01', minutes: 721 },
  reminderMinutes: 30
});
assert(
  overdueStatus1m.state === 'overdue' && overdueStatus1m.minutesLeft === -1,
  'overdue one minute later'
);

// 5. a check-out date from yesterday is overdue
const yesterdayStatus = getDepartureStatus({
  checkOutDate: '2026-11-04',
  checkOutTime: '12:00',
  now: { date: '2026-11-05', time: '10:00', minutes: 600 },
  reminderMinutes: 30
});
assert(
  yesterdayStatus.state === 'overdue' && yesterdayStatus.minutesLeft < 0,
  'a check-out date from yesterday is overdue'
);

// Base hotel config for timed events
const baseHotelConfig: HotelConfig = {
  name: 'Grand Palace',
  tagline: '',
  city: 'Douala',
  address: '',
  phone: '',
  email: '',
  taxId: '',
  registryNumber: '',
  defaultCurrency: 'FCFA',
  usdExchangeRate: 600,
  checkInTime: '14:00',
  checkOutTime: '12:00',
  timeZone: 'Africa/Douala',
  checkOutReminderMinutes: 30,
  autoCheckOut: 'settled_only'
};

const makeMockRes = (id: string, checkOutDate: string, roomNum: string): Reservation => ({
  id,
  bookingCode: `BK-${id}`,
  roomId: `room-${id}`,
  roomNumber: roomNum,
  guestId: `guest-${id}`,
  guestName: `Guest ${id}`,
  guestPhone: '12345678',
  checkInDate: '2026-11-01',
  checkOutDate,
  adults: 1,
  children: 0,
  nightlyRate: 25000,
  totalNights: 4,
  totalAmount: 100000,
  amountPaid: 100000,
  paymentStatus: 'paid',
  bookingStatus: 'checked_in',
  paymentMethod: 'cash',
  source: 'Walk-In',
  createdAt: '2026-11-01'
});

// 6. a balance above 0 is overdue and never in autoCheckOuts
const resWithBalance = makeMockRes('res-unsettled', '2026-11-05', '101');
const unsettledTxs: FolioTransaction[] = [
  {
    id: 'tx-1',
    reservationId: resWithBalance.id,
    guestId: resWithBalance.guestId,
    roomNumber: '101',
    category: 'room_charge',
    description: 'Room Charge',
    amount: 100000,
    type: 'charge',
    timestamp: '2026-11-01 14:00',
    recordedBy: 'System'
  },
  {
    id: 'tx-2',
    reservationId: resWithBalance.id,
    guestId: resWithBalance.guestId,
    roomNumber: '101',
    category: 'payment',
    description: 'Partial Deposit',
    amount: 40000,
    type: 'payment',
    paymentMethod: 'cash',
    timestamp: '2026-11-01 14:00',
    recordedBy: 'Front Desk'
  }
]; // balance = 60,000 > 0

const eventsOverdue = computeTimedEvents({
  now: { date: '2026-11-05', time: '12:15', minutes: 735 },
  reservations: [resWithBalance],
  transactions: unsettledTxs,
  hotelConfig: baseHotelConfig
});

assert(
  eventsOverdue.overdue.some((o) => o.reservationId === resWithBalance.id && o.balance === 60000),
  'a balance above 0 is overdue'
);
assert(
  !eventsOverdue.autoCheckOuts.some((a) => a.reservationId === resWithBalance.id),
  'a balance above 0 is never in autoCheckOuts'
);

// 7. a balance of 0 after 12:00 is in autoCheckOuts
const resSettled = makeMockRes('res-settled', '2026-11-05', '102');
const settledTxs: FolioTransaction[] = [
  {
    id: 'tx-3',
    reservationId: resSettled.id,
    guestId: resSettled.guestId,
    roomNumber: '102',
    category: 'room_charge',
    description: 'Room Charge',
    amount: 100000,
    type: 'charge',
    timestamp: '2026-11-01 14:00',
    recordedBy: 'System'
  },
  {
    id: 'tx-4',
    reservationId: resSettled.id,
    guestId: resSettled.guestId,
    roomNumber: '102',
    category: 'payment',
    description: 'Full Payment',
    amount: 100000,
    type: 'payment',
    paymentMethod: 'cash',
    timestamp: '2026-11-01 14:00',
    recordedBy: 'Front Desk'
  }
]; // balance = 0

const eventsSettled = computeTimedEvents({
  now: { date: '2026-11-05', time: '12:15', minutes: 735 },
  reservations: [resSettled],
  transactions: settledTxs,
  hotelConfig: baseHotelConfig
});

assert(
  eventsSettled.autoCheckOuts.some((a) => a.reservationId === resSettled.id),
  'a balance of 0 after 12:00 is in autoCheckOuts'
);

// 8. autoCheckOut 'off' never produces autoCheckOuts
const eventsAutoOff = computeTimedEvents({
  now: { date: '2026-11-05', time: '12:15', minutes: 735 },
  reservations: [resSettled],
  transactions: settledTxs,
  hotelConfig: { ...baseHotelConfig, autoCheckOut: 'off' }
});

assert(
  eventsAutoOff.autoCheckOuts.length === 0,
  "autoCheckOut 'off' never produces autoCheckOuts"
);
assert(
  eventsAutoOff.overdue.some((o) => o.reservationId === resSettled.id && o.balance === 0),
  "autoCheckOut 'off' keeps settled overdue guests in overdue list instead"
);

// 9. Time zone different from computer's gives the right local date near midnight
// (for example 23:30 in Africa/Douala when UTC is 22:30; and 00:30 next day when UTC is 23:30)
const utcTimestamp1 = Date.parse('2026-11-05T22:30:00Z');
const hotelNow1 = getHotelNow('Africa/Douala', utcTimestamp1);
assert(
  hotelNow1.date === '2026-11-05' && hotelNow1.time === '23:30',
  '23:30 in Africa/Douala when UTC is 22:30'
);

const utcTimestamp2 = Date.parse('2026-11-05T23:30:00Z');
const hotelNow2 = getHotelNow('Africa/Douala', utcTimestamp2);
assert(
  hotelNow2.date === '2026-11-06' && hotelNow2.time === '00:30',
  '00:30 next day when UTC is 23:30'
);

// 10. a credit of 5000 after check-out time is in overdue with credit 5000 and NOT in autoCheckOuts
const resCredit5000 = makeMockRes('res-credit-5000', '2026-11-05', '104');
const credit5000Txs: FolioTransaction[] = [
  {
    id: 'tx-cr-1',
    reservationId: resCredit5000.id,
    guestId: resCredit5000.guestId,
    roomNumber: '104',
    category: 'room_charge',
    description: 'Room Charge',
    amount: 100000,
    type: 'charge',
    timestamp: '2026-11-01 14:00',
    recordedBy: 'System'
  },
  {
    id: 'tx-cr-2',
    reservationId: resCredit5000.id,
    guestId: resCredit5000.guestId,
    roomNumber: '104',
    category: 'payment',
    description: 'Deposit with Credit',
    amount: 105000,
    type: 'payment',
    paymentMethod: 'cash',
    timestamp: '2026-11-01 14:00',
    recordedBy: 'Front Desk'
  }
]; // balance = -5000, credit = 5000

const eventsCredit5000 = computeTimedEvents({
  now: { date: '2026-11-05', time: '12:15', minutes: 735 },
  reservations: [resCredit5000],
  transactions: credit5000Txs,
  hotelConfig: baseHotelConfig
});

assert(
  eventsCredit5000.overdue.some((o) => o.reservationId === resCredit5000.id && o.balance === -5000 && o.credit === 5000),
  'a credit of 5000 after check-out time is in overdue with credit 5000'
);
assert(
  !eventsCredit5000.autoCheckOuts.some((a) => a.reservationId === resCredit5000.id),
  'a credit of 5000 after check-out time is NOT in autoCheckOuts'
);

console.log(`\n🎉 All ${passed}/${total} timed-events test cases passed successfully!`);
