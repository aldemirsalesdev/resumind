# -*- coding: utf-8 -*-
"""
Calculates readability, density, and formatting metrics for resume texts.
"""

import re
from typing import Dict, Any, List

def count_syllables_pt(word: str) -> int:
    """
    Very simple heuristic syllable counter for Portuguese words.
    """
    word = word.lower()
    # Remove simple non-vowel patterns at the end
    word = re.sub(r'[^a-záéíóúâêôãõü]', '', word)
    if not word:
        return 0
    
    # Simple regex for vowels and vowel clusters
    vowel_clusters = re.findall(r'[aeiouáéíóúâêôãõü]+', word)
    return max(1, len(vowel_clusters))

def calculate_flesch_reading_ease_pt(text: str) -> float:
    """
    Calculates the Flesch Reading Ease score adapted for Portuguese.
    Formula: 248.835 - (1.015 * (Words / Sentences)) - (84.6 * (Syllables / Words))
    """
    sentences = len(re.split(r'[.!?]+', text))
    sentences = max(1, sentences)
    
    words_list = re.findall(r'\b[a-zA-Záéíóúâêôãõçü]+\b', text)
    words = len(words_list)
    words = max(1, words)
    
    total_syllables = sum(count_syllables_pt(w) for w in words_list)
    
    asl = words / sentences  # Average Sentence Length
    asw = total_syllables / words  # Average Syllables per Word
    
    score = 248.835 - (1.015 * asl) - (84.6 * asw)
    return max(0.0, min(100.0, score))

def analyze_formatting_quality(text: str) -> Dict[str, Any]:
    """
    Scans the formatting layout from plain text:
    - Checks for typical symbols (bullet points, indicators)
    - Verifies sentence lengths (identifies overly long, hard-to-read sentences)
    - Check for capitalization anomalies or missing spaces after commas
    """
    lines = text.split("\n")
    bullet_symbols = ["•", "*", "-", "▪", "◦", "■"]
    bullet_count = 0
    long_sentences = 0
    missing_spaces = 0
    
    # Missing spaces after commas
    missing_space_pattern = re.compile(r',[A-Za-z0-9]')
    
    for line in lines:
        stripped = line.strip()
        if any(stripped.startswith(sym) for sym in bullet_symbols):
            bullet_count += 1
            
        # Check sentence length
        sentences = re.split(r'[.!?]+', line)
        for sentence in sentences:
            words = sentence.strip().split()
            if len(words) > 30:
                long_sentences += 1
                
        # Space issues
        missing_spaces += len(missing_space_pattern.findall(line))
        
    word_count = len(re.findall(r'\b\w+\b', text))
    
    return {
        "word_count": word_count,
        "bullet_count": bullet_count,
        "long_sentences_count": long_sentences,
        "comma_spacing_errors": missing_spaces,
        "formatting_density": "good" if (bullet_count >= 3 or word_count < 600) else "could_improve"
    }

def generate_text_diagnostics(text: str) -> Dict[str, Any]:
    """
    Gathers all readability and layout metrics.
    """
    flesch = calculate_flesch_reading_ease_pt(text)
    formatting = analyze_formatting_quality(text)
    
    readability_label = "Fácil"
    if flesch < 30:
        readability_label = "Muito Difícil (Nível Acadêmico)"
    elif flesch < 50:
        readability_label = "Difícil"
    elif flesch < 70:
        readability_label = "Padrão / Média"
    elif flesch < 90:
        readability_label = "Fácil"
    else:
        readability_label = "Muito Fácil"
        
    return {
        "readability": {
            "score": round(flesch, 1),
            "label": readability_label
        },
        "formatting": formatting
    }
