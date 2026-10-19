import { useEffect, useState } from 'react';
import { lireLectures, surveillerLectures, type Lectures } from '@/lib/lectures';

/** Les Lectures de tous les Bookmakers, mises à jour à chaque enregistrement ; null pendant le premier chargement. */
export function useLectures(): Lectures | null {
  const [lectures, setLectures] = useState<Lectures | null>(null);
  useEffect(() => {
    lireLectures().then(setLectures);
    return surveillerLectures((id, lecture) => setLectures((l) => ({ ...l, [id]: lecture ?? undefined })));
  }, []);
  return lectures;
}
