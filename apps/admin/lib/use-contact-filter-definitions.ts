"use client";

import type { ContactFilterDefinition } from "@sendlit/email-blocks";
import { useEffect, useMemo, useState } from "react";
import {
  buildContactFilterDefinitions,
  type FilterProductOption,
} from "./contact-filters";
import { loadFilterProducts } from "./filter-products";

/**
 * The filters the contact filter builder offers for a school, with its
 * products as the options of the product filter. The other filters work
 * without the products, so a failed load leaves that list empty.
 */
export function useContactFilterDefinitions(
  schoolId: string | undefined,
): ContactFilterDefinition[] {
  const [products, setProducts] = useState<FilterProductOption[]>([]);

  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    loadFilterProducts(schoolId)
      .then((loaded) => {
        if (active) setProducts(loaded);
      })
      .catch(() => {
        if (active) setProducts([]);
      });
    return () => {
      active = false;
    };
  }, [schoolId]);

  return useMemo(() => buildContactFilterDefinitions(products), [products]);
}
