type SectionDocument = {
    id?: string;
    _id?: unknown;
    name?: string;
    rank?: number;
    collapsed?: boolean;
    lessonsOrder?: string[];
    drip?: unknown;
};

export function serializeSection(section: SectionDocument) {
    return {
        sectionId:
            section.id ??
            ((section._id as any)?.toString
                ? (section._id as any).toString()
                : section._id),
        name: section.name,
        rank: section.rank,
        collapsed: section.collapsed,
        lessonsOrder: section.lessonsOrder,
        drip: section.drip,
    };
}

export function serializeSections(sections: SectionDocument[] = []) {
    return sections.map(serializeSection);
}
