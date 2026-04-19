import type { LucideIcon } from "lucide-react";
import {
    BadgeCheck,
    BookOpen,
    Code2,
    CreditCard,
    Download,
    Mail,
    Newspaper,
    PanelsTopLeft,
    ServerCog,
    ShieldCheck,
    UsersRound,
} from "lucide-react";
import { type CardAccent, DocCard } from "./shared/card";

type FeatureItem = {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    accent: CardAccent;
};

const items: FeatureItem[] = [
    {
        title: "Courses",
        description:
            "Structure sections, lessons, quizzes, drip schedules, and learner journeys.",
        href: "/courses/introduction",
        icon: BookOpen,
        accent: "teal",
    },
    {
        title: "Communities",
        description:
            "Run free or paid communities with memberships, moderation tools, and bundled access to additional products.",
        href: "/communities/introduction",
        icon: UsersRound,
        accent: "pink",
    },
    {
        title: "Digital Downloads",
        description:
            "Sell files, deliver lead magnets, and control pricing and download access.",
        href: "/downloads/introduction",
        icon: Download,
        accent: "amber",
    },
    {
        title: "Website Builder",
        description:
            "Build polished sales pages and school websites with blocks, themes, rich text, embeds, and custom layouts.",
        href: "/website/introduction",
        icon: PanelsTopLeft,
        accent: "blue",
    },
    {
        title: "Email Automation",
        description:
            "Send broadcasts, build sequences, and nurture your audience with templates, analytics, and automation flows.",
        href: "/email-marketing/introduction",
        icon: Mail,
        accent: "purple",
    },
    {
        title: "Blog",
        description:
            "Publish blog content under the same brand and domain as your courses and downloads.",
        href: "/blog/introduction",
        icon: Newspaper,
        accent: "orange",
    },
    {
        title: "Payments",
        description:
            "Connect Stripe, Lemon Squeezy and Razorpay while keeping control of your revenue.",
        href: "/schools/set-up-payments",
        icon: CreditCard,
        accent: "rose",
    },
    {
        title: "Certificates",
        description:
            "Issue branded completion certificates and let customers access them later.",
        href: "/courses/certificates",
        icon: BadgeCheck,
        accent: "indigo",
    },
    {
        title: "School Admin",
        description:
            "Configure domains, SSO, login providers, payments, and school-wide settings.",
        href: "/schools/introduction",
        icon: ShieldCheck,
        accent: "fuchsia",
    },
    {
        title: "Developer API",
        description:
            "Integrate with CourseLit programmatically using API keys and the REST user API.",
        href: "/developers/introduction",
        icon: Code2,
        accent: "slate",
    },
    {
        title: "Self-hosting",
        description:
            "Deploy the open-source stack on your own infrastructure and keep control of your data.",
        href: "/self-hosting/introduction",
        icon: ServerCog,
        accent: "violet",
    },
];

export function FeatureShowcase() {
    return (
        <div className="not-prose doc-card-grid doc-card-grid--3">
            {items.map((item) => {
                const Icon = item.icon;
                return (
                    <DocCard
                        key={item.title}
                        href={item.href}
                        title={item.title}
                        description={item.description}
                        icon={<Icon size={18} />}
                        accent={item.accent}
                    />
                );
            })}
        </div>
    );
}
