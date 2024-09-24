import Tab from "@/models/Tab";

export default function generateTabs(prefix: string, id: string): Tab[] {
    if (!id) return [];

    return [
        { text: "Details", url: `${prefix}/blog/${id}/details` },
        { text: "Publish", url: `${prefix}/blog/${id}/publish` },
    ];
}
