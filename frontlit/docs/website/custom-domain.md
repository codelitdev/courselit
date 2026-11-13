---
title: Use a custom domain
description: Serve your school website from your own domain by adding DNS records and verifying them.
nav_order: 70
---

Every school's website is available on a default address on the CourseLit platform domain. You can also serve it from your own domain, such as `learn.example.com`. The default address keeps working after you add a custom domain.

You can attach one custom domain to a school at a time. You need the `school:write` permission, and access to the DNS settings of your domain at your registrar or DNS provider.

## Open the domain settings

Go to **Website** then **Settings**, and open the **Domain** tab. It has two cards:

- **Default domain** shows your school's subdomain, which remains available as a fallback.
- **Custom domain** is where you add and verify your own domain.

## Add a custom domain

<Steps>

<Step>

### Enter your domain name

In the **Domain name** box, enter the hostname only, with no path or protocol, for example `learn.example.com`. Click **Add custom domain**.

</Step>

<Step>

### Add the DNS records

CourseLit shows a table with two records for you to create at your DNS provider: a `CNAME` record and a `TXT` record. For each one the table gives the **Type**, **Name** and **Value**, with a copy button next to the value. Create both records exactly as shown.

</Step>

<Step>

### Check DNS

Click **Check DNS**. Each record is marked **Detected**, **Not detected** or **Not checked**. When both are detected, the badge changes from **Needs DNS setup** to **Connected**, and the message "This domain is connected to your school website." appears.

</Step>

</Steps>

DNS changes can take time to spread. If the records aren't detected yet, wait a while and click **Check DNS** again.

## Remove a custom domain

Click **Remove domain** and confirm in the **Remove custom domain?** dialog. The domain stops serving your website, and your default domain remains available. To use a different domain, remove the current one first, then add the new one.

## Troubleshooting

<Accordions>

<Accordion title="The message says website setup is still in progress">

Your school's website is still being prepared. Wait a moment and try again.

</Accordion>

<Accordion title="I can't add a second domain">

A school can have only one custom domain. Remove the current domain first.

</Accordion>

<Accordion title="DNS instructions are not shown">

The records appear once your website setup completes. Until then the table is replaced with a note, and **Check DNS** stays disabled.

</Accordion>

</Accordions>
