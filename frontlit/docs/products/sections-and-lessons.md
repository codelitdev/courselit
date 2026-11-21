---
title: Sections and lessons
description: Organise a course into sections and lessons, reorder them and control which lessons learners can see.
nav_order: 40
---

A course is made of **sections** (chapters, modules or weeks) that contain **lessons**. You build and reorder both on the product's **Content** tab. A digital download works the same way, but its tab is called **Files** and it holds files instead of lessons. See [Digital downloads](/docs/products/digital-downloads).

## Add a section

On the **Content** tab, select **Add section**. The first time, the empty state reads "Start with a section". After that, use the **Add section** row below your sections.

CourseLit creates a section called "Section 1", "Section 2" and so on, and puts its name in edit mode so you can type a real name.

## Rename, reorder and delete a section

Each section header has a **More** menu (three dots) with these actions:

| Action | What it does |
| --- | --- |
| Rename | Edit the section name. |
| Drip release | Release the section later. See [Drip schedules](/docs/products/drip-schedules). |
| Delete section | Delete an empty section. |

A section must be empty before you can delete it. Move or delete its lessons first. A digital download always keeps at least one section, so its last section cannot be deleted.

To reorder sections, drag the grip handle on a section header. You can also focus the handle and press the up or down arrow key. Use the arrow on a section header to collapse or expand it.

## Add a lesson

Select **Add lesson** at the bottom of a section and choose the lesson type in the **Add a lesson** dialog. The type cannot change after the lesson is created. See [Lesson types](/docs/products/lesson-types).

- **Page** creates a draft lesson called "Untitled lesson" and opens it in the full-screen lesson editor.
- **SCORM** opens the lesson form, where you enter a title and upload a package. See [SCORM lessons](/docs/products/scorm).

### Write a page lesson

The full-screen editor shows the lesson title as a large heading, with the page below it. Type `/` to add a block, such as a video, image, callout or quiz, and drag the handle beside a block to move it. Changes to the title and the page save automatically; the top bar shows "Saving…" and then "Saved just now".

The top bar also has:

- **← Content**, back to the course's **Content** tab.
- The eye icon, which opens the lesson in a learner preview in a new tab.
- **Make live**, or **Move to drafts** for a live lesson. If something on the page blocks it, such as a quiz without a correct option, a message above the page lists what to fix.
- The settings icon, which opens **Lesson settings**: the lesson's **Section**, **Free preview** (see [Free preview lessons](/docs/products/free-preview-lessons)) and **Delete lesson**.

If someone else (or an agent) changes the lesson while you have it open, the editor stops saving and asks you to **Reload**, so nobody's work is overwritten.

Select a lesson's title in the list to edit it again: page lessons open in the full-screen editor, SCORM lessons in the lesson form.

Each lesson row shows a short type tag, its title, its type (and "Free preview" when that applies), and a **Live** or **Draft** switch.

## Reorder and move lessons

Drag a lesson by its grip handle to reorder it, or to move it into another section, including an empty one. You can also use the up and down arrow keys on the handle. To move a lesson from its editor instead, change its **Section** in **Lesson settings**.

## Control what learners see

Every lesson is either **Live** or **Draft**.

- Learners only see live lessons.
- A course's lessons are visible only while the course itself is live. See [Publish a product and control visibility](/docs/products/publish-and-visibility).
- Sections with no live lessons do not show to learners.

Use the **Live** switch on a lesson row to flip it. A toast offers **Undo**. To publish in bulk, use **Make all N drafts live** at the top of the tab, or **Make N live** on a section header.

The tab header shows "3 of 5 lessons live" so you can see progress at a glance. A badge on the **Content** tab counts how many drafts remain.

### Choose the default for new lessons

New lessons start as **Draft**, hidden from learners until you make them live. Make a page lesson live with **Make live** in the lesson editor; the SCORM lesson form offers **Save draft** and **Save and make live**.

## Delete a lesson

Open the lesson and select **Delete lesson** in **Lesson settings** (or **Delete** in the SCORM lesson form). Confirm in the dialog "Are you sure you want to delete this lesson?" Deleting is permanent and removes the lesson from the product.
