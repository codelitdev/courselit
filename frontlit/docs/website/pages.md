---
title: Manage pages
description: See every page on your school website, create new ones and delete the ones you no longer need.
nav_order: 20
---

The **Pages** screen lists the pages of your school website. Open it from **Website** then **Pages** in the sidebar. Each page appears as a card showing its name, its status, its address and when it was last updated.

## Page statuses

Every page shows one of three statuses.

| Status | Meaning |
| --- | --- |
| Draft | The page has never been published. Visitors can't see it. |
| Published | The live page is the same as your latest saved draft. |
| Published · changes | The page is live, but you have saved draft edits that visitors don't see yet. |

## Create a page

<Steps>

<Step>

### Click New page

On the **Pages** screen, click **New page** at the top right.

</Step>

<Step>

### Name the page

Enter a **Name**, for example `About us`, and click **Create page**. The page's address (its slug) is created from the name. If that address is already taken, a number is added to make it unique.

</Step>

<Step>

### Open the page

The new page appears at the top of the list as a draft containing only the shared header and footer. Click its card to open it in the [page editor](/docs/website/page-editor).

</Step>

</Steps>

You need the `storefront:write` permission to create a page.

## Pages every school starts with

Every school comes with three system pages. They can't be deleted and their addresses can't be changed.

| Page | Address | Starts as |
| --- | --- | --- |
| Homepage | `/` | Published, with a hero, your offers and a newsletter signup |
| Terms of Service | `/terms` | A draft with starter text that names your school |
| Privacy policy | `/privacy` | A draft with starter text that names your school |

<Callout type="note" title="Review and publish your legal pages">

Your site links to the terms and privacy pages only after you publish them. Read the starter text, adjust it to your situation and publish both.

</Callout>

## Sales pages are edited from their product or community

Each product and each community has its own sales page. These pages don't appear in the **Pages** list. To edit one, open the product or community and click **Edit sales page**, which opens the same page editor. Sales pages are deleted automatically when their product or community is deleted.

## Delete a page

Open the actions menu on a page's card and choose **Delete page**. Confirm in the dialog. Images and files that were used only by that page are also deleted from your [media library](/docs/website/media-library). This can't be undone.

Only pages you created yourself can be deleted. The menu doesn't appear on system pages and sales pages. Deleting needs the `storefront:publish` permission.

## Page addresses

A page you create is served at `/` followed by its address, for example `/about-us`. A few addresses are reserved for other parts of your site and can't be used for a page: `blog`, `products`, `communities`, `join`, `login`, `logout`, `checkout`, `dashboard`, `course` and `p`.

You change a page's address in the [page editor](/docs/website/page-editor#change-the-page-address).
