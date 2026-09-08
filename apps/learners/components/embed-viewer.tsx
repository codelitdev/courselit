"use client";

import { useEffect, useId, useState } from "react";

function youtubeVideoId(value: string): string | null {
  const normalized = /^[a-z][a-z\d+\-.]*:\/\//i.test(value)
    ? value
    : `https://${value}`;
  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();
    if (hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }
    if (
      ![
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(hostname)
    ) {
      return null;
    }
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const parts = url.pathname.split("/").filter(Boolean);
    return ["embed", "v", "shorts", "live"].includes(parts[0] ?? "")
      ? (parts[1] ?? null)
      : null;
  } catch {
    return null;
  }
}

function SandboxedEmbed({ content }: { content: string }) {
  const iframeId = useId();
  const [height, setHeight] = useState(100);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.data?.type !== "embed-resize" ||
        event.data.id !== iframeId ||
        typeof event.data.height !== "number" ||
        !Number.isFinite(event.data.height)
      ) {
        return;
      }
      setHeight(Math.max(100, Math.ceil(event.data.height)));
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [iframeId]);

  const srcDoc = `<!doctype html>
<html>
  <head>
    <style>
      html, body { margin: 0; padding: 0; overflow: hidden; }
      #content-wrapper { overflow: hidden; height: auto; }
    </style>
  </head>
  <body>
    <div id="content-wrapper">${content}</div>
    <script>
      const iframeId = ${JSON.stringify(iframeId)};
      const wrapper = document.getElementById("content-wrapper");
      function sendHeight() {
        const height = wrapper ? wrapper.scrollHeight : document.body.scrollHeight;
        window.parent.postMessage({ type: "embed-resize", id: iframeId, height }, "*");
      }
      const resizeObserver = new ResizeObserver(sendHeight);
      resizeObserver.observe(wrapper || document.body);
      const mutationObserver = new MutationObserver(sendHeight);
      mutationObserver.observe(wrapper || document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
      window.addEventListener("load", sendHeight);
      window.addEventListener("resize", sendHeight);
      const interval = setInterval(sendHeight, 500);
      setTimeout(() => clearInterval(interval), 10000);
      sendHeight();
    </script>
  </body>
</html>`;

  return (
    <iframe
      className="w-full border-0"
      height={height}
      sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
      srcDoc={srcDoc}
      title="Embedded content"
    />
  );
}

export function EmbedViewer({ value }: { value: string }) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const videoId = youtubeVideoId(trimmed);
  if (videoId) {
    return (
      <div className="aspect-video overflow-hidden rounded-lg">
        <iframe
          className="size-full"
          src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return <SandboxedEmbed content={trimmed} />;
}
