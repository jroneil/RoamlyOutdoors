import type { AppUser, UserRole } from '../types/user';
import { createDefaultCreditLedger, createDefaultCreditUsage } from '../types/user';

const DEV_MODE_FLAG_KEY = 'roamly:developer-mode';
const DEV_MODE_ROLE_KEY = 'roamly:developer-mode-role';
const DEV_MODE_EVENT = 'roamly:developer-mode-change';

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const canUseDeveloperMode = () => import.meta.env.DEV;

export const isDeveloperModeEnabled = () => {
  if (!canUseDeveloperMode() || !isBrowser()) {
    return false;
  }

  return window.localStorage.getItem(DEV_MODE_FLAG_KEY) === 'true';
};

const dispatchChangeEvent = () => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(DEV_MODE_EVENT));
};

export const getDeveloperModeRole = (): UserRole => {
  if (!isBrowser()) {
    return 'member';
  }

  const stored = window.localStorage.getItem(DEV_MODE_ROLE_KEY);

  if (stored === 'member' || stored === 'organizer' || stored === 'admin') {
    return stored;
  }

  return 'member';
};

export const enableDeveloperMode = (role: UserRole = 'organizer') => {
  if (!canUseDeveloperMode() || !isBrowser()) {
    return;
  }

  window.localStorage.setItem(DEV_MODE_FLAG_KEY, 'true');
  window.localStorage.setItem(DEV_MODE_ROLE_KEY, role);
  dispatchChangeEvent();
};

export const disableDeveloperMode = () => {
  if (!canUseDeveloperMode() || !isBrowser()) {
    return;
  }

  window.localStorage.removeItem(DEV_MODE_FLAG_KEY);
  window.localStorage.removeItem(DEV_MODE_ROLE_KEY);
  dispatchChangeEvent();
};

export const setDeveloperModeRole = (role: UserRole) => {
  if (!canUseDeveloperMode() || !isBrowser()) {
    return;
  }

  window.localStorage.setItem(DEV_MODE_ROLE_KEY, role);
  dispatchChangeEvent();
};

export const subscribeToDeveloperModeChanges = (listener: () => void) => {
  if (!canUseDeveloperMode() || !isBrowser()) {
    return () => {};
  }

  const handler = () => {
    listener();
  };

  window.addEventListener(DEV_MODE_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(DEV_MODE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
};

export const getDeveloperProfile = (): AppUser => {
  const role = getDeveloperModeRole();
  const now = new Date();
  const renewalDate = new Date(now);
  renewalDate.setMonth(renewalDate.getMonth() + 1);

  return {
    uid: 'dev-user',
    displayName: 'Developer Preview',
    contactEmail: 'developer@roamly.test',
    role,
    billing: {
      subscriptionStatus: 'active',
      managedBy: 'manual',
      packageName: 'Developer Sandbox',
      planId: 'dev-sandbox-plan',
      renewalDate: renewalDate.toISOString(),
      credits: createDefaultCreditLedger(),
      usage: createDefaultCreditUsage()
    },
    organizationName: 'Roamly Dev Collective',
    createdAt: new Date('2023-01-01T00:00:00.000Z').toISOString(),
    updatedAt: now.toISOString()
  };
};
