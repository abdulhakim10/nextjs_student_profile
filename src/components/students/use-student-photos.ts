'use client';

import { useCallback, useMemo } from 'react';
import { useSignedUrls } from '@/hooks/use-signed-urls';
import { fileUrlFor, photoRecordFromProfile } from '@/lib/files';
import { resolveImageUrl } from './student-helpers';

/**
 * Photo URLs for every student on a page — signs all file-server photos in
 * one batch. Pass every `fileProfile` the page will render.
 *
 *   const photoSrc = useStudentPhotos(rows.map((r) => r.fileProfile));
 *   <AvatarImage src={photoSrc(row.fileProfile)} />
 *
 * File-server photos (URL contains FILE-…) are only ever shown through a
 * signed URL — never the stored unsigned one. Older photo URLs without a
 * fileId (legacy school sites) keep the previous handling.
 */
export function useStudentPhotos(fileProfiles: Array<string | null | undefined>) {
  const key = fileProfiles.join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const records = useMemo(() => fileProfiles.map(photoRecordFromProfile), [key]);
  const signed = useSignedUrls(records);

  return useCallback(
    (fileProfile: string | null | undefined, schoolLogo?: string | null): string | undefined => {
      const record = photoRecordFromProfile(fileProfile);
      if (record) return fileUrlFor(record, { signed });
      return resolveImageUrl(fileProfile, schoolLogo);
    },
    [signed]
  );
}
