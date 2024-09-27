from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from difflib import SequenceMatcher
from transformers import pipeline, BertTokenizer, BertModel
from pydantic import BaseModel
import re
import torch
from textblob import TextBlob
from nltk.tokenize import word_tokenize
from nltk.corpus import wordnet as wn
import random
import nltk
nltk.download('punkt')
nltk.download('punkt_tab')
nltk.download('averaged_perceptron_tagger')
from nltk.corpus import wordnet
nltk.download('wordnet')

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # URL of your React app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the grammar correction model
grammar_model = pipeline("text2text-generation", model="prithivida/grammar_error_correcter_v1")

class EssayInput(BaseModel):
    essay: str

class GradingParameters(BaseModel):
    min_word_count: int
    max_word_count: int
    grammar_weight: float
    vocabulary_weight: float
    creativity_weight: float

default_grading_parameters = {
    "short": GradingParameters(
        essay_type="short",
        min_word_count=100,
        max_word_count=300,
        grammar_weight=0.4,
        vocabulary_weight=0.3,
        creativity_weight=0.3
    ),
    "medium": GradingParameters(
        essay_type="medium",
        min_word_count=300,
        max_word_count=600,
        grammar_weight=0.35,
        vocabulary_weight=0.35,
        creativity_weight=0.3
    ),
    "long": GradingParameters(
        essay_type="long",
        min_word_count=600,
        max_word_count=1000,
        grammar_weight=0.3,
        vocabulary_weight=0.4,
        creativity_weight=0.3
    )
}

def advanced_grade_essay(essay, corrected_version, params: GradingParameters):
    original_words = essay.lower().split()
    corrected_words = corrected_version.lower().split()
    
    total_words = len(original_words)
    
    feedback = []
    
    # Count word-level changes
    corrections_made = sum(1 for o, c in zip(original_words, corrected_words) if o != c)
    
    # Use SequenceMatcher for more detailed analysis
    matcher = SequenceMatcher(None, essay.lower(), corrected_version.lower())
    detailed_differences = matcher.get_opcodes()
    
    # Count different types of errors
    spelling_errors = sum(1 for tag, i1, i2, j1, j2 in detailed_differences if tag == 'replace' and j2-j1 == 1 and i2-i1 == 1)
    grammar_errors = sum(1 for tag, i1, i2, j1, j2 in detailed_differences if tag in ['replace', 'insert', 'delete'] and (i2-i1 > 1 or j2-j1 > 1))
    punctuation_errors = sum(1 for tag, i1, i2, j1, j2 in detailed_differences if tag in ['insert', 'delete'] and re.match(r'[^\w\s]', essay[i1:i2] + corrected_version[j1:j2]))
    
    # Calculate error rates
    error_rate = (spelling_errors + grammar_errors + punctuation_errors) / total_words
    detailed_errors = []
    for tag, i1, i2, j1, j2 in detailed_differences:
        if tag != 'equal':
            error_type = 'Spelling' if tag == 'replace' and j2-j1 == 1 and i2-i1 == 1 else 'Grammar' if tag in ['replace', 'insert', 'delete'] else 'Punctuation'
            detailed_errors.append({
                'type': error_type,
                'original': essay[i1:i2],
                'corrected': corrected_version[j1:j2]
            })
    
    # Calculate grammar score with more lenient grading
    if error_rate <= 0.02:
        grammar_score = 10
    elif error_rate <= 0.05:
        grammar_score = 9
    elif error_rate <= 0.1:
        grammar_score = 8
    elif error_rate <= 0.15:
        grammar_score = 7
    else:
        grammar_score = max(6 - (error_rate - 0.15) * 20, 0)
    
    # Calculate vocabulary score
    vocabulary_score = calculate_vocabulary_complexity(essay)
    
    # Calculate creativity score
    creativity_score = calculate_creativity_score(essay)
    
    # Calculate final score using weights from params
    total_weight = params.grammar_weight + params.vocabulary_weight + params.creativity_weight
    if total_weight == 0:
        final_score = 0  # or some default value
    else:
        final_score = (
            (grammar_score * params.grammar_weight +
            vocabulary_score * params.vocabulary_weight +
            creativity_score * params.creativity_weight) / total_weight
        ) * 10  # Scale to 0-10
    
    # Word count check
    word_count = len(essay.split())
    if word_count < params.min_word_count or word_count > params.max_word_count:
        feedback.append(f"Word count ({word_count}) is outside the required range ({params.min_word_count}-{params.max_word_count}).")
    
    # Generate feedback
    feedback.extend([
        f"Spelling errors: {spelling_errors}",
        f"Grammar errors: {grammar_errors}",
        f"Punctuation errors: {punctuation_errors}",
    ])

    if params.grammar_weight > 0:
        feedback.append(f"Grammar score: {grammar_score:.2f}/10")
    if params.vocabulary_weight > 0:
        feedback.append(f"Vocabulary score: {vocabulary_score:.2f}/10")
    if params.creativity_weight > 0:
        feedback.append(f"Creativity score: {creativity_score:.2f}/10")
    
    return {
        "score": round(final_score, 2),
        "detailed_errors": detailed_errors,
        "grammar_score": round(grammar_score, 2) if params.grammar_weight > 0 else None,
        "vocabulary_score": round(vocabulary_score, 2) if params.vocabulary_weight > 0 else None,
        "creativity_score": round(creativity_score, 2) if params.creativity_weight > 0 else None,
        "feedback": feedback,
        "original_essay": essay,
        "corrected_essay": corrected_version,
        "total_words": total_words,
        "error_rate": round(error_rate * 100, 2)
    }

def calculate_creativity_score(essay):
    # Tokenize the essay
    tokens = word_tokenize(essay.lower())
    unique_words = set(tokens)
    
    # Sentiment analysis
    blob = TextBlob(essay)
    sentiment_score = abs(blob.sentiment.polarity)  # 0-1 scale
    
    # Unique word usage
    unique_word_ratio = len(unique_words) / len(tokens)
    
    # Metaphor detection (simplified)
    potential_metaphors = 0
    for word in unique_words:
        synsets = wn.synsets(word)
        if synsets and len(synsets[0].examples()) > 0:
            potential_metaphors += 1
    metaphor_score = min(potential_metaphors / (len(unique_words) * 0.1), 1)  # Expect up to 10% metaphorical words
    
    # Sentence variety
    sentences = blob.sentences
    sentence_lengths = [len(word_tokenize(str(sentence))) for sentence in sentences]
    length_variety = max(0, min(1, (max(sentence_lengths) - min(sentence_lengths)) / 15))
    
    # Rare word usage
    word_frequencies = nltk.FreqDist(tokens)
    rare_words = sum(1 for word, freq in word_frequencies.items() if freq == 1)
    rare_word_score = min(rare_words / (len(unique_words) * 0.05), 1)  # Expect up to 5% rare words
    
    # Calculate creativity score
    creativity_score = (sentiment_score + unique_word_ratio + metaphor_score + length_variety + rare_word_score) / 5
    
    return creativity_score * 10  # Scale to 0-10

def calculate_vocabulary_complexity(essay):
    # Tokenize the essay
    tokens = word_tokenize(essay.lower())
    
    # Get unique words
    unique_words = set(tokens)
    
    # Calculate average word length
    avg_word_length = sum(len(word) for word in unique_words) / len(unique_words)
    
    # Calculate lexical diversity (unique words / total words)
    lexical_diversity = len(unique_words) / len(tokens)
    
    # Calculate average word complexity using WordNet
    word_complexities = []
    for word in unique_words:
        synsets = wordnet.synsets(word)
        if synsets:
            # Use the number of lemmas and depth in the hierarchy as measures of complexity
            complexity = sum(len(s.lemmas()) + s.max_depth() for s in synsets) / len(synsets)
            word_complexities.append(complexity)
    
    avg_word_complexity = sum(word_complexities) / len(word_complexities) if word_complexities else 0
    
    # Normalize scores
    normalized_length = min(avg_word_length / 8, 1)  # Assume max average length is 8
    normalized_diversity = min(lexical_diversity * 2, 1)  # Multiply by 2 to give more weight to diversity
    normalized_complexity = min(avg_word_complexity / 15, 1)  # Assume max complexity is 15
    
    # Calculate overall vocabulary score
    vocabulary_score = (normalized_length + normalized_diversity + normalized_complexity) / 3
    
    return vocabulary_score * 10  # Scale to 0-10

# Update the grade_essay function to use the new advanced_grade_essay function
@app.post("/grade")
async def grade_essay(essay_input: EssayInput, essay_type: str = "medium", grading_params: GradingParameters = None):
    essay = essay_input.essay
    corrected_version = grammar_model(essay)[0]['generated_text']
    
    if grading_params:
        params = GradingParameters(
            essay_type=essay_type,
            min_word_count=grading_params.min_word_count,
            max_word_count=grading_params.max_word_count,
            grammar_weight=grading_params.grammar_weight,
            vocabulary_weight=grading_params.vocabulary_weight,
            creativity_weight=grading_params.creativity_weight
        )
    else:
        params = default_grading_parameters.get(essay_type, default_grading_parameters["medium"])
    
    result = advanced_grade_essay(essay, corrected_version, params)
    return result

@app.post("/set_grading_parameters")
def set_grading_parameters(params: GradingParameters):
    default_grading_parameters[params.essay_type] = params
    return {"message": f"Grading parameters for {params.essay_type} essays updated successfully"}