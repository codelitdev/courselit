---
title: SCORM lessons
description: Add a SCORM 1.2 or 2004 package to a course as a lesson and learn how learners launch it.
nav_order: 70
---

A **SCORM** lesson delivers a package created in a SCORM authoring tool, such as an interactive module. CourseLit stores the package privately and remembers each learner's progress inside it. The SCORM type is marked **Alpha** in the lesson editor.

## Before you begin

- Export your content as a SCORM 1.2 or SCORM 2004 package in ZIP format.
- Keep the package under 300 MB.
- The package must contain an `imsmanifest.xml` file with an entry point (a launch file) listed in it.

## Add a SCORM lesson

<Steps>

<Step>

### Create the lesson

On the **Content** tab, select **Add lesson** in a section, choose the **SCORM** type, enter a **Title** and select **Save draft** or **Save and make live**. Under **SCORM package**, you see "Save the lesson first, then upload its SCORM package." CourseLit reopens the lesson after saving.

</Step>

<Step>

### Upload the package

Under **SCORM package**, select **Upload SCORM package** and choose your ZIP file in the dialog **Select SCORM package**. CourseLit checks the package and shows its title, version and file count, for example "Version 1.2 · 42 files".

</Step>

<Step>

### Replace it if needed

Select **Replace package** to upload a different one.

</Step>

</Steps>

## If the upload fails

CourseLit tells you why the package was rejected:

| Message | What to do |
| --- | --- |
| Invalid SCORM package: imsmanifest.xml not found | Re-export the package and make sure the manifest sits at the top level of the ZIP. |
| Invalid SCORM package: no entry point found in the manifest | Check that your authoring tool listed a launch file. |
| Invalid SCORM package: Entry point followed by the file name and "not found" | The launch file named in the manifest is missing from the ZIP. |
| Invalid SCORM package: the selected media is not a ZIP package | Choose a ZIP file. |
| SCORM package exceeds the maximum allowed size (300MB) | Reduce the package size. |

## What learners see

Learners see a **Enter SCORM content** button that opens the activity in a separate window. CourseLit saves their progress in the package, so they can leave and return.

A learner cannot select **Mark complete** on a SCORM lesson until the package has reported progress, such as a completed status or recorded interaction. Learners see "Complete the SCORM activity before marking this lesson complete."

SCORM lessons count like any other lesson towards finishing a course. See [Certificates](/docs/products/certificates).

## Before you sell a SCORM course

Because SCORM support is marked **Alpha**, test your package as a learner before you sell the course. [Invite yourself](/docs/products/customers) with a second email address and work through the lesson.
