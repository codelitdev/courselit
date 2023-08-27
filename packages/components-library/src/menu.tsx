import * as React from "react";
import { Menu as MuiMenu, MenuItem } from "@mui/material";
import IconButton from "./icon-button";
import Button from "./button";

interface LinkOption {
    label: string;
    type: "link";
    href: string;
    newTab?: boolean;
}

interface ButtonOption {
    label: string;
    type: "button";
    onClick: (...args: any[]) => void;
}

type Option = LinkOption | ButtonOption;

interface MenuWithButton {
    options: Option[];
    label: string;
    buttonColor?: string;
    style?: Record<string, string>;
}

interface MenuWithIconButton {
    options: Option[];
    icon: any;
    openIcon?: any;
    style?: Record<string, string>;
}

type MenuProps = MenuWithButton | MenuWithIconButton;

export default function Menu(props: MenuProps) {
    const { options } = props;
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
            {"label" in props && (
                <Button
                    component="button"
                    id="menu-button"
                    onClick={handleClick}
                    style={{ ...props.style }}
                >
                    {props.label}
                </Button>
            )}
            {"icon" in props && (
                <IconButton
                    onClick={handleClick}
                    variant="soft"
                    style={{ ...props.style }}
                >
                    {open && (props.openIcon ? props.openIcon : props.icon)}
                    {!open && props.icon}
                </IconButton>
            )}
            <MuiMenu
                id="basic-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    "aria-labelledby": "menu-button",
                }}
            >
                {options
                    .filter((option) => !!option)
                    .map((option) =>
                        option.type === "link" ? (
                            <MenuItem
                                component="a"
                                onClick={() => {
                                    handleClose();
                                    window.location.href = option.href;
                                }}
                                key={option.label}
                                target={option.newTab ? "_blank" : "_self"}
                            >
                                {option.label}
                            </MenuItem>
                        ) : (
                            <MenuItem
                                onClick={() => {
                                    option.onClick();
                                    handleClose();
                                }}
                                key={option.label}
                            >
                                {option.label}
                            </MenuItem>
                        )
                    )}
            </MuiMenu>
        </div>
    );
}
