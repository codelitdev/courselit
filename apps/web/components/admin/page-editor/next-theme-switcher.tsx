import { Button } from "@components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

export default function NextThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    const isDark = theme === "dark";

    return (
        <Button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            variant="outline"
            size="icon"
        >
            {isDark ? (
                <Moon className="w-4 h-4" />
            ) : (
                <Sun className="w-4 h-4" />
            )}
        </Button>
    );
}
