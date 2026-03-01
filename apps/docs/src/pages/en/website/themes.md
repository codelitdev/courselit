---
title: Themes
description: Introduction to CourseLit's Theme Designer
layout: ../../../layouts/MainLayout.astro
---

CourseLit's Theme Designer is a powerful tool that allows you to customize the look and feel of your learning platform.

Built on top of [shadcn's design system](https://ui.shadcn.com/), it provides a comprehensive set of options to create a unique and professional appearance for your website.

Every theme in CourseLit comes in two flavors - light and dark mode. This ensures your website looks great regardless of the user's system preferences or time of day.

![CourseLit Theme Builder](/assets/pages/themes/theme-builder-home.png)

Currently, themes are only applied to the public pages of your school. The dashboard uses the system theme to provide a consistent experience. If you'd like themes to be applied to the dashboard as well, please leave your upvote <a href="https://discord.com/channels/727630561895514212/1379041635811201125" target="_blank">here</a>. The system theme also includes a dark mode.

## Table of Contents

- [System Themes](#system-themes)
- [Custom Themes](#custom-themes)
- [Previewing a Theme](#previewing-a-theme)
- [Customizing a Theme](#customizing-a-theme)
    - [Colors](#1-colors)
    - [Typography](#2-typography)
    - [Interactives](#3-interactives)
    - [Structure](#4-structure)
- [Publishing Changes](#5-publishing-changes)
- [Switching Themes](#switching-themes)
- [Supported Tailwind Classes](#supported-tailwind-classes)
- [Need Help?](#need-help)

## System Themes

System themes are pre-built themes that come with CourseLit. These themes are professionally designed and ready to use. They serve as a great starting point for your website's appearance.

Currently, CourseLit offers the following system themes:

<details>
<summary>Classic (Default)</summary>

A clean, professional theme with balanced typography and subtle colors
![Classic Theme Preview](/assets/pages/themes/classic-theme.png)

</details>

<details>
<summary>Learning</summary>

Optimized for educational content with enhanced readability
![Learning Theme Preview](/assets/pages/themes/learning-theme.png)

</details>

<details>
<summary>Neobrutalism</summary>

A bold, modern theme with strong typography and vibrant colors
![Neobrutalism Theme Preview](/assets/pages/themes/neo-brutalism-theme.png)

</details>

<details>
<summary>Editorial</summary>

A sophisticated theme inspired by editorial design
![Editorial Theme Preview](/assets/pages/themes/editorial-theme.png)

</details>

<details>
<summary>Midnight</summary>

A dark-focused theme with high contrast and dramatic elements
![Midnight Theme Preview](/assets/pages/themes/midnight-theme.png)

</details>

Each system theme can be used as-is or customized to match your brand identity.

## Custom Themes

Custom themes are your own creations or modifications of system themes. When you customize a system theme, CourseLit automatically creates a copy of it, allowing you to make changes without affecting the original.

To create a custom theme:

1. Select a system theme as your starting point
2. Click the "Edit" button to open the theme editor
3. Make your desired changes
4. To edit the dark mode settings, switch the theme using the moon icon (🌙) and make the changes

Your custom themes will appear in the "Custom Themes" section of the theme selector.

> When you edit a theme, CourseLit remembers it and automatically selects it the next time you open the theme editor.

## Previewing a Theme

Click on the theme card to preview it on your school. This will not switch the theme.

## Customizing a Theme

The theme editor gives you complete control over your website's look and feel. To start editing a theme, click on the pencil icon button on the theme's card.

![Edit theme button](/assets/pages/themes/edit-theme-button.png)

#### Understanding the auto save feature

Your theme changes are automatically saved as you work, so you can take your time perfecting the design.

These changes are stored as a draft version of your theme and are only visible while you're actively editing that theme in the theme editor. When you're ready to apply your changes to your live website, simply set the theme as active and click the publish button.

The theme editor offers several categories of customization options:

### 1. Colors

![Color Editor](/assets/pages/themes/theme-builder-colors-category.png)

The color editor allows you to customize various aspects of your theme's color scheme:

<details>
<summary>Primary Colors</summary>
Your main brand colors used for important actions and key elements
</details>

<details>
<summary>Secondary Colors</summary>
Supporting colors that complement your primary colors
</details>

<details>
<summary>Accent Colors</summary>
Highlight colors for special elements and calls-to-action
</details>

<details>
<summary>Base Colors</summary>
Fundamental colors for your website's background and text
</details>

<details>
<summary>Card Colors</summary>
Colors for card components and content boxes
</details>

<details>
<summary>Popover Colors</summary>
Colors for floating menus and tooltips
</details>

<details>
<summary>Muted Colors</summary>
Subtle colors for less prominent elements
</details>

<details>
<summary>Border & Input Colors</summary>
Colors for borders and form fields
</details>

<details>
<summary>Destructive Colors</summary>
Colors for error states and warning messages
</details>

<details>
<summary>Chart Colors</summary>
Colors for data visualization and graphs
</details>

<details>
<summary>Sidebar Colors</summary>
Colors for the navigation sidebar
</details>

<details>
<summary>Shadow Styles</summary>
Customize shadow effects for depth and elevation
</details>

> **For Developers**: These settings correspond 1-to-1 to ShadCN's [CSS variables](https://ui.shadcn.com/docs/theming).

### 2. Typography

![Typography Editor](/assets/pages/themes/theme-builder-typography-category.png)

The typography editor lets you customize text styles across your website. These are organized into categories:

<details>
<summary>Headers</summary>

- Header 1: Large titles for main page headings
- Header 2: Medium titles for major sections
- Header 3: Smaller titles for subsections
- Header 4: Small titles for minor sections
- Preheader: Introductory text that appears above headers
    </details>

<details>
<summary>Subheaders</summary>

- Subheader 1: Primary subheaders for section introductions
- Subheader 2: Secondary subheaders for supporting text
    </details>

<details>
<summary>Body Text</summary>

- Text 1: Main body text for content
- Text 2: Secondary body text for supporting content
- Caption: Small text for image captions and footnotes
    </details>

<details>
<summary>Interactive Elements</summary>

- Link: Text for clickable links
- Button: Text for buttons and calls-to-action
- Input: Text for form fields and search boxes
    </details>

For each text style, you can customize:

- Font family: Choose from a variety of professional fonts
- Font size: From Extra Small to 9X Large
- Font weight: From Thin to Black
- Line height: From None to Loose
- Letter spacing: From Tighter to Widest
- Text transform: None, Uppercase, Lowercase, or Capitalize
- Text decoration: Underline or no underline
- Text overflow: How text behaves when it's too long

#### Supported Fonts

CourseLit provides a carefully curated selection of professional fonts, organized into categories:

<details>
<summary>Sans Serif Fonts</summary>

- **Inter**: A modern, clean font perfect for digital interfaces
- **Open Sans**: A highly readable font designed for screen use
- **Source Sans 3**: A versatile font with excellent legibility
- **Noto Sans**: A font designed to support all languages
- **Roboto**: Google's signature font, clean and modern
- **Mulish**: A geometric sans-serif with a modern feel
- **Nunito**: A well-balanced font with rounded terminals
- **Work Sans**: A clean, modern font with a geometric feel
    </details>

<details>
<summary>Serif Fonts</summary>

- **Merriweather**: A serif font designed for comfortable reading
- **Alegreya**: A serif font with a calligraphic feel
- **Playfair Display**: An elegant serif font for headings
- **Roboto Slab**: A serif variant of Roboto
- **Source Serif 4**: A serif font designed for digital reading
    </details>

<details>
<summary>Display Fonts</summary>

- **Montserrat**: A geometric sans-serif with a modern feel
- **Poppins**: A geometric sans-serif with a unique character
- **Raleway**: An elegant sans-serif with a unique 'w'
- **Rubik**: A sans-serif with a geometric feel
- **Oswald**: A reworking of the classic style
- **Bebas Neue**: A display font with a strong personality
    </details>

<details>
<summary>Modern Fonts</summary>

- **Lato**: A sans-serif font with a warm feel
- **PT Sans**: A font designed for public use
- **Quicksand**: A display sans-serif with rounded terminals
    </details>

Each font is optimized for web use and includes multiple weights for flexibility in design. All fonts support Latin characters and are carefully selected for their readability and professional appearance.

### 3. Interactives

![Interactives Editor](/assets/pages/themes/theme-builder-interactives-category.png)

The interactives editor allows you to customize the appearance of interactive elements:

<details>
<summary>Button</summary>

- Padding: Space around the button text (None to 9X Large)
- Border style: Choose from None, Solid, Dashed, Dotted, Double, or Hidden
- Shadow effects: From None to 2X Large
- Custom styles: Add your own custom styles using [supported Tailwind classes](#supported-tailwind-classes)
- Disabled state: How the button looks when it can't be clicked
    </details>

<details>
<summary>Link</summary>

- Padding: Space around the link text
- Border style: Choose from various border styles
- Text shadow: Add depth to your links
- Custom styles: Add your own custom styles using [supported Tailwind classes](#supported-tailwind-classes)
- Disabled state: How the link looks when it can't be clicked
    </details>

<details>
<summary>Card</summary>

- Padding: Space around the card content
- Border style: Choose from various border styles
- Shadow effects: Add depth to your cards
- Custom styles: Add your own custom styles using [supported Tailwind classes](#supported-tailwind-classes)
    </details>

<details>
<summary>Input</summary>

- Border radius: Round the corners (None to Full)
- Padding: Space inside the input field
- Border style: Choose from various border styles
- Shadow effects: Add depth to your input fields
- Custom styles: Add your own custom styles using [supported Tailwind classes](#supported-tailwind-classes)
- Disabled state: How the input looks when it can't be used
    </details>

### 4. Structure

![Structure Editor](/assets/pages/themes/theme-builder-structure-category.png)

The structure editor lets you customize the layout of your pages, like section paddings and maximum page width.

<details>
<summary>Page</summary>

- Maximum width options: - 2XL (42rem): Compact layout - 3XL (48rem): Standard layout - 4XL (56rem): Wide layout - 5XL (64rem): Extra wide layout - 6XL (72rem): Full width layout
    </details>

<details>
<summary>Section</summary>

- Horizontal padding: Space on the left and right sides (None to 9X Large)
- Vertical padding: Space on the top and bottom (None to 9X Large)
    </details>

## Publishing Changes

All changes you make to a theme are saved as drafts. To make your changes live:

1. Review your changes in the theme editor
2. Set the theme as active on your school
3. Click the "Publish" button to publish both content and theme changes
4. Confirm the publication

![Publish theme button](/assets/pages/themes/publish-theme-button.png)

Your changes will now be visible to your website visitors.

## Switching Themes

To switch between themes:

1. Go to the theme selector
2. Choose the theme you like
3. Click the button with a tick icon on your desired theme
4. The theme will be applied immediately

![Switch theme button](/assets/pages/themes/switch-theme-button.png)

Note: Switching themes will affect your entire website's appearance. Make sure to test the theme thoroughly before making it live.

## Supported Tailwind Classes

When adding custom styles to interactive elements, you can use the following Tailwind classes:

<details>
<summary>Typography</summary>

#### Font Sizes

- `text-sm`: Small text
- `text-base`: Base text size
- `text-lg`: Large text
- `text-xl`: Extra large text
- `text-2xl`: 2X large text
- `text-3xl`: 3X large text
- `text-4xl`: 4X large text
- `text-5xl`: 5X large text
- `text-6xl`: 6X large text
- `text-7xl`: 7X large text
- `text-8xl`: 8X large text
    </details>

<details>
<summary>Padding</summary>

#### Vertical Padding

- `py-4` to `py-20`: Vertical padding from 1rem to 5rem

#### Horizontal Padding

- `px-4` to `px-20`: Horizontal padding from 1rem to 5rem
    </details>

<details>
<summary>Colors</summary>

#### Background Colors

- `bg-{color}-{shade}`: Where color is one of:
    - slate, gray, zinc, neutral, stone
    - red, orange, amber, yellow, lime
    - green, emerald, teal, cyan, sky
    - blue, indigo, violet, purple
    - fuchsia, pink, rose
- And shade is one of:
    - 50, 100, 200, 300, 400
    - 500, 600, 700, 800, 900, 950

#### Text Colors

- `text-{color}-{shade}`: Same color and shade options as background colors

Variants available: `hover`, `disabled`, `dark`

</details>

<details>
<summary>Transitions</summary>

#### Transition Properties

- `transition`: All properties
- `transition-colors`: Colors only
- `transition-opacity`: Opacity only
- `transition-shadow`: Shadow only
- `transition-transform`: Transform only
- `transition-none`: No transition

#### Duration

- `duration-0`: No duration
- `duration-75`: 75ms
- `duration-100`: 100ms
- `duration-150`: 150ms
- `duration-200`: 200ms
- `duration-300`: 300ms
- `duration-500`: 500ms
- `duration-700`: 700ms
- `duration-1000`: 1000ms

#### Timing Functions

- `ease-in`: Ease in
- `ease-out`: Ease out
- `ease-in-out`: Ease in and out
- `ease-linear`: Linear
    </details>

<details>
<summary>Transforms</summary>

#### Translate X

- `translate-x-1` to `translate-x-10`: Move right
- `translate-x-[-1]` to `translate-x-[-10]`: Move left

#### Translate Y

- `translate-y-1` to `translate-y-10`: Move down
- `translate-y-[-1]` to `translate-y-[-10]`: Move up

#### Scale

- `scale-0`: No scale
- `scale-50`: 50% scale
- `scale-75`: 75% scale
- `scale-90`: 90% scale
- `scale-95`: 95% scale
- `scale-100`: 100% scale
- `scale-105`: 105% scale
- `scale-110`: 110% scale
- `scale-125`: 125% scale
- `scale-150`: 150% scale
    </details>

<details>
<summary>Shadows</summary>

- `shadow-sm`: Small shadow
- `shadow-md`: Medium shadow
- `shadow-lg`: Large shadow
- `shadow-xl`: Extra large shadow
- `shadow-2xl`: 2X large shadow
- `shadow-inner`: Inner shadow
- `shadow-none`: No shadow

Variants available: `hover`, `dark`

</details>

<details>
<summary>Borders</summary>

- `border-solid`: Solid border
- `border-dashed`: Dashed border
- `border-dotted`: Dotted border
- `border-double`: Double border
- `border-none`: No border

Variants available: `hover`

</details>

<details>
<summary>Text Decoration</summary>

- `underline`: Underline text

Variants available: `hover`

</details>

<details>
<summary>Layout</summary>

#### Maximum Width

- `max-w-2xl`: 42rem
- `max-w-3xl`: 48rem
- `max-w-4xl`: 56rem
- `max-w-5xl`: 64rem
- `max-w-6xl`: 72rem

Variants available: `lg`

</details>

> Note: All `hover` variants are available for interactive elements. `dark` mode variants are available for colors and shadows.

## Need Help?

We're here to help! Join our [Discord community](https://discord.com/invite/GR4bQsN) or reach out to us on [Twitter](https://twitter.com/courselit) for support.
