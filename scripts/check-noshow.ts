import { computeNoShows, addDaysToDateString } from '../src/utils/noShow';
import { getHotelNow } from '../src/utils/hotelClock';
import { Reservation, HotelConfig } from '../src/types/hms';

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

console.log('--- Testing Auto No-Show Computation ---');

const baseConfig: HotelConfig = {
  name: 'Grand Mountain Resort',
  timeZone: 'Africa/Douala',
  defaultCurrency: 'FCFA',
  checkInTime: '14:00',
  checkOutTime: '12:00',
  checkOutReminderMinutes: 30,
  autoCheckOutEnabled: true,
  autoNoShow: {
    enabled: true,
    afterDays: 0,
    cutoffTime: '23:59'
  }
} as HotelConfig;

function makeRes(partial: Partial<Reservation>): Reservation {
  return {
    id: 'res-1',
    bookingCode: 'BK-1001',
    guestName: 'John Doe',
    guestPhone: '+237600000000',
    roomId: 'room-1',
    roomNumber: '101',
    roomTypeId: 'rt-std',
    checkInDate: '2026-11-05',
    checkOutDate: '2026-11-07',
    adults: 1,
    children: 0,
    totalNights: 2,
    nightlyRate: 25000,
    totalAmount: 50000,
    bookingStatus: 'reserved',
    source: 'front_desk',
    createdAt: '2026-11-01T10:00:00Z',
    branchId: 'branch-1',
    ...partial
  };
}

// 1. Not yet at 23:59 -> none
const res1 = makeRes({ id: 'res-1', checkInDate: '2026-11-05' });
const results1 = computeNoShows({
  now: { date: '2026-11-05', time: '23:58', minutes: 1438 },
  reservations: [res1],
  hotelConfig: baseConfig
});
assert(results1.length === 0, '1. Not yet at 23:59 -> none');

// 2. At 23:59 -> included
const results2 = computeNoShows({
  now: { date: '2026-11-05', time: '23:59', minutes: 1439 },
  reservations: [res1],
  hotelConfig: baseConfig
});
assert(
  results2.length === 1 && results2[0].reservationId === 'res-1',
  '2. At 23:59 -> included'
);

// 3. afterDays 1 with cutoff 06:00 -> not on arrival night, included next day after 06:00
const configAfter1: HotelConfig = {
  ...baseConfig,
  autoNoShow: {
    enabled: true,
    afterDays: 1,
    cutoffTime: '06:00'
  }
};
// Arrival night at 23:59 -> not included
const results3a = computeNoShows({
  now: { date: '2026-11-05', time: '23:59', minutes: 1439 },
  reservations: [res1],
  hotelConfig: configAfter1
});
assert(results3a.length === 0, '3a. afterDays 1 -> not on arrival night at 23:59');

// Next morning at 05:59 -> not included
const results3b = computeNoShows({
  now: { date: '2026-11-06', time: '05:59', minutes: 359 },
  reservations: [res1],
  hotelConfig: configAfter1
});
assert(results3b.length === 0, '3b. afterDays 1 -> not next day before 06:00 (05:59)');

// Next day at 06:00 -> included
const results3c = computeNoShows({
  now: { date: '2026-11-06', time: '06:00', minutes: 360 },
  reservations: [res1],
  hotelConfig: configAfter1
});
assert(
  results3c.length === 1 && results3c[0].reservationId === 'res-1',
  '3c. afterDays 1 with cutoff 06:00 -> included next day at 06:00'
);

// 4. holdUntil in the future -> skipped
const resHeldFuture = makeRes({
  id: 'res-held-future',
  checkInDate: '2026-11-05',
  holdUntil: {
    date: '2026-11-06',
    time: '02:00',
    reason: 'Guest delayed on flight',
    setBy: 'Front Desk'
  }
});
const results4 = computeNoShows({
  now: { date: '2026-11-05', time: '23:59', minutes: 1439 },
  reservations: [resHeldFuture],
  hotelConfig: baseConfig
});
assert(results4.length === 0, '4. holdUntil in the future -> skipped');

// 5. holdUntil in the past -> included
const resHeldPast = makeRes({
  id: 'res-held-past',
  checkInDate: '2026-11-05',
  holdUntil: {
    date: '2026-11-05',
    time: '23:30',
    reason: 'Guest delayed',
    setBy: 'Front Desk'
  }
});
const results5 = computeNoShows({
  now: { date: '2026-11-05', time: '23:59', minutes: 1439 },
  reservations: [resHeldPast],
  hotelConfig: baseConfig
});
assert(
  results5.length === 1 && results5[0].reservationId === 'res-held-past',
  '5. holdUntil in the past -> included'
);

// 6. disabled -> none
const configDisabled: HotelConfig = {
  ...baseConfig,
  autoNoShow: {
    enabled: false,
    afterDays: 0,
    cutoffTime: '23:59'
  }
};
const results6 = computeNoShows({
  now: { date: '2026-11-06', time: '10:00', minutes: 600 },
  reservations: [res1],
  hotelConfig: configDisabled
});
assert(results6.length === 0, '6. disabled -> none');

// 7. checked_in, checked_out and cancelled ignored
const resCheckedIn = makeRes({ id: 'res-ci', bookingStatus: 'checked_in', checkInDate: '2026-11-05' });
const resCheckedOut = makeRes({ id: 'res-co', bookingStatus: 'checked_out', checkInDate: '2026-11-05' });
const resCancelled = makeRes({ id: 'res-cx', bookingStatus: 'cancelled', checkInDate: '2026-11-05' });
const results7 = computeNoShows({
  now: { date: '2026-11-06', time: '12:00', minutes: 720 },
  reservations: [resCheckedIn, resCheckedOut, resCancelled],
  hotelConfig: baseConfig
});
assert(results7.length === 0, '7. checked_in, checked_out and cancelled ignored');

// 8. reservation from three days ago is included (catch-up)
const resOld = makeRes({ id: 'res-old', checkInDate: '2026-11-02' });
const results8 = computeNoShows({
  now: { date: '2026-11-05', time: '10:00', minutes: 600 },
  reservations: [resOld],
  hotelConfig: baseConfig
});
assert(
  results8.length === 1 && results8[0].reservationId === 'res-old',
  '8. reservation from three days ago is included (catch-up)'
);

// 9. time zone case near midnight
// Let nowMs be 2026-11-05 22:59:00 UTC
// In Africa/Douala (UTC+1): 2026-11-05 23:59 -> cutoff moment has arrived!
const utcMs = Date.UTC(2026, 10, 5, 22, 59, 0); // 2026-11-05 22:59:00 UTC
const doualaNow = getHotelNow('Africa/Douala', utcMs);
assert(
  doualaNow.date === '2026-11-05' && doualaNow.time === '23:59',
  '9a. Douala timezone resolves to 2026-11-05 23:59 at UTC 22:59'
);
const results9Douala = computeNoShows({
  now: doualaNow,
  reservations: [res1],
  hotelConfig: { ...baseConfig, timeZone: 'Africa/Douala' }
});
assert(
  results9Douala.length === 1 && results9Douala[0].reservationId === 'res-1',
  '9b. Douala cutoff reached at 23:59'
);

// In London (UTC+0 in November): 2026-11-05 22:59 -> cutoff moment has NOT arrived yet
const londonNow = getHotelNow('Europe/London', utcMs);
assert(
  londonNow.date === '2026-11-05' && londonNow.time === '22:59',
  '9c. London timezone resolves to 2026-11-05 22:59 at UTC 22:59'
);
const results9London = computeNoShows({
  now: londonNow,
  reservations: [res1],
  hotelConfig: { ...baseConfig, timeZone: 'Europe/London' }
});
assert(
  results9London.length === 0,
  '9d. London cutoff not reached at 22:59 (reservation kept reserved)'
);

console.log(`\nAll ${total} auto no-show tests passed successfully!`);
