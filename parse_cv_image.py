"""
Standalone CV parser that accepts an image path as command line argument
Outputs JSON to stdout
"""

import sys
import json
import os
from PIL import Image
import pytesseract
import re
from keyword_mappings import (
    normalize_section_keyword,
    normalize_skill,
    find_section_in_text,
    SECTION_KEYWORDS
)

# Try to import Ollama for local Mistral
try:
    import ollama
    HAS_OLLAMA = True
except ImportError:
    HAS_OLLAMA = False
    # Don't print warning at import time to avoid encoding issues

def parse_cv_image(image_path, return_raw_text=False, use_mistral=False, mistral_model="mistral"):
    """Parse CV from image and return structured data
    
    Args:
        image_path: Path to the CV image
        return_raw_text: If True, also returns raw OCR text in result
        use_mistral: If True, use Mistral AI via Ollama for parsing (requires Ollama running locally)
        mistral_model: Ollama model name (default: "mistral")
    
    Returns:
        Dictionary with parsed CV data, optionally including raw OCR text
    """
    
    
    # ==== OCR Function ====
    def get_ocr_text(img_path, config=''):
        img = Image.open(img_path)
        try:
            return pytesseract.image_to_string(img, lang="fra+eng", config=config)
        except:
            return pytesseract.image_to_string(img, lang="fra+eng")
    
    # Run extraction
    text_layout = get_ocr_text(image_path)
    text_raw = get_ocr_text(image_path, config='--psm 6')
    
    # Clean texts
    text_layout_clean = text_layout.replace("\\n", "\n").replace("\r", "")
    text_raw_clean = text_raw.replace("\\n", "\n").replace("\r", "")
    
    # Use Mistral if requested
    if use_mistral and HAS_OLLAMA:
        try:
            # Use raw text (PSM 6) as it's often more readable
            result = parse_cv_with_mistral(text_raw_clean, mistral_model)
            
            # Add raw text if requested
            if return_raw_text:
                result["_raw_ocr"] = {
                    "layout_text": text_layout,
                    "raw_text": text_raw,
                    "layout_text_clean": text_layout_clean,
                    "raw_text_clean": text_raw_clean
                }
            
            return result
        except Exception as e:
            print(f"⚠️  Warning: Mistral parsing failed, falling back to rule-based parsing: {e}", file=sys.stderr)
            # Fall through to rule-based parsing
    
    # ==== Result structure ====
    result = {
        "name": None,
        "email": [],
        "phone": [],
        "education": [],
        "experiences": [],
        "projects": [],
        "technical_skills": [],
        "soft_skills": [],
        "languages": [],
        "certifications": [],
        "interests": []
    }
    
    # ==== Extract emails (from both - most reliable) ====
    emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w{2,}', text_raw_clean + " " + text_layout_clean)
    result["email"] = sorted(list(set(emails)))
    
    # ==== Extract phone numbers (from both) ====
    phones = re.findall(r'\+?\d{1,4}[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,4}[\s\-]?\d{0,4}', text_raw_clean + " " + text_layout_clean)
    valid_phones = []
    for p in phones:
        digits = re.sub(r'\D', '', p)
        if 9 <= len(digits) <= 14:
            if not re.match(r'^\d{4}[-\s]?\d{4}$', p.strip()):
                valid_phones.append(p.strip())
    result["phone"] = list(set(valid_phones))
    
    # ==== Extract name (from layout - more structured) ====
    layout_lines = text_layout_clean.split('\n')
    for line in layout_lines[:50]:
        line = line.strip()
        if any(header in line.upper() for header in ['CONTACT', 'EMAIL', 'PHONE', 'FORMATION', '@', 'HTTP', 'EDUCATION', 'COMPETENCE']):
            continue
        if line.startswith(('Q ', '@ ', '2 ', '+', '*', '•', '©', 'OBB', '®')):
            continue
        if len(line) < 5 or len(line) > 50:
            continue
        words = line.split()
        if 2 <= len(words) <= 4:
            name_words = [w for w in words if re.match(r'^[A-ZÀ-Ü][a-zà-ü]+$|^[A-ZÀ-Ü]{2,}$', w)]
            if len(name_words) >= 2:
                result["name"] = ' '.join(name_words)
                break
    
    # ==== SKILL EXTRACTION (from both texts) ====
    known_technologies = [
        "Python", "Java", "JavaScript", "TypeScript", "C#", "C\\+\\+", "PHP", "Ruby", "Rust", "Swift", "Kotlin",
        "HTML", "CSS", "SQL", "Langage R", "Scala", "Perl", "Bash", "Shell", "Assembleur", "Langage C",
        "React", "React Native", "ReactJS", "React.js", "React js", "Node.js", "Nodejs", "Node,js", "Express.js", "Express",
        "Angular", "Vue.js", "Vue", "Django", "Flask", "Spring Boot", "Spring",
        "Laravel", "Symfony", "Flutter", "Expo Go", "Expo", "Next.js",
        "Servlets", "MVC2", "MVC", "JDBC", "ADO.NET", "ADO\\.NET", "JSP", "Jakarta EE", "JavaEE",
        "MySQL", "PostgreSQL", "Postgresql", "MongoDB", "Oracle", "SQL Server", "MySQL Server", "SQLite", "Redis", "Firebase",
        "Git", "GitHub", "Github", "GitLab", "Jenkins", "CI/CD", "AWS", "Azure", "GCP", "Jira", "Maven", "Gradle", "npm", "Tomcat",
        "TensorFlow", "PyTorch", "Pandas", "Matplotlib", "Scikit-learn", "Keras",
        "Business Intelligence", "Machine Learning", "Deep Learning", "Tanagra", "RO",
        "Agile", "Agile Scrum", "Scrum", "Kanban", "KanBan", "REST", "API", "Microservices", "Web Services",
        "UML", "MERISE", "Design Patterns", "Figma", "Adobe XD",
        "Uvicorn", "Stripe", "QT Creator", "QT", "FPDF", "Charts", "GoogleForms"
    ]
    
    found_skills = set()
    combined_text = text_raw_clean + "\n" + text_layout_clean
    for tech in known_technologies:
        pattern = rf'\b{tech}\b'
        try:
            if re.search(pattern, combined_text, re.IGNORECASE):
                clean_tech = tech.replace("\\+\\+", "++").replace("\\.", ".").replace(",", ".")
                if clean_tech == "C" and not re.search(r'\bLangage C\b|\bC,|\bC\+\+', combined_text):
                    continue
                normalized = normalize_skill(clean_tech)
                found_skills.add(normalized)
        except:
            pass
    # Special check for C++/C#
    if "C++" in combined_text:
        found_skills.add("C++")
    if "C#" in combined_text:
        found_skills.add("C#")
    
    normalized_skills = [normalize_skill(skill) for skill in found_skills]
    result["technical_skills"] = sorted(list(set(normalized_skills)))
    
    # ==== IMPROVED SECTION EXTRACTION USING REGEX PATTERNS ====
    # Use regex to find sections in raw text (more readable) and extract content
    
    # ==== Extract Education ====
    edu_patterns = [
        r'(?:EDUCATION|FORMATION|EDUC)\s*:?\s*(.*?)(?=EXPERIENCE|PROJET|COMPETENCE|CERTIF|LANGUE|$)', 
        r'(?:EDUCATION|FORMATION|EDUC)\s*:?\s*(.*?)(?=\n\n|\Z)',
    ]
    edu_text = ""
    for pattern in edu_patterns:
        match = re.search(pattern, text_raw_clean, re.IGNORECASE | re.DOTALL)
        if match:
            edu_text = match.group(1).strip()
            break
    
    # If not found in raw, try layout
    if not edu_text:
        layout_lines = text_layout_clean.split('\n')
        edu_section = False
        edu_buffer = []
        for line in layout_lines:
            line_stripped = line.strip()
            section, confidence = normalize_section_keyword(line_stripped)
            if section == "education" and confidence > 0.5:
                edu_section = True
                continue
            if edu_section:
                next_section, _ = normalize_section_keyword(line_stripped)
                if next_section and next_section != "education":
                    break
                if line_stripped and len(line_stripped) > 5:
                    edu_buffer.append(line_stripped)
        edu_text = " ".join(edu_buffer)
    
    # Parse education entries
    if edu_text:
        # Look for education entries with keywords
        edu_entries = re.split(r'(?=Licence|Master|Baccalauréat|Bac\s|Diplôme|Bachelor|Degree|Lére|Faculté)', edu_text, flags=re.IGNORECASE)
        for entry in edu_entries:
            entry = entry.strip()
            if len(entry) > 10:
                # Clean up the entry - remove noise
                entry = re.sub(r'\s+', ' ', entry)
                # Remove common noise patterns
                entry = re.sub(r'\b(CONTACT|EMAIL|PHONE|AACE|SS)\s*[^\s]*', '', entry, flags=re.IGNORECASE)
                entry = re.sub(r'[A-Z]\s*°\s*[A-Z]+\s*\d+', '', entry)  # Remove "A ° SS 7" type noise
                entry = re.sub(r'[©@]\s*[A-Z]+\s*$', '', entry)  # Remove trailing "© AACE s"
                entry = re.sub(r'\*\s*CONTACT\s*\*', '', entry, flags=re.IGNORECASE)
                # Remove patterns like "ve |", "Oo 7 N ©", "2022 - 202 *", trailing "©"
                entry = re.sub(r'\s+ve\s+\|\s+', ' ', entry, flags=re.IGNORECASE)
                entry = re.sub(r'\s+Oo\s+\d+\s+[A-Z]\s+©\s*$', '', entry)
                entry = re.sub(r'\s+\d{4}\s+-\s+\d{3}\s+\*\s*$', '', entry)  # "2022 - 202 *"
                entry = re.sub(r'©\s*$', '', entry)  # Remove trailing ©
                entry = re.sub(r'\*\s*$', '', entry)  # Remove trailing *
                entry = re.sub(r'\s+', ' ', entry).strip()
                if len(entry) > 15:
                    result["education"].append(entry)
    
    # ==== Extract Experiences ====
    # Use layout text first (better structured)
    layout_lines = text_layout_clean.split('\n')
    exp_section = False
    exp_buffer = []
    for line in layout_lines:
        line_stripped = line.strip()
        # Check for experience section header (including "EXPERIENCES PROFESSIONNEL")
        if re.search(r'\b(EXPERIENCE|EXPERIENCES|EXP|PROFESSIONNEL)\s*:?\s*$', line_stripped, re.IGNORECASE):
            exp_section = True
            continue
        # Also check if line contains "EXPERIENCES" followed by "PROFESSIONNEL"
        if re.search(r'EXPERIENCES\s+PROFESSIONNEL', line_stripped, re.IGNORECASE):
            exp_section = True
            continue
        section, confidence = normalize_section_keyword(line_stripped)
        if section == "experience" and confidence > 0.5:
            exp_section = True
            continue
        if exp_section:
            # Stop at next major section
            next_section, next_conf = normalize_section_keyword(line_stripped)
            if next_section and next_section not in ["experience"] and next_conf > 0.6:
                if next_section in ["education", "projects", "skills", "certifications", "languages"]:
                    break
            # Also stop at clear section markers
            if re.search(r'\b(PROJET|COMPETENCE|CERTIF|LANGUE|EDUCATION|SOFT|CENTRE)\s*:?\s*$', line_stripped, re.IGNORECASE):
                break
            if line_stripped and len(line_stripped) > 3:
                exp_buffer.append(line_stripped)
    
    # If not found in layout, try raw text
    if not exp_buffer:
        exp_patterns = [
            r'(?:EXPERIENCE|EXPERIENCES|EXP)\s*:?\s*(.*?)(?=PROJET|COMPETENCE|CERTIF|LANGUE|EDUCATION|$)', 
        ]
        for pattern in exp_patterns:
            match = re.search(pattern, text_raw_clean, re.IGNORECASE | re.DOTALL)
            if match:
                exp_text = match.group(1).strip()
                exp_buffer = [line.strip() for line in exp_text.split('\n') if line.strip()]
                break
    
    # Parse experiences from buffer
    if exp_buffer:
        current_exp = ""
        for line in exp_buffer:
            line_clean = line.strip()
            
            # Skip technology lines
            if re.search(r'^Technologies\s+utilisées?\s*:', line_clean, re.IGNORECASE):
                # Save current experience before skipping tech line
                if current_exp:
                    clean_exp = re.sub(r'^[+\-•\*\s=©]+', '', current_exp.strip())
                    clean_exp = re.sub(r'\s+Technologies.*$', '', clean_exp, flags=re.IGNORECASE)
                    clean_exp = re.sub(r'\+?\d{1,4}[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,4}[\s\-]?\d{0,4}', '', clean_exp)
                    clean_exp = re.sub(r'[\w\.-]+@[\w\.-]+\.\w{2,}', '', clean_exp)
                    clean_exp = re.sub(r'\b(CONTACT|EMAIL|PHONE|@|Q|OBB|®)\s*[^\s]*', '', clean_exp, flags=re.IGNORECASE)
                    clean_exp = re.sub(r'[;:\.]\s*$', '', clean_exp)
                    clean_exp = re.sub(r'\s+', ' ', clean_exp)
                    if len(clean_exp) > 20:
                        result["experiences"].append(clean_exp)
                    current_exp = ""
                continue
            
            # Skip lines that are clearly not experience content (names, contact info, etc.)
            if (re.search(r'^[A-Z]+\s+[A-Z]+$', line_clean) and len(line_clean.split()) <= 3) or \
               re.search(r'@\s*\w+|^\d+\s+\+\d+', line_clean) or \
               any(skill in line_clean for skill in ["Sociabilité", "Prise d'initiative", "Gestion"]):
                continue
            
            # Check if this is a new experience (has dates or starts with +, ©, ', or job keywords)
            has_dates = re.search(r'\d{1,2}[\.\s]?\w+[\.\s]?\d{4}|\d{4}[\s\-–—]\d{4}', line_clean)
            is_new_exp = (has_dates or 
                         line_clean.startswith(('+', '*', '-', '•', '©', "'")) or
                         any(kw in line_clean for kw in ["Stage", "PFE", "Observation", "Développement d'une application", "Développement d'une"]))
            
            if is_new_exp:
                # Save previous experience
                if current_exp:
                    clean_exp = re.sub(r'^[+\-•\*\s=©\']+', '', current_exp.strip())
                    clean_exp = re.sub(r'\s+Technologies.*$', '', clean_exp, flags=re.IGNORECASE)
                    # Remove contact info
                    clean_exp = re.sub(r'\+?\d{1,4}[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,4}[\s\-]?\d{0,4}', '', clean_exp)
                    clean_exp = re.sub(r'[\w\.-]+@[\w\.-]+\.\w{2,}', '', clean_exp)
                    clean_exp = re.sub(r'\b(CONTACT|EMAIL|PHONE|@|Q|OBB|®)\s*[^\s]*', '', clean_exp, flags=re.IGNORECASE)
                    clean_exp = re.sub(r'[;:\.]\s*$', '', clean_exp)
                    clean_exp = re.sub(r'\s+', ' ', clean_exp)
                    # Final check - must contain job-related keywords or dates
                    if len(clean_exp) > 20 and (re.search(r'\d{4}', clean_exp) or any(kw in clean_exp.lower() for kw in ["stage", "développement", "application", "observation"])):
                        result["experiences"].append(clean_exp)
                # Start new experience - remove leading markers including '
                current_exp = re.sub(r'^[+\-•\*\s=©\']+', '', line_clean)
            else:
                # Continue current experience
                if current_exp:
                    # Skip if it's clearly not part of experience
                    if not (re.search(r'^[A-Z]+\s+[A-Z]+$', line_clean) and len(line_clean.split()) <= 3):
                        current_exp += " " + line_clean
        
        # Save last experience
        if current_exp:
            clean_exp = re.sub(r'^[+\-•\*\s=©\']+', '', current_exp.strip())
            clean_exp = re.sub(r'\s+Technologies.*$', '', clean_exp, flags=re.IGNORECASE)
            clean_exp = re.sub(r'\+?\d{1,4}[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,4}[\s\-]?\d{0,4}', '', clean_exp)
            clean_exp = re.sub(r'[\w\.-]+@[\w\.-]+\.\w{2,}', '', clean_exp)
            clean_exp = re.sub(r'\b(CONTACT|EMAIL|PHONE|@|Q|OBB|®)\s*[^\s]*', '', clean_exp, flags=re.IGNORECASE)
            clean_exp = re.sub(r'[;:\.]\s*$', '', clean_exp)
            clean_exp = re.sub(r'\s+', ' ', clean_exp)
            # Final check - must contain job-related keywords or dates
            if len(clean_exp) > 20 and (re.search(r'\d{4}', clean_exp) or any(kw in clean_exp.lower() for kw in ["stage", "développement", "application", "observation"])):
                result["experiences"].append(clean_exp)
    
    # ==== Extract Projects ====
    # Use layout text first (better structured) for projects
    layout_lines = text_layout_clean.split('\n')
    proj_section = False
    proj_buffer = []
    for line in layout_lines:
        line_stripped = line.strip()
        # Check for projects section header (including "PROJETS ACADEMIQUES" and "PROJETS REALISES")
        if re.search(r'\b(PROJET|PROJETS|PROJECT|REALISATION|REALISATIONS|ACADEMIQUES|REALISES)\s*:?\s*$', line_stripped, re.IGNORECASE):
            proj_section = True
            continue
        # Also check if line contains "PROJETS" followed by "ACADEMIQUES" or "REALISES"
        if re.search(r'PROJETS\s+(ACADEMIQUES|REALISES)', line_stripped, re.IGNORECASE):
            proj_section = True
            continue
        section, confidence = normalize_section_keyword(line_stripped)
        if section == "projects" and confidence > 0.5:
            proj_section = True
            continue
        if proj_section:
            # Stop at next major section
            next_section, next_conf = normalize_section_keyword(line_stripped)
            if next_section and next_section not in ["projects"] and next_conf > 0.6:
                if next_section in ["education", "experience", "skills", "certifications", "languages"]:
                    break
            # Also stop at clear section markers
            if re.search(r'\b(COMPETENCE|CERTIF|LANGUE|EDUCATION|EXPERIENCE|SOFT|CENTRE)\s*:?\s*$', line_stripped, re.IGNORECASE):
                break
            if line_stripped and len(line_stripped) > 3:
                proj_buffer.append(line_stripped)
    
    # If not found in layout, try raw text
    if not proj_buffer:
        proj_patterns = [
            r'(?:PROJET|PROJETS|PROJECT|REALISATION|REALISATIONS)\s*:?\s*(.*?)(?=COMPETENCE|CERTIF|LANGUE|EDUCATION|EXPERIENCE|$)', 
        ]
        for pattern in proj_patterns:
            match = re.search(pattern, text_raw_clean, re.IGNORECASE | re.DOTALL)
            if match:
                proj_text = match.group(1).strip()
                proj_buffer = [line.strip() for line in proj_text.split('\n') if line.strip()]
                break
    
    # Parse projects from buffer
    if proj_buffer:
        current_proj = ""
        for i, line in enumerate(proj_buffer):
            line_clean = line.strip()
            
            # Skip empty lines
            if not line_clean:
                continue
            
            # Skip technology lines completely
            if re.search(r'^Technologies\s+utilisées?\s*:', line_clean, re.IGNORECASE):
                # If we have a current project, save it before skipping tech line
                if current_proj:
                    clean_proj = re.sub(r'^[+\-•\*\s]+', '', current_proj.strip())
                    clean_proj = re.sub(r'\s+Technologies.*$', '', clean_proj, flags=re.IGNORECASE)
                    clean_proj = re.sub(r'\s+', ' ', clean_proj)
                    if len(clean_proj) > 15:
                        result["projects"].append(clean_proj)
                    current_proj = ""
                continue
            
            # Skip lines that are just technology lists (comma-separated tech names)
            if re.search(r'^[A-Za-z\s,\.]+$', line_clean) and ',' in line_clean and len(line_clean.split(',')) > 2:
                continue
            
            # Skip lines that are just "isées:" or technology fragments
            if re.search(r'^isées?\s*:', line_clean, re.IGNORECASE) or len(line_clean) < 5:
                continue
            
            # Skip year markers - they're not project content
            if re.search(r'^[©*]\s*\d{4}[\s\-–—]\d{4}[\s:;]*$', line_clean):
                continue
            
            # Check if this is a new project (starts with +, *, -, ©, or keywords)
            is_new_proj = (
                line_clean.startswith(('+', '*', '-', '•', '©')) or
                (re.search(r'^(Développement|Application|Logiciel|projet|Réalisation|Realisation)', line_clean, re.IGNORECASE) and 
                 not current_proj)  # Only if we don't have a current project
            )
            
            if is_new_proj:
                # Save previous project
                if current_proj:
                    clean_proj = re.sub(r'^[+\-•\*\s©]+', '', current_proj.strip())
                    clean_proj = re.sub(r'\s+Technologies.*$', '', clean_proj, flags=re.IGNORECASE)
                    clean_proj = re.sub(r'\s+', ' ', clean_proj)
                    if len(clean_proj) > 15:
                        result["projects"].append(clean_proj)
                # Start new project - remove leading +, *, -, ©, etc.
                current_proj = re.sub(r'^[+\-•\*\s©]+', '', line_clean)
            else:
                # Continue current project (multi-line project description)
                if current_proj:
                    # Only add if it's not a technology list
                    if not (',' in line_clean and len(line_clean.split(',')) > 2):
                        current_proj += " " + line_clean
                elif len(line_clean) > 20 and any(kw in line_clean.lower() for kw in ["développement", "application", "logiciel", "projet"]):
                    current_proj = line_clean
        
        # Save last project
        if current_proj:
            clean_proj = re.sub(r'^[+\-•\*\s©]+', '', current_proj.strip())
            clean_proj = re.sub(r'\s+Technologies.*$', '', clean_proj, flags=re.IGNORECASE)
            clean_proj = re.sub(r'\s+', ' ', clean_proj)
            if len(clean_proj) > 15:
                result["projects"].append(clean_proj)
    
    # ==== Extract Languages ====
    lang_patterns_regex = [
        r'(?:LANGUE|LANGUES|LANGUAGE|LANGUAGES|LINGUISTIQUE)\s*:?\s*(.*?)(?=CERTIF|COMPETENCE|SOFT|CENTRE|$)', 
        r'(?:LANGUE|LANGUES|LANGUAGE|LANGUAGES|LINGUISTIQUE)\s*:?\s*(.*?)(?=\n\n|\Z)',
    ]
    lang_text = ""
    for pattern in lang_patterns_regex:
        match = re.search(pattern, text_raw_clean, re.IGNORECASE | re.DOTALL)
        if match:
            lang_text = match.group(1).strip()
            break
    
    # Also use pattern matching (handle OCR typos like "Frangais" instead of "Français")
    # Use layout text for languages (better structured) - handle multi-line entries
    found_languages = set()  # Use set to avoid duplicates
    
    # First, try to extract languages from layout text line by line (handles split entries)
    layout_lines = text_layout_clean.split('\n')
    lang_section = False
    current_lang = ""
    for i, line in enumerate(layout_lines):
        line_stripped = line.strip()
        # Check for languages section
        if re.search(r'\b(LANGUE|LANGUES|LANGUAGE|LANGUAGES|LINGUISTIQUE)\s*:?\s*$', line_stripped, re.IGNORECASE):
            lang_section = True
            continue
        section, confidence = normalize_section_keyword(line_stripped)
        if section == "languages" and confidence > 0.5:
            lang_section = True
            continue
        if lang_section:
            # Stop at next major section
            next_section, next_conf = normalize_section_keyword(line_stripped)
            if next_section and next_section not in ["languages"] and next_conf > 0.6:
                if next_section in ["education", "experience", "projects", "skills", "certifications"]:
                    break
            if re.search(r'\b(CENTRE|SOFT|COMPETENCE|CERTIF|EDUCATION|EXPERIENCE|PROJET)\s*:?\s*$', line_stripped, re.IGNORECASE):
                break
            
            # Check if this line contains a language name (including partial like "Anglai")
            lang_match = re.search(r'\b(Français|Frangais|Anglais?|Arabe|Espagnol|Allemand|Italien)\s*:?', line_stripped, re.IGNORECASE)
            if lang_match:
                # Save previous language if exists
                if current_lang:
                    clean_lang = re.sub(r'^\*\s*', '', current_lang.strip())
                    clean_lang = re.sub(r'\s+(Uvicorn|Expo|JavaScript|Github|Scrum|KanBan|Stripe|Développement|Technologies|freelance|application|projet).*$', '', clean_lang, flags=re.IGNORECASE)
                    # Fix OCR typos
                    clean_lang = re.sub(r'\bFrangais\b', 'Français', clean_lang, flags=re.IGNORECASE)
                    clean_lang = re.sub(r'\bAnglai\b', 'Anglais', clean_lang, flags=re.IGNORECASE)
                    clean_lang = re.sub(r'\s+', ' ', clean_lang)
                    if clean_lang and 5 < len(clean_lang) < 80:
                        lang_normalized = re.sub(r'\s+', ' ', clean_lang.lower().strip())
                        if lang_normalized not in found_languages:
                            found_languages.add(lang_normalized)
                            result["languages"].append(clean_lang)
                # Start new language (even if partial like "Anglai")
                current_lang = line_stripped
            elif current_lang and line_stripped:
                # Continue current language (multi-line entry like "Anglai" on one line, ": En préparation" on next)
                # Also handle lines that start with ":" (continuation of language entry)
                # Or lines that are just continuation words like "maternelle", "pour le test", etc.
                if (line_stripped.startswith(':') or 
                    len(line_stripped) < 50 or 
                    any(word in line_stripped.lower() for word in ["maternelle", "pour", "test", "toeic", "préparation", "avancé", "niveau"])):
                    current_lang += " " + line_stripped
                else:
                    # If line is too long or doesn't look like language continuation, save current and start fresh
                    if current_lang:
                        clean_lang = re.sub(r'^\*\s*', '', current_lang.strip())
                        clean_lang = re.sub(r'\bFrangais\b', 'Français', clean_lang, flags=re.IGNORECASE)
                        clean_lang = re.sub(r'\bAnglai\b', 'Anglais', clean_lang, flags=re.IGNORECASE)
                        clean_lang = re.sub(r'\s+', ' ', clean_lang)
                        if clean_lang and 5 < len(clean_lang) < 80:
                            lang_normalized = re.sub(r'\s+', ' ', clean_lang.lower().strip())
                            if lang_normalized not in found_languages:
                                found_languages.add(lang_normalized)
                                result["languages"].append(clean_lang)
                    current_lang = ""
    
    # Save last language
    if current_lang:
        clean_lang = re.sub(r'^\*\s*', '', current_lang.strip())
        clean_lang = re.sub(r'\s+(Uvicorn|Expo|JavaScript|Github|Scrum|KanBan|Stripe|Développement|Technologies|freelance|application|projet).*$', '', clean_lang, flags=re.IGNORECASE)
        # Fix OCR typos
        clean_lang = re.sub(r'\bFrangais\b', 'Français', clean_lang, flags=re.IGNORECASE)
        clean_lang = re.sub(r'\bAnglai\b', 'Anglais', clean_lang, flags=re.IGNORECASE)
        clean_lang = re.sub(r'\s+', ' ', clean_lang)
        if clean_lang and 5 < len(clean_lang) < 80:
            lang_normalized = re.sub(r'\s+', ' ', clean_lang.lower().strip())
            if lang_normalized not in found_languages:
                found_languages.add(lang_normalized)
                result["languages"].append(clean_lang)
    
    # Fallback: use regex patterns if we didn't find languages via line-by-line
    if not result["languages"]:
        lang_patterns = [
            r'\*?\s*[Ff]ran[çcg]ais\s*:\s*[^\n]+',  # Handle both "Français" and "Frangais" (OCR typo)
            r'\*?\s*[Ff]rangais\s*:\s*[^\n]+',  # Explicit pattern for OCR typo
            r'\*?\s*[Aa]nglais\s*:\s*[^\n]+',
            r'\*?\s*[Aa]rabe\s*:\s*[^\n]+',
            r'\*?\s*[Ee]spagnol\s*:\s*[^\n]+',
            r'\*?\s*[Aa]llemand\s*:\s*[^\n]+',
            r'\*?\s*[Ii]talien\s*:\s*[^\n]+',
        ]
        for pattern in lang_patterns:
            matches = re.finditer(pattern, text_layout_clean, re.IGNORECASE)
            for match in matches:
                lang_line = match.group(0).strip()
                lang_line = re.sub(r'^\*\s*', '', lang_line)
                lang_line = re.sub(r'\s+(Uvicorn|Expo|JavaScript|Github|Scrum|KanBan|Stripe|Développement|Technologies|freelance|application|projet).*$', '', lang_line, flags=re.IGNORECASE)
                lang_line = re.sub(r'\bFrangais\b', 'Français', lang_line, flags=re.IGNORECASE)
                lang_line = re.sub(r'\s+', ' ', lang_line)
                if lang_line and 5 < len(lang_line) < 80:
                    lang_normalized = re.sub(r'\s+', ' ', lang_line.lower().strip())
                    if lang_normalized not in found_languages:
                        found_languages.add(lang_normalized)
                        result["languages"].append(lang_line)
    
    # Parse language section text (only if we didn't find languages via patterns)
    if lang_text and not result["languages"]:
        lang_lines = lang_text.split('\n')
        for line in lang_lines:
            line = line.strip()
            # Check for language keywords (including OCR typo "frangais")
            if any(lang in line.lower() for lang in ['français', 'frangais', 'anglais', 'arabe', 'espagnol', 'allemand', 'italien']):
                # Clean up
                line = re.sub(r'\s+(Uvicorn|Expo|JavaScript|Github|Scrum|KanBan|Stripe|Développement|Technologies|freelance|application|projet).*$', '', line, flags=re.IGNORECASE)
                line = re.sub(r'\s+', ' ', line)
                # Fix OCR typo
                line = re.sub(r'\bFrangais\b', 'Français', line, flags=re.IGNORECASE)
                if len(line) > 5 and len(line) < 80:
                    lang_normalized = re.sub(r'\s+', ' ', line.lower().strip())
                    if lang_normalized not in found_languages:
                        found_languages.add(lang_normalized)
                        result["languages"].append(line)
    
    # ==== Extract Certifications ====
    # Use layout text first (better structured)
    layout_lines = text_layout_clean.split('\n')
    cert_section = False
    cert_buffer = []
    for line in layout_lines:
        line_stripped = line.strip()
        # Check for certifications section (including typo "Certifcations")
        if re.search(r'\b(CERTIFICATION|CERTIFICATIONS|CERTIF|CERTIFCATIONS)\s*:?\s*$', line_stripped, re.IGNORECASE):
            cert_section = True
            continue
        section, confidence = normalize_section_keyword(line_stripped)
        if section == "certifications" and confidence > 0.5:
            cert_section = True
            continue
        if cert_section:
            # Stop at next major section
            next_section, next_conf = normalize_section_keyword(line_stripped)
            if next_section and next_section not in ["certifications"] and next_conf > 0.6:
                if next_section in ["education", "experience", "projects", "skills", "languages"]:
                    break
            # Also stop at clear section markers
            if re.search(r'\b(CENTRE|SOFT|COMPETENCE|LANGUE|EDUCATION|EXPERIENCE|PROJET)\s*:?\s*$', line_stripped, re.IGNORECASE):
                break
            if line_stripped and len(line_stripped) > 3:
                cert_buffer.append(line_stripped)
    
    # If not found in layout, try raw text
    if not cert_buffer:
        cert_patterns = [
            r'(?:CERTIFICATION|CERTIFICATIONS|CERTIF|CERTIFCATIONS)\s*:?\s*(.*?)(?=CENTRE|COMPETENCE|SOFT|LANGUE|$)', 
        ]
        for pattern in cert_patterns:
            match = re.search(pattern, text_raw_clean, re.IGNORECASE | re.DOTALL)
            if match:
                cert_text = match.group(1).strip()
                cert_buffer = [line.strip() for line in cert_text.split('\n') if line.strip()]
                break
    
    # Parse certifications from buffer
    if cert_buffer:
        current_cert = ""
        for line in cert_buffer:
            line_clean = line.strip()
            # Skip empty lines and noise
            if not line_clean or len(line_clean) < 5:
                continue
            # Handle fragments - if previous line ended with "Certi" and this is "icat", join them
            if line_clean == "icat" and current_cert and current_cert.strip().endswith("Certi"):
                current_cert = current_cert.rstrip("Certi") + "Certificat"
                continue
            if line_clean == "Certi":
                if not current_cert:
                    current_cert = "Certificat"
                continue
            if line_clean in ["n de projet"] or (len(line_clean) < 3 and line_clean not in ["-"]):
                continue
            # Check if this is a new certification (starts with +, *, or has Certificat/CISCO/Coursera)
            # Also check if line contains certification keywords
            is_new_cert = (
                line_clean.startswith(('+', '*', '-', '•')) or
                ("NDG" in line_clean.upper() or "certificat" in line_clean.lower() or 
                 "CISCO" in line_clean.upper() or "Coursera" in line_clean or
                 "Linux Essentials" in line_clean or "Gestion de projet" in line_clean)
            )
            
            if is_new_cert:
                # Save previous certification
                if current_cert:
                    clean_cert = re.sub(r'^[+\-•\*\s]+', '', current_cert.strip())
                    # Remove project text
                    clean_cert = re.sub(r'\s+(Développement|Technologies|projet|application|utilisées).*$', '', clean_cert, flags=re.IGNORECASE)
                    clean_cert = re.sub(r'\s+(CENTRE|SOFT|COMPETENCE).*$', '', clean_cert, flags=re.IGNORECASE)
                    clean_cert = re.sub(r'\s+', ' ', clean_cert)
                    # Remove contact info
                    clean_cert = re.sub(r'[\w\.-]+@[\w\.-]+\.\w{2,}', '', clean_cert)
                    clean_cert = re.sub(r'\+?\d{1,4}[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,4}', '', clean_cert)
                    if len(clean_cert) > 10:
                        result["certifications"].append(clean_cert)
                # Start new certification
                current_cert = line_clean
            else:
                # Continue current certification (multi-line entries like "Certificat Linux Essentials -" on one line, "CISCO (2023)" on next)
                if current_cert:
                    # Only add if it doesn't look like project text or noise
                    if not any(kw in line_clean.lower() for kw in ["développement", "technologies utilisées", "projet", "application"]) and len(line_clean) > 2:
                        # Check if this line continues the certification (contains year, organization, or is short continuation)
                        if (re.search(r'\d{4}', line_clean) or 
                            any(org in line_clean for org in ["CISCO", "USMBA", "ESISA", "Coursera"]) or
                            len(line_clean) < 30):
                            current_cert += " " + line_clean
        
        # Save last certification
        if current_cert:
            clean_cert = re.sub(r'^[+\-•\*\s]+', '', current_cert.strip())
            clean_cert = re.sub(r'\s+(Développement|Technologies|projet|application|utilisées).*$', '', clean_cert, flags=re.IGNORECASE)
            clean_cert = re.sub(r'\s+(CENTRE|SOFT|COMPETENCE).*$', '', clean_cert, flags=re.IGNORECASE)
            clean_cert = re.sub(r'\s+', ' ', clean_cert)
            clean_cert = re.sub(r'[\w\.-]+@[\w\.-]+\.\w{2,}', '', clean_cert)
            clean_cert = re.sub(r'\+?\d{1,4}[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,4}', '', clean_cert)
            if len(clean_cert) > 10:
                result["certifications"].append(clean_cert)
    
    # ==== Extract Soft Skills ====
    soft_skill_keywords = [
        "Travail en équipe", "Communication", "Gestion du stress", "Adaptation",
        "Esprit d'équipe", "Gestion du temps", "Prise d'initiative", "Prise diinitiative",
        "Leadership", "Sociabilité", "Gestion des priorités", "Gestion des priori"
    ]
    found_soft_skills = set()  # Use set to avoid duplicates
    for kw in soft_skill_keywords:
        clean_kw = kw.replace("diini", "d'ini").replace("priori", "priorités")
        # Normalize for comparison
        kw_normalized = clean_kw.lower().strip()
        if kw_normalized not in found_soft_skills:
            if kw.lower() in text_raw_clean.lower() or kw.lower() in text_layout_clean.lower():
                found_soft_skills.add(kw_normalized)
                result["soft_skills"].append(clean_kw)
    
    # ==== Extract Interests ====
    layout_lines = text_layout_clean.split('\n')
    interests_section = False
    for line in layout_lines:
        line_stripped = line.strip()
        # Check for interests section
        if re.search(r'\b(CENTRE|INTERET|INTERETS|HOBBY|HOBBIES)\s*:?\s*$', line_stripped, re.IGNORECASE):
            interests_section = True
            continue
        if interests_section:
            # Stop at next major section
            if re.search(r'\b(SOFT|COMPETENCE|CERTIF|LANGUE|EDUCATION|EXPERIENCE|PROJET)\s*:?\s*$', line_stripped, re.IGNORECASE):
                break
            # Extract interests (usually start with *, -, •, or are simple words)
            if line_stripped and (line_stripped.startswith(('*', '-', '•')) or len(line_stripped.split()) <= 3):
                interest = re.sub(r'^[+\-•\*\s]+', '', line_stripped).strip()
                if interest and len(interest) > 2 and len(interest) < 30:
                    # Common interests keywords
                    if any(kw in interest.lower() for kw in ["théatre", "theatre", "football", "jeux", "vidéo", "video", "voyage", "sport", "musique", "lecture", "cinema"]):
                        if interest not in result["interests"]:
                            result["interests"].append(interest)
    
    # Add raw OCR text if requested
    if return_raw_text:
        result["_raw_ocr"] = {
            "layout_text": text_layout,
            "raw_text": text_raw,
            "layout_text_clean": text_layout_clean,
            "raw_text_clean": text_raw_clean
        }
    
    return result


def parse_cv_with_mistral(ocr_text: str, model_name: str = "mistral") -> dict:
    """
    Parse CV text using local Mistral AI via Ollama
    
    Args:
        ocr_text: Raw OCR text from CV image
        model_name: Ollama model name (default: "mistral", can also use "mistral:7b", "mistral:latest", etc.)
    
    Returns:
        Dictionary with parsed CV data matching the same structure as parse_cv_image
    """
    if not HAS_OLLAMA:
        raise ImportError("ollama package is required. Install with: pip install ollama")
    
    # Truncate text if too long (keep within token limits)
    max_length = 8000
    if len(ocr_text) > max_length:
        ocr_text = ocr_text[:max_length] + "..."
    
    # Create prompt for Mistral
    prompt = f"""You are a CV parser assistant. Extract structured data from the following OCR-extracted CV text.

The OCR text may contain typos and formatting issues. Correct them and extract the following information:

1. **Personal Info**: full_name, location, emails (array), phone, social_handles (array)
2. **Education**: array of objects with degree, institution, location, period, field (optional), option (optional), year (optional)
3. **Experience**: array of objects with period, duration, company, role, description, technologies (array)
4. **Projects**: array of objects with title, type (optional), description, technologies (array)
5. **Skills**: object with arrays: programming_languages, frameworks, web_technologies, mobile_technologies, databases, devops_tools, data_science, modeling_design, soft_skills, other (for tools/technologies that don't fit other categories)
6. **Languages**: array of objects with language and level
7. **Certifications**: array of strings
8. **Interests**: array of strings (hobbies/interests)

IMPORTANT:
- Return ONLY valid JSON, no markdown formatting, no code fences
- Fix OCR typos (e.g., "Frangais" → "Français", "Anglai" → "Anglais", "Node,js" → "Node.js", "C+4" → "C++")
- Use null for missing fields, empty arrays [] for missing lists
- Be accurate - if information is not clearly present, use null or empty arrays
- Put tools like Uvicorn, Gunicorn, Stripe, Kanban, Jira, Figma, etc. in the "other" category if they don't fit elsewhere

OCR Text:
{ocr_text}

Return valid JSON matching this structure:
{{
  "personal_info": {{"full_name": null, "location": null, "emails": [], "phone": null, "social_handles": []}},
  "education": [],
  "experience": [],
  "projects": [],
  "skills": {{
    "programming_languages": [],
    "frameworks": [],
    "web_technologies": [],
    "mobile_technologies": [],
    "databases": [],
    "devops_tools": [],
    "data_science": [],
    "modeling_design": [],
    "soft_skills": [],
    "other": []
  }},
  "languages_spoken": [],
  "certifications": [],
  "interests": []
}}
"""
    
    try:
        # Call Ollama API
        response = ollama.chat(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": "You are a JSON extraction assistant. Always return valid JSON only, no explanations, no markdown."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            options={
                "temperature": 0.1,  # Low temperature for more consistent output
                "num_predict": 2000,  # Optimized: 2000 tokens is sufficient for CV parsing (faster processing)
                "top_p": 0.9,  # Nucleus sampling for faster inference
            }
        )
        
        # Extract JSON from response
        response_text = response['message']['content'].strip()
        
        # Remove markdown code fences if present
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parse JSON
        result = json.loads(response_text)
        
        # Convert to the format expected by the rest of the codebase
        # (matching parse_cv_image output structure)
        converted_result = {
            "name": result.get("personal_info", {}).get("full_name"),
            "email": result.get("personal_info", {}).get("emails", []),
            "phone": result.get("personal_info", {}).get("phone", []) if isinstance(result.get("personal_info", {}).get("phone"), list) else [result.get("personal_info", {}).get("phone")] if result.get("personal_info", {}).get("phone") else [],
            "education": [json.dumps(edu) if isinstance(edu, dict) else edu for edu in result.get("education", [])],
            "experiences": [json.dumps(exp) if isinstance(exp, dict) else exp for exp in result.get("experience", [])],
            "projects": [json.dumps(proj) if isinstance(proj, dict) else proj for proj in result.get("projects", [])],
            "technical_skills": (
                result.get("skills", {}).get("programming_languages", []) +
                result.get("skills", {}).get("frameworks", []) +
                result.get("skills", {}).get("web_technologies", []) +
                result.get("skills", {}).get("mobile_technologies", []) +
                result.get("skills", {}).get("databases", []) +
                result.get("skills", {}).get("devops_tools", []) +
                result.get("skills", {}).get("data_science", []) +
                result.get("skills", {}).get("modeling_design", []) +
                result.get("skills", {}).get("other", [])
            ),
            "soft_skills": result.get("skills", {}).get("soft_skills", []),
            "other_skills": result.get("skills", {}).get("other", []),
            "languages": [f"{lang.get('language', '')}: {lang.get('level', '')}" for lang in result.get("languages_spoken", [])],
            "certifications": result.get("certifications", [])
        }
        
        return converted_result
        
    except json.JSONDecodeError as e:
        print(f"⚠️  Warning: Failed to parse JSON from Mistral response: {e}", file=sys.stderr)
        print(f"Response was: {response_text[:500]}...", file=sys.stderr)
        raise
    except Exception as e:
        print(f"⚠️  Error calling Ollama/Mistral: {e}", file=sys.stderr)
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Please provide image path"}, indent=2), file=sys.stderr)
        sys.exit(1)
    
    image_path = sys.argv[1]
    try:
        result = parse_cv_image(image_path)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}, indent=2), file=sys.stderr)
        sys.exit(1)
