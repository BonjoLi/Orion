import { THEME_KEY } from "@/components/theme/constants";

// Runs before first paint so a returning visitor never sees the wrong theme flash.
// A saved choice wins; otherwise a first visit follows the operating system.
const SCRIPT = `(function(){var t;try{t=localStorage.getItem("${THEME_KEY}")}catch(e){}if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t})()`;

// suppressHydrationWarning: browser extensions add their own <script> to <head> before React
// starts, so React can pair this tag with theirs and report a mismatch that isn't ours.
export function ThemeScript() {
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
