import { TextEditorContent } from "./text-editor-content";

export interface Community {
    communityId: string;
    name: string;
    description: string;
    banner: TextEditorContent | null;
    categories: string[];
    enabled: boolean;
    default: boolean;
    joiningReasonText?: string;
    pageId: string;
}
