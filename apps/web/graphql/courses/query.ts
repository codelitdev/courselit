import {
    GraphQLString,
    GraphQLInt,
    GraphQLNonNull,
    GraphQLList,
    GraphQLID,
    GraphQLEnumType,
} from "graphql";
import types from "./types";
import {
    getCourse,
    getCoursesAsAdmin,
    getCourses,
    getEnrolledCourses,
} from "./logic";
import GQLContext from "../../models/GQLContext";
import Filter from "./models/filter";
import constants from "../../config/constants";
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
        },
        resolve: (_: any, { id }: { id: string }, context: GQLContext) =>
            getCourse(id, context),
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
            context: GQLContext
        ) => getCoursesAsAdmin({ offset, context, searchText, filterBy }),
    },
    //   getPosts: {
    //     type: new GraphQLList(types.postType),
    //     args: {
    //       offset: {
    //         type: new GraphQLNonNull(GraphQLInt),
    //       },
    //       tag: {
    //         type: GraphQLString
    //       },
    //     },
    //     resolve: (_: any, { offset, tag }: { offset: number, tag?: string }, ctx: GQLContext) =>
    //       getPosts({ offset, tag, ctx }),
    //   },
    getCourses: {
        type: new GraphQLList(types.publicCoursesType),
        args: {
            offset: {
                type: new GraphQLNonNull(GraphQLInt),
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
                tag,
                filterBy,
            }: { offset: number; tag?: string; filterBy?: Filter[] },
            ctx: GQLContext
        ) => getCourses({ offset, tag, filterBy, ctx }),
    },
    getEnrolledCourses: {
        type: new GraphQLList(types.enrolledCourses),
        args: {
            userId: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: (
            _: any,
            { userId }: { userId: string },
            context: GQLContext
        ) => getEnrolledCourses(userId, context),
    },
};
