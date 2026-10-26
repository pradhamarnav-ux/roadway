# RoadWise AI: 12-Step Live Demo Walkthrough
**Problem Statement #13: Coordinating Road Repairs Across a City**

> **Notice to Evaluators**: All records used in this live demo are synthetic benchmark data created for demonstration and testing purposes. Seeded demo accounts have active passwords and 1-click login buttons on the sign-in page.

---

## Demo Credentials Quick Reference

| System Role | Email | Password | Persona & Key Permissions |
| :--- | :--- | :--- | :--- |
| 🚗 **Citizen** | `citizen@roadwise.ai` | `Citizen@123` | Aarav Sharma (Reports hazards/accidents, earns civic rewards, browses perks) |
| 🏛️ **City Admin** | `admin@roadwise.ai` | `Admin@123` | Chief Engineer Priya Patel (Triage, duplicate resolution, optimizer, work orders) |
| 🔍 **Field Inspector**| `inspector@roadwise.ai`| `Inspector@123` | Inspector Vikram Singh (On-site inspections, evidence photo upload, verification) |
| 🚗 **Citizen 2** | `ananya.sen@example.com`| `Citizen@123` | Ananya Sen (High balance champion: 210 pts, Community Legend badge) |
| 🚗 **Citizen 3** | `vikas.yadav@example.com`| `Citizen@123` | Vikas Yadav (Demonstrates Leaderboard Opt-Out privacy preservation) |

---

## 12-Step Live Demo Script

```
   CITIZEN REPORTING & TRACKING               MUNICIPAL COMMAND & OPTIMIZATION             FIELD WORKFLOW & REWARDS
+------------------------------------+    +--------------------------------------+    +------------------------------------+
| Step 1: Citizen Sign-In            |    | Step 5: Admin Command Center         |    | Step 11: 7-Stage Repair Workflow   |
| Step 2: Citizen Hazard Reporting   | -> | Step 6: Verification Queue Triage    | -> |          (Schedule, Dispatch,      |
| Step 3: Accident Evidence Report   |    | Step 7: Duplicate Merge & Grouping   |    |          Inspection Photo, Close)  |
| Step 4: Citizen Ticket Audit Trail |    | Step 8: Accident Attribution Review  |    | Step 12: Civic Rewards Hub         |
+------------------------------------+    | Step 9: Priority Scoring (73.75 Case)|    |          (Wallet, Badges, Store,   |
                                          | Step 10: 0/1 Knapsack Optimizer      |    |           Leaderboard Privacy)     |
                                          +--------------------------------------+    +------------------------------------+
```

---

### Step 1: Citizen Sign-In & Dashboard Overview
- **URL**: `http://localhost:5173/login`
- **Credentials**: `citizen@roadwise.ai` / `Citizen@123` (or click **"Citizen (Aarav)"** Quick Demo button)
- **Target Page**: `http://localhost:5173/` (Citizen Dashboard)
- **What to Observe**:
  - Top navigation displays the **Citizen** role pill and real-time **Civic Balance** pill.
  - Dashboard presents quick action cards: *Report Road Hazard*, *Report Vehicle Accident*, *Track My Reports*, and *RoadWise Rewards Hub*.
  - Live RBAC widget demonstrates authorized citizen operations vs blocked administrative routes.

---

### Step 2: Citizen Road Hazard Reporting with Photo & Geolocation
- **URL**: `http://localhost:5173/report-hazard`
- **Action**:
  1. Select Damage Type: **Pothole**
  2. Select Severity: **Critical (>7cm deep / exposed base)**
  3. Enter Description: `Large crater in center lane near flyover approach with exposed aggregate.`
  4. Location: Click **"Use My Current Location"** (or drag the custom SVG map pin on the Leaflet map).
  5. Photo Upload: Upload an image file (e.g. `pothole.jpg` from sample assets).
  6. Click **"Submit Hazard Report"**.
- **Expected Result**:
  - Modal confirmation displays a newly minted public tracking ticket ID (e.g. `RW-2026-9041`).
  - Initial status is strictly set to `UNVERIFIED` (honest evidence constraint).
  - EXIF metadata is extracted and consistency checks are logged.

---

### Step 3: Citizen Vehicular Accident Evidence Reporting
- **URL**: `http://localhost:5173/report-accident`
- **Action**:
  1. Select Defect Location: Search or pick an existing hazard pin on the map.
  2. Vehicle Type: **Motorcycle**
  3. Injury Severity: **Minor (First aid administered on-scene)**
  4. Number of Injuries: `1`
  5. Police FIR / Incident Reference: `FIR-2026-DEL-9102`
  6. Notes: `Motorcycle struck submerged pothole lip during rain; rider lost balance.`
  7. Click **"Submit Accident Evidence"**.
- **Expected Result**:
  - Accident logged with status `UNVERIFIED` and default attribution tier `NEARBY_ACCIDENT` or `SUSPECTED_CONTRIBUTION`.
  - **Notice**: **Zero reward points credited**. Accidents never pay rewards, eliminating perverse incentives to stage or encourage traffic collisions.

---

### Step 4: Citizen Ticket Timeline & Audit Trail
- **URL**: `http://localhost:5173/my-reports`
- **Action**:
  1. Click on the newly submitted ticket or an existing report in the list.
  2. Opens `http://localhost:5173/reports/:id`.
- **What to Observe**:
  - Full transparent evidence audit breakdown: Device GPS distance delta, camera EXIF match, independent corroboration count.
  - Interactive Leaflet map displaying the reported pin and proximity buffer.
  - Live 7-stage lifecycle tracker showing current progress (e.g. `REPORTED`).

---

### Step 5: City Administrator Sign-In & Command Center
- **Action**: Click profile avatar in header -> **Sign Out**. Sign in as `admin@roadwise.ai` / `Admin@123` (or click **"Admin (Chief Priya)"** Quick Demo button).
- **Target Page**: `http://localhost:5173/` (Admin Dashboard)
- **What to Observe**:
  - Municipal Command Center displays real-time citywide triage metrics:
    - Total Tracked Defects, Active Work Orders, Closed Repairs.
    - Total Estimated vs Completed Municipal Spend ($ USD).
    - Emergency Safety Escalations Counter.
  - Quick-navigation cards for *Interactive City Map*, *Verification Queue*, *Duplicate Review*, *Accident Attribution*, and *Budget Optimization*.

---

### Step 6: Verification Queue & Location Evidence Audit
- **URL**: `http://localhost:5173/admin/verification`
- **Action**:
  1. Inspect the triage queue tabs: *All*, *Unverified*, *Needs Inspection*, *Corroborated*, *Location Mismatches*.
  2. Locate an unverified report (e.g. `REP-2026-RAW-28` or citizen's new report).
  3. Review the Explainable Consistency Score (0–100) and evidence breakdown checklist.
  4. Click **"Verify Defect"** (Promotes to `INSPECTOR_VERIFIED` with score 100).
- **Expected Result**:
  - Report status transitions to `INSPECTOR_VERIFIED`.
  - Backend automatically triggers reward crediting (+50 pts first report, +20 pts EXIF) for the citizen reporter.

---

### Step 7: Spatial Duplicate Detection & Defect Consolidation
- **URL**: `http://localhost:5173/admin/duplicates`
- **Action**:
  1. View detected duplicate candidate pairs within 30-meter radius buffer.
  2. Review the Duplicate Confidence Score (e.g. 88%): distance delta (12m), matching damage type (`pothole`), and Jaccard description text similarity.
  3. Click **"Consolidate into Unified Issue"**.
- **Expected Result**:
  - Secondary report is merged into the parent `RoadIssue`.
  - Complaint count increments; secondary citizen receives corroboration reward points.

---

### Step 8: Accident Attribution Evidence Calibration
- **URL**: `http://localhost:5173/admin/accidents`
- **Action**:
  1. Inspect the 4 attribution tabs: *Nearby (Unattributed)*, *Suspected*, *Documented*, *Confirmed*.
  2. Select an accident under review (e.g. `ACC-2026-SUSP-04`).
  3. Review police incident notes and injury logs.
  4. Elevate attribution tier to **"Documented Contribution"** with status **"Verified"**.
  5. Click **"Save Attribution Calibration"**.
- **Expected Result**:
  - Defect's accident safety risk score dynamically updates.
  - Strict Rule Verified: Nearby accidents are **never** counted as pothole-caused.

---

### Step 9: Explainable Priority Scoring & 73.75 Calibration Case
- **URL**: `http://localhost:5173/admin/priority`
- **Action**:
  1. Inspect the 6 normalized criteria breakdown:
     - Defect Severity ($S \times 0.25$)
     - Road Hierarchy / Traffic ($T \times 0.20$)
     - Accident & Safety Risk ($A \times 0.15$)
     - Public Complaint Density & Age ($C \times 0.25$)
     - Repair Cost Efficiency ($E \times 0.10$)
     - Weather / Seasonal Vulnerability ($W \times 0.05$)
  2. Click **"Load Spec Benchmark Calibration Case"**:
     - Values: $S=75, T=75, A=70, C=68, E=80, W=90$.
     - Expected Output: **Calculates EXACTLY 73.75**.
  3. Observe the Emergency Safety Escalation Override banner on arterial highway craters.

---

### Step 10: 0/1 Knapsack Budget Optimization Simulation
- **URL**: `http://localhost:5173/admin/optimization`
- **Action**:
  1. Set the Municipal Repair Budget input to `$25,000`.
  2. Click **"Run Optimization Analysis"**.
  3. Compare the 4 algorithmic repair plans:
     - **RoadWise Optimal Knapsack (DP)**: Maximizes Modeled Priority Benefit.
     - **First-Come First-Served (FCFS)**: Chronological baseline.
     - **Highest Complaints First**: Squeaky-wheel popularity baseline.
     - **Highest Priority First (Greedy)**: Pure priority descending.
  4. Verify the comparison metrics: Total Spend, Budget Utilization (%), Modeled Benefit, and Unaddressed High-Risk Defects.
  5. Test Infeasibility Warning: Set budget to `$5,000` (below mandatory safety defects cost) and observe the red **Insufficient Budget Warning** and exact deficit amount.

---

### Step 11: 7-Stage Repair Lifecycle Workflow
- **URL**: `http://localhost:5173/admin/repairs`
- **Action**:
  1. Select a verified defect (e.g. `ISSUE-2026-CRIT-01`).
  2. **Stage 1 (Schedule)**: Click "Approve & Schedule Work Order". Generates work order number `WO-2026-XXXX`.
  3. **Stage 2 (Assign)**: Select `CREW-ALPHA: Central Rapid Asphalt Crew` and assign Inspector Vikram Singh. Click "Dispatch Crew".
  4. **Stage 3 (In Progress)**: Click "Initiate Active Roadwork". Status changes to `IN_PROGRESS`.
  5. **Stage 4 (Inspection Evidence)**: Sign out and sign in as `inspector@roadwise.ai` / `Inspector@123`. Navigate to `http://localhost:5173/inspector/console`. Upload completion photo and enter density compaction notes. Click "Submit Evidence" -> Status: `INSPECTED`.
  6. **Stage 5 (Close)**: Sign back in as Admin. Review inspector evidence and click "Close & Sign Off Work Order" -> Status: `CLOSED`.

---

### Step 12: RoadWise Rewards Hub, Atomic Perk Redemption & Leaderboard Privacy
- **URL**: Sign in as `citizen@roadwise.ai` / `Citizen@123` and open `http://localhost:5173/rewards`.
- **Action**:
  1. **Tab 1: Civic Wallet & Badges**:
     - View updated balance, lifetime earned points, and unlocked badges (`CIVIC_SCOUT`, `EAGLE_EYE`, `POTHOLE_HUNTER`).
     - Review the complete append-only ledger transaction history with SHA-256 idempotency keys.
  2. **Tab 2: Simulated Perks Store**:
     - Browse municipal perks (City Transit Pass, Parking Waiver, Sports Pass, Tree Dedication).
     - Click **"Redeem Perk"** on *City Transit Day Pass* (100 pts).
     - Observe atomic deduction, receipt modal, and demo voucher code (`RW-DEMO-XXXX-XXXX`).
     - Try redeeming another high-cost perk to observe the **Negative Balance Prevention** guard (HTTP 400).
  3. **Tab 3: Top-100 Leaderboard**:
     - View ranked civic champions.
     - Enable **"Display Anonymous Alias"** (e.g. `EcoRider_Delhi`) and click Save. Notice real name is instantly shielded on public board.
     - Enable **"Opt Out of Leaderboard"** and click Save. Verify user disappears from public rankings while retaining 100% of wallet points and badges.

---

## 13. Summary of Expected Outcomes

| Step | Area | Key Verification Point | Expected Status |
| :-: | :--- | :--- | :-: |
| 1 | RBAC | Role-based dashboard and header balance pill | ✅ Verified |
| 2 | Ingestion | Photo required, EXIF extracted, ticket generated | ✅ Verified |
| 3 | Safety | Accident logged with 0 reward points credited | ✅ Verified |
| 4 | Audit | Full timeline, map coordinates, EXIF notes | ✅ Verified |
| 5 | Command | Citywide metrics, safety overrides counter | ✅ Verified |
| 6 | Verification | Multi-factor consistency check, points awarded | ✅ Verified |
| 7 | Clustering | Duplicate confidence >= 80%, consolidation | ✅ Verified |
| 8 | Attribution | 4 tiers, nearby accident != pothole caused | ✅ Verified |
| 9 | Algorithm | Spec benchmark case gives exactly 73.75 | ✅ Verified |
| 10 | Optimization | Optimal Knapsack DP vs 3 heuristic baselines | ✅ Verified |
| 11 | Lifecycle | 7-stage state machine from REPORTED to CLOSED | ✅ Verified |
| 12 | Rewards | Append-only ledger, atomic store, alias privacy | ✅ Verified |
