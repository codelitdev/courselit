import { ShieldAlert } from "lucide-react";

interface PermissionErrorProps {
    missingPermissions?: string[];
}

export default function PermissionError({
    missingPermissions = ["site:manage"],
}: PermissionErrorProps) {
    return (
        <div className="bg-muted/10 flex items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-2xl w-full">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold">Permission Required</h1>
                <p className="text-muted-foreground">
                    You don&apos;t have the required permission
                    {missingPermissions.length !== 1 ? "s" : ""} to access this
                    area.
                </p>
                {missingPermissions.length > 0 && (
                    <div className="space-y-2">
                        <p className="font-medium">
                            Required at-least one of these:
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {missingPermissions.map((permission, index) => (
                                <span
                                    key={index}
                                    className="bg-muted px-3 py-1 rounded-full text-sm font-medium text-primary"
                                >
                                    {permission}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
