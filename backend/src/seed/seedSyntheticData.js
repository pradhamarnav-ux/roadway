/**
 * RoadWise AI - Comprehensive Synthetic Seed Script
 * Spec Sections 17, 18, 19, 20
 *
 * DISCLAIMER & HONESTY NOTICE:
 * All records created by this script are STRICTLY SYNTHETIC AND FICTIONAL benchmark data
 * created for hackathon demonstration, algorithmic testing, and optimization simulation.
 * No real-world citizen personal data, actual vehicle crash records, or city municipal
 * secrets are contained herein.
 */

import crypto from 'crypto';
import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { RoadIssue } from '../models/RoadIssue.js';
import { Report } from '../models/Report.js';
import { Accident } from '../models/Accident.js';
import { RewardLedger } from '../models/RewardLedger.js';
import { generateIdempotencyKey } from '../algorithms/rewardEngine.js';

export const SYNTHETIC_USERS = [
  {
    name: 'Aarav Sharma (Citizen Demo)',
    email: 'citizen@roadwise.ai',
    password: 'Citizen@123',
    role: 'citizen',
    alias: 'EcoRider_Delhi',
    useAliasOnLeaderboard: false,
    optOutLeaderboard: false,
    pointsBalance: 135,
    badges: [
      { id: 'CIVIC_SCOUT', name: 'Civic Scout', description: 'Submitted your first officially verified road hazard report.', awardedAt: new Date(Date.now() - 14 * 86400000) },
      { id: 'EAGLE_EYE', name: 'Eagle Eye', description: 'Submitted high-fidelity evidence photo with validated camera EXIF GPS metadata.', awardedAt: new Date(Date.now() - 10 * 86400000) },
      { id: 'POTHOLE_HUNTER', name: 'Pothole Hunter', description: 'Reported 3 or more officially confirmed severe potholes.', awardedAt: new Date(Date.now() - 5 * 86400000) },
    ],
  },
  {
    name: 'Sunita Verma',
    email: 'sunita.verma@example.com',
    password: 'Citizen@123',
    role: 'citizen',
    alias: 'CleanStreets_ND',
    useAliasOnLeaderboard: true,
    optOutLeaderboard: false,
    pointsBalance: 95,
    badges: [
      { id: 'CIVIC_SCOUT', name: 'Civic Scout', description: 'Submitted your first officially verified road hazard report.', awardedAt: new Date(Date.now() - 20 * 86400000) },
      { id: 'NEIGHBORHOOD_GUARDIAN', name: 'Neighborhood Guardian', description: 'Contributed 5 or more verified community hazard reports across your ward.', awardedAt: new Date(Date.now() - 2 * 86400000) },
    ],
  },
  {
    name: 'Rohit Mehta',
    email: 'rohit.mehta@example.com',
    password: 'Citizen@123',
    role: 'citizen',
    alias: 'DelhiCommuter',
    useAliasOnLeaderboard: false,
    optOutLeaderboard: false,
    pointsBalance: 45,
    badges: [
      { id: 'CIVIC_SCOUT', name: 'Civic Scout', description: 'Submitted your first officially verified road hazard report.', awardedAt: new Date(Date.now() - 8 * 86400000) },
    ],
  },
  {
    name: 'Ananya Sen',
    email: 'ananya.sen@example.com',
    password: 'Citizen@123',
    role: 'citizen',
    alias: 'SafeCycling_Del',
    useAliasOnLeaderboard: true,
    optOutLeaderboard: false,
    pointsBalance: 210,
    badges: [
      { id: 'CIVIC_SCOUT', name: 'Civic Scout', description: 'Submitted your first officially verified road hazard report.', awardedAt: new Date(Date.now() - 30 * 86400000) },
      { id: 'POTHOLE_HUNTER', name: 'Pothole Hunter', description: 'Reported 3 or more officially confirmed severe potholes.', awardedAt: new Date(Date.now() - 22 * 86400000) },
      { id: 'EAGLE_EYE', name: 'Eagle Eye', description: 'Submitted high-fidelity evidence photo with validated camera EXIF GPS metadata.', awardedAt: new Date(Date.now() - 15 * 86400000) },
      { id: 'COMMUNITY_LEGEND', name: 'Community Legend', description: 'Accumulated 150+ lifetime civic reward points through verified contributions.', awardedAt: new Date(Date.now() - 3 * 86400000) },
    ],
  },
  {
    name: 'Vikas Yadav',
    email: 'vikas.yadav@example.com',
    password: 'Citizen@123',
    role: 'citizen',
    alias: 'UrbanStroller',
    useAliasOnLeaderboard: false,
    optOutLeaderboard: true, // Demonstrating Leaderboard Opt-Out privacy preservation
    pointsBalance: 65,
    badges: [
      { id: 'CIVIC_SCOUT', name: 'Civic Scout', description: 'Submitted your first officially verified road hazard report.', awardedAt: new Date(Date.now() - 12 * 86400000) },
    ],
  },
  {
    name: 'Chief Engineer Priya Patel (Admin Demo)',
    email: 'admin@roadwise.ai',
    password: 'Admin@123',
    role: 'admin',
    alias: 'UrbanOps_Lead',
    pointsBalance: 0,
    badges: [],
  },
  {
    name: 'Inspector Vikram Singh (Field Inspector Demo)',
    email: 'inspector@roadwise.ai',
    password: 'Inspector@123',
    role: 'inspector',
    alias: 'FieldLead_Zone4',
    pointsBalance: 0,
    badges: [],
  },
];

export const MUNICIPAL_CREWS = [
  'CREW-ALPHA: Central Rapid Asphalt Crew',
  'CREW-BETA: North Arterial Paving Team',
  'CREW-GAMMA: Metro Concrete & Drainage Unit',
  'CREW-DELTA: Highway Heavy Maintenance Crew',
];

export async function seedSyntheticData({ quiet = false } = {}) {
  const log = (...args) => {
    if (!quiet) console.log(...args);
  };

  log('\n================================================================================');
  log('🌱 RoadWise AI - Comprehensive Synthetic Seed Script (Phase 8)');
  log('   Spec Sections 17, 18, 19, 20: 30+ Reports, 15+ Issues, Duplicates, Store & Ledger');
  log('================================================================================\n');

  // 1. Wipe previous synthetic collections
  log('🧹 [Step 1] Clearing prior synthetic data...');
  await Promise.all([
    User.deleteMany({}),
    RoadIssue.deleteMany({}),
    Report.deleteMany({}),
    Accident.deleteMany({}),
    RewardLedger.deleteMany({}),
  ]);
  log('   ✔ Database wiped cleanly for reproducible benchmark seeding.\n');

  // 2. Seed Users
  log('👥 [Step 2] Seeding 5 Citizen Accounts + Admin + Inspector...');
  const userMap = {};
  for (const u of SYNTHETIC_USERS) {
    const createdUser = await User.create(u);
    userMap[u.email] = createdUser;
    log(`   ➕ User [${u.role.toUpperCase()}] ${u.email} (${u.name}) - Balance: ${u.pointsBalance} pts`);
  }
  const citizenAarav = userMap['citizen@roadwise.ai'];
  const citizenSunita = userMap['sunita.verma@example.com'];
  const citizenRohit = userMap['rohit.mehta@example.com'];
  const citizenAnanya = userMap['ananya.sen@example.com'];
  const citizenVikas = userMap['vikas.yadav@example.com'];
  const adminUser = userMap['admin@roadwise.ai'];
  const inspectorUser = userMap['inspector@roadwise.ai'];

  // 3. Seed 16 Unique Ground-Truth Road Issues
  log('\n📍 [Step 3] Seeding 16 Unique Ground-Truth Road Issues (Varied Class, Severity & Cost)...');
  const issuesData = [
    {
      issueCode: 'ISSUE-2026-CRIT-01',
      title: 'Massive Crater on Ring Road Expressway near Lajpat Nagar Flyover',
      description: 'Severe 18cm pothole with exposed aggregate and sharp sub-base lip creating acute tyre blowout risk on high-speed expressway.',
      primaryDamageType: 'pothole',
      severity: 'critical',
      roadClass: 'highway',
      location: { type: 'Point', coordinates: [77.2410, 28.5710] },
      address: 'Ring Road, Near Lajpat Nagar Flyover, South Delhi',
      status: 'ASSIGNED',
      verificationStatus: 'INSPECTOR_VERIFIED',
      priorityScore: 94.2,
      priorityLevel: 'CRITICAL',
      safetyOverride: true,
      safetyOverrideReason: 'Safety Escalation: Severe defect on 80km/h arterial highway corridor with confirmed vehicle swerves.',
      estimatedCost: 7500,
      workOrderNumber: 'WO-2026-9001',
      assignedTeam: MUNICIPAL_CREWS[0],
      assignedInspector: inspectorUser._id,
      scheduledDate: new Date(Date.now() - 2 * 86400000),
      estimatedCompletionDate: new Date(Date.now() + 3 * 86400000),
      reportsCount: 3,
      accidentCounts: { nearbyCount: 2, suspectedCount: 1, documentedCount: 1, confirmedCount: 1, totalInjuries: 2 },
    },
    {
      issueCode: 'ISSUE-2026-CRIT-02',
      title: 'Collapsed Stormwater Manhole Frame at Connaught Place Outer Circle',
      description: 'Cast-iron circular manhole ring fractured and dropped 22cm below asphalt grade, creating severe vehicular hazard.',
      primaryDamageType: 'manhole_collapse',
      severity: 'critical',
      roadClass: 'arterial',
      location: { type: 'Point', coordinates: [77.2185, 28.6325] },
      address: 'Outer Circle, Near Block G, Connaught Place, Central Delhi',
      status: 'SCHEDULED',
      verificationStatus: 'INSPECTOR_VERIFIED',
      priorityScore: 91.5,
      priorityLevel: 'CRITICAL',
      safetyOverride: true,
      safetyOverrideReason: 'Safety Escalation: Subsurface void collapse in prime high-density commercial district.',
      estimatedCost: 4200,
      workOrderNumber: 'WO-2026-9002',
      assignedTeam: MUNICIPAL_CREWS[2],
      assignedInspector: inspectorUser._id,
      scheduledDate: new Date(Date.now() - 1 * 86400000),
      estimatedCompletionDate: new Date(Date.now() + 4 * 86400000),
      reportsCount: 2,
      accidentCounts: { nearbyCount: 1, suspectedCount: 1, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
    },
    {
      issueCode: 'ISSUE-2026-HIGH-03',
      title: 'Deep Bituminous Rutting on Mathura Road Transit Corridor',
      description: 'Continuous dual-wheel rut depressions (6-8cm deep) along heavy bus lane causing severe aquaplaning during precipitation.',
      primaryDamageType: 'rutting',
      severity: 'high',
      roadClass: 'arterial',
      location: { type: 'Point', coordinates: [77.2435, 28.5860] },
      address: 'Mathura Road, Opp. Pragati Maidan Gate 4, New Delhi',
      status: 'IN_PROGRESS',
      verificationStatus: 'CORROBORATED',
      priorityScore: 78.4,
      priorityLevel: 'HIGH',
      safetyOverride: false,
      estimatedCost: 6800,
      workOrderNumber: 'WO-2026-9003',
      assignedTeam: MUNICIPAL_CREWS[3],
      assignedInspector: inspectorUser._id,
      scheduledDate: new Date(Date.now() - 4 * 86400000),
      estimatedCompletionDate: new Date(Date.now() + 2 * 86400000),
      reportsCount: 3,
      accidentCounts: { nearbyCount: 2, suspectedCount: 1, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
    },
    {
      issueCode: 'ISSUE-2026-HIGH-04',
      title: 'Longitudinal Surface Fissure Cluster on Barakhamba Road',
      description: 'Extensive 40mm wide pavement cracks with moisture infiltration across multiple lanes (Spec Benchmark Tuning Case).',
      primaryDamageType: 'severe_crack',
      severity: 'high',
      roadClass: 'arterial',
      location: { type: 'Point', coordinates: [77.2270, 28.6290] },
      address: 'Barakhamba Road, Near Statesman House, New Delhi',
      status: 'VERIFIED',
      verificationStatus: 'INSPECTOR_VERIFIED',
      priorityScore: 73.75, // SPEC BENCHMARK
      priorityLevel: 'HIGH',
      safetyOverride: false,
      estimatedCost: 3500,
      reportsCount: 4,
      accidentCounts: { nearbyCount: 1, suspectedCount: 0, documentedCount: 1, confirmedCount: 0, totalInjuries: 1 },
    },
    {
      issueCode: 'ISSUE-2026-MED-05',
      title: 'Severe Pavement Depression near Lodhi Colony Main Market',
      description: 'Trench backfill subsidence causing 5cm dip in roadway adjacent to pedestrian crossing.',
      primaryDamageType: 'pothole',
      severity: 'medium',
      roadClass: 'collector',
      location: { type: 'Point', coordinates: [77.2210, 28.5830] },
      address: 'Lodhi Road Block 14, Lodhi Colony, South Delhi',
      status: 'VERIFIED',
      verificationStatus: 'CORROBORATED',
      priorityScore: 58.2,
      priorityLevel: 'MEDIUM',
      safetyOverride: false,
      estimatedCost: 2400,
      reportsCount: 2,
      accidentCounts: { nearbyCount: 1, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
    },
    {
      issueCode: 'ISSUE-2026-MED-06',
      title: 'Edge Break & Shoulder Erosion along Shanti Path Boulevard',
      description: 'Unpaved shoulder crumbling into stormwater swale with 7cm vertical drop-off at road edge.',
      primaryDamageType: 'erosion',
      severity: 'medium',
      roadClass: 'collector',
      location: { type: 'Point', coordinates: [77.1950, 28.5920] },
      address: 'Shanti Path Diplomatic Enclave, Chanakyapuri, New Delhi',
      status: 'REPORTED',
      verificationStatus: 'CORROBORATED',
      priorityScore: 52.0,
      priorityLevel: 'MEDIUM',
      safetyOverride: false,
      estimatedCost: 1900,
      reportsCount: 1,
      accidentCounts: { nearbyCount: 0, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
    },
    {
      issueCode: 'ISSUE-2026-LOW-07',
      title: 'Transverse Thermal Cracking on Safdarjung Enclave B-Block',
      description: 'Regular thermal contraction fissures across quiet residential sector road; early wear without structural failure.',
      primaryDamageType: 'severe_crack',
      severity: 'low',
      roadClass: 'residential',
      location: { type: 'Point', coordinates: [77.1920, 28.5670] },
      address: 'B-Block Main Road, Safdarjung Enclave, South West Delhi',
      status: 'VERIFIED',
      verificationStatus: 'CORROBORATED',
      priorityScore: 36.5,
      priorityLevel: 'LOW',
      safetyOverride: false,
      estimatedCost: 950,
      reportsCount: 1,
      accidentCounts: { nearbyCount: 0, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
    },
    {
      issueCode: 'ISSUE-2026-LOW-08',
      title: 'Surface Weathering & Fine Aggregate Stripping near Defence Colony',
      description: 'Loss of bituminous binder causing gravel looseness on residential lane corner.',
      primaryDamageType: 'other',
      severity: 'low',
      roadClass: 'residential',
      location: { type: 'Point', coordinates: [77.2340, 28.5740] },
      address: 'C-Block Ring Road Service Lane, Defence Colony, South Delhi',
      status: 'REPORTED',
      verificationStatus: 'UNVERIFIED',
      priorityScore: 28.0,
      priorityLevel: 'LOW',
      safetyOverride: false,
      estimatedCost: 750,
      reportsCount: 1,
      accidentCounts: { nearbyCount: 1, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
    },
    {
      issueCode: 'ISSUE-2026-CRIT-09',
      title: 'Exposed Rebar & Bridge Approach Pothole on Nizamuddin Flyover',
      description: 'Severe structural crater exposing rusted concrete bridge reinforcement mesh; hazardous for two-wheelers.',
      primaryDamageType: 'pothole',
      severity: 'critical',
      roadClass: 'highway',
      location: { type: 'Point', coordinates: [77.2520, 28.5910] },
      address: 'Nizamuddin Flyover Southbound Approach, East Delhi',
      status: 'INSPECTED',
      verificationStatus: 'INSPECTOR_VERIFIED',
      priorityScore: 96.0,
      priorityLevel: 'CRITICAL',
      safetyOverride: true,
      safetyOverrideReason: 'Safety Escalation: Exposed structural bridge rebar on grade-separated arterial flyover.',
      estimatedCost: 8900,
      workOrderNumber: 'WO-2026-9004',
      assignedTeam: MUNICIPAL_CREWS[0],
      assignedInspector: inspectorUser._id,
      scheduledDate: new Date(Date.now() - 7 * 86400000),
      estimatedCompletionDate: new Date(Date.now() - 1 * 86400000),
      reportsCount: 3,
      accidentCounts: { nearbyCount: 3, suspectedCount: 1, documentedCount: 1, confirmedCount: 1, totalInjuries: 2 },
    },
    {
      issueCode: 'ISSUE-2026-HIGH-10',
      title: 'Dual Potholes at Vikas Marg Transit Intersection',
      description: 'Twin pavement failures at signalized junction creating major traffic bottleneck during evening commute.',
      primaryDamageType: 'pothole',
      severity: 'high',
      roadClass: 'arterial',
      location: { type: 'Point', coordinates: [77.2590, 28.6340] },
      address: 'Vikas Marg, Near Laxmi Nagar Metro Station, East Delhi',
      status: 'VERIFIED',
      verificationStatus: 'INSPECTOR_VERIFIED',
      priorityScore: 81.3,
      priorityLevel: 'HIGH',
      safetyOverride: false,
      estimatedCost: 5100,
      reportsCount: 2,
      accidentCounts: { nearbyCount: 1, suspectedCount: 1, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
    },
    {
      issueCode: 'ISSUE-2026-MED-11',
      title: 'Concrete Slab Joint Dislocation on Siri Fort Road',
      description: 'Rigid pavement expansion joint faulted with 4cm step-off between adjacent concrete slabs.',
      primaryDamageType: 'severe_crack',
      severity: 'medium',
      roadClass: 'collector',
      location: { type: 'Point', coordinates: [77.2230, 28.5560] },
      address: 'Siri Fort Institutional Area, August Kranti Marg, New Delhi',
      status: 'VERIFIED',
      verificationStatus: 'CORROBORATED',
      priorityScore: 62.1,
      priorityLevel: 'MEDIUM',
      safetyOverride: false,
      estimatedCost: 3200,
      reportsCount: 2,
      accidentCounts: { nearbyCount: 0, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
    },
    {
      issueCode: 'ISSUE-2026-CLOSED-12',
      title: 'Repaired Trench Subsidence on Africa Avenue Corridor',
      description: 'Full-depth bituminous restoration completed following municipal water pipeline trench installation.',
      primaryDamageType: 'pothole',
      severity: 'high',
      roadClass: 'arterial',
      location: { type: 'Point', coordinates: [77.1980, 28.5720] },
      address: 'Africa Avenue, Near Yashwant Place, Chanakyapuri, New Delhi',
      status: 'CLOSED',
      verificationStatus: 'INSPECTOR_VERIFIED',
      priorityScore: 75.0,
      priorityLevel: 'HIGH',
      safetyOverride: false,
      estimatedCost: 4800,
      workOrderNumber: 'WO-2026-8801',
      assignedTeam: MUNICIPAL_CREWS[1],
      assignedInspector: inspectorUser._id,
      scheduledDate: new Date(Date.now() - 14 * 86400000),
      estimatedCompletionDate: new Date(Date.now() - 3 * 86400000),
      completedDate: new Date(Date.now() - 2 * 86400000),
      reportsCount: 2,
      accidentCounts: { nearbyCount: 0, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
    },
    {
      issueCode: 'ISSUE-2026-CLOSED-13',
      title: 'Completed Manhole Leveling on Janpath Boulevard',
      description: 'Sunken telecom inspection pit raised to road grade with polymer concrete collar and hot-mix surround.',
      primaryDamageType: 'manhole_collapse',
      severity: 'medium',
      roadClass: 'arterial',
      location: { type: 'Point', coordinates: [77.2190, 28.6210] },
      address: 'Janpath, Opp. National Museum, Central Delhi',
      status: 'CLOSED',
      verificationStatus: 'INSPECTOR_VERIFIED',
      priorityScore: 60.0,
      priorityLevel: 'MEDIUM',
      safetyOverride: false,
      estimatedCost: 2100,
      workOrderNumber: 'WO-2026-8802',
      assignedTeam: MUNICIPAL_CREWS[2],
      assignedInspector: inspectorUser._id,
      scheduledDate: new Date(Date.now() - 10 * 86400000),
      estimatedCompletionDate: new Date(Date.now() - 2 * 86400000),
      completedDate: new Date(Date.now() - 1 * 86400000),
      reportsCount: 1,
      accidentCounts: { nearbyCount: 0, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
    },
    {
      issueCode: 'ISSUE-2026-HIGH-14',
      title: 'Alligator Cracking & Pumping on Ashram Chowk Underpass Ramp',
      description: 'Interconnected fatigue cracks with water pumping through pavement sub-base during rainfall.',
      primaryDamageType: 'severe_crack',
      severity: 'high',
      roadClass: 'highway',
      location: { type: 'Point', coordinates: [77.2580, 28.5710] },
      address: 'Ashram Chowk Underpass Western Entry Ramp, South Delhi',
      status: 'ASSIGNED',
      verificationStatus: 'CORROBORATED',
      priorityScore: 84.5,
      priorityLevel: 'HIGH',
      safetyOverride: true,
      safetyOverrideReason: 'Safety Escalation: Heavy transit ramp with progressive sub-base water saturation.',
      estimatedCost: 6200,
      workOrderNumber: 'WO-2026-9005',
      assignedTeam: MUNICIPAL_CREWS[3],
      assignedInspector: inspectorUser._id,
      scheduledDate: new Date(Date.now() - 1 * 86400000),
      estimatedCompletionDate: new Date(Date.now() + 5 * 86400000),
      reportsCount: 3,
      accidentCounts: { nearbyCount: 2, suspectedCount: 1, documentedCount: 1, confirmedCount: 0, totalInjuries: 1 },
    },
    {
      issueCode: 'ISSUE-2026-MED-15',
      title: 'Sunken Storm Sewer Grate near INA Metro Station',
      description: 'Drop inlet grate depressed 6cm below curb line causing cycling and scooter hazard.',
      primaryDamageType: 'manhole_collapse',
      severity: 'medium',
      roadClass: 'collector',
      location: { type: 'Point', coordinates: [77.2090, 28.5770] },
      address: 'Aurobindo Marg, Adjacent to INA Metro Gate 2, New Delhi',
      status: 'VERIFIED',
      verificationStatus: 'INSPECTOR_VERIFIED',
      priorityScore: 54.0,
      priorityLevel: 'MEDIUM',
      safetyOverride: false,
      estimatedCost: 1800,
      reportsCount: 1,
      accidentCounts: { nearbyCount: 0, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
    },
    {
      issueCode: 'ISSUE-2026-LOW-16',
      title: 'Minor Surface Ravelling on Vasant Vihar Sector 5',
      description: 'Gradual loss of surface fines along low-traffic residential street cul-de-sac.',
      primaryDamageType: 'other',
      severity: 'low',
      roadClass: 'residential',
      location: { type: 'Point', coordinates: [77.1610, 28.5560] },
      address: 'Street 5, Vasant Vihar, South West Delhi',
      status: 'REPORTED',
      verificationStatus: 'UNVERIFIED',
      priorityScore: 24.5,
      priorityLevel: 'LOW',
      safetyOverride: false,
      estimatedCost: 600,
      reportsCount: 1,
      accidentCounts: { nearbyCount: 0, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
    },
  ];

  const createdIssues = [];
  for (const data of issuesData) {
    const issue = await RoadIssue.create(data);
    createdIssues.push(issue);
    log(`   📍 Created Issue [${issue.issueCode}] ${issue.title} (Priority: ${issue.priorityScore}, Status: ${issue.status})`);
  }

  // 4. Seed 32+ Citizen Reports with Deliberate Duplicates & Location Discrepancies
  log('\n📸 [Step 4] Seeding 32 Citizen Reports (Deliberate Duplicates, EXIF Matches & Location Mismatches)...');
  const reportsData = [
    // Duplicate Cluster at ISSUE-2026-CRIT-01 (Lajpat Nagar crater - 3 reports within 15 meters)
    {
      reportId: 'REP-2026-DELHI-001',
      reporter: citizenAarav._id,
      roadIssue: createdIssues[0]._id,
      damageType: 'pothole',
      severity: 'critical',
      description: 'Enormous pothole right in middle lane of Ring Road before flyover. Saw a biker almost wipe out.',
      photoUrl: '/uploads/sample_pothole_01.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2410, 28.5710] },
      verificationStatus: 'INSPECTOR_VERIFIED',
      evidenceConsistencyScore: 98,
      evidenceBreakdown: { exifMatched: true, gpsPinMatched: true, inspectorConfirmed: true },
    },
    {
      reportId: 'REP-2026-DELHI-002',
      reporter: citizenSunita._id,
      roadIssue: createdIssues[0]._id,
      damageType: 'pothole',
      severity: 'high',
      description: 'Large deep hole in expressway asphalt near Lajpat Nagar flyover ramp. Vehicles swerving violently.',
      photoUrl: '/uploads/sample_pothole_02.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2411, 28.5711] }, // 12m delta (Deliberate duplicate)
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 92,
      evidenceBreakdown: { exifMatched: true, gpsPinMatched: true, independentReportsNearby: 2 },
    },
    {
      reportId: 'REP-2026-DELHI-003',
      reporter: citizenRohit._id,
      roadIssue: createdIssues[0]._id,
      damageType: 'pothole',
      severity: 'critical',
      description: 'Dangerous road crater Lajpat Nagar Ring Road. Exposed sharp stone edges. Urgent asphalt repair needed.',
      photoUrl: '/uploads/sample_pothole_03.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2409, 28.5709] }, // 15m delta (Deliberate duplicate)
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 88,
      evidenceBreakdown: { exifMatched: false, gpsPinMatched: true, independentReportsNearby: 2 },
    },

    // Duplicate Cluster at ISSUE-2026-CRIT-02 (Connaught Place collapsed manhole - 2 reports within 12 meters)
    {
      reportId: 'REP-2026-DELHI-004',
      reporter: citizenAnanya._id,
      roadIssue: createdIssues[1]._id,
      damageType: 'manhole_collapse',
      severity: 'critical',
      description: 'Manhole cover has sunk 20cm below road surface at CP Outer Circle near Block G.',
      photoUrl: '/uploads/sample_manhole_01.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2185, 28.6325] },
      verificationStatus: 'INSPECTOR_VERIFIED',
      evidenceConsistencyScore: 96,
      evidenceBreakdown: { exifMatched: true, gpsPinMatched: true, inspectorConfirmed: true },
    },
    {
      reportId: 'REP-2026-DELHI-005',
      reporter: citizenVikas._id,
      roadIssue: createdIssues[1]._id,
      damageType: 'manhole_collapse',
      severity: 'high',
      description: 'Dangerous broken manhole rim in Connaught Place Outer Circle lane. Extremely risky at night.',
      photoUrl: '/uploads/sample_manhole_02.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2186, 28.6326] }, // 14m delta (Deliberate duplicate)
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 90,
      evidenceBreakdown: { exifMatched: true, gpsPinMatched: true, independentReportsNearby: 1 },
    },

    // Reports at ISSUE-2026-HIGH-03 (Mathura Road rutting)
    {
      reportId: 'REP-2026-DELHI-006',
      reporter: citizenAarav._id,
      roadIssue: createdIssues[2]._id,
      damageType: 'rutting',
      severity: 'high',
      description: 'Severe longitudinal vehicle ruts near Pragati Maidan on Mathura Road. Bus wheels have gouged channels.',
      photoUrl: '/uploads/sample_rutting_01.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2435, 28.5860] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 91,
      evidenceBreakdown: { exifMatched: true, gpsPinMatched: true },
    },
    {
      reportId: 'REP-2026-DELHI-007',
      reporter: citizenSunita._id,
      roadIssue: createdIssues[2]._id,
      damageType: 'rutting',
      severity: 'medium',
      description: 'Deep tire grooves in asphalt on Mathura Road bus lane. Steering pulls when driving over them.',
      photoUrl: '/uploads/sample_rutting_02.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2437, 28.5862] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 85,
    },
    {
      reportId: 'REP-2026-DELHI-008',
      reporter: citizenRohit._id,
      roadIssue: createdIssues[2]._id,
      damageType: 'rutting',
      severity: 'high',
      description: 'Wavy asphalt and sunken tracks outside Pragati Maidan. Collects stagnant puddles.',
      photoUrl: '/uploads/sample_rutting_03.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2434, 28.5859] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 87,
    },

    // Reports at ISSUE-2026-HIGH-04 (Barakhamba Road crack cluster - Spec Benchmark)
    {
      reportId: 'REP-2026-DELHI-009',
      reporter: citizenAnanya._id,
      roadIssue: createdIssues[3]._id,
      damageType: 'severe_crack',
      severity: 'high',
      description: 'Wide road fissures developing near Statesman House Barakhamba Road.',
      photoUrl: '/uploads/sample_crack_01.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2270, 28.6290] },
      verificationStatus: 'INSPECTOR_VERIFIED',
      evidenceConsistencyScore: 97,
      evidenceBreakdown: { exifMatched: true, gpsPinMatched: true, inspectorConfirmed: true },
    },
    {
      reportId: 'REP-2026-DELHI-010',
      reporter: citizenAarav._id,
      roadIssue: createdIssues[3]._id,
      damageType: 'severe_crack',
      severity: 'high',
      description: 'Expanding asphalt cracks across two central lanes on Barakhamba Road.',
      photoUrl: '/uploads/sample_crack_02.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2272, 28.6291] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 94,
      evidenceBreakdown: { exifMatched: true, gpsPinMatched: true },
    },
    {
      reportId: 'REP-2026-DELHI-011',
      reporter: citizenSunita._id,
      roadIssue: createdIssues[3]._id,
      damageType: 'severe_crack',
      severity: 'medium',
      description: 'Multiple longitudinal fissures splitting the pavement surface.',
      photoUrl: '/uploads/sample_crack_03.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2269, 28.6289] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 89,
    },
    {
      reportId: 'REP-2026-DELHI-012',
      reporter: citizenVikas._id,
      roadIssue: createdIssues[3]._id,
      damageType: 'severe_crack',
      severity: 'high',
      description: 'Heavy structural cracks on Barakhamba Road roadbed.',
      photoUrl: '/uploads/sample_crack_04.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2271, 28.6292] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 91,
    },

    // Reports at ISSUE-2026-MED-05 (Lodhi Colony depression)
    {
      reportId: 'REP-2026-DELHI-013',
      reporter: citizenRohit._id,
      roadIssue: createdIssues[4]._id,
      damageType: 'pothole',
      severity: 'medium',
      description: 'Dip in road outside Lodhi Colony market where previous digging occurred.',
      photoUrl: '/uploads/sample_pothole_04.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2210, 28.5830] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 84,
    },
    {
      reportId: 'REP-2026-DELHI-014',
      reporter: citizenAnanya._id,
      roadIssue: createdIssues[4]._id,
      damageType: 'pothole',
      severity: 'medium',
      description: 'Depressed asphalt patch near Lodhi Road zebra crossing.',
      photoUrl: '/uploads/sample_pothole_05.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2212, 28.5831] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 86,
    },

    // Duplicate Cluster at ISSUE-2026-HIGH-10 (Vikas Marg dual potholes)
    {
      reportId: 'REP-2026-DELHI-015',
      reporter: citizenSunita._id,
      roadIssue: createdIssues[9]._id,
      damageType: 'pothole',
      severity: 'high',
      description: 'Two deep potholes in tandem right near Laxmi Nagar metro station signal.',
      photoUrl: '/uploads/sample_pothole_06.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2590, 28.6340] },
      verificationStatus: 'INSPECTOR_VERIFIED',
      evidenceConsistencyScore: 95,
      evidenceBreakdown: { exifMatched: true, gpsPinMatched: true },
    },
    {
      reportId: 'REP-2026-DELHI-016',
      reporter: citizenAarav._id,
      roadIssue: createdIssues[9]._id,
      damageType: 'pothole',
      severity: 'high',
      description: 'Double pothole hazard on Vikas Marg eastbound carriage. Causes severe morning delay.',
      photoUrl: '/uploads/sample_pothole_07.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2591, 28.6341] }, // 16m delta (Deliberate duplicate)
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 93,
      evidenceBreakdown: { exifMatched: true, gpsPinMatched: true },
    },

    // Reports at ISSUE-2026-CRIT-09 (Nizamuddin flyover approach)
    {
      reportId: 'REP-2026-DELHI-017',
      reporter: citizenVikas._id,
      roadIssue: createdIssues[8]._id,
      damageType: 'pothole',
      severity: 'critical',
      description: 'Rebar wire sticking out of pothole on Nizamuddin flyover ramp. Extreme risk for scooters.',
      photoUrl: '/uploads/sample_pothole_08.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2520, 28.5910] },
      verificationStatus: 'INSPECTOR_VERIFIED',
      evidenceConsistencyScore: 99,
      evidenceBreakdown: { exifMatched: true, gpsPinMatched: true, inspectorConfirmed: true },
    },
    {
      reportId: 'REP-2026-DELHI-018',
      reporter: citizenAnanya._id,
      roadIssue: createdIssues[8]._id,
      damageType: 'pothole',
      severity: 'critical',
      description: 'Dangerous concrete spalling with metal mesh visible on Nizamuddin flyover.',
      photoUrl: '/uploads/sample_pothole_09.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2522, 28.5911] },
      verificationStatus: 'INSPECTOR_VERIFIED',
      evidenceConsistencyScore: 95,
    },
    {
      reportId: 'REP-2026-DELHI-019',
      reporter: citizenRohit._id,
      roadIssue: createdIssues[8]._id,
      damageType: 'pothole',
      severity: 'high',
      description: 'Deep hole on flyover ascent. Needs immediate patch crew.',
      photoUrl: '/uploads/sample_pothole_10.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2519, 28.5909] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 89,
    },

    // Reports at ISSUE-2026-HIGH-14 (Ashram underpass fatigue cracks)
    {
      reportId: 'REP-2026-DELHI-020',
      reporter: citizenAarav._id,
      roadIssue: createdIssues[13]._id,
      damageType: 'severe_crack',
      severity: 'high',
      description: 'Crocodile pattern fatigue cracking along Ashram Chowk underpass ramp.',
      photoUrl: '/uploads/sample_crack_05.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2580, 28.5710] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 92,
    },
    {
      reportId: 'REP-2026-DELHI-021',
      reporter: citizenSunita._id,
      roadIssue: createdIssues[13]._id,
      damageType: 'severe_crack',
      severity: 'high',
      description: 'Water seeping through broken asphalt ramp at Ashram Chowk.',
      photoUrl: '/uploads/sample_crack_06.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2582, 28.5712] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 90,
    },
    {
      reportId: 'REP-2026-DELHI-022',
      reporter: citizenRohit._id,
      roadIssue: createdIssues[13]._id,
      damageType: 'severe_crack',
      severity: 'medium',
      description: 'Pavement buckling and alligator cracks near underpass portal.',
      photoUrl: '/uploads/sample_crack_07.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2579, 28.5709] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 86,
    },

    // Reports for Other Individual Issues
    {
      reportId: 'REP-2026-DELHI-023',
      reporter: citizenVikas._id,
      roadIssue: createdIssues[5]._id, // Shanti Path
      damageType: 'erosion',
      severity: 'medium',
      description: 'Eroding shoulder drop along Shanti Path.',
      photoUrl: '/uploads/sample_erosion_01.jpg',
      rawLocation: { type: 'Point', coordinates: [77.1950, 28.5920] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 80,
    },
    {
      reportId: 'REP-2026-DELHI-024',
      reporter: citizenAarav._id,
      roadIssue: createdIssues[6]._id, // Safdarjung
      damageType: 'severe_crack',
      severity: 'low',
      description: 'Fine hairline cracks on B-block street.',
      photoUrl: '/uploads/sample_crack_08.jpg',
      rawLocation: { type: 'Point', coordinates: [77.1920, 28.5670] },
      verificationStatus: 'CORROBORATED',
      evidenceConsistencyScore: 78,
    },

    // LOCATION MISMATCH / WRONG LOCATIONS (Spec Requirement: Deliberate location anomalies)
    {
      reportId: 'REP-2026-MISMATCH-25',
      reporter: citizenRohit._id,
      roadIssue: null,
      damageType: 'pothole',
      severity: 'high',
      description: 'Reported pothole with device GPS 280 meters away from manual pin.',
      photoUrl: '/uploads/sample_pothole_11.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2250, 28.6180] },
      verificationStatus: 'LOCATION_MISMATCH',
      evidenceConsistencyScore: 22,
      evidenceBreakdown: {
        devicePinDeltaMeters: 280,
        gpsPinMatched: false,
        notes: ['DEVICE_PIN_DISCREPANCY: Browser GPS is 280m from selected pin.'],
      },
    },
    {
      reportId: 'REP-2026-MISMATCH-26',
      reporter: citizenSunita._id,
      roadIssue: null,
      damageType: 'pothole',
      severity: 'medium',
      description: 'Photo EXIF geolocation indicates camera was in another city.',
      photoUrl: '/uploads/sample_pothole_12.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2100, 28.6200] },
      verificationStatus: 'LOCATION_MISMATCH',
      evidenceConsistencyScore: 12,
      evidenceBreakdown: {
        exifPinDeltaMeters: 14200,
        exifMatched: false,
        notes: ['EXIF_GEOLOCATION_MISMATCH: Photo captured 14.2km from claimed defect pin.'],
      },
    },
    {
      reportId: 'REP-2026-INSPECT-27',
      reporter: citizenVikas._id,
      roadIssue: null,
      damageType: 'manhole_collapse',
      severity: 'high',
      description: 'Ambiguous manhole depression on private driveway boundary.',
      photoUrl: '/uploads/sample_manhole_03.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2350, 28.5650] },
      verificationStatus: 'NEEDS_INSPECTION',
      evidenceConsistencyScore: 48,
      evidenceBreakdown: {
        roadProximityPassed: false,
        notes: ['ROAD_PROXIMITY_UNCERTAIN: Coordinates fall on border of public and private easement.'],
      },
    },

    // UNVERIFIED RAW COMPLAINTS (For Verification Queue Triage Demonstration)
    {
      reportId: 'REP-2026-RAW-28',
      reporter: citizenAarav._id,
      roadIssue: null,
      damageType: 'pothole',
      severity: 'medium',
      description: 'Pothole starting to open up near Tilak Marg bus stand. Depth approx 4cm.',
      photoUrl: '/uploads/sample_pothole_13.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2380, 28.6190] },
      verificationStatus: 'UNVERIFIED',
      evidenceConsistencyScore: 40,
    },
    {
      reportId: 'REP-2026-RAW-29',
      reporter: citizenSunita._id,
      roadIssue: null,
      damageType: 'severe_crack',
      severity: 'low',
      description: 'Surface cracking appearing after recent showers on KG Marg.',
      photoUrl: '/uploads/sample_crack_09.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2240, 28.6240] },
      verificationStatus: 'UNVERIFIED',
      evidenceConsistencyScore: 40,
    },
    {
      reportId: 'REP-2026-RAW-30',
      reporter: citizenRohit._id,
      roadIssue: null,
      damageType: 'manhole_collapse',
      severity: 'high',
      description: 'Uncovered municipal utility pit on Pragati Maidan service lane.',
      photoUrl: '/uploads/sample_manhole_04.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2470, 28.6180] },
      verificationStatus: 'UNVERIFIED',
      evidenceConsistencyScore: 40,
    },
    {
      reportId: 'REP-2026-RAW-31',
      reporter: citizenAnanya._id,
      roadIssue: null,
      damageType: 'pothole',
      severity: 'critical',
      description: 'Deep road cavity on Ring Road near Moolchand Hospital entrance.',
      photoUrl: '/uploads/sample_pothole_14.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2360, 28.5680] },
      verificationStatus: 'UNVERIFIED',
      evidenceConsistencyScore: 40,
    },
    {
      reportId: 'REP-2026-RAW-32',
      reporter: citizenVikas._id,
      roadIssue: null,
      damageType: 'erosion',
      severity: 'medium',
      description: 'Drainage washout along pavement shoulder on Lodhi Road.',
      photoUrl: '/uploads/sample_erosion_02.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2150, 28.5870] },
      verificationStatus: 'UNVERIFIED',
      evidenceConsistencyScore: 40,
    },
  ];

  for (const rep of reportsData) {
    await Report.create(rep);
  }
  log(`   ✔ Seeded ${reportsData.length} total citizen reports across all verification statuses.\n`);

  // 5. Seed Vehicular Accidents across 4 Attribution Tiers
  log('🚗 [Step 5] Seeding Vehicular Accidents (4 Attribution Tiers with Ethical Separation)...');
  const accidentsData = [
    // Confirmed Contribution at ISSUE-2026-CRIT-01
    {
      accidentId: 'ACC-2026-CONF-01',
      roadIssue: createdIssues[0]._id,
      location: { type: 'Point', coordinates: [77.2410, 28.5710] },
      occurredAt: new Date(Date.now() - 6 * 86400000),
      attributionTier: 'CONFIRMED_CONTRIBUTION',
      verificationStatus: 'VERIFIED',
      injurySeverity: 'serious',
      injuriesCount: 1,
      vehiclesInvolved: 1,
      policeReportRef: 'FIR-2026-DEL-1049',
      evidenceNotes: 'Motorcycle wheel collapsed upon striking 18cm pothole at 50km/h. Rider suffered fractured collarbone. Municipal structural engineer verified defect depth as direct primary cause.',
    },
    // Documented Contribution at ISSUE-2026-HIGH-04 (Spec Benchmark)
    {
      accidentId: 'ACC-2026-DOC-02',
      roadIssue: createdIssues[3]._id,
      location: { type: 'Point', coordinates: [77.2270, 28.6290] },
      occurredAt: new Date(Date.now() - 5 * 86400000),
      attributionTier: 'DOCUMENTED_CONTRIBUTION',
      verificationStatus: 'VERIFIED',
      injurySeverity: 'minor',
      injuriesCount: 1,
      vehiclesInvolved: 2,
      policeReportRef: 'FIR-2026-DEL-3829',
      evidenceNotes: 'Traffic police report confirms sedan swerved sharply to evade longitudinal road fissure cluster, sideswiping an adjacent auto-rickshaw.',
    },
    // Documented Contribution at ISSUE-2026-CRIT-09
    {
      accidentId: 'ACC-2026-DOC-03',
      roadIssue: createdIssues[8]._id,
      location: { type: 'Point', coordinates: [77.2520, 28.5910] },
      occurredAt: new Date(Date.now() - 8 * 86400000),
      attributionTier: 'DOCUMENTED_CONTRIBUTION',
      verificationStatus: 'VERIFIED',
      injurySeverity: 'serious',
      injuriesCount: 1,
      vehiclesInvolved: 1,
      policeReportRef: 'FIR-2026-DEL-4912',
      evidenceNotes: 'Delivery scooter lost control when front tire caught on exposed bridge rebar edge on Nizamuddin flyover ramp.',
    },
    // Suspected Contribution at ISSUE-2026-CRIT-01
    {
      accidentId: 'ACC-2026-SUSP-04',
      roadIssue: createdIssues[0]._id,
      location: { type: 'Point', coordinates: [77.2412, 28.5712] },
      occurredAt: new Date(Date.now() - 10 * 86400000),
      attributionTier: 'SUSPECTED_CONTRIBUTION',
      verificationStatus: 'UNDER_REVIEW',
      injurySeverity: 'minor',
      injuriesCount: 1,
      vehiclesInvolved: 2,
      policeReportRef: 'FIR-2026-DEL-5511',
      evidenceNotes: 'Rear-end collision. Lead driver states sudden hard braking was required due to massive road pothole ahead.',
    },
    // Suspected Contribution at ISSUE-2026-CRIT-02
    {
      accidentId: 'ACC-2026-SUSP-05',
      roadIssue: createdIssues[1]._id,
      location: { type: 'Point', coordinates: [77.2185, 28.6325] },
      occurredAt: new Date(Date.now() - 3 * 86400000),
      attributionTier: 'SUSPECTED_CONTRIBUTION',
      verificationStatus: 'UNDER_REVIEW',
      injurySeverity: 'none',
      injuriesCount: 0,
      vehiclesInvolved: 1,
      policeReportRef: 'PCR-2026-CP-209',
      evidenceNotes: 'Taxi suspension damaged after striking sunken manhole edge in Connaught Place.',
    },
    // Suspected Contribution at ISSUE-2026-HIGH-10
    {
      accidentId: 'ACC-2026-SUSP-06',
      roadIssue: createdIssues[9]._id,
      location: { type: 'Point', coordinates: [77.2590, 28.6340] },
      occurredAt: new Date(Date.now() - 7 * 86400000),
      attributionTier: 'SUSPECTED_CONTRIBUTION',
      verificationStatus: 'UNVERIFIED',
      injurySeverity: 'none',
      injuriesCount: 0,
      vehiclesInvolved: 1,
      policeReportRef: null,
      evidenceNotes: 'Citizen report: scooter rim bent when negotiating dual potholes in traffic.',
    },
    // Nearby Accidents (Explicitly NOT pothole caused - Spec Section 7 Constraint)
    {
      accidentId: 'ACC-2026-NEAR-07',
      roadIssue: createdIssues[0]._id,
      location: { type: 'Point', coordinates: [77.2415, 28.5715] },
      occurredAt: new Date(Date.now() - 12 * 86400000),
      attributionTier: 'NEARBY_ACCIDENT',
      verificationStatus: 'VERIFIED',
      injurySeverity: 'none',
      injuriesCount: 0,
      vehiclesInvolved: 2,
      policeReportRef: 'PCR-2026-LPT-901',
      evidenceNotes: 'Low-speed bumper tap during signal red phase. Road surface was dry and defect was 35m distant. NOT caused by defect.',
    },
    {
      accidentId: 'ACC-2026-NEAR-08',
      roadIssue: createdIssues[4]._id,
      location: { type: 'Point', coordinates: [77.2215, 28.5835] },
      occurredAt: new Date(Date.now() - 4 * 86400000),
      attributionTier: 'NEARBY_ACCIDENT',
      verificationStatus: 'VERIFIED',
      injurySeverity: 'none',
      injuriesCount: 0,
      vehiclesInvolved: 2,
      policeReportRef: 'PCR-2026-LDH-411',
      evidenceNotes: 'Parallel parking scrape near Lodhi Colony market. Unrelated to road pavement depression.',
    },
    {
      accidentId: 'ACC-2026-NEAR-09',
      roadIssue: createdIssues[7]._id,
      location: { type: 'Point', coordinates: [77.2342, 28.5742] },
      occurredAt: new Date(Date.now() - 9 * 86400000),
      attributionTier: 'NEARBY_ACCIDENT',
      verificationStatus: 'VERIFIED',
      injurySeverity: 'none',
      injuriesCount: 0,
      vehiclesInvolved: 1,
      policeReportRef: 'PCR-2026-DEF-812',
      evidenceNotes: 'Vehicle reversed into boundary wall. Unrelated to street surface aggregate.',
    },
    {
      accidentId: 'ACC-2026-NEAR-10',
      roadIssue: createdIssues[8]._id,
      location: { type: 'Point', coordinates: [77.2525, 28.5915] },
      occurredAt: new Date(Date.now() - 11 * 86400000),
      attributionTier: 'NEARBY_ACCIDENT',
      verificationStatus: 'VERIFIED',
      injurySeverity: 'none',
      injuriesCount: 0,
      vehiclesInvolved: 2,
      policeReportRef: 'PCR-2026-NZM-303',
      evidenceNotes: 'Rear-end fender collision during queueing on flyover. Explicitly verified NOT caused by bridge road defect.',
    },
  ];

  for (const acc of accidentsData) {
    await Accident.create(acc);
    log(`   🚗 Accident [${acc.accidentId}] Tier: ${acc.attributionTier} (Injuries: ${acc.injuriesCount})`);
  }
  log(`   ✔ Seeded ${accidentsData.length} vehicular accidents with rigorous attribution tiers.\n`);

  // 6. Seed Append-Only Reward Ledgers with Deterministic Idempotency Keys
  log('💳 [Step 6] Seeding Append-Only Reward Ledgers with SHA-256 Idempotency Keys...');
  const sampleReport1 = await Report.findOne({ reportId: 'REP-2026-DELHI-001' });
  const sampleReport4 = await Report.findOne({ reportId: 'REP-2026-DELHI-004' });
  const sampleReport9 = await Report.findOne({ reportId: 'REP-2026-DELHI-009' });

  const ledgersData = [
    // Aarav Sharma verified first report + EXIF bonus
    {
      idempotencyKey: generateIdempotencyKey(citizenAarav._id, sampleReport1._id, 'FIRST_REPORT_VERIFIED'),
      user: citizenAarav._id,
      report: sampleReport1._id,
      actionType: 'FIRST_REPORT_VERIFIED',
      pointsDelta: 50,
      balanceAfter: 50,
      description: 'Verified First Discovery: POTHOLE on Ring Road Expressway near Lajpat Nagar Flyover',
      isSynthetic: true,
      createdAt: new Date(Date.now() - 14 * 86400000),
    },
    {
      idempotencyKey: generateIdempotencyKey(citizenAarav._id, sampleReport1._id, 'QUALITY_PHOTO_EXIF'),
      user: citizenAarav._id,
      report: sampleReport1._id,
      actionType: 'QUALITY_PHOTO_EXIF',
      pointsDelta: 20,
      balanceAfter: 70,
      description: 'Quality Evidence Bonus: Validated camera EXIF GPS match for report REP-2026-DELHI-001',
      isSynthetic: true,
      createdAt: new Date(Date.now() - 14 * 86400000),
    },
    {
      idempotencyKey: generateIdempotencyKey(citizenAarav._id, sampleReport1._id, 'BADGE_BONUS_SCOUT'),
      user: citizenAarav._id,
      report: sampleReport1._id,
      actionType: 'BADGE_BONUS',
      pointsDelta: 25,
      balanceAfter: 95,
      description: 'Milestone Achievement Bonus: Unlocked Civic Scout Badge',
      isSynthetic: true,
      createdAt: new Date(Date.now() - 14 * 86400000),
    },
    {
      idempotencyKey: generateIdempotencyKey(citizenAarav._id, sampleReport1._id, 'CORROBORATION_01'),
      user: citizenAarav._id,
      report: sampleReport1._id,
      actionType: 'CORROBORATION_VERIFIED',
      pointsDelta: 40,
      balanceAfter: 135,
      description: 'Verified Corroboration: Additional photographic evidence for active road issues',
      isSynthetic: true,
      createdAt: new Date(Date.now() - 5 * 86400000),
    },

    // Ananya Sen verified first discovery + EXIF bonus + Simulated Perk Redemption
    {
      idempotencyKey: generateIdempotencyKey(citizenAnanya._id, sampleReport4._id, 'FIRST_REPORT_VERIFIED'),
      user: citizenAnanya._id,
      report: sampleReport4._id,
      actionType: 'FIRST_REPORT_VERIFIED',
      pointsDelta: 50,
      balanceAfter: 50,
      description: 'Verified First Discovery: MANHOLE_COLLAPSE at Connaught Place Outer Circle',
      isSynthetic: true,
      createdAt: new Date(Date.now() - 30 * 86400000),
    },
    {
      idempotencyKey: generateIdempotencyKey(citizenAnanya._id, sampleReport4._id, 'QUALITY_PHOTO_EXIF'),
      user: citizenAnanya._id,
      report: sampleReport4._id,
      actionType: 'QUALITY_PHOTO_EXIF',
      pointsDelta: 20,
      balanceAfter: 70,
      description: 'Quality Evidence Bonus: Validated camera EXIF GPS match for report REP-2026-DELHI-004',
      isSynthetic: true,
      createdAt: new Date(Date.now() - 30 * 86400000),
    },
    {
      idempotencyKey: generateIdempotencyKey(citizenAnanya._id, sampleReport9._id, 'FIRST_REPORT_02'),
      user: citizenAnanya._id,
      report: sampleReport9._id,
      actionType: 'FIRST_REPORT_VERIFIED',
      pointsDelta: 50,
      balanceAfter: 120,
      description: 'Verified First Discovery: SEVERE_CRACK on Barakhamba Road',
      isSynthetic: true,
      createdAt: new Date(Date.now() - 20 * 86400000),
    },
    {
      idempotencyKey: generateIdempotencyKey(citizenAnanya._id, sampleReport9._id, 'QUALITY_PHOTO_02'),
      user: citizenAnanya._id,
      report: sampleReport9._id,
      actionType: 'QUALITY_PHOTO_EXIF',
      pointsDelta: 20,
      balanceAfter: 140,
      description: 'Quality Evidence Bonus: Camera EXIF match for report REP-2026-DELHI-009',
      isSynthetic: true,
      createdAt: new Date(Date.now() - 20 * 86400000),
    },
    {
      idempotencyKey: generateIdempotencyKey(citizenAnanya._id, sampleReport9._id, 'COMMUNITY_LEGEND_BONUS'),
      user: citizenAnanya._id,
      report: null,
      actionType: 'BADGE_BONUS',
      pointsDelta: 70,
      balanceAfter: 210,
      description: 'Milestone Achievement Bonus: Unlocked Community Legend Badge (150+ pts)',
      isSynthetic: true,
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
  ];

  for (const entry of ledgersData) {
    await RewardLedger.create(entry);
    log(`   💳 Ledger [${entry.actionType}] User: ${entry.user} | Delta: ${entry.pointsDelta > 0 ? '+' : ''}${entry.pointsDelta} | Bal: ${entry.balanceAfter}`);
  }
  log(`   ✔ Seeded ${ledgersData.length} immutable ledger transactions with unique SHA-256 idempotency keys.\n`);

  log('================================================================================');
  log('🎉 SYNTHETIC SEED COMPLETED SUCCESSFULLY!');
  log(`   • Citizen Accounts:  5 (${SYNTHETIC_USERS.filter((u) => u.role === 'citizen').map((u) => u.email).join(', ')})`);
  log(`   • Municipal Staff:   2 (admin@roadwise.ai, inspector@roadwise.ai)`);
  log(`   • Ground-Truth Issues: ${createdIssues.length} unique road defects`);
  log(`   • Citizen Reports:   ${reportsData.length} (including duplicates, EXIF matches, and location anomalies)`);
  log(`   • Vehicular Accidents: ${accidentsData.length} (across all 4 attribution tiers)`);
  log(`   • Municipal Crews:   4 specialized road repair teams`);
  log(`   • Reward Ledgers:    ${ledgersData.length} append-only audit entries`);
  log('================================================================================\n');

  return {
    success: true,
    usersCount: SYNTHETIC_USERS.length,
    issuesCount: createdIssues.length,
    reportsCount: reportsData.length,
    accidentsCount: accidentsData.length,
    ledgersCount: ledgersData.length,
  };
}

// Standalone CLI Execution: node src/seed/seedSyntheticData.js
if (process.argv[1]?.endsWith('seedSyntheticData.js')) {
  (async () => {
    try {
      await connectDB();
      await seedSyntheticData();
      await closeDB();
      process.exit(0);
    } catch (err) {
      console.error('❌ Failed to seed synthetic dataset:', err);
      process.exit(1);
    }
  })();
}
