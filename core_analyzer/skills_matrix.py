# -*- coding: utf-8 -*-
"""
Database of professional skills and industries for ATS keyword matching.
This module provides a rich set of predefined keywords across multiple industries.
"""

from typing import Dict, List, Set

# Massiva base de dados de habilidades profissionais categorizada por setor.
# Isso permite ao analisador fazer uma varredura semântica inteligente offline.
SKILLS_DATABASE: Dict[str, List[str]] = {
    "Tecnologia e Engenharia de Software": [
        "python", "javascript", "typescript", "react", "node.js", "express", "nest.js", "next.js",
        "vue", "angular", "html5", "css3", "tailwind css", "bootstrap", "sass", "graphql", "rest api",
        "java", "spring boot", "c#", ".net core", "c++", "go", "rust", "ruby on rails", "php", "laravel",
        "docker", "kubernetes", "aws", "azure", "google cloud platform", "gcp", "ci/cd", "github actions",
        "git", "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "sqlite", "prisma", "sequelize",
        "microservices", "serverless", "clean architecture", "tdd", "ddd", "solid principles", "scrum",
        "kanban", "agile", "devops", "cloud native", "terraform", "nginx", "apollo client", "redux", "recharts"
    ],
    "Ciência de Dados e Inteligência Artificial": [
        "data science", "machine learning", "deep learning", "nlp", "natural language processing",
        "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "keras", "opencv", "computer vision",
        "large language models", "llm", "prompt engineering", "r language", "sql", "tableau", "power bi",
        "data lake", "data warehouse", "spark", "hadoop", "airflow", "statistics", "data visualization",
        "vector database", "pinecone", "chromadb", "retrieval augmented generation", "rag", "langchain"
    ],
    "Design e Experiência do Usuário (UI/UX)": [
        "ui design", "ux design", "figma", "adobe xd", "sketch", "photoshop", "illustrator", "wireframing",
        "prototyping", "user research", "usability testing", "design systems", "responsive design",
        "information architecture", "interaction design", "user flows", "heuristics evaluation", "accessibility"
    ],
    "Gestão de Produtos e Agilidade": [
        "product management", "product owner", "scrum master", "agile coaching", "roadmapping", "okrs",
        "kpis", "user stories", "backlog prioritization", "market research", "competitor analysis",
        "product analytics", "a/b testing", "jira", "confluence", "trello", "amplitude", "mixpanel"
    ],
    "Vendas e Marketing Digital": [
        "seo", "sem", "growth hacking", "google analytics", "copywriting", "content marketing", "crm",
        "salesforce", "hubspot", "email marketing", "social media management", "paid media", "facebook ads",
        "google ads", "conversion rate optimization", "cro", "b2b sales", "inbound marketing", "lead generation"
    ],
    "Finanças e Negócios": [
        "financial analysis", "accounting", "budgeting", "forecasting", "risk management", "corporate finance",
        "valuation", "excel", "auditing", "compliance", "strategic planning", "project finance", "mergers and acquisitions"
    ],
    "Recursos Humanos": [
        "talent acquisition", "technical recruiting", "employee relations", "onboarding", "performance management",
        "hris", "organizational development", "people analytics", "coaching", "conflict resolution"
    ]
}

# Lista de palavras-chave que indicam impacto ou conquistas quantificáveis (importantes para ATS)
IMPACT_KEYWORDS: Set[str] = {
    "aumentei", "aumentou", "reduzi", "reduziu", "otimizei", "otimizou", "melhorei", "melhorou",
    "liderei", "liderou", "implementei", "implementou", "desenvolvi", "desenvolveu", "criei", "criou",
    "gerenciei", "gerenciou", "conquistei", "conquistou", "economizei", "economizou", "automatizei", "automatizou",
    "impacto", "crescimento", "receita", "performance", "eficiência", "conversão", "escala", "lucro",
    "retorno", "roi", "leads", "clientes", "usuários", "vendas", "redução", "aumento", "métricas", "kpis"
}

def scan_skills(text: str) -> Dict[str, List[str]]:
    """
    Scans the input text for professional skills categorized by industry.
    Returns a dictionary of matched skills.
    """
    text_lower = text.lower()
    matched: Dict[str, List[str]] = {}
    
    for category, skills in SKILLS_DATABASE.items():
        found = []
        for skill in skills:
            # Simple boundary check for skills (to avoid matching substring of words)
            if skill in text_lower:
                found.append(skill)
        if found:
            matched[category] = found
            
    return matched

def calculate_impact_score(text: str) -> int:
    """
    Evaluates the presence of impact/metric oriented words.
    Returns a count of matching phrases.
    """
    text_lower = text.lower()
    count = 0
    for word in IMPACT_KEYWORDS:
        if word in text_lower:
            count += 1
    return count
