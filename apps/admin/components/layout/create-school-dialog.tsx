"use client";

import {
  type CreatedSchool,
  CreateSchoolForm,
} from "@/components/layout/create-school-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";

export function CreateSchoolDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (school: CreatedSchool) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New school</DialogTitle>
        </DialogHeader>
        <CreateSchoolForm
          enabled={open}
          onSuccess={(school) => {
            onOpenChange(false);
            if (onSuccess) {
              onSuccess(school);
            } else {
              window.location.reload();
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
