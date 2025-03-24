import {
    GraphQLString,
    GraphQLInt,
    GraphQLNonNull,
    GraphQLList,
    GraphQLEnumType,
    GraphQLBoolean,
} from "graphql";
import types from "./types";
import {
    getCourse,
    getCoursesAsAdmin,
    getCourses,
    // getEnrolledCourses,
    getCourseOrThrow,
    getMembers,
    getProducts,
    getProductsCount,
} from "./logic";
import GQLContext from "../../models/GQLContext";
import Filter from "./models/filter";
import constants from "../../config/constants";
import { reports, courseMember } from "./types/reports";
import userTypes from "../users/types";
import { MembershipStatus } from "@courselit/common-models";

const { course, download, blog } = constants;

const courseFilters = new GraphQLEnumType({
    name: "CourseFilters",
    values: {
        [course.toUpperCase()]: { value: course },
        [download.toUpperCase()]: { value: download },
        [blog.toUpperCase()]: { value: blog },
    },
});

export default {
    getCourse: {
        type: types.courseType,
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLString),
            },
            asGuest: {
                type: GraphQLBoolean,
            },
        },
        resolve: (
            _: any,
            { id, asGuest }: { id: string; asGuest?: boolean },
            context: GQLContext,
        ) => getCourse(id, context, asGuest),
    },
    getCoursesAsAdmin: {
        type: new GraphQLList(types.adminCourseItemType),
        args: {
            offset: {
                type: new GraphQLNonNull(GraphQLInt),
            },
            searchText: {
                type: GraphQLString,
            },
            filterBy: {
                type: new GraphQLList(courseFilters),
            },
        },
        resolve: (
            _: any,
            {
                offset,
                searchText,
                filterBy,
            }: { offset: number; searchText?: string; filterBy?: Filter },
            context: GQLContext,
        ) => getCoursesAsAdmin({ offset, context, searchText, filterBy }),
    },
    getProducts: {
        type: new GraphQLList(types.courseType),
        args: {
            page: {
                type: GraphQLInt,
            },
            limit: {
                type: GraphQLInt,
            },
            filterBy: {
                type: new GraphQLList(courseFilters),
            },
            tags: {
                type: new GraphQLList(GraphQLString),
            },
            ids: {
                type: new GraphQLList(GraphQLString),
            },
            publicView: {
                type: GraphQLBoolean,
            },
            sort: {
                type: GraphQLInt,
            },
        },
        resolve: (
            _: any,
            {
                page,
                limit,
                filterBy,
                tags,
                ids,
                publicView,
                sort,
            }: {
                page: number;
                limit: number;
                filterBy?: Filter[];
                tags?: string[];
                ids?: string[];
                publicView?: boolean;
                sort?: number;
            },
            context: GQLContext,
        ) =>
            getProducts({
                page,
                limit,
                filterBy,
                tags,
                ids,
                publicView,
                sort,
                ctx: context,
            }),
    },
    getProductsCount: {
        type: GraphQLInt,
        args: {
            filterBy: { type: new GraphQLList(courseFilters) },
            tags: { type: new GraphQLList(GraphQLString) },
            ids: { type: new GraphQLList(GraphQLString) },
            publicView: {
                type: GraphQLBoolean,
            },
        },
        resolve: (
            _: any,
            {
                filterBy,
                tags,
                ids,
                publicView,
            }: {
                filterBy?: Filter[];
                tags?: string[];
                ids?: string[];
                publicView?: boolean;
            },
            ctx: GQLContext,
        ) => getProductsCount({ ctx, filterBy, tags, ids, publicView }),
    },
    getReports: {
        type: reports,
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: (_: any, { id }: { id: string }, ctx: GQLContext) =>
            getCourseOrThrow(undefined, ctx, id),
    },
    getProductMembers: {
        type: new GraphQLList(courseMember),
        args: {
            courseId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            page: {
                type: GraphQLInt,
            },
            limit: {
                type: GraphQLInt,
            },
            status: {
                type: userTypes.membershipStatusType,
            },
        },
        resolve: (
            _: any,
            {
                courseId,
                page,
                limit,
                status,
            }: {
                courseId: string;
                page?: number;
                limit?: number;
                status?: MembershipStatus;
            },
            ctx: GQLContext,
        ) =>
            getMembers({
                courseId,
                ctx,
                page,
                limit,
                status,
            }),
    },
    getCourses: {
        type: new GraphQLList(types.publicCoursesType),
        args: {
            offset: {
                type: GraphQLInt,
            },
            ids: {
                type: new GraphQLList(GraphQLString),
            },
            tag: {
                type: GraphQLString,
            },
            filterBy: {
                type: new GraphQLList(courseFilters),
            },
        },
        resolve: (
            _: any,
            {
                offset,
                ids,
                tag,
                filterBy,
            }: {
                offset?: number;
                ids?: string[];
                tag?: string;
                filterBy?: Filter[];
            },
            ctx: GQLContext,
        ) => getCourses({ offset, ids, tag, filterBy, ctx }),
    },
    // getEnrolledCourses: {
    //     type: new GraphQLList(types.enrolledCourses),
    //     args: {
    //         userId: {
    //             type: new GraphQLNonNull(GraphQLString),
    //         },
    //     },
    //     resolve: (
    //         _: any,
    //         { userId }: { userId: string },
    //         context: GQLContext,
    //     ) => getEnrolledCourses(userId, context),
    // },
};
