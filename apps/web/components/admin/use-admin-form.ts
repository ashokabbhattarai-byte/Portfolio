'use client';
/**
 * Shared form behaviour: validation, in-flight locking, save status, and the
 * dirty tracking that powers the unsaved-changes guard.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import { ApiError } from '@/lib/admin-api';

export type FormErrors<V> = Partial<Record<Extract<keyof V, string>, string>>;
export type FormStatus = 'idle' | 'saving' | 'saved' | 'error';

export type AdminForm<V> = {
  values: V;
  errors: FormErrors<V>;
  status: FormStatus;
  message: string;
  dirty: boolean;
  busy: boolean;
  formRef: RefObject<HTMLFormElement | null>;
  set: <K extends keyof V>(key: K, value: V[K]) => void;
  patch: (values: Partial<V>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  reset: () => void;
};

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

export function useAdminForm<V extends object>(options: {
  initial: V;
  validate: (values: V) => FormErrors<V>;
  submit: (values: V) => Promise<void>;
  /** Message shown after a successful write. */
  savedMessage?: string;
  /** Create forms clear themselves; edit forms keep what was just saved. */
  resetOnSave?: boolean;
}): AdminForm<V> {
  const { initial, validate, submit, savedMessage, resetOnSave } = options;
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<FormErrors<V>>({});
  const [status, setStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState('');
  const [focusSignal, setFocusSignal] = useState(0);
  const baseline = useRef<V>(initial);
  const latest = useRef<V>(initial);
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitting = useRef(false);

  latest.current = values;
  const dirty = !same(values, baseline.current);

  /* A `router.refresh()` after a write re-renders the parent with the record
     the API actually stored. Adopt it as the new baseline — but never over the
     top of edits in progress, or a background refresh would eat someone's
     typing. */
  useEffect(() => {
    if (same(initial, baseline.current)) return;
    if (!same(latest.current, baseline.current)) return;
    baseline.current = initial;
    setValues(initial);
  }, [initial]);

  useEffect(() => {
    if (!focusSignal) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [focusSignal]);

  const set = useCallback(<K extends keyof V>(key: K, value: V[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key as unknown as Extract<keyof V, string>];
      return next;
    });
    setStatus((current) => (current === 'saved' ? 'idle' : current));
  }, []);

  const patch = useCallback((partial: Partial<V>) => {
    setValues((current) => ({ ...current, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setValues(baseline.current);
    setErrors({});
    setStatus('idle');
    setMessage('');
  }, []);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submitting.current) return;

      const found = validate(values);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        setStatus('error');
        setMessage('Some fields need attention before this can be saved.');
        setFocusSignal((n) => n + 1);
        return;
      }

      submitting.current = true;
      setErrors({});
      setStatus('saving');
      setMessage('Saving…');
      void submit(values)
        .then(() => {
          baseline.current = resetOnSave ? initial : values;
          if (resetOnSave) setValues(initial);
          setStatus('saved');
          setMessage(
            savedMessage ?? 'Saved. The public site has been updated.',
          );
        })
        .catch((error: unknown) => {
          setStatus('error');
          if (error instanceof ApiError) {
            setMessage(error.message);
            if (Object.keys(error.fields).length) {
              setErrors(error.fields as FormErrors<V>);
              setFocusSignal((n) => n + 1);
            }
            return;
          }
          setMessage('Something went wrong. Nothing was saved.');
        })
        .finally(() => {
          submitting.current = false;
        });
    },
    [initial, resetOnSave, savedMessage, submit, validate, values],
  );

  return {
    values,
    errors,
    status,
    message,
    dirty,
    busy: status === 'saving',
    formRef,
    set,
    patch,
    onSubmit,
    reset,
  };
}

/**
 * Warns before losing edits. `beforeunload` covers reloads and closing the tab;
 * the capture-phase click handler covers in-app navigation, which the App
 * Router gives us no official hook for. Both are advisory — the browser can
 * always win — so this never blocks, it only asks.
 */
export function useUnsavedChanges(dirty: boolean, question?: string): void {
  useEffect(() => {
    if (!dirty) return;
    const prompt =
      question ?? 'You have unsaved changes. Leave without saving?';

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    const intercept = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname) return;
      if (window.confirm(prompt)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', intercept, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', intercept, true);
    };
  }, [dirty, question]);
}
