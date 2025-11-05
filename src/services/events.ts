import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export const rsvpToEvent = async (eventId: string, attendeeName: string) => {
  const name = attendeeName.trim();
  if (!name) throw new Error('Attendee name is required');
  const ref = doc(db, 'events', eventId);
  await updateDoc(ref, {
    attendees: arrayUnion(name)
  });
};

export const cancelRsvp = async (eventId: string, attendeeName: string) => {
  const name = attendeeName.trim();
  if (!name) throw new Error('Attendee name is required');
  const ref = doc(db, 'events', eventId);
  await updateDoc(ref, {
    attendees: arrayRemove(name)
  });
};
