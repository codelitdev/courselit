import React from "react";
import { IconButton } from "@courselit/components-library";
import { Menu } from "@courselit/icons";
import Branding from "./branding";
import ExitCourseButton from "./exit-course-button";
import { SiteInfo } from "@courselit/common-models";

interface HeaderProps {
    onMenuClick?: (...args: any[]) => void;
    siteinfo: SiteInfo;
}

const Header = ({ onMenuClick, siteinfo }: HeaderProps) => {
    return (
        <header className="flex w-full z-10 justify-between">
            {onMenuClick && (
                <IconButton
                    className="px-2 md:!hidden"
                    variant="soft"
                    onClick={onMenuClick}
                >
                    <Menu />
                </IconButton>
            )}
            <Branding siteinfo={siteinfo} />
            <ExitCourseButton />
        </header>
    );
};

export default Header;
