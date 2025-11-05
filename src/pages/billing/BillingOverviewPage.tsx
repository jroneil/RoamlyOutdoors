import { useEffect, useMemo, useState } from 'react';
import BillingSummary from '../../components/profile/BillingSummary';
import LoadingState from '../../components/common/LoadingState';
import useAuth from '../../hooks/useAuth';
import BillingPlanCard from './components/BillingPlanCard';
import {
  createBillingPortalSession,
  createCheckoutSession,
  fetchBillingPlans
} from '../../services/billing';
import type { BillingPlan } from '../../types/billing';

const BillingOverviewPage = () => {
  const { isLoading, profile, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [isPlansLoading, setIsPlansLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        setIsPlansLoading(true);
        const fetchedPlans = await fetchBillingPlans();
        setPlans(fetchedPlans);
      } catch (err) {
        console.error(err);
        setError('Unable to load billing plans. Please try again later.');
      } finally {
        setIsPlansLoading(false);
      }
    };

    void loadPlans();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'updated') {
      setStatusMessage('Thanks! Your billing information has been updated.');
      void refreshProfile();
    }
  }, [refreshProfile]);

  const handleCheckout = async (planId: string) => {
    if (!profile) {
      return;
    }

    try {
      setProcessingPlanId(planId);
      setError(null);
      const successUrl = `${window.location.origin}/billing?billing=updated`;
      const cancelUrl = `${window.location.origin}/billing`;
      const url = await createCheckoutSession({
        planId,
        customerId: profile.billing.stripeCustomerId ?? undefined,
        userId: profile.uid,
        email: profile.contactEmail,
        successUrl,
        cancelUrl
      });

      window.location.href = url;
    } catch (err) {
      console.error(err);
      setError('We were unable to start checkout. Please try again or contact support.');
    } finally {
      setProcessingPlanId(null);
    }
  };

  const handleOpenPortal = async () => {
    if (!profile?.billing.stripeCustomerId) {
      setPortalError('You need an active subscription before accessing the portal.');
      return;
    }

    try {
      setIsPortalLoading(true);
      setPortalError(null);
      const returnUrl = `${window.location.origin}/billing?billing=updated`;
      const url = await createBillingPortalSession({
        customerId: profile.billing.stripeCustomerId,
        returnUrl
      });
      window.location.href = url;
    } catch (err) {
      console.error(err);
      setPortalError('Unable to launch the billing portal. Please try again.');
    } finally {
      setIsPortalLoading(false);
    }
  };

  const currentPlanId = useMemo(() => profile?.billing.planId ?? null, [profile?.billing.planId]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!profile) {
    return (
      <section className="card billing-card">
        <h1>Billing requires an account</h1>
        <p>Please sign in to manage your subscriptions and payment preferences.</p>
      </section>
    );
  }

  return (
    <div className="billing-page">
      <header className="billing-page__header">
        <h1>Billing &amp; subscriptions</h1>
        <p className="billing-page__tagline">
          Choose the subscription tier that best fits your organization and manage renewals with Stripe.
        </p>
        {statusMessage ? <div className="billing-banner billing-banner--success">{statusMessage}</div> : null}
        {error ? <div className="billing-banner billing-banner--error">{error}</div> : null}
      </header>

      <BillingSummary
        billing={profile.billing}
        userId={profile.uid}
        contactEmail={profile.contactEmail}
        onManageSubscription={profile.billing.stripeCustomerId ? handleOpenPortal : undefined}
        isPortalLoading={isPortalLoading}
        portalError={portalError}
      />

      <section className="plan-grid">
        <h2>Available plans</h2>
        {isPlansLoading ? (
          <LoadingState />
        ) : (
          <div className="plan-grid__items">
            {plans.map((plan) => (
              <BillingPlanCard
                key={plan.id}
                plan={plan}
                isCurrent={plan.id === currentPlanId}
                subscriptionStatus={profile.billing.subscriptionStatus}
                isProcessing={processingPlanId === plan.id}
                onSelect={handleCheckout}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default BillingOverviewPage;
