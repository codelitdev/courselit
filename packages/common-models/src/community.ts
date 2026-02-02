import { Media } from "./media";
import { TextEditorContent } from "./text-editor-content";

export interface Community {
    communityId: string;
    name: string;
    description: TextEditorContent;
    banner: TextEditorContent | null;
    categories: string[];
    enabled: boolean;
    joiningReasonText?: string;
    pageId: string;
    products: string[];
    autoAcceptMembers: boolean;
    defaultPaymentPlan?: string;
    featuredImage?: Media;
    membersCount: number;
}
