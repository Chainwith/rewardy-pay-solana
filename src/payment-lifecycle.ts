export const PaymentState = Object.freeze({
  WAITING: 'WAITING',
  SIGNING: 'SIGNING',
  SUBMITTED: 'SUBMITTED',
  CONFIRMATION_UNKNOWN: 'CONFIRMATION_UNKNOWN',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
} as const);

export type PaymentStateValue =
  (typeof PaymentState)[keyof typeof PaymentState];

const transitions: Readonly<
  Record<PaymentStateValue, ReadonlySet<PaymentStateValue>>
> = Object.freeze({
  WAITING: new Set<PaymentStateValue>(['SIGNING', 'EXPIRED']),
  SIGNING: new Set<PaymentStateValue>(['WAITING', 'SUBMITTED', 'FAILED']),
  SUBMITTED: new Set<PaymentStateValue>([
    'CONFIRMED',
    'CONFIRMATION_UNKNOWN',
    'FAILED',
  ]),
  CONFIRMATION_UNKNOWN: new Set<PaymentStateValue>(['CONFIRMED', 'FAILED']),
  CONFIRMED: new Set<PaymentStateValue>(),
  FAILED: new Set<PaymentStateValue>(),
  EXPIRED: new Set<PaymentStateValue>(),
});

export function transitionPayment(
  currentState: PaymentStateValue,
  nextState: PaymentStateValue,
): PaymentStateValue {
  if (!transitions[currentState]?.has(nextState)) {
    throw new Error(
      `Payment transition is not allowed: ${currentState} -> ${nextState}`,
    );
  }
  return nextState;
}

export function canStartNewAttempt(state: PaymentStateValue): boolean {
  return state === PaymentState.WAITING;
}
