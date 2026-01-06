"use client";

import { useRef, useState, useEffect } from "react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { useLoadScript } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { MapPinIcon } from "@phosphor-icons/react";

const libraries: ("places")[] = ["places"];

interface LocationAutocompleteProps {
    name: string;
    placeholder?: string;
    defaultValue?: string;
    onSelect?: (location: { address: string; lat?: number; lng?: number }) => void;
}

export function LocationAutocomplete({
    name,
    placeholder = "Search location...",
    defaultValue = "",
    onSelect,
}: LocationAutocompleteProps) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || "",
        libraries,
    });

    if (!isLoaded) {
        return <Input placeholder="Loading..." disabled />;
    }

    return (
        <PlacesAutocompleteInput
            name={name}
            placeholder={placeholder}
            defaultValue={defaultValue}
            onSelect={onSelect}
        />
    );
}

function PlacesAutocompleteInput({
    name,
    placeholder,
    defaultValue,
    onSelect,
}: LocationAutocompleteProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        debounce: 300,
        defaultValue,
    });

    // Close suggestions on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = async (description: string) => {
        setValue(description, false);
        clearSuggestions();
        setShowSuggestions(false);

        if (onSelect) {
            try {
                const results = await getGeocode({ address: description });
                const { lat, lng } = getLatLng(results[0]);
                onSelect({ address: description, lat, lng });
            } catch {
                onSelect({ address: description });
            }
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            {/* Hidden input for form submission */}
            <input type="hidden" name={name} value={value} />

            {/* Visible autocomplete input */}
            <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    disabled={!ready}
                    placeholder={placeholder}
                    className="pl-9"
                />
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && status === "OK" && data.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                    {data.map((suggestion) => (
                        <li
                            key={suggestion.place_id}
                            onClick={() => handleSelect(suggestion.description)}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-accent flex items-start gap-2"
                        >
                            <MapPinIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <span>{suggestion.description}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
