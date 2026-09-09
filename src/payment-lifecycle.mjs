export const PaymentState = Object.freeze({
  WAITING: 'WAITING',
  SIGNING: 'SIGNING',
  SUBMITTED: 'SUBMITTED',
  CONFIRMATION_UNKNOWN: 'CONFIRMATION_UNKNOWN',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
});

const transitions = Object.freeze({
  WAITING: new Set(['SIGNING', 'EXPIRED']),
  SIGNING: new Set(['WAITING', 'SUBMITTED', 'FAILED']),
  SUBMITTED: new Set(['CONFIRMED', 'CONFIRMATION_UNKNOWN', 'FAILED']),
  CONFIRMATION_UNKNOWN: new Set(['CONFIRMED', 'FAILED']),
  CONFIRMED: new Set(),
  FAILED: new Set(),
  EXPIRED: new Set(),
});

export function transitionPayment(currentState, nextState) {
  if (!transitions[currentState]?.has(nextState)) {
    throw new Error(
      `Payment transition is not allowed: ${currentState} -> ${nextState}`,
    );
  }
  return nextState;
}

export function canStartNewAttempt(state) {
  return state === PaymentState.WAITING;
}

