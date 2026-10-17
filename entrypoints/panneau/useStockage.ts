import { useEffect, useState } from 'react';
import type { WxtStorageItem } from 'wxt/utils/storage';

/** Valeur d'un réglage enregistré, avec son setter ; null pendant le premier chargement. */
export function useStockage<T>(item: WxtStorageItem<T, {}>): [T | null, (v: T) => void] {
  const [valeur, setValeur] = useState<T | null>(null);
  useEffect(() => {
    item.getValue().then(setValeur);
    return item.watch(setValeur);
  }, [item]);
  return [valeur, (v) => {
    setValeur(v);
    item.setValue(v);
  }];
}
