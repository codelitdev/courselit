import { responses } from "../config/strings";
import constants from "../config/constants";
import type GQLContext from "../models/GQLContext";

export const checkIfAuthenticated = (ctx: GQLContext) => {
    if (!ctx.user) throw new Error(responses.request_not_authenticated);
};

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const isObjectIdLike = (value: unknown) =>
    typeof value === "string" && OBJECT_ID_REGEX.test(value);

export const checkOwnership =
    (Model: any) => async (id: string, ctx: GQLContext) => {
        const item = await Model.queryOne({
            _id: id,
            domain: ctx.subdomain._id,
        });
        const creatorId = item?.creatorId ? String(item.creatorId) : "";
        if (
            !item ||
            (isObjectIdLike(creatorId)
                ? creatorId !== ctx.user._id.toString()
                : creatorId !== ctx.user.userId.toString())
        ) {
            throw new Error(responses.item_not_found);
        }

        return item;
    };

export const checkOwnershipWithoutModel = <T extends { creatorId: unknown }>(
    item: T | null,
    ctx: GQLContext,
) => {
    const creatorId = item?.creatorId ? String(item.creatorId) : "";
    if (
        !item ||
        (isObjectIdLike(creatorId)
            ? creatorId !== ctx.user._id.toString()
            : creatorId !== ctx.user.userId.toString())
    ) {
        return false;
    }

    return true;
};

export const validateOffset = (offset?: number) => {
    if (!offset || offset < 1) throw new Error(responses.invalid_offset);
};

const validateMongooseTextSearchQuery = (query: any) => {
    if (typeof query !== "object") {
        throw new Error(responses.invalid_input);
    }
};

interface SearchData {
    offset?: number;
    query: Record<string, unknown>;
    graphQLContext: GQLContext;
}
interface SearchOptions {
    checkIfRequestIsAuthenticated?: boolean;
    itemsPerPage?: number;
    sortByColumn?: string;
    sortOrder?: 1 | -1;
}
// TODO: simplify this
export const makeModelTextSearchable =
    (Model: any) =>
    async (searchData: SearchData, options: SearchOptions = {}) => {
        const itemsPerPage = options.itemsPerPage || constants.itemsPerPage;
        const checkIfRequestIsAuthenticated =
            options.checkIfRequestIsAuthenticated ?? true;
        const offset = (searchData.offset || constants.defaultOffset) - 1;

        validateSearchInput(searchData, checkIfRequestIsAuthenticated);

        const queryOptions: Record<string, unknown> = {};
        if (itemsPerPage !== Infinity) {
            queryOptions.skip = offset * itemsPerPage;
            queryOptions.limit = itemsPerPage;
        }
        if (options.sortByColumn && options.sortOrder) {
            queryOptions.sort = {
                [options.sortByColumn]: options.sortOrder,
            };
        }

        return Model.query(searchData.query, undefined, queryOptions);
    };

const validateSearchInput = (
    searchData: SearchData,
    checkIfRequestIsAuthenticated: boolean,
) => {
    validateOffset(searchData.offset);
    validateMongooseTextSearchQuery(searchData.query);
    if (checkIfRequestIsAuthenticated) {
        checkIfAuthenticated(searchData.graphQLContext);
    }
};

/*
export const checkPermission = (
    actualPermissions: string[],
    desiredPermissions: string[]
) =>
    actualPermissions.some((permission) =>
        desiredPermissions.includes(permission)
    );
*/
