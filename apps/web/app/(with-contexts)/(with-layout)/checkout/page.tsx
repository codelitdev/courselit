"use client";

import { ThemeContext } from "@components/contexts";
import { Header1, Section } from "@courselit/page-primitives";
import { useContext } from "react";
import ProductCheckout from "./product";

export default function CheckoutPage() {
    const { theme } = useContext(ThemeContext);
    return (
        <Section theme={theme.theme}>
            <div className="flex flex-col">
                <Header1 theme={theme.theme} className="mb-8">
                    Checkout
                </Header1>
                <ProductCheckout />
            </div>
        </Section>
    );
}
