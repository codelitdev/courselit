import React from "react";
import { styled } from "@mui/material/styles";
import { ListItem, ListItemIcon, Typography } from "@mui/material";
import { OpenInNew } from "@mui/icons-material";
import Link from "next/link";
import LinkModel from "../../../../ui-models/link";

const PREFIX = "MenuItem";

const classes = {
    externalLink: `${PREFIX}-externalLink`,
};

const StyledLink = styled(Link)({
    [`& .${classes.externalLink}`]: {
        textDecoration: "none",
        color: "inherit",
        display: "block",
    },
});

interface MenuItemProps {
    link: LinkModel;
    closeDrawer: (...args: any[]) => void;
}

const MenuItem = (props: MenuItemProps) => {
    const { link } = props;

    return link.destination.indexOf("http") !== -1 || link.newTab ? (
        <a
            href={link.destination}
            key={link.text}
            target="_blank"
            rel="noreferrer noopener"
            className={classes.externalLink}
            onClick={props.closeDrawer ? props.closeDrawer : () => {}}
        >
            <ListItem button>
                <Typography variant="subtitle2">{link.text}</Typography>
                {link.newTab && (
                    <ListItemIcon>
                        <OpenInNew />
                    </ListItemIcon>
                )}
            </ListItem>
        </a>
    ) : (
        <StyledLink href={link.destination} key={link.text}>
            <ListItem
                button
                component="a"
                onClick={props.closeDrawer ? props.closeDrawer : () => {}}
            >
                <Typography variant="subtitle2">{link.text}</Typography>
            </ListItem>
        </StyledLink>
    );
};

export default MenuItem;
