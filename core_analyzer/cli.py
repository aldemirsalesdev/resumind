# -*- coding: utf-8 -*-
"""
Main entry point for the Core Resume Analysis Engine written in Python.
Outputs structured metrics, ATS score estimation, and suggestions as JSON.
"""

import sys
import json
import argparse
from typing import Dict, Any

from skills_matrix import scan_skills, calculate_impact_score
from text_metrics import generate_text_diagnostics
from resume_parser import extract_contacts, analyze_structural_completeness

def perform_complete_analysis(raw_text: str) -> Dict[str, Any]:
    """
    Coordinates various analysis sub-modules to compute complete ATS audit stats.
    """
    if not raw_text or not raw_text.strip():
        return {
            "error": "Texto do currículo vazio ou inválido."
        }
        
    # 1. Parse contact info and check sections
    contacts = extract_contacts(raw_text)
    structure = analyze_structural_completeness(raw_text)
    
    # 2. Extract technical and industrial skills
    matched_skills = scan_skills(raw_text)
    all_matched_skills_flat = []
    for cat_skills in matched_skills.values():
        all_matched_skills_flat.extend(cat_skills)
        
    # Remove duplicates
    all_matched_skills_flat = list(sorted(set(all_matched_skills_flat)))
    
    # 3. Readability and formatting metrics
    diagnostics = generate_text_diagnostics(raw_text)
    
    # 4. Measure impact verb density
    impact_count = calculate_impact_score(raw_text)
    
    # 5. Compute Heuristic ATS Score
    # Starting base score
    ats_score = 40
    
    # Add points based on structural completeness (up to 25 points)
    ats_score += int(structure["completeness_percentage"] * 0.25)
    
    # Add points for professional contacts presence (up to 15 points)
    if contacts["email"]:
        ats_score += 5
    if contacts["phone"]:
        ats_score += 5
    if contacts["linkedin"]:
        ats_score += 5
        
    # Add points for skills density (up to 10 points)
    skills_found_count = len(all_matched_skills_flat)
    ats_score += min(10, skills_found_count * 2)
    
    # Add points for impact/metrics verbs (up to 10 points)
    ats_score += min(10, impact_count * 2.5)
    
    # Apply penalties for bad formatting
    formatting = diagnostics["formatting"]
    if formatting["long_sentences_count"] > 5:
        ats_score -= 5
    if formatting["comma_spacing_errors"] > 8:
        ats_score -= 3
        
    # Keep score inside a safe boundary
    ats_score = max(20, min(95, ats_score))
    
    # 6. Generate action-oriented recommendations in Portuguese
    recommendations = []
    
    if structure["missing_sections"]:
        sections_translated = {
            "summary": "Resumo/Perfil Profissional",
            "experience": "Experiência Profissional",
            "education": "Formação Acadêmica",
            "skills": "Habilidades/Tecnologias",
            "languages": "Idiomas",
            "projects": "Projetos"
        }
        missing_names = [sections_translated.get(sec, sec) for sec in structure["missing_sections"]]
        recommendations.append(
            f"Adicione as seções ausentes identificadas: {', '.join(missing_names)}. Seções estruturadas facilitam a leitura de robôs de triagem."
        )
        
    if not contacts["linkedin"]:
        recommendations.append(
            "Seu perfil do LinkedIn não foi identificado no cabeçalho. Incluir um link higienizado e profissional aumenta as chances de contato em até 40%."
        )
        
    if len(all_matched_skills_flat) < 5:
        recommendations.append(
            "A densidade de palavras-chave de competências técnicas está baixa. Adicione termos de mercado ou frameworks específicos da sua área."
        )
        
    if impact_count < 2:
        recommendations.append(
            "Adicione mais verbos de ação e conquistas quantificáveis (ex: 'aumentei a performance em 20%', 'liderei equipe'). Currículos descritivos têm menos impacto que currículos orientados a resultados."
        )
        
    if formatting["long_sentences_count"] > 3:
        recommendations.append(
            "Identificamos frases muito longas (mais de 30 palavras). Tente dividir em frases menores ou usar bullet points para manter o texto dinâmico e convidativo."
        )
        
    if formatting["comma_spacing_errors"] > 4:
        recommendations.append(
            "Detectamos alguns problemas comuns de espaçamento após vírgulas. Revise a pontuação do texto para garantir uma leitura fluida."
        )
        
    if not recommendations:
        recommendations.append("Excelente trabalho! Seu currículo atende a todas as boas práticas de estrutura, densidade e legibilidade para processos seletivos ATS.")

    return {
        "engine": "Python Core Analyzer (Heuristic ATS v1.0)",
        "score_estimated": ats_score,
        "contacts": contacts,
        "structure": structure,
        "skills_detected": matched_skills,
        "total_skills_count": skills_found_count,
        "text_diagnostics": diagnostics,
        "impact_verbs_count": impact_count,
        "recommendations_pt": recommendations
    }

def main():
    parser = argparse.ArgumentParser(description="Analyze a resume text from CLI or file path.")
    parser.add_argument("--file", type=str, help="Path to resume txt file")
    parser.add_argument("--text", type=str, help="Direct raw text of the resume")
    
    args = parser.parse_args()
    
    raw_text = ""
    if args.file:
        try:
            with open(args.file, "r", encoding="utf-8") as f:
                raw_text = f.read()
        except Exception as e:
            print(json.dumps({"error": f"Falha ao ler o arquivo: {str(e)}"}))
            sys.exit(1)
    elif args.text:
        raw_text = args.text
    else:
        # Fallback to reading from standard input (stdin)
        if not sys.stdin.isatty():
            raw_text = sys.stdin.read()
            
    if not raw_text:
        # Let's return a sample run or instruction
        print(json.dumps({
            "status": "idle",
            "message": "Nenhum texto recebido. Forneça o texto do currículo via stdin ou usando o argumento --text."
        }, indent=2, ensure_ascii=False))
        sys.exit(0)
        
    analysis = perform_complete_analysis(raw_text)
    print(json.dumps(analysis, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
