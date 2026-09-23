export type RazorpayCheckoutData = {
  publicKey: string;
  orderId?: string;
  subscriptionId?: string;
  customerEmail?: string;
  customerName?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      order_id?: string;
      subscription_id?: string;
      name: string;
      description: string;
      prefill?: { name?: string; email?: string };
      handler?: (response: unknown) => void;
      modal?: { ondismiss?: () => void };
    }) => { open(): void };
  }
}

async function loadRazorpayScript() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-razorpay]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpay = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay."));
    document.head.appendChild(script);
  });
}

export async function openRazorpayCheckout(input: {
  data: RazorpayCheckoutData;
  name: string;
  description: string;
}) {
  const { data } = input;
  if (!data.publicKey || (!data.orderId && !data.subscriptionId)) {
    throw new Error("Razorpay checkout is not configured correctly.");
  }
  await loadRazorpayScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("Razorpay is unavailable.");
  await new Promise<void>((resolve) => {
    const checkout = new Razorpay({
      key: data.publicKey,
      order_id: data.orderId,
      subscription_id: data.subscriptionId,
      name: input.name,
      description: input.description,
      prefill: { name: data.customerName, email: data.customerEmail },
      handler: () => resolve(),
      modal: { ondismiss: () => resolve() },
    });
    checkout.open();
  });
}
