# User Deletion Architecture

This document provides a quick overview of how user deletion is implemented.

## Function Structure

```
┌─────────────────────────────────────────────────────────────┐
│              deleteUser(userId, ctx) [logic.ts]              │
│                   Main Orchestrator Function                 │
│                         (45 lines)                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────────────────────┐
                              │                                 │
                              ▼                                 ▼
┌──────────────────────────────────────┐    ┌──────────────────────────────────────┐
│   PHASE 1: AUTHORIZATION & VALIDATION │    │  validateUserDeletion() [helpers.ts] │
│   • checkIfAuthenticated()            │    │  • Check critical permissions        │
│   • Check manageUsers permission      │───▶│  • Ensure system won't be locked     │
│   • Verify user exists                │    │  • Prevent last admin deletion       │
│   • Prevent self-deletion             │    │                                      │
└──────────────────────────────────────┘    └──────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         PHASE 2: MIGRATE BUSINESS ENTITIES                   │
│   migrateBusinessEntities(userToDelete, deleterUser)         │
│                      [helpers.ts]                            │
│                         (175 lines)                          │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┬──────────────────────┐
        │                     │                     │                      │
        ▼                     ▼                     ▼                      ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────┐   ┌────────────────────┐
│ Course        │   │ Business Entity  │   │ Lesson       │   │ Community          │
│ Ownership     │   │ Ownership        │   │ Ownership    │   │ Moderator Roles    │
│               │   │                  │   │              │   │                    │
│ • Courses     │   │ • Email Templates│   │ • Lessons    │   │ • Transfer or      │
│ • Course Pages│   │ • Sequences      │   │   (uses _id) │   │   upgrade existing │
│               │   │ • Pages          │   │              │   │ • Community Pages  │
│               │   │ • User Segments  │   │              │   │                    │
│               │   │ • Email Delivery │   │              │   │                    │
│               │   │ • User Themes    │   │              │   │                    │
│               │   │ • Payment Plans  │   │              │   │                    │
│               │   │ • Ongoing Seq.   │   │              │   │                    │
└───────────────┘   └──────────────────┘   └──────────────┘   └────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            PHASE 3: CLEANUP PERSONAL DATA                    │
│            cleanupPersonalData(userToDelete)                 │
│                      [helpers.ts]                            │
│                         (140 lines)                          │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┬──────────────────────┐
        │                     │                     │                      │
        ▼                     ▼                     ▼                      ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────┐   ┌────────────────────┐
│ Personal      │   │ Community        │   │ Membership & │   │ Array References   │
│ Data          │   │ Content          │   │ Subscription │   │ & Media            │
│               │   │                  │   │              │   │                    │
│ • Notifs      │   │ • Posts/Comments │   │ • Cancel     │   │ • Sequence         │
│ • Mail Status │   │   (via helper)   │   │   Subscript. │   │   entrants         │
│ • Evaluations │   │ • Post Likes     │   │ • Delete     │   │ • Course           │
│ • Downloads   │   │ • Comment Likes  │   │   Invoices   │   │   customers        │
│ • Reports     │   │ • Reply Likes    │   │ • Delete     │   │ • Avatar Media     │
│ • Certificates│   │ • Subscriptions  │   │   Membership │   │                    │
│ • Activity    │   │                  │   │              │   │                    │
│ • Email Events│   │                  │   │              │   │                    │
└───────────────┘   └──────────────────┘   └──────────────┘   └────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Delete User      │
                    │ Document         │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Return true      │
                    └──────────────────┘
```

## Data Flow

### Input

- `userId`: String identifier of user to delete
- `ctx`: GraphQL context with authentication and domain info

### Processing

#### Step 1: Validation

```typescript
validateUserDeletion(userToDelete, ctx)
├─ For each CRITICAL_PERMISSION
│  ├─ Check if userToDelete has permission
│  └─ If yes, verify at least one other active user has it
└─ Throw error if last user with critical permission
```

#### Step 2: Migration

```typescript
migrateBusinessEntities(userToDelete, deleterUser, ctx)
├─ Find all courses owned by userToDelete
│  └─ Transfer to deleterUser
├─ Update business entities in parallel (Promise.all)
│  ├─ Email templates → deleterUser
│  ├─ Sequences → deleterUser
│  ├─ Pages → deleterUser
│  ├─ User segments → deleterUser
│  ├─ Email deliveries → deleterUser
│  ├─ User themes → deleterUser
│  ├─ Payment plans → deleterUser
│  └─ Ongoing sequences → deleterUser
├─ Transfer lessons (uses ObjectId)
└─ Transfer community moderator roles
   ├─ For each community where user is moderator
   │  ├─ Check if deleterUser already has membership
   │  ├─ If yes: upgrade to moderator, delete old
   │  └─ If no: transfer membership to deleterUser
   └─ Update community pages
```

#### Step 3: Cleanup

```typescript
cleanupPersonalData(userToDelete, ctx)
├─ Delete personal data in parallel (Promise.all)
│  ├─ Notifications (sent & received)
│  ├─ Mail request statuses
│  ├─ Lesson evaluations
│  ├─ Download links
│  ├─ Community reports
│  ├─ Certificates
│  ├─ Activity logs
│  ├─ Email events
│  └─ Community post subscriptions
├─ Clean community content
│  ├─ Delete posts & comments (via helper)
│  ├─ Remove from post likes
│  └─ Remove from comment/reply likes
├─ Clean memberships
│  ├─ For each membership
│  │  ├─ Cancel subscription if active
│  │  ├─ Delete invoices
│  │  └─ Delete membership
├─ Clean array references
│  ├─ Remove from sequence entrants
│  └─ Remove from course customers
├─ Delete avatar media
└─ Delete user document
```

### Output

- `Promise<boolean>`: Returns `true` on successful deletion

## Error Handling

```
deleteUser
├─ Not authenticated → Error: "Action not allowed"
├─ No manageUsers permission → Error: "Action not allowed"
├─ User not found → Error: "User not found"
├─ Self-deletion attempt → Error: "Action not allowed"
└─ Last user with critical permission → Error: "Cannot delete last user with permission: [permission]"
```

## GDPR Compliance Matrix

| Data Type      | Action  | Location                             | GDPR Status  |
| -------------- | ------- | ------------------------------------ | ------------ |
| User Profile   | Delete  | `UserModel.deleteOne()`              | ✅ Compliant |
| Notifications  | Delete  | `NotificationModel.deleteMany()`     | ✅ Compliant |
| Activity Logs  | Delete  | `ActivityModel.deleteMany()`         | ✅ Compliant |
| Email Events   | Delete  | `EmailEventModel.deleteMany()`       | ✅ Compliant |
| Certificates   | Delete  | `CertificateModel.deleteMany()`      | ✅ Compliant |
| Evaluations    | Delete  | `LessonEvaluationModel.deleteMany()` | ✅ Compliant |
| Downloads      | Delete  | `DownloadLinkModel.deleteMany()`     | ✅ Compliant |
| Reports        | Delete  | `CommunityReportModel.deleteMany()`  | ✅ Compliant |
| Posts/Comments | Delete  | `deleteCommunityPosts()`             | ✅ Compliant |
| Likes          | Remove  | `$pull` operations                   | ✅ Compliant |
| Memberships    | Delete  | `MembershipModel.deleteOne()`        | ✅ Compliant |
| Subscriptions  | Cancel  | Payment provider API                 | ✅ Compliant |
| Invoices       | Delete  | `InvoiceModel.deleteMany()`          | ✅ Compliant |
| Avatar         | Delete  | `deleteMedia()`                      | ✅ Compliant |
| Courses        | Migrate | `CourseModel.updateMany()`           | ✅ Preserved |
| Templates      | Migrate | `EmailTemplateModel.updateMany()`    | ✅ Preserved |
| Sequences      | Migrate | `SequenceModel.updateMany()`         | ✅ Preserved |
