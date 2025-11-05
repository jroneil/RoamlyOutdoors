export class GroupMembershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GroupMembershipError';
  }
}

interface OrganizerMutationPayload {
  groupId: string;
  ownerId: string;
  memberId: string;
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.error ?? 'Unable to update organizer status.';
    throw new GroupMembershipError(message);
  }

  return response.json();
};

export const promoteGroupOrganizer = async ({
  groupId,
  ownerId,
  memberId
}: OrganizerMutationPayload) => {
  const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}/organizers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ownerId, memberId })
  });

  return handleResponse(response);
};

export const demoteGroupOrganizer = async ({
  groupId,
  ownerId,
  memberId
}: OrganizerMutationPayload) => {
  const response = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/organizers/${encodeURIComponent(memberId)}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ownerId })
    }
  );

  return handleResponse(response);
};
