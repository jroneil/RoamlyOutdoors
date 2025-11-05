import { getFirestore } from '../firebaseAdmin.js';

class GroupMembershipError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GroupMembershipError';
  }
}

class FirestoreUnavailableError extends GroupMembershipError {
  constructor(message = 'Group membership service is unavailable.') {
    super(message);
    this.name = 'FirestoreUnavailableError';
  }
}

class GroupNotFoundError extends GroupMembershipError {
  constructor(message = 'Group not found.') {
    super(message);
    this.name = 'GroupNotFoundError';
  }
}

class UnauthorizedGroupActionError extends GroupMembershipError {
  constructor(message = 'Only the group owner may change organizer roles.') {
    super(message);
    this.name = 'UnauthorizedGroupActionError';
  }
}

class MemberNotInGroupError extends GroupMembershipError {
  constructor(message = 'The specified member does not belong to this group.') {
    super(message);
    this.name = 'MemberNotInGroupError';
  }
}

class MemberNotOrganizerError extends GroupMembershipError {
  constructor(message = 'The member is not currently an organizer.') {
    super(message);
    this.name = 'MemberNotOrganizerError';
  }
}

class MemberProfileMissingError extends GroupMembershipError {
  constructor(message = 'Member profile not found.') {
    super(message);
    this.name = 'MemberProfileMissingError';
  }
}

const normalizeId = (value) => (typeof value === 'string' ? value.trim() : '');

const toUniqueStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const result = [];
  for (const entry of value) {
    const trimmed = normalizeId(entry);
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
};

const requireIdentifier = (value, label) => {
  const normalized = normalizeId(value);
  if (!normalized) {
    throw new GroupMembershipError(`${label} is required.`);
  }
  return normalized;
};

const ensureFirestore = (provided) => {
  const firestore = provided ?? getFirestore();
  if (!firestore) {
    throw new FirestoreUnavailableError();
  }
  return firestore;
};

const fetchGroupRecord = async (firestore, groupId) => {
  const groupRef = firestore.collection('groups').doc(groupId);
  const snapshot = await groupRef.get();

  if (!snapshot.exists) {
    throw new GroupNotFoundError();
  }

  return { ref: groupRef, data: snapshot.data() ?? {} };
};

const fetchUserRecord = async (firestore, userId) => {
  const userRef = firestore.collection('users').doc(userId);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    throw new MemberProfileMissingError();
  }

  return { ref: userRef, data: snapshot.data() ?? {} };
};

const assertOwner = (groupOwnerId, requesterId) => {
  if (!groupOwnerId || groupOwnerId !== requesterId) {
    throw new UnauthorizedGroupActionError();
  }
};

const updateUserOrganizerState = async (firestore, memberId, groupId, action) => {
  const { ref, data } = await fetchUserRecord(firestore, memberId);
  const currentGroups = toUniqueStringArray(data.organizerGroupIds);
  let nextGroups;

  if (action === 'add') {
    if (!currentGroups.includes(groupId)) {
      currentGroups.push(groupId);
    }
    nextGroups = currentGroups;
  } else {
    nextGroups = currentGroups.filter((id) => id !== groupId);
  }

  const payload = {
    organizerGroupIds: nextGroups,
    updatedAt: new Date().toISOString()
  };

  if (data.role !== 'admin') {
    if (action === 'add') {
      payload.role = 'organizer';
    } else if (nextGroups.length === 0) {
      payload.role = 'member';
    }
  }

  await ref.set(payload, { merge: true });
};

export const promoteMemberToOrganizer = async (
  { groupId, ownerId, memberId },
  { firestore: firestoreOverride } = {}
) => {
  const firestore = ensureFirestore(firestoreOverride);
  const normalizedGroupId = requireIdentifier(groupId, 'groupId');
  const normalizedOwnerId = requireIdentifier(ownerId, 'ownerId');
  const normalizedMemberId = requireIdentifier(memberId, 'memberId');

  const { ref: groupRef, data } = await fetchGroupRecord(firestore, normalizedGroupId);
  const groupOwnerId = normalizeId(data.ownerId);
  assertOwner(groupOwnerId, normalizedOwnerId);

  const members = toUniqueStringArray(data.members);
  if (!members.includes(normalizedMemberId)) {
    throw new MemberNotInGroupError();
  }

  const organizers = new Set(toUniqueStringArray(data.organizers));
  if (!organizers.has(normalizedMemberId)) {
    organizers.add(normalizedMemberId);
    await groupRef.update({ organizers: Array.from(organizers) });
  }

  await updateUserOrganizerState(firestore, normalizedMemberId, normalizedGroupId, 'add');

  return { organizers: Array.from(organizers) };
};

export const demoteMemberFromOrganizer = async (
  { groupId, ownerId, memberId },
  { firestore: firestoreOverride } = {}
) => {
  const firestore = ensureFirestore(firestoreOverride);
  const normalizedGroupId = requireIdentifier(groupId, 'groupId');
  const normalizedOwnerId = requireIdentifier(ownerId, 'ownerId');
  const normalizedMemberId = requireIdentifier(memberId, 'memberId');

  const { ref: groupRef, data } = await fetchGroupRecord(firestore, normalizedGroupId);
  const groupOwnerId = normalizeId(data.ownerId);
  assertOwner(groupOwnerId, normalizedOwnerId);

  const members = toUniqueStringArray(data.members);
  if (!members.includes(normalizedMemberId)) {
    throw new MemberNotInGroupError();
  }

  const organizers = new Set(toUniqueStringArray(data.organizers));
  if (!organizers.has(normalizedMemberId)) {
    throw new MemberNotOrganizerError();
  }

  organizers.delete(normalizedMemberId);
  await groupRef.update({ organizers: Array.from(organizers) });

  await updateUserOrganizerState(firestore, normalizedMemberId, normalizedGroupId, 'remove');

  return { organizers: Array.from(organizers) };
};

export {
  GroupMembershipError,
  FirestoreUnavailableError,
  GroupNotFoundError,
  UnauthorizedGroupActionError,
  MemberNotInGroupError,
  MemberNotOrganizerError,
  MemberProfileMissingError
};

export default {
  promoteMemberToOrganizer,
  demoteMemberFromOrganizer
};
