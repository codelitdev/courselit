---
title: User permissions
description: User permissions
layout: ../../../layouts/MainLayout.astro
---

CourseLit offers a powerful permissions system so that you can control who can do what in your school.

You can bring your entire team including designers, content creators, editors etc. and provide fine-grained access to them.

Following is how it looks (indicated in the red box).

![User's permission editor](/assets/users/user-permissions-editor.png)

## Understanding permissions

Let take a moment to understand what all permissions are available and what aspect of CourseLit they control.

- **Manage products**

    Create/update/delete your products.

    _Technical name: `course:manage`_

- **Manage all products**

    Create/update/delete any product in the school. This includes products created by other creators in the school.

    _Technical name: `course:manage_any`_

- **Manage blog**

    Create/update/delete new any blog posts.

    _Technical name: `course:publish`_

- **Buy products**

    Purchase products from the school.

    _Technical name: `course:enroll`_

- **Manage pages**

    Update any page in the school.

    _Technical name: `site:manage`_

- **Manage settings**

    Update school wide settings like payments integration etc.

    _Technical name: `setting:manage`_

- **Manage users**

    Access/update school's users.

    _Technical name: `user:manage`_

- **Manage files**

    Update/delete your media assets.

    _Technical name: `media:manage`_

- **Manage community**

    Manage community posts, comments and settings.

    _Technical name: `community:manage`_

## Stuck somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
