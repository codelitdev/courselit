import React from "react";
import { useRouter } from "next/router";
import Tab from "../models/Tab";
import { Link } from "@courselit/components-library";

interface TabsProps {
    tabs: Tab[];
}

function Tabs({ tabs }: TabsProps) {
    const router = useRouter();

    return (
        <ul className="flex gap-2">
            {tabs.map((tab: Tab) => (
                <li
                    key={tab.text}
                    className={`text-xl font-medium ${
                        router.asPath === tab.url ? "underline" : "no-underline"
                    }`}
                >
                    <Link href={tab.url}>{tab.text}</Link>
                </li>
            ))}
        </ul>
    );
}

export default Tabs;
