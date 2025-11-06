import { AuthenticationError, getCurrentUserToken } from './authToken';

export class GroupMembershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GroupMembershipError';
  }
}

interface OrganizerMutationPayload {
  groupId: string;
  memberId: string;
}

const getAuthHeaders = async () => {
  try {
    const token = await getCurrentUserToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw new GroupMembershipError(error.message);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new GroupMembershipError('Authentication required to update organizer status.');
  }
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.error ?? 'Unable to update organizer status.';
    throw new GroupMembershipError(message);
  }

  return response.json();
};

export const promoteGroupOrganizer = async ({ groupId, memberId }: OrganizerMutationPayload) => {
  const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}/organizers`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ memberId })
  });

  return handleResponse(response);
};

export const demoteGroupOrganizer = async ({ groupId, memberId }: OrganizerMutationPayload) => {
  const response = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/organizers/${encodeURIComponent(memberId)}`,
    {
      method: 'DELETE',
      headers: await getAuthHeaders()
    }
  );

  return handleResponse(response);
};
