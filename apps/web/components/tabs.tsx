import React from "react";
import { usePathname } from "next/navigation";
import Tab from "../models/Tab";
import { Link } from "@courselit/components-library";

interface TabsProps {
    tabs: Tab[];
}

function Tabs({ tabs }: TabsProps) {
    const path = usePathname();

    return (
        <ul className="flex gap-2">
            {tabs.map((tab: Tab) => (
                <li
                    key={tab.text}
                    className={`text-xl font-medium ${
                        path === tab.url ? "underline" : "no-underline"
                    }`}
                >
                    <Link href={tab.url}>{tab.text}</Link>
                </li>
            ))}
        </ul>
    );
}

export default Tabs;
