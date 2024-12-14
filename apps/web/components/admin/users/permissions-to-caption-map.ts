import { UIConstants } from "@courselit/common-models";
const { permissions } = UIConstants;
import {
    PERM_COURSE_MANAGE,
    PERM_COURSE_MANAGE_ANY,
    PERM_COURSE_PUBLISH,
    PERM_ENROLL_IN_COURSE,
    PERM_MEDIA_MANAGE,
    PERM_SETTINGS,
    PERM_USERS,
    PERM_SITE,
    PERM_POST_IN_COMMUNITY,
    PERM_COMMENT_IN_COMMUNITY,
    PERM_MANAGE_COMMUNITY,
} from "@ui-config/strings";

const permissionToCaptionMap = {
    [permissions.manageCourse]: PERM_COURSE_MANAGE,
    [permissions.manageAnyCourse]: PERM_COURSE_MANAGE_ANY,
    [permissions.publishCourse]: PERM_COURSE_PUBLISH,
    [permissions.enrollInCourse]: PERM_ENROLL_IN_COURSE,
    [permissions.manageMedia]: PERM_MEDIA_MANAGE,
    [permissions.manageSite]: PERM_SITE,
    [permissions.manageSettings]: PERM_SETTINGS,
    [permissions.manageUsers]: PERM_USERS,
    [permissions.postInCommunity]: PERM_POST_IN_COMMUNITY,
    [permissions.commentInCommunity]: PERM_COMMENT_IN_COMMUNITY,
    [permissions.manageCommunity]: PERM_MANAGE_COMMUNITY,
};

export default permissionToCaptionMap;
