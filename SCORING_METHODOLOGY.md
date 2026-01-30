# CV Ranking System - Scoring Methodology

## Overview

Our CV ranking system uses a **structured, explainable scoring model** inspired by real recruiter decision processes in the IT industry. The system evaluates candidates across **5 key dimensions** with a total score of **100 points**.

---

## Scoring Framework (100 Points Total)

### 1. Experience Quality (35 points)

**Philosophy:** Real-world experience at reputable companies is the strongest indicator of candidate quality.

#### Components:

**a) Company Reputation (15 points)**
- **Tier 1 (FAANG & Top Tech):** 15 points
  - Companies: Google, Microsoft, Amazon, Apple, Meta, Netflix, Oracle, Salesforce, etc.
- **Tier 2 (Major Consulting):** 12 points  
  - Companies: Capgemini, Accenture, Atos, Deloitte, PwC, etc.
- **Tier 3 (Well-known Tech):** 10 points
  - Companies: SAP, Red Hat, MongoDB, Databricks, etc.
- **Tier 4 (Regional Leaders):** 7 points
  - Companies: Criteo, BlaBlaCar, Doctolib, etc.
- **Tier 5 (Standard Companies):** 5 points
  - All other companies

**b) Role Relevance (10 points)**
- **Technology Match:** If experience uses required technologies → up to 10 points
- **Role Keyword Match:** If job role keywords match experience role → proportional score
- **Base Score:** 5 points if no specific requirements

**c) Duration & Recency (10 points)**
- **Duration Scoring:**
  - < 3 months: 2 points (internship/short)
  - 3-6 months: 5 points
  - 6-12 months: 7 points
  - 12-24 months: 9 points
  - 24-36 months: 10 points
  - 36+ months: 10 points (plateau)
- **Recency Bonus:**
  - Current position: +2 points
  - Within 1 year: +1.5 points
  - Within 2 years: +1 point
  - 5+ years ago: -1 point (outdated)

**Multiple Experience Bonus:** +1.5 points per additional experience (max +4.5)

---

### 2. Technical Skills (25 points)

**Philosophy:** Skills must match job requirements, and depth matters more than breadth.

#### Components:

**a) Core Skills Match (15 points)**
- Calculates ratio: `(Matched Required Skills / Total Required Skills) × 15`
- Uses intelligent matching (handles variations: "JS" = "JavaScript", "React" = "ReactJS")
- If no requirements specified: Base score of 10 points based on skill count

**b) Skill Depth Indicators (5 points)**
- **Usage in Experience:** Skills used in work experience → up to 5 points
- **Frameworks + Languages:** Having both programming languages AND frameworks → +2 points bonus

**c) No Inflation Penalty**
- Listing many languages is not penalized (shows learning ability)

---

### 3. Projects & Impact (20 points)

**Philosophy:** Quality beats quantity. Projects demonstrate practical application of skills.

#### Components:

**Base Scoring:**
- **0 projects:** 5 points (low - projects expected)
- **1-2 high quality:** 12 points
- **1-2 decent quality:** 10 points
- **3+ high quality:** 15 points
- **3+ good quality:** 13 points
- **5+ projects:** 8 points (likely shallow)

**Quality Indicators:**
- Detailed description (>50 chars): +1 indicator
- Multiple technologies (≥3): +1 indicator
- Technologies match required skills: +1 indicator
- Technologies match experience (realism): +1 indicator

**Relevance Bonus (up to +5 points):**
- Projects using required skills get bonus:
  - 3+ required skills: +2.5 per project
  - 2 required skills: +1.5 per project
  - 1 required skill: +1.0 per project

**Relevance Penalty:**
- No projects match required skills: -6 points
- Less than half match: -3 points

**Fake Project Detection:**
- Projects with keywords like "example", "demo", "tutorial" → -2 points penalty

---

### 4. Education & Certifications (10 points)

**Philosophy:** Education provides foundation, but experience weighs more.

#### Components:

**a) Degree Relevance (5 points)**
- **Field Match:** Degree field matches job field → +3 points
- **Degree Level:**
  - Master's: +2 points
  - Bachelor's: +1.5 points
  - Other: +1 point

**b) Institution Signal (3 points)**
- Recognized institutions (engineering schools, universities) → +1.5 points

**c) Recognized Certifications (2 points)**
- AWS, Azure, Kubernetes, Docker, Scrum, PMP, Cisco, etc.
- +0.5 points per recognized certification (max 2 points)

---

### 5. Signal & Consistency (10 points)

**Philosophy:** CV quality and coherence matter. Red flags are detected.

#### Components:

**Starting Score:** 10 points (deduct for issues)

**a) CV Coherence (5 points deduction)**
- **Skills vs Experience Mismatch:**
  - <30% skills used in experience: -2 points
  - 30-50% match: -1 point
- **Projects vs Skills Mismatch:**
  - <30% project techs match skills: -1 point

**b) Career Logic (3 points deduction/bonus)**
- **Stuck in Junior Roles:** Multiple experiences but all junior → -0.5 points
- **Clear Progression:** Junior → Senior progression → +1.5 points bonus

**c) Red Flags Detection (2 points deduction)**
- Many skills without experience: -1 point
- Unusually diverse tech stack for experience level: -1 point
- Missing contact information: -0.5 points

---

## Ranking Algorithm

### Total Score Calculation
```
Total Score = Experience (35) + Skills (25) + Projects (20) + Education (10) + Consistency (10)
```

### Tie-Breaking Rules
When scores are within 2 points:
1. **Experience Quality** (highest wins)
2. **Technical Skills** (if experience tied)
3. **Projects Impact** (if both tied)

---

## Key Design Principles

1. **Explainability:** Every score has a clear explanation
2. **Job-Centric:** Scores adapt to job requirements (role, skills)
3. **Fairness:** No bias - purely objective criteria
4. **Recruiter-Inspired:** Based on real hiring decision processes
5. **Transparency:** All scoring logic is visible and auditable

---

## Example Scoring Breakdown

**Candidate A:**
- Experience: 28/35 (Tier 2 company, 2 years, relevant role)
- Skills: 22/25 (4/5 required skills matched)
- Projects: 18/20 (3 quality projects, 2 relevant)
- Education: 8/10 (Master's, relevant field, 1 cert)
- Consistency: 9/10 (minor coherence issue)
- **Total: 85/100**

**Candidate B:**
- Experience: 15/35 (Tier 5 company, 6 months)
- Skills: 18/25 (3/5 required skills)
- Projects: 12/20 (2 decent projects)
- Education: 7/10 (Bachelor's, 1 cert)
- Consistency: 8/10
- **Total: 60/100**

---

## Why This Methodology?

1. **Structured & Objective:** No "black box" AI decisions
2. **Adaptive:** Adjusts to specific job requirements
3. **Explainable:** Recruiters can justify rankings
4. **Fair:** Same criteria for all candidates
5. **Industry-Specific:** Designed for IT/Computer Science roles

---

*This methodology ensures that candidate rankings are transparent, fair, and based on measurable criteria that align with real-world hiring practices in the technology industry.*
