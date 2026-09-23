"use client";

import type { WidgetEditorProps } from "@frontlit/page-builder/models";
import { useEffect, useState } from "react";
import { BannerEditor, FieldGroup, SelectField } from "../_shared/fields";
import { salesData } from "../shared/utils";
import type { BannerSettings } from "./settings";

export default function BannerAdminWidget(
  props: WidgetEditorProps<BannerSettings> & {
    pageData?: Parameters<typeof salesData>[0];
  },
) {
  const { settings, onChange, pageData } = props;
  const assumedProduct = pageData ? salesData(pageData)?.resourceType === "product" : false;
  const [products, setProducts] = useState<Array<{ id: string; title: string }>>([]);
  useEffect(() => {
    if (assumedProduct) return;
    void fetch("/api/v1/products?limit=50", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: Array<{ id: string; title: string }> }) => {
        setProducts(body.items ?? []);
      })
      .catch(() => setProducts([]));
  }, [assumedProduct]);
  return (
    <div className="flex flex-col gap-5">
      {assumedProduct ? null : (
        <FieldGroup title="Product">
          <SelectField
            label="Product"
            value={settings.productId ?? ""}
            options={[
              { label: "Select a product", value: "" },
              ...products.map((product) => ({
                label: product.title,
                value: product.id,
              })),
            ]}
            onChange={(productId) => onChange({ ...settings, productId })}
          />
        </FieldGroup>
      )}
      <BannerEditor settings={settings} onChange={onChange} />
    </div>
  );
}
