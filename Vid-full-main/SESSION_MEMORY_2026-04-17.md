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
