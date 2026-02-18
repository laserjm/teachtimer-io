import { Space_Mono } from "next/font/google";
import TimerBrutalist from "@/components/timer-designs/timer-one";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export default function Page() {
  return (
    <div className={spaceMono.variable}>
      <TimerBrutalist />
    </div>
  );
}
