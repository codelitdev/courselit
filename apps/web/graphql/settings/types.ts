import {
    GraphQLObjectType,
    GraphQLString,
    GraphQLInputObjectType,
    GraphQLNonNull,
    GraphQLList,
    GraphQLInt,
    GraphQLFloat,
    GraphQLBoolean,
} from "graphql";
import mediaTypes from "../media/types";
import { getMedia } from "../media/logic";
import designTypes from "../design/types";
const { mediaType } = mediaTypes;

const typefaceType = new GraphQLObjectType({
    name: "Typeface",
    fields: {
        section: { type: new GraphQLNonNull(GraphQLString) },
        typeface: { type: new GraphQLNonNull(GraphQLString) },
        fontWeights: { type: new GraphQLList(GraphQLInt) },
        fontSize: { type: GraphQLInt },
        lineHeight: { type: GraphQLInt },
        letterSpacing: { type: GraphQLInt },
        case: { type: GraphQLString },
    },
});

const typefaceInputType = new GraphQLInputObjectType({
    name: "TypefaceInput",
    fields: {
        section: { type: new GraphQLNonNull(GraphQLString) },
        typeface: { type: new GraphQLNonNull(GraphQLString) },
        fontWeights: { type: new GraphQLList(GraphQLInt) },
        fontSize: { type: GraphQLInt },
        lineHeight: { type: GraphQLInt },
        letterSpacing: { type: GraphQLInt },
        case: { type: GraphQLString },
    },
});

const siteType = new GraphQLObjectType({
    name: "SiteInfo",
    fields: {
        title: { type: GraphQLString },
        subtitle: { type: GraphQLString },
        logo: {
            type: mediaType,
            resolve: (settings, _, __, ___) => getMedia(settings.logo),
        },
        currencyISOCode: { type: GraphQLString },
        paymentMethod: { type: GraphQLString },
        stripeKey: { type: GraphQLString },
        razorpayKey: { type: GraphQLString },
        codeInjectionHead: { type: GraphQLString },
        codeInjectionBody: { type: GraphQLString },
        mailingAddress: { type: GraphQLString },
        hideCourseLitBranding: { type: GraphQLBoolean },
    },
});

const siteUpdateType = new GraphQLInputObjectType({
    name: "SiteInfoUpdateInput",
    fields: {
        title: { type: GraphQLString },
        subtitle: { type: GraphQLString },
        logo: { type: mediaTypes.mediaInputType },
        codeInjectionHead: { type: GraphQLString },
        codeInjectionBody: { type: GraphQLString },
        mailingAddress: { type: GraphQLString },
        hideCourseLitBranding: { type: GraphQLBoolean },
    },
});

const sitePaymentUpdateType = new GraphQLInputObjectType({
    name: "SitePaymentUpdateInput",
    fields: {
        currencyISOCode: { type: GraphQLString },
        paymentMethod: { type: GraphQLString },
        stripeKey: { type: GraphQLString },
        stripeSecret: { type: GraphQLString },
        stripeWebhookSecret: { type: GraphQLString },
        paytmSecret: { type: GraphQLString },
        paypalSecret: { type: GraphQLString },
        razorpayKey: { type: GraphQLString },
        razorpaySecret: { type: GraphQLString },
        razorpayWebhookSecret: { type: GraphQLString },
    },
});

const mailQuota = new GraphQLObjectType({
    name: "MailQuota",
    fields: {
        daily: { type: GraphQLInt },
        monthly: { type: GraphQLInt },
        dailyCount: { type: GraphQLInt },
        monthlyCount: { type: GraphQLInt },
        lastDailyCountUpdate: { type: GraphQLFloat },
        lastMonthlyCountUpdate: { type: GraphQLFloat },
    },
});

const quota = new GraphQLObjectType({
    name: "Quota",
    fields: {
        mail: { type: mailQuota },
    },
});

const domain = new GraphQLObjectType({
    name: "Domain",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        settings: { type: siteType },
        theme: { type: designTypes.themeType },
        typefaces: { type: new GraphQLList(typefaceType) },
        draftTypefaces: { type: new GraphQLList(typefaceType) },
        quota: { type: quota },
    },
});

const apikeyType = new GraphQLObjectType({
    name: "Apikey",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        keyId: { type: new GraphQLNonNull(GraphQLString) },
        createdAt: { type: GraphQLFloat },
    },
});

const newApikeyType = new GraphQLObjectType({
    name: "NewApikey",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        keyId: { type: new GraphQLNonNull(GraphQLString) },
        key: { type: new GraphQLNonNull(GraphQLString) },
    },
});

const apikeyUpdateInput = new GraphQLInputObjectType({
    name: "ApikeyUpdateInput",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
    },
});

const types = {
    siteUpdateType,
    sitePaymentUpdateType,
    domain,
    typefaceInputType,
    apikeyType,
    apikeyUpdateInput,
    newApikeyType,
};

export default types;
