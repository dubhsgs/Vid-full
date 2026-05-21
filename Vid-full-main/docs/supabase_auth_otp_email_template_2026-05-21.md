# VAID Supabase Auth OTP Email Template

Date: 2026-05-21

Use this for Supabase Dashboard > Authentication > Emails > Magic Link.

VAID now logs users in with an email verification code. The email must show `{{ .Token }}`. Do not use a login button or backup login link as the main flow, because mobile mail apps can open links inside an internal browser and consume the login session there.

## Subject

```text
VAID Verification Code
```

## Body

```html
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
  <h2 style="margin: 0 0 16px;">VAID Verification Code</h2>
  <p style="margin: 0 0 12px;">Enter this code on the VAID login page:</p>
  <div style="display: inline-block; margin: 12px 0 20px; padding: 14px 20px; border-radius: 10px; background: #2563eb; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 6px;">
    {{ .Token }}
  </div>
  <p style="margin: 0; color: #4b5563;">This code can only be used once. If you did not request this login, you can ignore this email.</p>
</div>
```
