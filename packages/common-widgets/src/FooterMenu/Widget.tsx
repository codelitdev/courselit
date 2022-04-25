import * as React from "react";
import { WidgetProps } from "@courselit/common-models";
import { Grid, Theme, Typography } from "@mui/material";
import Link from "next/link";
import MuiLink from "@mui/material/Link";

export interface FooterMenuWidgetProps extends WidgetProps {
  navigation: any[];
}

const Widget = (props: FooterMenuWidgetProps) => {
  const { section, state } = props;
  const navigation = state.navigation.filter(
    (link) => link.category === "footer"
  );

  return (
    <Grid item>
      <nav>
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          component="ul"
          sx={{
            listStyle: "none",
            margin: 0,
            paddingInlineStart: 0,
          }}
        >
          {navigation.map((link: any) => (
            <Grid
              item
              component="li"
              xs={12}
              sm={2}
              key={link.text}
              sx={{
                textAlign: {
                  xs: "start",
                  md: section === "footerRight" ? "end" : "start",
                },
              }}
            >
              <Link href={link.destination} key={link.text}>
                <MuiLink
                  sx={{
                    color: "text.primary",
                  }}
                >
                  <Typography variant="body2">{link.text}</Typography>
                </MuiLink>
              </Link>
            </Grid>
          ))}
        </Grid>
      </nav>
    </Grid>
  );
};

export default Widget;
