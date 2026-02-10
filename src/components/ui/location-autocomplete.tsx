"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, MapTrifold, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const libraries: ("places")[] = ["places"];

const mapContainerStyle = {
    width: "100%",
    height: "250px",
    borderRadius: "8px",
};

const defaultCenter = {
    lat: 0,
    lng: 20,
};

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
        <PlacesAutocompleteWithMap
            name={name}
            placeholder={placeholder}
            defaultValue={defaultValue}
            onSelect={onSelect}
        />
    );
}

function PlacesAutocompleteWithMap({
    name,
    placeholder,
    defaultValue,
    onSelect,
}: LocationAutocompleteProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mapCenter, setMapCenter] = useState(defaultCenter);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

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

        try {
            const results = await getGeocode({ address: description });
            const { lat, lng } = getLatLng(results[0]);
            setSelectedLocation({ lat, lng });
            setMapCenter({ lat, lng });
            if (onSelect) {
                onSelect({ address: description, lat, lng });
            }
        } catch {
            if (onSelect) {
                onSelect({ address: description });
            }
        }
    };

    const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;

        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        setSelectedLocation({ lat, lng });

        // Reverse geocode to get address
        try {
            const results = await getGeocode({ location: { lat, lng } });
            if (results[0]) {
                const address = results[0].formatted_address;
                setValue(address, false);
                if (onSelect) {
                    onSelect({ address, lat, lng });
                }
            }
        } catch (error) {
            console.error("Reverse geocoding error:", error);
            // Set coordinates as fallback
            setValue(`${lat.toFixed(6)}, ${lng.toFixed(6)}`, false);
            if (onSelect) {
                onSelect({ address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng });
            }
        }
    }, [setValue, onSelect]);

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const toggleMap = () => {
        setShowMap(!showMap);
    };

    // Try to get user's location for initial map center
    useEffect(() => {
        if (showMap && !selectedLocation) {
            navigator.geolocation?.getCurrentPosition(
                (position) => {
                    setMapCenter({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                () => {
                    // Default to Africa view if geolocation fails
                    setMapCenter({ lat: 0, lng: 20 });
                }
            );
        }
    }, [showMap, selectedLocation]);

    return (
        <div ref={wrapperRef} className="relative space-y-2">
            {/* Hidden input for form submission */}
            <input type="hidden" name={name} value={value} />

            {/* Lat/Lng hidden inputs for database storage */}
            {selectedLocation && (
                <>
                    <input type="hidden" name={`${name}_lat`} value={selectedLocation.lat} />
                    <input type="hidden" name={`${name}_lng`} value={selectedLocation.lng} />
                </>
            )}

            {/* Visible autocomplete input with map toggle */}
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    disabled={!ready}
                    placeholder={placeholder}
                    className="pl-9 pr-10"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleMap}
                    className={cn(
                        "absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0",
                        showMap && "text-primary bg-primary/10"
                    )}
                    title={showMap ? "Hide map" : "Show map to select location"}
                >
                    <MapTrifold className="h-4 w-4" />
                </Button>
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
                            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <span>{suggestion.description}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* Interactive Map */}
            {showMap && (
                <div className="relative rounded-lg overflow-hidden border bg-muted/50">
                    <div className="absolute top-2 right-2 z-10">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowMap(false)}
                            className="h-7 w-7 p-0 bg-background/90 backdrop-blur-sm"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground">
                        Click on map to select location
                    </div>

                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        zoom={selectedLocation ? 14 : 2}
                        center={selectedLocation || mapCenter}
                        onClick={handleMapClick}
                        onLoad={onMapLoad}
                        options={{
                            streetViewControl: false,
                            mapTypeControl: false,
                            fullscreenControl: false,
                            zoomControl: true,
                            styles: [
                                {
                                    featureType: "poi",
                                    elementType: "labels",
                                    stylers: [{ visibility: "off" }],
                                },
                            ],
                        }}
                    >
                        {selectedLocation && (
                            <Marker
                                position={selectedLocation}
                                animation={google.maps.Animation.DROP}
                            />
                        )}
                    </GoogleMap>

                    {/* Selected location info */}
                    {selectedLocation && (
                        <div className="p-2 bg-background/95 border-t text-xs flex items-center justify-between">
                            <span className="text-muted-foreground truncate flex-1">
                                📍 {value || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedLocation(null);
                                    setValue("", false);
                                }}
                                className="h-6 text-xs px-2"
                            >
                                Clear
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
