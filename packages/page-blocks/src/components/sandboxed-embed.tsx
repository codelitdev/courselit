import React, { useEffect, useId, useRef, useState } from "react";

interface SandboxedEmbedProps {
    content: string;
    className?: string;
    style?: React.CSSProperties;
    id?: string;
}

export const SandboxedEmbed = ({
    content,
    className,
    style,
    id,
}: SandboxedEmbedProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState("100px");
    const generatedId = useId();
    const iframeId = id || generatedId;

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (
                event.data?.type === "embed-resize" &&
                event.data?.id === iframeId &&
                event.data?.height
            ) {
                setHeight(`${event.data.height}px`);
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [iframeId]);

    const srcDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                html, body { margin: 0; padding: 0; height: auto; min-height: 100%; }
                #content-wrapper { overflow: auto; height: auto; }
            </style>
        </head>
        <body>
            <div id="content-wrapper">
                ${content || ""}
            </div>
            <script>
                const iframeId = "${iframeId}";
                
                function sendHeight() {
                    const wrapper = document.getElementById('content-wrapper');
                    const height = wrapper ? wrapper.scrollHeight : document.body.scrollHeight;
                    window.parent.postMessage({ type: "embed-resize", id: iframeId, height: height }, "*");
                }

                // Use a ResizeObserver to detect size changes
                const resizeObserver = new ResizeObserver(entries => {
                    sendHeight();
                });
                const target = document.getElementById('content-wrapper') || document.body;
                resizeObserver.observe(target);
                
                // Use MutationObserver to detect DOM changes
                const mutationObserver = new MutationObserver(() => {
                    sendHeight();
                });
                mutationObserver.observe(target, { childList: true, subtree: true, attributes: true });
                
                // Poll for a few seconds to catch late-loading content
                let interval = setInterval(sendHeight, 500);
                setTimeout(() => clearInterval(interval), 10000);
                
                window.addEventListener('load', sendHeight);
                window.addEventListener('resize', sendHeight);
                
                // Initial send
                sendHeight();
            </script>
        </body>
        </html>
    `;

    return (
        <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            className={className}
            style={{
                width: "100%",
                height: height,
                border: "none",
                ...style,
            }}
            sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
            title="Embedded Content"
        />
    );
};
