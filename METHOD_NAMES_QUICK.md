# Method Names - Quick Reference for Presentation

## When They Ask: "What methods/algorithms did you use?"

---

## Main Algorithm

**"The core ranking algorithm is called `rank_candidates()` - it's a multi-criteria decision analysis system using a weighted sum model."**

---

## The 5 Scoring Functions

**"We have 5 specialized scoring functions:**

1. **`score_experience_quality()`** - Evaluates work experience (35 points)
2. **`score_technical_skills()`** - Matches skills to requirements (25 points)
3. **`score_projects_impact()`** - Assesses project quality (20 points)
4. **`score_education_certifications()`** - Evaluates education (10 points)
5. **`score_signal_consistency()`** - Checks CV coherence (10 points)

**Each function returns a score and detailed explanation."**

---

## Helper Functions

**"We use several helper functions:**

- **`get_company_tier()`** - Determines company reputation tier
- **`match_skills()`** - Matches candidate skills to required skills
- **`extract_duration_months()`** - Calculates experience duration
- **`normalize_skill()`** - Normalizes skill names for matching
- **`normalize_company_name()`** - Standardizes company names"

---

## Algorithm Type

**"It's a Multi-Criteria Decision Analysis (MCDA) system using a Weighted Sum Model approach. It's rule-based and explainable - not a black-box machine learning model."**

---

## Technical Implementation

**"The system is implemented in Python 3.8+ using:**
- Standard library for data processing (`json`, `re`, `datetime`)
- Pure algorithmic approach (no ML dependencies for ranking)
- Structured scoring functions with clear logic flow"

---

## Data Structures

**"We use:**
- **`COMPANY_TIERS` dictionary** - Maps companies to reputation tiers
- **`RECOGNIZED_CERTIFICATIONS` list** - List of industry-standard certifications
- **Candidate data structures** - Structured dictionaries for experiences, projects, skills"

---

## Quick Answer Template

**"The ranking system uses the `rank_candidates()` function which calls 5 specialized scoring methods:**

1. `score_experience_quality()` - 35 points
2. `score_technical_skills()` - 25 points  
3. `score_projects_impact()` - 20 points
4. `score_education_certifications()` - 10 points
5. `score_signal_consistency()` - 10 points

**Each method uses helper functions like `get_company_tier()`, `match_skills()`, and `extract_duration_months()` to calculate objective scores. The algorithm is a Multi-Criteria Decision Analysis system - transparent, explainable, and reproducible."**

---

## If They Want Code Details:

**"All methods are in `cv_ranking.py`. The main entry point is `rank_candidates()` which:**
1. Iterates through each candidate
2. Calls all 5 scoring functions
3. Sums the scores
4. Sorts by total score
5. Applies tie-breaking rules
6. Returns ranked list with explanations

**Every function is documented with clear docstrings explaining the logic."**
