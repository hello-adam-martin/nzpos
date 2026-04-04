import crypto from 'crypto'

const PIN_BLACKLIST = [
  '0000', '1111', '2222', '3333', '4444', '5555',
  '6666', '7777', '8888', '9999', '1234', '4321',
]

/**
 * Generates a random 4-digit PIN, padded with leading zeros.
 * Retries until a non-blacklisted PIN is produced.
 * Blacklisted PINs: sequential runs, all-same-digit, 1234, 4321.
 */
export function generatePin(): string {
  let pin: string
  do {
    pin = crypto.randomInt(0, 10000).toString().padStart(4, '0')
  } while (PIN_BLACKLIST.includes(pin))
  return pin
}

/**
 * Returns true if the given PIN is on the blacklist.
 * Use this to reject blacklisted PINs when staff set their own PIN.
 */
export function isPinBlacklisted(pin: string): boolean {
  return PIN_BLACKLIST.includes(pin)
}
