# 🔧 Fix Supabase Email Confirmation Issue

## Problem
You're getting email confirmation errors when signing up because Supabase requires email verification by default.

## Quick Fix: Disable Email Confirmation (For Development)

### Step 1: Disable Email Confirmation

1. Go to your Supabase Dashboard: https://tsnahgabddfpcxuvcxvr.supabase.co/project/tsnahgabddfpcxuvcxvr/auth/providers

2. Scroll down to **"Email Auth"** section

3. Find **"Confirm email"** toggle and **TURN IT OFF**

4. Click **"Save"**

### Step 2: Configure Email Rate Limiting (Optional)

If you still see rate limit errors:

1. Go to: https://tsnahgabddfpcxuvcxvr.supabase.co/project/tsnahgabddfpcxuvcxvr/auth/rate-limits

2. Adjust the rate limits or disable them for development

### Step 3: Test Again

1. Go to your app: https://team-productivity.preview.emergentagent.com
2. Try signing up again with a new email
3. You should be logged in immediately without email confirmation

---

## Alternative: Enable Email Confirmation Properly

If you want to keep email confirmation enabled (for production):

### 1. Configure SMTP Settings

Go to: https://tsnahgabddfpcxuvcxvr.supabase.co/project/tsnahgabddfpcxuvcxvr/auth/templates

Set up custom SMTP (Gmail, SendGrid, etc.) to avoid rate limits

### 2. Use Supabase's Free Email Service

- Supabase provides free email service but with rate limits
- For development, it's better to disable email confirmation
- For production, set up custom SMTP

---

## Recommended Settings for Development

1. **Email Confirmation**: OFF
2. **Auto-confirm users**: ON
3. **Redirect URLs**: Add your app URL: `https://team-productivity.preview.emergentagent.com/*`

Path: https://tsnahgabddfpcxuvcxvr.supabase.co/project/tsnahgabddfpcxuvcxvr/auth/url-configuration

---

## Already Have the Database Schema?

If you haven't run the database schema yet:

1. Go to: https://tsnahgabddfpcxuvcxvr.supabase.co/project/tsnahgabddfpcxuvcxvr/sql/new
2. Copy the entire content from `supabase-schema.sql`
3. Paste and click "Run"

---

## After Fixing

1. Clear your browser cache/cookies
2. Try signing up with a fresh email
3. You should be logged in immediately
4. Create a project and start using the app!

Let me know if you still face issues!
