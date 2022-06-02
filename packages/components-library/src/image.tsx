import * as React from "react";
import NextImage from 'next/image';

interface ImgProps {
    src: string;
    isThumbnail?: boolean;
    classes?: string;
    alt?: string;
    defaultImage?: string;
    loading?: "eager" | "lazy";
    width?: number;
    height?: number;
}

// Copied from: https://github.com/vercel/next.js/blob/canary/examples/image-component/pages/shimmer.js
const shimmer = (w: number, h: number) => `
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
</svg>`

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str)

const Image = (props: ImgProps) => {
    const { src, alt, defaultImage, loading = "lazy", width = 700, height = 475 } = props;
    const source = src || defaultImage || "/courselit_backdrop.webp";
    console.log('Image', src);

    return (
        <NextImage
            width={700}
            height={475}
            src={source}
            placeholder="blur"
            blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(700, 475))}`}
            alt={alt}
            priority={ loading === "eager" ? true : false }/>
    );
};

export default Image;
