import { Profile } from '@researchos/shared-types';

declare global {
  namespace Express {
    interface Request {
      user?: Profile;
      userId?: string;
    }
  }
}
