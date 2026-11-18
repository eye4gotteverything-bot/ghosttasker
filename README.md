# GhosŧŦasker

GhosŧŦasker (`ghosttasker`) helps you prepare and send the group texts you send every week, without retyping them.

Create a group of up to 100 numbers, save the messages you reuse as templates, and queue a blast in a few taps. Set weekly automations for the days and times you always send, and let the local AI bot draft the next message in your voice from your own templates and sent history — you review every draft before it goes out.

This is a plain, dependency-free web version: `index.html` + `styles.css` + `app.js`. No build step, no server, no external APIs.

## What it does

- **Groups** — create groups, add numbers one by one or by bulk-pasting a list. Duplicates are skipped. Hard cap: 100 numbers per group.
- **Templates** — save reusable messages, with `{name}` personalization per recipient.
- **Send Queue** — compose a blast to a group, see a per-person preview with `{name}` filled in, then hand off to your linked app to send.
- **Weekly automations** — pick days, a time, a group and a template. The automation queues that day's blast for your review; it never sends by itself.
- **AI Bot** — a local draft helper (no external AI service, no API key) that suggests a draft from your own templates and sent history stored in your browser, and shows what it based the suggestion on.
- **Apps** — link one approved Android app (see below). Sending stays off until you link and approve one specific app.
- **Plans** — Basic free; Premium unlimited with a 3-day free trial (see pricing below).

## How sending works

GhosŧŦasker does **not** send messages in the background and does not auto-send.

1. In the **Apps** tab, select **one** specific app you approve: regular SMS / Messages, Google Messages, Samsung Messages, WhatsApp, Messenger, Telegram, Signal, or a custom Android app by name (and optional package name).
2. Tick the approval box. Until both steps are done, sending stays **OFF**.
3. In the **Send Queue**, compose your blast and preview it per person.
4. Tap send: GhosŧŦasker opens your linked app (an `sms:` handoff for SMS / Messages) with the recipients and message filled in — **you tap send in that app**.
5. Unlinking the app in the Apps tab turns sending off again.

The app starts in its launched state: **unlinked, sending off**.

Only message people who have agreed to receive your texts, and include a way for them to opt out (for example, "Reply STOP to opt out").

## Plans

| Plan | Price | Notes |
| --- | ---: | --- |
| Basic | Free | Limited use |
| Premium — Weekly | $5.99 / week | Unlimited, after a 3-day free trial |
| Premium — Monthly | $19.99 / month | Unlimited, after a 3-day free trial |
| Premium — Annual | $149.99 / year | Unlimited, after a 3-day free trial — **Best Value** |

Premium starts with a **3-day free trial**. After the trial, the price you chose **auto-charges unless you cancel before the trial ends**. Subscriptions are managed and cancelled in Google Play.

On Android, Premium subscriptions run through **Google Play Billing**. This web version only displays the pricing — it does not collect card details and does not start a real subscription.

## Run it locally

No install or build step needed.

- **Simplest:** open `index.html` in a browser (double-click the file).
- **Or serve the folder** with any static server, for example:

  ```sh
  python3 -m http.server 8000
  # then open http://localhost:8000 in your browser
  ```

Your groups, templates, automations and history are saved in that browser's `localStorage` and stay on your device.

## Upload to GitHub

This folder is the repo-ready version for `eye4gotteverything-bot/ghosttasker`:

1. Create (or open) the public repository `ghosttasker` on GitHub.
2. Upload these files, keeping the names exactly: `index.html`, `styles.css`, `app.js`, `README.md`, `PRIVACY.md`, `LICENSE`, `.gitignore`.
3. Commit on a branch and open a pull request — do not push testing changes straight to `main`. Changes made while testing should be reviewed and approved before they go live.

GitHub Pages can host these files as a simple web page, but note that each visitor's data lives in their own browser only.

## Privacy

See [PRIVACY.md](PRIVACY.md). In short: everything you enter stays in your browser's local storage, there is no server and no tracking, and the only time a message leaves the app is when you tap send and hand it to your linked app. You can delete all stored data at any time with the "Delete all my GhosŧŦasker data" button in the footer, and unlink your app in the Apps tab.

## Android / Google Play note

This web version is **not** directly submittable to Google Play. A Play release needs:

- A rebuild / wrap as a native Android project, packaged as an **Android App Bundle (`.aab`)**, signed with a Play upload key, and tested on a real Android phone.
- Premium subscriptions implemented with **Google Play Billing** (product IDs such as `premium_weekly`, `premium_monthly`, `premium_annual`), with the 3-day free trial and auto-charge / cancel wording shown before purchase.
- A hosted privacy policy URL, a completed Data Safety form and content rating in Play Console, and store graphics/screenshots with no real phone numbers visible.
- Keep the linked-app handoff design: do not add silent background auto-sending, and do not request direct SMS permissions — an app generally must be the default SMS/Phone/Assistant handler to hold those, and background bulk sending is likely to be rejected by Play and flagged by carriers as spam.
- If the Play developer account is a new personal account, Google requires a closed test (at least 12 testers opted in for 14 days) before production access.

## License

MIT — see [LICENSE](LICENSE).
