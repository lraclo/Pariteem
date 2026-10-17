import { useEffect, useState } from 'react';

/** L'heure actuelle, rafraîchie chaque minute pour retirer les Matchs qui commencent. */
export function useMaintenant(): number {
  const [maintenant, setMaintenant] = useState(Date.now);
  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(Date.now()), 60_000);
    return () => clearInterval(minuteur);
  }, []);
  return maintenant;
}
