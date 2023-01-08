import Tab from "../../../../../models/Tab";

export default function generateTabs(id: string): Tab[] {
    if (!id) return [];

    return [
        { text: "Reports", url: `/dashboard/product/${id}/reports` },
        { text: "Content", url: `/dashboard/product/${id}/content` },
        { text: "Pricing", url: `/dashboard/product/${id}/pricing` },
        { text: "Details", url: `/dashboard/product/${id}/details` },
        { text: "Publish", url: `/dashboard/product/${id}/publish` },
    ];
}
