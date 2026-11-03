"use client";

import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Delivery = { sender: "school" | "platform"; integrationStatus: string | null };

/** Warns the team when the school has no working mailing service, so they
 * know purchase receipts and notifications go out from the default sender
 * and broadcasts and sequences are unavailable. */
export function EmailDeliveryNotice({ schoolId }: { schoolId: string | null }) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    void fetch("/api/v1/school/mails/delivery", {
      credentials: "include",
      cache: "no-store",
      headers: { "x-school-id": schoolId },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: Delivery | null) => {
        if (active) setDelivery(body);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [schoolId]);

  if (delivery?.sender !== "platform") return null;
  return (
    <Card role="status" className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
        <div className="space-y-1">
          <CardTitle className="text-sm">
            Your school's mailing service isn't set up
          </CardTitle>
          <CardDescription>
            Purchase receipts, access emails and notifications are still delivered, but
            they come from CourseLit's default sender instead of your school. Broadcasts
            and sequences can't be sent until the mailing service is ready.
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}
