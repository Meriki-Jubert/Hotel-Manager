import { Room, Reservation } from '../types/hms';

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
 * Checks if a date range is bookable for a given branch and room type.
 * - Checks each night in the range (Check-out day is not an occupied night).
 * - A night is bookable if the number of active reservations covering that night
 *   (status 'reserved' or 'checked_in', assigned to room or holding only room type)
 *   is LESS than the number of active rooms of that type in the branch.
 * - If requestedRoomId is provided, that specific room must additionally have no
 *   overlapping reservation of its own on those nights.
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

  // Get active rooms of this type in the branch
  const activeRoomsOfType = rooms.filter(
    (r) =>
      r.branchId === branchId &&
      r.roomTypeId === roomTypeId &&
      r.status !== 'deactivated'
  );

  const totalActiveRooms = activeRoomsOfType.length;
  if (totalActiveRooms === 0) {
    return { available: false, reason: 'No active rooms of this type in this branch' };
  }

  // Generate all nights in the range [checkInDate, checkOutDate)
  const nights: string[] = [];
  let curr = new Date(checkInDate);
  const end = new Date(checkOutDate);
  while (curr < end) {
    nights.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  // Check each night
  for (const night of nights) {
    // Count active reservations covering this night
    const overlappingReservations = reservations.filter((res) => {
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

      // Check-out day is not an occupied night: res.checkInDate <= night AND res.checkOutDate > night
      return res.checkInDate <= night && res.checkOutDate > night;
    });

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
 * Useful for showing "X rooms available".
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
      r.status !== 'deactivated'
  );

  if (activeRoomsOfType.length === 0 || !checkInDate || !checkOutDate || checkInDate >= checkOutDate) {
    return 0;
  }

  let minAvailable = activeRoomsOfType.length;

  let nights: string[] = [];
  let curr = new Date(checkInDate);
  const end = new Date(checkOutDate);
  while (curr < end) {
    nights.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  for (const night of nights) {
    const overlappingCount = reservations.filter((res) => {
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
      return res.checkInDate <= night && res.checkOutDate > night;
    }).length;

    const availableOnNight = Math.max(0, activeRoomsOfType.length - overlappingCount);
    if (availableOnNight < minAvailable) {
      minAvailable = availableOnNight;
    }
  }

  return minAvailable;
}
