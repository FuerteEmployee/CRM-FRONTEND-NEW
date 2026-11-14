# Change Log (Testing & Fixes)

નવા ફેરફાર ઉપર (latest first) ઉમેરવાના. દરેક entry: તારીખ, module, શું બદલ્યું, કઈ ફાઇલ.

---

## 2026-11-14

### 1. Dashboard — "Start Demo Tour" (multi-module tour)
- Dashboard પરના એક જ બટનથી બધા modules નો tour ચાલે છે: Customers → Leads → Invoices → Estimates → Proposals → Quotations → Tasks → HRMS.
- દરેક user માટે પહેલી વાર login પર tour આપમેળે શરૂ થાય છે (એક જ વાર; localStorage `demo_tour_seen:*`).
- દરેક પેજ પરના અલગ tour બટન કાઢી નાખ્યા.
- Files: `src/pages/Dashboard.tsx`, `src/components/shared/PageTourButton.tsx`, `src/components/shared/tourSteps.ts`, `src/App.tsx` (`TourContinuation`)

### 2. Header (`#tour-topnav`) — Search box + Mic
- Mic WhatsApp-style: બંધ = ગ્રે, ચાલુ = લાલ ગોળ બટન + ping animation, placeholder "Listening… speak now".
- બોલો → module નું નામ search box માં લખાય (live interim text).
- નીચે related modules નું dropdown (ફક્ત module નું નામ; "Enter ↵" લખાણ કાઢ્યું).
  - દા.ત. "sales" → Leads, Estimates, Proposals, Credit Notes, Purchases.
- Enter દબાવો (પહેલું module ખુલે) અથવા module પર click કરો → પેજ ખુલે. Esc → clear.
- કંઈ સંભળાય નહીં તો toast: "Didn't catch that — tap the mic and try again."
- Mic ચાલુ હોય ત્યારે FuerteAI wake-word થોભે છે (Chrome માં એક જ recognition ચાલે).
- Files: `src/components/layout/TopNavbar.tsx`, `src/lib/voiceCommands.ts` (`suggestCommands`), `src/lib/dictation.ts` (`onInterim`, `onFinish`)

### 3. Header — નાના ફેરફાર
- + બટન, bell, "More actions", profile પર title / aria-label ઉમેર્યા.

### 4. Mic bug (root cause)
- Logs માં `audiostart` આવતું પણ `soundstart` નહીં → Windows/Chrome mic input માં અવાજ આવતો ન હતો.
- Fix: Chrome mic = Microphone Array (Realtek), Windows input volume 90–100, enhancements બંધ, Privacy → Microphone ચાલુ.
