import constants from "../config/constants";

/**
 * This file provides application wide strings.
 */
export const ERR_ALL_FIELDS_REQUIRED = "All fields are required.";
export const ERR_PASSWORDS_DONT_MATCH = "Passwords do not match.";
export const SIGNUP_SUCCESS = "Sign up successful. Please sign in.";
export const ERR_COURSE_TITLE_REQUIRED = "A title is required.";
export const ERR_COURSE_COST_REQUIRED = "Cost is required.";

// Replies from the backend
export const RESP_API_USER_CREATED = "User created";

// Placeholder texts
export const CREATOR_AREA_LINK_TEXT = "Create";
export const CREATOR_AREA_PAGE_TITLE = "Dashboard";
export const GENERIC_TITLE = "My Course Site";
export const GENERIC_SUBTITLE = "Learn new skills";
export const GENERIC_LOGO_PATH = "";
export const GENERIC_SIGNIN_TEXT = "Sign in";
export const GENERIC_SIGNUP_TEXT = "Sign up";
export const GENERIC_SIGNOUT_TEXT = "Sign out";
export const GENERIC_CURRENCY_UNIT = "";
export const GENERIC_STRIPE_PUBLISHABLE_KEY_TEXT = "";
export const GENERIC_CURRENCY_ISO_CODE = "";
export const GENERIC_PAYMENT_METHOD = "";
export const GENERIC_CODE_INJECTION_HEAD = "";

// UI texts
export const BTN_LOAD_MORE = "Load More";
export const MEDIA_UPLOAD_BUTTON_TEXT = "Upload";
export const MEDIA_UPLOADING = "Uploading...";
export const MEDIA_ADD_NEW_BUTTON_TEXT = "Add new";
export const BUTTON_CANCEL_TEXT = "Cancel";
export const BUTTON_CANCEL_SCHEDULED_MAIL = "Cancel sending";
export const MEDIA_SEARCH_INPUT_PLACEHOLDER = "Search your media";
export const LOAD_MORE_TEXT = "Load more";
export const MANAGE_MEDIA_BUTTON_TEXT = "Insert media";
export const MANAGE_COURSES_PAGE_HEADING = "Products";
export const MANAGE_PAGES_PAGE_HEADING = "Pages";
export const BREADCRUMBS_EDIT_LESSON_COURSE_NAME = "Product";
export const NEW_PAGE_HEADING = "New page";
export const USERS_MANAGER_PAGE_HEADING = "Users";
export const BTN_MANAGE_TAGS = "Manage tags";
export const USERS_TAG_HEADER = "Tags";
export const USERS_TAG_NEW_HEADER = "New tag";
export const TAG_TABLE_HEADER_NAME = "Tag name";
export const BTN_NEW_TAG = "New tag";
export const TAG_TABLE_HEADER_SUBS_COUNT = "Tagged users count";
export const TAGS_TABLE_CONTEXT_MENU_DELETE_PRODUCT = "Delete tag";
export const TAGS_TABLE_CONTEXT_MENU_UNTAG = "Untag users";
export const UNTAG_POPUP_DESC =
    "This will remove the tag from all the users tagged with this tag. The users will remain in the system.";
export const UNTAG_POPUP_HEADER = "Untag users tagged with";
export const DELETE_TAG_POPUP_HEADER = "Delete tag";
export const DELETE_TAG_POPUP_DESC =
    "This will untag the users tagged with this tag and delete the tag. The users will remain in the system.";
export const NEW_COURSE_PAGE_HEADING = "Add course";
export const EDIT_PRODUCT_HEADER = "Edit product";
export const EDIT_BLOG = "Edit blog";
export const MEDIA_MANAGER_DIALOG_TITLE = "Add media";
export const BUTTON_NEW_COURSE = "New";
export const BUTTON_DONE_TEXT = "Done";
export const DIALOG_TITLE_FEATURED_IMAGE = "Select media";
export const BUTTON_SET_FEATURED_IMAGE = "Select";
export const BUTTON_SELECT_MEDIA = "Pick media";
export const FORM_FIELD_FEATURED_IMAGE = "Featured image";
export const BTN_DELETE_COURSE = "Delete course";
export const BTN_EXIT_COURSE = "Exit";
export const BTN_EXIT_COURSE_TOOLTIP = "Exit course";
export const BTN_ADD_VIDEO = "Add";
export const ADD_VIDEO_DIALOG_TITLE = "Embed an online video";
export const LABEL_NEW_PASSWORD = "New password";
export const BUTTON_SAVE = "Save";
export const BUTTON_SAVING = "Saving...";
export const GROUP_SETTINGS_HEADER = "Settings";
export const GROUP_LESSONS_HEADER = "Lessons";
export const BUTTON_DELETE_GROUP = "Delete Group";
export const BTN_RESET = "Reset";
export const SWITCH_ACCOUNT_ACTIVE = "Account active";
export const LABEL_CONF_PASSWORD = "Confirm password";
export const HEADER_BLOG_POSTS_SECTION = "Blog";
export const HEADER_COURSES_SECTION = "Courses";
export const HEADER_TAG_SECTION = "Content tagged with";
export const SITE_SETTINGS_TITLE = "Title";
export const SITE_SETTINGS_SUBTITLE = "Subtitle";
export const SITE_SETTINGS_CURRENCY = "Currency";
export const SITE_SETTINGS_LOGO = "Logo";
export const SITE_SETTINGS_DEFAULT_TITLE = "CourseLit";
export const SITE_SETTINGS_COURSELIT_BRANDING_CAPTION =
    "Remove CourseLit branding";
export const SITE_SETTINGS_COURSELIT_BRANDING_SUB_CAPTION = `Hide "Powered by CourseLit" on your CourseLit courses and site.`;
export const SITE_SETTINGS_PAGE_HEADING = "Settings";
export const HEADER_HELP = "Support";
export const MEDIA_SELECTOR_UPLOAD_BTN_CAPTION = "Upload a picture";
export const MEDIA_SELECTOR_REMOVE_BTN_CAPTION = "Remove picture";
export const SITE_ADMIN_SETTINGS_STRIPE_SECRET = "Stripe Secret Key";
export const SITE_ADMIN_SETTINGS_RAZORPAY_SECRET = "Razorpay Secret Key";
export const SITE_ADMIN_SETTINGS_RAZORPAY_WEBHOOK_SECRET =
    "Razorpay Webhook Secret";
export const SITE_ADMIN_SETTINGS_PAYPAL_SECRET = "Paypal Secret Key";
export const SITE_ADMIN_SETTINGS_PAYTM_SECRET = "Paytm Secret Key";
export const SITE_SETTINGS_SECTION_GENERAL = "Branding";
export const SITE_SETTINGS_SECTION_PAYMENT = "Payment";
export const SITE_ADMIN_SETTINGS_PAYMENT_METHOD = "Payment Method";
export const SITE_SETTINGS_STRIPE_PUBLISHABLE_KEY_TEXT =
    "Stripe Publishable Key";
export const SITE_SETTINGS_RAZORPAY_KEY_TEXT = "Razorpay Key";
export const SITE_SETTINGS_PAYMENT_METHOD_NONE_LABEL = "None";
export const FREE_COST = "FREE";
export const SIDEBAR_TEXT_COURSE_ABOUT = "Introduction";
export const REACT_COMPONENT_CRASHED =
    "We've encountered a problem in showing the content";
export const CHECKOUT_PAGE_TITLE = "Checkout";
export const PAYMENT_MODAL_PAYMENT_DETAILS_HEADER = "Payment details";
export const PAYMENT_MODAL_COST_PREFIX = "Cost";
export const PAYMENT_MODAL_PAY_NOW_BUTTON_CAPTION = "Pay now";
export const PAYMENT_INITIATION_FAILED =
    "Payment processing failed. Please close this popup and try again.";
export const PAYMENT_VERIFICATION_FAILED =
    "We were not able to verify your payment. Please try again.";
export const STRIPE_PUBLISHABLE_KEY_EMPTY =
    "Stripe configuration is invalid. Please contact site admin.";
export const CAPTION_TRY_AGAIN = "Try again";
export const CAPTION_CLOSE = "Close";
export const LOADING = "Loading";
export const BUTTON_NEW_LESSON_TEXT = "New Lesson";
export const EDIT_LESSON_TEXT = "Edit Lesson";
export const BUTTON_LESSON_DOWNLOAD = "Open in a new tab";
export const BUTTON_NEW_GROUP_TEXT = "New section";
export const BUTTON_MANAGE_LESSONS_TEXT = "Manage Lessons";
export const BUTTON_LESSON_VIEW_GO_BACK = "Go back to Course details";
export const BUTTON_DELETE_LESSON_TEXT = "Delete";
export const COURSE_SETTINGS_CARD_HEADER = "Settings";
export const DANGER_ZONE_HEADER = "Danger zone";
export const DANGER_ZONE_DESCRIPTION = "This action is irreversible.";
export const DELETE_COURSE_POPUP_HEADER = "Delete course?";
export const POPUP_OK_ACTION = "Delete";
export const POPUP_CANCEL_ACTION = "Cancel";
export const BTN_BACK_TO_CONTENT = "Back to content";
export const LOGIN_SECTION_HEADER = "Sign In";
export const LABEL_GROUP_NAME = "Name";
export const LABEL_DRIP_EMAIL_SUBJECT = "Subject";
export const LABEL_DRIP_DELAY = "Number of days after the last drip";
export const LABEL_DRIP_DATE = "Date";
export const BTN_LOGIN = "Continue";
export const BTN_LOGIN_NO_CODE = "Resend";
export const LOGIN_FORM_LABEL =
    "Enter your email to sign in or create an account";
export const LOGIN_NO_CODE = "Did not get the code?";
export const BTN_LOGIN_GET_CODE = "Get code";
export const BTN_LOGIN_CODE_INTIMATION = "Enter the code sent to";
export const LOGIN_FORM_DISCLAIMER = "By submitting, you accept the ";
export const SIGNUP_SECTION_HEADER = "Create an account";
export const SIGNUP_SECTION_BUTTON = "Join";
export const MEDIA_MANAGER_PAGE_HEADING = "Media";
export const BUTTON_SEARCH = "Search";
export const BUTTON_ADD_FILE = "Select a file";
export const FILE_UPLOAD_SUCCESS = "File uploaded";
export const HEADER_YOUR_MEDIA = "Your media";
export const BLOG_POST_SWITCH = "Post";
export const DOWNLOADABLE_SWITCH = "Downloadable";
export const TYPE_DROPDOWN = "Type";
export const LESSON_CONTENT_HEADER = "Text Content";
export const COURSE_CONTENT_HEADER = "Content";
export const LESSON_CONTENT_EMBED_HEADER = "Link";
export const LESSON_CONTENT_EMBED_PLACEHOLDER = "A link to YouTube video etc.";
export const CONTENT_URL_LABEL = "Media content";
export const MEDIA_MANAGER_YOUR_MEDIA_HEADER = "Your media";
export const DIALOG_SELECT_BUTTON = "Select";
export const LESSON_PREVIEW = "Preview";
export const LESSON_PREVIEW_TOOLTIP =
    "This lesson will be freely available to the users.";
export const DELETE_LESSON_POPUP_HEADER = "Delete lesson";
export const APP_MESSAGE_COURSE_DELETED = "Product deleted";
export const APP_MESSAGE_LESSON_DELETED = "Lesson deleted";
export const APP_MESSAGE_LESSON_SAVED = "Lesson details saved";
export const APP_MESSAGE_COURSE_SAVED = "Course details saved";
export const ENROLL_IN_THE_COURSE =
    "You need to be enrolled in the course to view this lesson.";
export const NOT_ENROLLED_HEADER = "Content Locked";
export const USER_ERROR_HEADER = "Yikes!";
export const ENROLL_BUTTON_TEXT = "Buy now";
export const BUTTON_DELETE_MEDIA = "Delete";
export const DELETE_MEDIA_POPUP_HEADER = "Delete this file?";
export const HEADER_EDITING_MEDIA = "Edit media";
export const MEDIA_EDITOR_HEADER_EDIT_DETAILS = "Details";
export const HEADER_MEDIA_PREVIEW = "Preview";
export const PREVIEW_PDF_FILE = "Preview in a new tab";
export const APP_MESSAGE_MEDIA_DELETED = "Media deleted";
export const APP_MESSAGE_MEDIA_UPDATED = "Media details updated";
export const PAGE_HEADER_ALL_COURSES = "Courses";
export const PAGE_HEADER_ALL_POSTS = "Blog";
export const COURSE_TYPE_BLOG = "Blog";
export const BACK_TO_BLOG = "Back to all blogs";
export const COURSE_TYPE_COURSE = "Course";
export const COURSE_CREATOR_PREFIX = "By";
export const APP_MESSAGE_SETTINGS_SAVED = "Settings saved";
export const ENROLLED_COURSES_HEADER = "Enrolled courses";
export const SITE_APIKEYS_SETTING_HEADER = "API Keys";
export const SITE_MAILS_HEADER = "Mails";
export const BROADCASTS = "Broadcasts";
export const SEQUENCES = "Sequences";
export const SITE_MAILING_ADDRESS_SETTING_HEADER = "Mailing Address";
export const SITE_MAILING_ADDRESS_SETTING_EXPLANATION =
    "This is required in order to comply with the CAN-SPAM Act.";
export const MAIL_REQUEST_RECEIVED =
    "Your request is updated. We will get back to you shortly.";
export const MAIL_REQUEST_FORM_SUBMIT_INITIAL_REQUEST_TEXT = "Request access";
export const MAIL_REQUEST_FORM_SUBMIT_UPDATE_REQUEST_TEXT = "Update reason";
export const SITE_CUSTOMISATIONS_SETTING_HEADER = "Code Injection";
export const SITE_CUSTOMISATIONS_SETTING_CODEINJECTION_HEAD =
    "Code Injection in <head>";
export const SITE_CUSTOMISATIONS_SETTING_CODEINJECTION_BODY =
    "Code Injection in <body>";
export const DISCARD_COURSE_CHANGES_POPUP_HEADER =
    "Discard changes made to the course?";
export const FEATURED_SECTION_HEADER = "Featured Resources";
export const CARD_HEADER_PAGE_LAYOUT = "Layout";
export const CARD_HEADER_THEME = "Themes";
export const CARD_DESCRIPTION_PAGE_LAYOUT =
    "Use the '+' buttons to add your favorite components to the desired sections of your page.";
export const ADD_COMPONENT_POPUP_HEADER = "Add widgets";
export const APP_MESSAGE_CHANGES_SAVED = "Changes saved";
export const SUBHEADER_COURSES_SECTION =
    "Learn new skills with our carefully crafted courses.";
export const SUBHEADER_FEATURED_SECTION =
    "Hand picked resources by the editors.";
export const SUBHEADER_THEME_ADD_THEME = "New theme";
export const SUBHEADER_THEME_ADDED_THEME = "Installed themes";
export const SUBHEADER_THEME_ADD_THEME_INPUT_LABEL = "Theme Editor";
export const SUBHEADER_THEME_ADD_THEME_INPUT_PLACEHOLDER =
    "Paste valid JSON here";
export const BUTTON_GET_THEMES = "Get more themes";
export const ERROR_SNACKBAR_PREFIX = "Error";
export const BUTTON_THEME_APPLY = "Apply";
export const BUTTON_THEME_UNINSTALL = "Uninstall";
export const BUTTON_THEME_INSTALL = "Install";
export const BUTTON_THEME_REMIX = "Remix";
export const DELETE_THEME_POPUP_HEADER = "Uninstall theme";
export const APPLY_THEME_POPUP_HEADER = "Apply theme";
export const REMIXED_THEME_PREFIX = "Remix";
export const APP_MESSAGE_THEME_COPIED = "Theme ready to edit";
export const NO_THEMES_INSTALLED = "No themes are installed";
export const APP_MESSAGE_THEME_INSTALLED = "Theme installed";
export const APP_MESSAGE_THEME_APPLIED = "Theme applied";
export const APP_MESSAGE_THEME_UNINSTALLED = "Theme uninstalled";
export const HEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK =
    "Payment Confirmation Webhook URL";
export const SUBHEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK =
    "Your payment processor sends out notifications about purchases. CourseLit needs those notifications to correctly reflect user purchases. Right click the following link and copy the link address. Paste that into your payment processor's webhook settings.";
export const PURCHASE_STATUS_PAGE_HEADER = "Purchase Status";
export const MAIN_MENU_ITEM_DASHBOARD = "Dashboard";
export const MAIN_MENU_ITEM_PROFILE = "Profile";
export const LAYOUT_SECTION_MAIN_CONTENT = "Main Content";
export const LAYOUT_SECTION_FOOTER_LEFT = "Left Section";
export const LAYOUT_SECTION_FOOTER_RIGHT = "Right Section";
export const LAYOUT_SECTION_TOP = "Top";
export const LAYOUT_SECTION_FOOTER = "Footer";
export const LAYOUT_SECTION_BOTTOM = "Bottom";
export const LAYOUT_SECTION_ASIDE = "Aside";
export const TRANSACTION_STATUS_SUCCESS = "Payment received.";
export const TRANSACTION_STATUS_SUCCESS_DETAILS =
    "Thank you. You can now head over to your course and start learning.";
export const TRANSACTION_STATUS_INITIATED = "Payment Not Yet Confirmed.";
export const TRANSACTION_STATUS_FAILED = "Payment Failed.";
export const TRANSACTION_STATUS_FAILED_DETAILS =
    "The payment service provider was unable to process your payment. Please go back and try again.";
export const VISIT_COURSE_BUTTON = "Launch course";
export const VERIFY_PAYMENT_BUTTON = "Re-check Payment Status";
export const PURCHASE_ID_HEADER = "Purchase ID";
export const PAGE_HEADER_FEATURED = "Featured Content";
export const BTN_VIEW_ALL = "View all";
export const EMPTY_COURSES_LIST_ADMIN =
    "Create your first course by clicking the + button on the top right.";
export const HEADER_RESET_PASSWORD = "Reset password";
export const HEADER_DESIGN = "Site";
export const HEADER_YOUR_PROFILE = "Your Profile";
export const PROFILE_PAGE_MESSAGE_NOT_LOGGED_IN = "to see your profile.";
export const PROFILE_PAGE_HEADER = "Profile";
export const MY_CONTENT_HEADER = "My content";
export const PROFILE_EMAIL_PREFERENCES = "Email preferences";
export const PROFILE_SECTION_DETAILS = "Personal details";
export const PROFILE_SECTION_DETAILS_NAME = "Name";
export const PROFILE_SECTION_DETAILS_EMAIL = "Email";
export const PROFILE_SECTION_DETAILS_BIO = "Bio";
export const PROFILE_SECTION_DISPLAY_PICTURE = "Profile photo";
export const PROFILE_EMAIL_PREFERENCES_NEWSLETTER_OPTION_TEXT =
    "Receive newsletter and marketing emails";
export const BTN_PUBLISH = "Publish";
export const BTN_UNPUBLISH = "Unpublish";
export const PERM_SECTION_HEADER = "Permissions";
export const USER_BASIC_DETAILS_HEADER = "Basic details";
export const USER_EMAIL_SUBHEADER = "Email";
export const USER_NAME_SUBHEADER = "Name";
export const USER_FILTER_CLEAR = "Clear filters";
export const USER_FILTER_DROPDOWN_LABEL = "Add filter";
export const USER_FILTER_BTN_LABEL = "Filters";
export const USER_FILTER_CATEGORY_EMAIL = "Email";
export const USER_FILTER_CATEGORY_PRODUCT = "Product";
export const USER_FILTER_CATEGORY_LAST_ACTIVE = "Last active";
export const USER_FILTER_CATEGORY_SIGNED_UP = "Signed up";
export const USER_FILTER_CATEGORY_SUBSCRIPTION = "Subscription";
export const USER_FILTER_CATEGORY_TAGGED = "Tag";
export const USER_FILTER_CATEGORY_PERMISSION = "Permission";
export const USER_FILTER_EMAIL_IS_EXACTLY = "Is exactly";
export const USER_FILTER_EMAIL_CONTAINS = "Contains";
export const USER_FILTER_EMAIL_NOT_CONTAINS = "Does not contain";
export const USER_FILTER_PRODUCT_HAS = "Has";
export const USER_FILTER_PRODUCT_DOES_NOT_HAVE = "Does not have";
export const USER_FILTER_APPLY_BTN = "Apply";
export const USER_FILTER_SAVE = "Save new segment";
export const USER_FILTER_SAVE_DESCRIPTION =
    "You can access the saved segments from the Segments dropdown";
export const USER_SEGMENT_DESCRIPTION = "Separate users into distinct groups.";
export const USER_FILTER_LABEL_DEFAULT = "Everyone";
export const USER_FILTER_AGGREGATOR_HEADER = "Match";
export const USER_FILTER_AGGREGATOR_ALL = "All";
export const USER_FILTER_AGGREGATOR_ANY = "Any";
export const USER_FILTER_PRODUCT_DROPDOWN_LABEL = "Select a product";
export const USER_FILTER_TAGGED_DROPDOWN_LABEL = "Select a tag";
export const USER_FILTER_PERMISSION_DROPDOWN_LABEL = "Select permission";
export const USER_DELETE_SEGMENT = "Delete Segment";
export const USER_DELETE_SEGMENT_DESCRIPTION =
    "Are you sure you want to delete ";
export const USER_FILTER_NEW_SEGMENT_NAME = "Segment name";
export const USER_FILTER_SUBSCRIPTION_SUBSCRIBED = "Subscribed";
export const USER_FILTER_SUBSCRIPTION_NOT_SUBSCRIBED = "Not subscribed";
export const USER_FILTER_CHIP_TOOLTIP = "Remove filter";
export const USER_FILTER_PERMISSION_HAS = "Has";
export const USER_FILTER_PERMISSION_DOES_NOT_HAVE = "Does not have";
export const USER_FILTER_LAST_ACTIVE_BEFORE = "Before";
export const USER_FILTER_LAST_ACTIVE_AFTER = "After";
export const USER_FILTER_LAST_ACTIVE_ON = "On";
export const USER_FILTER_SIGNED_UP_BEFORE = "Before";
export const USER_FILTER_SIGNED_UP_AFTER = "After";
export const USER_FILTER_SIGNED_UP_ON = "On";
export const USER_FILTER_DATE_RANGE_DROPDOWN_LABEL = "Select a date";
export const DOCUMENTATION_LINK_LABEL = "Learn more";
export const PERM_COURSE_MANAGE = "Manage products";
export const PERM_COURSE_MANAGE_ANY = "Manage all products";
export const PERM_COURSE_PUBLISH = "Publish content";
export const PERM_ENROLL_IN_COURSE = "Buy products";
export const PERM_MEDIA_MANAGE = "Manage files";
export const PERM_MEDIA_MANAGE_ANY = "Manage all files";
export const PERM_SITE = "Manage pages";
export const PERM_SETTINGS = "Manage settings";
export const PERM_USERS = "Manage users";
export const MEDIA_EDITOR_ORIGINAL_FILE_NAME_HEADER = "File Name";
export const GROUP_LESSON_ITEM_UNTITLED = "Untitled";
export const SECTION_GROUP_HEADER = "Sections";
export const ERROR_SIGNIN_GENERATING_LINK =
    "Error generating sign in link. Try again.";
export const ERROR = "There seems to be a problem!";
export const SIGNIN_SUCCESS_PREFIX = "A sign in link has been sent to";
export const ERROR_SIGNIN_VERIFYING_LINK =
    "We were unable to sign you in. Please try again.";
export const COURSE_STRUCTURE_SELECT_LESSON =
    "Select a lesson from the Sections area.";
export const ERROR_GROUP_NEW_LESSON_WITHOUT_SAVE =
    "Save section settings first";
export const LABEL_GROUP_COLLAPSE = "Show as expanded";
export const SEARCH_TEXTBOX_PLACEHOLDER = "Search";
export const PAGE_TITLE_404 = "Not found";
export const MEDIA_PUBLIC = "Publicly available";
export const MEDIA_DIRECT_URL = "Direct URL";
export const MEDIA_URL_COPIED = "Copied to clipboard";
export const MEDIA_FILE_TYPE = "File type";
export const UNABLE_TO_LOGOUT = "Logout failed. Try again.";
export const USER_TABLE_HEADER_NAME = "Details";
export const USER_TABLE_HEADER_JOINED = "Joined";
export const USER_TABLE_HEADER_LAST_ACTIVE = "Last login";
export const USER_TABLE_HEADER_EMAIL = "Email";
export const USER_TABLE_HEADER_NAME_NAME = "Name";
export const USER_SEGMENT_DROPDOWN_LABEL = "Segments";
export const USER_TYPE_TOOLTIP =
    "Segregate users based on their roles. Audience users are the ones who can enroll in courses. Team users are the ones who have admin rights.";
export const DIALOG_DONE_BUTTON = "Done";
export const DIALOG_EDIT_WIDGET_PREFIX = "Edit";
export const PRODUCTS_TABLE_HEADER_NAME = "Title";
export const PRODUCTS_TABLE_HEADER_TYPE = "Type";
export const PRODUCTS_TABLE_HEADER_STATUS = "Status";
export const PRODUCTS_TABLE_HEADER_STUDENTS = "Students";
export const PRODUCTS_TABLE_HEADER_SALES = "Sales";
export const PRODUCTS_TABLE_HEADER_ACTIONS = "Actions";
export const PRODUCT_STATUS_DRAFT = "Draft";
export const PRODUCT_STATUS_PUBLISHED = "Published";
export const PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT = "Delete";
export const PRODUCT_TABLE_CONTEXT_MENU_EDIT_PAGE = "Edit page";
export const PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER = "Invite a customer";
export const BTN_INVITE = "Invite";
export const BTN_GO_BACK = "Go back";
export const BTN_NEW_PRODUCT = "New product";
export const BTN_NEW_PAGE = "New page";
export const PAGE_HEADER_NEW_PRODUCT = "New Product";
export const FORM_NEW_PRODUCT_TITLE = "Title";
export const FORM_NEW_PRODUCT_TYPE = "Product type";
export const FORM_NEW_PRODUCT_TITLE_PLC = "e.g. 'Photoshop For Dummies'";
export const FORM_NEW_PRODUCT_SELECT = "Product type";
export const BTN_CONTINUE = "Continue";
export const DELETE_PRODUCT_POPUP_HEADER = "Delete product";
export const DELETE_PRODUCT_POPUP_TEXT =
    "This is an irreversible action and all the data and analytics related to this product will be deleted.";
export const FORM_NEW_PRODUCT_MENU_COURSE_SUBTITLE =
    "An online course consisting of images, videos, text and more.";
export const FORM_NEW_PRODUCT_MENU_DOWNLOADS_SUBTITLE =
    "Allow users to download file(s).";
export const NEW_SECTION_HEADER = "New section";
export const EDIT_SECTION_DRIP = "Drip";
export const DRIP_SECTION_STATUS = "Enable drip";
export const EDIT_SECTION_HEADER = "Edit section";
export const DELETE_SECTION_HEADER = "Delete section";
export const PRICING_HEADER = "Pricing";
export const PRICING_DROPDOWN = "Pick your pricing scheme";
export const PRICING_FREE = constants.costFree;
export const PRICING_FREE_LABEL = "Free";
export const PRICING_FREE_SUBTITLE =
    "People can access the content for free. The user needs to be signed in.";
export const PRICING_EMAIL = constants.costEmail;
export const PRICING_EMAIL_LABEL = "Free email delivery";
export const PRICING_EMAIL_SUBTITLE =
    "People will be sent the content over email. The user needs not be signed in.";
export const PRICING_PAID = constants.costPaid;
export const PRICING_PAID_LABEL = "Paid";
export const PRICING_PAID_SUBTITLE =
    "People can access the content after a one time payment. The user needs to be signed in.";
export const PRICING_PAID_NO_PAYMENT_METHOD =
    "Set a payment method in Settings to enable this option.";
export const PUBLISH_TAB_STATUS_TITLE = "Status";
export const PUBLISH_TAB_STATUS_SUBTITLE =
    "Take your course public or private.";
export const PUBLISH_TAB_VISIBILITY_TITLE = "Visibility";
export const PUBLISH_TAB_VISIBILITY_SUBTITLE =
    "The product stays hidden and can only be accessed by a direct URL.";
export const PAGE_TITLE_EDIT_PAGE = "Edit";
export const PAGE_TITLE_VIEW_PAGE = "View";
export const PAGE_HEADER_EDIT_PAGE = "Edit page";
export const EDIT_PAGE_MENU_ITEM = "Edit page";
export const VIEW_PAGE_MENU_ITEM = "View page";
export const EDIT_PAGE_BUTTON_UPDATE = "Publish";
export const EDIT_PAGE_BUTTON_DONE = "Done";
export const EDIT_PAGE_ADD_WIDGET_TITLE = "New block";
export const EDIT_PAGE_WIDGET_LIST_HEADER = "Page blocks";
export const THEMES_TABLE_HEADER_NAME = "Name";
export const ACCOUNT_PROGRESS_SUFFIX = "% Complete";
export const CHECKOUT_PAGE_TOTAL = "Total";
export const COURSE_PROGRESS_PREV = "Previous";
export const COURSE_PROGRESS_INTRO = "Introduction";
export const COURSE_PROGRESS_NEXT = "Complete and continue";
export const COURSE_PROGRESS_START = "Start";
export const COURSE_PROGRESS_FINISH = "Complete and finish";
export const BTN_NEW_BLOG = "New blog";
export const MANAGE_BLOG_PAGE_HEADING = "Blogs";
export const BLOG_TABLE_HEADER_NAME = "Title";
export const PAGE_HEADER_NEW_BLOG = "New blog";
export const MENU_BLOG_VISIT = "Visit blog";
export const ACCOUNT_NO_PURCHASE_PLACEHOLDER =
    "Your enrolled courses will show up here.";
export const EXPORT_CSV = "Export to CSV";
export const GENERIC_FAILURE_MESSAGE = "That didn't work. Please try again.";
export const LESSON_QUIZ_ADD_QUESTION = "Add question";
export const LESSON_QUIZ_ADD_OPTION_BTN = "Add option";
export const LESSON_QUIZ_CONTENT_HEADER = "Question";
export const LESSON_QUIZ_OPTIONS_HEADER = "Options";
export const LESSON_QUIZ_QUESION_PLACEHOLDER = "Question";
export const QUESTION_BUILDER_CORRECT_ANS_TOOLTIP = "Correct answer";
export const QUESTION_BUILDER_EXPAND_TOOLTIP = "Expand";
export const QUESTION_BUILDER_COLLAPSE_TOOLTIP = "Collapse";
export const LESSON_QUIZ_GRADED_TEXT = "This quiz requires a passing grade";
export const LESSON_QUIZ_PASSING_GRADE_LABEL = "Passing grade";
export const QUIZ_VIEWER_EVALUATE_BTN = "Check score";
export const QUIZ_VIEWER_EVALUATE_BTN_LOADING = "Checking...";
export const QUIZ_PASS_MESSAGE = "Pass! You scored";
export const QUIZ_FAIL_MESSAGE = "Fail! You scored";
export const COURSE_STUDENT_REPORT_HEADER = "Students";
export const COURSE_STUDENT_TABLE_HEADER_PROGRESS = "Progress";
export const COURSE_STUDENT_TABLE_HEADER_DOWNLOAD = "Downloaded";
export const COURSE_STUDENT_TABLE_HEADER_SIGNED_UP_ON = "Enrolled on";
export const COURSE_STUDENT_TABLE_HEADER_LAST_ACCESSED_ON = "Last accessed";
export const COURSE_STUDENT_SEARCH_BY_TEXT = "Search student";
export const COURSE_STUDENT_NO_RECORDS = "No student found";
export const QUESTION_BUILDER_DELETE_TOOLTIP = "Delete question";
export const PAGE_HEADER_EDIT_MAIL = "Compose mail";
export const PAGE_HEADER_EDIT_SEQUENCE = "Compose sequence";
export const BTN_SEND = "Send";
export const DIALOG_SEND_HEADER = "Send mail";
export const BTN_SCHEDULE = "Schedule";
export const ERROR_SUBJECT_EMPTY = "Subject cannot be empty";
export const ERROR_DELAY_EMPTY = "Scheduled date is not in the future";
export const FORM_MAIL_SCHEDULE_TIME_LABEL = "Send on";
export const BTN_SENDING = "Sending";
export const MAIL_SUBJECT_PLACEHOLDER = "Subject";
export const MAIL_PREVIEW_TITLE = "Preview Text";
export const COMPOSE_SEQUENCE_FORM_TITLE = "Sequence name";
export const COMPOSE_SEQUENCE_ENTRANCE_CONDITION_DATA =
    "Entrance condition data";
export const COMPOSE_SEQUENCE_FORM_FROM = "From";
export const COMPOSE_SEQUENCE_FROM_PLC = "John Wick";
export const COMPOSE_SEQUENCE_ENTRANCE_CONDITION = "Entrance condition";
export const COMPOSE_SEQUENCE_EDIT_DELAY = "Delay";
export const MAIL_TO_PLACEHOLDER = "To";
export const MAIL_BODY_PLACEHOLDER = "Mail content";
export const PAGE_HEADER_ALL_MAILS = "Mails";
export const SIDEBAR_MENU_MAILS = "Mails";
export const SIDEBAR_MENU_USERS = "Users";
export const SIDEBAR_MENU_SETTINGS = "Settings";
export const SIDEBAR_MENU_PAGES = "Pages";
export const SIDEBAR_MENU_PRODUCTS = "Products";
export const SIDEBAR_MENU_DASHBOARD = "Home";
export const SIDEBAR_MENU_BLOGS = "Blogs";
export const PAGE_HEADER_EDIT_USER = "Edit user";
export const PAGE_HEADER_ALL_USER = "All users";
export const TOAST_MAIL_SENT = "Mail scheduled to be sent";
export const PAGE_PLACEHOLDER_MAIL = "Your mails will show up here";
export const BTN_NEW_MAIL = "New broadcast";
export const BTN_NEW_SEQUENCE = "New sequence";
export const MAIL_TABLE_HEADER_SUBJECT = "Subject";
export const MAIL_TABLE_HEADER_RECEPIENTS = "No. of recipients";
export const MAIL_SENDER_YOU = "You";
export const MAIL_TABLE_HEADER_SENDER = "Sender";
export const MAIL_TABLE_HEADER_STATUS = "Status";
export const MAIL_TABLE_HEADER_SENT_ON = "Sent on";
export const TOOLTIP_USER_PAGE_SEND_MAIL = "Send mail to the current selection";
export const EDIT_PAGE_BUTTON_FONTS = "Fonts";
export const EDIT_PAGE_BUTTON_SEO = "SEO";
export const SEO_FORM_NAME_LABEL = "Title";
export const SEO_FORM_DESC_LABEL = "Description";
export const SEO_FORM_ROBOTS_LABEL = "Search engine visibility";
export const SEO_FORM_SOCIAL_IMAGE_LABEL = "Social card image";
export const SEO_FORM_SOCIAL_IMAGE_TOOLTIP =
    "While sharing this page on social media like Twitter or Facebook, this image will be used.";
export const EDIT_PAGE_SEO_HEADER = "SEO";
export const EDIT_PAGE_HEADER_ALL_PAGES = "Pages";
export const LOGIN_SECTION_EMAIL_INVALID = "Invalid email";
export const COMPONENT_MISSING_SUFFIX = "component is not found.";
export const LESSON_GROUP_DELETED = "Section deleted";
export const USER_PERMISSION_AREA_SUBTEXT =
    "Control what actions this user can perform in your school.";
export const APIKEY_NEW_BUTTON = "New API key";
export const APIKEY_EXISTING_HEADER = "Your API keys";
export const APIKEY_EXISTING_TABLE_HEADER_CREATED = "Created";
export const APIKEY_EXISTING_TABLE_HEADER_NAME = "Name";
export const APIKEY_NEW_HEADER = "New API key";
export const APIKEY_NEW_LABEL = "Name";
export const APIKEY_NEW_BTN_CAPTION = "Create";
export const APIKEY_NEW_GENERATED_KEY_HEADER = "Your new API key";
export const APIKEY_NEW_GENERATED_KEY_DESC =
    "Please copy it and store it securely. You won't be able to see it again.";
export const APIKEY_NEW_GENERATED_KEY_COPIED = "Copied to clipboard";
export const APIKEY_REMOVE_BTN = "Remove";
export const APIKEY_REMOVE_DIALOG_HEADER = "Remove API Key";
export const APIKYE_REMOVE_DIALOG_DESC =
    "If you are using this key in your application, removing it will break the integration. There is no going back if you remove it.";
export const USER_TAGS_SUBHEADER = "Tags";
export const PAGES_TABLE_HEADER_NAME = "Name";
export const PAGES_TABLE_HEADER_ACTIONS = "Actions";
export const NEW_PAGE_NAME_PLC = "My awesome page";
export const NEW_PAGE_URL_LABEL = "URL";
export const NEW_PAGE_URL_PLC = "my-awesome-page";
export const DELETE_PAGE_POPUP_HEADER = "Delete page?";
export const DELETE_PAGE_POPUP_TEXT =
    "This is an irreversible action and all the data related to this page will be deleted.";
export const PAGE_TABLE_CONTEXT_MENU_DELETE = "Delete";
export const APP_MESSAGE_PAGE_DELETED = "Page deleted";
export const APP_MESSAGE_MAIL_DELETED = "Mail deleted";
export const NEW_PAGE_FORM_WARNING =
    "These settings cannot be changed later on, so proceed with caution.";
export const DASHBOARD_PAGE_HEADER = "Welcome";
export const MAIL_REQUEST_FORM_REASON_FIELD = "Reason";
export const MAIL_REQUEST_FORM_REASON_PLACEHOLDER =
    "Please be as detailed as possible. This will help us review your application better.";
export const DASHBOARD_SELECT_HEADER = "Duration";
export const DELETE_EMAIL_MENU = "Delete";
export const LOGIN_SUCCESS = "Login successful. Redirecting...";
export const OVERVIEW_HEADER = "Overview";
export const HELP_HEADER = "Help";
