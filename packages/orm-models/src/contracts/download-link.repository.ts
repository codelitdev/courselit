import { Repository } from "../core/repository";
import { InternalDownloadLink } from "../models/download-link";

export interface DownloadLinkRepository
    extends Repository<InternalDownloadLink> {
    findByToken(
        token: string,
        domainId: string,
    ): Promise<InternalDownloadLink | null>;
}
