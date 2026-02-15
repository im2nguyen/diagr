'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseDiagrDocument } from '@/lib/diagr/parser';

const STORAGE_KEY = 'diagr:source';
const COMMITTED_STORAGE_KEY = 'diagr:source:committed';
const CUSTOM_EXAMPLE_ID = '__custom__';

export function useDiagramSourceState(
  starterDiagram: string,
  diagramExamples: ReadonlyArray<{ id: string; source: string }>,
) {
  const [draftSource, setDraftSource] = useState(starterDiagram);
  const [committedSource, setCommittedSource] = useState(starterDiagram);

  useEffect(() => {
    const storedDraft = window.localStorage.getItem(STORAGE_KEY);
    const storedCommitted = window.localStorage.getItem(COMMITTED_STORAGE_KEY);
    const initialDraft = storedDraft ?? starterDiagram;
    const initialCommittedCandidate = storedCommitted ?? initialDraft;
    const committedIsValid = parseDiagrDocument(initialCommittedCandidate).ok;
    const draftIsValid = parseDiagrDocument(initialDraft).ok;

    setDraftSource(initialDraft);
    if (committedIsValid) {
      setCommittedSource(initialCommittedCandidate);
    } else if (draftIsValid) {
      setCommittedSource(initialDraft);
    } else {
      setCommittedSource(starterDiagram);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, draftSource);
    }, 200);

    return () => window.clearTimeout(handle);
  }, [draftSource]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      window.localStorage.setItem(COMMITTED_STORAGE_KEY, committedSource);
    }, 200);

    return () => window.clearTimeout(handle);
  }, [committedSource]);

  const draftParsed = useMemo(() => parseDiagrDocument(draftSource), [draftSource]);
  const committedParsed = useMemo(() => parseDiagrDocument(committedSource), [committedSource]);

  const commitSourceCandidate = useCallback(
    (candidate?: string): boolean => {
      const next = candidate ?? draftSource;
      if (next === committedSource) {
        return false;
      }
      const parsed = parseDiagrDocument(next);
      if (!parsed.ok) {
        return false;
      }
      setCommittedSource(next);
      return true;
    },
    [draftSource, committedSource],
  );

  const commitDraftSource = useCallback(() => {
    return commitSourceCandidate(draftSource);
  }, [commitSourceCandidate, draftSource]);

  const matchedExampleId = useMemo(() => {
    const found = diagramExamples.find((item) => item.source === draftSource);
    return found?.id ?? CUSTOM_EXAMPLE_ID;
  }, [diagramExamples, draftSource]);

  return {
    draftSource,
    setDraftSource,
    committedSource,
    setCommittedSource,
    commitDraftSource,
    commitSourceCandidate,
    draftParsed,
    committedParsed,
    matchedExampleId,
    customExampleId: CUSTOM_EXAMPLE_ID,
  };
}
