const slugify = jest.fn((value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, ""),
);

export default slugify;
