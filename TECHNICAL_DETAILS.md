# Technical Implementation Details

## Core Algorithm: `rank_candidates()`

**Main Function:** `rank_candidates(candidates, job_requirements)`

This is the primary ranking algorithm that orchestrates the entire scoring process.

---

## Scoring Functions (5 Core Methods)

### 1. Experience Quality Scoring
**Function:** `score_experience_quality(experiences, job_role, required_skills)`
- **Returns:** (score: float, explanation: dict)
- **Max Points:** 35
- **Sub-components:**
  - Company tier evaluation via `get_company_tier()`
  - Duration calculation via `extract_duration_months()`
  - Role relevance matching

### 2. Technical Skills Scoring
**Function:** `score_technical_skills(skills, required_skills, experience_technologies)`
- **Returns:** (score: float, explanation: dict)
- **Max Points:** 25
- **Uses:** `match_skills()` for skill matching
- **Uses:** `normalize_skill()` for skill normalization

### 3. Projects & Impact Scoring
**Function:** `score_projects_impact(projects, experiences, required_skills)`
- **Returns:** (score: float, explanation: dict)
- **Max Points:** 20
- **Features:**
  - Fake project detection
  - Quality indicator counting
  - Relevance bonus calculation

### 4. Education & Certifications Scoring
**Function:** `score_education_certifications(education, certifications, job_field)`
- **Returns:** (score: float, explanation: dict)
- **Max Points:** 10
- **Checks:** Degree relevance, institution signal, recognized certifications

### 5. Signal & Consistency Scoring
**Function:** `score_signal_consistency(cv_data, experiences, projects, skills)`
- **Returns:** (score: float, explanation: dict)
- **Max Points:** 10
- **Features:**
  - CV coherence checking
  - Career logic evaluation
  - Red flag detection

---

## Helper Functions

### Company Tier System
**Function:** `get_company_tier(company: str) -> Tuple[str, float]`
- Returns tier name and score multiplier
- Uses `normalize_company_name()` for matching

### Skill Matching
**Function:** `match_skills(candidate_skills, required_skills) -> Tuple[int, int]`
- Returns: (matched_count, total_required)
- Handles skill variations (JS = JavaScript, React = ReactJS)
- Uses `normalize_skill()` for normalization

### Duration Extraction
**Function:** `extract_duration_months(period, duration) -> float`
- Extracts duration in months from date strings
- Handles "Present" and "en cours" cases
- Supports multiple date formats

### Skill Normalization
**Function:** `normalize_skill(skill: str) -> str`
- Normalizes skill names for matching
- Handles variations and typos

---

## Data Structures

### Company Tiers Dictionary
```python
COMPANY_TIERS = {
    "tier1": {"companies": [...], "score": 1.0},  # 15 pts max
    "tier2": {"companies": [...], "score": 0.8},   # 12 pts max
    "tier3": {"companies": [...], "score": 0.67}, # 10 pts max
    "tier4": {"companies": [...], "score": 0.47}, # 7 pts max
    "tier5": {"companies": [], "score": 0.33}     # 5 pts max
}
```

### Recognized Certifications List
```python
RECOGNIZED_CERTIFICATIONS = [
    "aws", "azure", "gcp", "kubernetes", "docker",
    "scrum", "pmp", "cisco", "ccna", "ccnp", ...
]
```

---

## Algorithm Flow

1. **Input:** List of candidate CVs + Job requirements
2. **For each candidate:**
   - Extract: experiences, projects, skills, education, certifications
   - Call `score_experience_quality()`
   - Call `score_technical_skills()`
   - Call `score_projects_impact()`
   - Call `score_education_certifications()`
   - Call `score_signal_consistency()`
3. **Calculate:** Total score = sum of all 5 components
4. **Sort:** Candidates by total score (descending)
5. **Apply:** Tie-breaking rules if scores within 2 points
6. **Output:** Ranked list with explanations

---

## Tie-Breaking Algorithm

When scores are within 2 points:
1. Compare `experience_quality` scores
2. If tied, compare `technical_skills` scores
3. If still tied, compare `projects_impact` scores
4. If still tied, compare `education_certifications` scores

---

## Technical Stack

**Language:** Python 3.8+
**Key Libraries:**
- Standard library: `json`, `re`, `datetime`, `collections`
- No external ML/AI dependencies for ranking (pure algorithmic)

**CV Parsing:**
- `parse_cv_image()` - OCR + Mistral AI parsing
- `parse_cv_with_mistral()` - AI-powered extraction
- Uses Tesseract OCR + Ollama (Mistral AI)

---

## Method Names Summary

**Main Algorithm:**
- `rank_candidates()` - Primary ranking function

**Scoring Functions:**
- `score_experience_quality()`
- `score_technical_skills()`
- `score_projects_impact()`
- `score_education_certifications()`
- `score_signal_consistency()`

**Helper Functions:**
- `get_company_tier()`
- `match_skills()`
- `extract_duration_months()`
- `normalize_skill()`
- `normalize_company_name()`

**Output Formatting:**
- `format_ranking_output()`

---

## Algorithm Type

**Classification:** Multi-criteria Decision Analysis (MCDA)
**Approach:** Weighted Sum Model
**Style:** Rule-based, Explainable AI
**Paradigm:** Structured Scoring (not machine learning)

---

## Complexity

- **Time Complexity:** O(n × m) where n = candidates, m = average data points per candidate
- **Space Complexity:** O(n) for storing ranked results
- **Scalability:** Handles hundreds of candidates efficiently

---

## Validation

- **Reproducibility:** Same input = same output (deterministic)
- **Transparency:** All scoring logic is visible in code
- **Auditability:** Every score has detailed explanation
- **Configurability:** Weights and criteria can be adjusted
