# RoadWise AI: Complete Product Specification
**Problem Statement #13: Coordinating Road Repairs Across a City**
**Target Stack: MERN (MongoDB + Express + React + Node.js) with Vite, Tailwind CSS, and Leaflet**

---

## 1. Executive Summary & Problem Context
Municipal road maintenance departments struggle with fragmented citizen reports, duplicate complaint floods after heavy rains, unverified location claims, difficulty attributing vehicular accidents to road defects, and sub-optimal budget allocation.
**RoadWise AI** is an intelligent, auditable civic road infrastructure coordination platform that connects citizens, field inspectors, and municipal city administrators. It unifies:
1. Citizen road damage reporting with multi-factor location verification (GPS, EXIF, road proximity).
2. Spatial duplicate detection linking multiple citizen complaints to a single ground-truth road defect.
3. Principled vehicular accident evidence tracking with strict attribution levels.
4. Explainable multi-criteria priority scoring with emergency safety overrides.
5. Algorithmic budget repair plan optimization (0/1 Knapsack formulation comparing against baseline heuristics).
6. Complete repair lifecycle workflow from triage to field inspection and closure.
7. Fraud-resistant civic gamification with an idempotent append-only reward ledger.

---

## 2. Safety & Honesty Constraints
1. **Reported Location != Verified Location**: Device GPS reported by a browser or mobile device is treated as raw claim until corroborated.
2. **Nearby Accident != Pothole-Caused Accident**: Co-location in space/time does not imply causation. Attribution requires formal tiers.
3. **Evidence Score is Explainable**: Not an opaque black-box probability; all factors and passed/failed checks are exposed.
4. **Modeled Benefit**: Optimization metric is explicitly labelled "Modeled Priority Benefit", never "Lives Saved".
5. **Simulated Rewards**: Non-monetary civic perks; no real financial value; strictly anti-abuse.
6. **Synthetic Seed Data**: All seed incidents, citizens, and defects are clearly labelled as synthetic.
7. **Rule-Based Algorithms**: Rule-based logic is explicitly identified as rule-based, never misrepresented as deep learning.

---

## 3. User Roles and Permissions
1. **Citizen (`citizen`)**:
   - Submit road defect complaints with photo and location.
   - Report vehicle accidents associated with road defects.
   - Track submitted reports in "My Reports".
   - Earn civic reward points upon verified admin decisions.
   - View civic wallet, badges, simulated perks store, and community leaderboard (with alias/opt-out).
2. **Field Inspector (`inspector`)**:
   - View assigned inspection tasks across the city.
   - Perform on-site field verification (confirm damage depth, type, exact coordinates).
   - Submit inspection reports and post-repair completion evidence (photos, notes).
3. **City Administrator / Engineer (`admin`)**:
   - Access comprehensive municipal dashboard and interactive GIS map.
   - Review unverified reports in the Verification Queue.
   - Resolve suspected duplicate complaints into unified road issues.
   - Review and calibrate accident attribution levels.
   - Run budget optimization simulations (Knapsack vs FCFS vs Priority vs Complaint Count).
   - Assign work orders to repair teams and approve repair milestones.

---

## 4. Citizen Damage Reporting & Evidence Ingestion
- **Damage Types**: Pothole, Severe Crack, Road Depression / Rutting, Manhole Collapse, Erosion / Edge Failure.
- **Severity Levels**: Low (Minor surface wear), Medium (Moderate depth < 3cm), High (Significant hazard 3-7cm), Critical (Severe structural failure > 7cm).
- **Location Capture**:
  - Browser Geolocation API (`navigator.geolocation`) with accuracy radius.
  - Interactive draggable Leaflet map pin with reverse-geocoded road name / address.
  - Manual address text input fallback.
- **Media Ingestion**:
  - Max photo size: 5MB.
  - Allowed MIME types: image/jpeg, image/png, image/webp.
  - Randomized UUID file naming with path traversal defenses.
  - EXIF GPS metadata extraction (latitude, longitude, timestamp) to compare with user-claimed coordinates.
- **Initial Status**: `UNVERIFIED`. Unique public tracking ticket ID (e.g. `RW-2026-XXXX`).

---

## 5. Location Verification & Evidence Consistency
- **Verification Engine**: Evaluates 5 independent signals:
  1. *Device vs. Reported Pin Distance*: Distance between browser GPS and manual map pin. Delta < 30m: High, < 100m: Medium, > 100m: Flagged mismatch.
  2. *Photo EXIF Metadata Check*: EXIF GPS coordinates match pin within 50m.
  3. *Road Network Proximity*: Checks whether coordinates fall on or adjacent to municipal road network buffer.
  4. *Independent Corroboration*: Multiple distinct citizen accounts reporting within a 30m radius within 7 days.
  5. *On-site Field Inspection*: Official inspector verification stamp.
- **Explainable Evidence Consistency Score (0–100)**:
  - Base starting score = 40.
  - EXIF GPS match = +25.
  - Low device-pin discrepancy (<30m) = +15.
  - Corroborating nearby reports = +10.
  - Inspector verified = +10 (or direct override to 100).
  - EXIF mismatch or extreme distance (>200m) = -30.
- **Statuses**:
  - `UNVERIFIED`: Freshly submitted.
  - `CORROBORATED`: Passed GPS/EXIF and/or multi-user corroboration.
  - `LOCATION_MISMATCH`: Significant discrepancy detected between EXIF, GPS, and pin.
  - `NEEDS_INSPECTION`: Moderate ambiguity requiring field inspector check.
  - `INSPECTOR_VERIFIED`: Confirmed on-site by certified inspector.
  - `REJECTED`: Verified fraudulent, duplicate, or out of municipal jurisdiction.

---

## 6. Spatial Duplicate Detection & Issue Grouping
- **Core Principle**: Multiple citizen reports (`Complaint`) link to one ground-truth defect (`RoadIssue`).
- **Detection Pipeline**:
  - Geospatial radius query: 30-meter buffer (`$nearSphere` / `$geoWithin` with `2dsphere` index).
  - Damage Type Match: Same defect category (+35%).
  - Text Similarity: Levenshtein / Token cosine similarity on citizen descriptions (+25%).
  - Temporal Proximity: Complaints filed within 14 days (+15%).
  - Distance Proximity: Decay score from 0m (100%) to 30m (0%) (+25%).
- **Duplicate Confidence Score (0–100%)**:
  - `>= 80%`: Auto-flagged as High-Confidence Duplicate (suggest auto-link).
  - `50% - 79%`: Flagged for Admin Duplicate Review queue.
  - `< 50%`: Considered distinct defect.
- **Data Model**:
  - Parent: `RoadIssue` (contains aggregated counts, computed priority, assigned repair team, budget, status).
  - Child: `Report` (individual citizen submissions with user ID, photo, raw location, EXIF, status).

---

## 7. Accident Tracking & Attribution
- **Ethical Guideline**: A nearby accident is never assumed to be caused by a pothole.
- **Attribution Tiers**:
  1. `NEARBY_ACCIDENT`: Happened within 50m radius of defect within 30 days, but no recorded link.
  2. `SUSPECTED_CONTRIBUTION`: Citizen or police incident report notes swerving/braking near defect.
  3. `DOCUMENTED_CONTRIBUTION`: Formal police or paramedic report notes road surface defect as contributing factor.
  4. `CONFIRMED_CONTRIBUTION`: Municipal engineering investigation confirms defect was a primary or secondary cause.
- **Accident Metrics per Road Issue**:
  - `nearbyAccidentCount`: Total accidents within 50m.
  - `suspectedCount`: Number under suspected attribution.
  - `documentedCount`: Number supported by incident records.
  - `confirmedCount`: Officially validated.
  - `totalInjuriesCount`: Cumulative human injuries across attributed accidents.
- **Admin Evidence Review**: City admins can inspect accident police logs, interview transcripts, and update the attribution tier.

---

## 8. Explainable Priority Scoring Algorithm
Priority Score $P \in [0, 100]$ is a weighted linear composite of 6 normalized criteria:

$$P = 0.25 \cdot S + 0.20 \cdot T + 0.15 \cdot A + 0.25 \cdot C + 0.10 \cdot E + 0.05 \cdot W$$

1. **Defect Severity ($S \in [0, 100]$)**:
   - Low: 25, Medium: 50, High: 75, Critical: 100.
2. **Road Hierarchy / Traffic ($T \in [0, 100]$)**:
   - Residential: 25, Collector: 50, Arterial: 75, Major Highway / Transit Corridor: 100.
3. **Accident & Safety Risk ($A \in [0, 100]$)**:
   - Base = 10 (zero accidents does NOT mean zero safety risk!).
   - Suspected accidents $\times 15$, Documented $\times 25$, Confirmed $\times 40$, Injuries $\times 20$ (capped at 100).
4. **Public Complaint Density & Age ($C \in [0, 100]$)**:
   - Report count (log scale: 1 report = 20, 5 reports = 60, 10+ reports = 90) + Days unresolved ($\times 1.5$/day, capped at 100).
5. **Repair Cost Efficiency ($E \in [0, 100]$)**:
   - Inverse normalized cost (Lower repair cost per affected commuter = higher efficiency score).
6. **Weather / Season Vulnerability ($W \in [0, 100]$)**:
   - Monsoon / freeze-thaw risk factor based on regional seasonal index (0 to 100).

- **Benchmark Calibration Case**:
  - Severity High ($S=75$), Arterial Road ($T=75$), Documented Accident + 1 Injury ($A=70$), 4 Reports open 5 days ($C=65$), Moderate Cost ($E=80$), Monsoon ($W=90$):
  - $0.25(75) + 0.20(75) + 0.15(70) + 0.25(65) + 0.10(80) + 0.05(90) = 18.75 + 15.00 + 10.50 + 16.25 + 8.00 + 4.50 = 73.00$.
  - Spec Benchmark Example: Verified exactly as tuned in algorithm module.
- **Safety Escalation Override**:
  - If Severity == `Critical` AND Road == `Arterial`/`Highway`, or Confirmed Accidents $> 0$, the issue is automatically flagged as `SAFETY_OVERRIDE_URGENT` regardless of total score, triggering mandatory inspection dispatch within 24 hours.

---

## 9. Repair Plan Budget Optimization
- **Problem Formulation**: 0/1 Knapsack optimization problem:
  $$\max \sum_{i \in \text{Verified}} \text{Benefit}_i \cdot x_i \quad \text{subject to} \quad \sum_{i \in \text{Verified}} \text{Cost}_i \cdot x_i \le B, \quad x_i \in \{0, 1\}$$
  Where $\text{Benefit}_i = P_i \times \text{TrafficMultiplier}_i$.
- **Mandatory Constraints**:
  - Issues flagged with `SAFETY_OVERRIDE_URGENT` MUST have $x_i = 1$.
  - If total cost of mandatory issues exceeds budget $B$, trigger an Infeasible Budget Warning with emergency deficit requirement.
- **Comparison Heuristics**:
  1. *RoadWise Knapsack (Optimal)*: Exact DP / branch-and-bound knapsack maximizing modeled priority benefit.
  2. *First-Come First-Served (FCFS)*: Oldest reported issues repaired first until budget exhausted.
  3. *Highest Complaints First*: Popularity-based repair (most citizen complaints).
  4. *Highest Priority First (Greedy)*: Selects strictly descending priority score without cost-density consideration.
- **Dashboard UI**:
  - Budget input slider / input ($ USD).
  - Comparison table / charts showing Total Spend, Budget Utilization (%), Total Modeled Benefit, Issues Repaired, and Unaddressed High-Risk Defects.

---

## 10. Interactive City Map & GIS Visualizations
- Built with React Leaflet and OpenStreetMap.
- Dynamic markers:
  - Color-coded by Priority: Red (Critical > 80), Orange (High 60-80), Yellow (Medium 40-60), Blue (Low < 40), Green (Repaired / Closed).
  - Pulsing aura for `SAFETY_OVERRIDE_URGENT` defects.
  - Hollow circle for `UNVERIFIED` raw citizen complaints.
- Interactive popups displaying Defect Type, Issue ID, Priority Breakdown, Verified Status, Attributed Accidents, Estimated Cost, and Quick Actions.
- Map Filters: Priority Level, Damage Type, Verification Status, Repair Lifecycle Status, Date Range.

---

## 11. Repair Lifecycle Workflow
1. `REPORTED`: Citizen submits report.
2. `VERIFIED`: Location and defect verified, linked to `RoadIssue`.
3. `SCHEDULED`: Repair plan optimized, budget allocated, work order created.
4. `ASSIGNED`: Dispatched to specific municipal repair team.
5. `IN_PROGRESS`: Repair crew on-site, repair active.
6. `INSPECTED`: Field inspector inspects completed work with photo evidence.
7. `CLOSED`: Work order signed off, citizen reporters notified.

---

## 12. Civic Gamification & Reward Ledger
- **Anti-Abuse Ledger**:
  - Append-only `RewardLedger` collection.
  - Unique idempotency key: `HASH(user_id, report_id, action_type)` preventing double payouts.
  - Points awarded ONLY upon admin/inspector verification, NEVER at raw report submission time.
  - Zero points for rejected complaints, duplicates, or accident reports (to avoid tragic incentives).
- **Point Values**:
  - First valid report of new defect: 50 points.
  - Quality photo with valid EXIF match: +20 points.
  - Follow-up corroboration: 15 points.
- **Wallet & Perks**:
  - Points balance, transaction history ledger.
  - Community Badges: "Civic Scout", "Pothole Hunter", "Neighborhood Guardian".
  - Simulated Rewards Store: Transit pass discount voucher, municipal parking credits, community center pass.
  - Demo redemption codes generated atomically with transaction locks.
- **Leaderboard**:
  - Monthly Top 5 civic champions.
  - Privacy safeguards: Anonymous alias toggle or complete opt-out.

---

## 13. System Architecture & Tech Stack (MERN)
- **Backend**:
  - Node.js (v24+) + Express.js REST API.
  - Database: MongoDB via Mongoose with `2dsphere` spatial indexing (with auto-fallback to embedded `mongodb-memory-server` if external Mongo is absent).
  - Authentication: JWT (JSON Web Tokens) in Bearer header + bcrypt password hashing.
  - Geospatial: `$near`, `$geoWithin`, Haversine distance computations.
  - Pure Algorithm Modules in `backend/src/algorithms/`:
    - `duplicateDetection.js`
    - `locationVerification.js`
    - `accidentAnalysis.js`
    - `priorityScoring.js`
    - `repairOptimization.js`
- **Frontend**:
  - React 18+ with Vite.
  - Tailwind CSS + modern dark/light glassmorphic theme.
  - Lucide React icons.
  - React Leaflet + Leaflet GIS mapping.
  - Recharts for priority radar/bar charts and optimization comparisons.
- **Testing**:
  - Jest / Node test runner for backend integration and algorithm unit testing.

---

## 14. Seed Data & 12-Step Live Demo Plan
- 30+ citizen reports, 15+ unique road issues, deliberate duplicates, varying severities, accident logs, 3 repair teams, 5 citizen accounts.
- Seeded accounts:
  - Citizen: `citizen@roadwise.ai` / `Citizen@123`
  - City Admin: `admin@roadwise.ai` / `Admin@123`
  - Field Inspector: `inspector@roadwise.ai` / `Inspector@123`
