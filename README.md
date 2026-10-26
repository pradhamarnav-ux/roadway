# RoadWise AI: Coordinating Road Repairs Across a City
> **Problem Statement #13: Intelligent Civic Coordination, Defect Triage, and Algorithmic Repair Optimization**  
> *Target Stack: MERN (MongoDB + Express.js + React 18/Vite + Node.js 24+) with Leaflet GIS & Tailwind CSS*

[![Build Status](https://img.shields.io/badge/Build-Passing-emerald)](https://github.com/pradhamarnav-ux/roadway)
[![Tests](https://img.shields.io/badge/Tests-106%20Passed-brightgreen)](https://github.com/pradhamarnav-ux/roadway)
[![Test Suites](https://img.shields.io/badge/Suites-19%20Passing-success)](https://github.com/pradhamarnav-ux/roadway)
[![Coverage](https://img.shields.io/badge/Spec%20Phases-1%20through%208%20Complete-blue)](docs/PROGRESS.md)
[![License](https://img.shields.io/badge/License-MIT-slate)](https://github.com/pradhamarnav-ux/roadway)

---

## 1. Executive Summary & Problem Context

Municipal road maintenance departments in rapidly expanding metropolitan areas face severe operational challenges:
1. **Fragmented citizen reports**: Duplicate complaint floods after heavy monsoons bury critical arterial hazards.
2. **Unverified location claims**: Discrepancies between browser GPS pins, street addresses, and photo locations cause wasted municipal truck rolls.
3. **Unprincipled accident attribution**: Conflating nearby accidents with pothole-caused crashes introduces tragic biases into municipal datasets.
4. **Sub-optimal budget allocation**: First-come-first-served or squeaky-wheel complaint repair policies leave life-threatening expressway craters unaddressed while minor residential cracks consume limited funds.
5. **Slow, opaque repair lifecycle**: Citizens receive no tracking updates, field inspectors lack digital evidence workflows, and repair teams operate without real-time work orders.

**RoadWise AI** is an intelligent, auditable civic road infrastructure coordination platform that connects citizens, field inspectors, and municipal city administrators into a unified, principled workflow.

---

## 2. Core Architectural Pillars

```
+----------------------------------------------------------------------------------------------------+
|                                         ROADWISE AI PLATFORM                                       |
+------------------------------------+----------------------------------+----------------------------+
|        CITIZEN PORTAL              |         INSPECTOR CONSOLE        |      ADMIN COMMAND CENTER  |
| - Hazard & Accident Reporting      | - Field Inspection Queue         | - City GIS Heatmap & Pins  |
| - Photo & Camera EXIF Ingestion    | - Depth & Dimension Measurements | - Triage & Duplicate Merge |
| - Live Ticket Timeline Tracking    | - Completion Photo Evidence      | - Accident Tier Calibration|
| - Civic Wallet, Badges & Store     | - Task Sign-off Workflow         | - 0/1 Knapsack Optimizer   |
| - Leaderboard & Privacy Toggles    |                                  | - Work Order Dispatch      |
+------------------------------------+----------------------------------+----------------------------+
                                                    |
                                      REST API (Node.js + Express.js)
                                                    |
                     +------------------------------+------------------------------+
                     |                              |                              |
         [Location Verification]        [Spatial Duplicate Engine]       [Accident Attribution]
         - Device vs Pin delta          - 30-meter geospatial buffer     - 4 ethical tiers
         - Camera EXIF extraction       - Damage category match          - Zero pothole causation
         - Proximity checks             - Jaccard token text similarity  - Minimal personal data
                     |                              |                              |
         [Priority Scoring Engine]      [0/1 Knapsack Budget Optimizer]  [Idempotent Reward Ledger]
         - Linear weights (0.25..0.05)  - DP Knapsack optimization       - Backend-only crediting
         - 73.75 benchmark calibration  - Comparison vs FCFS/Heuristics  - SHA-256 idempotency keys
         - Urgent safety override       - Mandatory override constraint  - Atomic perk redemption
                     |                              |                              |
                     +------------------------------+------------------------------+
                                                    |
                             MongoDB Database (GeoJSON 2dsphere indexing)
                         Zero-Config Embedded Fallback (mongodb-memory-server)
```

---

## 3. Safety & Honesty Constraints

1. **Reported Location != Verified Location**: Device GPS reported by a browser or mobile device is treated as raw claim until corroborated by photo EXIF metadata, nearby independent reports, or field inspection.
2. **Nearby Accident != Pothole-Caused Accident**: Co-location in space/time does not imply causation. Attribution requires formal tiers (`NEARBY_ACCIDENT`, `SUSPECTED_CONTRIBUTION`, `DOCUMENTED_CONTRIBUTION`, `CONFIRMED_CONTRIBUTION`). Nearby accidents are **never** counted as pothole-caused.
3. **Evidence Scores are Explainable**: All factors, checks, and calculations are transparently exposed to administrators and citizens (no opaque black-box probability).
4. **Modeled Benefit**: Optimization metrics are explicitly labelled *"Modeled Priority Benefit"*, never *"Lives Saved"*.
5. **Simulated Rewards**: Non-monetary civic perks are municipal demo items with no real-world cash or financial value, backed by anti-abuse limits.
6. **Synthetic Benchmark Data**: All seed incidents, citizens, and defects are clearly labelled as synthetic and fictional.

---

## 4. Seeded Demo Accounts & Credentials

The database is pre-seeded with 7 realistic accounts across all 3 system roles:

| Role | Account Name | Email | Password | Pre-loaded Balance & Notes |
| :--- | :--- | :--- | :--- | :--- |
| 🚗 **Citizen** | Aarav Sharma | `citizen@roadwise.ai` | `Citizen@123` | 135 pts • Badges: Scout, Eagle Eye, Pothole Hunter |
| 🏛️ **Admin** | Chief Engineer Priya Patel | `admin@roadwise.ai` | `Admin@123` | Municipal Command Center & Optimizer Access |
| 🔍 **Inspector** | Inspector Vikram Singh | `inspector@roadwise.ai` | `Inspector@123` | Field Inspector Console & Task Verification |
| 🚗 **Citizen** | Ananya Sen | `ananya.sen@example.com` | `Citizen@123` | 210 pts • Badges: Community Legend, Eagle Eye |
| 🚗 **Citizen** | Sunita Verma | `sunita.verma@example.com` | `Citizen@123` | 95 pts • Alias: `CleanStreets_ND` |
| 🚗 **Citizen** | Rohit Mehta | `rohit.mehta@example.com` | `Citizen@123` | 45 pts • Alias: `DelhiCommuter` |
| 🚗 **Citizen** | Vikas Yadav | `vikas.yadav@example.com` | `Citizen@123` | 65 pts • **Opted out of leaderboard** (Balance retained) |

*Tip: The Login page provides **1-Click Quick Demo Login Buttons** for instant evaluation.*

---

## 5. Quick Start & Setup Guide

### Prerequisites
- **Node.js**: v20+ recommended (tested on Node.js v24.21.0)
- **npm**: v10+
- **MongoDB**: Optional. If an external MongoDB instance is not detected on `localhost:27017`, the backend **automatically initializes zero-config embedded `mongodb-memory-server`**, requiring zero external database configuration.

### One-Command Setup
Clone the repository and install all dependencies across root, backend, and frontend:
```bash
# From repository root
npm run install:all
```

### Environment Configuration
The repository includes pre-configured environment files:
- **Backend**: `backend/.env` (defaults to Port 5000, JWT Secret, and auto-fallback MongoDB URI)
- **Frontend**: `frontend/.env` (defaults to `VITE_API_BASE_URL=http://localhost:5000`)

```ini
# backend/.env sample
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/roadwise
JWT_SECRET=roadwise_super_secret_jwt_key_2026_hackathon
JWT_EXPIRE=30d
NODE_ENV=development
```

### Seeding the Synthetic Benchmark
Populate the database with 16 ground-truth road defects, 32 citizen reports (including deliberate duplicates, EXIF matches, and location mismatches), 10 vehicular accidents, 4 municipal repair crews, and append-only reward ledgers:
```bash
npm run seed
```

### Running the Application
Start both the backend API server and frontend development server concurrently:
```bash
npm start
```
Or run individually in separate terminal sessions:
```bash
# Terminal 1: Backend API (runs on port 5000)
npm run start:backend

# Terminal 2: Frontend Client (runs on http://localhost:5173)
npm run start:frontend
```

---

## 6. Testing & Quality Verification

RoadWise AI includes a single test command that runs all **106 tests across 19 test suites** verifying all 15 required spec areas in under 3 seconds:

```bash
# Run test suite from root
npm test

# Or directly in backend
cd backend && npm test
```

### Test Coverage Across All 15 Required Areas

| # | Spec Area | Test Suite File | Status |
| :-: | :--- | :--- | :-: |
| **1** | JWT Authentication & Role-Based Access Control (401/403) | `test/auth.test.js` | ✅ PASS |
| **2** | Citizen Road Damage Reporting & Unique Ticket IDs | `test/report.test.js` | ✅ PASS |
| **3** | Photo Upload Security & EXIF Camera Metadata Extraction | `test/report.test.js` | ✅ PASS |
| **4** | Multi-Factor Location Consistency (0–100 Explainable Score) | `test/verification.test.js` | ✅ PASS |
| **5** | Spatial Duplicate Detection (30m buffer, token similarity) | `test/verification.test.js` | ✅ PASS |
| **6** | Defect Consolidation & Issue Linking (`RoadIssue` parent) | `test/verification.test.js` | ✅ PASS |
| **7** | Vehicular Accident Tracking & 4 Attribution Tiers | `test/accident.test.js` | ✅ PASS |
| **8** | Ethical Attribution Constraint (Nearby != Pothole Caused) | `test/accident.test.js` | ✅ PASS |
| **9** | Admin Accident Review & Minimal Personal Data Protection | `test/accident.test.js` | ✅ PASS |
| **10** | Explainable Priority Scoring (Spec 73.75 Calibration Case) | `test/priorityOptimization.test.js` | ✅ PASS |
| **11** | Emergency Safety Escalation Override (Zero Accidents != Zero Risk) | `test/priorityOptimization.test.js` | ✅ PASS |
| **12** | 0/1 Knapsack Budget Optimization vs Heuristic Baselines | `test/priorityOptimization.test.js` | ✅ PASS |
| **13** | Interactive City GIS Map Markers, Popups & Multi-Filter Query | `test/repairWorkflow.test.js` | ✅ PASS |
| **14** | 7-Stage Repair Lifecycle Workflow (`REPORTED` to `CLOSED`) | `test/repairWorkflow.test.js` | ✅ PASS |
| **15** | RoadWise Civic Rewards, SHA-256 Idempotency & Simulated Perks | `test/rewards.test.js` | ✅ PASS |
| **ALL** | **Master 15-Area Requirements Verification Suite** | `test/fifteenAreasChecklist.test.js` | ✅ PASS |

---

## 7. Key Algorithmic Modules

### 1. Explainable Priority Scoring (`backend/src/algorithms/priorityScoring.js`)
Priority Score $P \in [0, 100]$ is computed as:
$$P = 0.25 \cdot S + 0.20 \cdot T + 0.15 \cdot A + 0.25 \cdot C + 0.10 \cdot E + 0.05 \cdot W$$
- **Benchmark Case Verification**: $S=75$, $T=75$, $A=70$, $C=68$, $E=80$, $W=90$ yields **exactly 73.75**.
- **Safety Override**: Critical defects on arterial/highway corridors or defects with confirmed accidents automatically trigger an emergency priority escalation.

### 2. 0/1 Knapsack Budget Optimizer (`backend/src/algorithms/repairOptimization.js`)
Formulated as:
$$\max \sum_{i \in \text{Verified}} \text{Benefit}_i \cdot x_i \quad \text{subject to} \quad \sum_{i \in \text{Verified}} \text{Cost}_i \cdot x_i \le B, \quad x_i \in \{0, 1\}$$
- Evaluates against **FCFS**, **Highest Complaint Density**, and **Greedy Priority**.
- Strictly enforces mandatory selection of emergency safety override defects.
- Provides an **Infeasible Budget Warning** with exact deficit calculation if the budget cannot cover mandatory safety items.

### 3. Append-Only Reward Ledger & Idempotency (`backend/src/algorithms/rewardEngine.js`)
- Backend-only point crediting (0 points at submission; awarded only upon official verification).
- Deterministic SHA-256 idempotency key: `hash(userId:reportId:actionType)` preventing double payouts.
- Anti-abuse: 0 points for accidents, 0 points for duplicates, no severity inflation, rolling 250 pt/24h ceiling.
- Atomic perk redemption with row-level locks preventing negative balances.

---

## 8. Assumptions & Limitations

1. **Embedded MongoDB**: In development and test environments, `mongodb-memory-server` provides complete standalone isolation. For high-scale production deployments, configure a replicated MongoDB cluster with GeoJSON 2dsphere support.
2. **Reverse Geocoding**: Address lookups use open Nominatim reverse geocoding with graceful fallback to manual coordinates when offline.
3. **Camera EXIF Metadata**: EXIF data is present only when photos are taken via native camera sensors with location permissions enabled. The platform handles photos stripped of EXIF metadata via browser GPS and independent report corroboration.
4. **Simulated Municipal Perks**: Municipal vouchers (e.g. transit day passes, parking waivers) are simulated demo items clearly labeled `"DEMO ONLY • No cash value"`.

---

## 9. Live Demo Walkthrough

For the step-by-step evaluator walkthrough covering the entire end-to-end civic repair lifecycle, refer to **[docs/DEMO.md](docs/DEMO.md)**.
