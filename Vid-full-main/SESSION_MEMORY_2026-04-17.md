# Session Memory - 2026-04-17

## Current state

- Project path: `/Users/yan/Documents/New project/Vid-full-main`
- New Supabase project owned by user:
  - Project ref: `vimglsksvvvnxkjnaqeh`
  - Project URL: `https://vimglsksvvvnxkjnaqeh.supabase.co`
- Site URL used for payment return: `https://vaid.top`

## What we fixed today

- Replaced the old Bolt-created Supabase project with the user's own Supabase project.
- Linked local repo to the new Supabase project.
- Pushed all database migrations successfully.
- Deployed these Edge Functions:
  - `alipay-create-order`
  - `alipay-notify`
  - `quota-use`
  - `quota-check`
- Added/fixed payment return flow to `/payment-success`.
- Fixed Alipay iframe/new-tab behavior for preview environments.
- Fixed payment success detection so it checks the specific order instead of quota only.
- Fixed atomic payment settlement and atomic quota deduction logic.
- Fixed a SQL bug in `mark_alipay_order_paid` that caused:
  - payment finished in Alipay
  - but local order stayed `pending`
- Restored official price for `1次套餐` from test price `¥0.01` back to `¥9.9`.
- Synced the frontend modal price display with backend price.
- Decided to abandon the old "paid credits bind to current browser" model.
- Switched the product direction to:
  - free trial stays browser-based
  - paid usage is delivered as an activation code
- Implemented frontend support for entering, validating, saving, and consuming activation codes.
- Implemented payment success page support for showing, copying, and downloading activation codes.
- Added backend activation-code issuance and atomic activation-code consumption flow.

## Important files changed

- `src/App.tsx`
- `src/components/CardGenerator.tsx`
- `src/components/PaywallModal.tsx`
- `src/main.tsx`
- `src/pages/PaymentSuccessPage.tsx`
- `src/utils/fingerprint.ts`
- `src/utils/licenseManager.ts`
- `supabase/functions/alipay-create-order/index.ts`
- `supabase/functions/alipay-notify/index.ts`
- `supabase/functions/license-key-status/index.ts`
- `supabase/functions/license-key-use/index.ts`
- `supabase/functions/_shared/activationCode.ts`
- `supabase/functions/quota-use/index.ts`
- `supabase/migrations/20260416183000_fix_payment_flow_and_quota_atomicity.sql`
- `supabase/migrations/20260417103200_fix_mark_alipay_order_paid_variable_conflict.sql`
- `supabase/migrations/20260417113000_switch_paid_credits_to_activation_codes.sql`

## Verified working

- Clicking any purchase button can jump to Alipay.
- Real payment callback now works.
- After payment, the site returns to `/payment-success`.
- Order status can become `paid`.
- Purchased credits can be added to the current browser.
- `1次套餐` Alipay amount is now `¥9.90`.
- Frontend modal now also shows `¥9.9`.
- Local `npm run typecheck` passes.
- Local `npm run build` passes.

## Supabase/dashboard setup already done

- `SITE_URL` secret configured
- `ALIPAY_APP_ID` secret configured
- `ALIPAY_PUBLIC_KEY` secret configured
- `ALIPAY_PRIVATE_KEY` secret configured
- `.env.local` exists locally for Vite preview

## Next checks to do

- Push the new migration `20260417113000_switch_paid_credits_to_activation_codes.sql`.
- Deploy updated/new Edge Functions:
  - `alipay-notify`
  - `license-key-status`
  - `license-key-use`
- Publish the updated frontend.
- Test full activation-code flow once:
  - pay
  - get activation code
  - copy/download code
  - return home
  - use activation code to generate a certificate
- Click `5次套餐` and `10次套餐` once each and confirm price/jump are correct.

## Notes

- Do not expose keys from `.env.local` or Supabase secrets in chat/screenshots.
- Old Supabase project was not under the user's ownership and should not be relied on.

## Evening updates (2026-04-17)

- Rewrote and published the site `TermsPage` with the finalized VAID user agreement.
- Rewrote and published the site `PrivacyPage` with the finalized VAID privacy policy.
- Unified the legal pages' effective date to `2026-03-31`.
- Moved ICP filing display to the homepage footer:
  - `京ICP备2026017686号`
- Removed the ICP filing number from the terms page footer.
- Updated homepage footer copyright copy from `V-ID` to `VAID`.
- Continued the outward branding migration from `V-ID` to `VAID` for public-facing copy and legal wording.

## Card generator visual direction updates

- Explicitly decided that current work is limited to card visuals only:
  - do not touch payment flow
  - do not touch database logic
  - do not change Supabase/payment architecture during this phase
- Iteratively redesigned `src/components/CardGenerator.tsx` to move the generated card closer to the target reference style.
- Reduced and repositioned the left circular portrait area so it reads less like a large avatar card and more like a designed identity element.
- Reworked the top brand area multiple times:
  - tested text-logo versions
  - then switched to a no-text VAID mark
  - adjusted scale and vertical placement repeatedly
- Shortened and refined the center divider line to better match the tightened right-side text block.
- Reworked the right-side information panel multiple times:
  - increased text size
  - tightened/then re-opened line spacing based on visual feedback
  - changed `CITIZEN ID` presentation to `ID`
  - kept the general color direction that the user approved
- Changed the QR code body color toward the pink reference direction.
- Adjusted the QR module plate/background color to better match the target card style.

## Texture / asset workflow conclusion

- Tested two approaches for the card's circuit texture layer:
  - hand-drawn/generated-by-code circuit lines
  - imported generated texture artwork as a dedicated overlay
- Reached a clear workflow decision:
  - complex texture / atmosphere layers should come from separately generated image assets
  - dynamic text / QR / layout should remain code-driven
- Added and tested external visual assets for this workflow:
  - `public/vaid_logo_mark.png`
  - `public/vaid_circuit_overlay.png`
- Latest visual experiment uses the generated circuit overlay image darkened and aligned so its circular center sits under the portrait circle.

## Current state of the visual work

- The card is now materially closer to the target reference than the original implementation.
- The visual direction is still in-progress and should be treated as iterative design work, not final art.
- Remaining refinement focus is mostly:
  - top logo balance
  - right-side typography spacing/proportion
  - circuit overlay blending/alignment
  - final bottom copy cleanup (old `V-ID` wording may still remain in the card/export text)

## Card visual updates on 2026-04-18

- Continued working only on `src/components/CardGenerator.tsx`.
- Used the user-provided target card image as the geometry reference and converted multiple target-image measurements into relative ratios for the local canvas card.
- Locked the current panel/card drawing size in code as:
  - `PANEL_W = 880`
  - `PANEL_H = 494`
- Repositioned and resized the avatar area based on target-image ratios:
  - avatar center ratio:
    - `x = 0.2112`
    - `y = 0.5236`
  - avatar outer diameter ratio:
    - `0.298` of card width
- Removed the non-transparent circuit overlay layer from the card because it polluted the glass panel look.
- Reworked the right-side text block repeatedly:
  - moved the text block closer to the divider
  - unified label/value font family and weight so `NAME / STATUS / ISSUED / ID` and their values look like one system instead of two unrelated styles
  - increased main info font size to the current baseline:
    - `INFO_TEXT_FONT_SIZE = 22`
- Reworked divider logic so it is no longer a loose fixed line:
  - divider x ratio is currently `0.4176`
  - divider length is now derived from avatar geometry
  - current divider scale is:
    - `DIVIDER_LENGTH_SCALE = 0.92`
  - this means the divider is slightly shorter than the avatar outer diameter and centered to that circle
- Reworked the QR block geometry to better match the target style:
  - narrowed the QR outer plate width while keeping height fixed in proportion
  - current QR plate width ratio:
    - `QR_PLATE_W_RATIO = 0.102`
  - QR plate bottom is aligned to the divider bottom through geometry, not by an unrelated fixed y value
- Reworked QR block text styling toward the earlier target screenshot style:
  - QR text now uses a softer sans-serif look instead of a rigid monospace-only feel
  - tested a real-hash display approach
  - but after actual rendered output review, hash text still proved too risky for overflow in the narrowed QR plate
  - product decision for this version is:
    - prioritize zero layout failure over showing hash data in the QR block
  - current QR copy is now simplified to:
    - line 1: `PROOF:`
    - line 2: `Verified on-chain`
  - current accepted rule:
    - do not show hash text inside the QR plate unless a future layout guarantees no overflow at all
- The current QR styling baseline in code is:
  - `QR_TEXT_PRIMARY_SIZE = 9.4`
  - `QR_TEXT_SECONDARY_SIZE = 8.9`
- The current card state is now much closer to the intended direction than the morning versions:
  - avatar placement is close
  - divider/text/QR relationships are substantially improved
  - QR text is now using a safe, overflow-proof proof message instead of risky hash text

## Most recent stable visual baseline

- If we need to continue tomorrow from the current accepted visual state, the important active geometry / style parameters in `src/components/CardGenerator.tsx` are:
  - `AVATAR_CENTER_X_RATIO = 0.2112`
  - `AVATAR_CENTER_Y_RATIO = 0.5236`
  - `AVATAR_DIAMETER_RATIO = 0.298`
  - `AVATAR_IMAGE_RATIO = 0.79`
  - `AVATAR_COVER_SCALE = 1.14`
  - `DIVIDER_X_RATIO = 0.4176`
  - `DIVIDER_LENGTH_SCALE = 0.92`
  - `TEXT_START_X_RATIO = 0.4592`
  - `TEXT_NAME_Y_RATIO = 0.3776`
  - `TEXT_STATUS_Y_RATIO = 0.4808`
  - `TEXT_ISSUED_Y_RATIO = 0.5885`
  - `TEXT_ID_Y_RATIO = 0.6947`
  - `QR_PLATE_X_RATIO = 0.836`
  - `QR_PLATE_W_RATIO = 0.102`
  - `QR_PLATE_H_RATIO = 0.2625`
  - `QR_MODULE_INSET_X_RATIO = 0.126`
  - `QR_MODULE_INSET_Y_RATIO = 0.0956`
  - `QR_MODULE_SIZE_IN_PLATE_RATIO = 0.748`
  - `QR_PROOF_LABEL_Y_RATIO = 0.79`
  - `QR_PROOF_VALUE_Y_RATIO = 0.905`
  - `INFO_TEXT_FONT_SIZE = 22`
  - `QR_TEXT_PRIMARY_SIZE = 9.4`
  - `QR_TEXT_SECONDARY_SIZE = 8.9`
  - `DESCRIPTION_TEXT_SIZE = 13.2`

## QR block decision checkpoint

- We explicitly tested showing a real truncated hash inside the QR plate.
- Real rendered output showed that this is still vulnerable to overflow in some cases.
- Current accepted product decision:
  - remove hash from the QR plate completely
  - keep only proof text
  - prefer guaranteed containment over extra data density
- So if tomorrow we revisit the QR area, the default assumption should be:
  - `PROOF:` + `Verified on-chain` stays
  - hash remains removed unless a new layout fully eliminates overflow risk

## Best next step for tomorrow

- Continue micro-tuning only `src/components/CardGenerator.tsx`.
- Most likely next refinements:
  - final QR copy choice and line breaks
  - tiny QR text vertical spacing adjustments
  - whether the QR hash/value line should sit slightly lower or use a slightly dimmer color
  - final balance between logo, divider, text block, and QR block

## Temporary testing rule (2026-04-20)

- User explicitly clarified: recent routing/refresh convenience changes are **temporary for testing only**.
- Important constraint for next sessions:
  - after testing is done, restore the previous production logic/flow.
  - do not treat these temporary behaviors as final product decisions.

## Progress update (2026-04-20 late night)

- Card texture direction currently confirmed:
  - using a reference-inspired irregular wave-grid drawn procedurally in `drawTechTexture` (not replacing with an external transparent layer).
  - current grid opacity set to 50% (`ctx.globalAlpha = 0.5`).
- QR glow experiment was added then explicitly reverted; current QR block stays on the original non-glow version.
- Card mist/lighting has been iteratively tuned (left-strong/right-weaker with localized tweaks); keep current values unless user asks otherwise.
- Important process constraint from user remains active:
  - routing/refresh convenience changes are temporary for testing and must be restorable to previous logic later.
- Latest progress checkpoint commit:
  - `9dab4cc feat(card): tune wave-grid texture and set opacity to 50%`

## Progress update (2026-04-21 card finalization pass)

- Work stayed focused on `src/components/CardGenerator.tsx` visual tuning.
- Replaced texture assets many times and finalized current workflow as:
  - single active texture source file: `public/grid_texture.png`
  - texture drawn in `drawTechTexture`
  - current texture opacity baseline: `ctx.globalAlpha = 0.2`
  - texture scale baseline: `1.5x` (centered and clipped to panel)
- Confirmed layer order for card rendering:
  - `drawPanel -> drawTechTexture -> logo/avatar/text/QR -> drawCardMistBlur`
- Page footer copy update (outside canvas card):
  - changed to `* PROOF OF IDENTITY RECORDED BY VAID`
- Card bottom description text was restored to the previous longer sentence:
  - `THIS DOCUMENT PROVIDES VERIFIABLE EVIDENCE OF A UNIQUE DIGITAL IDENTITY RECORDED BY VAID.`
- Avatar ring area was iterated and finalized to current direction:
  - outer ring uses teal/magenta split with subtle splice transition
  - added additional short arc segments for rotational motion feel
  - added subtle outer-orbit hints outside the main ring
- Added neon passes to key elements:
  - top logo neon glow (cyan + magenta screen passes)
  - avatar outer ring neon bloom
  - center divider neon overlay
  - QR neon effect applied only to QR modules (not the outer QR plate border)
- User preference note:
  - reduced QR neon by 50% after initial version was too strong
  - reverted outer ring neon strength to the stronger approved version

## Git checkpoints created today

- `c863b54 feat(card): finalize current card visual snapshot`
  - includes:
    - `src/components/CardGenerator.tsx`
    - `public/grid_texture.png`
- `64b4599 feat(card): finalize card visuals and neon refinements`
  - includes:
    - `src/components/CardGenerator.tsx`

## Ready state for next session

- Card visuals are near-final and in polish mode.
- If more tuning is needed next time, likely focus points are:
  - final intensity balance among logo neon / avatar neon / divider neon / QR neon
  - arc clutter vs. readability around avatar ring
  - one last pass of overall contrast harmony on the full card

## Full project audit (2026-04-21)

- User requested a full-codebase check to identify unfinished work across frontend, backend, build quality, and docs.
- Scope covered:
  - app routes and page flow (`src/main.tsx`, `src/App.tsx`, `src/pages/*`)
  - card renderer (`src/components/CardGenerator.tsx`)
  - payment flow (`src/components/PaywallModal.tsx`, `src/pages/PaymentSuccessPage.tsx`, `src/utils/licenseManager.ts`)
  - verification flow (`src/pages/VerifyPage.tsx`)
  - Supabase edge functions and SQL migrations (`supabase/functions/*`, `supabase/migrations/*`)
  - project docs (`README.md`, `ALIPAY_SETUP.md`)

### Must-fix before release

- Static quality gate is not clean:
  - `npm run typecheck` fails with 4 errors.
  - `npm run lint` fails with 17 issues (15 errors, 2 warnings).
  - Main hotspots:
    - `src/components/CardGenerator.tsx`:
      - unused functions (`drawCircuitTexture`, `drawDreamTexture`, `drawRainbowLayer`)
      - `createLinearGradient` fallback typing issue (`never` narrowing path)
      - multiple unused accumulators in `drawLogo` (`sumR/sumG/sumB/sumWeight`)
      - hook dependency warnings for `useCallback`
    - `src/utils/licenseManager.ts`:
      - eslint hook-rule false positive due to function naming (`useFreeCertificate`, `useActivationCode` called from utility flow)
      - explicit `any` usage
    - `src/utils/fingerprint.ts` and `src/vite-env.d.ts`:
      - explicit `any` typing debt
    - `supabase/functions/ots-verify/index.ts` and `supabase/functions/quota-check/index.ts`:
      - `prefer-const` violations

- Payment hardening still needs final safety pass:
  - `supabase/functions/alipay-create-order/index.ts` accepts client `return_url` and uses it directly without strict allowlist normalization.
  - `ALIPAY_APP_ID` still has a fallback constant in code.
  - `supabase/functions/alipay-notify/index.ts` validates signature and trade status, but a second-layer business-field check (`app_id`, amount consistency, seller/merchant identity consistency) is still recommended as an explicit final guardrail.

### Should-complete soon

- Maintenance-mode entry is not wired into actual app boot path:
  - `src/AppWithRouter.tsx` exists but `src/main.tsx` mounts `App` directly.

- Several components/utilities appear to be legacy or not currently integrated:
  - `src/components/HashDisplay.tsx`
  - `src/components/InteractiveVIDCard.tsx`
  - `src/components/ProgressStage.tsx`
  - `src/components/TemplateCertificate.tsx`
  - `src/components/VIDCard.tsx`
  - `src/utils/htmlToImage.ts`
  - `src/utils/certificate.ts`

- Brand/text consistency is unfinished (`V-ID` and `VAID` mixed across pages and exported bundle text):
  - `src/components/CardGenerator.tsx`
  - `src/pages/VerifyPage.tsx`
  - `src/pages/PaymentSuccessPage.tsx`
  - `src/i18n/config.ts`

- Production code still contains many debug logs and one direct `alert` path:
  - especially in `src/pages/VerifyPage.tsx` and some in `src/App.tsx`.

- Documentation mismatch:
  - `README.md` is effectively empty.
  - `ALIPAY_SETUP.md` still describes older package narratives and older quota-centric wording that no longer fully matches current activation-code-first implementation.

### Optional optimizations (not blocking)

- Build passes, but bundle warning remains (`dist/assets/index-*.js` > 500 KB).
- No automated test suite is configured in `package.json` scripts.

## Payment incident triage and stabilization (2026-04-22)

- User reported payment confirmation page stuck at "waiting for Alipay callback confirmation".
- Root cause was identified as **schema drift** between code and production DB:
  - frontend/functions were querying `alipay_orders.license_key`
  - production `alipay_orders` table did **not** have `license_key` column yet
  - this caused order-status query failures and blocked success transition.
- Verified with live checks:
  - target order `VID_1776786288341_jbwzl469z` was already `status = paid`
  - but `license_key` column absence caused mismatch handling failures.

### Actions completed

- Deployed new Supabase function:
  - `alipay-query-order`
  - purpose: active order query fallback (`alipay.trade.query`) and settlement sync via `mark_alipay_order_paid`.
- Updated function to support both schemas:
  - compatible when `license_key` exists
  - fallback when `license_key` column is absent (legacy structure).
- Updated frontend/local logic for resilience:
  - pass `cid` in payment `return_url`
  - cache `client_id` by `out_trade_no` locally
  - `getOrderStatus` fallback query path when `license_key` column missing
  - `PaymentSuccessPage` can treat `status = paid` as success even if `license_key` is null (legacy DB path)
  - automatic and manual re-check continue to function.

### User decisions (confirmed)

- Chosen release strategy: migrate DB and code to unified latest structure in a controlled sequence.
- Explicit business decision: **do not backfill activation codes for historical paid orders**.
- Process rule reaffirmed by user:
  - no operations without explicit user approval first.

### Migration plan status

- A staged migration checklist (precheck -> apply migration -> verify -> cutover -> rollback points) has been confirmed as the best next step.
- No database migration SQL was executed yet in this step; this section records planning + incident stabilization only.

## Payment migration execution log (2026-04-22)

- User approved direct execution by CLI (no manual Dashboard SQL copy/paste).
- Ran remote precheck (A block), confirmed production was on old schema:
  - `alipay_orders` had no `license_key`
  - `mark_alipay_order_paid` was old quota-return signature.
- Executed migration (B block) on linked project:
  - first attempt failed on function return-type replacement rule
  - fixed by dropping old `mark_alipay_order_paid(text,text,timestamptz)` before recreate
  - re-run succeeded.
- Post-migration verification (C block) passed:
  - `alipay_orders.license_key` exists
  - `license_keys` extended fields exist (`total_uses`, `remaining_uses`, `status`, `order_out_trade_no`)
  - `mark_alipay_order_paid` now returns (`already_processed`, `license_key`, `pack_size`, `status`)
  - `consume_license_key_use` exists and matches expected signature.
- Historical policy confirmed:
  - **do not backfill activation codes for historical paid orders**
  - check result: `paid_without_license_key = 10` (expected under this policy).
- Live order probe for stuck order still returned `paid = true`.
- Final user confirmation:
  - payment success page can now jump/return normally again.

## Post-migration hardening and UX fix (2026-04-22)

- User approved the "best next-step" sequence:
  1. remove legacy paid orders without activation codes (test-only environment),
  2. stop auto-redirect when activation code is present,
  3. enforce DB invariant to prevent future `paid` rows without `license_key`.

### Step 1: test data cleanup

- Queried legacy rows with `status='paid' AND license_key IS NULL`: `10`.
- Deleted these legacy test orders.
- Re-checked count: `0`.

### Step 2: payment success page behavior

- Updated `src/pages/PaymentSuccessPage.tsx`:
  - when `pageStatus='success'` and activation code exists: **no auto-redirect**
  - when success without activation code: delayed fallback redirect set to `5000ms`
  - manual "返回主页" button remains.

### Step 3: DB guardrail constraint

- Added production constraint on `public.alipay_orders`:
  - `alipay_orders_paid_requires_license_key`
  - definition: `CHECK (status <> 'paid' OR license_key IS NOT NULL)`.
- Validation check after apply:
  - `invalid_paid_rows` (`paid` with `license_key IS NULL`) = `0`.

### Current expected behavior

- New successful payments should no longer create/retain `paid` orders without activation codes.
- Payment success page now keeps activation code visible for user copy/download before leaving.

## Frontend UX simplification pass (2026-04-22, evening)

- User requested further simplification of the activation-code panel on the home form.
- Applied UI changes in `src/App.tsx`:
  - removed activation helper description text
  - removed "清除激活码" action
  - removed activation code status card under input (no duplicate code/remaining info block)
  - removed section title/icon block for activation area; now only input + action button remain
  - renamed action label from "绑定激活码" to "验证激活码" (loading: "验证中...")
  - removed the privacy info strip ("隐私保护...") from this section per user direction.
- Unified top counter wording and display rule:
  - frontend text changed to a single label: `剩余次数：X 次`
  - no "免费" wording in display
  - display value rule:
    - if free credits > 0: show free credits
    - else show current verified activation code remaining uses
    - if neither available: show `0`
  - backend accounting remains separated (free quota vs activation code), frontend is presentation-unified.
- Validation status:
  - `npx eslint src/App.tsx` passed after each UI update.

## Generation flow stabilization + quota incident fix (2026-04-22, late night)

- User reported: clicking `Next` in edit mode had no visible response.
- Root cause chain identified:
  1. frontend had silent early-return paths (missing visible error feedback in some branches),
  2. `quota-use` could fail when RPC path errored, which interrupted generation at access-consume step.

### Frontend hardening applied (`src/App.tsx`)

- Added visible generation error state + UI message area (no more silent failure).
- Added `isSubmittingNext` to avoid double submit and show `处理中...`.
- Added explicit prechecks and user-facing messages for missing image/name/creator.
- Kept free-first logic: when free quota > 0, do not block on activation-code validation before generate.
- Result: user can now see exact failure reason when generation chain breaks.

### Backend fix applied (`supabase/functions/quota-use/index.ts`)

- Implemented dual-path consume logic:
  - primary: RPC `consume_user_credit`,
  - fallback: direct `user_quotas` read/update consume path with conflict retry.
- This prevents `FREE_QUOTA_CONSUME_FAILED` caused by RPC-only dependency.
- Deployed to production project `vimglsksvvvnxkjnaqeh`:
  - function: `quota-use`
  - deployment confirmed successful.
- Live probe verified:
  - `quota-check` returned 3,
  - immediate `quota-use` returned success and decremented to 2.

### Stability snapshot

- Full checks passed on current code: `lint`, `typecheck`, `build`.
- Git snapshot commit created:
  - `7f2209b` — `fix(flow): stabilize next-step quota check and quota-use fallback`

### Decision after verification

- User preference confirmed: stop further risky refactors while flow is smooth.
- Current strategy: keep this version as stable baseline; future changes should be one-item-at-a-time with immediate verification.

## Hero HUD UI progress archive (2026-04-28)

### Current working state

- Project path: `/Users/yan/Documents/VAID/Vid-full-main`.
- Active files with uncommitted UI changes:
  - `src/App.tsx`
  - `src/index.css`
- Last committed baseline before these UI color/neon edits:
  - `e1cd252` — `Refine hero HUD container`
- Git commit was attempted earlier but rejected by user approval flow, so this section records progress only; current UI edits are not committed yet.
- There is also an unrelated untracked file from the parent folder: `../.DS_Store`; it was not touched.

### User constraints currently in force

- Do not change Hero container structure unless explicitly requested.
- Do not change inner/outer SVG path geometry, container proportions, cut corners, rounded corners, or notch shape without explicit approval.
- Current allowed edits have been limited to color, glow, shadow, and localized decorative neon effects.
- Do not add global glow back to the whole HUD SVG.
- Do not add CSS shadows to the character image unless explicitly requested.

### Hero HUD container state

- `HeroHudFrame()` in `src/App.tsx` remains the main SVG container implementation.
- The outer and inner container geometry from the accepted version remains intact.
- Inner glass color was tuned toward the reference image's blue-purple glass tone.
- Final measured glass color after tuning:
  - target sample: `#171c34`
  - current sample at the time: `#181d36`
  - measured DeltaE: about `0.85`
- Known remaining glass difference:
  - color is close,
  - texture/brightness variation is still flatter than the target because current implementation uses SVG fills, not image-like glass texture/noise.

### Current Hero HUD color settings

- Inner glass gradient in `App.tsx`:
  - top: `#2b2449`, opacity `0.52`
  - bottom: `#151733`, opacity `0.62`
- Inner shine gradient:
  - `#c1c4ff` opacity `0.07`
  - `#8287e4` opacity `0.028`
  - `#5f78c8` opacity `0`
- Inner and outer base outline color were aligned:
  - stroke: `#b5edff`
  - base opacity: `0.3`
- Outer base outline keeps `strokeWidth="1.3"`; inner outline keeps `strokeWidth="1"`.

### Glow cleanup completed

- Removed global HUD SVG glow in `src/index.css`:
  - `.vaid-hero-shell svg { filter: none; }`
- Removed all CSS drop-shadows from the character image:
  - `.vaid-hero-figure { filter: none; }`
- Reason:
  - previous CSS `drop-shadow` created unwanted light spill near the container and character edge.
  - user confirmed these CSS shadows were not part of the original supplied asset.

### Localized neon effects added

- Four outer cut corners now have localized neon overlays.
- Implementation in `App.tsx`:
  - added `filter id="hero-corner-neon"`
  - added soft glow stroke layer on the four diagonal corner cut lines
  - added bright cyan core stroke layer on the same four cut lines
- These are localized overlays only; original container lines remain unchanged.

### Additional neon segments added before archive

- User requested two more localized gradient neon segments from the reference:
  1. left/top outer horizontal segment near top-left corner
  2. bottom notch upper horizontal segment
- Measured/implemented in SVG coordinate space:
  - top-left segment: `x=32` to `x=186`, `y=20`
  - bottom notch segment: `x=358` to `x=642`, `y=384`
- Added gradients:
  - `hero-top-left-neon`
  - `hero-bottom-notch-neon`
- Added both soft glow and core line layers for these two segments.
- No original line/path coordinates were changed.

### Current validation status

- Last completed build after adding the 1/2 neon segments:
  - `npm run build` passed.
- Known build warnings remain non-blocking:
  - Browserslist/caniuse-lite outdated warning.
  - large JS chunk warning over 500 kB.

### Next likely task

- User may visually inspect whether the top-left neon segment and bottom-notch neon segment lengths/intensity match the reference.
- If adjustment is needed, only tune:
  - gradient stop positions,
  - stroke opacity,
  - stroke width,
  - or segment start/end coordinates for those decorative overlay lines.
- Do not change accepted container structure.

## Hero HUD UI continuation archive (2026-04-28 evening)

### Current active context

- Work remains focused on Hero HUD visual tuning in `src/App.tsx`.
- `src/index.css` still has earlier cleanup edits:
  - `.vaid-hero-shell svg { filter: none; }`
  - `.vaid-hero-figure { filter: none; }`
- Active UI edits are still uncommitted.
- Keep using one dev server only:
  - preferred URL: `http://127.0.0.1:5174/`
  - multiple Vite servers caused confusing visual mismatches earlier (`5173`, `5174`, `5175`).
- Browser cache/HMR note:
  - Safari and Codex in-app browser reflected current code correctly.
  - Chrome/Brave appeared stale even after normal refresh in some tests.
  - If Chrome/Brave looks wrong, use DevTools open + reload button menu -> `Empty Cache and Hard Reload`, or append a cache buster like `?v=999`.

### User constraints still active

- Do not change the overall Hero container structure unless explicitly requested.
- Do not change outer container geometry, proportions, cut corners, or four outer cut-corner light points without explicit approval.
- Localized color/glow/glass tuning is allowed.
- Continue judging final visual decisions from the user's external-browser screenshot, not the narrow in-app browser viewport.

### Container and notch edits completed

- Outer container base border was changed from pale cyan to gray:
  - stroke: `#7f8796`
  - opacity: `0.46`
  - `strokeWidth` remains `1.3`
- Inner top notch was raised by about 20%:
  - notch bottom y changed from `50` to `47`
  - affected `innerContainerFillPath` and `innerContainerStrokePath`
- Top decorative slashes on both sides of the inner notch were adjusted:
  - color: `#5877a4`
  - opacity: `0.58`
  - bottom points aligned to `y=47`
  - left group moved closer to the left notch diagonal
  - right group moved closer to the right notch diagonal

### Localized notch neon state

- Added/kept localized neon overlays without changing the underlying container path.
- Top-left outer horizontal neon remains:
  - gradient: `hero-top-left-neon`
  - segment: `x=32` to `x=186`, `y=20`
- Added inner top notch neon:
  - gradient: `hero-inner-notch-neon`
  - current main segment: `x=398` to `x=626`, `y=47`
  - current core segment: `x=442` to `x=582`, `y=47`
  - intentionally shorter and shifted right
- Bottom outer notch neon:
  - gradient: `hero-bottom-notch-neon`
  - current main segment: `x=360` to `x=636`, `y=384`
  - current core segment: `x=388` to `x=606`, `y=384`
  - intentionally longer and shifted left
- Neon uses a soft glow layer plus a thinner core layer to simulate gradient thickness.

### Background filter conclusion

- User identified that target reference background has a subtle blue/cyan filter.
- Measurement confirmed the direction:
  - reference dark background median roughly `(9, 15, 38)`
  - current rendered background before filter roughly `(6.4, 8.4, 25.0)`
- Added a subtle blue overlay above the background image:
  - `rgba(35, 70, 150, 0.09)` at `0%`
  - `rgba(35, 70, 150, 0.11)` at `48%`
  - `rgba(24, 58, 132, 0.10)` at `100%`
- Re-measured approximation after overlay:
  - median roughly `(9.2, 14.8, 37.4)`, close to target.

### Inner glass / frosted panel state

- Important discovery:
  - target glass is not simply blue glass.
  - target glass behaves like a low-saturation blue-white fog layer over the background.
  - earlier measurement of target:
    - outside dark background median: `(7, 13, 34)`
    - inside glass median: `(21, 26, 48)`
    - delta: about `(+14, +13, +14)`
    - saturation drops by about `-0.229`
- Current code has three glass layers:
  1. `hero-gdepth` for a very light cold-blue depth layer:
     - `#17243f`, opacity `0.08`
     - `#111f3b`, opacity `0.12`
     - `#0c1731`, opacity `0.16`
  2. `hero-gbg` for stronger blue-white fog lift:
     - `#f3fbff`, opacity `0.28`
     - `#d9e9ff`, opacity `0.22`
     - `#b9cbef`, opacity `0.16`
  3. `hero-gshine` for white/cool top highlight:
     - `#fbfeff`, opacity `0.16`
     - `#e2f0ff`, opacity `0.09`
     - `#9fb8e8`, opacity `0`
- This latest stronger glass version was applied after measuring the user's `14:01` Chrome screenshot:
  - current screenshot at that time only had about `(+5, +5, 0)` glass lift versus target `(+14, +13, +14)`.
- This latest version still needs final user visual confirmation in a fresh/non-stale browser.

### Validation

- `npm run build` passed after the latest stronger glass edit.
- Non-blocking warnings remain:
  - Browserslist/caniuse-lite outdated warning.
  - JS chunk larger than 500 kB.

### Next likely step

- Ask the user to judge the latest version from a known-fresh browser on `http://127.0.0.1:5174/`.
- If glass is still too invisible:
  - increase `hero-gbg` opacities slightly.
- If glass becomes too milky/flat:
  - reduce `hero-gbg` by a small amount or increase `hero-gdepth` very slightly.
- Avoid changing container geometry unless the user explicitly requests it.

## Hero HUD UI continuation archive (2026-04-28 later)

### Glass balance micro-tune

- Continued from the "too milky/flat" risk noted above.
- Scope remained limited to `src/App.tsx` glass color/opacity only:
  - no Hero container geometry changes,
  - no path coordinate changes,
  - no global HUD SVG glow restored,
  - no character image shadow restored.
- Adjusted the three inner glass layers:
  1. `hero-gdepth` is now slightly stronger and cooler:
     - `#1a2b53`, opacity `0.10`
     - `#121f43`, opacity `0.16`
     - `#0b1430`, opacity `0.20`
  2. `hero-gbg` white fog was reduced to let more background light through:
     - `#f1fbff`, opacity `0.22`
     - `#d2e3ff`, opacity `0.17`
     - `#9db4e7`, opacity `0.12`
  3. `hero-gshine` was softened:
     - `#fbfeff`, opacity `0.12`
     - `#e2f0ff`, opacity `0.065`
     - `#9fb8e8`, opacity `0`
- Visual check on `http://127.0.0.1:5174/` in the Codex in-app browser:
  - glass reads less like a flat gray panel,
  - background streaks remain more visible through the HUD,
  - localized corner/top/bottom neon segments are unchanged.
- Validation:
  - `npx eslint src/App.tsx` passed.

### Follow-up increase requested by user

- User then requested increasing the inner container glass effect by 20%.
- Applied as `current opacity * 1.2`, based on the already-reduced values:
  - `hero-gdepth`:
    - `0.03 -> 0.036`
    - `0.048 -> 0.0576`
    - `0.06 -> 0.072`
  - `hero-gbg`:
    - `0.066 -> 0.0792`
    - `0.051 -> 0.0612`
    - `0.036 -> 0.0432`
  - `hero-gshine`:
    - `0.036 -> 0.0432`
    - `0.0195 -> 0.0234`
- No geometry, outline, localized neon, CSS shadow, or character image setting changed.
- Visual check on `http://127.0.0.1:5174/` showed a slightly stronger glass layer while remaining much lighter than the pre-70%-reduction version.
- Validation:
  - `npx eslint src/App.tsx` passed.
  - `npm run build` passed.
  - Existing non-blocking warnings remain: outdated `caniuse-lite` and JS chunk over 500 kB.

### Follow-up reduction requested by user

- User then said the inner container frosted-glass effect was still too strong and requested reducing it by 70%.
- Applied this literally by leaving the inner glass opacity at 30% of the prior values:
  - `hero-gdepth`:
    - `0.10 -> 0.03`
    - `0.16 -> 0.048`
    - `0.20 -> 0.06`
  - `hero-gbg`:
    - `0.22 -> 0.066`
    - `0.17 -> 0.051`
    - `0.12 -> 0.036`
  - `hero-gshine`:
    - `0.12 -> 0.036`
    - `0.065 -> 0.0195`
- No path geometry, container structure, outline, or localized neon segment was changed.
- Visual check on `http://127.0.0.1:5174/` showed the panel much more transparent with background streaks visible again.
- Validation:
  - `npx eslint src/App.tsx` passed.

## Hero figure progress checkpoint (2026-04-28 night)

- User clarified process rule:
  - do not automatically write session memory after every UI tweak.
  - only write progress when the user explicitly asks to store/save progress.
- Current branch at this checkpoint: `main`.
- Current uncommitted UI work is limited to `src/index.css`.
- Current unrelated/uncommitted items still present:
  - `SESSION_MEMORY_2026-04-17.md`
  - `../.DS_Store`
- Important correction:
  - user does **not** want the Hero container size/proportion changed.
  - prior experiment branch `codex/hero-proportion-experiment` changed container/hero proportions and was rejected.
  - current working version is back on `main`; the rejected experiment is not active.
- Current accepted direction:
  - keep Hero container size and SVG geometry unchanged.
  - adjust only the character image layer to approach the reference composition.
  - character should feel visually on top of the HUD/container, not behind it.
- Current character image CSS state in `src/index.css`:
  - `.vaid-hero-figure` desktop:
    - `right: -3.2%`
    - `bottom: -22%`
    - `z-index: 4`
    - `width: min(65%, 902px)`
    - `max-height: 142%`
    - `object-fit: contain`
    - `object-position: right bottom`
    - `filter: none`
  - hard crop, no fade:
    - visible through `78%`
    - transparent from `78.2%`
    - same values for `-webkit-mask-image` and `mask-image`
  - `@media (max-width: 1280px)`:
    - `width: min(62%, 770px)`
    - `right: -3%`
    - `bottom: -20%`
  - `@media (max-width: 1024px)`:
    - `width: min(58%, 616px)`
    - `right: -2%`
    - `bottom: -18%`
- Current CTA button state:
  - changed from angled/cut-corner button to rounded rectangle.
  - `.vaid-hero-cta` uses `border-radius: 8px`.
- Current validation after the latest character changes:
  - `npm run build` passed.
  - non-blocking warnings remain: outdated `caniuse-lite`; JS chunk larger than 500 kB.

## Hero figure / HUD checkpoint saved (2026-04-28 late night)

### What was saved

- User explicitly requested saving progress.
- Current working focus remains the homepage Hero section only.
- Latest accepted direction:
  - keep Hero HUD container size, SVG geometry, proportions, cut corners, notches, and localized neon structure unchanged.
  - continue tuning only the character image layer unless the user explicitly requests container changes.
  - character should remain visually above the HUD/container.

### Current committed checkpoint

- Latest commit:
  - `f456dc7 feat(hero): tune figure overlay`
- Commit includes:
  - `src/App.tsx`
  - `src/index.css`
- Purpose of the commit:
  - preserve the current Hero figure overlay tuning and the small VAID logo alt text correction.
- Files intentionally not included in that commit:
  - `SESSION_MEMORY_2026-04-17.md`
  - `src/i18n/config.ts`
  - `../.DS_Store`

### Current character image state

- Active CSS target:
  - `.vaid-hero-figure` in `src/index.css`
- Desktop values:
  - `right: -2.4%`
  - `bottom: -20.5%`
  - `z-index: 4`
  - `pointer-events: none`
  - `width: min(63.5%, 880px)`
  - `max-height: 139.5%`
  - `object-fit: contain`
  - `object-position: right bottom`
  - `transform: scaleX(1.07)`
  - `transform-origin: right bottom`
  - `filter: none`
- Current bottom mask/fade:
  - fully visible through `75%`
  - fades out to transparent by `83.2%`
  - same values applied to both `-webkit-mask-image` and `mask-image`
- Current responsive values:
  - `@media (max-width: 1280px)`:
    - `width: min(60.5%, 748px)`
    - `right: -2.2%`
    - `bottom: -19%`
  - `@media (max-width: 1024px)`:
    - `width: min(56.5%, 590px)`
    - `right: -1.2%`
    - `bottom: -16.5%`

### Iteration details from latest tuning

- User requested horizontal character distortion and explicitly allowed deformation.
- Scale iterations tested:
  - `scaleX(1.05)`
  - `scaleX(1.10)`
  - `scaleX(1.07)`
  - `scaleX(1.05)`
  - final accepted/current value: `scaleX(1.07)`
- User then requested more bottom fade:
  - hard cut was first softened from `78% -> 78.2%` to `78% -> 83.2%`
  - then fade was extended upward by another 3 percentage points
  - current fade is `75% -> 83.2%`

### Validation

- In-app browser visual checks were performed on:
  - `http://127.0.0.1:5174/?v=ui-progress`
- Latest observed result:
  - character remains above the HUD,
  - right/bottom anchoring stays stable,
  - horizontal figure scale is at `1.07`,
  - bottom crop now fades more gradually upward instead of reading as a hard cut.
- `npm run build` passed after the latest fade update.
- Existing non-blocking warnings remain:
  - `caniuse-lite` outdated warning,
  - JavaScript chunk larger than 500 kB.

### Current remaining uncommitted items

- After committing `f456dc7`, remaining worktree items are:
  - `SESSION_MEMORY_2026-04-17.md` (this progress archive)
  - `src/i18n/config.ts` (VAID wording cleanup from earlier UI pass, not committed with figure/HUD checkpoint)
  - `../.DS_Store` (unrelated untracked file)

### Next likely step

- If continuing visual tuning, adjust only `.vaid-hero-figure` unless the user explicitly approves changing HUD container geometry.
- Most likely safe next knobs:
  - `right`
  - `bottom`
  - `width`
  - `max-height`
  - `scaleX`
  - mask fade start/end percentages
- Avoid changing:
  - Hero SVG container path data,
  - outer/inner HUD proportions,
  - notch/corner geometry,
  - global SVG glow,
  - character CSS shadows.

## Homepage lower-section UI + language checkpoint (2026-04-29)

### Current active context

- Project path remains:
  - `/Users/yan/Documents/VAID/Vid-full-main`
- Current branch:
  - `main`
- User explicitly reaffirmed:
  - Hero人物以及Hero容器现在非常好，**不要做任何改动**。
  - Current work is only for sections below Hero.
- Current in-app browser URL used for visual checks:
  - `http://127.0.0.1:5174/?v=spacing-review`

### Files currently changed in this phase

- `src/App.tsx`
- `src/index.css`
- `src/i18n/config.ts`
- `src/components/LanguageSwitcher.tsx`
- `src/components/PaywallModal.tsx`
- Existing unrelated/previously dirty items still present:
  - `SESSION_MEMORY_2026-04-17.md`
  - `../.DS_Store`

### How it works card updates

- Reworked only the `How it works` cards.
- Current behavior:
  - all cards default to dark glass style,
  - the hovered/focused card becomes cyan glass highlight,
  - first card is **not** permanently highlighted.
- Fixed duplicate numbering:
  - translations already contain `01. / 02. / 03. / 04.`,
  - removed the extra generated number prefix from JSX.
- Added CSS classes for this section:
  - `.vaid-process-card`
  - `.vaid-process-card-glow`
  - `.vaid-process-card-slice`
  - `.vaid-process-icon`
  - `.vaid-process-title`
  - `.vaid-process-copy`
- User requested brighter top-right slice, then rejected it.
  - The brighter slice experiment was reverted.
  - Current slice is back to the subtler baseline:
    - `width: 46%`
    - `height: 42%`
    - opacity `0.2`
    - hover/focus opacity `0.46`

### Create Your Certificate form updates

- Tried a new two-column HUD-style form layout.
- User rejected it as less intuitive than the previous version.
- Form structure was restored to the prior single-column workflow:
  1. remaining quota row,
  2. activation-code input,
  3. upload area,
  4. character name,
  5. creator name,
  6. terms checkbox,
  7. Edit Info button.
- Kept only the newer dark blue glass panel color.
- Current outer form panel class:
  - `.vaid-form-panel`
- Current form section spacing:
  - `section id="submission"` uses `className="pt-20 pb-24"`.

### Section spacing decisions

- The first attempt used visual transform:
  - `.vaid-process-lift { transform: translateY(-30%); }`
- This was identified as wrong because transform moved the visuals while leaving layout space behind.
- Replaced with real layout spacing.
- Current `How it works` section:
  - `className="-mt-20 pt-16 pb-10"`
- Current `How it works` title-to-card gap:
  - `mb-12`
- Current card-to-form gap:
  - form section `pt-20`
- Important observation from browser review:
  - Hero-to-How-it-works now feels more connected.
  - Card-to-form gap was adjusted because user felt it was too close.
  - User specifically pointed to the gap between cards and form with a red arrow.

### Rollback branches created during this phase

- `codex/before-how-cards`
  - before the How it works card restyle.
- `codex/before-certificate-form`
  - before the first form layout rewrite.
- `codex/before-spacing-layout-fix`
  - before replacing transform spacing with real layout spacing.
- `codex/before-final-spacing-tune`
  - before the later How-it-works spacing micro-tune.

### Language/i18n update

- User requested:
  - when a user selects a language, all website text should switch to that language,
  - default language should be English.
- Updated `src/i18n/config.ts`:
  - default `lng` changed from `zh` to `en`.
  - added `supportedLngs: ['en', 'zh', 'ja']`.
- Updated `src/components/LanguageSwitcher.tsx`:
  - removed French and Spanish from dropdown because no complete translation resources exist for them.
  - current languages:
    - English
    - 简体中文
    - 日本語
- Connected homepage visible copy to i18n:
  - remaining uses row,
  - buy plan button,
  - activation-code placeholder,
  - verify activation button,
  - form labels/placeholders,
  - terms/Privacy text,
  - Edit Info / Back / Next / processing,
  - drag/scale/reset helper text,
  - generation and activation error messages.
- Connected `PaywallModal` visible copy to i18n:
  - modal title/subtitle,
  - plan names,
  - best value badge,
  - certificate count line,
  - buy button,
  - iframe notice,
  - payment pending/open Alipay text,
  - purchase errors,
  - security note.
- Browser validation performed:
  - reload defaults to English,
  - selecting 简体中文 switches Hero / How it works / form visible text into Chinese.

### Current validation status

- Latest checks passed:
  - `npx eslint src/App.tsx src/components/PaywallModal.tsx src/components/LanguageSwitcher.tsx`
  - `npm run typecheck`
  - `npm run build`
- Existing non-blocking warnings remain:
  - Browserslist/caniuse-lite outdated warning.
  - JS chunk over 500 KB.

### Important remaining caveat

- The user said "all website text"; this pass fully handled the homepage flow and purchase modal.
- Other pages/components still contain hardcoded Chinese/English and would need separate passes if the user wants full-site completion:
  - `src/pages/PaymentSuccessPage.tsx`
  - `src/components/CardGenerator.tsx`
  - `src/pages/VerifyPage.tsx`
  - `src/pages/TermsPage.tsx`
  - `src/pages/PrivacyPage.tsx`
  - `src/components/MaintenanceMode.tsx`
- Legal pages are long Chinese documents and should not be translated casually without user approval of English/Japanese legal wording.

### Next likely step

- If continuing language work, handle `PaymentSuccessPage` and `CardGenerator` first because they are part of the main paid generation flow.
- Do not modify Hero人物 or Hero容器.

## Mobile homepage Hero adaptation checkpoint (2026-04-30)

### Current active context

- Project path remains:
  - `/Users/yan/Documents/VAID/Vid-full-main`
- Current preview server:
  - `http://127.0.0.1:5175/`
  - mobile LAN URL used by user:
    - `http://192.168.50.123:5175/`
- Current in-app browser URL after restore:
  - `http://127.0.0.1:5175/?v=mobile-restored-1`
- User explicitly set the boundary:
  - from now on, discussion/work is for **mobile adaptation only**.
  - desktop/web UI proportions must not be changed.
  - only change mobile breakpoint rules or mobile-specific classes.

### Mobile Hero work completed

- The mobile Hero has been separated from the desktop HUD composition:
  - desktop Hero/HUD proportions remain untouched.
  - mobile hides `.vaid-hero-shell`.
  - mobile positions `.vaid-hero-figure` as the primary visual.
  - mobile text is overlaid on the character/body area.
- User clarified preferred direction:
  - character should be the primary mobile subject.
  - text may cover the character body.
  - text must not cover the character face.
  - `Get Started` position in the restored/current version is good because it aligns with the lower character/body area.

### Important correction / restored state

- A later attempt enlarged and repositioned the mobile character to match a reference screenshot.
- User rejected that and said not to change character size or position.
- The mobile Hero was restored to the saved checkpoint state:
  - `.vaid-hero-figure` at mobile:
    - `width: min(104vw, 430px)`
    - `right: -5.75rem`
    - `bottom: -4.25rem`
  - `.vaid-hero-figure` at max `480px`:
    - `width: min(108vw, 405px)`
    - `right: -5.4rem`
    - `bottom: -4rem`
- Text layout was also restored to the saved checkpoint:
  - mobile `.vaid-hero-copy-panel`:
    - `left: 1.25rem`
    - `top: clamp(16rem, 36svh, 20rem)`
    - `width: min(68vw, 17.25rem)`
  - max `480px` `.vaid-hero-copy-panel`:
    - `left: 1.1rem`
    - `top: clamp(15rem, 34svh, 18.75rem)`
    - `width: min(68vw, 16.5rem)`

### Rollback checkpoint

- Git stash rollback exists:
  - `stash@{0}: codex/mobile-hero-current-text-layout-before-wider-type`
- To restore the saved mobile Hero text layout:
  - `git stash apply stash^{/codex/mobile-hero-current-text-layout-before-wider-type}`

### Current validation status

- Latest checks after mobile Hero edits passed:
  - `npm run typecheck -- --pretty false`
  - `npm run build`
- Existing non-blocking warnings remain:
  - Browserslist/caniuse-lite outdated warning.
  - JS chunk over 500 KB.

### Current dirty / generated items to be aware of

- Existing modified files from previous phases still present:
  - `src/App.tsx`
  - `src/index.css`
  - `src/i18n/config.ts`
  - `src/components/LanguageSwitcher.tsx`
  - `src/components/PaywallModal.tsx`
  - `SESSION_MEMORY_2026-04-17.md`
- Existing/new untracked assets:
  - `public/footer_circuit.png`
  - `public/vaid-logo-top.jpeg`
  - `public/vaid-logo-top.png`
  - `../.DS_Store`
- Mobile screenshot artifacts generated during review:
  - `screenshots-mobile-segments/`
  - `vaid-fullpage-mobile-tight-2.png`
  - `vaid-mobile-fullpage-clean.png`
  - `vaid-mobile-fullpage-fixedscroll.png`
  - `vaid-mobile-fullpage-stitched.png`

### Next likely step

- Continue only with mobile Hero typography/layout, unless user changes scope.
- Do not change:
  - desktop Hero/HUD/container proportions,
  - mobile character size,
  - mobile character position,
  - `Get Started` position unless user explicitly requests it.
- If adjusting text again:
  - keep character face unobstructed,
  - text may cover body,
  - preserve current mobile character coordinates.

## 2026-05-01 22:27 CST checkpoint

### Scope shift

- Mobile UI is considered acceptable for now.
- Active focus moved to:
  - desktop Hero layout for `zh` and `ja`,
  - multilingual copy refinement,
  - background video integration.

### Background video

- Replaced the static full-page background image layer with a muted looping background video:
  - added `public/hero-background-video.mp4`
  - updated `/src/App.tsx` to render a full-screen `video` with:
    - `autoPlay`
    - `loop`
    - `muted`
    - `playsInline`
    - poster fallback to `hero_light_bg.png`
- Video watermark in the lower-right corner was intentionally left untouched.
- Audio was not stripped from the source file itself; playback is muted in the site only.

### Checkpoint / rollback note for video phase

- Normal `git stash` failed in this repo because Git could not write the index.
- A patch checkpoint was created instead:
  - `/private/tmp/vaid-checkpoint-before-video-background.patch`
- Existing rollback command shared to user:
  - `git -C /Users/yan/Documents/VAID restore --source=HEAD --worktree --staged -- Vid-full-main`
  - `git -C /Users/yan/Documents/VAID apply --binary /private/tmp/vaid-checkpoint-before-video-background.patch`
  - `rm -f /Users/yan/Documents/VAID/Vid-full-main/public/hero-background-video.mp4`

### Hero text updates

- English Hero title/subtitle updated to:
  - `Your Digital Identity`
  - `Permanently`
  - `Documented`
  - subtitle:
    - `VAID provides proof of existence for digital assets and virtual characters, creating an immutable record from the moment they are created.`
- Chinese Hero subtitle updated to:
  - `VAID 为数字资产、虚拟角色与原创设定提供存在证明与时间锚点。`
  - `从作品诞生的那一刻起，为创作留下一份可追溯、可验证、不可篡改的数字记录。`
- Current Chinese Hero title lines are:
  - `将您的数字资产永久存证`
  - `将数字灵魂锚定物理世界`

### Desktop CJK Hero layout

- Added desktop-only language-aware Hero classes in `/src/App.tsx`:
  - `vaid-hero-copy-panel--zh`
  - `vaid-hero-copy-panel--ja`
  - `vaid-hero-title--zh`
  - `vaid-hero-title--ja`
  - `vaid-hero-subtitle--zh`
  - `vaid-hero-subtitle--ja`
- Added desktop-only (`min-width: 769px`) CJK Hero sizing rules in `/src/index.css`:
  - wider panel widths for `zh` and `ja`
  - smaller desktop CJK title sizes
  - `white-space: nowrap` on each CJK title line
  - smaller desktop CJK subtitle sizes
- Result after browser verification:
  - desktop Chinese Hero is now stable as a two-line title
  - desktop Japanese Hero is now stable as a three-line title
  - mobile Hero rules were not changed by this desktop CJK fix

### Process card copy updates

- Chinese process card copy was rewritten into a stronger narrative tone.
- English process card copy was rewritten to match the Chinese direction.
- Japanese process card copy was rewritten based on the updated English meaning.
- Current Chinese step 3 intentionally emphasizes permanent ownership language:
  - `获得一份不可篡改的数字化存证证书，让数字灵魂正式锚定于物理世界，宣告该虚拟资产从此永久属于您。`

### Upload button wording

- `selectFile` labels were changed in all three languages:
  - en: `Select File for Local Encryption`
  - zh: `择文件进行本地加密`
  - ja: `ローカル暗号化用ファイルを選択`

### Paywall modal

- Mobile paywall modal was resized to fit the viewport better:
  - top-aligned on small screens
  - capped max-height
  - internal scrolling
  - reduced title/card spacing and mobile card sizing
- Desktop paywall modal layout was left intact.

### Footer / disclaimer cleanup

- Homepage `Legal Disclaimer` and `Privacy Manifesto` blocks were removed from the footer.
- Footer returned to a simpler copyright + ICP presentation.

### Validation status

- Repeatedly revalidated with:
  - `npm run typecheck -- --pretty false`
- Browser checks were performed in the in-app browser for:
  - desktop English Hero with video background
  - desktop Chinese Hero
  - desktop Japanese Hero
  - mobile paywall modal

### Current files materially involved in latest phase

- `src/App.tsx`
- `src/index.css`
- `src/i18n/config.ts`
- `src/components/PaywallModal.tsx`
- `public/hero-background-video.mp4`

### Current guidance for next step

- If continuing visual work, current likely focus is desktop-only refinement.
- Do not assume mobile and desktop CJK Hero copy should share the same line breaks forever; if needed later, split `titleLines` into mobile/desktop variants.
- If user asks to remove the video watermark, that requires video-level treatment rather than simple frontend styling.
