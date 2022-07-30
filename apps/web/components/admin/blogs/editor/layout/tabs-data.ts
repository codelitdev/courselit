import Tab from "../../../../../models/Tab";

export default function generateTabs(id: string): Tab[] {
    if (!id) return [];

    return [
        { text: "Details", url: `/dashboard/blog/${id}/details` },
        { text: "Publish", url: `/dashboard/blog/${id}/publish` },
    ];
}
