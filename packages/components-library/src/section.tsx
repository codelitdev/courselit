import * as React from "react";
import { styled } from "@mui/system";

const StyledSection = styled("section")({});

interface SectionProps {
    children: any;
}

const Section = (props: SectionProps) => {
    return (
        <StyledSection sx={(theme: any) => Object.assign({}, theme.section)}>
            {props.children}
        </StyledSection>
    );
};

export default Section;
