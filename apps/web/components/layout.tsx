"use client";

import { ReactNode, useContext, useEffect, useState } from "react";
import { IconButton, Image, Link, Modal } from "@courselit/components-library";
import {
    Exit,
    ExpandMore,
    Globe,
    Help,
    Mail,
    Menu,
    Overview,
    Person,
    Products,
    Settings,
    Text,
} from "@courselit/icons";
import { AddressContext, ProfileContext, SiteInfoContext } from "./contexts";
import { SiteInfo } from "@courselit/common-models";
import { checkPermission, FetchBuilder } from "@courselit/utils";
import { defaultState } from "./default-state";
import { MyContent } from "@courselit/icons";
import { UIConstants } from "@courselit/common-models";
import {
    SIDEBAR_MENU_BLOGS,
    SIDEBAR_MENU_MAILS,
    SIDEBAR_MENU_PAGES,
    SIDEBAR_MENU_PRODUCTS,
    SIDEBAR_MENU_SETTINGS,
    SIDEBAR_MENU_USERS,
} from "@ui-config/strings";
import { usePathname, useSearchParams } from "next/navigation";
import { ExpandMoreRight } from "@courselit/icons";
import clsx from "clsx";
const { permissions } = UIConstants;

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
    const params = useSearchParams();
    const tab = params?.get("tab");

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
                <ProfileContext.Provider value={profile}>
                    <div className="z-20 fixed flex w-full p-4 h-[64px] items-center border-0 border-b border-slate-200 bg-white/80 backdrop-blur-md">
                        <Header onMenuClick={() => setOpen(true)} />
                    </div>
                    <div className="flex h-screen pt-[64px] w-full">
                        <div
                            style={{ width: 240 }}
                            className={`hidden md:!flex overflow-x-hidden overflow-y-auto min-w-[240px] max-h-screen border-r border-slate-200 z-10 bg-white`}
                        >
                            <Sidebar
                                session={session}
                                onItemClick={setOpen}
                                tab={tab}
                            />
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
                        <Sidebar
                            session={session}
                            onItemClick={(value) => {
                                setOpen(value);
                            }}
                        />
                    </Modal>
                </ProfileContext.Provider>
            </SiteInfoContext.Provider>
        </AddressContext.Provider>
    );
}

function Header({ onMenuClick }: { onMenuClick: (value: boolean) => void }) {
    const siteInfo = useContext(SiteInfoContext);

    return (
        <header className="flex w-full z-10 gap-2 items-center">
            <div>
                <IconButton
                    className="px-2 md:!hidden"
                    variant="soft"
                    onClick={onMenuClick}
                >
                    <Menu />
                </IconButton>
            </div>
            <Link href="/">
                <div className="flex items-center max-w-[200px] md:max-w-[300px] lg:max-w-[400px]">
                    <div className="mr-2">
                        <Image
                            borderRadius={1}
                            src={siteInfo.logo?.file || ""}
                            width="w-[36px]"
                            height="h-[36px]"
                            alt="logo"
                        />
                    </div>
                    <p className="text-2xl font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                        {siteInfo.title}
                    </p>
                </div>
            </Link>
            <div></div>
        </header>
    );
}

interface SubItem {
    label: string;
    badge?: string;
    href?: string;
    icon?: ReactNode;
}

interface Item {
    label: string;
    badge?: string;
    href?: string;
    icon?: ReactNode;
    items?: SubItem[];
}

type Divider = "divider";

type Blank = "blank";

type SidebarItem = Item | Divider | Blank;

function Sidebar({
    session,
    onItemClick,
    tab,
}: {
    session: any;
    onItemClick: (state: boolean) => void;
    tab?: string | null;
}) {
    const profile = useContext(ProfileContext);
    const items: SidebarItem[] = [];

    if (session) {
        items.push({
            label: "My content",
            href: "/dashboard2/my-content",
            icon: <MyContent />,
        });
        items.push("divider");
        if (
            checkPermission(profile.permissions!, [
                permissions.manageCourse,
                permissions.manageAnyCourse,
            ])
        ) {
            items.push({
                label: "Overview",
                href: "/dashboard2/overview",
                icon: <Overview />,
            });
            items.push({
                label: SIDEBAR_MENU_PRODUCTS,
                href: "/dashboard2/products",
                icon: <Products />,
            });
        }

        if (
            checkPermission(profile.permissions!, [permissions.publishCourse])
        ) {
            items.push({
                label: SIDEBAR_MENU_BLOGS,
                href: "/dashboard2/blogs",
                icon: <Text />,
            });
        }

        if (profile.permissions!.includes(permissions.manageUsers)) {
            items.push({
                label: SIDEBAR_MENU_USERS,
                icon: <Person />,
                items: [
                    {
                        label: "All users",
                        href: "/dashboard2/users?tab=All%20users",
                    },
                    {
                        label: "Tags",
                        href: "/dashboard2/users?tab=Tags",
                    },
                ],
            });
            items.push({
                label: SIDEBAR_MENU_MAILS,
                href: "/dashboard2/mails",
                icon: <Mail />,
                items: [
                    {
                        label: "Broadcasts",
                        href: "/dashboard2/mails?tab=Broadcasts",
                    },
                    {
                        label: "Sequences",
                        href: "/dashboard2/mails?tab=Sequences",
                    },
                ],
            });
        }

        if (profile.permissions!.includes(permissions.manageSite)) {
            items.push({
                label: SIDEBAR_MENU_PAGES,
                href: "/dashboard2/pages",
                icon: <Globe />,
            });
        }

        if (profile.permissions!.includes(permissions.manageSettings)) {
            items.push({
                label: SIDEBAR_MENU_SETTINGS,
                icon: <Settings />,
                items: [
                    {
                        label: "Branding",
                        href: "/dashboard2/settings?tab=Branding",
                    },
                    {
                        label: "Payment",
                        href: "/dashboard2/settings?tab=Payment",
                    },
                    {
                        label: "Mails",
                        href: "/dashboard2/settings?tab=Mails",
                    },
                    {
                        label: "Code injection",
                        href: "/dashboard2/settings?tab=Code%20Injection",
                    },
                    {
                        label: "API Keys",
                        href: "/dashboard2/settings?tab=API%20Keys",
                    },
                ],
            });
        }
        items.push("blank");
        items.push({
            label: "Profile",
            href: "/dashboard2/profile",
            icon: <Person />,
        });
        items.push({
            label: "Get help",
            href: "/dashboard2/help",
            icon: <Help />,
        });
        items.push("divider");
        items.push({ label: "Log out", href: "/logout", icon: <Exit /> });
    }

    return (
        <ul className="w-full text-gray-500 flex flex-col">
            {items.map((item: SidebarItem, index: number) =>
                item === "divider" ? (
                    <div className="border-b" key={index}></div>
                ) : item === "blank" ? (
                    <div className="flex-1"></div>
                ) : (
                    <SidebarItem
                        item={item}
                        key={index}
                        tab={tab}
                        onItemClick={onItemClick}
                    />
                ),
            )}
        </ul>
    );
}

function SidebarItem({
    item,
    tab,
    onItemClick,
}: {
    item: Item;
    onItemClick: (value: boolean) => void;
    tab?: string | null;
}) {
    const path = usePathname();
    const [open, setOpen] = useState(
        path &&
            item.items?.some((x) => {
                return tab && x.href
                    ? x.href.endsWith(`tab=${encodeURI(tab)}`)
                    : false;
            }),
    );

    return (
        <>
            <li
                onClick={() => {
                    if (item.items?.length) {
                        setOpen(!open);
                    } else {
                        onItemClick(false);
                    }
                }}
            >
                {item.items?.length && (
                    <div className="flex items-center px-4 py-3 hover:!bg-slate-200 cursor-pointer select-none">
                        {item.icon && <div className="mr-2">{item.icon}</div>}
                        <div className="flex justify-between w-full items-center">
                            <p className="text-sm">{item.label as string}</p>
                            {open ? <ExpandMore /> : <ExpandMoreRight />}
                        </div>
                    </div>
                )}
                {(!item.items || !item.items?.length) && (
                    <Link href={item.href as string}>
                        <div
                            className={clsx(
                                "flex items-center px-4 py-3 hover:!bg-slate-200 cursor-pointer select-none",
                                item.href === path
                                    ? "text-black font-semibold"
                                    : "text-inherit",
                            )}
                        >
                            {item.icon && (
                                <div className="mr-2">{item.icon}</div>
                            )}
                            <p className="text-sm">{item.label as string}</p>
                        </div>
                    </Link>
                )}
            </li>
            {open && item.items?.length && (
                <ul>
                    {item.items.map((subitem) => (
                        <li
                            key={subitem.label}
                            className={clsx(
                                "flex items-center text-sm hover:bg-slate-200 cursor-pointer select-none",
                                subitem.label.toLowerCase() ===
                                    tab?.toLowerCase()
                                    ? "text-black font-semibold"
                                    : "text-inherit",
                            )}
                            onClick={() => onItemClick(false)}
                        >
                            <Link
                                href={subitem.href as string}
                                className="w-full px-10 py-3 "
                            >
                                {subitem.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}
