"use client";

import { Section } from "@courselit/page-primitives";
import { useParams } from "next/navigation";
import { ThemeContext } from "@components/contexts";
import { useContext } from "react";

export default function AccomplishmentPage() {
    const params = useParams();
    const certId = params.certId;
    const { theme } = useContext(ThemeContext);

    return (
        <Section theme={theme.theme}>
            <iframe
                src={`/certificate/internal/${certId}`}
                className="w-full h-[900px]"
            />
        </Section>
    );
}
