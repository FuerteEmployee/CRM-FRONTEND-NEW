import React, { useMemo, useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";

// India-scoped — consistent with the rest of the app (₹ currency, the hardcoded
// INDIAN_STATES list already used in CRM-FRONTEND/src/pages/Purchases.tsx).
//
// IMPORTANT: We do NOT statically import country-state-city here. That package
// bundles all world geography as a single 8.5 MB JSON blob, which previously
// ended up in the initial JS payload and blocked the app from mounting on
// servers with a ~10 MB response-size cap. Instead:
//   • Indian states are hardcoded (there are only 36 — they never change).
//   • Cities are fetched via a dynamic import() that only runs after the user
//     has already loaded the HRMS module and selected a state, so the large
//     dataset is an async chunk that never delays the first paint.

const INDIAN_STATES: { isoCode: string; name: string }[] = [
  { isoCode: "AN", name: "Andaman and Nicobar Islands" },
  { isoCode: "AP", name: "Andhra Pradesh" },
  { isoCode: "AR", name: "Arunachal Pradesh" },
  { isoCode: "AS", name: "Assam" },
  { isoCode: "BR", name: "Bihar" },
  { isoCode: "CH", name: "Chandigarh" },
  { isoCode: "CT", name: "Chhattisgarh" },
  { isoCode: "DN", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { isoCode: "DL", name: "Delhi" },
  { isoCode: "GA", name: "Goa" },
  { isoCode: "GJ", name: "Gujarat" },
  { isoCode: "HR", name: "Haryana" },
  { isoCode: "HP", name: "Himachal Pradesh" },
  { isoCode: "JK", name: "Jammu and Kashmir" },
  { isoCode: "JH", name: "Jharkhand" },
  { isoCode: "KA", name: "Karnataka" },
  { isoCode: "KL", name: "Kerala" },
  { isoCode: "LA", name: "Ladakh" },
  { isoCode: "LD", name: "Lakshadweep" },
  { isoCode: "MP", name: "Madhya Pradesh" },
  { isoCode: "MH", name: "Maharashtra" },
  { isoCode: "MN", name: "Manipur" },
  { isoCode: "ML", name: "Meghalaya" },
  { isoCode: "MZ", name: "Mizoram" },
  { isoCode: "NL", name: "Nagaland" },
  { isoCode: "OR", name: "Odisha" },
  { isoCode: "PY", name: "Puducherry" },
  { isoCode: "PB", name: "Punjab" },
  { isoCode: "RJ", name: "Rajasthan" },
  { isoCode: "SK", name: "Sikkim" },
  { isoCode: "TN", name: "Tamil Nadu" },
  { isoCode: "TG", name: "Telangana" },
  { isoCode: "TR", name: "Tripura" },
  { isoCode: "UP", name: "Uttar Pradesh" },
  { isoCode: "UT", name: "Uttarakhand" },
  { isoCode: "WB", name: "West Bengal" },
];

const COUNTRY_CODE = "IN";

interface LocationSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  className?: string;
  allOption?: boolean;
  placeholder?: string;
}

export const StateSelect: React.FC<LocationSelectProps> = ({
  value,
  onValueChange,
  className,
  allOption,
  placeholder = "Select state",
}) => {
  return (
    <Select value={value || (allOption ? "all" : "")} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {allOption && <SelectItem value="all">All States</SelectItem>}
        {INDIAN_STATES.map((s) => (
          <SelectItem key={s.isoCode} value={s.name}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

interface CitySelectProps extends LocationSelectProps {
  stateName?: string;
}

export const CitySelect: React.FC<CitySelectProps> = ({
  value,
  onValueChange,
  className,
  allOption,
  stateName,
  placeholder = "Select city",
}) => {
  const [cities, setCities] = useState<{ name: string; latitude?: string; longitude?: string }[]>(
    []
  );

  useEffect(() => {
    if (!stateName || stateName === "all") {
      setCities([]);
      return;
    }
    // Lazy-load the heavy geography dataset only when actually needed.
    // This keeps vendor-geo out of the initial JS payload entirely.
    let cancelled = false;
    import("country-state-city").then(({ State, City }) => {
      if (cancelled) return;
      const state = State.getStatesOfCountry(COUNTRY_CODE).find((s) => s.name === stateName);
      setCities(state ? City.getCitiesOfState(COUNTRY_CODE, state.isoCode) : []);
    });
    return () => {
      cancelled = true;
    };
  }, [stateName]);

  return (
    <Select value={value || (allOption ? "all" : "")} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={stateName ? placeholder : "Select a state first"} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {allOption && <SelectItem value="all">All Cities</SelectItem>}
        {cities.map((c) => (
          <SelectItem key={`${c.name}-${c.latitude}-${c.longitude}`} value={c.name}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Combined convenience picker — not currently imported anywhere, kept for API parity
// with the previous stub's exports.
export const LocationSelector: React.FC<{
  state?: string;
  city?: string;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  className?: string;
}> = ({ state, city, onStateChange, onCityChange, className }) => {
  return (
    <div className="flex gap-2">
      <StateSelect value={state} onValueChange={onStateChange} className={className} />
      <CitySelect stateName={state} value={city} onValueChange={onCityChange} className={className} />
    </div>
  );
};
