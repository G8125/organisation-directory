# 4–6 Minute Video Walkthrough Script & Outline

This guide outlines exactly what to say and show during your 4–6 minute walkthrough video to maximize your score.

---

## ⏱️ Section 1: 30-Second Working App Demo (0:00 – 0:45)
* **What to screen share:** The live running web app on Vercel or localhost.
* **What to do:**
  1. Show the main table loading smoothly. Point out the total count: **137 organisations**.
  2. Type `"north"` into the search box: show the debounced search in action and notice how the URL changes to `?q=north`.
  3. Filter by status (e.g., `"Active"`): notice the URL updates to `?q=north&status=active`.
  4. Click table column headers: sort by **Name** and **Created Date** (show ascending and descending arrows).
  5. Click **"+ Add Organisation"**:
     - Type 1 character in Name and click out (blur): show the inline validation error.
     - Click **"Create Organisation"** with invalid fields: show the prominent **Error Summary Banner** at the top.
     - Enter valid data: name `"Acme Apex Ltd"`, status `"Active"`, email `"ops@acme.example"`, members `25`.
     - Click Submit: show the success toast notification and see the new record at the top of the table.

---

## ⏱️ Section 2: How You Resolved Both Conflicts & What You Gave Up (0:45 – 2:30)

### Conflict 1 (Ops Single Page vs API Rate Limit: 25 items/req, 5 req/min, 137 total)
* **What to say:**
  > *"The ops team wanted every organisation on one page without clicking pagination. But the API only returns 25 items per request and rate limits us to 5 requests per minute. 137 records requires 6 requests.*
  > *If you fetch all 6 requests at once, request 6 crashes with HTTP 429 Too Many Requests.*
  > *My solution was a progressive streaming buffer. We fetch page 1 immediately so ops sees records within 450ms. In the background, our engine streams pages 2, 3, 4, and 5 into the single scrollable table. When we hit the 5-request rate limit at item 125, the UI displays an honest status indicator with a countdown timer, letting ops search and sort the 125 loaded items. When the 60-second window resets, page 6 streams in automatically to complete all 137 records.*
  > *What did I give up? I gave up instantaneous cold-start access to records 126–137 within the first minute in exchange for zero pagination clicks and strict rate-limit compliance."*

### Conflict 2 (Designer Minimal Dot vs WCAG 1.4.1 Accessibility)
* **What to say:**
  > *"The designer wanted a colored dot only to keep the table clean. But WCAG Success Criterion 1.4.1 states that color must never be the only visual means of conveying information.*
  > *My solution was a multi-modal status badge. We kept the designer's 20-pixel compact dot footprint, but embedded distinct high-contrast geometric SVG icons inside: a checkmark for Active, a dash for Inactive, an exclamation mark for Suspended, and a question mark for Unknown. Colorblind users can visually distinguish them even on monochrome screens.*
  > *We also included tooltips, ARIA status roles, and an accessible toggle in the header where anyone can flip between 'Icon Dot' and 'Full Pill' mode.*
  > *What did I give up? We added 2 pixels of internal icon geometry inside the dot, but achieved full WCAG 2.1 AA compliance."*

---

## ⏱️ Section 3: The Single Messiest Thing in the Fixture Data & Handling (2:30 – 4:00)
* **What to say:**
  > *"The single messiest issue in the fixture was duplicate IDs—specifically ID 42 appearing twice with different names and statuses—combined with unparseable field types like null names, Unix epoch milliseconds vs ISO strings vs 'not a date', stringified numbers, and negative member counts.*
  > *In Angular, if you iterate with `@for (org of orgs; track org.id)` and there are duplicate IDs, Angular throws a fatal runtime exception (`NG0956 Duplicate identifier`).*
  > *To handle this, I created an explicit `OrganisationAdapter` sanitization layer. Before any raw API data touches component state, the adapter synthesizes unique UI keys (like `org_42_0` and `org_42_1`), normalizes casing and typos like 'actve' to 'active', safely parses timestamps, and flags anomalies in an audit list so the ops team has complete visibility into dirty data."*

---

## ⏱️ Section 4: What You Would Do Differently With 2 More Days (4:00 – 5:00)
* **What to say:**
  > *"With two more days, there are four key enhancements I would build:*
  > *1. Client-Side Persistent Cache: Store the 137 sanitized organisations in IndexedDB with a TTL, so ops only incurs the 5-request rate limit once per day.*
  > *2. Virtual Scrolling: Integrate Angular CDK Virtual Scroll (`cdk-virtual-scroll-viewport`) to support rendering 100,000+ rows with constant memory footprint and 60fps scrolling.*
  > *3. CSV / Excel Export: Allow ops to download filtered table views directly.*
  > *4. End-to-End Playwright Tests: Add automated tests verifying URL query parameter persistence and keyboard navigation."*

---

## ⏱️ Wrap-up (5:00 – 5:15)
* Conclude with:
  > *"Thank you for your time. All decisions are documented in `DECISIONS.md`, and the full commit history is available in the repository."*
