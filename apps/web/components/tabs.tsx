import React from "react";
import { styled, Link as MuiLink } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/router";
import Tab from "../models/Tab";

interface TabsProps {
    tabs: Tab[];
}

const StyledUl = styled("ul")({
    listStyle: "none",
    margin: 0,
    padding: 0,
});

const StyledLi = styled("li")(({ theme }: { theme: any }) => ({
    float: "left",
    marginRight: theme.spacing(2),
}));

function Tabs({ tabs }: TabsProps) {
    const router = useRouter();

    return (
        <StyledUl>
            {tabs.map((tab: Tab) => (
                <StyledLi key={tab.text}>
                    <Link href={tab.url}>
                        <MuiLink
                            variant="h5"
                            color="inherit"
                            sx={{
                                cursor: "pointer",
                                textDecoration:
                                    router.asPath === tab.url
                                        ? "underline"
                                        : "none",
                            }}
                        >
                            {tab.text}
                        </MuiLink>
                    </Link>
                </StyledLi>
            ))}
        </StyledUl>
    );
}

export default Tabs;
