"use server";

import { getExchangeRates } from "@/lib/services/currency";

export async function getCurrencyRate(from: string, to: string) {
    if (from === to) return 1;

    const rates = await getExchangeRates(from);
    if (!rates) return null;

    return rates[to] || null;
}
