---
title: Delete a User
description: Guide to safely deleting users with GDPR compliance
layout: ../../../layouts/MainLayout.astro
---

Deleting a user is a critical operation that removes all personal data associated with that user from your school. This feature is designed to comply with GDPR and other data protection regulations.

> **Important**: User deletion is permanent and cannot be undone. All personal data will be removed, and business entities will be transferred to the admin performing the deletion.

## How User Deletion Works

When you delete a user, CourseLit performs two main operations:

1. **Business Entity Migration**: Transfers ownership of courses, communities, email templates, and other business-critical resources to the admin performing the deletion
2. **Personal Data Cleanup**: Permanently removes all personal data associated with the user

## Prerequisites

To delete a user, you must have the `Manage Users` permission. Additionally:

- You cannot delete yourself
- You cannot delete the last user with critical permissions (like `Manage Site`, `Manage Users`, etc.)
- The system ensures at least one admin remains with each critical permission

## Deleting a User

1. Navigate to the **Users** area from the dashboard
2. Click on the user you want to delete to open their details
3. Scroll down to the Danger zone and click on **Delete user** button

    ![Delete user](/assets/users/delete-user.png)

4. Confirm the deletion when prompted

## What Gets Migrated

The following business entities are transferred to the admin performing the deletion:

### Courses & Content

- **Course Ownership**: All courses created by the user
- **Lesson Ownership**: All lessons created by the user
- **Page Ownership**: All pages created by the user (course pages, blog pages, etc.)

### Communities

- **Community Ownership**: All communities created by the user
- **Community Posts**: All posts created by the user in any community
- **Community Comments**: All comments made by the user

### Email Marketing

- **Email Templates**: All email templates created by the user
- **Email Sequences**: All email sequences (campaigns) created by the user
- **Broadcasts**: All email broadcasts created by the user

### Other Business Entities

- **Payment Plans**: All payment plans created by the user
- **User Themes**: All custom themes created by the user
- **User Segments**: All user segments created by the user

## What Gets Deleted

The following personal data is permanently removed:

### User Account & Profile

- User account and profile information
- User avatar and media files
- Authentication tokens and sessions

### Activity & Engagement

- Course enrollments and memberships
- Lesson progress and evaluations
- Download links generated for the user
- Activity logs and analytics data
- Notifications sent to the user

### Community Participation

- Community membership records
- Community post subscriptions
- Community reports filed by the user

### Email & Communications

- Email delivery records
- Email event logs (opens, clicks, etc.)
- Ongoing email sequences for the user
- Mail request status records

### Financial Records

- Invoices associated with the user
- Payment subscriptions (cancelled automatically)

### Certificates

- Certificates issued to the user

## GDPR Compliance

This deletion process is designed to comply with GDPR Article 17 (Right to Erasure). When a user is deleted:

- All personal data is permanently removed
- Business entities are preserved to maintain system integrity
- The operation is logged for audit purposes
- Payment subscriptions are automatically cancelled

## Safety Measures

CourseLit implements several safety measures to prevent accidental data loss:

1. **Permission Validation**: Ensures at least one user retains each critical permission
2. **Self-Deletion Prevention**: You cannot delete your own account
3. **Confirmation Required**: Deletion requires explicit confirmation
4. **Atomic Operation**: The entire deletion process succeeds or fails as a unit

## After Deletion

After a user is deleted:

- All their business entities (courses, communities, etc.) continue to function normally under the new owner
- Students enrolled in their courses can continue learning
- Community members can continue participating
- Email sequences continue running for other users
- The deleted user cannot log in anymore

## Handling Subscription Cancellations

If the deleted user had active payment subscriptions:

- All subscriptions are automatically cancelled
- The payment provider (Stripe, PayPal, etc.) is notified
- No further charges will occur
- Refunds must be handled manually through your payment provider if needed

## Best Practices

1. **Review Before Deletion**: Check what content and entities the user owns before deleting
2. **Notify Stakeholders**: If the user created important courses or communities, inform relevant team members
3. **Export Data First**: If you need to retain any information for records, export it before deletion
4. **Handle Refunds**: Process any necessary refunds through your payment provider before deletion
5. **Document the Action**: Keep a record of why and when the user was deleted for compliance purposes

## Troubleshooting

### Cannot Delete User

If you encounter an error when trying to delete a user:

- **"Cannot delete last user with permission X"**: This user is the last one with a critical permission. Assign this permission to another user first.
- **"Action not allowed"**: You don't have the `Manage Users` permission.
- **"User not found"**: The user may have already been deleted or doesn't exist.

### Subscription Cancellation Failed

If a subscription fails to cancel:

1. Note the subscription ID from the error message
2. Manually cancel the subscription in your payment provider's dashboard
3. Try the deletion again

## Stuck somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
