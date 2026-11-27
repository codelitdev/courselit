import { SCHOOL_BRANDING_IMAGE_MAX_BYTES } from "@courselit/api-contract/school-branding";

export { SCHOOL_BRANDING_IMAGE_MAX_BYTES };

const LIMIT_MB = SCHOOL_BRANDING_IMAGE_MAX_BYTES / (1024 * 1024);

export const BRANDING_IMAGE_TOO_LARGE = `Choose an image under ${LIMIT_MB} MB.`;

/** The message for an API refusal of a branding image, if the reason is one. */
export function brandingImageErrorMessage(reason: unknown): string | null {
  if (reason === "file_too_large" || reason === "logo_too_large") {
    return BRANDING_IMAGE_TOO_LARGE;
  }
  if (reason === "unsupported_branding_type" || reason === "logo_not_image") {
    return "Choose an image file.";
  }
  return null;
}
