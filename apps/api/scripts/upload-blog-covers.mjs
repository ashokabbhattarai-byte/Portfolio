import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET ?? 'portfolio-storage';
if (!url || !key) {
  console.error('SUPABASE_URL or SERVICE_ROLE_KEY missing');
  process.exit(1);
}
const supa = createClient(url, key, { auth: { persistSession: false } });

const files = [
  {
    path: 'blogs/hello-world/cover-hello-9c7fe8c6.webp',
    local: '../web/public/assets/suchanaai-home.webp',
  },
  {
    path: 'blogs/supabase-storage-at-the-edge/cover-storage-a1b2c3d4.webp',
    local: '../web/public/assets/suchanaai-notices.webp',
  },
  {
    path: 'blogs/tanstack-makes-it-instant/cover-tanstack-e5f6a7b8.webp',
    local: '../web/public/assets/portrait.webp',
  },
];

for (const f of files) {
  try {
    const full = join(process.cwd(), f.local);
    const data = readFileSync(full);
    const { error } = await supa.storage.from(bucket).upload(f.path, data, {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: '3600',
    });
    if (error) console.error(`upload ${f.path} failed:`, error.message);
    else console.log(`uploaded ${f.path} (${data.length} bytes)`);
  } catch (e) {
    console.error(`read ${f.local} failed:`, e.message);
  }
}
console.log('done');
