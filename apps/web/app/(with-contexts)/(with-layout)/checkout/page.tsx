"use client";

import { ThemeContext } from "@components/contexts";
import { Section } from "@courselit/page-primitives";
import { useContext } from "react";
import ProductCheckout from "./product";

export default function CheckoutPage() {
    const { theme } = useContext(ThemeContext);
    return (
        <Section theme={theme.theme}>
            <div className="flex flex-col">
                <ProductCheckout />
            </div>
        </Section>
    );
}
