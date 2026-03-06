# mAutomate Email Templates

All emails sent from **noreply@mautomate.ai** via `mail.mautomate.ai`.

---

## Current Emails (need redesigning)

### 1. Email Verification
**File:** `src/auth/email-and-pass/emails.ts`
**Trigger:** User signs up
**Current content:** Bare-bones plain link, no branding

### 2. Password Reset
**File:** `src/auth/email-and-pass/emails.ts`
**Trigger:** User requests password reset
**Current content:** Bare-bones plain link, no branding

### 3. Subscription Cancellation
**File:** `src/payment/stripe/webhook.ts`
**Trigger:** User cancels subscription (Stripe `cancel_at_period_end`)
**Current content:** Placeholder text "We hate to see you go. Here is a sweet offer..."

---

## Missing Emails (need building)

### 4. Welcome Email
**Trigger:** After email verified + first dashboard visit
**Should include:** Welcome message, quick-start guide, links to key features

### 5. Subscription Confirmed
**Trigger:** Stripe `invoice.paid` (new subscription)
**Should include:** Plan name, price, billing cycle, features included, link to dashboard

### 6. Subscription Renewed
**Trigger:** Stripe `invoice.paid` (renewal)
**Should include:** Same as above but renewal context, next billing date

### 7. Subscription Canceled (final)
**Trigger:** Stripe `customer.subscription.deleted`
**Should include:** End date, what they'll lose, re-subscribe link

### 8. Credits Top-Up Confirmed
**Trigger:** Top-up checkout completed
**Should include:** Credits added, new balance, what they can do with credits

### 9. Low Credits Warning
**Trigger:** When credits fall below threshold (e.g. < 100)
**Should include:** Current balance, top-up link

### 10. Affiliate Commission Earned
**Trigger:** When a commission is created in `affiliateService.ts`
**Should include:** Amount earned, event type (signup/subscription/topup), tier, running total

### 11. Affiliate Withdrawal Requested
**Trigger:** When user submits withdrawal request
**Should include:** Amount requested, payment method, processing time note

### 12. Affiliate Withdrawal Approved
**Trigger:** Admin processes withdrawal in `adminOperations.ts`
**Should include:** Amount, transaction ID if available, payment method

### 13. Affiliate Withdrawal Rejected
**Trigger:** Admin rejects withdrawal
**Should include:** Amount, rejection reason

---

## Full Template Content

---

### Template 1 — Email Verification

**Subject:** `Verify your mAutomate account`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #2a2a2a;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">m<span style="color:#a855f7;">Automate</span></span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
              Verify your email address
            </h1>
            <p style="margin:0 0 28px;font-size:15px;color:#a3a3a3;line-height:1.6;">
              Thanks for signing up! Click the button below to verify your email and activate your mAutomate account.
            </p>
            <a href="{{verificationLink}}"
               style="display:inline-block;background:#a855f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.2px;">
              Verify Email Address
            </a>
            <p style="margin:28px 0 0;font-size:13px;color:#666;line-height:1.6;">
              Or copy this link into your browser:<br>
              <span style="color:#a855f7;word-break:break-all;">{{verificationLink}}</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #2a2a2a;">
            <p style="margin:0;font-size:12px;color:#555;line-height:1.6;">
              This link expires in 24 hours. If you didn't create an mAutomate account, you can safely ignore this email.<br><br>
              © 2026 mAutomate · <a href="https://mautomate.ai" style="color:#666;text-decoration:none;">mautomate.ai</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
```

**Plain text fallback:**
```
Verify your mAutomate account

Click the link below to verify your email address and activate your account:
{{verificationLink}}

This link expires in 24 hours. If you didn't sign up for mAutomate, ignore this email.

© 2026 mAutomate · mautomate.ai
```

---

### Template 2 — Password Reset

**Subject:** `Reset your mAutomate password`

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden;">

        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #2a2a2a;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;">m<span style="color:#a855f7;">Automate</span></span>
          </td>
        </tr>

        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
              Reset your password
            </h1>
            <p style="margin:0 0 28px;font-size:15px;color:#a3a3a3;line-height:1.6;">
              We received a request to reset the password for your mAutomate account. Click the button below to choose a new password.
            </p>
            <a href="{{passwordResetLink}}"
               style="display:inline-block;background:#a855f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
              Reset Password
            </a>
            <p style="margin:28px 0 0;font-size:13px;color:#666;line-height:1.6;">
              This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 40px;border-top:1px solid #2a2a2a;">
            <p style="margin:0;font-size:12px;color:#555;line-height:1.6;">
              © 2026 mAutomate · <a href="https://mautomate.ai" style="color:#666;text-decoration:none;">mautomate.ai</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
```

**Plain text fallback:**
```
Reset your mAutomate password

We received a request to reset your password. Click the link below:
{{passwordResetLink}}

This link expires in 1 hour. If you didn't request this, ignore this email.

© 2026 mAutomate · mautomate.ai
```

---

### Template 3 — Subscription Cancellation (win-back)

**Subject:** `Your mAutomate subscription has been canceled`

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden;">

        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #2a2a2a;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;">m<span style="color:#a855f7;">Automate</span></span>
          </td>
        </tr>

        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
              We're sorry to see you go
            </h1>
            <p style="margin:0 0 16px;font-size:15px;color:#a3a3a3;line-height:1.6;">
              Your mAutomate subscription has been scheduled for cancellation. You'll continue to have full access until your current billing period ends.
            </p>
            <p style="margin:0 0 28px;font-size:15px;color:#a3a3a3;line-height:1.6;">
              If you changed your mind, you can reactivate your subscription at any time before the period ends — no interruption, no setup required.
            </p>

            <!-- Feature reminder -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border-radius:8px;border:1px solid #2a2a2a;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.8px;">What you'll lose access to</p>
                <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">→ AI content generation credits</p>
                <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">→ Social Media Agent &amp; SEO Agent</p>
                <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">→ Central Inbox &amp; Chatbot</p>
                <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">→ Video Studio &amp; File Manager</p>
                <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">→ Content Calendar &amp; Post Hub</p>
              </td></tr>
            </table>

            <a href="https://mautomate.ai/dashboard"
               style="display:inline-block;background:#a855f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
              Reactivate Subscription
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 40px;border-top:1px solid #2a2a2a;">
            <p style="margin:0;font-size:12px;color:#555;line-height:1.6;">
              Need help or want to share feedback? Reply to this email or reach us at <a href="mailto:support@mautomate.ai" style="color:#a855f7;text-decoration:none;">support@mautomate.ai</a><br>
              © 2026 mAutomate · <a href="https://mautomate.ai" style="color:#666;text-decoration:none;">mautomate.ai</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

### Template 4 — Welcome Email

**Subject:** `Welcome to mAutomate 🎉`
**Trigger:** After email verified (call from email verification handler)

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden;">

        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #2a2a2a;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;">m<span style="color:#a855f7;">Automate</span></span>
          </td>
        </tr>

        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
              Welcome aboard, {{firstName}}!
            </h1>
            <p style="margin:0 0 28px;font-size:15px;color:#a3a3a3;line-height:1.6;">
              Your account is verified and ready. Here's what you can do with mAutomate:
            </p>

            <!-- Feature grid -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td width="48%" style="background:#111;border-radius:8px;border:1px solid #2a2a2a;padding:16px 18px;vertical-align:top;">
                  <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#ffffff;">🤖 AI Agents</p>
                  <p style="margin:0;font-size:13px;color:#666;line-height:1.5;">Social media posts, SEO articles, and video generation — all on autopilot.</p>
                </td>
                <td width="4%"></td>
                <td width="48%" style="background:#111;border-radius:8px;border:1px solid #2a2a2a;padding:16px 18px;vertical-align:top;">
                  <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#ffffff;">📥 Central Inbox</p>
                  <p style="margin:0;font-size:13px;color:#666;line-height:1.5;">Manage all your customer conversations from one place.</p>
                </td>
              </tr>
              <tr><td colspan="3" style="padding:8px 0;"></td></tr>
              <tr>
                <td width="48%" style="background:#111;border-radius:8px;border:1px solid #2a2a2a;padding:16px 18px;vertical-align:top;">
                  <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#ffffff;">📅 Content Calendar</p>
                  <p style="margin:0;font-size:13px;color:#666;line-height:1.5;">Schedule and publish posts across all your channels.</p>
                </td>
                <td width="4%"></td>
                <td width="48%" style="background:#111;border-radius:8px;border:1px solid #2a2a2a;padding:16px 18px;vertical-align:top;">
                  <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#ffffff;">💰 Affiliate Program</p>
                  <p style="margin:0;font-size:13px;color:#666;line-height:1.5;">Earn up to 40% commission by referring others.</p>
                </td>
              </tr>
            </table>

            <a href="https://mautomate.ai/dashboard"
               style="display:inline-block;background:#a855f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
              Go to Dashboard
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 40px;border-top:1px solid #2a2a2a;">
            <p style="margin:0;font-size:12px;color:#555;line-height:1.6;">
              Questions? Reply to this email or visit <a href="https://mautomate.ai" style="color:#a855f7;text-decoration:none;">mautomate.ai</a><br>
              © 2026 mAutomate
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

### Template 5 — Subscription Confirmed

**Subject:** `Your {{planName}} plan is active`
**Trigger:** Stripe `invoice.paid` (new subscription, not renewal)

```html
<!-- Same header/footer shell as above -->
<!-- Body content: -->
<h1>Your {{planName}} plan is now active</h1>
<p>Thanks for subscribing! Here's a summary of your plan:</p>

<table style="background:#111;border-radius:8px;border:1px solid #2a2a2a;width:100%;margin-bottom:28px;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">Plan: <strong style="color:#fff;">{{planName}}</strong></p>
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">Amount: <strong style="color:#fff;">${{amount}}/month</strong></p>
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">Monthly credits: <strong style="color:#fff;">{{credits}} credits</strong></p>
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">Next billing date: <strong style="color:#fff;">{{nextBillingDate}}</strong></p>
  </td></tr>
</table>

<a href="https://mautomate.ai/dashboard" style="...">Access Dashboard</a>
```

---

### Template 6 — Credits Top-Up Confirmed

**Subject:** `{{credits}} credits added to your account`
**Trigger:** Stripe checkout for top-up package

```html
<!-- Same shell -->
<!-- Body content: -->
<h1>Credits added successfully</h1>
<p>Your top-up is complete. Here's your updated balance:</p>

<table style="background:#111;border-radius:8px;border:1px solid #2a2a2a;width:100%;margin-bottom:28px;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">Credits added: <strong style="color:#a855f7;">+{{creditsAdded}}</strong></p>
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">New balance: <strong style="color:#fff;">{{newBalance}} credits</strong></p>
  </td></tr>
</table>

<a href="https://mautomate.ai/dashboard" style="...">Start Creating</a>
```

---

### Template 7 — Affiliate Commission Earned

**Subject:** `You earned ${{amount}} in affiliate commission`
**Trigger:** Commission created in `affiliateService.ts`

```html
<!-- Same shell -->
<!-- Body content: -->
<h1>You earned a commission!</h1>
<p>Great news — someone you referred just made a payment and you earned a commission.</p>

<table style="background:#111;border-radius:8px;border:1px solid #2a2a2a;width:100%;margin-bottom:28px;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">Commission earned: <strong style="color:#a855f7;">${{amount}}</strong></p>
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">Event: <strong style="color:#fff;">{{eventType}}</strong></p>
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">Your tier: <strong style="color:#fff;">{{tierName}} ({{rate}}% rate)</strong></p>
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">Available balance: <strong style="color:#fff;">${{availableBalance}}</strong></p>
  </td></tr>
</table>

<a href="https://mautomate.ai/affiliate/earnings" style="...">View Earnings</a>
```

---

### Template 8 — Affiliate Withdrawal Requested

**Subject:** `Withdrawal request received — ${{amount}}`
**Trigger:** `requestWithdrawal` action in `affiliate/operations.ts`

```html
<!-- Same shell -->
<!-- Body content: -->
<h1>Withdrawal request received</h1>
<p>We've received your withdrawal request and it's now pending review.</p>

<table style="background:#111;border-radius:8px;border:1px solid #2a2a2a;width:100%;margin-bottom:28px;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">Amount requested: <strong style="color:#fff;">${{amount}}</strong></p>
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">Payment method: <strong style="color:#fff;">{{method}}</strong></p>
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">Status: <strong style="color:#f59e0b;">Pending review</strong></p>
    <p style="margin:4px 0;font-size:14px;color:#a3a3a3;">Typically processed within: <strong style="color:#fff;">3–5 business days</strong></p>
  </td></tr>
</table>

<a href="https://mautomate.ai/affiliate/withdraw" style="...">View Withdrawal Status</a>
```

---

### Template 9 — Affiliate Withdrawal Approved

**Subject:** `Your ${{amount}} withdrawal has been processed`
**Trigger:** Admin calls `processWithdrawal` in `affiliate/adminOperations.ts`

```html
<!-- Same shell -->
<!-- Body content: -->
<h1>Withdrawal processed!</h1>
<p>Your withdrawal has been approved and payment has been sent.</p>

<table style="...">
  <tr><td style="...">
    <p>Amount: <strong>${{amount}}</strong></p>
    <p>Payment method: <strong>{{method}}</strong></p>
    <p>Transaction ID: <strong>{{transactionId}}</strong></p>
    <p>Processed on: <strong>{{processedDate}}</strong></p>
  </td></tr>
</table>

<a href="https://mautomate.ai/affiliate" style="...">View Affiliate Dashboard</a>
```

---

### Template 10 — Affiliate Withdrawal Rejected

**Subject:** `Update on your withdrawal request`
**Trigger:** Admin calls `rejectWithdrawal` in `affiliate/adminOperations.ts`

```html
<!-- Same shell -->
<!-- Body content: -->
<h1>Withdrawal request update</h1>
<p>Unfortunately, we were unable to process your withdrawal request.</p>

<table style="...">
  <tr><td style="...">
    <p>Amount: <strong>${{amount}}</strong></p>
    <p>Reason: <strong style="color:#ef4444;">{{rejectionReason}}</strong></p>
    <p>Note: Your balance has not been affected.</p>
  </td></tr>
</table>

<a href="https://mautomate.ai/affiliate/withdraw" style="...">Submit New Request</a>
<p>Questions? Contact <a href="mailto:support@mautomate.ai">support@mautomate.ai</a></p>
```

---

## Implementation Summary

### Files to update:
| # | Email | File to modify | Action |
|---|-------|---------------|--------|
| 1 | Email Verification | `src/auth/email-and-pass/emails.ts` | Replace HTML |
| 2 | Password Reset | `src/auth/email-and-pass/emails.ts` | Replace HTML |
| 3 | Subscription Cancellation | `src/payment/stripe/webhook.ts` | Replace placeholder |
| 4 | Welcome | `src/auth/email-and-pass/emails.ts` + webhook | New — send after verification |
| 5 | Subscription Confirmed | `src/payment/stripe/webhook.ts` | New — add to `handleInvoicePaid` |
| 6 | Credits Top-Up | `src/payment/stripe/webhook.ts` | New — add to checkout handler |
| 7 | Commission Earned | `src/affiliate/affiliateService.ts` | New — add to `processAffiliateCommission` |
| 8 | Withdrawal Requested | `src/affiliate/operations.ts` | New — add to `requestWithdrawal` |
| 9 | Withdrawal Approved | `src/affiliate/adminOperations.ts` | New — add to `processWithdrawal` |
| 10 | Withdrawal Rejected | `src/affiliate/adminOperations.ts` | New — add to `rejectWithdrawal` |

### Shared email shell (reuse across all templates):

```typescript
// src/email/emailShell.ts
export function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #2a2a2a;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;">m<span style="color:#a855f7;">Automate</span></span>
          </td>
        </tr>
        <tr><td style="padding:40px;">${content}</td></tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #2a2a2a;">
            <p style="margin:0;font-size:12px;color:#555;line-height:1.6;">
              © 2026 mAutomate · <a href="https://mautomate.ai" style="color:#666;text-decoration:none;">mautomate.ai</a> ·
              <a href="mailto:support@mautomate.ai" style="color:#666;text-decoration:none;">support@mautomate.ai</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function primaryButton(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#a855f7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">${text}</a>`;
}

export function infoBox(rows: { label: string; value: string; highlight?: boolean }[]): string {
  const rowsHtml = rows.map(r =>
    `<p style="margin:4px 0;font-size:14px;color:#a3a3a3;">${r.label}: <strong style="color:${r.highlight ? '#a855f7' : '#fff'};">${r.value}</strong></p>`
  ).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border-radius:8px;border:1px solid #2a2a2a;margin-bottom:28px;"><tr><td style="padding:20px 24px;">${rowsHtml}</td></tr></table>`;
}
```

---

## Design Tokens (dark theme, matches dashboard)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0f0f0f` | Email body |
| Card bg | `#1a1a1a` | Email container |
| Card inner | `#111` | Info boxes |
| Border | `#2a2a2a` | All borders |
| Text primary | `#ffffff` | Headings, values |
| Text muted | `#a3a3a3` | Body copy |
| Text subtle | `#555` / `#666` | Footer, labels |
| Accent | `#a855f7` | CTA buttons, logo, highlights |
| Warning | `#f59e0b` | Pending status |
| Error | `#ef4444` | Rejection, errors |
| Success | `#10b981` | Active, approved |
