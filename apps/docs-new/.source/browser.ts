// @ts-nocheck
import { browser } from "fumadocs-mdx/runtime/browser";
import type * as Config from "../source.config";

const create = browser<
    typeof Config,
    import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
        DocData: {};
    }
>();
const browserCollections = {
    docs: create.doc("docs", {
        "index.mdx": () => import("../content/docs/index.mdx?collection=docs"),
        "blog/introduction.mdx": () =>
            import("../content/docs/blog/introduction.mdx?collection=docs"),
        "blog/publish.mdx": () =>
            import("../content/docs/blog/publish.mdx?collection=docs"),
        "communities/create.mdx": () =>
            import("../content/docs/communities/create.mdx?collection=docs"),
        "communities/delete.mdx": () =>
            import("../content/docs/communities/delete.mdx?collection=docs"),
        "communities/grant-access-to-additional-products.mdx": () =>
            import(
                "../content/docs/communities/grant-access-to-additional-products.mdx?collection=docs"
            ),
        "communities/introduction.mdx": () =>
            import(
                "../content/docs/communities/introduction.mdx?collection=docs"
            ),
        "communities/manage-members.mdx": () =>
            import(
                "../content/docs/communities/manage-members.mdx?collection=docs"
            ),
        "communities/manage-reported-content.mdx": () =>
            import(
                "../content/docs/communities/manage-reported-content.mdx?collection=docs"
            ),
        "courses/add-content.mdx": () =>
            import("../content/docs/courses/add-content.mdx?collection=docs"),
        "courses/certificates.mdx": () =>
            import("../content/docs/courses/certificates.mdx?collection=docs"),
        "courses/create.mdx": () =>
            import("../content/docs/courses/create.mdx?collection=docs"),
        "courses/introduction.mdx": () =>
            import("../content/docs/courses/introduction.mdx?collection=docs"),
        "courses/invite-customers.mdx": () =>
            import(
                "../content/docs/courses/invite-customers.mdx?collection=docs"
            ),
        "courses/publish.mdx": () =>
            import("../content/docs/courses/publish.mdx?collection=docs"),
        "courses/reports.mdx": () =>
            import("../content/docs/courses/reports.mdx?collection=docs"),
        "courses/section.mdx": () =>
            import("../content/docs/courses/section.mdx?collection=docs"),
        "courses/set-a-price-for-product.mdx": () =>
            import(
                "../content/docs/courses/set-a-price-for-product.mdx?collection=docs"
            ),
        "courses/visibility.mdx": () =>
            import("../content/docs/courses/visibility.mdx?collection=docs"),
        "developers/introduction.mdx": () =>
            import(
                "../content/docs/developers/introduction.mdx?collection=docs"
            ),
        "developers/manage-users.mdx": () =>
            import(
                "../content/docs/developers/manage-users.mdx?collection=docs"
            ),
        "downloads/create.mdx": () =>
            import("../content/docs/downloads/create.mdx?collection=docs"),
        "downloads/introduction.mdx": () =>
            import(
                "../content/docs/downloads/introduction.mdx?collection=docs"
            ),
        "downloads/lead-magnet.mdx": () =>
            import("../content/docs/downloads/lead-magnet.mdx?collection=docs"),
        "downloads/set-a-price.mdx": () =>
            import("../content/docs/downloads/set-a-price.mdx?collection=docs"),
        "email-marketing/analytics.mdx": () =>
            import(
                "../content/docs/email-marketing/analytics.mdx?collection=docs"
            ),
        "email-marketing/broadcasts.mdx": () =>
            import(
                "../content/docs/email-marketing/broadcasts.mdx?collection=docs"
            ),
        "email-marketing/introduction.mdx": () =>
            import(
                "../content/docs/email-marketing/introduction.mdx?collection=docs"
            ),
        "email-marketing/mail-access-request.mdx": () =>
            import(
                "../content/docs/email-marketing/mail-access-request.mdx?collection=docs"
            ),
        "email-marketing/sequences.mdx": () =>
            import(
                "../content/docs/email-marketing/sequences.mdx?collection=docs"
            ),
        "email-marketing/templates.mdx": () =>
            import(
                "../content/docs/email-marketing/templates.mdx?collection=docs"
            ),
        "getting-started/features.mdx": () =>
            import(
                "../content/docs/getting-started/features.mdx?collection=docs"
            ),
        "getting-started/quick-start.mdx": () =>
            import(
                "../content/docs/getting-started/quick-start.mdx?collection=docs"
            ),
        "getting-started/vision.mdx": () =>
            import(
                "../content/docs/getting-started/vision.mdx?collection=docs"
            ),
        "lessons/add-quiz.mdx": () =>
            import("../content/docs/lessons/add-quiz.mdx?collection=docs"),
        "lessons/embed.mdx": () =>
            import("../content/docs/lessons/embed.mdx?collection=docs"),
        "lessons/scorm.mdx": () =>
            import("../content/docs/lessons/scorm.mdx?collection=docs"),
        "schools/add-custom-domain.mdx": () =>
            import(
                "../content/docs/schools/add-custom-domain.mdx?collection=docs"
            ),
        "schools/create.mdx": () =>
            import("../content/docs/schools/create.mdx?collection=docs"),
        "schools/delete.mdx": () =>
            import("../content/docs/schools/delete.mdx?collection=docs"),
        "schools/google-sign-in.mdx": () =>
            import(
                "../content/docs/schools/google-sign-in.mdx?collection=docs"
            ),
        "schools/introduction.mdx": () =>
            import("../content/docs/schools/introduction.mdx?collection=docs"),
        "schools/set-up-payments.mdx": () =>
            import(
                "../content/docs/schools/set-up-payments.mdx?collection=docs"
            ),
        "schools/sso.mdx": () =>
            import("../content/docs/schools/sso.mdx?collection=docs"),
        "self-hosting/cloud-vs-self-hosting.mdx": () =>
            import(
                "../content/docs/self-hosting/cloud-vs-self-hosting.mdx?collection=docs"
            ),
        "self-hosting/introduction.mdx": () =>
            import(
                "../content/docs/self-hosting/introduction.mdx?collection=docs"
            ),
        "self-hosting/self-host.mdx": () =>
            import(
                "../content/docs/self-hosting/self-host.mdx?collection=docs"
            ),
        "users/delete.mdx": () =>
            import("../content/docs/users/delete.mdx?collection=docs"),
        "users/filters.mdx": () =>
            import("../content/docs/users/filters.mdx?collection=docs"),
        "users/introduction.mdx": () =>
            import("../content/docs/users/introduction.mdx?collection=docs"),
        "users/manage.mdx": () =>
            import("../content/docs/users/manage.mdx?collection=docs"),
        "users/notifications.mdx": () =>
            import("../content/docs/users/notifications.mdx?collection=docs"),
        "users/permissions.mdx": () =>
            import("../content/docs/users/permissions.mdx?collection=docs"),
        "users/segments.mdx": () =>
            import("../content/docs/users/segments.mdx?collection=docs"),
        "website/blocks.mdx": () =>
            import("../content/docs/website/blocks.mdx?collection=docs"),
        "website/create-page.mdx": () =>
            import("../content/docs/website/create-page.mdx?collection=docs"),
        "website/edit.mdx": () =>
            import("../content/docs/website/edit.mdx?collection=docs"),
        "website/introduction.mdx": () =>
            import("../content/docs/website/introduction.mdx?collection=docs"),
        "website/rich-text.mdx": () =>
            import("../content/docs/website/rich-text.mdx?collection=docs"),
        "website/sales-pages.mdx": () =>
            import("../content/docs/website/sales-pages.mdx?collection=docs"),
        "website/themes.mdx": () =>
            import("../content/docs/website/themes.mdx?collection=docs"),
    }),
};
export default browserCollections;
