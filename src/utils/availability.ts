import { Room, Reservation } from '../types/hms';
import { listNights } from './dateUtils';

export interface AvailabilityParams {
  branchId: string;
  roomTypeId: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  rooms: Room[];
  reservations: Reservation[];
  excludeReservationId?: string;
  requestedRoomId?: string;
}

/**
 * Shared helper to check if a reservation covers a specific night.
 */
export function reservationCoversNight(
  res: Reservation,
  night: string,
  branchId: string,
  roomTypeId: string,
  rooms: Room[],
  excludeReservationId?: string
): boolean {
  if (excludeReservationId && res.id === excludeReservationId) return false;
  if (res.bookingStatus !== 'reserved' && res.bookingStatus !== 'checked_in') return false;
  if (res.branchId && res.branchId !== branchId) return false;

  let matchesRoomType = false;
  if (res.roomTypeId === roomTypeId) {
    matchesRoomType = true;
  } else if (res.roomId) {
    const assignedRoom = rooms.find((r) => r.id === res.roomId);
    if (assignedRoom && assignedRoom.roomTypeId === roomTypeId && assignedRoom.branchId === branchId) {
      matchesRoomType = true;
    }
  }
  if (!matchesRoomType) return false;

  // Check-out day is not an occupied night: res.checkInDate <= night && res.checkOutDate > night
  return res.checkInDate <= night && res.checkOutDate > night;
}

/**
 * Checks if a date range is bookable for a given branch and room type.
 */
export function checkAvailability(params: AvailabilityParams): { available: boolean; reason?: string } {
  const {
    branchId,
    roomTypeId,
    checkInDate,
    checkOutDate,
    rooms,
    reservations,
    excludeReservationId,
    requestedRoomId
  } = params;

  if (!checkInDate || !checkOutDate || checkInDate >= checkOutDate) {
    return { available: false, reason: 'Invalid date range' };
  }

  // Get active rooms of this type in the branch using isActive !== false
  const activeRoomsOfType = rooms.filter(
    (r) =>
      r.branchId === branchId &&
      r.roomTypeId === roomTypeId &&
      r.isActive !== false
  );
  const totalActiveRooms = activeRoomsOfType.length;
  if (totalActiveRooms === 0) {
    return { available: false, reason: 'No active rooms of this type in this branch' };
  }

  // Generate all nights in the range [checkInDate, checkOutDate) using listNights
  const nights = listNights(checkInDate, checkOutDate);

  // Check each night
  for (const night of nights) {
    const overlappingReservations = reservations.filter((res) =>
      reservationCoversNight(res, night, branchId, roomTypeId, rooms, excludeReservationId)
    );

    if (overlappingReservations.length >= totalActiveRooms) {
      return {
        available: false,
        reason: `All rooms of this type are occupied on night ${night}`
      };
    }
  }

  // If a specific room is requested, check if it has any overlapping reservation
  if (requestedRoomId) {
    const specificRoomOverlaps = reservations.filter((res) => {
      if (excludeReservationId && res.id === excludeReservationId) return false;
      if (res.bookingStatus !== 'reserved' && res.bookingStatus !== 'checked_in') return false;
      if (res.roomId !== requestedRoomId) return false;
      // Overlap condition: res.checkInDate < checkOutDate && res.checkOutDate > checkInDate
      return res.checkInDate < checkOutDate && res.checkOutDate > checkInDate;
    });

    if (specificRoomOverlaps.length > 0) {
      return {
        available: false,
        reason: 'Selected room is already reserved or occupied for part of this date range'
      };
    }
  }

  return { available: true };
}

/**
 * Calculates how many rooms of a given type are available across the entire date range.
 */
export function getAvailableRoomCount(
  branchId: string,
  roomTypeId: string,
  checkInDate: string,
  checkOutDate: string,
  rooms: Room[],
  reservations: Reservation[],
  excludeReservationId?: string
): number {
  const activeRoomsOfType = rooms.filter(
    (r) =>
      r.branchId === branchId &&
      r.roomTypeId === roomTypeId &&
      r.isActive !== false
  );
  if (activeRoomsOfType.length === 0 || !checkInDate || !checkOutDate || checkInDate >= checkOutDate) {
    return 0;
  }

  let minAvailable = activeRoomsOfType.length;
  const nights = listNights(checkInDate, checkOutDate);

  for (const night of nights) {
    const overlappingCount = reservations.filter((res) =>
      reservationCoversNight(res, night, branchId, roomTypeId, rooms, excludeReservationId)
    ).length;

    const availableOnNight = Math.max(0, activeRoomsOfType.length - overlappingCount);
    if (availableOnNight < minAvailable) {
      minAvailable = availableOnNight;
    }
  }

  return minAvailable;
}
