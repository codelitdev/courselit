import {
    GraphQLNonNull,
    GraphQLBoolean,
    GraphQLID,
    GraphQLString,
    GraphQLInt,
    GraphQLList,
} from "graphql";
import types from "./types";
import {
    createCourse,
    updateCourse,
    deleteCourse,
    removeGroup,
    addGroup,
    updateGroup,
    updateCourseCertificateTemplate,
} from "./logic";
import Filter from "./models/filter";
import GQLContext from "../../models/GQLContext";
import mediaTypes from "../media/types";

export default {
    createCourse: {
        type: types.courseType,
        args: {
            courseData: {
                type: new GraphQLNonNull(types.courseInputType),
            },
        },
        resolve: async (
            _: unknown,
            { courseData }: { courseData: { title: string; type: Filter } },
            context: GQLContext,
        ) => createCourse(courseData, context),
    },
    updateCourse: {
        type: types.courseType,
        args: {
            courseData: {
                type: new GraphQLNonNull(types.courseUpdateInput),
            },
        },
        resolve: async (_: unknown, { courseData }, context) =>
            updateCourse(courseData, context),
    },
    deleteCourse: {
        type: new GraphQLNonNull(GraphQLBoolean),
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: async (_: unknown, { id }, context) =>
            deleteCourse(id, context),
    },
    addGroup: {
        type: types.courseType,
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLString),
            },
            name: {
                type: new GraphQLNonNull(GraphQLString),
            },
            collapsed: {
                type: GraphQLBoolean,
            },
        },
        resolve: async (_: unknown, { id, name, collapsed }, context) =>
            addGroup({ id, name, collapsed, ctx: context }),
    },
    removeGroup: {
        type: types.courseType,
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLString),
            },
            courseId: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: async (_: unknown, { id, courseId }, context) =>
            removeGroup(id, courseId, context),
    },
    updateGroup: {
        type: types.courseType,
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLID),
            },
            courseId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            name: {
                type: GraphQLString,
            },
            rank: {
                type: GraphQLInt,
            },
            collapsed: {
                type: GraphQLBoolean,
            },
            lessonsOrder: {
                type: new GraphQLList(GraphQLString),
            },
            drip: {
                type: types.dripInputType,
            },
        },
        resolve: async (
            _: unknown,
            { id, courseId, name, rank, collapsed, lessonsOrder, drip },
            context,
        ) =>
            updateGroup({
                id,
                courseId,
                name,
                rank,
                collapsed,
                lessonsOrder,
                drip,
                ctx: context,
            }),
    },
    updateCourseCertificateTemplate: {
        type: types.certificateTemplateType,
        args: {
            courseId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            title: {
                type: GraphQLString,
            },
            subtitle: {
                type: GraphQLString,
            },
            description: {
                type: GraphQLString,
            },
            signatureImage: {
                type: mediaTypes.mediaInputType,
            },
            signatureName: {
                type: GraphQLString,
            },
            signatureDesignation: {
                type: GraphQLString,
            },
            logo: {
                type: mediaTypes.mediaInputType,
            },
        },
        resolve: (
            _: any,
            {
                courseId,
                title,
                subtitle,
                description,
                signatureImage,
                signatureName,
                signatureDesignation,
                logo,
            }: {
                courseId: string;
                title: string;
                subtitle: string;
                description: string;
                signatureImage: string;
                signatureName: string;
                signatureDesignation: string;
                logo: string;
            },
            context: GQLContext,
        ) =>
            updateCourseCertificateTemplate({
                courseId,
                ctx: context,
                title,
                subtitle,
                description,
                signatureImage,
                signatureName,
                signatureDesignation,
                logo,
            }),
    },
};
