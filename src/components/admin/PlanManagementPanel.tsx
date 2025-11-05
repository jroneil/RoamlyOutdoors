import { type FormEvent, useEffect, useMemo, useState } from 'react';
import type { PlanEntitlements } from '../../types/user';
import useAuth from '../../hooks/useAuth';
import { updateUserBillingProfile } from '../../services/users';

interface FormState {
  packageName: string;
  renewalDate: string;
  entitlements: PlanEntitlements;
  planId: string;
}

const defaultEntitlements: PlanEntitlements = {
  maxEventsPerMonth: 0,
  teamSeats: 0,
  supportLevel: 'community',
  groupQuota: 0
};

const PlanManagementPanel = () => {
  const { profile, refreshProfile } = useAuth();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const initialState = useMemo<FormState>(() => {
    const billing = profile?.billing;

    return {
      packageName: billing?.packageName ?? '',
      renewalDate: billing?.renewalDate ? billing.renewalDate.substring(0, 10) : '',
      planId: billing?.planId ?? '',
      entitlements: billing?.entitlements
        ? {
            ...defaultEntitlements,
            ...billing.entitlements,
            groupQuota: billing.entitlements.groupQuota ?? 0
          }
        : { ...defaultEntitlements }
    };
  }, [profile?.billing]);

  const [formState, setFormState] = useState<FormState>(initialState);

  useEffect(() => {
    setFormState(initialState);
  }, [initialState]);

  if (!profile) {
    return null;
  }

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleEntitlementChange = <K extends keyof PlanEntitlements>(key: K, value: PlanEntitlements[K]) => {
    setFormState((prev) => ({ ...prev, entitlements: { ...prev.entitlements, [key]: value } }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setStatusMessage(null);

      await updateUserBillingProfile(profile.uid, {
        packageName: formState.packageName || undefined,
        planId: formState.planId || null,
        renewalDate: formState.renewalDate ? new Date(formState.renewalDate).toISOString() : null,
        entitlements: formState.entitlements,
        managedBy: 'manual'
      });

      await refreshProfile();
      setStatusMessage('Plan entitlements updated successfully.');
    } catch (err) {
      console.error(err);
      setError('Unable to update plan entitlements. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="card dashboard-card">
      <h2>Plan entitlements</h2>
      <p className="dashboard-card__description">
        Override subscription metadata for escalations, gifting extensions, or manual adjustments.
      </p>
      <form className="plan-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="plan-id">Plan ID</label>
          <input
            id="plan-id"
            value={formState.planId}
            onChange={(event) => handleChange('planId', event.target.value)}
            placeholder="trailhead"
          />
        </div>
        <div className="form-row">
          <label htmlFor="package-name">Package name</label>
          <input
            id="package-name"
            value={formState.packageName}
            onChange={(event) => handleChange('packageName', event.target.value)}
            placeholder="Trailhead"
          />
        </div>
        <div className="form-row">
          <label htmlFor="renewal-date">Renewal date</label>
          <input
            id="renewal-date"
            type="date"
            value={formState.renewalDate}
            onChange={(event) => handleChange('renewalDate', event.target.value)}
          />
        </div>
        <fieldset className="entitlements-fieldset">
          <legend>Entitlements</legend>
          <div className="form-row">
            <label htmlFor="max-events">Max events / month</label>
            <input
              id="max-events"
              type="number"
              min={0}
              value={formState.entitlements.maxEventsPerMonth}
              onChange={(event) => handleEntitlementChange('maxEventsPerMonth', Number(event.target.value))}
            />
          </div>
          <div className="form-row">
            <label htmlFor="team-seats">Team seats</label>
            <input
              id="team-seats"
              type="number"
              min={0}
              value={formState.entitlements.teamSeats}
              onChange={(event) => handleEntitlementChange('teamSeats', Number(event.target.value))}
            />
          </div>
          <div className="form-row">
            <label htmlFor="group-quota">Group quota</label>
            <input
              id="group-quota"
              type="number"
              min={0}
              value={formState.entitlements.groupQuota}
              onChange={(event) => handleEntitlementChange('groupQuota', Number(event.target.value))}
            />
          </div>
          <div className="form-row">
            <label htmlFor="support-level">Support level</label>
            <select
              id="support-level"
              value={formState.entitlements.supportLevel}
              onChange={(event) => handleEntitlementChange('supportLevel', event.target.value as PlanEntitlements['supportLevel'])}
            >
              <option value="community">Community</option>
              <option value="priority">Priority</option>
              <option value="concierge">Concierge</option>
            </select>
          </div>
        </fieldset>
        {statusMessage ? <p className="success-text">{statusMessage}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        <div className="form-actions">
          <button type="submit" className="primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default PlanManagementPanel;
