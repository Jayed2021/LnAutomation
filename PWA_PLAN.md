# PWA Conversion Plan: Progressive Web App with Dynamic Store Branding

## Overall Approach and Benefits

This approach uses `vite-plugin-pwa` which is the most production-ready solution for Vite-based React apps. It integrates seamlessly with the existing setup without requiring a full restructure. The store logo already stored in Supabase will serve as the app icon, and the settings page will give admins control over the app's visual appearance on the home screen. Users on Android and iOS will see an "Add to Home Screen" prompt automatically when they visit the app.

---

## 1. Dependencies and Build Config

- Install `vite-plugin-pwa` as a dev dependency
- Update `vite.config.ts` to register the PWA plugin, pointing to the manifest and service worker configuration
- Configure the plugin with `registerType: 'autoUpdate'` and `injectRegister: 'auto'` so installs and updates are handled silently

---

## 2. Create Store Context (Global Store Profile State)

- Create a new `StoreContext.tsx` in `src/contexts/` that fetches the `store_profile` row on app load and makes `store_name`, `logo_url`, and `app_icon_url` available globally throughout the app
- Wrap this provider in `App.tsx` alongside the existing `AuthProvider`
- This context will be the single source of truth so the store name and icon update everywhere at once when the admin saves the profile

---

## 3. Add App Icon Field to Store Profile

- Add a new column `app_icon_url` to the `store_profile` table via a new Supabase migration (separate from `logo_url` which is for invoices/documents)
- Update `StoreProfileData` interface in `StoreProfile.tsx` to include `app_icon_url`
- Add a new "App Icon" upload section in `StoreProfile.tsx` with:
  - A square preview box showing either the uploaded icon image or a generated initial letter avatar (first capital letter of the store name in white on a dark background)
  - An "Upload App Icon" button (square images like 512x512 work best — noted in helper text)
  - A "Remove" button to revert to the default initial letter
  - A note explaining: "This icon appears when users install the app on their phone"

---

## 4. Dynamic Web App Manifest Generation

- Generate a `/public/manifest.json` as a static base file with fallback values
- Create a `useManifest` hook that updates the `<meta name="theme-color">` and `<title>` tags dynamically using the store name from `StoreContext`
- Add a Supabase Edge Function to serve a dynamic `manifest.json` that reads live `store_name` and `app_icon_url` from the database — this ensures the installed app always reflects the current store name
- Set `display: standalone`, `start_url: /`, `orientation: portrait` in the manifest

---

## 5. App Icon Generation (SVG Canvas Fallback)

- Create a utility function `generateInitialIcon(storeName, size)` that draws a square SVG/Canvas image with:
  - Dark background matching the existing sidebar color (`#111827` / gray-900)
  - The first capital letter of the store name centered in white, bold
- This function will produce base64 PNG data URLs for icon sizes 192x192 and 512x512
- The dynamic manifest endpoint will use either `app_icon_url` (if set) or the generated initial icon

---

## 6. Update Login Page

- Replace the hardcoded "ERP System" title and "Bangladesh Eyewear Management" subtitle in `Login.tsx` with values from `StoreContext`
- Show `{storeName} ERP` as the heading (e.g., "Lunettes ERP")
- Show the tagline from the store profile as the subtitle
- Replace the Glasses icon with: if `app_icon_url` exists, show that image; otherwise show the generated initial letter avatar (same dark background, white letter style)

---

## 7. Update Layout Sidebar

- The sidebar currently shows "ERP System" and "Bangladesh Eyewear" as hardcoded text at the top — update these to use `StoreContext` values (`store_name` and tagline)
- Replace the static logo/text in the sidebar header with the same dynamic initial-letter-or-image logic

---

## 8. Update HTML Entry Point

Update `index.html` to:
- Change `<title>` from "ERP Application Development" to a placeholder that gets overridden at runtime by the store name
- Add `<link rel="manifest" href="/manifest.json">`
- Add `<meta name="theme-color" content="#111827">` (matching sidebar dark color)
- Add Apple PWA meta tags:
  - `apple-mobile-web-app-capable`
  - `apple-mobile-web-app-status-bar-style: black-translucent`
  - `apple-mobile-web-app-title`
- Add `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`

---

## 9. Offline Detection Banner

- Create an `OfflineBanner` component that:
  - Listens to the browser's `online`/`offline` events
  - Shows a fixed banner at the top of the screen when offline: "You are offline. This app requires an internet connection."
  - Disappears automatically when connection is restored
- Add this to `Layout.tsx` so it shows across all pages when the user is authenticated

---

## 10. PWA Install Prompt

- Create an `InstallPromptBanner` component that:
  - Captures the `beforeinstallprompt` browser event
  - Shows a subtle bottom banner: "[Store Name] ERP — Install this app on your device" with an Install button and a dismiss (X) button
  - Stores the dismissed state in `localStorage` so it does not re-appear after dismissal
  - Works on both Android Chrome and desktop Chrome; on iOS it shows a short message: "Tap the Share button and choose 'Add to Home Screen'"
- Add this component to `Layout.tsx`

---

## Summary

This plan makes the app fully installable as a PWA on Android, iOS, and desktop. The key design decision is a `StoreContext` that loads the store profile once at startup and feeds the store name and icon to the login page, sidebar, browser title, and install prompt — so everything stays in sync when the admin updates the store profile. The app icon defaults to a clean initial-letter avatar and is replaced by a proper uploaded icon when set. There is no offline caching — users simply see a clear "you are offline" message.
