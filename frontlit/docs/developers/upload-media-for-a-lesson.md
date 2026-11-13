---
title: Upload media for a lesson
description: Upload a video, audio file, PDF or image with the REST API in three steps and attach it to a lesson or product.
nav_order: 140
---

Files do not travel through the CourseLit API itself. You ask the API for permission to upload, send the file to the upload address it returns, and then register the upload so the file appears in the school's media library. The registered file has a media ID that you use in lessons, product images and other places.

Uploading takes an API key with the `media:write` permission, or an OAuth token with `data:write`. The AI tools of the MCP server cannot upload files, but they can use files that are already in the library.

<Steps>

<Step>

### Ask for an upload authorization

Say what you are uploading and what it is for.

```bash
curl -X POST "$COURSELIT_API_URL/v1/media/upload-authorizations" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "welcome.mp4",
    "mimeType": "video/mp4",
    "byteSize": 48211364,
    "purpose": "lesson_media",
    "accessPolicy": "private"
  }'
```

| Field | Meaning |
| --- | --- |
| `fileName` | The file name, up to 255 characters |
| `mimeType` | The content type, such as `video/mp4`, `application/pdf` or `image/png` |
| `byteSize` | The size in bytes, from 1 up to 1,000,000,000 |
| `purpose` | What the file is for. One of `lesson_media`, `lesson_content`, `product_artwork`, `product_content`, `downloadable_file`, `blog_artwork`, `website_page`, `school_branding`, `community_artwork`, `community_content`, `learner_avatar` or `certificate_template` |
| `accessPolicy` | `private`, the default, or `public`. Use `private` for course content, which learners can only reach with access to the product. |

The response is `201` and tells you where and how to upload. The values shown here are placeholders. The authorization expires after 10 minutes.

```json
{
  "uploadId": "UPLOAD_ID",
  "uploadUrl": "https://media.example.com/upload",
  "uploadProtocol": "tus",
  "uploadMethod": "POST",
  "uploadHeaders": { "header-name": "header-value" },
  "uploadFields": { "field-name": "field-value" },
  "expiresAt": "2026-11-13T09:41:00.000Z"
}
```

</Step>

<Step>

### Upload the file

How you send the bytes depends on `uploadProtocol` and `uploadMethod` in the response.

| Response | What to do |
| --- | --- |
| `uploadProtocol` is `tus` | Upload with a resumable-upload client that speaks the tus protocol. Use `uploadUrl` as the endpoint and send `uploadHeaders` as request headers. Set the tus metadata to `fileName`, `mimeType` and `access`, where `access` is your `accessPolicy`. |
| `uploadProtocol` is `direct` and `uploadMethod` is `POST` | Send a `multipart/form-data` request to `uploadUrl` with the `uploadHeaders`. Add every entry of `uploadFields` as a form field, then add the file as the field `file`. |
| `uploadProtocol` is `direct` and `uploadMethod` is `PUT` | Send the file as the request body to `uploadUrl`, with the `uploadHeaders` and a `Content-Type` header. |

For a tus upload in JavaScript with the `tus-js-client` package, this is the same approach the admin uses.

```js
import { Upload } from "tus-js-client";

const upload = new Upload(file, {
  endpoint: authorization.uploadUrl,
  headers: authorization.uploadHeaders,
  metadata: {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    access: "private",
  },
  onError: (error) => console.error(error),
  onSuccess: ({ lastResponse }) => {
    // The upload service describes the stored file in the Media response header.
    const { mediaId } = JSON.parse(lastResponse.getHeader("Media"));
    console.log(mediaId);
  },
});
upload.start();
```

For a `direct` upload, the JSON response of the upload service contains `mediaId`.

Keep the `mediaId` the upload service returns. The next step needs it.

</Step>

<Step>

### Register the upload

Send the `mediaId` the upload service returned as `uploadId`. The API checks the stored file and adds it to the media library.

```bash
curl -X POST "$COURSELIT_API_URL/v1/media" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "MEDIA_ID_FROM_THE_UPLOAD_SERVICE",
    "altText": "",
    "caption": "Welcome video",
    "accessPolicy": "private"
  }'
```

The response is `201` with the library item. Its `id` is the media ID to use in CourseLit.

```json
{
  "id": "med_0190c0de0000700080000000000000a6",
  "schoolId": "sch_0190c0de0000700080000000000000a0",
  "canonicalUrl": "https://media.example.com/...",
  "thumbnailUrl": null,
  "fileName": "welcome.mp4",
  "mimeType": "video/mp4",
  "byteSize": 48211364,
  "width": null,
  "height": null,
  "kind": "video",
  "category": "library",
  "altText": "",
  "caption": "Welcome video",
  "accessPolicy": "private",
  "status": "active",
  "usageCount": 0,
  "createdAt": "2026-11-13T09:32:00.000Z",
  "updatedAt": "2026-11-13T09:32:00.000Z"
}
```

</Step>

<Step>

### Attach it to a lesson

Pass the media ID as `mediaId` when you create the lesson. The lesson `type` must match the file, which is `video` for a video, `audio` for audio and `pdf` for a PDF. A `file` lesson accepts any file.

```bash
curl -X POST "$COURSELIT_API_URL/v1/products/$PRODUCT_ID/lessons" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Welcome video",
    "type": "video",
    "mediaId": "med_0190c0de0000700080000000000000a6",
    "sectionId": "sec_0190c0de0000700080000000000000a2",
    "status": "published"
  }'
```

If the file type does not match the lesson type, the call fails with `lesson_media_type_mismatch`.

To use an image as a product image, send `featuredImage` in the product update with the library item's `id` as `mediaId` and its `canonicalUrl` as `url`. The file must be an image.

</Step>

</Steps>

## Manage library files

| Task | Operation |
| --- | --- |
| Browse and search | `GET /v1/media`, see [Pagination and filtering](/docs/developers/pagination-and-filtering) |
| Read one file | `GET /v1/media/{mediaId}` |
| Change alt text, caption or access | `PATCH /v1/media/{mediaId}` |
| See where a file is used | `GET /v1/media/{mediaId}/references` |
| Delete | `DELETE /v1/media/{mediaId}` |

A file that is still used by a lesson, product or page cannot be deleted. Check its references first.
