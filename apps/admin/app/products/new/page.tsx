"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { PageHeader } from "@/components/layout/page-header";
import type { ProductKind, School } from "@/components/products/product-types";
import { Button } from "@/components/ui/codelit/button";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { AuthGate } from "../../../components/auth-gate";

export default function NewProductPage() {
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [kind, setKind] = useState<ProductKind>("course");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSetBreadcrumb([
    { label: "Products", href: "/products" },
    { label: "New product" },
  ]);

  useEffect(() => {
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: School[] }) => {
        setSchool(body.items?.find((item) => item.selected) ?? body.items?.[0] ?? null);
      })
      .catch(() => setError("Unable to load the active school."));
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (school) headers["x-school-id"] = school.id;
      const response = await fetch("/api/v1/products", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ kind, title: title.trim(), description: "" }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
          details?: { reason?: string };
        } | null;
        if (body?.details?.reason === "slug_taken") {
          throw new Error("A product with this title already exists.");
        }
        throw new Error(body?.message ?? "Unable to create the product.");
      }
      const product = (await response.json()) as { id: string };
      router.replace(`/products/${product.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create the product.",
      );
      setLoading(false);
    }
  }

  return (
    <AuthGate>
      <div className="page-shell">
        <PageHeader
          title="New product"
          description="Create a new course or digital download."
        />

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <form onSubmit={create} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="product-title">Title</Label>
            <Input
              id="product-title"
              required
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Photoshop For Dummies"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product-type">Product type</Label>
            <Select
              value={kind}
              onValueChange={(value) => setKind(value as ProductKind)}
            >
              <SelectTrigger id="product-type" className="w-full">
                <SelectValue placeholder="Select product type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="download">Digital download</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={!title.trim() || loading}>
              {loading ? "Creating…" : "Continue"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/products">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </AuthGate>
  );
}
