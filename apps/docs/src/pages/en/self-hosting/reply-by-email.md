---
title: Configure reply by email
description: Configure Amazon SES, Postmark, or Mailgun so discussion notification emails can receive replies.
layout: ../../../layouts/MainLayout.astro
---

CourseLit can put a per-recipient `Reply-To` address on Community and product-discussion notifications. A reply sent to that address is added to the correct discussion as the notification recipient.

This requires an active queue worker and one inbound-email provider. The providers supported out of the box are **Amazon SES**, **Postmark**, and **Mailgun**. Choose one provider for each inbound reply domain.

## Before you configure a provider

1. Use a dedicated subdomain, such as `replies.example.com`. Do not point the MX records for your primary school domain at this feature.
2. Set the same `INBOUND_EMAIL_DOMAIN=replies.example.com` value in both the `app` and `queue` services. The queue service mints the reply address; the app service accepts inbound callbacks.
3. Enable the `queue` service in the supplied Docker Compose file. If the queue does not receive `INBOUND_EMAIL_DOMAIN`, outgoing emails intentionally have no reply token or `Reply-To` header.
4. Generate provider secrets with a password manager or `openssl rand -base64 32`. Keep them out of source control and webhook URLs except where a provider requires HTTP Basic authentication.

The webhook endpoint is always `https://<your-app-host>/api/inbound-email/<provider>`. Your reverse proxy must expose this HTTPS path without adding tenant headers or requiring dashboard authentication. Outbound SMTP and inbound reply processing are independent, so they may use different providers. CourseLit validates the provider callback before it reads a reply. Attachments and HTML reply parsing are not supported; CourseLit stores up to 5,000 characters of the plain-text reply.

## Environment variables

Set the common value in **both** services, then set only the values for your chosen provider in the `app` service.

```dotenv
# app and queue
INBOUND_EMAIL_DOMAIN=replies.example.com

# app only — Postmark
INBOUND_EMAIL_WEBHOOK_SECRET=replace-with-a-random-secret

# app only — Mailgun
MAILGUN_WEBHOOK_SIGNING_KEY=copy-from-mailgun-webhook-signing-key

# app only — Amazon SES
INBOUND_EMAIL_SES_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:courselit-inbound
INBOUND_EMAIL_SES_BUCKET=courselit-inbound-email
INBOUND_EMAIL_SES_REGION=us-east-1
INBOUND_EMAIL_SES_OBJECT_PREFIX=inbound
```

`INBOUND_EMAIL_SES_OBJECT_PREFIX` is optional. If set, it must exactly match the S3 key prefix configured in the SES receipt rule, without leading or trailing slashes.

## Amazon SES

Amazon SES is a first-class option and is the recommended route for an AWS-hosted CourseLit deployment. Follow the [SES receiving setup guide](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-setting-up.html) in an AWS Region that supports receiving email.

1. Verify `replies.example.com` in SES and publish the MX record that SES gives you. Its value is region-specific, for example `inbound-smtp.us-east-1.amazonaws.com`.
2. Create an SNS topic for inbound notifications and set its ARN as `INBOUND_EMAIL_SES_TOPIC_ARN`.
3. Configure the topic to use **SNS SignatureVersion 2**. CourseLit requires the SHA-256 signature version and rejects SNS's legacy SignatureVersion 1 default. The SNS topic console does not expose this setting, so run the following in AWS CloudShell or with the AWS CLI (replace the placeholders):

    ```bash
    aws sns set-topic-attributes \
      --region <aws-region> \
      --topic-arn arn:aws:sns:<aws-region>:<aws-account-id>:<topic-name> \
      --attribute-name SignatureVersion \
      --attribute-value 2
    ```

    See [AWS's signature-version guidance](https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message-configure-message-signature.html).

4. Add an HTTPS subscription to that topic: `https://<your-app-host>/api/inbound-email/ses`. CourseLit verifies the SNS signature and expected topic before confirming the subscription.
5. Create an active SES receipt rule for the reply subdomain. Add an **S3 action** that writes to `INBOUND_EMAIL_SES_BUCKET` with the optional `INBOUND_EMAIL_SES_OBJECT_PREFIX`, and configure that action to publish to the SNS topic. Do not use the direct SNS mail-content action: it has a much smaller message limit.
6. Give the CourseLit **web/app runtime** an AWS IAM role with `s3:GetObject` restricted to that bucket and prefix. The queue service does not need this S3 permission. SES needs separate permission to write the selected prefix and publish to the topic; use the policies AWS generates in the SES/SNS consoles where possible.
7. Add a short S3 lifecycle expiry for the raw MIME prefix. CourseLit reads each object only while processing the webhook and does not need to retain raw email.

The app checks SNS Signature Version 2, the AWS signing-certificate host, and the configured topic ARN before it reads the S3 object. It does not store message attachments.

### Grant the web service access to the SES bucket

Use a workload IAM role rather than static AWS access keys. Attach this least-privilege policy to the role, replacing the bucket name and narrowing the object path to your configured prefix when one is used:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "ReadInboundReplyEmails",
            "Effect": "Allow",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::courselit-inbound-email/*"
        }
    ]
}
```

- **EC2 / Docker Compose:** create an IAM role with the **EC2** trusted entity and this policy. In the EC2 console, select the instance, then choose **Actions → Security → Modify IAM role** and attach the role. The AWS SDK in the web container uses the instance role's temporary credentials automatically.
- **ECS / Fargate:** create an IAM role with the **Elastic Container Service Task** trusted entity and this policy. Assign it as the **task role** for the web task definition. Do not use the task execution role, and do not assign this bucket-read permission to the queue task.

Do not set `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in production when using a workload role. If the SES bucket uses SSE-KMS, also grant the web role `kms:Decrypt` for that KMS key.

## Postmark

1. Create a Postmark inbound server and add its MX records for `replies.example.com` as described in [Postmark's inbound setup guide](https://postmarkapp.com/developer/user-guide/inbound/configure-an-inbound-server).
2. Set its webhook URL to `https://courselit:<url-encoded-secret>@<your-app-host>/api/inbound-email/postmark`.
3. Set `INBOUND_EMAIL_WEBHOOK_SECRET` in the app service to that same secret. The username may be any non-empty value; `courselit` is used above for clarity.
4. Send a test message to the provider-generated inbound address. Postmark retries non-2xx responses, so do not disable the provider's retries.

CourseLit uses Postmark's `StrippedTextReply` when supplied, and otherwise removes quoted text from the plain-text body.

## Mailgun

1. Add `replies.example.com` as a Mailgun receiving domain and publish the MX records Mailgun provides.
2. Create a Mailgun route that forwards matching mail to `https://<your-app-host>/api/inbound-email/mailgun` using the `forward()` action. See [Mailgun's receiving-routes documentation](https://documentation.mailgun.com/docs/mailgun/user-manual/receive-forward-store/receive-http).
3. Copy Mailgun's webhook signing key to `MAILGUN_WEBHOOK_SIGNING_KEY` in the app service.
4. Keep the route payload as `multipart/form-data` or form data; CourseLit verifies Mailgun's timestamp, token, and HMAC signature before processing it.

## Verify the setup

1. Restart the app and queue services after changing environment variables.
2. Trigger a Community or product-discussion notification. Inspect the delivered message headers: its `Reply-To` should be `reply+<opaque-token>@replies.example.com`.
3. Reply from the same email address that received the notification. The reply should appear in the discussion and participants should receive the usual notifications.
4. Try a different sender address. CourseLit accepts the webhook but silently discards that reply, so forwarded reply addresses cannot impersonate the original recipient.

Provider retries are idempotent: a received provider message ID is retained for 30 days, so retry delivery does not create duplicate comments.

To disable reply by email safely, remove `INBOUND_EMAIL_DOMAIN` from the queue service and restart it. New notifications will no longer include a `Reply-To` token; leave the app endpoint configuration in place until outstanding messages have expired or remove the provider route after the 30-day reply-token window.
