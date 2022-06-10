import {
    GraphQLString,
    GraphQLInt,
    GraphQLNonNull,
    GraphQLList,
    GraphQLID,
    GraphQLBoolean,
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

const courseFilters = new GraphQLEnumType({
    name: "CourseFilters",
    values: {
        COURSE: { value: "course" },
        POST: { value: "post" },
    },
});

export default {
    getCourse: {
        type: types.courseType,
        args: {
            id: {
                type: GraphQLString,
            },
            courseId: {
                type: GraphQLString,
            },
        },
        resolve: (
            _: any,
            { id, courseId }: { id: string | null; courseId: string | null },
            context: GQLContext
        ) => getCourse(id, courseId, context),
    },
    getCoursesAsAdmin: {
        type: new GraphQLList(types.creatorOrAdminCoursesItemType),
        args: {
            offset: {
                type: new GraphQLNonNull(GraphQLInt),
            },
            searchText: {
                type: GraphQLString,
            },
        },
        resolve: (
            _: any,
            { offset, searchText }: { offset: number; searchText: string },
            context: GQLContext
        ) => getCoursesAsAdmin(offset, context, searchText),
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
                type: courseFilters,
            },
        },
        resolve: (
            _: any,
            {
                offset,
                tag,
                filterBy,
            }: { offset: number; tag?: string; filterBy?: Filter },
            ctx: GQLContext
        ) => getCourses({ offset, tag, filterBy, ctx }),
    },
    getEnrolledCourses: {
        type: new GraphQLList(types.creatorOrAdminCoursesItemType),
        args: {
            userId: {
                type: new GraphQLNonNull(GraphQLID),
            },
        },
        resolve: (
            _: any,
            { userId }: { userId: string },
            context: GQLContext
        ) => getEnrolledCourses(userId, context),
    },
};
