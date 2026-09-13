'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { qk } from './keys';

type PresignResponse = {
  path: string;
  signedUrl: string;
  token: string;
  publicUrl: string;
  bucket: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      accept: 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Storage request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** Ask the API for a presigned PUT – frontend then PUTs directly to Supabase (fastest). */
export function usePresign() {
  return useMutation({
    mutationFn: (input: {
      folder: string;
      filename: string;
      slug?: string;
      contentType: string;
    }) =>
      api<PresignResponse>('/storage/presign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
  });
}

/** Fallback proxy upload – multipart via Nest. */
export function useStorageUpload() {
  return useMutation({
    mutationFn: async (input: {
      file: File;
      folder?: string;
      slug?: string;
    }) => {
      const fd = new FormData();
      fd.set('file', input.file);
      if (input.folder) fd.set('folder', input.folder);
      if (input.slug) fd.set('slug', input.slug);
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Upload failed (${res.status})`);
      }
      return (await res.json()) as { path: string; publicUrl: string };
    },
  });
}

export function useStorageDelete() {
  return useMutation({
    mutationFn: (paths: string[]) =>
      api<{ removed: string[] }>('/storage/object', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paths }),
      }),
  });
}

export function useStorageList(prefix: string) {
  return useQuery({
    queryKey: qk.storageList(prefix),
    queryFn: () =>
      api<unknown[]>(`/storage/list?prefix=${encodeURIComponent(prefix)}`),
    enabled: !!prefix,
    staleTime: 1000 * 60 * 2,
  });
}

/** Convenience: presign + direct PUT + confirm, returns publicUrl. Two hops instead of one, but zero backend egress for the bytes. */
export async function directUpload(
  presignData: PresignResponse,
  file: File,
): Promise<string> {
  const put = await fetch(presignData.signedUrl, {
    method: 'PUT',
    headers: {
      'content-type': file.type,
      'x-upsert': 'true',
    },
    body: file,
  });
  if (!put.ok) throw new Error(`Direct upload failed (${put.status})`);
  // Confirm to get canonical public URL (already in presignData.publicUrl)
  return presignData.publicUrl;
}
