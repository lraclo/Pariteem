import { useEffect, useState } from 'react';
import { lireLectures, surveillerLectures, type Lectures } from '@/lib/lectures';

/** Les Lectures de tous les Bookmakers, mises à jour à chaque enregistrement ; null pendant le premier chargement. */
export function useLectures(): Lectures | null {
  const [lectures, setLectures] = useState<Lectures | null>(null);
  useEffect(() => {
    // Une Lecture enregistrée pendant le premier chargement est plus récente que lui : elle l'emporte.
    let chargees = false;
    const recues: Lectures = {};
    const arreter = surveillerLectures((id, lecture) => {
      if (chargees) setLectures((l) => ({ ...l, [id]: lecture ?? undefined }));
      else recues[id] = lecture ?? undefined;
    });
    lireLectures().then((initiales) => {
      chargees = true;
      setLectures({ ...initiales, ...recues });
    });
    return arreter;
  }, []);
  return lectures;
}
