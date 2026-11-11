/**
 * @jest-environment node
 */

import path from "path";
import { resolveFileInsideDirectory } from "../cache";

describe("resolveFileInsideDirectory", () => {
    const baseDir = path.resolve("/tmp/scorm-cache/media-1");

    it("resolves files inside the package directory", () => {
        expect(resolveFileInsideDirectory(baseDir, "index.html")).toBe(
            path.join(baseDir, "index.html"),
        );
        expect(resolveFileInsideDirectory(baseDir, "assets/js/app.js")).toBe(
            path.join(baseDir, "assets", "js", "app.js"),
        );
        expect(resolveFileInsideDirectory(baseDir, "./scorm/index.html")).toBe(
            path.join(baseDir, "scorm", "index.html"),
        );
    });

    it.each([
        "../../../etc/passwd",
        "assets/../../media-2/index.html",
        "..",
        "/etc/passwd",
        "..\\..\\etc\\passwd",
        "index.html\0.png",
        "",
        ".",
    ])("rejects unsafe path %p", (filePath) => {
        expect(resolveFileInsideDirectory(baseDir, filePath)).toBeNull();
    });
});
