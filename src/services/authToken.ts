import { auth } from '../firebase/firebaseConfig';

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export const getCurrentUserToken = async (): Promise<string> => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new AuthenticationError('You must be signed in to complete this action.');
  }

  const token = await currentUser.getIdToken();

  if (!token) {
    throw new AuthenticationError('Unable to verify your authentication status. Please sign in again.');
  }

  return token;
};
