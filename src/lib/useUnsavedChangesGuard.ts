'use client';

import { useEffect } from 'react';

const DEFAULT_MESSAGE = 'You have unsaved changes. Press Cancel to stay and save them, or OK to leave without saving.';

export function useUnsavedChangesGuard(hasUnsavedChanges: boolean, message = DEFAULT_MESSAGE) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const currentUrl = window.location.href;
    const handlePopState = () => {
      if (window.confirm(message)) return;
      window.history.pushState(null, '', currentUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsavedChanges, message]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = (event.target as Element | null)?.closest('a');
      if (!link?.href || link.target && link.target !== '_self' || link.hasAttribute('download')) return;

      const targetUrl = new URL(link.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (targetUrl.origin !== currentUrl.origin) return;
      if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search) return;
      if (window.confirm(message)) return;

      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [hasUnsavedChanges, message]);
}