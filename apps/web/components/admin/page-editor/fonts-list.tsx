import React from "react";
import { Typeface } from "@courselit/common-models";
import { Star } from "@courselit/icons";

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
        <div>
            <ul>
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
        </div>
    );
}

export default FontsList;
