import { Mail, MessageCircle, Twitter } from "lucide-react";
import { DocCard } from "./shared/card";

const helpChannels = [
    {
        title: "Discord",
        description: "Fastest way to get help from the community.",
        href: "https://discord.com/invite/GR4bQsN",
        icon: <MessageCircle size={18} />,
        accent: "teal" as const,
    },
    {
        title: "X",
        description: "Send us a message on X.",
        href: "https://x.com/courselit",
        icon: <Twitter size={18} />,
        accent: "slate" as const,
    },
    {
        title: "Email",
        description: "Send us an email.",
        href: "mailto:hi@codelit.dev",
        icon: <Mail size={18} />,
        accent: "rose" as const,
    },
];

export function GetHelpCards() {
    return (
        <div className="not-prose doc-card-grid doc-card-grid--3">
            {helpChannels.map((channel) => (
                <DocCard
                    key={channel.href}
                    href={channel.href}
                    title={channel.title}
                    description={channel.description}
                    icon={channel.icon}
                    accent={channel.accent}
                    newTab
                />
            ))}
        </div>
    );
}
