export function textDoc(text: string) {
  return {
    type: "doc" as const,
    content: text
      ? [
          {
            type: "paragraph" as const,
            content: [{ type: "text" as const, text }],
          },
        ]
      : [],
  };
}
