import * as React from "react";
import { WidgetProps } from "@courselit/common-models";
import { Grid, Typography } from "@mui/material";
import MuiLink from "@mui/material/Link";
import { Section } from "@courselit/components-library";

export interface FooterMenuWidgetProps extends WidgetProps {
    navigation: any[];
}

const Widget = (props: FooterMenuWidgetProps) => {
    const { section, state } = props;
    const navigation = state.navigation.filter(
        (link) => link.category === "footer"
    );

    return (
        <Section>
            <Grid
                item
                component="nav"
                sx={{
                    padding: 2,
                }}
            >
                <Grid
                    container
                    direction="row"
                    component="ul"
                    sx={{
                        listStyle: "none",
                        margin: 0,
                        paddingInlineStart: 0,
                        justifyContent: {
                            xs: "start",
                            md: section === "footerRight" ? "end" : "start",
                        },
                    }}
                >
                    {navigation.map((link: any) => (
                        <Grid
                            item
                            component="li"
                            xs={12}
                            sm={2}
                            key={link.text}
                            sx={{}}
                        >
                            {link.newTab && (
                                <MuiLink
                                    href={link.destination}
                                    key={link.text}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    sx={{
                                        color: "text.primary",
                                    }}
                                >
                                    <Typography variant="body2">
                                        {link.text}
                                    </Typography>
                                </MuiLink>
                            )}
                            {!link.newTab && (
                                <MuiLink
                                    href={link.destination}
                                    key={link.text}
                                    sx={{
                                        color: "text.primary",
                                    }}
                                >
                                    <Typography variant="body2">
                                        {link.text}
                                    </Typography>
                                </MuiLink>
                            )}
                        </Grid>
                    ))}
                </Grid>
            </Grid>
        </Section>
    );
};

export default Widget;
