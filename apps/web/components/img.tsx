import type { AppState } from "@courselit/state-management";
import React from "react";
import { connect } from "react-redux";

interface ImgProps {
    src: string;
    isThumbnail?: boolean;
    classes?: string;
    alt?: string;
    defaultImage?: string;
}

const Img = (props: ImgProps) => {
    const { src, classes, alt, defaultImage } = props;

    const source = src || defaultImage || "/courselit_backdrop.webp";

    return (
        <>
            <img className={classes} src={source} alt={alt} />
            <style jsx>
                {`
                    img {
                        object-fit: "cover";
                        width: 100%;
                        height: 100%;
                    }
                `}
            </style>
        </>
    );
};

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

export default connect(mapStateToProps)(Img);
