# -*- coding: utf-8 -*-
"""
Intelligent regex-based and structural parsing for resumes.
"""

import re
from typing import Dict, Any, List

# Regex patterns for contact information
EMAIL_REGEX = re.compile(r'[\w\.-]+@[\w\.-]+\.\w+')
PHONE_REGEX = re.compile(r'(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?\d{4}[-\s]?\d{4}|\d{4}[-\s]?\d{4})')
LINKEDIN_REGEX = re.compile(r'linkedin\.com/in/[\w\-]+')
URL_REGEX = re.compile(r'https?://(?:www\.)?[\w\-\.]+\.[a-zA-Z]{2,}(?:/[\w\-\./\?%&=]*)?')

# Common headers in Portuguese and English for resume sections
SECTION_HEADERS = {
    "summary": [
        "resumo", "perfil", "sobre mim", "resumo profissional", "perfil profissional",
        "summary", "about me", "professional summary"
    ],
    "experience": [
        "experiência", "experiências", "experiência profissional", "experiências profissionais",
        "histórico profissional", "carreira", "experience", "work experience", "professional experience"
    ],
    "education": [
        "educação", "formação", "formação acadêmica", "acadêmico", "ensino", "estudos",
        "education", "academic background", "studies"
    ],
    "skills": [
        "habilidades", "competências", "conhecimentos", "tecnologias", "skills", "technical skills"
    ],
    "languages": [
        "idiomas", "línguas", "languages"
    ],
    "projects": [
        "projetos", "portfolio", "portfólio", "projects"
    ]
}

def extract_contacts(text: str) -> Dict[str, str]:
    """
    Extracts contacts (email, phone, linkedin, website) from the resume text using regex patterns.
    """
    email_match = EMAIL_REGEX.search(text)
    phone_match = PHONE_REGEX.search(text)
    linkedin_match = LINKEDIN_REGEX.search(text)
    
    # Try to find web address that is not linkedin or email
    urls = URL_REGEX.findall(text)
    website = ""
    for url in urls:
        if "linkedin.com" not in url and "@" not in url:
            website = url
            break

    return {
        "email": email_match.group(0) if email_match else "",
        "phone": phone_match.group(0) if phone_match else "",
        "linkedin": f"https://{linkedin_match.group(0)}" if linkedin_match else "",
        "website": website
    }

def analyze_structural_completeness(text: str) -> Dict[str, Any]:
    """
    Checks which standard sections are present in the resume.
    Calculates a structural completeness percentage.
    """
    text_lower = text.lower()
    sections_found: Dict[str, bool] = {}
    
    for section_name, keywords in SECTION_HEADERS.items():
        found = False
        for kw in keywords:
            # Pattern matching with boundary checks to prevent false positives
            pattern = rf'\b{re.escape(kw)}\b'
            if re.search(pattern, text_lower):
                found = True
                break
        sections_found[section_name] = found
        
    present_count = sum(1 for v in sections_found.values() if v)
    total_count = len(SECTION_HEADERS)
    completeness_percentage = round((present_count / total_count) * 100)
    
    missing_sections = [k for k, v in sections_found.items() if not v]
    
    return {
        "completeness_percentage": completeness_percentage,
        "sections_status": sections_found,
        "missing_sections": missing_sections
    }
