export function PermissionMessage({ permission }: { permission: string }) {
  return (
    <section className="rounded-xl border border-dashed p-10 text-center">
      <h1 className="text-lg font-semibold">Access restricted</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You need the {permission} permission to use this area.
      </p>
    </section>
  );
}
