import React from "react";
import { Typeface } from "@courselit/common-models";
import { EDIT_PAGE_BUTTON_FONTS } from "../../../ui-config/strings";
import { Cross as Close, Star } from "@courselit/icons";
import { IconButton } from "@courselit/components-library";

interface FontListProps {
    draftTypefaces: Typeface[];
    saveDraftTypefaces: (name: string) => void;
    onClose: () => void;
}

function FontsList({
    draftTypefaces,
    saveDraftTypefaces,
    onClose,
}: FontListProps) {
    const fonts = [
        "Roboto",
        "Open Sans",
        "Montserrat",
        "Lato",
        "Poppins",
        "Source Sans Pro",
        "Raleway",
        "Noto Sans",
        "Inter",
        "Merriweather",
        "Alegreya",
        "Aleo",
        "Muli",
        "Arapey",
        "Nunito",
        "Carme",
        "Rubik",
        "Enriqueta",
    ];
    const defaultTypeface = draftTypefaces.filter(
        (x) => x.section === "default",
    )[0]?.typeface;

    return (
        <ul>
            <li className="flex items-center px-2 py-3 justify-between">
                <h2 className="text-lg font-medium">
                    {EDIT_PAGE_BUTTON_FONTS}
                </h2>
                <IconButton onClick={onClose} variant="soft">
                    <Close fontSize="small" />
                </IconButton>
            </li>
            {fonts.map((font) => (
                <li
                    className="flex items-center px-2 py-3 hover:!bg-slate-100 cursor-pointer justify-between"
                    onClick={() => saveDraftTypefaces(font)}
                    key={font}
                >
                    {font}
                    {defaultTypeface === font && <Star />}
                </li>
            ))}
        </ul>
    );
}

export default FontsList;
