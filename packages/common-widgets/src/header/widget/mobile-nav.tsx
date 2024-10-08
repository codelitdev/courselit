"use client";

import { useState } from "react";
import {
    Drawer,
    Button2,
    Image,
    Link as AppLink,
} from "@courselit/components-library";
import { Media } from "@courselit/common-models";
import { Link } from "../settings";

export function MobileNav({
    color,
    title,
    logo,
    links,
    linkColor,
    btnBgColor,
    btnColor,
    linkFontWeight,
    spacingBetweenLinks,
    appBarBackground,
    logoColor,
}: {
    title: string;
    logo: Partial<Media>;
    color: string;
    links: any[];
    linkColor: string;
    btnBgColor: string;
    btnColor: string;
    linkFontWeight: "font-normal" | "font-bold" | "font-light";
    spacingBetweenLinks: number;
    appBarBackground: string;
    logoColor: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Drawer
            open={open}
            setOpen={setOpen}
            trigger={<MenuButton color={color} backgroundColor={btnBgColor} />}
            side="right"
            style={{
                backgroundColor: appBarBackground,
            }}
            className={appBarBackground ? "border-l-0" : ""}
        >
            <AppLink
                href="/"
                onClick={() => {
                    setOpen(false);
                }}
            >
                <div className="flex items-center mb-4">
                    {logo && (
                        <div className="mr-2">
                            <Image
                                src={logo.file}
                                borderRadius={2}
                                width="w-[32px]"
                                height="h-[32px]"
                            />
                        </div>
                    )}
                    <span
                        className="font-bold text-xl"
                        style={{
                            color: logoColor || "inherit",
                        }}
                    >
                        {title}
                    </span>
                </div>
            </AppLink>
            <ul
                className="flex flex-col"
                style={{
                    gap: `${spacingBetweenLinks}px`,
                }}
            >
                {links &&
                    (links as Link[]).map((link: Link, index) => (
                        <span
                            className="mr-2"
                            style={{
                                color: linkColor || "inherit",
                            }}
                            key={index}
                        >
                            <AppLink
                                href={link.href}
                                className={`${linkFontWeight}`}
                                onClick={() => {
                                    setOpen(false);
                                }}
                            >
                                {link.isButton && (
                                    <Button2
                                        size="sm"
                                        style={{
                                            background: btnBgColor,
                                            color: btnColor,
                                            font: "unset",
                                            fontSize: "unset",
                                        }}
                                    >
                                        {link.label}
                                    </Button2>
                                )}
                                {!link.isButton && link.label}
                            </AppLink>
                        </span>
                    ))}
            </ul>
        </Drawer>
    );
}

function MenuButton({
    color,
    backgroundColor = "inherit",
}: {
    color: string;
    backgroundColor: string;
}) {
    return (
        <Button2
            variant="ghost"
            className="px-2 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 lg:!hidden"
            style={{
                backgroundColor,
            }}
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
        </Button2>
    );
}
