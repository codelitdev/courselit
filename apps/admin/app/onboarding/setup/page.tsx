"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SetupWizard } from "@/components/onboarding/wizard/wizard";

function SetupWizardRoute() {
  const params = useSearchParams();
  return (
    <SetupWizard
      isNew={params.get("new") === "1"}
      checkoutReturn={params.get("checkout") === "return"}
      resume={params.get("resume") === "1"}
    />
  );
}

export default function OnboardingSetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupWizardRoute />
    </Suspense>
  );
}
