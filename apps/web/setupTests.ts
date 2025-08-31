import "@testing-library/jest-dom";
import "./jest.mocks";
import { TextEncoder, TextDecoder } from "node:util";

global.TextEncoder = TextEncoder as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Suppress console.error during tests to reduce noise
const originalError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});

afterAll(() => {
    console.error = originalError;
});
