import React from "react";
import { render, pretty } from "@react-email/render";
import { Html, Head, Preview, Body, Container } from "@react-email/components";
import type { Email, EmailBlock } from "../types/email-editor";
import type { LinkBlockSettings } from "@/blocks/link/types";
import type { BlockRegistry } from "../types/block-registry";
import { Text, Link as LinkBlock, Separator, Image } from "@/blocks";

export interface UtmParams {
    source: string;
    medium: string;
    campaign: string;
}

function appendUtmParams(url: string, utm: UtmParams): string {
    try {
        const urlObj = new URL(url);
        urlObj.searchParams.set("utm_source", utm.source);
        urlObj.searchParams.set("utm_medium", utm.medium);
        urlObj.searchParams.set("utm_campaign", utm.campaign);
        return urlObj.toString();
    } catch {
        // If URL is invalid, return original
        return url;
    }
}

// Create the email template component
export function EmailTemplate({
    email,
    utmParams,
    blockRegistry,
}: {
    email: Email;
    utmParams?: UtmParams;
    blockRegistry: BlockRegistry;
}) {
    // Function to render a block based on its type
    const renderBlock = (block: EmailBlock) => {
        const blockComponent = blockRegistry[block.blockType];
        if (!blockComponent) {
            return (
                <div key={block.id}>Unknown block type: {block.blockType}</div>
            );
        }

        // Clone the block and modify URLs if UTM params are provided
        let modifiedBlock = block;
        if (
            utmParams &&
            block.blockType === "link" &&
            (block.settings as LinkBlockSettings).url
        ) {
            modifiedBlock = {
                ...block,
                settings: {
                    ...block.settings,
                    url: appendUtmParams(
                        (block.settings as LinkBlockSettings).url,
                        utmParams,
                    ),
                },
            };
        }

        // Use the block component directly
        const BlockComponent = blockComponent.block;
        return (
            <BlockComponent
                key={block.id}
                block={modifiedBlock}
                style={email.style}
            />
        );
    };

    return (
        <Html>
            <Head />
            {email.meta?.previewText && (
                <Preview>{email.meta.previewText}</Preview>
            )}
            <Body
                style={{
                    backgroundColor: email.style.colors.background,
                    color: email.style.colors.foreground,
                    margin: email.style.structure.page.marginY || "0",
                    padding: "0",
                    fontFamily: email.style.typography.text.fontFamily,
                }}
            >
                <Container
                    style={{
                        width: email.style.structure.page.width,
                        margin: `${email.style.structure.page.marginY || "0"} auto`,
                        backgroundColor: email.style.structure.page.background,
                        color:
                            email.style.structure.page.foreground ||
                            email.style.colors.foreground,
                        borderWidth: email.style.structure.page.borderWidth,
                        borderStyle: email.style.structure.page.borderStyle,
                        borderColor: email.style.colors.border,
                        borderRadius: email.style.structure.page.borderRadius,
                        overflow: "hidden",
                    }}
                >
                    {email.content.map((block) => renderBlock(block))}
                </Container>
            </Body>
        </Html>
    );
}

export async function renderEmailToHtml({
    email,
    utmParams,
    blocks,
}: {
    email: Email;
    utmParams?: UtmParams;
    blocks?: any[];
}): Promise<string> {
    try {
        // Create block registry from blocks or use defaults
        const blockRegistry: BlockRegistry = {};
        const defaultBlocks = blocks || [Text, LinkBlock, Separator, Image];

        for (const block of defaultBlocks) {
            blockRegistry[block.metadata.name] = block;
        }

        const template = (
            <EmailTemplate
                email={email}
                utmParams={utmParams}
                blockRegistry={blockRegistry}
            />
        );
        const html = await pretty(await render(template));
        return html;
    } catch (err) {
        return `<h1>Error: ${err instanceof Error ? err.message : "Unknown error"}</h1>`;
    }
}
