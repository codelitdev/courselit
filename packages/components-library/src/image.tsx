import * as React from "react";
import { styled } from "@mui/system";

const StyledImg = styled("img")({});

interface ImgProps {
  src: string;
  isThumbnail?: boolean;
  classes?: string;
  alt?: string;
  defaultImage?: string;
}

const Image = (props: ImgProps) => {
  const { src, classes, alt, defaultImage } = props;
  const source = src || defaultImage || "/courselit_backdrop.webp";

  return (
    <StyledImg
      className={classes}
      src={source}
      alt={alt}
      sx={{
        objectFit: "cover",
        width: "100%",
        height: "100%",
        borderRadius: 2,
      }}
    />
  );
};

export default Image;
