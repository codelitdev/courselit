"use client";
import { Accordion } from "@courselit/components-library";
import { useState } from "react";
import { SetupAccordionItem } from "./setup-accordion-item";

export default function SetupAccordion({
    checklist,
    totalChecklistItems,
}: {
    checklist: string[];
    totalChecklistItems: number;
}) {
    const [itemValue, setItemValue] = useState<string | undefined>("branding");

    return (
        <>
            <p className="text-sm">
                <span className="font-medium">Completed</span> -{" "}
                {totalChecklistItems - checklist.length}/{totalChecklistItems}{" "}
                steps
            </p>
            <Accordion
                type="single"
                collapsible
                value={itemValue}
                onValueChange={(value) => setItemValue(value)}
            >
                {setupItems.map((item) => (
                    <SetupAccordionItem
                        key={item.value}
                        {...item}
                        isCompleted={!checklist.includes(item.value)}
                    />
                ))}
            </Accordion>
        </>
    );
}

const setupItems = [
    {
        value: "branding",
        title: "Customize your school",
        description:
            "Change the school name to make it yours. Optionally, add a logo to make it recognizable.",
        buttonText: "Open branding settings",
        buttonLink: "/dashboard/settings?tab=Branding",
    },
    {
        value: "payment",
        title: "Set up payment",
        description: (
            <p>
                Add your own payment gateway and keep 100% of what you make.{" "}
                <span className="font-medium">No transaction fees</span>.
                CourseLit supports{" "}
                <a
                    href="https://stripe.com"
                    target="_blank"
                    rel="noopener"
                    className="underline"
                >
                    Stripe
                </a>
                ,{" "}
                <a
                    href="https://www.lemonsqueezy.com"
                    target="_blank"
                    rel="noopener"
                    className="underline"
                >
                    Lemonsqueezy
                </a>{" "}
                and{" "}
                <a
                    href="https://razorpay.com"
                    target="_blank"
                    rel="noopener"
                    className="underline"
                >
                    Razorpay
                </a>
                .
            </p>
        ),
        buttonText: "Open payment settings",
        buttonLink: "/dashboard/settings?tab=Payment",
    },
    {
        value: "page",
        title: "Edit your homepage",
        description:
            "Delete the first rich text block which says, 'This is the default page created for you by CourseLit'.",
        buttonText: "Open page builder",
        buttonLink: "/dashboard/page/homepage?redirectTo=/dashboard/get-set-up",
    },
    {
        value: "product",
        title: "Create your first product",
        description: "Create a course and publish it to make it live.",
        buttonText: "Create a course",
        buttonLink: "/dashboard/products/new",
    },
];
