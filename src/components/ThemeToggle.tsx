import type { ThemeName } from "../types";
import { useTheme } from "../theme/ThemeContext";
import Segmented from "./Segmented";

export default function ThemeToggle() {
  const { theme, set } = useTheme();
  return <Segmented<ThemeName>
    options={[
      { label: "Light", value: "light" },
      { label: "Dark", value: "dark" },
      { label: "Warm", value: "warm" },
    ]}
    value={theme}
    onPick={set}
    ariaLabel="Theme"
  />;
}
