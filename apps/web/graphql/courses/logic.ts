/**
 * Business logic for managing courses.
 */
import CourseModel from "../../models/Course";
import UserModel from "../../models/User";
import { responses } from "../../config/strings";
import {
    checkIfAuthenticated,
    validateOffset,
    extractPlainTextFromDraftJS,
    checkOwnershipWithoutModel,
} from "../../lib/graphql";
import constants from "../../config/constants";
import {
    calculatePercentageCompletion,
    getPaginatedCoursesForAdmin,
    setupBlog,
    setupCourse,
    validateCourse,
} from "./helpers";
import Lesson from "../../models/Lesson";
import GQLContext from "../../models/GQLContext";
import Filter from "./models/filter";
import mongoose from "mongoose";
import { Course, Group } from "@courselit/common-models";
import { deleteAllLessons } from "../lessons/logic";
import { deleteMedia } from "../../services/medialit";
import PageModel from "../../models/Page";
import { Progress } from "../../models/Progress";
import { getPrevNextCursor } from "../lessons/helpers";
import { checkPermission } from "@courselit/utils";

const { open, itemsPerPage, blogPostSnippetLength, permissions } = constants;

export const getCourseOrThrow = async (
    id: mongoose.Types.ObjectId | undefined,
    ctx: GQLContext,
    courseId?: string
) => {
    checkIfAuthenticated(ctx);

    const query = courseId
        ? {
              courseId,
          }
        : {
              _id: id,
          };

    const course = await CourseModel.findOne({
        ...query,
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

export const getCourse = async (id: string, ctx: GQLContext) => {
    const course = await CourseModel.findOne({
        courseId: id,
        domain: ctx.subdomain._id,
    });

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
        if ([constants.course, constants.download].includes(course.type)) {
            const { nextLesson } = await getPrevNextCursor(
                course.courseId,
                ctx.subdomain._id
            );
            course.firstLesson = nextLesson;
        }
        return course;
    } else {
        throw new Error(responses.item_not_found);
    }
};

export const createCourse = async (
    courseData: { title: string; type: Filter },
    ctx: GQLContext
) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageCourse])) {
        throw new Error(responses.action_not_allowed);
    }

    if (courseData.type === "blog") {
        return await setupBlog({
            title: courseData.title,
            ctx,
        });
    } else {
        return await setupCourse({
            title: courseData.title,
            type: courseData.type,
            ctx,
        });
    }
};

export const updateCourse = async (
    courseData: Partial<Course>,
    ctx: GQLContext
) => {
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

    course = await validateCourse(course, ctx);
    course = await course.save();
    await PageModel.updateOne(
        { entityId: course.courseId, domain: ctx.subdomain._id },
        { $set: { name: course.title } }
    );
    return course;
};

export const deleteCourse = async (
    id: mongoose.Types.ObjectId,
    ctx: GQLContext
) => {
    const course = await getCourseOrThrow(id, ctx);

    await deleteAllLessons(course.courseId, ctx);
    if (course.featuredImage) {
        await deleteMedia(course.featuredImage);
    }
    await PageModel.deleteOne({
        entityId: course.courseId,
        domain: ctx.subdomain._id,
    });
    await course.remove();
    return true;
};

export const getCoursesAsAdmin = async ({
    offset,
    context,
    searchText,
    filterBy,
}: {
    offset: number;
    context: GQLContext;
    searchText?: string;
    filterBy?: Filter[];
}) => {
    checkIfAuthenticated(context);
    validateOffset(offset);
    const user = context.user;

    if (
        !checkPermission(user.permissions, [
            permissions.manageCourse,
            permissions.manageAnyCourse,
        ])
    ) {
        throw new Error(responses.action_not_allowed);
    }

    const query: Partial<Omit<Course, "type">> & {
        $text?: Record<string, unknown>;
        type?: string | { $in: string[] };
    } = {
        domain: context.subdomain._id,
    };
    if (!checkPermission(user.permissions, [permissions.manageAnyCourse])) {
        query.creatorId = `${user.userId || user.id}`;
    }

    if (filterBy) {
        query.type = { $in: filterBy };
    } else {
        query.type = { $in: [constants.download, constants.course] };
    }

    if (searchText) query.$text = { $search: searchText };

    return await getPaginatedCoursesForAdmin({
        query,
        page: offset,
    });
};

export const getCourses = async ({
    offset,
    ctx,
    tag,
    filterBy,
    ids,
}: {
    ctx: GQLContext;
    offset?: number;
    ids?: string[];
    tag?: string;
    filterBy?: Filter[];
}) => {
    const query: Record<string, unknown> = {
        published: true,
        privacy: open.toLowerCase(),
        domain: ctx.subdomain._id,
    };

    let courses;
    if (ids) {
        query.courseId = {
            $in: ids,
        };
        courses = await CourseModel.find(query, {
            id: 1,
            title: 1,
            cost: 1,
            description: 1,
            type: 1,
            creatorName: 1,
            updatedAt: 1,
            slug: 1,
            featuredImage: 1,
            courseId: 1,
            tags: 1,
            groups: 1,
            pageId: 1,
        });
    } else {
        validateOffset(offset);
        if (tag) {
            query.tags = tag;
        }
        if (filterBy) {
            query.type = { $in: filterBy };
        }
        courses = await CourseModel.find(query, {
            id: 1,
            title: 1,
            cost: 1,
            description: 1,
            type: 1,
            creatorName: 1,
            updatedAt: 1,
            slug: 1,
            featuredImage: 1,
            courseId: 1,
            tags: 1,
            groups: 1,
            pageId: 1,
        })
            .sort({ updatedAt: -1 })
            .skip((offset! - 1) * itemsPerPage)
            .limit(itemsPerPage);
    }

    return courses.map((x) => ({
        id: x.id,
        title: x.title,
        cost: x.cost,
        description: extractPlainTextFromDraftJS(
            x.description,
            blogPostSnippetLength
        ),
        type: x.type,
        creatorName: x.creatorName,
        updatedAt: x.updatedAt,
        slug: x.slug,
        featuredImage: x.featuredImage,
        courseId: x.courseId,
        tags: x.tags,
        groups: x.isBlog ? null : x.groups,
        pageId: x.isBlog ? undefined : x.pageId,
    }));
};

export const getEnrolledCourses = async (userId: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])) {
        if (userId !== ctx.user.userId) {
            throw new Error(responses.action_not_allowed);
        }
    }

    const user = await UserModel.findOne({ userId, domain: ctx.subdomain._id });
    if (!user) {
        throw new Error(responses.user_not_found);
    }

    const enrolledCourses = await CourseModel.find(
        {
            courseId: {
                $in: [
                    ...user.purchases.map(
                        (course: Progress) => course.courseId
                    ),
                ],
            },
            domain: ctx.subdomain._id,
        },
        {
            courseId: 1,
            title: 1,
            lessons: 1,
            type: 1,
            slug: 1,
        }
    );

    return enrolledCourses.map((course) => ({
        courseId: course.courseId,
        title: course.title,
        type: course.type,
        slug: course.slug,
        progress: calculatePercentageCompletion(user, course),
    }));
};

export const addGroup = async ({
    id,
    name,
    collapsed,
    ctx,
}: {
    id: mongoose.Types.ObjectId;
    name: string;
    collapsed: boolean;
    ctx: GQLContext;
}) => {
    const course = await getCourseOrThrow(id, ctx);
    const existingName = (group: Group) => group.name === name;

    if (course.groups.some(existingName)) {
        throw new Error(responses.existing_group);
    }

    const maximumRank = course.groups.reduce(
        (acc: number, value: { rank: number }) =>
            value.rank > acc ? value.rank : acc,
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

export const getStudents = async ({
    course,
    ctx,
    text,
}: {
    course: Course;
    ctx: GQLContext;
    text?: string;
}) => {
    const matchCondition = text
        ? {
              $match: {
                  "purchases.courseId": course.courseId,
                  domain: ctx.subdomain._id,
                  $or: [
                      { email: new RegExp(text) },
                      { name: new RegExp(text) },
                  ],
              },
          }
        : {
              $match: {
                  "purchases.courseId": course.courseId,
                  domain: ctx.subdomain._id,
              },
          };

    const result = await UserModel.aggregate([
        matchCondition,
        {
            $addFields: {
                completedLessons: {
                    $filter: {
                        input: "$purchases",
                        as: "t",
                        cond: {
                            $eq: ["$$t.courseId", course.courseId],
                        },
                    },
                },
            },
        },
        {
            $unwind: "$completedLessons",
        },
        {
            $addFields: {
                progress: "$completedLessons.completedLessons",
                signedUpOn: "$completedLessons.createdAt",
                lastAccessedOn: "$completedLessons.updatedAt",
            },
        },
        {
            $project: {
                userId: 1,
                email: 1,
                name: 1,
                progress: 1,
                signedUpOn: 1,
                lastAccessedOn: 1,
            },
        },
    ]);

    return result;
};
