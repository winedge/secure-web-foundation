/**
 * useCurrency – derives the user's billing currency from their firm's country
 * and exposes a USD → target rate (live, cached). Returns helpers to format
 * amounts in the user's currency starting from a USD base price.
 */
import { useEffect, useState } from 'react';
import { useFirm } from './use-firm';
import {
  currencyForCountry,
  getUsdRate,
  convertFromUsd,
  formatMoney,
  type SupportedCurrency,
} from '@/lib/currency';

export function useCurrency() {
  const { data: firm } = useFirm();
  const country = (firm as unknown as { country?: string } | null)?.country;
  const currency: SupportedCurrency = currencyForCountry(country);

  const [rate, setRate] = useState<number>(currency === 'USD' ? 1 : 0);
  const [ready, setReady] = useState<boolean>(currency === 'USD');

  useEffect(() => {
    let active = true;
    if (currency === 'USD') {
      setRate(1);
      setReady(true);
      return;
    }
    setReady(false);
    void getUsdRate(currency).then((r) => {
      if (!active) return;
      setRate(r);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [currency]);

  /** Format a USD-denominated amount in the firm's currency. */
  const formatFromUsd = (amountUsd: number) =>
    formatMoney(convertFromUsd(amountUsd, rate || 1), currency);

  /** Format an amount that is already in the firm's currency. */
  const format = (amount: number) => formatMoney(amount, currency);

  return { currency, rate, ready, formatFromUsd, format };
}
