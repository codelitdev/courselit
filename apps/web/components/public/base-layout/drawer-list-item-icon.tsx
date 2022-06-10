import React from "react";
import { styled } from "@mui/system";
import { Grid, ListItemIcon } from "@mui/material";

const PREFIX = "DrawerListItemIcon";

const classes = {
    rightIcon: `${PREFIX}-rightIcon`,
};

const StyledGrid = styled(Grid)({
    [`& .${classes.rightIcon}`]: {
        minWidth: 0,
    },
});

interface DrawerListItemIconProps {
    icon: React.Component;
    right: boolean;
}

const DrawerListItemIcon = ({
    icon,
    right = false,
}: DrawerListItemIconProps) => {
    return (
        <StyledGrid item>
            <ListItemIcon className={right ? classes.rightIcon : ""}>
                {icon}
            </ListItemIcon>
        </StyledGrid>
    );
};

export default DrawerListItemIcon;
