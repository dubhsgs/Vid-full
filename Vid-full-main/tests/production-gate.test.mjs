import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return readFileSync(path.join(appRoot, relativePath), 'utf8');
}

function migrationFiles() {
  return readdirSync(path.join(appRoot, 'supabase/migrations'))
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

function allMigrations() {
  return migrationFiles()
    .map((file) => read(`supabase/migrations/${file}`))
    .join('\n');
}

function latestMigrationContaining(needle) {
  const matches = migrationFiles()
    .filter((file) => read(`supabase/migrations/${file}`).includes(needle));

  assert.ok(matches.length > 0, `No migration contains: ${needle}`);
  const file = matches.at(-1);
  return {
    file,
    sql: read(`supabase/migrations/${file}`),
  };
}

function extractBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `Missing start marker: ${startNeedle}`);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `Missing end marker: ${endNeedle}`);
  return source.slice(start, end);
}

test('registration consumes credits only through the atomic v-id-register flow', () => {
  const { sql } = latestMigrationContaining('CREATE OR REPLACE FUNCTION public.register_v_id');
  const registerFunction = extractBetween(
    sql,
    'CREATE OR REPLACE FUNCTION public.register_v_id',
    'REVOKE ALL ON FUNCTION public.register_v_id'
  );
  const vIdRegister = read('supabase/functions/v-id-register/index.ts');
  const quotaUse = read('supabase/functions/quota-use/index.ts');

  assert.match(registerFunction, /SECURITY DEFINER/);
  assert.match(registerFunction, /FROM public\.user_credits AS uc[\s\S]+FOR UPDATE/);
  assert.match(registerFunction, /RAISE EXCEPTION 'INSUFFICIENT_CREDITS'/);
  assert.match(registerFunction, /free_credits = uc\.free_credits - 1/);
  assert.match(registerFunction, /paid_credits = uc\.paid_credits - 1/);
  assert.match(registerFunction, /total_used = uc\.total_used \+ 1/);
  assert.match(registerFunction, /credit_consumed := true/);
  assert.match(registerFunction, /DUPLICATE_HASH_OWNED_BY_ANOTHER_USER/);

  assert.match(vIdRegister, /supabase\.rpc\('register_v_id'/);
  assert.match(vIdRegister, /credit_consumed: result\.credit_consumed/);
  assert.match(vIdRegister, /finally \{\s+await cleanupOriginalFile/);
  assert.match(quotaUse, /DEPRECATED_USE_V_ID_REGISTER/);
  assert.match(quotaUse, /status = 410|}, 410\)/);
});

test('payment creation and settlement require auth, verification, amount checks, and idempotent RPC settlement', () => {
  const createOrder = read('supabase/functions/alipay-create-order/index.ts');
  const notify = read('supabase/functions/alipay-notify/index.ts');
  const { sql } = latestMigrationContaining('CREATE OR REPLACE FUNCTION public.mark_alipay_order_paid_to_credits');

  assert.match(createOrder, /getAuthenticatedUser\(req\)/);
  assert.match(createOrder, /isEmailConfirmed\(user\)/);
  assert.match(createOrder, /const PACK_PRICES: Record<number, number> = \{\s+1: 9\.9,\s+5: 39\.9,\s+10: 69\.9,/);
  assert.match(createOrder, /notifyUrl = `\$\{Deno\.env\.get\('SUPABASE_URL'\)\}\/functions\/v1\/alipay-notify`/);
  assert.match(createOrder, /user_id: user\.id/);
  assert.match(createOrder, /client_id: user\.id/);
  assert.match(createOrder, /sign_type: 'RSA2'/);

  assert.match(notify, /verifySignature\(params, sign, publicKey\)/);
  assert.match(notify, /ALIPAY_PUBLIC_KEY/);
  assert.match(notify, /trade_status !== 'TRADE_SUCCESS' && trade_status !== 'TRADE_FINISHED'/);
  assert.match(notify, /ALIPAY_APP_ID/);
  assert.match(notify, /ALIPAY_SELLER_ID/);
  assert.match(notify, /ALIPAY_SELLER_EMAIL/);
  assert.match(notify, /select\('amount'\)/);
  assert.match(notify, /Math\.abs\(paidAmount - expectedAmount\) > 0\.000001/);
  assert.match(notify, /supabase\.rpc\('mark_alipay_order_paid_to_credits'/);
  assert.match(notify, /result\.already_processed/);

  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /IF order_row\.status = 'paid'/);
  assert.match(sql, /ON CONFLICT ON CONSTRAINT user_credits_pkey DO UPDATE/);
  assert.match(sql, /paid_credits = public\.user_credits\.paid_credits \+ EXCLUDED\.paid_credits/);
});

test('RLS keeps private tables owner-only while public verification uses the restricted public view', () => {
  const migrations = allMigrations();
  const authSecurity = read('supabase/migrations/20260502093000_auth_security_refactor.sql');
  const privateEvidence = read('supabase/migrations/20260604103000_create_private_evidence_materials.sql');
  const publicView = read('supabase/migrations/20260615103000_add_standard_card_image_fields.sql');

  assert.match(migrations, /ALTER TABLE public\.user_credits ENABLE ROW LEVEL SECURITY/);
  assert.match(authSecurity, /CREATE POLICY "Users can read own credits"[\s\S]+USING \(auth\.uid\(\) = user_id\)/);
  assert.match(authSecurity, /ALTER TABLE public\.v_ids ENABLE ROW LEVEL SECURITY/);
  assert.match(authSecurity, /CREATE POLICY "Users can view own v_ids"[\s\S]+USING \(user_id = auth\.uid\(\)\)/);
  assert.match(authSecurity, /REVOKE INSERT, UPDATE, DELETE ON public\.v_ids FROM anon, authenticated/);
  assert.match(authSecurity, /REVOKE SELECT ON public\.v_ids FROM anon/);
  assert.match(migrations, /ALTER TABLE (?:public\.)?alipay_orders ENABLE ROW LEVEL SECURITY/);
  assert.match(authSecurity, /CREATE POLICY "Users can view own alipay orders"[\s\S]+USING \(user_id = auth\.uid\(\)\)/);
  assert.match(authSecurity, /REVOKE INSERT, UPDATE, DELETE ON public\.alipay_orders FROM anon, authenticated/);
  assert.match(authSecurity, /REVOKE SELECT ON public\.alipay_orders FROM anon/);
  assert.match(privateEvidence, /ALTER TABLE public\.v_id_evidence_materials ENABLE ROW LEVEL SECURITY/);
  assert.match(privateEvidence, /REVOKE ALL ON public\.v_id_evidence_materials FROM anon/);
  assert.match(publicView, /GRANT SELECT ON public\.public_v_ids TO anon, authenticated/);
});

test('document numbers are encrypted server-side and are not persisted in browser storage', () => {
  const app = read('src/App.tsx');
  const registrationFlow = read('src/components/home/RegistrationFlow.tsx');
  const cardGenerator = read('src/components/CardGenerator.tsx');
  const identityRegister = read('supabase/functions/creator-identity-register/index.ts');
  const downloadArchiveIdentity = read('src/utils/downloadArchiveIdentity.ts');
  const identityUpsert = extractBetween(identityRegister, '.upsert({', '}, {');

  assert.doesNotMatch(app, /(?:sessionStorage|localStorage)\.setItem\([^)]*document/i);
  assert.doesNotMatch(registrationFlow, /(?:sessionStorage|localStorage)\.setItem\([^)]*document/i);
  assert.doesNotMatch(cardGenerator, /(?:sessionStorage|localStorage)\.setItem\([^)]*document/i);
  assert.match(downloadArchiveIdentity, /clearLegacyDownloadArchiveIdentityStorage/);
  assert.match(downloadArchiveIdentity, /sessionStorage\.removeItem\(LEGACY_CREATOR_DOCUMENT_NUMBER_SESSION_KEY\)/);
  assert.match(downloadArchiveIdentity, /localStorage\.removeItem\(LEGACY_CREATOR_DOCUMENT_NUMBER_SESSION_KEY\)/);

  assert.match(identityRegister, /IDENTITY_ENCRYPTION_KEY/);
  assert.match(identityRegister, /AES-GCM/);
  assert.match(identityRegister, /const encryptedDocumentNumber = await encryptDocumentNumber\(documentNumber\)/);
  assert.match(identityUpsert, /document_number_encrypted: encryptedDocumentNumber/);
  assert.match(identityUpsert, /document_number_last4: last4/);
  assert.doesNotMatch(identityUpsert, /\bdocument_number\s*:/);
});

test('public verification reads only the public view and does not expose private proof fields', () => {
  const verifyPage = read('src/pages/VerifyPage.tsx');
  const publicViewMigration = read('supabase/migrations/20260615103000_add_standard_card_image_fields.sql');
  const publicView = extractBetween(publicViewMigration, 'CREATE VIEW public.public_v_ids AS', 'FROM public.v_ids');
  const selectedFieldsMatch = verifyPage.match(/\.select\('([^']+)'\)/);

  assert.ok(selectedFieldsMatch, 'VerifyPage must declare an explicit public_v_ids select list');
  const selectedFields = selectedFieldsMatch[1];

  assert.match(verifyPage, /\.from\('public_v_ids'\)/);
  assert.doesNotMatch(verifyPage, /\.from\('v_ids'\)/);
  for (const allowedField of ['friendly_id', 'character_name', 'creator_name', 'image_url', 'card_image_url', 'card_render_status', 'created_at', 'ots_status']) {
    assert.match(selectedFields, new RegExp(`\\b${allowedField}\\b`));
    assert.match(publicView, new RegExp(`\\b${allowedField}\\b`));
  }
  for (const privateField of ['user_id', 'client_id', 'payment', 'sha256_hash', 'ots_file_path', 'private_evidence']) {
    assert.doesNotMatch(selectedFields, new RegExp(`\\b${privateField}\\b`));
    assert.doesNotMatch(publicView, new RegExp(`\\b${privateField}\\b`));
  }
});

test('standard card generation uses the controlled renderer and preview endpoint only serves ready cards', () => {
  const register = read('supabase/functions/v-id-register/index.ts');
  const cardPreview = read('supabase/functions/card-preview/index.ts');
  const cardMigration = read('supabase/migrations/20260615103000_add_standard_card_image_fields.sql');
  const verifyPage = read('src/pages/VerifyPage.tsx');

  assert.match(register, /CARD_RENDERER_URL/);
  assert.match(register, /CARD_RENDERER_SECRET/);
  assert.match(register, /'x-vaid-card-renderer-secret': rendererSecret/);
  assert.match(register, /signedR2Request\(getR2CardsConfig\(\), \{\s+method: 'PUT'/);
  assert.match(register, /card_image_url: cardImageUrl/);
  assert.match(register, /card_render_status: 'ready'/);
  assert.match(register, /card_image_sha256/);
  assert.match(register, /card_image_generated_at/);
  assert.match(cardMigration, /card_render_status[\s\S]+'pending'/);

  assert.match(cardPreview, /record\.card_render_status !== 'ready'/);
  assert.match(cardPreview, /signedR2Request\(getR2CardsConfig\(\), \{\s+method: 'GET'/);
  assert.match(cardPreview, /'Cache-Control': 'public, max-age=31536000, immutable'/);
  assert.match(cardPreview, /'X-Content-Type-Options': 'nosniff'/);
  assert.match(verifyPage, /record\.card_image_url && record\.card_render_status === 'ready'/);
});

test('page entrypoints keep registration and archive generation in dedicated modules', () => {
  const app = read('src/App.tsx');
  const registrationFlow = read('src/components/home/RegistrationFlow.tsx');
  const cardGenerator = read('src/components/CardGenerator.tsx');
  const archiveDownload = read('src/utils/archiveDownload.ts');

  assert.match(app, /<RegistrationFlow/);
  assert.doesNotMatch(app, /v-id-register/);
  assert.match(registrationFlow, /supabase\.functions\.invoke\('v-id-register'/);
  assert.match(cardGenerator, /from '\.\.\/utils\/archiveDownload'/);
  assert.doesNotMatch(cardGenerator, /function buildArchiveCertificatePdf/);
  assert.match(archiveDownload, /export async function buildArchiveCertificatePdf/);
});
