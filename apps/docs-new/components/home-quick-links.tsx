import { Code2, LayoutGrid, Rocket, ServerCog } from "lucide-react";
import { DocCard } from "./shared/card";

const quickLinks = [
    {
        title: "Quick Start",
        description: "Learn the basics and set up your first course",
        href: "/getting-started/quick-start",
        icon: <Rocket size={18} />,
        accent: "teal" as const,
    },
    {
        title: "Features",
        description: "Explore all the features CourseLit offers",
        href: "/getting-started/features",
        icon: <LayoutGrid size={18} />,
        accent: "blue" as const,
    },
    {
        title: "Self-Hosting",
        description: "Host CourseLit on your own infrastructure",
        href: "/self-hosting/introduction",
        icon: <ServerCog size={18} />,
        accent: "violet" as const,
    },
    {
        title: "Developers",
        description: "Integrate CourseLit with your applications",
        href: "/developers/introduction",
        icon: <Code2 size={18} />,
        accent: "slate" as const,
    },
];

export function HomeQuickLinks() {
    return (
        <div className="not-prose doc-card-grid doc-card-grid--4">
            {quickLinks.map((link) => (
                <DocCard
                    key={link.href}
                    href={link.href}
                    title={link.title}
                    description={link.description}
                    icon={link.icon}
                    accent={link.accent}
                />
            ))}
        </div>
    );
}
