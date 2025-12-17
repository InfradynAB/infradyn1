import { unstable_cache } from "next/cache";

type ExchangeRates = {
    [key: string]: number;
};

type CurrencyResponse = {
    result: string;
    base_code: string;
    rates: ExchangeRates;
    time_last_update_utc: string;
};

// Cache rates for 1 hour to avoid spamming the API
export const getExchangeRates = unstable_cache(
    async (base: string = 'USD'): Promise<ExchangeRates | null> => {
        try {
            const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
            if (!res.ok) throw new Error("Failed to fetch rates");

            const data: CurrencyResponse = await res.json();
            return data.rates;
        } catch (error) {
            console.error("Currency fetch error:", error);
            // Fallback for demo if API fails
            return {
                USD: 1,
                EUR: 0.92,
                GBP: 0.78,
                KES: 130.50,
            };
        }
    },
    ['exchange-rates'],
    { revalidate: 3600 }
);
