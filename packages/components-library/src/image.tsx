import React from "react";
import NextImage from "next/legacy/image";

interface ImgProps {
    src: string;
    isThumbnail?: boolean;
    classes?: string;
    alt?: string;
    defaultImage?: string;
    loading?: "eager" | "lazy";
    height?: any;
    sizes?: `${string}vw`;
    width?: any;
    borderRadius?: number;
    noDefaultImage?: boolean;
    className?: string;
}

// Copied from: https://github.com/vercel/next.js/blob/canary/examples/image-component/pages/shimmer.js
const shimmer = (w: number | `${number}%`, h: number | "auto") => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#333" offset="20%" />
      <stop stop-color="#222" offset="50%" />
      <stop stop-color="#333" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#333" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) =>
    typeof window === "undefined"
        ? Buffer.from(str).toString("base64")
        : window.btoa(str);

const Image = (props: ImgProps) => {
    const {
        src,
        alt,
        defaultImage,
        loading = "lazy",
        sizes = "100vw",
        noDefaultImage = false,
        className = "",
        width = "w-full",
        height = "h-auto",
    } = props;
    const source = src || defaultImage || "/courselit_backdrop.webp";

    if (noDefaultImage && !src && !defaultImage) {
        return null;
    }

    return (
        <div
            className={`relative ${width} ${height} aspect-video overflow-hidden ${className}`}
        >
            <NextImage
                src={source}
                placeholder="blur"
                blurDataURL={`data:image/svg+xml;base64,${toBase64(
                    shimmer("100%", "auto"),
                )}`}
                alt={alt}
                priority={loading === "eager"}
                sizes={sizes}
                layout="fill"
            />
        </div>
    );
};

export default Image;
