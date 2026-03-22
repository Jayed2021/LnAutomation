/**
 * Global app-level settings persisted in localStorage.
 * Import `useAppSettings` in any component to read/write.
 */
import { useState, useEffect } from 'react';

export interface AppSettings {
  // ── Store Identity ─────────────────────────────────────────────────────────
  storeName: string;
  storeTagline: string;
  /** Base64 data-URL of uploaded logo, or empty string */
  storeLogo: string;
  storeAddressLine1: string;
  storeAddressLine2: string;
  storeCity: string;
  storePostalCode: string;
  storeCountry: string;
  storePhone: string;
  storeSecondaryPhone: string;
  storeEmail: string;
  storeWebsite: string;
  storeTaxId: string;        // e.g. TIN / BIN / VAT Reg No.
  storeFooterNote: string;   // Printed at the bottom of invoices

  // ── Business Type ──────────────────────────────────────────────────────────
  storeType: string;

  // ── Feature Flags ──────────────────────────────────────────────────────────
  enablePrescriptionLens: boolean;
}

const STORAGE_KEY = 'erp_app_settings';

const defaults: AppSettings = {
  storeName: 'Lunettes',
  storeTagline: 'Your Vision, Our Passion',
  storeLogo: '',
  storeAddressLine1: 'Road #10C, House #5',
  storeAddressLine2: 'Nikunja-1',
  storeCity: 'Dhaka',
  storePostalCode: '1229',
  storeCountry: 'Bangladesh',
  storePhone: '09613900800',
  storeSecondaryPhone: '',
  storeEmail: 'support@lunettes.com.bd',
  storeWebsite: 'www.lunettes.com.bd',
  storeTaxId: '',
  storeFooterNote: 'Thank you for your purchase! For any queries, please contact our support team.',
  storeType: 'eyewear',
  enablePrescriptionLens: true,
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return { ...defaults };
}

function save(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// Module-level cache so all hooks stay in sync via a simple event
let _settings: AppSettings = load();
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach(fn => fn());
}

export function getAppSettings(): AppSettings {
  return _settings;
}

export function setAppSettings(patch: Partial<AppSettings>) {
  _settings = { ..._settings, ...patch };
  save(_settings);
  notify();
}

/** React hook — re-renders whenever settings change */
export function useAppSettings(): [AppSettings, (patch: Partial<AppSettings>) => void] {
  const [state, setState] = useState<AppSettings>(_settings);

  useEffect(() => {
    const update = () => setState({ ..._settings });
    _listeners.add(update);
    return () => { _listeners.delete(update); };
  }, []);

  return [state, setAppSettings];
}