export function isMailingAddressRequiredError(message: string): boolean {
  return /mailing address is required/i.test(message);
}
