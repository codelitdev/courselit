# User Deletion Architecture

This document provides a quick overview of how user deletion is implemented.

## Function Structure

```
+-------------------------------------------------------------+
|              deleteUser(userId, ctx) [logic.ts]              |
|                   Main Orchestrator Function                 |
|                         (45 lines)                           |
+-------------------------------------------------------------+
                              |
                              +---------------------------------+
                              |                                 |
                              v                                 v
+--------------------------------------+    +--------------------------------------+
|   PHASE 1: AUTHORIZATION & VALIDATION |    |  validateUserDeletion() [helpers.ts] |
|   * checkIfAuthenticated()            |    |  * Check critical permissions        |
|   * Check manageUsers permission      |--->|  * Ensure system won't be locked     |
|   * Verify user exists                |    |  * Prevent last admin deletion       |
|   * Prevent self-deletion             |    |                                      |
+--------------------------------------+    +--------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|         PHASE-2: MIGRATE BUSINESS ENTITIES                   |
|   migrateBusinessEntities(userToDelete, deleterUser)         |
|                      [helpers.ts]                            |
|                         (175 lines)                          |
+-------------------------------------------------------------+
                              |
        +---------------------+---------------------+----------------------+
        |                     |                     |                      |
        v                     v                     v                      v
+---------------+   +------------------+   +--------------+   +--------------------+
| Course        |   | Business Entity  |   | Lesson       |   | Community          |
| Ownership     |   | Ownership        |   | Ownership    |   | Moderator Roles    |
|               |   |                  |   |              |   |                    |
| * Courses     |   | * Email Templates|   | * Lessons    |   | * Transfer or      |
| * Course Pages|   | * Sequences      |   |   (uses _id) |   |   upgrade existing |
|               |   | * Pages          |   |              |   | * Community Pages  |
|               |   | * User Segments  |   |              |   |                    |
|               |   | * Email Delivery |   |              |   |                    |
|               |   | * User Themes    |   |              |   |                    |
|               |   | * Payment Plans  |   |              |   |                    |
|               |   | * Ongoing Seq.   |   |              |   |                    |
+---------------+   +------------------+   +--------------+   +--------------------+
                              |
                              v
+-------------------------------------------------------------+
|            PHASE-3: CLEANUP PERSONAL DATA                    |
|            cleanupPersonalData(userToDelete)                 |
|                      [helpers.ts]                            |
|                         (140 lines)                          |
+-------------------------------------------------------------+
                              |
        +--------------------------+-------------------------+---------------------+
        |                          |                         |                     |
        v                          v                         v                     v
+---------------+   +-----------------------------+   +--------------+   +--------------------+
| Personal      |   | Community &                 |   | Membership & |   | Array References   |
| Data          |   | Discussion Content          |   | Subscription |   | & Media            |
|               |   |                             |   |              |   |                    |
| * Notifs      |   | * Posts/Comments            |   | * Cancel     |   | * Sequence         |
| * Mail Status |   |   (via helper)              |   |   Subscript. |   |   entrants         |
| * Evaluations |   | * Community reactions       |   | * Delete     |   | * Course           |
| * Downloads   |   |   (collection + posts)      |   |   Invoices   |   |   customers        |
| * Reports     |   | * Community post subs       |   | * Delete     |   | * Avatar Media     |
| * Certificates|   | * Discussion likes/subs/    |   |   Membership |   |                    |
| * Activity    |   |   reports                   |   |              |   |                    |
| * Email Events|   | * Discussion comments/      |   |              |   |                    |
|               |   |   replies (anonymized)      |   |              |   |                    |
+---------------+   +-----------------------------+   +--------------+   +--------------------+
                              |
                              v
                    +------------------+
                    | Delete User      |
                    | Document         |
                    +------------------+
                              |
                              v
                    +------------------+
                    | Return true      |
                    +------------------+
```

## Data Flow

### Input

- `userId`: String identifier of user to delete
- `ctx`: GraphQL context with authentication and domain info

### Processing

#### Step 1: Validation

```typescript
validateUserDeletion(userToDelete, ctx)
|-- For each CRITICAL_PERMISSION
|   |-- Check if userToDelete has permission
|   `-- If yes, verify at least one other active user has it
`-- Throw error if last user with critical permission
```

#### Step 2: Migration

```typescript
migrateBusinessEntities(userToDelete, deleterUser, ctx)
|-- Find all courses owned by userToDelete
|   `-- Transfer to deleterUser
|-- Update business entities in parallel (Promise.all)
|   |-- Email templates -> deleterUser
|   |-- Sequences -> deleterUser
|   |-- Pages -> deleterUser
|   |-- User segments -> deleterUser
|   |-- Email deliveries -> deleterUser
|   |-- User themes -> deleterUser
|   |-- Payment plans -> deleterUser
|   `-- Ongoing sequences -> deleterUser
|-- Transfer lessons (uses ObjectId)
`-- Transfer community moderator roles
   |-- For each community where user is moderator
   |   |-- Check if deleterUser already has membership
   |   |-- If yes: upgrade to moderator, delete old
   |   `-- If no: transfer membership to deleterUser
   `-- Update community pages
```

#### Step 3: Cleanup

```typescript
cleanupPersonalData(userToDelete, ctx)
|-- Delete personal data in parallel (Promise.all)
|   |-- Notifications (sent & received)
|   |-- Mail request statuses
|   |-- Lesson evaluations
|   |-- Download links
|   |-- Email reply tokens
|   |-- Inbound email receipts
|   |-- Community reports
|   |-- Certificates
|   |-- Activity logs
|   |-- Email events
|   |-- Community post subscriptions
|   |-- Product discussion likes
|   |-- Product discussion subscriptions
|   `-- Product discussion reports
|-- Clean community content
|   |-- Delete posts & comments (deleteCommunityPosts by user; includes reactions on owned posts / by userId)
|   `-- Delete remaining community reactions for userId (CommunityReactionModel)
|-- Anonymize and redact product discussion comments and replies
|-- Clean memberships
|   |-- For each membership
|   |   |-- Cancel subscription if active
|   |   |-- Delete invoices
|   |   `-- Delete membership
|-- Clean array references
|   |-- Remove from sequence entrants
|   `-- Remove from course customers
|-- Delete avatar media
`-- Delete user document
```

### Output

- `Promise<boolean>`: Returns `true` on successful deletion

## Error Handling

```
deleteUser
|-- Not authenticated -> Error: "Action not allowed"
|-- No manageUsers permission -> Error: "Action not allowed"
|-- User not found -> Error: "User not found"
|-- Self-deletion attempt -> Error: "Action not allowed"
`-- Last user with critical permission -> Error: "Cannot delete last user with permission: [permission]"
```

## GDPR Compliance Matrix

| Data Type                    | Action    | Location                                                                                                                                                 | GDPR Status   |
| ---------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| User Profile                 | Delete    | `UserModel.deleteOne()`                                                                                                                                  | [x] Compliant |
| Notifications                | Delete    | `NotificationModel.deleteMany()`                                                                                                                         | [x] Compliant |
| Activity Logs                | Delete    | `ActivityModel.deleteMany()`                                                                                                                             | [x] Compliant |
| Email Events                 | Delete    | `EmailEventModel.deleteMany()`                                                                                                                           | [x] Compliant |
| Certificates                 | Delete    | `CertificateModel.deleteMany()`                                                                                                                          | [x] Compliant |
| Evaluations                  | Delete    | `LessonEvaluationModel.deleteMany()`                                                                                                                     | [x] Compliant |
| Downloads                    | Delete    | `DownloadLinkModel.deleteMany()`                                                                                                                         | [x] Compliant |
| Email reply tokens           | Delete    | `EmailReplyTokenModel.deleteMany()`                                                                                                                      | [x] Compliant |
| Inbound email receipts       | Delete    | `InboundEmailReceiptModel.deleteMany()`                                                                                                                  | [x] Compliant |
| Reports                      | Delete    | `CommunityReportModel.deleteMany()`                                                                                                                      | [x] Compliant |
| Posts/Comments               | Delete    | `deleteCommunityPosts()`                                                                                                                                 | [x] Compliant |
| Community reactions          | Delete    | `CommunityReactionModel.deleteMany()` by `userId` / owned posts; hard content delete purges entity rows; soft-delete retains until hard/user/post delete | [x] Compliant |
| Community post subscriptions | Delete    | `CommunityPostSubscriberModel.deleteMany()`                                                                                                              | [x] Compliant |
| Memberships                  | Delete    | `MembershipModel.deleteOne()`                                                                                                                            | [x] Compliant |
| Subscriptions                | Cancel    | Payment provider API                                                                                                                                     | [x] Compliant |
| Invoices                     | Delete    | `InvoiceModel.deleteMany()`                                                                                                                              | [x] Compliant |
| Avatar                       | Delete    | `deleteMedia()`                                                                                                                                          | [x] Compliant |
| Discussion Likes             | Delete    | `ProductDiscussionLikeModel.deleteMany()`                                                                                                                | [x] Compliant |
| Discussion Subs              | Delete    | `ProductDiscussionSubscriberModel.deleteMany()`                                                                                                          | [x] Compliant |
| Discussion Reports           | Delete    | `ProductDiscussionReportModel.deleteMany()`                                                                                                              | [x] Compliant |
| Discussion Comments/Replies  | Anonymize | `ProductDiscussionCommentModel.updateMany()`, `ProductDiscussionReplyModel.updateMany()`                                                                 | [x] Compliant |
| Courses                      | Migrate   | `CourseModel.updateMany()`                                                                                                                               | [x] Preserved |
| Templates                    | Migrate   | `EmailTemplateModel.updateMany()`                                                                                                                        | [x] Preserved |
| Sequences                    | Migrate   | `SequenceModel.updateMany()`                                                                                                                             | [x] Preserved |
