import { listNights } from './dateUtils';

export interface CalculateExtensionParams {
  nightlyRate: number;
  currentCheckOut: string;
  newCheckOut: string;
}

export interface ExtensionResult {
  addedNights: number;
  addedAmount: number;
}

export function calculateExtension({
  nightlyRate,
  currentCheckOut,
  newCheckOut
}: CalculateExtensionParams): ExtensionResult {
  if (!currentCheckOut || !newCheckOut || newCheckOut <= currentCheckOut) {
    return { addedNights: 0, addedAmount: 0 };
  }

  const nights = listNights(currentCheckOut, newCheckOut);
  const addedNights = nights.length;
  const addedAmount = Math.round(addedNights * nightlyRate);

  return { addedNights, addedAmount };
}

export interface CalculateShorteningParams {
  nightlyRate: number;
  currentCheckOut: string;
  newCheckOut: string;
}

export interface ShorteningResult {
  removedNights: number;
  creditAmount: number;
}

export function calculateShortening({
  nightlyRate,
  currentCheckOut,
  newCheckOut
}: CalculateShorteningParams): ShorteningResult {
  if (!currentCheckOut || !newCheckOut || newCheckOut >= currentCheckOut) {
    return { removedNights: 0, creditAmount: 0 };
  }

  const nights = listNights(newCheckOut, currentCheckOut);
  const removedNights = nights.length;
  const creditAmount = Math.round(removedNights * nightlyRate);

  return { removedNights, creditAmount };
}

export interface CalculateRoomMoveAdjustmentParams {
  remainingNights: number;
  oldRate: number;
  newRate: number;
  keepCurrentRate: boolean;
}

export interface RoomMoveAdjustmentResult {
  adjustmentAmount: number;
}

export function calculateRoomMoveAdjustment({
  remainingNights,
  oldRate,
  newRate,
  keepCurrentRate
}: CalculateRoomMoveAdjustmentParams): RoomMoveAdjustmentResult {
  if (keepCurrentRate || remainingNights <= 0) {
    return { adjustmentAmount: 0 };
  }

  const adjustmentAmount = Math.round((newRate - oldRate) * remainingNights);
  return { adjustmentAmount };
}
