---
title: Set up payments
description: Choose your school's currency and connect Stripe, Razorpay or Lemon Squeezy so learners can pay for paid plans.
nav_order: 40
---

To charge for courses, downloads or community memberships, connect a payment provider and choose your school's currency. Learners pay through your own provider account, so the money goes to you. Free plans work without any setup.

Open **Settings** then **Payments**. You need the `commerce:manage` permission to see and change payment settings. Changing the currency also needs `school:write`.

## Choose a currency

The **Currency** list sets the currency of every price in your school.

<Callout type="warning" title="The currency locks after your first payment">

Once your school has taken a payment, the currency can no longer be changed. The list is disabled and a note explains why. Choose carefully before you go live.

</Callout>

## Connect a provider

<Steps>

<Step>

### Choose a payment method

Under **Payment Method**, choose **Stripe**, **Razorpay** or **Lemonsqueezy**. The default is **None**, which means no paid plans can be bought.

</Step>

<Step>

### Enter your keys

Fill in the fields for the provider you chose. You get these values from the provider's own dashboard.

| Provider | Fields |
| --- | --- |
| Stripe | **Stripe Publishable Key**, **Stripe Secret Key** |
| Razorpay | **Razorpay Key**, **Razorpay Secret Key** |
| Lemonsqueezy | **Lemonsqueezy Key**, **Lemonsqueezy Store ID**, **One time variant ID**, **Subscription (Monthly) variant ID**, **Subscription (Yearly) variant ID** |

Secret keys are never shown again after you save them. If you leave a secret field empty when you save, the value you saved before is kept.

</Step>

<Step>

### Click Save

CourseLit saves the currency and your keys, and then sets up the provider's payment confirmation for you. **Currency saved.** appears when it is done.

</Step>

</Steps>

## The payment confirmation webhook

After you save your keys, a **Payment confirmation webhook** card shows whether CourseLit has set up payment confirmation on your provider account. Payment confirmations are how learners get access straight after they pay.

| What you see | Meaning |
| --- | --- |
| **Connected** and an address | Your provider sends payment events to CourseLit. Nothing more to do. |
| "Not connected yet. Save your keys to connect it." | Save your keys to start the connection. |
| A red error message | The connection failed, for example because a key is wrong. Fix the keys and save again, or click **Try again**. |

CourseLit creates the webhook on your provider account itself. You don't need to create one by hand.

## Lemon Squeezy notes

- The currency you choose in CourseLit is **not** applied at checkout for Lemon Squeezy. Set your currency in your Lemon Squeezy dashboard.
- Learners pay the price you set in CourseLit, but Lemon Squeezy's checkout also shows each subscription variant's own price. Set those variants to the price of your usual plan so the two match.

## Reset the payment method

Click **Reset** next to **Payment Method** to clear the current method. Your saved keys are kept.

<Callout type="danger" title="Paid plans stop working after a reset">

After a reset, all paid plans of all products fail at checkout with an error. Free plans keep working. Choose a provider again to restore paid checkout.

</Callout>

## Next steps

Once a provider is connected you can add paid plans to your products and communities. See [Products](/docs/products) and [Communities](/docs/communities).
