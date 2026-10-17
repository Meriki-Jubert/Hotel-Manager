/// <reference types="vite/client" />
import { HotelConfig } from '../types/hms';

export const appConfig: HotelConfig = {
  name: (import.meta.env as any).VITE_HOTEL_NAME || 'Grand Mountain Resort & Suites',
  tagline: 'Luxury Boutique & Executive Suites',
  city: (import.meta.env as any).VITE_HOTEL_LOCATION ? (import.meta.env as any).VITE_HOTEL_LOCATION.split(',')[0] || 'Molyko, Buea' : 'Molyko, Buea',
  address: (import.meta.env as any).VITE_HOTEL_LOCATION || 'Molyko, Buea, South West Region',
  phone: (import.meta.env as any).VITE_HOTEL_PHONE || '+237 670 123 456',
  email: (import.meta.env as any).VITE_HOTEL_EMAIL || 'reception@grandmountainresort.com',
  taxId: 'M03241293842L',
  registryNumber: 'RC/BUE/2026/B/109',
  defaultCurrency: ((import.meta.env as any).VITE_DEFAULT_CURRENCY === 'USD' ? 'USD' : 'FCFA') as 'FCFA' | 'USD',
  usdExchangeRate: 600,
  checkInTime: '14:00',
  checkOutTime: '12:00'
};

export const isDemoMode = (import.meta.env as any).VITE_DEMO_MODE === 'true';
