import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock import.meta.env for tests
(globalThis as any).import = { meta: { env: { VITE_API_URL: '/api' } } };

// Provide a minimal react-i18next mock so t(key) resolves translation keys
// without requiring a real i18next instance in unit/component tests.
vi.mock('react-i18next', () => {
  // Flatten a nested translations object into a map of "ns.key" → value
  const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, string> =>
    Object.entries(obj).reduce((acc, [k, v]) => {
      const full = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null) Object.assign(acc, flatten(v as Record<string, unknown>, full));
      else acc[full] = String(v);
      return acc;
    }, {} as Record<string, string>);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const en = require('../i18n/locales/en.json');
  const translations = flatten(en);

  const t = (key: string, opts?: Record<string, unknown>) =>
    translations[key] ?? (opts?.defaultValue as string | undefined) ?? key;
  const useTranslation = () => ({ t, i18n: { language: 'en', changeLanguage: vi.fn() } });
  const Trans = ({ i18nKey }: { i18nKey: string }) => t(i18nKey);
  return { useTranslation, Trans, initReactI18next: { type: '3rdParty', init: vi.fn() } };
});

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock navigator.onLine
let _onLine = true;
Object.defineProperty(navigator, 'onLine', {
  get: () => _onLine,
  configurable: true,
});
(globalThis as any).__setOnLine = (v: boolean) => { _onLine = v; };

// Reset state between tests
beforeEach(() => {
  localStorageMock.clear();
  _onLine = true;
});
