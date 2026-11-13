---
title: Pagination and filtering
description: Page through CourseLit list endpoints with cursors or page numbers, and narrow results with search, filter and range parameters.
nav_order: 60
---

List operations return their results in pages. CourseLit uses two styles, and each operation uses one of them. The API reference shows the parameters for every list operation.

## Cursor pagination

Most lists of content use a cursor. These include products, the media library, communities, and the members, posts, comments and reports inside a community.

| Parameter | Meaning |
| --- | --- |
| `cursor` | The `nextCursor` from the previous response. Leave it out for the first page. |
| `limit` | Items per page, from 1 to 50. The default is 25. |

The response has `items` and `nextCursor`. When `nextCursor` is `null`, you have reached the last page.

```json
{
  "items": [],
  "nextCursor": "opaque-cursor-string"
}
```

The cursor is opaque. Do not build or edit one, and pass it back unchanged. Keep the other query parameters the same while you page.

```bash
# First page
curl "$COURSELIT_API_URL/v1/products?limit=50" \
  -H "x-api-key: $COURSELIT_API_KEY"

# Next page, using nextCursor from the response above
curl "$COURSELIT_API_URL/v1/products?limit=50&cursor=$NEXT_CURSOR" \
  -H "x-api-key: $COURSELIT_API_KEY"
```

## Page-number pagination

Lists that people search and count, such as contacts and a product's customers, use page numbers and return a total.

| Operation | Page parameters | Response |
| --- | --- | --- |
| List contacts | `page` from 1, and `rowsPerPage` from 1 to 100, default 20 | `items` and `total` |
| List the contacts in a segment | `page` and `rowsPerPage`, same limits | `segment`, `totalCount` and `contacts` |
| List a product's customers | `page` from 1, and `limit` from 1 to 100, default 25 | `items`, `total`, `page` and `limit` |
| List the subscribers of an email sequence | `page` and `limit` | `items`, `total`, `page` and `limit` |

Request pages until you have collected `total` items, or until a page comes back with fewer items than you asked for.

```bash
curl "$COURSELIT_API_URL/v1/contacts?page=2&rowsPerPage=50" \
  -H "x-api-key: $COURSELIT_API_KEY"
```

## Unpaged lists

Some lists are small by nature and return everything at once in an `items` array, for example a product's payment plans and sections.

## Filtering and searching

Filters are plain query parameters, and they combine with pagination.

| Operation | Parameter | Effect |
| --- | --- | --- |
| List products | `kind` | Only `course` or only `download` products |
| List the media library | `search`, `category` | Search by name. `category` is `library`, the default, or `user_uploads` |
| List contacts | `q` | Search by email or name |
| List contacts | `segmentId` | Only the contacts in a saved segment |
| List contacts | `filter` | A URL-encoded JSON filter set, the same shape a segment stores |
| List a product's customers | `q` | Case-insensitive match on email or name |
| List communities and their content | `category`, `spaceId` | Narrow by discussion category or space |
| List community members and reports | `status` | Narrow by status |
| List email sequences and templates | `search`, `limit` | Search by name, and cap the number of items |

To see what a contact filter matches before you save it as a segment, use the filter preview operation, which counts and previews the matching contacts.

### Contact filters

A filter set is a JSON object with `version` set to 1, an `aggregator` of `and` or `or`, and a list of `filters`. Each filter has a `name`, a `condition` and, for most, a `value`.

```json
{
  "version": 1,
  "aggregator": "and",
  "filters": [
    { "name": "tag", "condition": "Has", "value": "newsletter" },
    { "name": "product", "condition": "Has", "value": "prd_0190c0de0000700080000000000000a1" }
  ]
}
```

The filter names are `email`, `product`, `community`, `lastActive`, `signedUp`, `subscription`, `tag` and `permission`. Conditions are case-sensitive words such as `Has`, `Does not have`, `Is exactly`, `Contains`, `Before`, `After` and `On`.

## Date ranges

Analytics operations take a `range` instead of a date window. For a product's analytics and the school overview, `range` is one of `1d`, `7d`, `30d`, `90d`, `1y` or `lifetime`.
