---
title: Set up payments
description: Learn how to get paid via CourseLit
layout: ../../../layouts/MainLayout.astro
---

Receiving payments is effortless in CourseLit, and you get to keep 100% of what you make (except for the charges from your payment platform).

CourseLit offers integrations with the following payment platforms:

- [Stripe](https://stripe.com)
- [Razorpay](https://razorpay.com)
- [Lemonsqueezy](https://lemonsqueezy.com) (Experimental)

> A school can only have a single payment platform activated at a time.

## Stripe setup

1. Sign up for an account on Stripe and get your business approved (or use a test account).
2. In the Stripe dashboard, go to the `Developers > API Keys` section as shown below.
   ![Stripe dashboard](/assets/schools/stripe-api-keys.png)
3. In your CourseLit school, go to the `Settings > Payment` tab and select `Stripe` in the `Payment Method` dropdown.
4. Enter your Stripe publishable key and secret key in the `Stripe Publishable Key` and `Stripe Secret Key` input boxes as shown below:  
   ![Payment setup for Stripe](/assets/schools/payment-setup-stripe.png)
5. Set up the webhooks. Using webhooks, your school receives timely updates about payments from Stripe.
6. Open the webhook configuration dock by clicking on the `Developers > Webhooks` menu option.
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

## Razorpay setup

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

## Lemon Squeezy setup

> Lemon Squeezy does not support creating custom products on the fly. Hence, we have built around the restrictions laid down by Lemon Squeezy. That's why we call our integration experimental. If something does not work, reach out to us.

1. Sign up for an account on Lemon Squeezy and get your business approved (or use a test account).
2. In the Lemon Squeezy dashboard, go to `Products` and click on the `New product` button to create a generic product.  
   ![Lemon Squeezy product dashboard](/assets/schools/lemon-dashboard.png)  
   This generic product will be used to create checkouts since Lemon Squeezy does not allow creating custom products on the fly.
3. In the sidebar form that slides in, enter the product name and create three variants as described below.

    > You can name these variants whatever you like, as we will use the `Variant IDs` instead of variant names. The same goes for pricing—we only care about the pricing type, not the actual price set on a variant, as we will override it during checkout.

    - **A variant with one-time pricing**: To enable one-time payments in CourseLit
    - **A variant with subscription pricing with a monthly frequency**: To enable monthly subscriptions and EMIs in CourseLit
    - **A variant with subscription pricing with a yearly frequency**: To enable yearly subscriptions in CourseLit  
      ![Lemon Squeezy variant creation](/assets/schools/lemon-create-variants.png)

4. The following screenshot shows how to select a variant's pricing.  
   ![Lemon Squeezy variant pricing](/assets/schools/lemon-variant-payment-config.png)

5. In your CourseLit school's dashboard, go to `Settings > Payment` and configure the settings as described below.  
   ![CourseLit Lemon Squeezy config](/assets/schools/courselit-lemonsqueezy-config.png)

    1. **Currency**: This will be visible throughout your school but won't affect Lemon Squeezy checkouts, as Lemon Squeezy does not allow overriding it via custom checkout.
    2. **Payment method**: Select Lemon Squeezy.
    3. **Lemon Squeezy Store ID**: In the Lemon Squeezy dashboard, go to `Settings > Stores` as shown below. Copy and paste this ID into the CourseLit settings.  
       ![Lemon Squeezy store ID](/assets/schools/lemon-store-id.png)
    4. **One-time variant ID**: In the Lemon Squeezy dashboard, go to `Products` and click on the product you configured in the steps above. In the slider popup, scroll down to the `Variants` section, click the three-dot menu for the one-time variant, and then click `Copy ID`. Paste this ID into the CourseLit settings.
    5. **Subscription (Monthly) variant ID**: Do the same as #4.
    6. **Subscription (Yearly) variant ID**: Do the same as #4.
    7. **Lemon Squeezy Key**: In the Lemon Squeezy dashboard, go to `Settings > API` and click on the `+` icon to generate a new key. Paste this key into the CourseLit settings.  
       ![Lemon Squeezy API](/assets/schools/lemon-api.png)

6. Set up the webhooks. Using webhooks, your school receives timely updates about payments from Lemon Squeezy.
7. In the Lemon Squeezy dashboard, go to `Settings > Webhooks` and click on the `+` icon to create a new webhook.  
   ![Lemon Squeezy webhook](/assets/schools/lemon-webhook.png)

8. In the webhook slider popup, enter the following:

    - The webhook URL for your CourseLit school (listed in the same payment screen in your school).
    - Enter any random string in `Signing secret` (coming soon).
    - Check the following events:
        - `order_created`: For confirming one-time payments.
        - `subscription_payment_success`: For confirming subscription payments.
        - `subscription_resumed`: For detecting canceled subscriptions that are resumed automatically by Lemon Squeezy. It is an edge case that we need to handle.  
          ![Lemon Squeezy webhook configuration](/assets/schools/lemon-webhook-config.png)

9. That's it! Your Lemon Squeezy configuration is complete, and you are ready to receive payments.

## Reset payment method

If you want to stop using the currently selected payment platform, go to `Settings > Payment` and click the reset icon next to the `Payment Method` dropdown.

- This sets the payment method to `None`.
- This does **not** delete existing gateway credentials (keys/secrets) from your settings.
- You can pick another payment method later and save the settings again.

![Reset payment method](/assets/schools/reset-payment-method.png)

> After reset, all paid plans of all products will fail at checkout with the error `Payment configuration is invalid`. Free plans will keep on working..

![Reset payment paid plan error](/assets/schools/checkout-payment-invalid.png)

## Looking for developer docs?

We have created detailed documentation to help you understand the payment flow in CourseLit. Check it out [here]().

## Stuck somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
