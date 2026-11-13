---
title: Write and publish blog posts
description: Create blog posts, edit them in the writing editor, and publish, update or unpublish them on your website.
nav_order: 50
---

Your website has a blog at `/blog`, and each post lives at `/blog/` followed by its slug. You write posts in a distraction-free editor, and nothing reaches your visitors until you publish.

## See your posts

Open **Website** then **Blogs**. Each post is a card showing its title, featured image, status, address and last update time. The statuses are **Draft**, **Published** and **Published · changes**, the same as for [pages](/docs/website/pages#page-statuses).

## Create a post

<Steps>

<Step>

### Click New blog

On the **Blogs** screen, click **New blog**.

</Step>

<Step>

### Name it

Enter a **Name** such as `My first blog` and click **Create blog**. The post's slug is created from this name.

</Step>

<Step>

### Start writing

The blog editor opens right away. Type the title, a short description and the body of your post.

</Step>

</Steps>

## Write in the editor

The editor shows the **Blog title** and a short description above the body, then a rich-text area that starts with the hint "Start writing…". Your work is saved to the draft automatically a moment after you stop typing, and the top bar shows **Saving…** and then **Saved just now** or how long ago it was saved.

The short description you type under the title is the post's excerpt. It also shows in **Document settings**.

## Document settings

Click the settings icon in the top bar to open or close the **Document settings** panel. It has these fields:

| Field | What it does |
| --- | --- |
| **Slug** | The last part of the post's address after `/blog/`. Changing it updates the public link immediately, so old links stop working. |
| **Excerpt** | A short description shown in blog listings. It can be up to 200 characters, and a counter shows how many you have used. You can't publish while it is too long. |
| **Tags** | Comma-separated tags such as `Product, engineering, launch`. |
| **Featured image** | The image shown on the post and used for social previews. Choose **Select an image** to upload or pick one, **Change image** to replace it, or **Remove image**. |

For the featured image, only JPEG, PNG, GIF and WebP images are accepted. You can upload your own, or choose a free stock photo. Stock photos are used directly and are not added to your [media library](/docs/website/media-library).

## Publish a post

Click **Publish changes** in the top bar. Your title, excerpt, tags, featured image and body go live together. Before the first publish, the eye icon in the top bar is disabled with the hint "Publish this blog before viewing it". Afterwards, it opens the live post in a new tab.

After you edit a published post, its status becomes **Published · changes**. Visitors keep seeing the old version until you click **Publish changes** again. To drop your edits instead, click **Discard draft**, which returns the draft to the published version.

## Unpublish a post

Open **Document settings** and click **Unpublish** in the **Publishing** section. Confirm in the **Unpublish this post?** dialog. The post disappears from your blog and its link stops working, but your writing stays as a draft and you can publish it again at any time.

## Delete a post

On the **Blogs** screen, open the actions menu on a post's card and choose **Delete blog**, then confirm. Images and files used only by that post are also deleted from your media library. This can't be undone.

## Permissions

You need `storefront:write` to create and edit posts, and `storefront:publish` to publish, unpublish or delete them.
