---
title: Set up payments
description: Learn how to get paid via CourseLit
layout: ../../../layouts/MainLayout.astro
---

Receiving payments is effortless in CourseLit, and you get to keep 100% of what you make (except for the charges from your payment platform).

CourseLit offers integrations with the following payment platforms:

-   [Stripe](https://stripe.com)
-   [Razorpay](https://razorpay.com)

> A school can only have a single payment platform activated at a time.

### Set up Stripe

1. Sign up for an account on Stripe and get your business approved (or use a test account).
2. In the Stripe dashboard, go to `Developers > API Keys` section as shown below.
   ![Stripe dashboard](/assets/schools/stripe-api-keys.png)
3. In your CourseLit school, go to the `Settings > Payment` tab and select `Stripe` in the `Payment Method` dropdown.
4. Enter your Stripe publishable key and secret key in the `Stripe Publishable Key` and `Stripe Secret Key` input boxes as shown below:  
   ![Payment setup for Stripe](/assets/schools/payment-setup-stripe.png)
5. Set up the webhooks. Using webhooks, your school receives timely updates about payments from Stripe.
6. Open the webhook configuration dock, by clicking on `Developers > Webhooks` menu option.
   ![Stripe webhook navigation](/assets/schools/stripe-webhook-navigation.png)
7. Create a new webhook using the button as shown below:  
   ![Stripe add webhook](/assets/schools/stripe-add-webhook.png)
8. In the webhook dialog, perform the following actions:
    - Select the following events:
        - `checkout.session.completed`: For confirming one-time payments
        - `invoice.paid`: For confirming subscription payments  
          ![Stripe events selection](/assets/schools/stripe-events-selection.png)
    - In the destination type, select `Webhook endpoint`.
    - In the destination, enter your CourseLit school's webhook endpoint (listed in the same payment screen in your school).
      ![Stripe webhook destination](/assets/schools/stripe-courselit-webhook-entry.png)
9. That's it! Your Stripe configuration is complete, and you are ready to receive payments.

### Set up Razorpay

1. Sign up for an account on Razorpay and get your business approved (or use a test account).
2. In the Razorpay dashboard, go to the `Account & Settings` tab and select `API keys` as shown below:  
   ![Razorpay dashboard](/assets/schools/razorpay-dashboard-api-key.png)
3. Generate a new API key and keep this screen open.
4. In your CourseLit school, go to the `Settings > Payment` tab and select `Razorpay` in the `Payment Method` dropdown.
5. Enter your Razorpay key and its secret in the `Razorpay Key` and `Razorpay Secret Key` input boxes as shown below:  
   ![Payment setup for Razorpay](/assets/schools/payment-setup-razorpay.png)
6. Set up the webhooks. Using webhooks, your school receives timely updates about payments from Razorpay.
7. In the Razorpay dashboard, go to the `Accounts & Settings` tab and select `Webhooks`.
8. Create a new webhook using the button as shown below:  
   ![Razorpay new webhook](/assets/schools/razorpay-add-webhook.png)
9. In the webhook dialog, enter the following:
    - The webhook URL for your CourseLit school (listed in the same payment screen in your school).
    - Check the following events:
        - `order.paid`: For confirming one-time payments
        - `subscription.charged`: For confirming subscription payments  
          ![Razorpay webhook configuration](/assets/schools/razorpay-webhook-config.png)
10. That's it! Your Razorpay configuration is complete, and you are ready to receive payments.

## Looking for developer docs?

We have created a detailed documentation for understanding the payment flow in CourseLit. Check it out [here]().

## Stuck somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
