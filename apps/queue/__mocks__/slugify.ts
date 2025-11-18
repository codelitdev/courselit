export default jest.fn((str: string) => str.toLowerCase().replace(/\s+/g, "-"));
