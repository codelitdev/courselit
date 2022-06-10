/**
 * Business logic for managing courses.
 */
import slugify from "slugify";
import CourseModel, { Course } from "../../models/Course";
import User from "../../models/User";
import { responses } from "../../config/strings";
import {
    checkIfAuthenticated,
    validateOffset,
    extractPlainTextFromDraftJS,
    checkPermission,
    checkOwnershipWithoutModel,
    makeModelTextSearchable,
} from "../../lib/graphql";
import constants from "../../config/constants";
import { validateBlogPosts } from "./helpers";
import Lesson from "../../models/Lesson";
import GQLContext from "../../models/GQLContext";
import Filter from "./models/filter";

const { open, itemsPerPage, blogPostSnippetLength, permissions } = constants;

const getCourseOrThrow = async (id: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    const course = await CourseModel.findOne({
        _id: id,
        domain: ctx.subdomain._id,
    });

    if (!course) {
        throw new Error(responses.item_not_found);
    }

    if (!checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])) {
        if (!checkOwnershipWithoutModel(course, ctx)) {
            throw new Error(responses.item_not_found);
        } else {
            if (
                !checkPermission(ctx.user.permissions, [
                    permissions.manageCourse,
                ])
            ) {
                throw new Error(responses.action_not_allowed);
            }
        }
    }

    return course;
};

export const getCourse = async (
    id: string | null = null,
    courseId: string | null = null,
    ctx: GQLContext
) => {
    if (!id && !courseId) {
        throw new Error(responses.invalid_course_id);
    }

    let course;
    if (id) {
        course = await CourseModel.findOne({
            _id: id,
            domain: ctx.subdomain._id,
        });
    } else {
        course = await CourseModel.findOne({
            courseId,
            domain: ctx.subdomain._id,
        });
    }

    if (!course) {
        throw new Error(responses.item_not_found);
    }

    if (ctx.user) {
        if (
            checkPermission(ctx.user.permissions, [
                permissions.manageAnyCourse,
            ]) ||
            checkOwnershipWithoutModel(course, ctx)
        ) {
            return course;
        }
    }

    if (course.published) {
        return course;
    } else {
        throw new Error(responses.item_not_found);
    }
};

export const createCourse = async (courseData: Course, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageCourse])) {
        throw new Error(responses.action_not_allowed);
    }

    courseData = await validateBlogPosts(courseData, ctx);

    const course = await CourseModel.create({
        domain: ctx.subdomain._id,
        title: courseData.title,
        cost: courseData.cost,
        privacy: courseData.privacy,
        isBlog: courseData.isBlog,
        isFeatured: courseData.isFeatured,
        description: courseData.description,
        featuredImage: courseData.featuredImage,
        creatorId: ctx.user.userId || ctx.user._id,
        creatorName: ctx.user.name,
        slug: slugify(courseData.title.toLowerCase()),
        tags: courseData.tags,
    });

    return course;
};

export const updateCourse = async (courseData, ctx) => {
    let course = await getCourseOrThrow(courseData.id, ctx);

    for (const key of Object.keys(courseData)) {
        if (
            key === "published" &&
            !checkPermission(ctx.user.permissions, [permissions.publishCourse])
        ) {
            throw new Error(responses.action_not_allowed);
        }

        course[key] = courseData[key];
    }

    course = await validateBlogPosts(course, ctx);
    course = await course.save();
    return course;
};

export const deleteCourse = async (id, ctx) => {
    const course = await getCourseOrThrow(id, ctx);

    if (course.lessons.length > 0) {
        throw new Error(responses.course_not_empty);
    }

    try {
        await course.remove();
        return true;
    } catch (err) {
        throw new Error(err.message);
    }
};

export const addLesson = async (courseId, lessonId, ctx) => {
    const course = await getCourseOrThrow(courseId, ctx);

    if (course.lessons.indexOf(lessonId) === -1) {
        course.lessons.push(lessonId);
    }

    try {
        await course.save();
    } catch (err) {
        return false;
    }

    return true;
};

export const removeLesson = async (courseId, lessonId, ctx) => {
    const course = await getCourseOrThrow(courseId, ctx);

    if (~course.lessons.indexOf(lessonId)) {
        course.lessons.splice(course.lessons.indexOf(lessonId), 1);
    }

    try {
        await course.save();
    } catch (err) {
        return false;
    }

    return true;
};

export const getCoursesAsAdmin = async (offset, ctx, text) => {
    checkIfAuthenticated(ctx);
    validateOffset(offset);
    const user = ctx.user;

    if (
        !checkPermission(user.permissions, [
            permissions.manageCourse,
            permissions.manageAnyCourse,
        ])
    ) {
        throw new Error(responses.action_not_allowed);
    }

    const query = {
        domain: ctx.subdomain._id,
    };
    if (!checkPermission(user.permissions, [permissions.manageAnyCourse])) {
        query.creatorId = `${user.userId || user.id}`;
    }

    if (text) query.$text = { $search: text };
    const SearchableCourse = makeModelTextSearchable(CourseModel);

    const resultSet = await SearchableCourse(
        { offset, query, graphQLContext: ctx },
        {
            itemsPerPage,
            sortByColumn: "updatedAt",
            sortOrder: -1,
        }
    );

    return resultSet;
};

export const getCourses = async ({
    offset,
    ctx,
    tag,
    filterBy,
}: {
    offset: number;
    ctx: GQLContext;
    tag?: string;
    filterBy?: Filter;
}) => {
    validateOffset(offset);
    const query: Record<string, unknown> = {
        published: true,
        privacy: open.toLowerCase(),
        domain: ctx.subdomain._id,
    };
    if (tag) {
        query.tags = tag;
    }
    if (filterBy) {
        query.isBlog = filterBy === "post" ? true : false;
    }

    const courses = await CourseModel.find(
        query,
        "id title cost isBlog description creatorName updatedAt slug featuredImage courseId isFeatured tags groups"
    )
        .sort({ updatedAt: -1 })
        .skip((offset - 1) * itemsPerPage)
        .limit(itemsPerPage);

    return courses.map((x) => ({
        id: x.id,
        title: x.title,
        cost: x.cost,
        isBlog: x.isBlog,
        description: extractPlainTextFromDraftJS(
            x.description,
            blogPostSnippetLength
        ),
        creatorName: x.creatorName,
        updatedAt: x.updatedAt,
        slug: x.slug,
        featuredImage: x.featuredImage,
        courseId: x.courseId,
        tags: x.tags,
        isFeatured: x.isFeatured,
        groups: x.isBlog ? null : x.groups,
    }));
};

// export const getCourses = async ({ offset, tag, ctx }: {
//     offset: number;
//     tag?: string;
//     ctx: GQLContext;
// }) => {
//   const query: Record<string, unknown> = {
//     isBlog: false,
//     published: true,
//     privacy: open.toLowerCase(),
//     domain: ctx.subdomain._id,
//   };
//   if (tag) {
//     query.tags = tag;
//   }

//   let dbQuery = CourseModel.find(
//     query,
//     "id title featuredImage cost creatorName slug description updatedAt isFeatured courseId tags"
//   ).sort({ updatedAt: -1 });
//   dbQuery = dbQuery.skip((offset - 1) * itemsPerPage).limit(itemsPerPage);

//   return dbQuery;
// };

export const getEnrolledCourses = async (userId, ctx) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])) {
        throw new Error(responses.action_not_allowed);
    }

    const user = await User.findOne({ _id: userId, domain: ctx.subdomain._id });
    if (!user) {
        throw new Error(responses.user_not_found);
    }

    return CourseModel.find(
        {
            _id: {
                $in: [...user.purchases],
            },
            domain: ctx.subdomain._id,
        },
        "id title"
    );
};

export const addGroup = async ({ id, name, collapsed, ctx }) => {
    const course = await getCourseOrThrow(id, ctx);
    const existingName = (group) => group.name === name;

    if (course.groups.some(existingName)) {
        throw new Error(responses.existing_group);
    }

    const maximumRank = course.groups.reduce(
        (acc, value) => (value.rank > acc ? value.rank : acc),
        0
    );

    await course.groups.push({
        rank: maximumRank + 1000,
        name,
    });

    await course.save();

    return course;
};

export const removeGroup = async (id, courseId, ctx) => {
    const course = await getCourseOrThrow(courseId, ctx);
    const group = course.groups.filter((group) => group._id.toString() === id);

    if (!group[0]) {
        return course;
    }

    const countOfAssociatedLessons = await Lesson.countDocuments({
        courseId,
        groupName: group.name,
    });

    if (countOfAssociatedLessons > 0) {
        throw new Error(responses.group_not_empty);
    }

    await course.groups.pull({ _id: id });
    await course.save();

    return course;
};

export const updateGroup = async ({
    id,
    courseId,
    name,
    rank,
    collapsed,
    ctx,
}) => {
    const course = await getCourseOrThrow(courseId, ctx);

    const $set = {};
    if (name) {
        const existingName = (group) =>
            group.name === name && group._id.toString() !== id;

        if (course.groups.some(existingName)) {
            throw new Error(responses.existing_group);
        }

        $set["groups.$.name"] = name;
    }

    if (rank) {
        $set["groups.$.rank"] = rank;
    }

    if (typeof collapsed === "boolean") {
        $set["groups.$.collapsed"] = collapsed;
    }

    return await CourseModel.findOneAndUpdate(
        {
            _id: course._id.toString(),
            "groups._id": id,
        },
        { $set },
        { new: true }
    );
};

// export const updateGroupName = async (id, courseId, name, ctx) => {
//   const course = await getCourseOrThrow(courseId, ctx);
//   const existingName = (group) => group.name === name;

//   if (course.groups.some(existingName)) {
//     throw new Error(responses.existing_group);
//   }

//   return await CourseModel.findOneAndUpdate(
//     {
//       _id: course._id.toString(),
//       "groups._id": id,
//     },
//     {
//       $set: {
//         "groups.$.name": name,
//       },
//     },
//     {
//       new: true,
//     }
//   );
// };

// export const updateGroupRank = async (id, courseId, rank, ctx) => {
//   const course = await getCourseOrThrow(courseId, ctx);

//   return await CourseModel.findOneAndUpdate(
//     {
//       _id: course._id.toString(),
//       "groups._id": id,
//     },
//     {
//       $set: {
//         "groups.$.rank": rank,
//       },
//     },
//     {
//       new: true,
//     }
//   );
// };
