"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import { Checkbox } from "@/components/ui/codelit/checkbox";
import { Input } from "@/components/ui/codelit/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/codelit/popover";
import { selectionLabel, toggleIncludedProduct } from "./included-products";

export type IncludableProduct = {
  id: string;
  title: string;
  kind: string;
  status: string;
};

/**
 * A dropdown of the school's products with a checkbox each, for picking the
 * products a community plan includes. Lists published products, plus any
 * already selected product that is no longer published so it can be removed.
 */
export function IncludedProductsPicker({
  id,
  products,
  selected,
  loading,
  onChange,
}: {
  id?: string;
  products: IncludableProduct[];
  selected: string[];
  loading: boolean;
  onChange: (selected: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const choices = products.filter(
    (product) => product.status === "published" || selected.includes(product.id),
  );
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? choices.filter((product) => product.title.toLowerCase().includes(needle))
    : choices;

  return (
    <Popover onOpenChange={(open) => (open ? undefined : setQuery(""))}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{selectionLabel(selected, products)}</span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
        {choices.length > 6 ? (
          <Input
            aria-label="Search products"
            placeholder="Search products"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mb-2"
          />
        ) : null}
        <fieldset className="max-h-64 overflow-y-auto" aria-label="Products">
          {loading ? (
            <p className="p-2 text-center text-sm text-muted-foreground">
              Loading products...
            </p>
          ) : shown.length === 0 ? (
            <p className="p-2 text-center text-sm text-muted-foreground">
              {choices.length === 0 ? "No published products yet" : "No matching products"}
            </p>
          ) : (
            shown.map((product) => {
              const checkboxId = `${id ?? "included"}-${product.id}`;
              return (
                <label
                  key={product.id}
                  htmlFor={checkboxId}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={selected.includes(product.id)}
                    onCheckedChange={() =>
                      onChange(toggleIncludedProduct(selected, product.id))
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{product.title}</span>
                  {product.status !== "published" ? (
                    <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                      Unpublished
                    </span>
                  ) : (
                    <span className="text-xs capitalize text-muted-foreground">
                      {product.kind}
                    </span>
                  )}
                </label>
              );
            })
          )}
        </fieldset>
      </PopoverContent>
    </Popover>
  );
}
