import * as React from "react";
import { IconButton, Menu as MuiMenu, MenuItem } from "@mui/material";

interface LinkOption {
    label: string;
    type: "link";
    href: string;
}

interface ButtonOption {
    label: string;
    type: "button";
    onClick: (...args: any[]) => void;
}

type Option = LinkOption | ButtonOption;

interface MenuProps {
    options: Option[];
    icon: any;
    openIcon?: any;
}

export default function Menu({ options, icon, openIcon }: MenuProps) {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <div>
            <IconButton
                id="menu-button"
                aria-controls={open ? "basic-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={open ? "true" : undefined}
                onClick={handleClick}
            >
                {open && (openIcon ? openIcon : icon)}
                {!open && icon}
            </IconButton>
            <MuiMenu
                id="basic-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    "aria-labelledby": "menu-button",
                }}
            >
                {options.map((option) =>
                    option.type === "link" ? (
                        <MenuItem component="a" href={option.href}>
                            {option.label}
                        </MenuItem>
                    ) : (
                        <MenuItem onClick={option.onClick}>
                            {option.label}
                        </MenuItem>
                    )
                )}
            </MuiMenu>
        </div>
    );
}
