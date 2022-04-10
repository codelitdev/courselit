import {
  GraphQLString,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLList,
  GraphQLID,
  GraphQLBoolean,
} from "graphql";
import types from "./types";
import {
  getCourse,
  getCoursesAsAdmin,
  getPosts,
  getCourses,
  getEnrolledCourses,
} from "./logic";
import GQLContext from "../../models/GQLContext";

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
  getPosts: {
    type: new GraphQLList(types.postType),
    args: {
      offset: {
        type: new GraphQLNonNull(GraphQLInt),
      },
    },
    resolve: (_: any, { offset }: { offset: number }, context: GQLContext) =>
      getPosts(offset, context),
  },
  getCourses: {
    type: new GraphQLList(types.publicCoursesType),
    args: {
      offset: {
        type: new GraphQLNonNull(GraphQLInt),
      },
      onlyShowFeatured: {
        type: GraphQLBoolean,
      },
    },
    resolve: (
      _: any,
      {
        offset,
        onlyShowFeatured,
      }: { offset: number; onlyShowFeatured: boolean },
      context: GQLContext
    ) => getCourses(offset, onlyShowFeatured, context),
  },
  getEnrolledCourses: {
    type: new GraphQLList(types.creatorOrAdminCoursesItemType),
    args: {
      userId: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve: (_: any, { userId }: { userId: string }, context: GQLContext) =>
      getEnrolledCourses(userId, context),
  },
};
