export const BILI_BASIC_ERROR_CODES = {
  INVALID_MID: {
    code: 'INVALID_MID',
    message: 'The Bili mid must be a non-negative numeric string.',
  },
  CHALLENGE_NOT_FOUND: {
    code: 'CHALLENGE_NOT_FOUND',
    message: 'No pending challenge found for this mid.',
  },
  CHALLENGE_EXPIRED: {
    code: 'CHALLENGE_EXPIRED',
    message: 'Challenge expired. Request a new code and retry.',
  },
  CHALLENGE_MISMATCH: {
    code: 'CHALLENGE_MISMATCH',
    message: 'The challenge does not belong to this mid.',
  },
  CHALLENGE_CONSUMED: {
    code: 'CHALLENGE_CONSUMED',
    message: 'The challenge has already been consumed. Request a new code.',
  },
  BINDING_EXISTS: {
    code: 'BINDING_EXISTS',
    message: 'This mid is already bound to another account.',
  },
  USER_BINDING_EXISTS: {
    code: 'USER_BINDING_EXISTS',
    message: 'Your account already has a Bili binding.',
  },
  SIGN_UP_DISABLED: {
    code: 'SIGN_UP_DISABLED',
    message: 'Sign-up on verification is disabled.',
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User not found for the bound account.',
  },
} as const;

export type BiliBasicErrorCode = keyof typeof BILI_BASIC_ERROR_CODES;
