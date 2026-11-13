/** The payment provider, as people know it. */
export function paymentMethodLabel(method: string | null): string | null {
  if (!method) return null;
  const labels: Record<string, string> = {
    stripe: "Stripe",
    razorpay: "Razorpay",
    lemonsqueezy: "Lemon Squeezy",
  };
  return labels[method.toLowerCase()] ?? method;
}

/** "sub_1Q2w3E4r5T…" for a long id; short ids are shown whole. */
export function shortSubscriptionId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 12)}…` : id;
}
