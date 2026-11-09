export type TextSide = "left" | "right";

/**
 * Which side of the image or buy card the text sits on. Pages saved before
 * stacked layouts were removed may still say "top" (text first, so it reads
 * like left) or "bottom" (text after, so right).
 */
export function textSide(position: unknown): TextSide {
  return position === "right" || position === "bottom" ? "right" : "left";
}

/** The image or buy card sits opposite the text. */
export function oppositeSide(side: TextSide): TextSide {
  return side === "left" ? "right" : "left";
}
