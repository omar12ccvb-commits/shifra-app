# SHIFRA — Customer / Marketer / Editor App (Phase 2, part 2)

One app, three roles. Signs up, logs in, and adapts its navigation and the
actions available on a project entirely based on who's logged in — the
backend already enforces who can do what, so this app doesn't duplicate
that logic, it just reflects it (spec #69, "ONE BACKEND, SAME BUSINESS
LOGIC"). Every screen is a live call to your real backend.

## How to run it

1. Start the Phase-1 backend (`npm start` in `shifra-backend/`).
2. Open `index.html` (double-click, or `npx serve .`).
3. Sign up as a Customer, Marketer, or Editor — or log in with an existing
   account. If your backend isn't on `http://localhost:4000`, expand
   "إعدادات متقدمة" on the login/signup screen first.
4. A referral link looks like `index.html?ref=THEIR-CODE` — opening one
   auto-switches to the signup tab with the code pre-filled and the role
   set to Customer (spec #10-A, external acquisition).

## What each role sees

- **Customer** — their projects, and whatever action the project's current
  status calls for: respond to a price (accept/negotiate/reject), upload a
  Vodafone Cash payment proof, request a revision, or give final approval.
- **Marketer** — the open opportunity pool (claim a client), their own
  customers, their projects (create new ones, propose a price, lock it,
  kick off the payment request), and an earnings view with their referral
  code front and center.
- **Editor** — assigned projects with the right action for each stage
  (start production → preview ready → deliver), open revisions to resolve,
  and their own earnings.

Every project detail screen is the same underlying view for all three
roles; it just shows different buttons depending on your role and the
project's current status, so nobody ever sees an action they're not
allowed to take.

## Notifications

The 🔔 next to the page title is real — it fires on every transition that
actually needs someone's attention (a price proposed, a payment confirmed
or rejected, an editor assigned, a preview ready, a revision requested or
resolved, final approval, delivery). Tap it to see the feed; tap a
notification to jump straight to the project it's about.

## Real bugs this caught before shipping (so you know the testing was real)

- A route-ordering bug where `/customers/me` was silently swallowed by
  `/customers/:id` (Express matched `me` as if it were an id and Postgres
  rejected it) — found by actually calling the endpoint, not by inspection.
- A CSS/JS conflict where logging in would have force-shown the desktop
  sidebar on phone screens, because a JS line set an inline style that
  overrides the responsive media query.
- The above fix, done carelessly, would have left the mobile bottom nav
  *also* rendering underneath the page on desktop. Caught on the same
  review pass before it shipped.
- The project-earnings endpoint originally returned every stakeholder's
  cut to anyone attached to the project — meaning a marketer could see the
  editor's and owners' share, and vice versa. Restricted server-side so
  each role only ever sees its own line, before this app started
  displaying it anywhere.

## Notes

- Session token lives in memory only — refreshing logs you out.
- A customer's `POST /projects` (self-service project creation) does not
  exist yet; today only a Marketer/Admin/Owner can create a project for a
  customer they own. Spec §15 does suggest a customer might eventually
  create their own — that's a reasonable Phase 3 addition, not something
  silently assumed here.

## Still not built

The Owner-only pieces (already covered by the separate Owner Console),
notifications actually pushing to a device, device pairing, and any real
deployment.
