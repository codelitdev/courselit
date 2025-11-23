import mongoose from "mongoose";
import {
    createAdapterFactory,
    type DBAdapterDebugLogOption,
} from "better-auth/adapters";
import UserModel from "@/models/User";
import DomainModel, { Domain } from "@/models/Domain";
import VerificationToken from "@/models/VerificationToken";
import { hashCode } from "@/lib/utils";

export interface MultitenantAdapterOptions {
    getDomainFromRequest?: (request: Request) => Promise<string | null>;
    debugLogs?: DBAdapterDebugLogOption;
}

// Store domain context per request (using async local storage would be better, but this works)
let currentRequest: Request | any | null = null;

export function setRequestContext(request: Request | any | null) {
    currentRequest = request;
}

export function getRequestContext(): Request | any | null {
    return currentRequest;
}

async function getDomain(request?: Request | any): Promise<Domain | null> {
    try {
        const req = request || getRequestContext();
        if (!req) return null;

        // Handle both NextRequest and standard Request
        let domainName: string | null = null;
        if (req instanceof Request || req.headers instanceof Headers) {
            domainName = req.headers.get("domain");
        } else if (req.headers && typeof req.headers.get === "function") {
            // NextRequest case
            domainName = req.headers.get("domain");
        } else if (req.headers && typeof req.headers === "object") {
            // Fallback for different header structures
            domainName = req.headers["domain"] || req.headers.domain;
        }

        if (!domainName) return null;

        // Check if mongoose is connected
        if (mongoose.connection.readyState !== 1) {
            console.warn("Database not connected, adapter methods will fail");
            return null;
        }

        return await DomainModel.findOne<Domain>({ name: domainName });
    } catch (error) {
        console.error("Error in getDomain:", error);
        return null;
    }
}

function buildDomainWhere(domainId: mongoose.Types.ObjectId, where: any = {}) {
    return {
        ...where,
        domain: domainId,
    };
}

export function createMultitenantAdapter(
    options: MultitenantAdapterOptions = {},
) {
    return createAdapterFactory({
        config: {
            adapterId: "multitenant-mongoose",
            adapterName: "Multitenant Mongoose Adapter",
            usePlural: false,
            debugLogs: options.debugLogs ?? false,
            supportsJSON: true, // MongoDB natively supports JSON/BSON objects
            supportsDates: true,
            supportsBooleans: true,
            supportsNumericIds: false, // MongoDB uses ObjectIds, not numeric IDs
            mapKeysTransformInput: {
                id: "_id", // Transform id to _id for MongoDB
            },
            mapKeysTransformOutput: {
                _id: "id", // Transform _id back to id for Better-Auth
            },
        },
        adapter: ({
            getModelName,
            transformInput,
            transformOutput,
            transformWhereClause,
        }) => {
            // Helper to convert where array to mongoose query
            const whereArrayToMongoose = (
                whereArray: any[] | undefined,
            ): any => {
                if (!whereArray || whereArray.length === 0) return {};

                const query: any = {};
                for (const condition of whereArray) {
                    if (condition && condition.field) {
                        const field = condition.field;
                        const conditionAny = condition as any;
                        if (conditionAny.equals !== undefined) {
                            query[field] = conditionAny.equals;
                        } else if (conditionAny.in) {
                            query[field] = { $in: conditionAny.in };
                        } else if (conditionAny.notIn) {
                            query[field] = { $nin: conditionAny.notIn };
                        } else if (conditionAny.gt !== undefined) {
                            query[field] = { $gt: conditionAny.gt };
                        } else if (conditionAny.gte !== undefined) {
                            query[field] = { $gte: conditionAny.gte };
                        } else if (conditionAny.lt !== undefined) {
                            query[field] = { $lt: conditionAny.lt };
                        } else if (conditionAny.lte !== undefined) {
                            query[field] = { $lte: conditionAny.lte };
                        }
                        // Add more condition types as needed
                    }
                }
                return query;
            };

            return {
                create: async ({ model, data, select }) => {
                    const domain = await getDomain();
                    if (!domain) {
                        throw new Error("Domain not found");
                    }

                    // Transform data - better-auth handles most transformations via config
                    let transformedData = { ...data };

                    // Handle user model specifically for multitenant
                    if (model === "user" || getModelName("user") === model) {
                        transformedData = {
                            ...transformedData,
                            _id:
                                transformedData.id ||
                                new mongoose.Types.ObjectId(),
                            domain: domain._id,
                            email: (transformedData.email || "").toLowerCase(),
                            userId:
                                transformedData.userId ||
                                new mongoose.Types.ObjectId().toString(),
                            active: transformedData.active ?? true,
                            invited: transformedData.invited ?? false,
                        };
                        delete transformedData.id; // Remove id, use _id instead

                        const newUser = new UserModel(transformedData);
                        const savedUser = await newUser.save();
                        return savedUser.toObject();
                    }

                    // Handle verification token
                    if (
                        model === "verificationToken" ||
                        getModelName("verificationToken") === model
                    ) {
                        const tokenData: any = {
                            ...transformedData,
                            _id:
                                transformedData.id ||
                                new mongoose.Types.ObjectId(),
                            domain: domain.name,
                            email: (
                                transformedData.identifier || ""
                            ).toLowerCase(),
                            code: transformedData.token
                                ? hashCode(parseInt(transformedData.token))
                                : undefined,
                            timestamp:
                                transformedData.expires ||
                                new Date(Date.now() + 5 * 60 * 1000),
                        };
                        delete tokenData.id;
                        delete tokenData.identifier;
                        delete tokenData.token;
                        delete tokenData.expires;

                        const newToken = new VerificationToken(tokenData);
                        const savedToken = await newToken.save();
                        const tokenObj = savedToken.toObject();

                        // Return in better-auth format
                        return {
                            ...tokenObj,
                            id: tokenObj._id,
                            identifier: tokenObj.email,
                            token: data.token,
                            expires: tokenObj.timestamp,
                        };
                    }

                    // Default create for other models (session, account, etc.)
                    const Model =
                        mongoose.models[getModelName(model)] ||
                        mongoose.model(model);
                    const finalData: any = { ...transformedData };
                    if (finalData.id && !finalData._id) {
                        finalData._id = finalData.id;
                        delete finalData.id;
                    }
                    const newDoc = new Model(finalData);
                    const saved = await newDoc.save();
                    const savedObj = saved.toObject();
                    return { ...savedObj, id: savedObj._id };
                },

                update: async ({ model, where, update }) => {
                    const domain = await getDomain();
                    if (!domain) {
                        throw new Error("Domain not found");
                    }

                    const whereQuery = whereArrayToMongoose(where || []);
                    const updateData: any = { ...update };
                    if (updateData.id) {
                        updateData._id = updateData.id;
                        delete updateData.id;
                    }

                    // Scope to domain for user model
                    if (model === "user" || getModelName("user") === model) {
                        const domainWhere = buildDomainWhere(
                            domain._id,
                            whereQuery,
                        );
                        const user = await UserModel.findOneAndUpdate(
                            domainWhere,
                            { ...updateData, updatedAt: new Date() },
                            { new: true },
                        );
                        if (!user) return null;
                        const userObj = user.toObject();
                        return { ...userObj, id: userObj._id };
                    }

                    // Scope to domain for verification token
                    if (
                        model === "verificationToken" ||
                        getModelName("verificationToken") === model
                    ) {
                        const tokenWhere = {
                            ...whereQuery,
                            domain: domain.name,
                        };
                        const token = await VerificationToken.findOneAndUpdate(
                            tokenWhere,
                            updateData,
                            { new: true },
                        );
                        if (!token) return null;
                        const tokenObj = token.toObject();

                        // Extract original token from update if it was provided
                        const updateAny = update as any;
                        const originalToken = updateAny.token;

                        return {
                            ...tokenObj,
                            id: tokenObj._id,
                            identifier: tokenObj.email,
                            token: originalToken,
                            expires: tokenObj.timestamp,
                        };
                    }

                    // Default update for other models
                    const Model =
                        mongoose.models[getModelName(model)] ||
                        mongoose.model(model);
                    const updated = await Model.findOneAndUpdate(
                        whereQuery,
                        updateData,
                        { new: true },
                    );
                    if (!updated) return null;
                    const updatedObj = updated.toObject();
                    return { ...updatedObj, id: updatedObj._id };
                },

                updateMany: async ({ model, where, update }) => {
                    const domain = await getDomain();
                    if (!domain) {
                        throw new Error("Domain not found");
                    }

                    const whereQuery = whereArrayToMongoose(where || []);
                    const updateData: any = { ...update };
                    if (updateData.id) {
                        updateData._id = updateData.id;
                        delete updateData.id;
                    }

                    if (model === "user" || getModelName("user") === model) {
                        const domainWhere = buildDomainWhere(
                            domain._id,
                            whereQuery,
                        );
                        const result = await UserModel.updateMany(
                            domainWhere,
                            updateData,
                        );
                        return result.modifiedCount || 0;
                    }

                    if (
                        model === "verificationToken" ||
                        getModelName("verificationToken") === model
                    ) {
                        const tokenWhere = {
                            ...whereQuery,
                            domain: domain.name,
                        };
                        const result = await VerificationToken.updateMany(
                            tokenWhere,
                            updateData,
                        );
                        return result.modifiedCount || 0;
                    }

                    const Model =
                        mongoose.models[getModelName(model)] ||
                        mongoose.model(model);
                    const result = await Model.updateMany(
                        whereQuery,
                        updateData,
                    );
                    return result.modifiedCount || 0;
                },

                delete: async ({ model, where }) => {
                    const domain = await getDomain();
                    if (!domain) return;

                    const whereQuery = whereArrayToMongoose(where || []);

                    if (model === "user" || getModelName("user") === model) {
                        const domainWhere = buildDomainWhere(
                            domain._id,
                            whereQuery,
                        );
                        await UserModel.findOneAndDelete(domainWhere);
                        return;
                    }

                    if (
                        model === "verificationToken" ||
                        getModelName("verificationToken") === model
                    ) {
                        const tokenWhere = {
                            ...whereQuery,
                            domain: domain.name,
                        };
                        await VerificationToken.findOneAndDelete(tokenWhere);
                        return;
                    }

                    const Model =
                        mongoose.models[getModelName(model)] ||
                        mongoose.model(model);
                    await Model.findOneAndDelete(whereQuery);
                },

                deleteMany: async ({ model, where }) => {
                    const domain = await getDomain();
                    if (!domain) return 0;

                    const whereQuery = whereArrayToMongoose(where || []);

                    if (model === "user" || getModelName("user") === model) {
                        const domainWhere = buildDomainWhere(
                            domain._id,
                            whereQuery,
                        );
                        const result = await UserModel.deleteMany(domainWhere);
                        return result.deletedCount || 0;
                    }

                    if (
                        model === "verificationToken" ||
                        getModelName("verificationToken") === model
                    ) {
                        const tokenWhere = {
                            ...whereQuery,
                            domain: domain.name,
                        };
                        const result =
                            await VerificationToken.deleteMany(tokenWhere);
                        return result.deletedCount || 0;
                    }

                    const Model =
                        mongoose.models[getModelName(model)] ||
                        mongoose.model(model);
                    const result = await Model.deleteMany(whereQuery);
                    return result.deletedCount || 0;
                },

                findOne: async ({ model, where, select, join }) => {
                    const domain = await getDomain();
                    if (!domain) return null;

                    const whereQuery = whereArrayToMongoose(where || []);

                    if (model === "user" || getModelName("user") === model) {
                        const domainWhere = buildDomainWhere(
                            domain._id,
                            whereQuery,
                        );
                        const user = await UserModel.findOne(domainWhere);
                        if (!user) return null;
                        const userObj = user.toObject();
                        return { ...userObj, id: userObj._id };
                    }

                    if (
                        model === "verificationToken" ||
                        getModelName("verificationToken") === model
                    ) {
                        // Special handling for verification token - convert token to hash
                        let tokenWhere: any = {
                            ...whereQuery,
                            domain: domain.name,
                        };

                        // Extract token and identifier from where array
                        let tokenValue: string | undefined;
                        let identifierValue: string | undefined;
                        if (where && where.length > 0) {
                            for (const condition of where) {
                                if (condition && condition.field === "token") {
                                    // Check for equals property (can be on different properties depending on Where type)
                                    const conditionAny = condition as any;
                                    if (conditionAny.equals !== undefined) {
                                        tokenValue =
                                            conditionAny.equals as string;
                                    }
                                }
                                if (
                                    condition &&
                                    condition.field === "identifier"
                                ) {
                                    const conditionAny = condition as any;
                                    if (conditionAny.equals !== undefined) {
                                        identifierValue =
                                            conditionAny.equals as string;
                                    }
                                }
                            }
                        }

                        // Convert token to hash if provided
                        if (tokenValue) {
                            tokenWhere.code = hashCode(parseInt(tokenValue));
                            delete tokenWhere.token;
                        }

                        // Use identifier as email if provided
                        if (identifierValue) {
                            tokenWhere.email = identifierValue.toLowerCase();
                            delete tokenWhere.identifier;
                        }

                        // Add expiry check
                        tokenWhere.timestamp = { $gt: Date.now() };

                        const token =
                            await VerificationToken.findOne(tokenWhere);
                        if (!token) return null;
                        const tokenObj = token.toObject();
                        return {
                            ...tokenObj,
                            id: tokenObj._id,
                            identifier: tokenObj.email,
                            token: tokenValue,
                            expires: tokenObj.timestamp,
                        };
                    }

                    // Default findOne for other models
                    const Model =
                        mongoose.models[getModelName(model)] ||
                        mongoose.model(model);
                    const doc = await Model.findOne(whereQuery);
                    if (!doc) return null;
                    const docObj = doc.toObject();
                    return { ...docObj, id: docObj._id };
                },

                findMany: async ({
                    model,
                    where,
                    limit,
                    sortBy,
                    offset,
                    join,
                }) => {
                    const domain = await getDomain();
                    if (!domain) return [];

                    const whereQuery = whereArrayToMongoose(where || []);

                    // Handle sortBy - it can be an array or a single object
                    const sortArray = Array.isArray(sortBy)
                        ? sortBy
                        : sortBy
                          ? [sortBy]
                          : [];
                    const sortObj: any = {};
                    for (const sort of sortArray) {
                        sortObj[sort.field] = sort.direction === "asc" ? 1 : -1;
                    }

                    if (model === "user" || getModelName("user") === model) {
                        const domainWhere = buildDomainWhere(
                            domain._id,
                            whereQuery,
                        );
                        const query = UserModel.find(domainWhere);
                        if (limit) query.limit(limit);
                        if (offset) query.skip(offset);
                        if (Object.keys(sortObj).length > 0) {
                            query.sort(sortObj);
                        }
                        const users = await query.exec();
                        return users.map((user) => {
                            const userObj = user.toObject();
                            return { ...userObj, id: userObj._id };
                        });
                    }

                    if (
                        model === "verificationToken" ||
                        getModelName("verificationToken") === model
                    ) {
                        const tokenWhere = {
                            ...whereQuery,
                            domain: domain.name,
                        };
                        const query = VerificationToken.find(tokenWhere);
                        if (limit) query.limit(limit);
                        if (offset) query.skip(offset);
                        if (Object.keys(sortObj).length > 0) {
                            query.sort(sortObj);
                        }
                        const tokens = await query.exec();
                        return tokens.map((token) => {
                            const tokenObj = token.toObject();
                            return {
                                ...tokenObj,
                                id: tokenObj._id,
                                identifier: tokenObj.email,
                                expires: tokenObj.timestamp,
                            };
                        });
                    }

                    // Default findMany for other models
                    const Model =
                        mongoose.models[getModelName(model)] ||
                        mongoose.model(model);
                    const query = Model.find(whereQuery);
                    if (limit) query.limit(limit);
                    if (offset) query.skip(offset);
                    if (Object.keys(sortObj).length > 0) {
                        query.sort(sortObj);
                    }
                    const docs = await query.exec();
                    return docs.map((doc) => {
                        const docObj = doc.toObject();
                        return { ...docObj, id: docObj._id };
                    });
                },

                count: async ({ model, where }) => {
                    const domain = await getDomain();
                    if (!domain) return 0;

                    const whereQuery = whereArrayToMongoose(where || []);

                    if (model === "user" || getModelName("user") === model) {
                        const domainWhere = buildDomainWhere(
                            domain._id,
                            whereQuery,
                        );
                        return await UserModel.countDocuments(domainWhere);
                    }

                    if (
                        model === "verificationToken" ||
                        getModelName("verificationToken") === model
                    ) {
                        const tokenWhere = {
                            ...whereQuery,
                            domain: domain.name,
                        };
                        return await VerificationToken.countDocuments(
                            tokenWhere,
                        );
                    }

                    const Model =
                        mongoose.models[getModelName(model)] ||
                        mongoose.model(model);
                    return await Model.countDocuments(whereQuery);
                },
            };
        },
    });
}
