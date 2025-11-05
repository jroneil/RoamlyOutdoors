import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Group } from '../types/group';
import {
  OwnershipTransferError,
  transferGroupOwnership
} from '../services/groups';

interface GroupOwnershipTransferFormProps {
  groups: Group[];
}

const GroupOwnershipTransferForm = ({ groups }: GroupOwnershipTransferFormProps) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [targetOwnerId, setTargetOwnerId] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedGroups = useMemo(() => groups.slice().sort((a, b) => a.title.localeCompare(b.title)), [groups]);

  useEffect(() => {
    if (sortedGroups.length === 0) {
      return;
    }

    const hasSelection = sortedGroups.some((group) => group.id === selectedGroupId);
    if (!selectedGroupId || !hasSelection) {
      setSelectedGroupId(sortedGroups[0].id);
    }
  }, [selectedGroupId, sortedGroups]);

  if (groups.length === 0) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedGroupId || !targetOwnerId || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage(null);
      setErrorMessage(null);
      await transferGroupOwnership({ groupId: selectedGroupId, newOwnerId: targetOwnerId.trim() });
      setStatusMessage('Ownership transfer completed successfully.');
      setTargetOwnerId('');
    } catch (error) {
      console.error(error);
      if (error instanceof OwnershipTransferError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to transfer ownership. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card" style={{ display: 'grid', gap: '1rem' }}>
      <header>
        <h2 className="section-title">Transfer group ownership</h2>
        <p className="section-subtitle">
          Move a group to another organizer. The new owner must have capacity and an active subscription.
        </p>
      </header>
      <form className="grid" style={{ gap: '0.75rem' }} onSubmit={handleSubmit}>
        <label className="field">
          <span>Group</span>
          <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>
            {sortedGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>New owner user ID</span>
          <input
            type="text"
            value={targetOwnerId}
            onChange={(event) => setTargetOwnerId(event.target.value)}
            placeholder="Enter the Firebase Auth UID of the new owner"
            required
          />
        </label>
        <button className="primary" type="submit" disabled={!selectedGroupId || !targetOwnerId || isSubmitting}>
          {isSubmitting ? 'Transferring…' : 'Transfer ownership'}
        </button>
        {statusMessage ? <p className="success-text">{statusMessage}</p> : null}
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </form>
    </section>
  );
};

export default GroupOwnershipTransferForm;
