import { JetBrains_Mono } from "next/font/google";
import TimerSwiss from "@/components/timer-designs/timer-one-b";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export default function Page() {
  return (
    <div className={jetbrainsMono.variable}>
      <TimerSwiss />
    </div>
  );
}
