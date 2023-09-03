import { IconButton } from "@courselit/components-library";
import { Menu } from "@courselit/icons";
import React from "react";
import SessionButton from "../session-button";
import Branding from "./branding";

interface HeaderProps {
    onMenuClick?: (...args: any[]) => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
    return (
        <header className="flex w-full p-4 z-10 justify-between bg-white/80 backdrop-blur-md">
            {onMenuClick && (
                <IconButton
                    className="px-2 md:!hidden"
                    variant="soft"
                    onClick={onMenuClick}
                >
                    <Menu />
                </IconButton>
            )}
            <Branding />
            <SessionButton />
        </header>
    );
};

export default Header;
