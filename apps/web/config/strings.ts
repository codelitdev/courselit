/**
 * This file provides strings used app wide.
 */
import { UIConstants } from "@courselit/common-models";

export const responses = {
    error: "Error",
    domain_missing: "Domain is missing",
    domain_doesnt_exist: "Domain does not exist",
    domain_super_admin_email_missing:
        "SUPER_ADMIN_EMAIL environment variable is not defined",
    not_valid_subscription: "No valid subscription found",
    sign_in_mail_prefix: "Sign in to ",
    sign_in_mail_body: "Click the following link to sign in.",
    sign_in_link_text: "Sign in",

    // graphql responses
    past_date: "Date cannot be in the past",
    invalid_permission: "Invalid permission",
    user_not_found: "User not found.",
    request_not_authenticated: "Request not authenticated",
    content_cannot_be_null: "Content cannot be empty",
    media_id_cannot_be_null: "Media cannot be empty",
    item_not_found: "Item not found",
    drip_not_released: "This section is not yet released for you",
    not_a_creator: "You do not have rights to perform this action",
    course_not_empty: "Delete all lessons before trying deleting the course",
    invalid_offset: "Invalid offset",
    is_not_admin: "Insufficient privileges",
    is_not_admin_or_creator: "Insufficient privileges",
    blog_description_empty: "Description field is required",
    cannot_convert_to_blog:
        "The course has lessons hence cannot be converted to a post",
    cost_not_provided: "Cost field is required",
    invalid_cost: "Invalid cost",
    cannot_add_to_blogs: "Cannot add lessons to a blog post",
    file_is_required: "A file is required",
    error_in_moving_file: "Error in moving file",
    success: "success",
    user_name_cant_be_null: "Name cannot be null",
    action_not_allowed: "You do not have rights to perform this action",
    invalid_input: "Invalid input",
    payment_invalid_settings: "configuration is invalid.",
    unrecognised_currency_code: "Unrecognised currency code",
    only_admins_can_purchase:
        "Only admins can purchase courses on behalf of others",
    course_already_purchased: "You have already purchased this item",
    payment_settings_invalid_suffix: "settings are invalid",
    invalid_course_id: "Invalid course ID",
    invalid_user_id: "Invalid user ID",
    payment_settings_invalid:
        "Payment method is not set up. Please contact site admin.",
    not_enrolled: "You are not enrolled in the course",
    currency_iso_not_set:
        "Currency ISO code is not set. Please contact site admin.",
    payment_method_not_saved:
        "Set a payment method before setting its corresponding secret key",
    invalid_payment_method: "Invalid payment method",
    invalid_theme: "Invalid theme",
    theme_not_installed: "The theme is not installed",
    invalid_layout: "Invalid layout",
    destination_dont_exist: "Destination does not exist",
    page_exists: "A page with the URL already exists",
    invalid_format: "Invalid format",
    no_thumbnail: "No thumbnail available",
    file_size_exceeded: "File size exceeded",
    name_is_required: "Name is required",
    mimetype_is_required: "Mimetype is required",
    existing_group: "A group with that name exists",
    group_not_empty: "This section has lessons. Delete them before proceeding",
    update_payment_method:
        "You need to set up a payment method to create paid content.",
    currency_iso_code_required:
        "Currency ISO code is required. Examples: usd, inr, gbp etc.",
    currency_unit_required:
        "A currency symbol is required. Examples: $, ₹, £ etc.",
    school_title_not_set:
        "Give your school a title before setting payment info.",
    internal_error: "An internal error occurred. Please try again.",
    presigned_url_failed: "That did not work! Please go back and try again.",
    file_uploaded: "The file is uploaded. Go back to see your media.",
    media_deleted: "The media is deleted. Go back to see your media.",
    invalid_access_type: "The access type can either be public or private.",
    answers_missing: "Answers are missing.",
    cannot_be_evaluated: "This lesson cannot be evaluated.",
    need_to_pass: "You need to pass this test in order to mark it completed.",
    no_correct_answer:
        "Every question needs to have at least one correct answer.",
    no_empty_option: "Options without text are not allowed in questions.",
    medialit_apikey_notfound: "You need to configure MediaLit to upload files.",
    mail_already_sent: "The mail is already sent",
    mail_subject_length_exceeded: `Subject cannot be longer than ${UIConstants.MAIL_SUBJECT_MAX_LENGTH} characters`,
    mail_max_recipients_exceeded: `Total number of recipients cannot exceed ${UIConstants.MAIL_MAX_RECIPIENTS}`,
    invalid_mail: "To, Subject and Body fields are required",
    email_delivery_failed_for_all_recipients:
        "Email delivery failed for all recipients",
    courses_cannot_be_downloaded: "A course cannot be offered as a download.",
    apikey_already_exists: "Apikey with that name already exists",
    sequence_details_missing: "Some sequence details are missing",
    invalid_emails_order: "Invalid emails order",
    no_published_emails: "No published emails",
    sequence_not_active: "Sequence not active",
    sequence_already_started: "Sequence already started",
    mailing_address_too_short: "Mailing address is too short",
    mandatory_tags_missing: "Mandatory tags are missing",
    cannot_delete_last_email: "Cannot delete the last email in the sequence",
    invalid_drip_email: "Drip email needs a subject and a body",
    cannot_invite_to_unpublished_product:
        "Cannot invite customers to an unpublished product",

    // api responses
    digital_download_no_files:
        "This digital download is empty. Please contact the creator.",
    download_link_expired: "The download link has expired",
    user_already_exists: "The user already exists",
    unsubscribe_success:
        "Sorry to see you go. You have been unsubscribed from our mailing list.",
};

export const internal = {
    error_unrecognised_payment_method: "Unrecognized payment method",
    error_payment_method_not_implemented: "Not yet implemented",
    error_db_connection_failed:
        "Unable to establish a connection to the database.",
    error_env_var_undefined: "A required environment variable is not defined",
    app_running: "CourseLit server is running on",
    invalid_cloud_storage_settings: "Cloud storage settings are invalid",
    domain_not_specified: "Domain is not specified",
    default_group_name: "First section",
    default_email_broadcast_subject: "Untitled broadcast",
    default_email_sequence_subject: "First email",
    default_email_sequence_name: "Untitled Sequence",
    default_email_content:
        "<p>Replace this with actual content.</p>\n<p>You can use <b>HTML</b>.</p>\n<p>We also support <a href='https://shopify.github.io/liquid/'>Liquid</a>.</p>\n<br>\n<p>Our mailing address is:</p>\n<p>{{ address }}</p>\n<a href=\"{{ unsubscribe_link}}\">Unsubscribe</a>",
};
