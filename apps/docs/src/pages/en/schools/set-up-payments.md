---
title: Set up payments
description: Learn how to get paid via CourseLit
layout: ../../../layouts/MainLayout.astro
---

CourseLit offers the following payment methods:

-   [Stripe](https://stripe.com)
-   [Razorpay](https://razorpay.com)

Your school can only have a single payment method activated at a time.

### Set up Razorpay

1. Sign up for an account on Razorpay and get your business approved.
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
    - The webhook URL for your school (listed in the same payment screen in your school).
    - Check the following events:  
       - `order.paid`: For confirming one-time payments  
       - `subscription.charged`: For confirming subscription payments  
      ![Razorpay webhook configuration](/assets/schools/razorpay-webhook-config.png)
10. That's it! Your Razorpay configuration is complete, and you are ready to receive payments.
