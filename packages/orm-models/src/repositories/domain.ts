import mongoose, { type Model } from "mongoose";
import { BaseRepository } from "./base";
import { DomainSchema, type Domain } from "../models/domain";

export class DomainRepository extends BaseRepository<Domain> {
    constructor(model?: Model<Domain>) {
        super(
            model ??
                ((mongoose.models.Domain ||
                    mongoose.model("Domain", DomainSchema)) as Model<Domain>),
        );
    }

    async findByName(name: string): Promise<Domain | null> {
        return this.findOne({ name });
    }

    async findByCustomDomain(customDomain: string): Promise<Domain | null> {
        return this.findOne({ customDomain });
    }
}
