"use client";

import React, { useState } from "react";
import { Drawer, Image, Link as AppLink } from "@courselit/components-library";
import { Link } from "../settings";
import { Media, Theme } from "@courselit/common-models";
import { Header1, Button } from "@courselit/page-primitives";
import PageLink from "./link";

interface MobileNavSettings {
    title: string;
    logo: Partial<Media>;
    color: string;
    links: Link[];
    linkColor: string;
    btnBgColor: string;
    btnColor: string;
    linkFontWeight: "font-normal" | "font-bold" | "font-light";
    spacingBetweenLinks: number;
    appBarBackground: string;
    logoColor: string;
    theme: Theme;
}

const MobileNav = (props: MobileNavSettings) => {
    const [open, setOpen] = useState(false);
    const { theme } = props;

    return (
        <Drawer
            open={open}
            setOpen={setOpen}
            trigger={
                <MenuButton
                    color={props.color}
                    backgroundColor={props.btnBgColor}
                    theme={theme}
                />
            }
            side="right"
            style={{
                backgroundColor: props.appBarBackground,
            }}
            className={props.appBarBackground ? "border-l-0" : ""}
        >
            <AppLink
                href="/"
                onClick={() => {
                    setOpen(false);
                }}
            >
                <div className="flex items-center mb-4">
                    {props.logo && (
                        <div className="mr-2">
                            <Image
                                src={props.logo.file}
                                borderRadius={2}
                                width="w-[32px]"
                                height="h-[32px]"
                            />
                        </div>
                    )}
                    <Header1
                        className="font-bold text-xl"
                        style={{
                            color: props.logoColor || "inherit",
                        }}
                        theme={theme}
                    >
                        {props.title}
                    </Header1>
                </div>
            </AppLink>
            <ul
                className="flex flex-col"
                style={{
                    gap: `${props.spacingBetweenLinks}px`,
                }}
            >
                {props.links &&
                    (props.links as Link[]).map((link: Link, index) => (
                        <PageLink
                            key={index}
                            href={link.href}
                            theme={theme}
                            linkFontWeight={props.linkFontWeight}
                            onClick={() => {
                                setOpen(false);
                            }}
                            isButton={link.isButton}
                            label={link.label}
                            linkColor={props.linkColor}
                            btnBgColor={props.btnBgColor}
                            btnColor={props.btnColor}
                        />
                    ))}
            </ul>
        </Drawer>
    );
};

function MenuButton({
    color,
    backgroundColor = "inherit",
    theme,
}: {
    color: string;
    backgroundColor: string;
    theme: Theme;
}) {
    return (
        <Button
            variant="ghost"
            className="px-2 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 lg:!hidden"
            style={{
                backgroundColor,
            }}
            theme={theme}
        >
            <svg
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                style={{
                    color,
                }}
            >
                <path
                    d="M3 5H11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                ></path>
                <path
                    d="M3 12H16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                ></path>
                <path
                    d="M3 19H21"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                ></path>
            </svg>
            <span className="sr-only">Toggle Menu</span>
        </Button>
    );
}

export default MobileNav;
