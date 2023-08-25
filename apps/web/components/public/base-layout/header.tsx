import React from "react";
import SessionButton from "../session-button";
import Branding from "./branding";

interface HeaderProps {}

const Header = ({}: HeaderProps) => {
    return (
        <div className="flex w-full justify-between">
            <Branding />
            <SessionButton />
        </div>
    );
};

export default Header;
