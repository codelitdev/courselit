"use client";

import { ReactNode, useContext, useEffect, useState } from "react";
import { IconButton, Image, Modal } from "@courselit/components-library";
import { Menu } from "@courselit/icons";
import { Chip } from "@courselit/components-library";
import { AddressContext, SiteInfoContext } from "./contexts";
import Link from "next/link";
import { SiteInfo } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { defaultState } from "./default-state";

export default function Layout({
    session,
    address,
    children,
    siteinfo,
}: {
    session: any;
    address: string;
    children: ReactNode;
    siteinfo: SiteInfo;
}) {
    const [open, setOpen] = useState(false);
    const [profile, setProfile] = useState(defaultState.profile);

    useEffect(() => {
        const getUserProfile = async () => {
            const query = `
            { profile: getUser {
                name,
                id,
                email,
                userId,
                bio,
                permissions,
                purchases {
                    courseId,
                    completedLessons,
                    accessibleGroups
                }
                avatar {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                }
            }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            try {
                const response = await fetch.exec();
                if (response.profile) {
                    setProfile(response.profile);
                }
            } catch (e) {}
        };

        if (address) {
            getUserProfile();
        }
    }, [address]);

    return (
        <AddressContext.Provider
            value={{
                backend: address,
                frontend: address,
            }}
        >
            <SiteInfoContext.Provider value={siteinfo}>
                <div className="z-20 fixed flex w-full p-4 h-[64px] items-center border-0 border-b border-slate-200 bg-white/80 backdrop-blur-md">
                    <Header onMenuClick={() => setOpen(true)} />
                </div>
                <div className="flex h-screen pt-[64px] w-full">
                    <div
                        style={{ width: 240 }}
                        className={`hidden md:!flex overflow-x-hidden overflow-y-auto min-w-[240px] max-h-screen border-r border-slate-200 z-10 bg-white`}
                    >
                        <Sidebar session={session} onItemClick={setOpen} />
                    </div>
                    <main className="w-full max-h-screen overflow-y-auto scroll-smooth p-4">
                        {children}
                    </main>
                </div>
                <Modal
                    open={open}
                    onOpenChange={(status: boolean) => setOpen(status)}
                    className="top-0 w-full z-20"
                >
                    <Sidebar session={session} onItemClick={setOpen} />
                </Modal>
                {/* <AppToast /> */}
            </SiteInfoContext.Provider>
        </AddressContext.Provider>
    );
}

function Header({ onMenuClick }: { onMenuClick: (value: boolean) => void }) {
    const siteInfo = useContext(SiteInfoContext);

    return (
        <header className="flex w-full z-10 justify-between">
            <IconButton
                className="px-2 md:!hidden"
                variant="soft"
                onClick={onMenuClick}
            >
                <Menu />
            </IconButton>
            <Link href="/">
                <div className="flex items-center">
                    <div className="mr-2">
                        <Image
                            borderRadius={1}
                            src={siteInfo.logo?.file || ""}
                            width="w-[36px]"
                            height="h-[36px]"
                            alt="logo"
                        />
                    </div>
                    <p className="text-2xl font-bold">{siteInfo.title}</p>
                </div>
            </Link>
            <div></div>
        </header>
    );
}

interface Item {
    label: string;
    badge?: string;
    href?: string;
    icon?: ReactNode;
    iconPlacementRight?: boolean;
}

type Divider = "divider";

type SidebarItem = Item | Divider;

function Sidebar({
    session,
    onItemClick,
}: {
    session: any;
    onItemClick?: (state: boolean) => void;
}) {
    const address = useContext(AddressContext);
    const items: SidebarItem[] = [
        { label: "My content", href: "/my-content" },
        "divider",
    ];
    if (session) {
        items.push({ label: "Log out", href: "/logout" });
    }

    return (
        <ul className="w-full">
            {items.map((item: SidebarItem, index: number) =>
                item === "divider" ? (
                    <div className="my-4 border-b" key={index}></div>
                ) : item.href ? (
                    <li
                        key={index}
                        onClick={() => {
                            // onItemClick(false);
                            // navigateTo(item.href as string);
                        }}
                        style={
                            {
                                // backgroundColor:
                                //     router.asPath === item.href
                                //         ? "#d6d6d6"
                                //         : "inherit",
                            }
                        }
                        className={`flex items-center px-2 py-3 hover:!bg-slate-200 cursor-pointer ${
                            item.icon && item.iconPlacementRight
                                ? "justify-between"
                                : "justify-start"
                        }`}
                    >
                        {item.icon && !item.iconPlacementRight && (
                            <div className="mr-2">{item.icon}</div>
                        )}
                        <p className="text-sm">{item.label as string}</p>
                        {item.icon && item.iconPlacementRight && (
                            <div>{item.icon}</div>
                        )}
                    </li>
                ) : (
                    <li
                        key={index}
                        className="px-2 py-3 border-b text-slate-900 flex flex-col gap-2 mt-6 font-semibold"
                    >
                        {item.label as string}
                        {item.badge && <Chip>{item.badge}</Chip>}
                    </li>
                ),
            )}
        </ul>
    );
}
