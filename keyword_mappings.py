"""
Keyword Training/Mapping System
Maps OCR variations to standard keywords for better CV parsing
"""

# Section keyword mappings - maps variations to standard section names
SECTION_KEYWORDS = {
    "education": [
        "education", "educ", "formation", "form", "academic", "academique",
        "diploma", "diplome", "degree", "degrees", "studies", "etudes",
        "university", "universite", "school", "ecole", "college", "college"
    ],
    "experience": [
        "experience", "exp", "experiences", "work", "travail", "employment",
        "emploi", "career", "carriere", "professional", "professionnel",
        "history", "historique", "positions", "postes", "jobs"
    ],
    "projects": [
        "project", "projects", "projet", "projets", "portfolio", "portefolio",
        "works", "realisations", "realization", "achievements", "accomplissements"
    ],
    "skills": [
        "skills", "skill", "competences", "competence", "technical", "technique",
        "technologies", "technology", "tech", "tools", "outils", "expertise",
        "abilities", "capacites", "know-how", "savoir-faire"
    ],
    "certifications": [
        "certification", "certifications", "certificat", "certificats", "certif",
        "certifcations", "certifcation",  # OCR typos
        "cert", "certs", "credentials", "credential", "license", "licence",
        "diploma", "diplome", "qualification", "qualifications", "badge", "badges"
    ],
    "languages": [
        "language", "languages", "langue", "langues", "linguistic", "linguistique",
        "lang", "langs", "speaking", "parle", "bilingual", "bilingue"
    ],
    "soft_skills": [
        "soft skills", "softskill", "softskills", "personal", "personnel",
        "interpersonal", "interpersonnel", "traits", "caracteristiques",
        "attributes", "attributs", "qualities", "qualites"
    ],
    "contact": [
        "contact", "contacts", "info", "information", "informations",
        "details", "coordonnees", "address", "adresse", "phone", "telephone",
        "email", "mail", "e-mail", "tel", "mobile", "cell"
    ]
}

# Skill normalization - maps variations to standard skill names
SKILL_NORMALIZATIONS = {
    # Programming Languages
    "python": ["python", "py", "python3", "python2"],
    "javascript": ["javascript", "js", "ecmascript", "nodejs", "node.js", "node"],
    "typescript": ["typescript", "ts"],
    "java": ["java", "jdk", "jvm"],
    "c++": ["c++", "cpp", "c plus plus", "cplusplus"],
    "c#": ["c#", "csharp", "c sharp", "dotnet", ".net"],
    
    # Frameworks
    "react": ["react", "reactjs", "react.js", "react js"],
    "react native": ["react native", "reactnative", "react-native"],
    "node.js": ["node.js", "nodejs", "node", "express"],
    "express": ["express", "express.js", "expressjs"],
    "django": ["django", "djangoframework"],
    "flask": ["flask", "flaskframework"],
    "angular": ["angular", "angularjs", "angular.js"],
    "vue.js": ["vue", "vue.js", "vuejs"],
    
    # Databases
    "postgresql": ["postgresql", "postgres", "postgresql", "pg"],
    "mysql": ["mysql", "mariadb"],
    "mongodb": ["mongodb", "mongo", "nosql"],
    "sqlite": ["sqlite", "sqlite3"],
    
    # Tools & DevOps
    "git": ["git", "github", "gitlab", "bitbucket"],
    "docker": ["docker", "dockerfile", "containers"],
    "ci/cd": ["ci/cd", "cicd", "ci cd", "continuous integration", "jenkins", "github actions"],
    "aws": ["aws", "amazon web services", "amazon aws"],
    "azure": ["azure", "microsoft azure"],
    
    # Methodologies
    "agile": ["agile", "scrum", "kanban", "agile scrum"],
    "rest": ["rest", "rest api", "restful", "restapi"],
    "api": ["api", "apis", "web services", "webservices"],
}

def normalize_section_keyword(text):
    """
    Normalize section keywords - find which section a text belongs to
    Returns: (section_name, confidence) or (None, 0)
    """
    text_lower = text.lower().strip()
    
    # Direct match first
    for section, keywords in SECTION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return section, 1.0
    
    # Fuzzy matching for common OCR errors
    # Common OCR mistakes: o->0, i->1, e->c, etc.
    text_normalized = text_lower.replace('0', 'o').replace('1', 'i').replace('5', 's')
    
    for section, keywords in SECTION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_normalized:
                return section, 0.8
    
    return None, 0

def normalize_skill(skill):
    """
    Normalize a skill name to its standard form
    Returns: normalized skill name
    """
    skill_lower = skill.lower().strip()
    
    # Direct match
    for standard, variations in SKILL_NORMALIZATIONS.items():
        if skill_lower in variations or skill_lower == standard:
            return standard
    
    # Check if skill contains any variation
    for standard, variations in SKILL_NORMALIZATIONS.items():
        for variation in variations:
            if variation in skill_lower or skill_lower in variation:
                return standard
    
    # Return original if no match found
    return skill

def find_section_in_text(text, section_name):
    """
    Find section in text using keyword variations
    Returns: (found, confidence, matched_keyword)
    """
    text_lower = text.lower()
    keywords = SECTION_KEYWORDS.get(section_name, [])
    
    best_match = None
    best_confidence = 0
    
    for keyword in keywords:
        if keyword in text_lower:
            confidence = len(keyword) / max(len(keyword), 5)  # Longer matches = higher confidence
            if confidence > best_confidence:
                best_confidence = confidence
                best_match = keyword
    
    return best_match is not None, best_confidence, best_match

def get_all_keyword_variations(section_name):
    """Get all keyword variations for a section"""
    return SECTION_KEYWORDS.get(section_name, [])
