import { Button } from "@components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@components/ui/tooltip";
import { BTN_TOGGLE_THEME } from "@ui-config/strings";

export default function NextThemeSwitcher({
    variant = "outline",
}: {
    variant?: "outline" | "ghost";
}) {
    const { theme, setTheme } = useTheme();
    const isDark = theme === "dark";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    variant={variant}
                    size="icon"
                >
                    {isDark ? (
                        <Sun className="w-4 h-4" />
                    ) : (
                        <Moon className="w-4 h-4" />
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{BTN_TOGGLE_THEME}</TooltipContent>
        </Tooltip>
    );
}
