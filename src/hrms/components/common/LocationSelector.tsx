import React, { useMemo } from "react";
import { State, City } from "country-state-city";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";

// India-scoped — consistent with the rest of the app (₹ currency, the hardcoded
// INDIAN_STATES list already used in CRM-FRONTEND/src/pages/Purchases.tsx).
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
  const states = useMemo(() => State.getStatesOfCountry(COUNTRY_CODE), []);

  return (
    <Select value={value || (allOption ? "all" : "")} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {allOption && <SelectItem value="all">All States</SelectItem>}
        {states.map((s) => (
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
  const cities = useMemo(() => {
    if (!stateName || stateName === "all") return [];
    const state = State.getStatesOfCountry(COUNTRY_CODE).find((s) => s.name === stateName);
    return state ? City.getCitiesOfState(COUNTRY_CODE, state.isoCode) : [];
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
