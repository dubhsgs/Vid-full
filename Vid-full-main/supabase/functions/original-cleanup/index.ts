import { createServiceClient, isInternalRequest } from '../_shared/auth.ts';

const ORIGINAL_STORAGE_BUCKET = 'v-id-originals';
const DEFAULT_MAX_AGE_HOURS = 24;
const DEFAULT_MAX_DELETIONS = 100;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-VAID-Internal-Secret, X-OTS-Worker-Secret',
};

interface CleanupRequest {
  max_age_hours?: number;
  max_deletions?: number;
}

interface StorageEntry {
  name: string;
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_accessed_at?: string | null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.floor(parsed), max));
}

function isOlderThan(entry: StorageEntry, cutoffMs: number): boolean {
  const timestamp = entry.created_at || entry.updated_at || entry.last_accessed_at;
  if (!timestamp) return false;
  const timeMs = Date.parse(timestamp);
  return Number.isFinite(timeMs) && timeMs < cutoffMs;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  if (!isInternalRequest(req)) {
    return jsonResponse({ success: false, error: 'FORBIDDEN' }, 403);
  }

  try {
    const payload = await req.json().catch(() => ({})) as CleanupRequest;
    const maxAgeHours = clampNumber(payload.max_age_hours, DEFAULT_MAX_AGE_HOURS, 1, 168);
    const maxDeletions = clampNumber(payload.max_deletions, DEFAULT_MAX_DELETIONS, 1, 500);
    const cutoffMs = Date.now() - maxAgeHours * 60 * 60 * 1000;
    const supabase = createServiceClient();
    const pathsToDelete: string[] = [];

    const { data: userFolders, error: foldersError } = await supabase.storage
      .from(ORIGINAL_STORAGE_BUCKET)
      .list('originals', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (foldersError) {
      console.error('[original-cleanup] Failed to list originals folders:', foldersError);
      return jsonResponse({ success: false, error: 'LIST_FOLDERS_FAILED' }, 500);
    }

    for (const folder of (userFolders || []) as StorageEntry[]) {
      if (!folder.name || pathsToDelete.length >= maxDeletions) break;

      const folderPath = `originals/${folder.name}`;
      const { data: files, error: filesError } = await supabase.storage
        .from(ORIGINAL_STORAGE_BUCKET)
        .list(folderPath, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'asc' },
        });

      if (filesError) {
        console.warn('[original-cleanup] Failed to list originals folder:', { folderPath, error: filesError.message });
        continue;
      }

      for (const file of (files || []) as StorageEntry[]) {
        if (!file.name || pathsToDelete.length >= maxDeletions) break;
        if (!isOlderThan(file, cutoffMs)) continue;
        pathsToDelete.push(`${folderPath}/${file.name}`);
      }
    }

    if (pathsToDelete.length === 0) {
      return jsonResponse({ success: true, deleted: 0 });
    }

    const { error: removeError } = await supabase.storage
      .from(ORIGINAL_STORAGE_BUCKET)
      .remove(pathsToDelete);

    if (removeError) {
      console.error('[original-cleanup] Failed to delete stale originals:', removeError);
      return jsonResponse({ success: false, error: 'DELETE_FAILED' }, 500);
    }

    return jsonResponse({ success: true, deleted: pathsToDelete.length });
  } catch (error) {
    console.error('[original-cleanup] Unexpected error:', error);
    return jsonResponse({ success: false, error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
