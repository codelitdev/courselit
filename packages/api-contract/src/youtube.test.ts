import { describe, expect, it } from "bun:test";
import { youtubeEmbedUrl, youtubeVideoId } from "./youtube.js";

describe("youtubeVideoId", () => {
  it("reads the video ID from watch, share, embed, shorts and live links", () => {
    for (const link of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=42",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      "https://youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
      "youtube.com/watch?v=dQw4w9WgXcQ",
      "  youtu.be/dQw4w9WgXcQ  ",
    ]) {
      expect(youtubeVideoId(link)).toBe("dQw4w9WgXcQ");
    }
  });

  it("rejects links that are not YouTube videos", () => {
    for (const link of [
      "https://vimeo.com/123456",
      "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/@channel",
      "https://www.youtube.com/watch?v=short",
      "javascript:alert(1)",
      "not a link",
    ]) {
      expect(youtubeVideoId(link)).toBeNull();
    }
  });

  it("builds the privacy-enhanced embed link", () => {
    expect(youtubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(youtubeEmbedUrl("https://vimeo.com/1")).toBeNull();
  });
});
