import { Sun, Moon, Sunrise, Sunset } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useLocale } from "@/hooks/useLocale";

const CITY_BY_COUNTRY: Record<string, string> = {
  US: "the States",
  GB: "London",
  CA: "Toronto",
  AU: "Sydney",
  DE: "Berlin",
  FR: "Paris",
  ES: "Madrid",
  IT: "Rome",
  NL: "Amsterdam",
  JP: "Tokyo",
  CN: "Shanghai",
  IN: "Mumbai",
  BR: "Sao Paulo",
  MX: "Mexico City",
  NG: "Lagos",
  ZA: "Cape Town",
  KE: "Nairobi",
  AE: "Dubai",
  SG: "Singapore",
  CH: "Zurich",
  SE: "Stockholm",
};

function timeBucket(h: number) {
  if (h < 5) return { greeting: "Burning the midnight oil", Icon: Moon };
  if (h < 12) return { greeting: "Good morning", Icon: Sunrise };
  if (h < 17) return { greeting: "Good afternoon", Icon: Sun };
  if (h < 21) return { greeting: "Good evening", Icon: Sunset };
  return { greeting: "Good evening", Icon: Moon };
}

export function TimeAwareGreeting() {
  const { username } = useUser();
  const loc = useLocale();
  const firstName = (username || "Investor").split(" ")[0];
  const h = new Date().getHours();
  const { greeting, Icon } = timeBucket(h);
  const city = CITY_BY_COUNTRY[loc.country] ?? "wherever you are";

  return (
    <span className="chip">
      <Icon className="h-3 w-3 text-primary" />
      {greeting}, {firstName}. From {city}.
    </span>
  );
}
