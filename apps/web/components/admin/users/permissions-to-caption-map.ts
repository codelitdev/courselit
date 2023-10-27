import { UIConstants } from "@courselit/common-models";
const { permissions } = UIConstants;
import {
    PERM_COURSE_MANAGE,
    PERM_COURSE_MANAGE_ANY,
    PERM_COURSE_PUBLISH,
    PERM_ENROLL_IN_COURSE,
    PERM_MEDIA_MANAGE,
    PERM_MEDIA_MANAGE_ANY,
    PERM_MEDIA_VIEW_ANY,
    PERM_MEDIA_UPLOAD,
    PERM_SETTINGS,
    PERM_USERS,
    PERM_SITE,
} from "@ui-config/strings";

const permissionToCaptionMap = {
    [permissions.manageCourse]: PERM_COURSE_MANAGE,
    [permissions.manageAnyCourse]: PERM_COURSE_MANAGE_ANY,
    [permissions.publishCourse]: PERM_COURSE_PUBLISH,
    [permissions.enrollInCourse]: PERM_ENROLL_IN_COURSE,
    [permissions.viewAnyMedia]: PERM_MEDIA_VIEW_ANY,
    [permissions.uploadMedia]: PERM_MEDIA_UPLOAD,
    [permissions.manageMedia]: PERM_MEDIA_MANAGE,
    [permissions.manageAnyMedia]: PERM_MEDIA_MANAGE_ANY,
    [permissions.manageSite]: PERM_SITE,
    [permissions.manageSettings]: PERM_SETTINGS,
    [permissions.manageUsers]: PERM_USERS,
};

export default permissionToCaptionMap;
