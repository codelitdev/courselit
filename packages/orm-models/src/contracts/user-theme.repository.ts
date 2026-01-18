import { Repository } from "../core/repository";
import { UserTheme } from "../models/user-theme";

export interface UserThemeRepository extends Repository<UserTheme> {
    findByThemeId(themeId: string, domainId: string): Promise<UserTheme | null>;
    findByParentThemeId(
        parentThemeId: string,
        domainId: string,
    ): Promise<UserTheme[]>;
}
