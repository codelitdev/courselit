import { MongooseRepository } from "./base.repository";
import { UserThemeRepository } from "../../contracts/user-theme.repository";
import { UserTheme, InternalUserTheme } from "../../models/user-theme";
import mongoose, { Model } from "mongoose";

export class MongooseUserThemeRepository
    extends MongooseRepository<UserTheme, InternalUserTheme>
    implements UserThemeRepository
{
    constructor(model: Model<InternalUserTheme>) {
        super(model);
    }

    protected toEntity(doc: InternalUserTheme): UserTheme {
        return {
            ...doc,
            domain: doc.domain.toString(),
        } as unknown as UserTheme;
    }

    async findByThemeId(
        themeId: string,
        domainId: string,
    ): Promise<UserTheme | null> {
        const doc = await this.model
            .findOne({ themeId, domain: domainId })
            .lean();
        return doc ? this.toEntity(doc as InternalUserTheme) : null;
    }

    async findByParentThemeId(
        parentThemeId: string,
        domainId: string,
    ): Promise<UserTheme[]> {
        const docs = await this.model
            .find({ parentThemeId, domain: domainId })
            .lean();
        return docs.map((doc) => this.toEntity(doc as InternalUserTheme));
    }
}
