---
title: Delete a Community
description: Guide to safely deleting communities and all associated data
layout: ../../../layouts/MainLayout.astro
---

Deleting a community is a permanent operation that removes the community and all its associated data from your school. This includes all posts, comments, members, and payment plans.

> **Important**: Community deletion is permanent and cannot be undone. All community content, memberships, and payment plans will be permanently removed.

## How Community Deletion Works

When you delete a community, CourseLit performs a comprehensive cleanup:

1. **Content Deletion**: Removes all posts, comments, and reports
2. **Membership Cleanup**: Cancels all memberships and payment plans
3. **Page Removal**: Deletes the community's public page
4. **Media Cleanup**: Removes all associated media files
5. **Community Document**: Deletes the community itself

## Prerequisites

To delete a community, you must have the `Manage Community` permission.

> **Note**: Even community moderators cannot delete a community. Only users with the `Manage Community` permission (typically site admins) can perform this operation.

## Deleting a Community

1. Navigate to the **Communities** area from your admin dashboard
2. Select the community you want to delete
3. Click on **Manage** to open settings
4. Scroll down to the Danger zone and click on **Delete Community** button

    ![Delete community](/assets/communities/delete-community.png)

5. Confirm the deletion when prompted

## What Gets Deleted

### Community Content

All content within the community is permanently removed:

- **Posts**: All posts created in the community
- **Comments**: All comments on posts, including nested replies
- **Reports**: All content reports filed by members
- **Media**: All images, videos, and files uploaded to posts (when media uploads are enabled)

### Memberships & Subscriptions

All membership-related data is removed:

- **Community Memberships**: All member records for the community
- **Payment Subscriptions**: All active subscriptions are automatically cancelled
- **Payment Plans**: All payment plans associated with the community
- **Included Product Memberships**: If the community's payment plans included access to courses, those memberships are also removed
- **Post Subscriptions**: All user subscriptions to community posts

### Community Infrastructure

The community's infrastructure is removed:

- **Community Page**: The public-facing community page
- **Community Settings**: All configuration and settings
- **Categories**: All community categories
- **Featured Images**: Community banner and featured images

### Related Data

Additional data associated with the community:

- **Activities**: Activity logs related to payment plan enrollments
- **Notifications**: Notifications related to the community (for members)

## What Happens to Members

When a community is deleted:

1. **Active Subscriptions**: All payment subscriptions are automatically cancelled through your payment provider (Stripe, PayPal, etc.)
2. **Membership Records**: All membership records are permanently deleted
3. **Access Revoked**: Members immediately lose access to the community
4. **Included Products**: If members had access to courses through the community's payment plan, that access is also revoked

## Payment Plan Considerations

### Subscription Cancellations

- All active subscriptions are cancelled automatically
- Payment providers (Stripe, PayPal, etc.) are notified
- No further charges will occur
- Members will not receive refunds automatically

### Included Products

If your community's payment plans [included access to courses](/en/communities/grant-access-to-additional-products) or other products:

- All memberships to those products (activated through the community plan) are removed
- Activity logs for those memberships are deleted
- Direct purchases of those products (not through the community) are not affected

## Media Cleanup

The deletion process handles media files appropriately:

- **Community Images**: Featured images and banners are deleted
- **Post Media**: When media uploads are enabled, all media from posts is deleted
- **User Avatars**: Not affected (user avatars are tied to user accounts, not communities)

> **Note**: Currently, media uploads in community posts are not enabled. When this feature is activated, the deletion process will handle post media cleanup automatically.

## Safety Measures

CourseLit implements safety measures to ensure proper deletion:

1. **Permission Check**: Only users with `Manage Community` permission can delete
2. **Confirmation Required**: Deletion requires explicit confirmation
3. **Atomic Operation**: The entire deletion succeeds or fails as a unit
4. **Subscription Cancellation**: Automatic cancellation prevents future charges

## Before Deleting a Community

Consider these steps before deleting:

1. **Notify Members**: Inform community members about the upcoming deletion
2. **Export Data**: If you need to preserve any content, export it manually. Only works for self-hosted installations.
3. **Handle Refunds**: Process any necessary refunds through your payment provider
4. **Alternative Actions**: Consider making the community private instead of deleting it

## After Deletion

After a community is deleted:

- The community page returns a 404 error
- Members cannot access the community anymore
- All content is permanently lost
- Payment subscriptions are cancelled
- The community name becomes available for reuse

## Handling Refunds

Community deletion does not automatically issue refunds. To handle refunds:

1. **Before Deletion**: Note all active subscriptions and their subscription IDs
2. **Access Payment Provider**: Log into your Stripe, PayPal, or other payment provider dashboard
3. **Process Refunds**: Manually issue refunds as appropriate
4. **Delete Community**: Once refunds are processed, proceed with deletion

## Alternative to Deletion

If you want to preserve content but stop new members from joining:

1. **Disable the Community**: Toggle the community to "disabled" in settings
2. **Remove Payment Plans**: Archive all payment plans

This approach preserves content while preventing new access.

## Troubleshooting

### Cannot Delete Community

If you encounter errors:

- **"Action not allowed"**: You don't have the `Manage Community` permission
- **"Item not found"**: The community may have already been deleted or doesn't exist
- **"Community not found"**: You may not have access to this community

### Subscription Cancellation Issues

If subscriptions fail to cancel:

1. Manually cancel subscriptions in your payment provider's dashboard
2. Contact support if issues persist

### Partial Deletion

If deletion fails partway through:

- The operation is designed to be atomic, but in rare cases, partial deletion may occur
- Contact support with error details
- Manual cleanup may be required

## Best Practices

1. **Communicate Early**: Give members advance notice before deletion
2. **Export Important Content**: Save any valuable discussions or content
3. **Process Refunds First**: Handle refunds before deleting to maintain records
4. **Document the Decision**: Keep records of why and when the community was deleted
5. **Consider Alternatives**: Evaluate if disabling is sufficient instead of deletion

## GDPR and Data Protection

Community deletion helps with data protection compliance:

- All member data within the community is removed
- Personal information in posts and comments is deleted
- Membership records are permanently erased
- The operation can be part of a broader data cleanup strategy

## Stuck somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
