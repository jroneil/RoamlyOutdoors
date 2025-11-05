import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { UserRole } from '../../types/user';
import {
  canUseDeveloperMode,
  disableDeveloperMode,
  enableDeveloperMode,
  getDeveloperModeRole,
  isDeveloperModeEnabled,
  setDeveloperModeRole,
  subscribeToDeveloperModeChanges
} from '../../utils/developerMode';

const roles: UserRole[] = ['member', 'organizer', 'admin'];

const DeveloperModePanel = () => {
  const [isEnabled, setIsEnabled] = useState(() =>
    canUseDeveloperMode() ? isDeveloperModeEnabled() : false
  );
  const [role, setRole] = useState<UserRole>(() =>
    canUseDeveloperMode() ? getDeveloperModeRole() : 'member'
  );

  useEffect(() => {
    if (!canUseDeveloperMode()) {
      return;
    }

    const unsubscribe = subscribeToDeveloperModeChanges(() => {
      setIsEnabled(isDeveloperModeEnabled());
      setRole(getDeveloperModeRole());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const description = useMemo(() => {
    if (!isEnabled) {
      return 'Enable developer mode to preview gated routes without authenticating.';
    }

    if (role === 'admin') {
      return 'Admin privileges unlocked. Explore dashboards and billing tools freely.';
    }

    if (role === 'organizer') {
      return 'Organizer mode grants access to management tools and event workflows.';
    }

    return 'Member role lets you preview attendee flows while developer mode is active.';
  }, [isEnabled, role]);

  if (!canUseDeveloperMode()) {
    return null;
  }

  const handleToggle = () => {
    if (isEnabled) {
      disableDeveloperMode();
    } else {
      enableDeveloperMode(role);
    }
  };

  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextRole = event.target.value as UserRole;
    setRole(nextRole);
    setDeveloperModeRole(nextRole);

    if (!isEnabled) {
      return;
    }

    enableDeveloperMode(nextRole);
  };

  return (
    <aside className="developer-mode-panel" role="status" aria-live="polite">
      <div className="developer-mode-panel__row">
        <span className="developer-mode-panel__label">Developer mode</span>
        <button
          type="button"
          className={`developer-mode-panel__toggle ${isEnabled ? 'is-active' : ''}`}
          onClick={handleToggle}
        >
          {isEnabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      <label className="developer-mode-panel__row">
        <span className="developer-mode-panel__label">Role preview</span>
        <select value={role} onChange={handleRoleChange} disabled={!isEnabled}>
          {roles.map((option) => (
            <option key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <p className="developer-mode-panel__description">{description}</p>
    </aside>
  );
};

export default DeveloperModePanel;
