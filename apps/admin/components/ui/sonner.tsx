"use client";

import { Toaster as Sonner } from "sonner";
import type { ComponentProps } from "react";

export function Toaster(props: ComponentProps<typeof Sonner>) {
  return <Sonner position="bottom-right" {...props} />;
}
