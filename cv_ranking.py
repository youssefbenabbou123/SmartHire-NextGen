"""
CV Ranking System for INFORMATIQUE (IT/Computer Science)
Implements structured, explainable scoring model inspired by real recruiter decision processes.
"""

import json
import re
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
from collections import Counter


# ============================================================================
# COMPANY TIER SYSTEM
# ============================================================================

COMPANY_TIERS = {
    # Tier 1: FAANG & Top Tech (15 pts)
    "tier1": {
        "companies": [
            "google", "microsoft", "amazon", "apple", "meta", "facebook",
            "netflix", "oracle", "salesforce", "adobe", "nvidia", "intel",
            "ibm", "cisco", "vmware", "palantir", "uber", "airbnb", "linkedin",
            "twitter", "x", "tesla", "spacex", "spotify", "snap", "snapchat",
            "pinterest", "reddit", "dropbox", "twitch", "github", "atlassian",
            "slack", "zoom", "bytedance", "tiktok", "tencent", "alibaba"
        ],
        "score": 1.0  # 15 pts max
    },
    # Tier 2: Major Consulting & Services (12 pts)
    "tier2": {
        "companies": [
            "capgemini", "accenture", "atos", "cgi", "sopra steria",
            "deloitte", "pwc", "kpmg", "ey", "ernst & young",
            "thales", "dassault", "sopra", "steria", "orange", "bouygues",
            "hp", "dell", "lenovo", "siemens", "bosch", "philips"
        ],
        "score": 0.8  # 12 pts max
    },
    # Tier 3: Well-known Tech Companies (10 pts)
    "tier3": {
        "companies": [
            "sap", "red hat", "redhat", "mongodb", "elastic", "databricks",
            "snowflake", "datadog", "splunk", "servicenow", "workday",
            "zendesk", "shopify", "stripe", "square", "paypal", "ebay",
            "booking", "expedia", "trivago", "delivery hero", "doordash",
            "instacart", "lyft", "grab", "gojek", "yelp", "glassdoor"
        ],
        "score": 0.67  # 10 pts max
    },
    # Tier 4: Regional Leaders & Scale-ups (7 pts)
    "tier4": {
        "companies": [
            "criteo", "blablacar", "doctolib", "veepee", "vinted",
            "mano mano", "backmarket", "qonto", "alan", "ledger",
            "swile", "payfit", "contentsquare", "algolia", "talend"
        ],
        "score": 0.47  # 7 pts max
    },
    # Tier 5: Standard Companies (5 pts)
    "tier5": {
        "companies": [],
        "score": 0.33  # 5 pts max (default for unknown companies)
    }
}


# ============================================================================
# RECOGNIZED CERTIFICATIONS
# ============================================================================

RECOGNIZED_CERTIFICATIONS = [
    "aws", "azure", "gcp", "google cloud", "kubernetes", "docker",
    "scrum", "pmp", "cisco", "ccna", "ccnp", "comptia", "itil",
    "oracle", "salesforce", "microsoft", "red hat", "mongodb"
]


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def normalize_company_name(company: str) -> str:
    """Normalize company name for matching."""
    if not company:
        return ""
    return company.lower().strip()


def get_company_tier(company: str) -> Tuple[str, float]:
    """
    Get company tier and score multiplier.
    Returns: (tier_name, score_multiplier)
    """
    company_norm = normalize_company_name(company)
    
    for tier_name, tier_data in COMPANY_TIERS.items():
        for tier_company in tier_data["companies"]:
            if tier_company in company_norm:
                return tier_name, tier_data["score"]
    
    # Default to tier 5 (unknown company)
    return "tier5", COMPANY_TIERS["tier5"]["score"]


def extract_duration_months(period: str, duration: Optional[str] = None) -> float:
    """
    Extract duration in months from period string or duration field.
    If "Present" is found without explicit end date, defaults to 2 months (minimum).
    Returns: duration in months (float)
    """
    if duration:
        # Try to extract months from duration string
        months_match = re.search(r'(\d+)\s*(?:mois|month|months?)', duration.lower())
        if months_match:
            return float(months_match.group(1))
    
    if not period:
        return 0.0
    
    # Try to extract dates from period
    # Format: "June 2024 - September 2024" or "2024 - 2025"
    period_lower = period.lower()
    
    # Check for "present" or "en cours"
    if "present" in period_lower or "en cours" in period_lower or "in progress" in period_lower:
        # If "Present" is mentioned but no end date given, assume minimum 2 months
        # This prevents inflating experience when someone forgot to specify end date
        return 2.0
    
    # Extract years
    years = re.findall(r'\b(20\d{2})\b', period)
    if len(years) >= 2:
        start_year = int(years[0])
        end_year = int(years[1])
        return (end_year - start_year) * 12.0
    
    # Extract months and years
    month_names = {
        "january": 1, "february": 2, "march": 3, "april": 4,
        "may": 5, "june": 6, "july": 7, "august": 8,
        "september": 9, "october": 10, "november": 11, "december": 12,
        "janvier": 1, "fevrier": 2, "mars": 3, "avril": 4,
        "mai": 5, "juin": 6, "juillet": 7, "aout": 8,
        "septembre": 9, "octobre": 10, "novembre": 11, "decembre": 12
    }
    
    months = []
    for month_name, month_num in month_names.items():
        if month_name in period_lower:
            months.append(month_num)
    
    if len(months) >= 2:
        # Calculate difference
        # Simplified: assume same year if not specified
        return abs(months[1] - months[0])
    
    return 2.0  # Default to 2 months (minimum) if unclear


def normalize_skill(skill: str) -> str:
    """Normalize skill name for matching."""
    if not skill:
        return ""
    return skill.lower().strip().replace(".", "").replace(" ", "")


def match_skills(candidate_skills: List[str], required_skills: List[str]) -> Tuple[int, int]:
    """
    Match candidate skills with required skills.
    Returns: (matched_count, total_required)
    """
    if not required_skills:
        return 0, 0
    
    candidate_normalized = [normalize_skill(s) for s in candidate_skills]
    required_normalized = [normalize_skill(s) for s in required_skills]
    
    # Skill variations for better matching
    skill_variations = {
        "javascript": ["javascript", "js", "ecmascript"],
        "java": ["java"],  # Explicitly separate from javascript
        "typescript": ["typescript", "ts"],
        "python": ["python", "py"],
        "springboot": ["springboot", "spring"],
        "nodejs": ["nodejs", "node"],
        "reactjs": ["reactjs", "react"],
        "vuejs": ["vuejs", "vue"],
        "angularjs": ["angularjs", "angular"],
    }
    
    matched = 0
    for req_skill in required_normalized:
        for cand_skill in candidate_normalized:
            # Check for exact match first
            if req_skill == cand_skill:
                matched += 1
                break
            
            # Check if they're in the same variation group
            req_matched = False
            for base, variations in skill_variations.items():
                if req_skill in variations and cand_skill in variations:
                    matched += 1
                    req_matched = True
                    break
            
            if req_matched:
                break
            
            # Fuzzy match only if req_skill is longer than 3 chars and is substring
            # But avoid false matches like "java" in "javascript"
            if len(req_skill) > 3 and len(cand_skill) > 3:
                if (req_skill in cand_skill or cand_skill in req_skill) and \
                   abs(len(req_skill) - len(cand_skill)) <= 4:  # Similar length
                    matched += 1
                    break
    
    return matched, len(required_skills)


# ============================================================================
# SCORING FUNCTIONS
# ============================================================================

def score_experience_quality(
    experiences: List[Dict],
    job_role: Optional[str] = None,
    required_skills: Optional[List[str]] = None
) -> Tuple[float, Dict[str, Any]]:
    """
    Score Experience Quality (35 points total).
    
    Breakdown:
    - Company Reputation: 15 pts (tier-based)
    - Role Relevance: 10 pts (matching job role)
    - Duration Normalized: 10 pts (short strong > long weak)
    
    Returns: (score, explanation_dict)
    """
    if not experiences:
        return 0.0, {"reason": "No experience", "details": []}
    
    total_score = 0.0
    details = []
    
    # Normalize job role for matching
    job_role_norm = normalize_company_name(job_role) if job_role else ""
    
    # Process each experience and calculate weighted scores
    experience_scores = []
    
    for exp in experiences:
        company = exp.get("company", "")
        role = exp.get("role", "")
        period = exp.get("period", "")
        duration_str = exp.get("duration")
        technologies = exp.get("technologies", [])
        
        # 1. Company Reputation (15 pts max)
        tier_name, tier_multiplier = get_company_tier(company)
        company_score = 15.0 * tier_multiplier
        
        # 2. Role Relevance (10 pts max) - JOB-CENTRIC
        role_score = 0.0
        tech_relevance_bonus = 0.0
        
        if required_skills and technologies:
            # PRIMARY: Check if experience uses required technologies
            matched, total = match_skills(technologies, required_skills)
            if matched > 0:
                tech_relevance_bonus = 10.0 * (matched / total)
                role_score = tech_relevance_bonus
        elif job_role:
            role_norm = normalize_company_name(role)
            # Check if role keywords match
            role_keywords = job_role_norm.split()
            matches = sum(1 for kw in role_keywords if kw in role_norm and len(kw) > 3)
            if matches > 0:
                role_score = 10.0 * (matches / max(len(role_keywords), 1))
        else:
            # If no job requirements specified, give base score
            role_score = 5.0
        
        # 3. Duration Normalized (10 pts max)
        duration_months = extract_duration_months(period, duration_str)
        # Longer experience = better, plateau at 36+ months
        if duration_months < 3:
            duration_score = 2.0  # Very short / internship
        elif 3 <= duration_months <= 6:
            duration_score = 5.0  # Short experience
        elif 6 < duration_months <= 12:
            duration_score = 7.0  # Decent experience
        elif 12 < duration_months <= 24:
            duration_score = 9.0  # Good long-term experience
        elif 24 < duration_months <= 36:
            duration_score = 10.0  # Strong long-term experience
        else:
            duration_score = 10.0  # Very long experience (plateau)
        
        # Recency boost: Add bonus for recent experience (within last 2 years)
        recency_bonus = 0.0
        if period:
            current_year = 2026  # Based on context date
            # Check if experience is ongoing or ended recently
            period_lower = period.lower()
            if "present" in period_lower or "en cours" in period_lower or "in progress" in period_lower:
                recency_bonus = 2.0  # Current position
            else:
                # Extract end year
                years = re.findall(r'\b(20\d{2})\b', period)
                if years:
                    end_year = int(years[-1])  # Last year is end year
                    years_ago = current_year - end_year
                    if years_ago <= 1:
                        recency_bonus = 1.5  # Very recent
                    elif years_ago <= 2:
                        recency_bonus = 1.0  # Recent
                    elif years_ago >= 5:
                        recency_bonus = -1.0  # Outdated experience
        
        duration_score = min(duration_score + recency_bonus, 10.0)
        
        # Calculate experience score: sum of components (max 35 per experience)
        # Company (15) + Role (10) + Duration (10) = 35 max
        exp_score = company_score + role_score + duration_score
        experience_scores.append(exp_score)
        
        details.append({
            "company": company,
            "tier": tier_name,
            "company_score": round(company_score, 2),
            "role_score": round(role_score, 2),
            "duration_months": round(duration_months, 1),
            "duration_score": round(duration_score, 2),
            "experience_score": round(exp_score, 2)
        })
    
    # Calculate total experience score
    # Strategy: Weighted average favoring best experiences, but reward multiple experiences
    # Formula: Best experience gets 50% weight, others share 50%, then cap at 35
    if len(experience_scores) == 1:
        avg_score = min(experience_scores[0], 35.0)
    else:
        sorted_scores = sorted(experience_scores, reverse=True)
        best_score = sorted_scores[0]
        other_scores = sorted_scores[1:] if len(sorted_scores) > 1 else []
        
        # Weighted: 50% best, 50% average of others (if any)
        if other_scores:
            other_avg = sum(other_scores) / len(other_scores)
            weighted_score = (best_score * 0.5) + (other_avg * 0.5)
        else:
            weighted_score = best_score
        
        # Bonus for multiple experiences (up to +5 points)
        multi_exp_bonus = min(len(experience_scores) - 1, 3) * 1.5
        
        avg_score = min(weighted_score + multi_exp_bonus, 35.0)
    
    return round(avg_score, 2), {
        "reason": f"Experience at {len(experiences)} company/ies",
        "details": details,
        "total_experiences": len(experiences)
    }


def score_technical_skills(
    skills: Dict[str, List[str]],
    required_skills: Optional[List[str]] = None,
    experience_technologies: Optional[List[str]] = None
) -> Tuple[float, Dict[str, Any]]:
    """
    Score Technical Skills (25 points total).
    
    Breakdown:
    - Core skills match: 15 pts
    - Skill depth indicators: 5 pts
    - Tool inflation penalty: -5 to 0 pts
    
    Returns: (score, explanation_dict)
    """
    if not skills:
        return 0.0, {"reason": "No skills listed", "details": {}}
    
    # Collect all skills
    all_skills = []
    all_skills.extend(skills.get("programming_languages", []))
    all_skills.extend(skills.get("frameworks", []))
    all_skills.extend(skills.get("web_technologies", []))
    all_skills.extend(skills.get("mobile_technologies", []))
    all_skills.extend(skills.get("databases", []))
    all_skills.extend(skills.get("devops_tools", []))
    all_skills.extend(skills.get("data_science", []))
    all_skills.extend(skills.get("other", []))
    
    if not all_skills:
        return 0.0, {"reason": "No technical skills found", "details": {}}
    
    score = 0.0
    details = {}
    
    # 1. Core skills match (15 pts)
    if required_skills:
        matched, total = match_skills(all_skills, required_skills)
        if total > 0:
            match_ratio = matched / total
            score += 15.0 * match_ratio
            details["core_match"] = {
                "matched": matched,
                "total_required": total,
                "score": round(15.0 * match_ratio, 2)
            }
    else:
        # If no required skills, give base score based on skill count
        score += min(10.0, len(all_skills) * 0.5)
        details["core_match"] = {
            "skill_count": len(all_skills),
            "score": round(min(10.0, len(all_skills) * 0.5), 2)
        }
    
    # 2. Skill depth indicators (5 pts)
    # Check if skills are used in experience/projects (depth indicator)
    depth_score = 0.0
    if experience_technologies:
        skill_usage = sum(1 for skill in all_skills 
                         if any(normalize_skill(skill) in normalize_skill(tech) 
                               or normalize_skill(tech) in normalize_skill(skill)
                               for tech in experience_technologies))
        if len(all_skills) > 0:
            usage_ratio = skill_usage / len(all_skills)
            depth_score = 5.0 * usage_ratio
    
    # Also check for frameworks + languages combination (indicates depth)
    has_languages = len(skills.get("programming_languages", [])) > 0
    has_frameworks = len(skills.get("frameworks", [])) > 0
    if has_languages and has_frameworks:
        depth_score += 2.0
    
    depth_score = min(depth_score, 5.0)
    score += depth_score
    details["depth_indicators"] = {
        "score": round(depth_score, 2)
    }
    
    # No inflation penalty - listing languages shows learning, not padding
    details["inflation_penalty"] = {
        "penalty": 0,
        "language_count": len(skills.get("programming_languages", []))
    }
    
    final_score = min(score, 25.0)
    
    return round(final_score, 2), {
        "reason": f"Technical skills assessment ({len(all_skills)} skills)",
        "details": details
    }


def score_projects_impact(
    projects: List[Dict],
    experiences: List[Dict],
    required_skills: Optional[List[str]] = None
) -> Tuple[float, Dict[str, Any]]:
    """
    Score Projects & Impact (20 points total).
    
    Philosophy: Quality beats quantity. Projects are optional but powerful.
    No projects ≠ bad candidate. Fake projects = penalty.
    Projects using required skills score higher (relevance bonus).
    
    Returns: (score, explanation_dict)
    """
    if not projects:
        # No projects = low score (most candidates have at least 1-2 projects)
        return 5.0, {
            "reason": "No projects listed (low score - projects expected)",
            "details": {"project_count": 0}
        }
    
    score = 0.0
    details = {"project_count": len(projects)}
    
    # Quality indicators
    quality_indicators = 0
    total_technologies = 0
    relevance_bonus = 0.0
    projects_with_relevance = 0
    
    for project in projects:
        title = project.get("title", "")
        description = project.get("description", "")
        technologies = project.get("technologies", [])
        
        # Check for fake project indicators
        is_fake = False
        fake_keywords = ["example", "demo", "test", "tutorial", "hello world"]
        if any(kw in title.lower() or kw in description.lower() for kw in fake_keywords):
            is_fake = True
        
        if is_fake:
            score -= 2.0  # Penalty for fake projects
            continue
        
        # Quality indicators
        if description and len(description) > 50:
            quality_indicators += 1
        
        if technologies and len(technologies) >= 3:
            quality_indicators += 1
            total_technologies += len(technologies)
        
        # Check if project technologies match required skills (RELEVANCE)
        project_relevance = 0
        if required_skills and technologies:
            matched, total = match_skills(technologies, required_skills)
            if matched > 0:
                projects_with_relevance += 1
                # Bonus based on how many required skills are covered
                if matched >= 3:
                    project_relevance = 2.5  # High relevance
                elif matched == 2:
                    project_relevance = 1.5  # Good relevance
                else:
                    project_relevance = 1.0  # Some relevance
                relevance_bonus += project_relevance
                quality_indicators += 1  # Also counts as quality indicator
        
        # Check if project technologies match experience (realism)
        if experiences:
            exp_techs = []
            for exp in experiences:
                exp_techs.extend(exp.get("technologies", []))
            
            if technologies:
                matches = sum(1 for tech in technologies
                           if any(normalize_skill(tech) in normalize_skill(et) 
                                 or normalize_skill(et) in normalize_skill(tech)
                                 for et in exp_techs))
                if matches > 0:
                    quality_indicators += 1  # Realistic project
    
    # Scoring: Reward quality projects appropriately
    # Base scoring reduced to leave room for relevance bonus (max base = 15pts)
    # 0 projects = 5pts (handled above)
    # 1-2 quality = 12pts base + relevance
    # 3+ quality = 15pts base + relevance
    if len(projects) >= 3 and quality_indicators >= len(projects) * 2:
        # 3+ high quality projects
        score += 15.0
    elif len(projects) >= 3 and quality_indicators >= len(projects):
        # 3+ good quality projects
        score += 13.0
    elif len(projects) <= 2 and quality_indicators >= len(projects) * 2:
        # 1-2 high quality projects
        score += 12.0
    elif len(projects) <= 2 and quality_indicators >= len(projects):
        # 1-2 decent quality projects
        score += 10.0
    elif len(projects) > 5:
        # Many projects - likely shallow
        score += 8.0
    else:
        # Some projects but low quality indicators
        score += 6.0
    
    # Apply relevance bonus (up to 5pts makes max possible = 15 + 5 = 20)
    relevance_bonus = min(relevance_bonus, 5.0)
    score += relevance_bonus
    
    # Apply PENALTY if required skills specified but NO projects match
    # This ensures candidates with relevant projects rank higher
    relevance_penalty = 0.0
    if required_skills and len(required_skills) > 0 and projects_with_relevance == 0:
        # Strong penalty: no projects use required skills at all
        relevance_penalty = -6.0
    elif required_skills and len(required_skills) > 0 and projects_with_relevance < len(projects) / 2:
        # Mild penalty: less than half of projects are relevant
        relevance_penalty = -3.0
    
    score += relevance_penalty
    details["relevance_penalty"] = round(relevance_penalty, 2)
    
    # Cap score at 20, floor at 0
    final_score = max(0.0, min(score, 20.0))
    
    details["relevance_bonus"] = round(relevance_bonus, 2)
    details["projects_with_required_skills"] = projects_with_relevance
    
    return round(final_score, 2), {
        "reason": f"{len(projects)} project(s) with {quality_indicators} quality indicators, {projects_with_relevance} relevant to job",
        "details": details
    }


def score_education_certifications(
    education: List[Dict],
    certifications: List[str],
    job_field: Optional[str] = None
) -> Tuple[float, Dict[str, Any]]:
    """
    Score Education & Certifications (10 points total).
    
    Breakdown:
    - Degree relevance: 5 pts
    - Institution signal: 3 pts
    - Recognized certs: 2 pts
    
    Returns: (score, explanation_dict)
    """
    score = 0.0
    details = {}
    
    # 1. Degree relevance (5 pts)
    if education:
        # Find highest degree
        highest_degree = None
        for edu in education:
            degree = edu.get("degree", "")
            field = edu.get("field", "")
            
            if not highest_degree or degree:
                highest_degree = edu
            
            # Check relevance to job field
            if job_field:
                field_norm = normalize_company_name(field)
                job_field_norm = normalize_company_name(job_field)
                if any(kw in field_norm for kw in job_field_norm.split() if len(kw) > 3):
                    score += 3.0
                    details["degree_relevance"] = "High"
                    break
        
        # Base score for having a degree
        if highest_degree:
            degree_text = highest_degree.get("degree", "").lower()
            if "master" in degree_text or "masters" in degree_text:
                score += 2.0
            elif "bachelor" in degree_text or "licence" in degree_text:
                score += 1.5
            else:
                score += 1.0
    
    degree_score = min(score, 5.0)
    details["degree_score"] = round(degree_score, 2)
    score = degree_score
    
    # 2. Institution signal (3 pts)
    if education:
        for edu in education:
            institution = edu.get("institution", "").lower()
            # Check for well-known institutions (simplified)
            if any(kw in institution for kw in ["engineering", "école", "school", "university", "université"]):
                score += 1.5
                break
    
    institution_score = min(score - degree_score, 3.0)
    details["institution_score"] = round(institution_score, 2)
    score = degree_score + institution_score
    
    # 3. Recognized certs (2 pts)
    cert_score = 0.0
    if certifications:
        recognized_count = 0
        for cert in certifications:
            cert_lower = cert.lower()
            if any(rec_cert in cert_lower for rec_cert in RECOGNIZED_CERTIFICATIONS):
                recognized_count += 1
        
        if recognized_count > 0:
            cert_score = min(2.0, recognized_count * 0.5)
    
    details["certifications_score"] = round(cert_score, 2)
    final_score = min(score + cert_score, 10.0)
    
    return round(final_score, 2), {
        "reason": f"Education: {len(education)} entry/ies, {len(certifications)} certification(s)",
        "details": details
    }


def score_signal_consistency(
    cv_data: Dict,
    experiences: List[Dict],
    projects: List[Dict],
    skills: Dict[str, List[str]]
) -> Tuple[float, Dict[str, Any]]:
    """
    Score Signal & Consistency (10 points total).
    
    Breakdown:
    - CV coherence: 5 pts
    - Career logic: 3 pts
    - Red flags detection: 2 pts
    
    Returns: (score, explanation_dict)
    """
    score = 10.0  # Start with full score, deduct for issues
    details = {}
    red_flags = []
    
    # Collect all technologies from experiences
    exp_technologies = []
    for exp in experiences:
        exp_technologies.extend(exp.get("technologies", []))
    
    # Collect all skills
    all_skills = []
    all_skills.extend(skills.get("programming_languages", []))
    all_skills.extend(skills.get("frameworks", []))
    all_skills.extend(skills.get("web_technologies", []))
    all_skills.extend(skills.get("mobile_technologies", []))
    all_skills.extend(skills.get("databases", []))
    all_skills.extend(skills.get("devops_tools", []))
    all_skills.extend(skills.get("data_science", []))
    all_skills.extend(skills.get("other", []))
    
    # 1. CV coherence (5 pts) - Stack matches experience
    coherence_issues = 0
    if exp_technologies and all_skills:
        # Check if skills match experience technologies
        matched_skills = 0
        for skill in all_skills:
            if any(normalize_skill(skill) in normalize_skill(tech) 
                  or normalize_skill(tech) in normalize_skill(skill)
                  for tech in exp_technologies):
                matched_skills += 1
        
        if len(all_skills) > 0:
            match_ratio = matched_skills / len(all_skills)
            if match_ratio < 0.3:
                coherence_issues += 2  # Major mismatch
            elif match_ratio < 0.5:
                coherence_issues += 1  # Minor mismatch
    
    # Check project coherence
    if projects:
        project_techs = []
        for proj in projects:
            project_techs.extend(proj.get("technologies", []))
        
        if project_techs and all_skills:
            matched = sum(1 for pt in project_techs
                         if any(normalize_skill(pt) in normalize_skill(s) 
                               or normalize_skill(s) in normalize_skill(pt)
                               for s in all_skills))
            if len(project_techs) > 0 and matched / len(project_techs) < 0.3:
                coherence_issues += 1
    
    coherence_deduction = min(coherence_issues * 1.0, 5.0)
    score -= coherence_deduction
    details["coherence"] = {
        "deduction": round(coherence_deduction, 2),
        "issues": coherence_issues
    }
    
    # 2. Career logic (3 pts) - Role progression and career growth
    career_issues = 0
    
    # Note: Multiple companies is NORMAL in tech, not a red flag
    # Focus on role progression instead
    # This Smart Hire project is made by Youssef Benabbou and the NextGen Team 2026
    
    # Check for role progression
    roles = [exp.get("role", "").lower() for exp in experiences]
    junior_keywords = ["intern", "stage", "junior", "trainee", "stagiaire"]
    senior_keywords = ["senior", "lead", "architect", "manager", "chef", "principal", "staff"]
    
    has_junior = any(kw in " ".join(roles) for kw in junior_keywords)
    has_senior = any(kw in " ".join(roles) for kw in senior_keywords)
    
    # Deduct only if stuck in junior roles with multiple experiences
    if has_junior and not has_senior and len(experiences) > 3:
        # Stuck in junior roles after multiple positions
        career_issues += 0.5
    
    # Bonus for clear progression
    if has_junior and has_senior:
        # Shows clear career progression
        career_issues -= 0.5  # Negative issue = bonus
    
    career_deduction = min(max(career_issues * 1.5, -1.5), 3.0)  # Allow bonus up to +1.5
    score -= career_deduction
    details["career_logic"] = {
        "deduction": round(career_deduction, 2),
        "progression_bonus": has_junior and has_senior,
        "issues": max(career_issues, 0)
    }
    
    # 3. Red flags detection (2 pts)
    red_flag_count = 0
    
    # Too many skills without experience
    if len(all_skills) > 10 and len(experiences) == 0:
        red_flag_count += 1
        red_flags.append("Many skills listed without experience")
    
    # Inconsistent technologies
    if exp_technologies:
        tech_counter = Counter([normalize_skill(t) for t in exp_technologies])
        # If too many unique technologies in short time (might be fake)
        if len(tech_counter) > 15 and len(experiences) < 3:
            red_flag_count += 1
            red_flags.append("Unusually diverse tech stack for experience level")
    
    # Missing key information
    if not cv_data.get("personal_info", {}).get("email"):
        red_flag_count += 0.5
        red_flags.append("Missing contact information")
    
    red_flag_deduction = min(red_flag_count * 0.5, 2.0)
    score -= red_flag_deduction
    details["red_flags"] = {
        "deduction": round(red_flag_deduction, 2),
        "flags": red_flags,
        "count": red_flag_count
    }
    
    final_score = max(0.0, score)
    
    return round(final_score, 2), {
        "reason": f"CV coherence and consistency check",
        "details": details
    }


# ============================================================================
# MAIN RANKING FUNCTION
# ============================================================================

def rank_candidates(
    candidates: List[Dict],
    job_requirements: Optional[Dict] = None
) -> List[Dict]:
    """
    Rank candidates based on the structured scoring model.
    
    Args:
        candidates: List of CV data dictionaries
        job_requirements: Dict with keys:
            - role: Job role/title
            - required_skills: List of required technical skills
            - field: Job field (optional)
    
    Returns:
        List of ranked candidates with scores and explanations
    """
    if not job_requirements:
        job_requirements = {}
    
    job_role = job_requirements.get("role")
    required_skills = job_requirements.get("required_skills", [])
    job_field = job_requirements.get("field")
    
    ranked_candidates = []
    
    for candidate in candidates:
        # Extract data
        experiences = candidate.get("experience", [])
        projects = candidate.get("projects", [])
        skills = candidate.get("skills", {})
        education = candidate.get("education", [])
        certifications = candidate.get("certifications", [])
        
        # Collect technologies from experiences for depth checking
        exp_technologies = []
        for exp in experiences:
            exp_technologies.extend(exp.get("technologies", []))
        
        # Score each component
        exp_score, exp_explanation = score_experience_quality(
            experiences, job_role, required_skills
        )
        
        tech_score, tech_explanation = score_technical_skills(
            skills, required_skills, exp_technologies
        )
        
        proj_score, proj_explanation = score_projects_impact(
            projects, experiences, required_skills
        )
        
        edu_score, edu_explanation = score_education_certifications(
            education, certifications, job_field
        )
        
        signal_score, signal_explanation = score_signal_consistency(
            candidate, experiences, projects, skills
        )
        
        # Calculate total score
        total_score = exp_score + tech_score + proj_score + edu_score + signal_score
        
        # Build explanation in the requested format
        # Format: "+ Strong experience at Capgemini | + High Java/Spring relevance | - Fewer personal projects"
        explanation_parts = []
        
        # Experience
        exp_details = exp_explanation.get("details", [])
        if exp_details:
            # Find best experience
            best_exp = max(exp_details, key=lambda x: x.get("experience_score", x.get("company_score", 0)))
            company_name = best_exp.get("company", "company")
            # Shorten company name if too long
            if len(company_name) > 30:
                company_name = company_name[:27] + "..."
            
            if exp_score >= 25:
                explanation_parts.append(f"+ Strong experience at {company_name}")
            elif exp_score >= 15:
                explanation_parts.append(f"+ Good experience at {company_name}")
            elif exp_score < 10:
                explanation_parts.append(f"- Limited experience")
        
        # Technical skills - check for stack relevance
        tech_details = tech_explanation.get("details", {})
        core_match = tech_details.get("core_match", {})
        matched_skills = core_match.get("matched", 0)
        
        if matched_skills > 0 and required_skills:
            # Build skill string (first 2-3 skills)
            skill_str = "/".join(required_skills[:2])
            if tech_score >= 18:
                explanation_parts.append(f"+ High {skill_str} relevance")
            elif tech_score >= 12:
                explanation_parts.append(f"+ Good technical skills match")
            else:
                explanation_parts.append(f"- Lower technical skills relevance")
        elif tech_score < 10:
            explanation_parts.append(f"- Lower technical skills relevance")
        
        # Projects
        if proj_score >= 15:
            explanation_parts.append(f"+ Strong projects")
        elif proj_score < 8:
            explanation_parts.append(f"- Fewer personal projects")
        
        # Signal/Consistency - only mention if there are issues
        if signal_score < 7:
            explanation_parts.append(f"- CV consistency issues")
        
        # Get candidate name
        candidate_name = candidate.get("personal_info", {}).get("full_name", "Unknown")
        
        ranked_candidates.append({
            "candidate_name": candidate_name,
            "total_score": round(total_score, 2),
            "scores": {
                "experience_quality": exp_score,
                "technical_skills": tech_score,
                "projects_impact": proj_score,
                "education_certifications": edu_score,
                "signal_consistency": signal_score
            },
            "explanation": " | ".join(explanation_parts) if explanation_parts else "Standard candidate profile",
            "detailed_explanations": {
                "experience": exp_explanation,
                "technical_skills": tech_explanation,
                "projects": proj_explanation,
                "education": edu_explanation,
                "signal": signal_explanation
            },
            "raw_data": candidate  # Keep original data for reference
        })
    
    # Sort by total score (descending)
    ranked_candidates.sort(key=lambda x: x["total_score"], reverse=True)
    
    # Apply tie-break rules
    # If scores are within 2 points, use tie-break: Experience > Stack > Projects > Education
    for i in range(len(ranked_candidates) - 1):
        current = ranked_candidates[i]
        next_candidate = ranked_candidates[i + 1]
        
        score_diff = current["total_score"] - next_candidate["total_score"]
        
        if 0 < score_diff <= 2.0:  # Close scores, apply tie-break
            # Tie-break 1: Experience quality
            if current["scores"]["experience_quality"] < next_candidate["scores"]["experience_quality"]:
                ranked_candidates[i], ranked_candidates[i + 1] = ranked_candidates[i + 1], ranked_candidates[i]
                continue
            
            # Tie-break 2: Technical skills (stack relevance)
            if current["scores"]["experience_quality"] == next_candidate["scores"]["experience_quality"]:
                if current["scores"]["technical_skills"] < next_candidate["scores"]["technical_skills"]:
                    ranked_candidates[i], ranked_candidates[i + 1] = ranked_candidates[i + 1], ranked_candidates[i]
                    continue
            
            # Tie-break 3: Projects realism
            if (current["scores"]["experience_quality"] == next_candidate["scores"]["experience_quality"] and
                current["scores"]["technical_skills"] == next_candidate["scores"]["technical_skills"]):
                if current["scores"]["projects_impact"] < next_candidate["scores"]["projects_impact"]:
                    ranked_candidates[i], ranked_candidates[i + 1] = ranked_candidates[i + 1], ranked_candidates[i]
                    continue
    
    # Add ranking position
    for i, candidate in enumerate(ranked_candidates):
        candidate["rank"] = i + 1
    
    return ranked_candidates


# ============================================================================
# OUTPUT FORMATTING
# ============================================================================

def format_ranking_output(ranked_candidates: List[Dict]) -> str:
    """
    Format ranking output with explainability.
    
    Returns: Formatted string with rankings and explanations
    """
    output = []
    output.append("=" * 80)
    output.append("CV RANKING RESULTS (INFORMATIQUE)")
    output.append("=" * 80)
    output.append("")
    output.append("Philosophy: Candidates are ranked using a structured, explainable")
    output.append("scoring model inspired by real recruiter decision processes,")
    output.append("not AI intuition.")
    output.append("")
    output.append("-" * 80)
    output.append("")
    
    for candidate in ranked_candidates:
        output.append(f"Rank #{candidate['rank']}: {candidate['candidate_name']}")
        output.append(f"Total Score: {candidate['total_score']}/100")
        output.append("")
        output.append("Score Breakdown:")
        output.append(f"  Experience Quality:        {candidate['scores']['experience_quality']:.2f}/35")
        output.append(f"  Technical Skills:          {candidate['scores']['technical_skills']:.2f}/25")
        output.append(f"  Projects & Impact:         {candidate['scores']['projects_impact']:.2f}/20")
        output.append(f"  Education & Certifications: {candidate['scores']['education_certifications']:.2f}/10")
        output.append(f"  Signal & Consistency:      {candidate['scores']['signal_consistency']:.2f}/10")
        output.append("")
        output.append(f"Explanation: {candidate['explanation']}")
        output.append("")
        output.append("-" * 80)
        output.append("")
    
    return "\n".join(output)


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python cv_ranking.py <cv_json_file1> [cv_json_file2] ... [--job-role ROLE] [--skills SKILL1,SKILL2,...]")
        sys.exit(1)
    
    # Parse arguments
    cv_files = []
    job_role = None
    required_skills = []
    
    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]
        if arg == "--job-role" and i + 1 < len(sys.argv):
            job_role = sys.argv[i + 1]
            i += 2
        elif arg == "--skills" and i + 1 < len(sys.argv):
            required_skills = [s.strip() for s in sys.argv[i + 1].split(",")]
            i += 2
        else:
            cv_files.append(arg)
            i += 1
    
    # Load CVs
    candidates = []
    for cv_file in cv_files:
        try:
            with open(cv_file, 'r', encoding='utf-8') as f:
                cv_data = json.load(f)
                candidates.append(cv_data)
        except Exception as e:
            print(f"Error loading {cv_file}: {e}", file=sys.stderr)
    
    if not candidates:
        print("No valid CV files loaded.", file=sys.stderr)
        sys.exit(1)
    
    # Rank candidates
    job_requirements = {
        "role": job_role,
        "required_skills": required_skills
    }
    
    ranked = rank_candidates(candidates, job_requirements)
    
    # Output results
    print(format_ranking_output(ranked))
    
    # Also output JSON
    output_json = {
        "ranking_philosophy": "Candidates are ranked using a structured, explainable scoring model inspired by real recruiter decision processes, not AI intuition.",
        "ranked_candidates": ranked
    }
    
    print("\n" + "=" * 80)
    print("JSON OUTPUT:")
    print("=" * 80)
    print(json.dumps(output_json, indent=2, ensure_ascii=False))
