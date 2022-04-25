import * as React from "react";
import { styled } from "@mui/system";

const StyledSection = styled("section")({});

interface SectionProps {
  children: any;
}

const Section = (props: SectionProps) => {
  return (
    <StyledSection
      sx={(theme: any) =>
        Object.assign(
          {},
          {
            backgroundColor: theme.palette.background.paper,
            padding: theme.spacing(2),
            borderRadius: theme.spacing(1),
            boxShadow: theme.shadows[12],
          },
          theme.section
        )
      }
    >
      {props.children}
    </StyledSection>
  );
};

export default Section;
