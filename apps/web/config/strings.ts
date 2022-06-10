/**
 * This file provides strings used app wide.
 */

export const responses = {
    // passportjs responses
    error: "Error",
    user_created: "User created",
    not_logged_in: "Not logged in",
    passport_js_unauthorized: "Unauthorized",
    name_required: "Name field is required",
    email_or_passwd_invalid: "Email or password is invalid",
    auth_user_not_found: "No account was found with this email id",
    email_already_registered: "This email is already registered",
    domain_missing: "Domain is missing",
    domain_doesnt_exist: "Domain does not exist",
    cross_domain_access_prohibited: "Invalid credentials",
    locked: "Account locked",
    not_valid_subscription: "No valid subscription found",
    sign_in_mail_prefix: "Sign in to ",
    sign_in_mail_body: "Click the following link to sign in.",
    sign_in_link_text: "Sign in",

    // graphql responses
    invalid_permission: "Invalid permission",
    user_not_found: "User not found.",
    request_not_authenticated: "Request not authenticated",
    content_cannot_be_null: "Content cannot be empty",
    media_id_cannot_be_null: "Media Id cannot be empty",
    item_not_found: "Item not found",
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
    stripe_invalid_settings: "Stripe configuration is invalid.",
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
    invalid_format: "Invalid format",
    no_thumbnail: "No thumbnail available",
    file_size_exceeded: "File size exceeded",
    name_is_required: "Name is required",
    mimetype_is_required: "Mimetype is required",
    existing_group: "A group with that name exists",
    group_not_empty: "The group has associated lessons",
    update_payment_method:
        "You need to set up a payment method to create paid content.",
    currency_iso_code_required:
        "Currency ISO code is required. Examples: usd, inr, gbp etc.",
    currency_unit_required:
        "A currency symbol is required. Examples: $, ₹, £ etc.",
    school_title_not_set:
        "Give your school a title before setting payment info.",
    internal_error: "An internal error occurred. Please try again.",
    publicly_inaccessible: "Image should be publicly accessible.",
    presigned_url_failed: "That did not work! Please go back and try again.",
    file_uploaded: "The file is uploaded. Go back to see your media.",
    media_deleted: "The media is deleted. Go back to see your media.",
    invalid_access_type: "The access type can either be public or private.",
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
};
