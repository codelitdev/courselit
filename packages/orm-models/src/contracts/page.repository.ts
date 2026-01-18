import { Repository } from "../core/repository";
import { Page } from "@courselit/common-models";

export interface PageRepository extends Repository<Page> {
    findByPageId(pageId: string, domainId: string): Promise<Page | null>;
    findByType(type: string, domainId: string): Promise<Page[]>;
}
