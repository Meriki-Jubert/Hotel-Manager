import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useHMS } from './HMSContext';
import { useT } from '../i18n/LanguageContext';
import { translate } from '../i18n/translate';
import { getHotelNow, HotelNow } from '../utils/hotelClock';
import { computeTimedEvents, TimedEventsResult } from '../utils/timedEvents';
import { computeNoShows } from '../utils/noShow';

const SHOWN_REMINDERS_KEY = 'hms_shown_departure_reminders';

interface HotelClockContextType {
  hotelNow: HotelNow;
  timedEvents: TimedEventsResult;
  desktopNotificationsEnabled: boolean;
  requestDesktopNotifications: () => Promise<void>;
}

const HotelClockContext = createContext<HotelClockContextType | undefined>(undefined);

export const HotelClockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hotelConfig, allReservations, allTransactions, autoCheckOutGuest, autoMarkNoShow, notify } = useHMS();
  const { lang } = useT();

  const [hotelNow, setHotelNow] = useState<HotelNow>(() => getHotelNow(hotelConfig.timeZone));
  const [timedEvents, setTimedEvents] = useState<TimedEventsResult>({
    reminders: [],
    overdue: [],
    autoCheckOuts: []
  });

  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState<boolean>(() => {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  });

  const requestDesktopNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const perm = await Notification.requestPermission();
      setDesktopNotificationsEnabled(perm === 'granted');
    } catch {
      // Ignore if user dismisses
    }
  };

  // Helper to load shown reminder keys
  const getShownReminderKeys = (): Set<string> => {
    try {
      const raw = localStorage.getItem(SHOWN_REMINDERS_KEY);
      if (raw) {
        return new Set(JSON.parse(raw));
      }
    } catch {
      // fallback to empty
    }
    return new Set<string>();
  };

  const markReminderKeysShown = (keys: string[]) => {
    try {
      const set = getShownReminderKeys();
      for (const k of keys) {
        set.add(k);
      }
      localStorage.setItem(SHOWN_REMINDERS_KEY, JSON.stringify(Array.from(set)));
    } catch {
      // fallback
    }
  };

  // 15-second clock tick + visibility change handler
  useEffect(() => {
    const tickClock = () => {
      setHotelNow(getHotelNow(hotelConfig.timeZone));
    };

    tickClock();
    const interval = setInterval(tickClock, 15000);

    const handleVisibility = () => {
      if (!document.hidden) {
        tickClock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [hotelConfig.timeZone]);

  // Timed events evaluation (single timer in the whole app, 30s + load + visibility catchup)
  const evalTimedEvents = useCallback(() => {
    const now = getHotelNow(hotelConfig.timeZone);
    const events = computeTimedEvents({
      now,
      reservations: allReservations,
      transactions: allTransactions,
      hotelConfig
    });

    setTimedEvents(events);

    // Automatic check-outs
    if (events.autoCheckOuts.length > 0) {
      for (const target of events.autoCheckOuts) {
        autoCheckOutGuest(target.reservationId);
      }
    }

    // Automatic no-shows evaluation
    const noShowTargets = computeNoShows({
      now,
      reservations: allReservations,
      hotelConfig
    });

    if (noShowTargets.length > 0) {
      for (const target of noShowTargets) {
        autoMarkNoShow(target.reservationId);
      }
    }

    // Reminders toast & desktop notifications
    if (events.reminders.length > 0) {
      const shownSet = getShownReminderKeys();
      const newlyShown: string[] = [];

      for (const rem of events.reminders) {
        if (!shownSet.has(rem.key)) {
          const res = allReservations.find((r) => r.id === rem.reservationId);
          if (res) {
            const checkOutTime = (res as any).checkOutTime || hotelConfig.checkOutTime || '12:00';
            const roomNum = res.roomNumber;
            const guestName = res.guestName;
            const minutesLeft = rem.minutesLeft;

            // Toast notification
            notify(
              'msg.checkoutReminderToast',
              { room: roomNum, guest: guestName, time: checkOutTime, minutes: minutesLeft },
              'info'
            );

            // Desktop notification
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                const title = translate(lang, 'msg.checkoutReminderDesktopTitle', { room: roomNum });
                const body = translate(lang, 'msg.checkoutReminderToast', {
                  room: roomNum,
                  guest: guestName,
                  time: checkOutTime,
                  minutes: minutesLeft
                });
                new Notification(title, { body });
              } catch {
                // Ignore desktop notification failure
              }
            }

            newlyShown.push(rem.key);
          }
        }
      }

      if (newlyShown.length > 0) {
        markReminderKeysShown(newlyShown);
      }
    }
  }, [hotelConfig, allReservations, allTransactions, autoCheckOutGuest, autoMarkNoShow, notify, lang]);

  useEffect(() => {
    evalTimedEvents();
    const interval = setInterval(evalTimedEvents, 30000);

    const handleVisibility = () => {
      if (!document.hidden) {
        evalTimedEvents();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [evalTimedEvents]);

  return (
    <HotelClockContext.Provider
      value={{
        hotelNow,
        timedEvents,
        desktopNotificationsEnabled,
        requestDesktopNotifications
      }}
    >
      {children}
    </HotelClockContext.Provider>
  );
};

export function useHotelNow(): HotelNow {
  const ctx = useContext(HotelClockContext);
  if (!ctx) {
    throw new Error('useHotelNow must be used within a HotelClockProvider');
  }
  return ctx.hotelNow;
}

export function useTimedEvents() {
  const ctx = useContext(HotelClockContext);
  if (!ctx) {
    throw new Error('useTimedEvents must be used within a HotelClockProvider');
  }
  return {
    ...ctx.timedEvents,
    desktopNotificationsEnabled: ctx.desktopNotificationsEnabled,
    requestDesktopNotifications: ctx.requestDesktopNotifications
  };
}
