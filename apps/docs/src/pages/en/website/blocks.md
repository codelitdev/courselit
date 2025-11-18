---
title: Page blocks
description: Page blocks
layout: ../../../layouts/MainLayout.astro
---

Every page in CourseLit is made up of various blocks, stacked in a top-to-bottom fashion. Each block serves a unique purpose and can be customized.

The following screenshot shows [Header](/en/pages/header), [Rich Text](/en/pages/banner), [Hero](/en/pages/content), and [Grid](/en/pages/grid) blocks (top to bottom) in action. Different blocks are highlighted in different colors.

![CourseLit page blocks](/assets/pages/page-builder-blocks.png)

## Blocks

CourseLit offers a wide range of page blocks so that you can build all sorts of web pages.

### [Header](#header)

<details>
<summary>Expand to see Header block details</summary>

> This is a [shared block](#shared-blocks). All published changes to this block impact all pages on your website.

The header block serves as the header of a page. It is used for housing the site's navigation, etc. This block cannot be deleted from a page.

#### Adding links

You can add navigation links by following the steps below.

1. Click on the header block to reveal its settings side pane.
2. Click on the `Add new link` button in the `Links` section. This will add a new `Link` item as shown below.
   ![Header add link](/assets/pages/header-link-add.png)

You will also see the newly added link on the header itself.

3. Click on the pencil icon against the newly added link to edit it as shown above.
4. Change the label (displayed as text on the header block) and the URL (where the user should be taken upon clicking the label on the header) and click `Done` to save.
   ![Header edit link](/assets/pages/header-edit-link.png)
   </details>

### [Rich Text](#rich-text)

<details>
<summary>Expand to see Rich Text block details</summary>

The rich text block can be used to add text blocks containing elements like hyperlinks, etc.

#### Making text bold/italic/underline

1. Select the text.
2. To make the selected text bold, press <kbd>Ctrl+B</kbd>; to make it italic, press <kbd>Ctrl+I</kbd>; and for underline, press <kbd>Ctrl+U</kbd>.

You can also use the floating controls to do the same as shown below.

![Stylised text](/assets/pages/rich-text-styling.gif)

#### Creating hyperlinks

1. Select the text.
    > Double-clicking the text to select won't work due to a bug. We are working on it.
2. Click on the floating `link` button to reveal a popup text input.
3. In the popup text input, enter the URL as shown below.
   ![Create a hyperlink in rich text block](/assets/pages/rich-text-create-hyperlink.gif)
   </details>

### [Hero](#hero)

<details>
<summary>Expand to see Hero block details</summary>

A hero section of a web page is the section that immediately appears on screen, just under the header. The hero block helps you put the information front and center.

You can add text, rich text, images, and a call-to-action (CTA) button to the hero block.

Following is how it looks on a page.

![Hero block](/assets/pages/hero-block.png)

#### Customizing the call-to-action button

1. Click on the hero block to reveal its settings.
2. Scroll to the `Call to action` section.

![Hero block CTA](/assets/pages/hero-block-cta.png)

3. In the button text field, add the text that will be visible on the button.
4. In the button action, enter the URL the user should be taken to upon clicking.
   a. If the URL is from your own school, use its relative form, i.e., `/courses`.
   b. If the URL is from some external website, use the absolute (complete) URL, i.e., `https://website.com/courses`.
   </details>

### [Grid](#grid)

<details>
<summary>Expand to see Grid block details</summary>

A grid block comes in handy when you want to show some sort of list, for example, features list or advantages, etc. The list gets displayed in the grid format as shown below.

![Grid block](/assets/pages/grid-block.png)

#### Add an item

1. Click on the grid block to reveal its settings.
2. Scroll down to the `Items` section as shown below.

![Grid block items](/assets/pages/grid-block-items.png)

3. Click on the `Add new item` button as shown above. This will open up the item's editor.
4. Change the details as per your liking. See the [customizing the call-to-action button](#customizing-the-call-to-action-button) guide to check how to customize the item's call-to-action button. Once done, click on the `Done` button.

![Grid block edit item](/assets/pages/grid-add-item.png)

#### Delete an item

1. Click on the grid block to reveal its settings.
2. Scroll down to the `Items` section as shown below.

![Grid block items](/assets/pages/grid-block-items.png)

3. Click on the item you want to remove. This will open up the item's editor.
4. Click on the delete button to delete the item.
5. You will be taken back to the grid block's settings.

#### Customizing the call-to-action button

1. Click on the grid block to reveal its settings.
2. Scroll to the `Call to action` section.

![Grid block CTA](/assets/pages/grid-block-cta.png)

3. In the button text field, add the text that will be visible on the button.
4. In the button action, enter the URL the user should be taken to upon clicking.
   a. If the URL is from your own school, use its relative form, i.e., `/courses`.
   b. If the URL is from some external website, use the absolute (complete) URL, i.e., `https://website.com/courses`.
   </details>

### [Featured](#featured)

<details>
<summary>Expand to see Featured block details</summary>

If you want to show your other products on a page, the featured widget is the one to use.

Following is how it looks on a page.

![Featured block](/assets/pages/featured-block.png)

#### Add featured products on your page

1. Add the `Featured` block on your page. See here for how to [add blocks](/en/pages/edit#add-a-block) to a page.
2. Go to the products section and select the products from the dropdown list as shown below.

![Featured block](/assets/pages/featured.gif)

3. To delete an entry from the featured list, click on the delete button against the entry in the products section (also demonstrated in the above screengrab).
 </details>

### [Curriculum](#curriculum)

<details>
<summary>Expand to see Curriculum block details</summary>

> This block can only be added to the products' sales pages.

This block shows the content of your product, i.e., `Sections` and `Lessons` in your product. Using this, you can show the index of what your product offers.

Following is how it looks on a page.

![Curriculum block](/assets/pages/content-block.jpeg)

There are two sections with two lessons each in the product demonstrated above.

Your audience can directly click on the lessons to see them in the course viewer. The preview lessons are indicated distinctly so that your audience can easily check out the free parts of your product.

![Curriculum block preview](/assets/pages/content-block-preview.gif)

</details>

### [Banner](#banner)

<details>
<summary>Expand to see Banner block details</summary>

The banner block is the default block that shows the basic information about the page, i.e., on a sales page it shows the product's details like its title, description, featured image, and pricing, and on the homepage it shows your school's details like its name and subtitle.

#### Overriding details

By default, the banner block shows the details from your product or school depending upon which type of page it is displayed on.

These details, however, can be overridden at the block level. Following is how:

1. Click on the banner to reveal its settings.
2. Change the relevant details from the `Basic` section.

![Banner basic details](/assets/pages/banner-basic-details.png)

#### Creating a lead magnet

The banner block can also be used as a lead magnet form. The pricing of your product should be set to `Free email delivery`. Following are the steps:

##### Steps

1. Add the `Banner` block on your page (if not already present).

![Banner add](/assets/pages/add-banner.png)

2. In the banner's settings screen, scroll to the `Call to action` (aka CTA) section.
   ![Banner call to action](/assets/pages/banner-cta.png)

3. In the CTA section, put the asset link which you want to share with your audience in the `Success message` text box.
   ![Banner call to action download link](/assets/pages/banner-cta-download-link.png)

> Make sure the link you are sharing here is open to the public and can be easily accessed.

4. Publish the page.

Now, whenever your users enter their emails and press submit, they will see the text you entered in the `Success message` text box.

</details>

### [Newsletter signup](#newsletter-signup)

<details>
<summary>Expand to see Newsletter signup block details</summary>

Having a mailing list to sell directly to is a dream of every business, big or small. That's why CourseLit offers a dedicated block that lets you capture emails. It is also a [shared block](/en/pages/blocks#shared-page-blocks).

Following is how it looks on a page.

![Newsletter signup block](/assets/pages/newsletter-signup-block.png)

#### How it works

1. Your audience will enter their emails in the text box on the Newsletter signup block.
2. A user is created in your school.
3. The user is automatically signed up for your newsletter.
4. You can see the user in the `Users` section from the dashboard.

Following is an animation that shows the entire flow.

![Newsletter signup block working](/assets/pages/newsletter-signup-block-working.gif)

</details>

### [Footer](#footer)

<details>
<summary>Expand to see Footer block details</summary>

> This is a [shared block](#shared-blocks). All published changes to this block impact all pages on your website.

The footer block serves as the footer of a page. It is used for housing secondary but essential elements like links to terms and conditions, privacy policies, etc. This block **cannot be deleted** from a page.

#### Adding sections and links

1. Click on the footer block to reveal its settings.
2. In the `Sections` panel, you can:
    - Add new sections (up to 5 sections)
    - Rename sections
    - Add, edit, or delete links within each section
    - Reorder links using drag and drop

#### Customizing design

In the `Design` panel, you can customize:

- Title font size
- Maximum width
- Vertical padding
- Social media links (Facebook, Twitter, Instagram, LinkedIn, YouTube, Discord, GitHub)
  </details>

## [Shared blocks](#shared-blocks)

The `Header` and `Footer` are shared among all the website pages. These cannot be deleted from a page.

Since these are shared, publishing any changes to these will make those visible across your website.

## Next step

Now that you have learned about page blocks, it is time to learn how to use them in your pages. See our [edit a page](/en/pages/edit) guide for details.

## Stuck somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
