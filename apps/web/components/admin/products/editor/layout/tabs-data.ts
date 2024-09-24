import Tab from "@/models/Tab";

export default function generateTabs(prefix: string, id: string): Tab[] {
    if (!id) return [];

    return [
        { text: "Reports", url: `${prefix}/product/${id}/reports` },
        { text: "Content", url: `${prefix}/product/${id}/content` },
        { text: "Pricing", url: `${prefix}/product/${id}/pricing` },
        { text: "Details", url: `${prefix}/product/${id}/details` },
        { text: "Publish", url: `${prefix}/product/${id}/publish` },
    ];
}
