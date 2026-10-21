/// <reference types="vite/client" />
import { HotelConfig } from '../types/hms';
import { DEFAULT_CANCELLATION_POLICY } from '../utils/cancellationPolicy';

export const appConfig: HotelConfig = {
  name: (import.meta.env as any).VITE_HOTEL_NAME || 'My Hotel',
  tagline: '',
  city: (import.meta.env as any).VITE_HOTEL_LOCATION ? (import.meta.env as any).VITE_HOTEL_LOCATION.split(',')[0]?.trim() || '' : '',
  address: (import.meta.env as any).VITE_HOTEL_LOCATION || '',
  phone: (import.meta.env as any).VITE_HOTEL_PHONE || '',
  email: (import.meta.env as any).VITE_HOTEL_EMAIL || '',
  taxId: '',
  registryNumber: '',
  defaultCurrency: ((import.meta.env as any).VITE_DEFAULT_CURRENCY === 'USD' ? 'USD' : 'FCFA') as 'FCFA' | 'USD',
  usdExchangeRate: 600,
  checkInTime: '14:00',
  checkOutTime: '12:00',
  cancellationPolicy: { ...DEFAULT_CANCELLATION_POLICY, tiers: [], noShow: { ...DEFAULT_CANCELLATION_POLICY.noShow } }
};

export const isDemoMode = (import.meta.env as any).VITE_DEMO_MODE === 'true';
