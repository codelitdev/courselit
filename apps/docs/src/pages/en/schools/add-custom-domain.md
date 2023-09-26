---
title: Add a custom domain to school
description: Add a custom domain to your school
layout: ../../../layouts/MainLayout.astro
---

> This guide does not apply if you self-host CourseLit. For the self hosted version, refer to the documentation of the load balancer / reverse proxy / virtual machine.

By default, your school will be hosted as a subdomain on `courselit.app` i.e. if you have a school called `joe-designs`, it will be available at `joe-designs.courselit.app`.

If you want to serve it on your own domain as well, you can bind a custom domain to the school. Let's see how.

_Please note that your school will still be available on the subdomain of courselit.app even after adding a custom domain to your school._

## Steps to add a custom domain to a school

1. In your domain registrar's DNS settings, create an A record and point it to `13.229.190.175`.

Here is mine. I am using Cloudflare.

![DNS settings](/assets/schools/dns-settings-custom-domain.png)

2. In the CourseLit dashboard, select the school you want to add a custom domain to and click on the drop down button to expand its settings.

![Open custom domain settings](/assets/schools/custom-domain-expand.png)

3. Enter your custom domain name and click `Update` as shown below.

![Update custom domain](/assets/schools/update-custom-domain.png)

4. That's it.

## Troubleshooting

### Issue #1: Your connection is not private.

**Solution**: The problem will eventually resolve once the DNS propagation is complete. If not, close your browser and relauch it again.

## Stuck somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
