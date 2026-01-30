/**
 * Cosine Similarity utilities for CV matching
 * Used by AI Recruiter for semantic skill matching
 */

// Skill embeddings - predefined vectors for common tech skills
// Similar technologies cluster together in vector space
const SKILL_VECTORS: Record<string, number[]> = {
  // Programming Languages - Java ecosystem
  'java': [1.0, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'j2ee': [0.9, 0.85, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'kotlin': [0.85, 0.9, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'scala': [0.8, 0.85, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'spring': [0.9, 0.7, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'springboot': [0.9, 0.7, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'hibernate': [0.85, 0.6, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'maven': [0.7, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'gradle': [0.7, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  
  // JavaScript ecosystem
  'javascript': [0.0, 0.0, 1.0, 0.9, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'typescript': [0.0, 0.0, 0.95, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'nodejs': [0.0, 0.0, 0.9, 0.85, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'express': [0.0, 0.0, 0.85, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'react': [0.0, 0.0, 0.85, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'angular': [0.0, 0.0, 0.8, 0.85, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'vue': [0.0, 0.0, 0.8, 0.75, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'nextjs': [0.0, 0.0, 0.85, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'nuxt': [0.0, 0.0, 0.8, 0.75, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  
  // Python ecosystem
  'python': [0.0, 0.0, 0.0, 0.0, 1.0, 0.9, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'django': [0.0, 0.0, 0.0, 0.0, 0.9, 0.85, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'flask': [0.0, 0.0, 0.0, 0.0, 0.85, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'fastapi': [0.0, 0.0, 0.0, 0.0, 0.9, 0.85, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'pandas': [0.0, 0.0, 0.0, 0.0, 0.8, 0.7, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'numpy': [0.0, 0.0, 0.0, 0.0, 0.8, 0.7, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  
  // ML/AI ecosystem
  'machinelearning': [0.0, 0.0, 0.0, 0.0, 0.7, 0.0, 1.0, 0.9, 0.0, 0.0, 0.0, 0.0, 0.0],
  'ml': [0.0, 0.0, 0.0, 0.0, 0.7, 0.0, 1.0, 0.9, 0.0, 0.0, 0.0, 0.0, 0.0],
  'deeplearning': [0.0, 0.0, 0.0, 0.0, 0.65, 0.0, 0.95, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'dl': [0.0, 0.0, 0.0, 0.0, 0.65, 0.0, 0.95, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'tensorflow': [0.0, 0.0, 0.0, 0.0, 0.6, 0.0, 0.9, 0.95, 0.0, 0.0, 0.0, 0.0, 0.0],
  'pytorch': [0.0, 0.0, 0.0, 0.0, 0.6, 0.0, 0.9, 0.95, 0.0, 0.0, 0.0, 0.0, 0.0],
  'keras': [0.0, 0.0, 0.0, 0.0, 0.6, 0.0, 0.85, 0.9, 0.0, 0.0, 0.0, 0.0, 0.0],
  'ai': [0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.85, 0.85, 0.0, 0.0, 0.0, 0.0, 0.0],
  'nlp': [0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.8, 0.85, 0.0, 0.0, 0.0, 0.0, 0.0],
  'computervision': [0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.8, 0.85, 0.0, 0.0, 0.0, 0.0, 0.0],
  
  // Database ecosystem
  'sql': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.8, 0.0, 0.0, 0.0],
  'mysql': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.95, 0.85, 0.0, 0.0, 0.0],
  'postgresql': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.95, 0.85, 0.0, 0.0, 0.0],
  'oracle': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.9, 0.8, 0.0, 0.0, 0.0],
  'mongodb': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.7, 1.0, 0.0, 0.0, 0.0],
  'nosql': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.6, 0.95, 0.0, 0.0, 0.0],
  'redis': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.5, 0.85, 0.0, 0.0, 0.0],
  'elasticsearch': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.6, 0.8, 0.0, 0.0, 0.0],
  
  // Cloud & DevOps
  'aws': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.8, 0.7],
  'azure': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.85, 1.0, 0.7],
  'gcp': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.85, 0.85, 1.0],
  'docker': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.7, 0.7, 0.7],
  'kubernetes': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.75, 0.75, 0.75],
  'devops': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 0.8, 0.8],
  'cicd': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.7, 0.7, 0.7],
  'jenkins': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.65, 0.65, 0.65],
  'terraform': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.7, 0.7, 0.7],
  'ansible': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.65, 0.65, 0.65],
  
  // Mobile
  'android': [0.6, 0.7, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'ios': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'swift': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'flutter': [0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'reactnative': [0.0, 0.0, 0.7, 0.6, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  
  // Other languages
  'csharp': [0.3, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0],
  'dotnet': [0.3, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.6, 0.0],
  'cpp': [0.2, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'c': [0.1, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'go': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.5, 0.5, 0.5],
  'golang': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.5, 0.5, 0.5],
  'rust': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.4, 0.4, 0.4],
  'ruby': [0.0, 0.0, 0.3, 0.0, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'php': [0.0, 0.0, 0.4, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
};

// Skill aliases for normalization
const SKILL_ALIASES: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'node': 'nodejs',
  'node.js': 'nodejs',
  'react.js': 'react',
  'reactjs': 'react',
  'vue.js': 'vue',
  'vuejs': 'vue',
  'next.js': 'nextjs',
  'nuxt.js': 'nuxt',
  'spring boot': 'springboot',
  'spring-boot': 'springboot',
  'postgres': 'postgresql',
  'mongo': 'mongodb',
  'k8s': 'kubernetes',
  'kube': 'kubernetes',
  'google cloud': 'gcp',
  'google cloud platform': 'gcp',
  'amazon web services': 'aws',
  'microsoft azure': 'azure',
  'machine learning': 'machinelearning',
  'deep learning': 'deeplearning',
  'artificial intelligence': 'ai',
  'computer vision': 'computervision',
  'natural language processing': 'nlp',
  'c#': 'csharp',
  '.net': 'dotnet',
  'c++': 'cpp',
  'ci/cd': 'cicd',
  'react native': 'reactnative',
  'react-native': 'reactnative',
};

/**
 * Normalize a skill name by removing special chars and applying aliases
 */
export function normalizeSkill(skill: string): string {
  const lower = skill.toLowerCase().trim();
  // Check alias first
  if (SKILL_ALIASES[lower]) {
    return SKILL_ALIASES[lower];
  }
  // Remove special characters for matching
  const cleaned = lower.replace(/[^a-z0-9]/g, '');
  return SKILL_ALIASES[cleaned] || cleaned;
}

/**
 * Get vector for a skill (returns default vector if not found)
 */
function getSkillVector(skill: string): number[] {
  const normalized = normalizeSkill(skill);
  
  // Return existing vector
  if (SKILL_VECTORS[normalized]) {
    return SKILL_VECTORS[normalized];
  }
  
  // Generate a simple hash-based vector for unknown skills
  const hash = normalized.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Create a sparse vector based on the hash
  const vector = new Array(13).fill(0);
  vector[Math.abs(hash) % 13] = 1.0;
  return vector;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  // Ensure vectors have same length by padding shorter one
  const maxLen = Math.max(vecA.length, vecB.length);
  const a = [...vecA, ...new Array(maxLen - vecA.length).fill(0)];
  const b = [...vecB, ...new Array(maxLen - vecB.length).fill(0)];
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < maxLen; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate similarity between two skills
 */
export function skillSimilarity(skill1: string, skill2: string): number {
  const norm1 = normalizeSkill(skill1);
  const norm2 = normalizeSkill(skill2);
  
  // Exact match after normalization
  if (norm1 === norm2) return 1.0;
  
  // Check if one contains the other (partial match)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.85;
  }
  
  // Calculate vector-based similarity
  const vec1 = getSkillVector(skill1);
  const vec2 = getSkillVector(skill2);
  
  return cosineSimilarity(vec1, vec2);
}

/**
 * Find best matching skill from a list
 */
export function findBestMatch(
  targetSkill: string, 
  candidateSkills: string[], 
  threshold: number = 0.6
): { skill: string; similarity: number } | null {
  let bestMatch: { skill: string; similarity: number } | null = null;
  
  for (const skill of candidateSkills) {
    const sim = skillSimilarity(targetSkill, skill);
    if (sim >= threshold && (!bestMatch || sim > bestMatch.similarity)) {
      bestMatch = { skill, similarity: sim };
    }
  }
  
  return bestMatch;
}

/**
 * Calculate overall skill match score between required and candidate skills
 */
export function calculateSkillMatchScore(
  requiredSkills: string[], 
  candidateSkills: string[],
  threshold: number = 0.6
): {
  score: number;
  matchedSkills: Array<{ required: string; matched: string; similarity: number }>;
  unmatchedSkills: string[];
} {
  const matchedSkills: Array<{ required: string; matched: string; similarity: number }> = [];
  const unmatchedSkills: string[] = [];
  
  for (const required of requiredSkills) {
    const match = findBestMatch(required, candidateSkills, threshold);
    if (match) {
      matchedSkills.push({
        required,
        matched: match.skill,
        similarity: match.similarity
      });
    } else {
      unmatchedSkills.push(required);
    }
  }
  
  // Calculate weighted score
  if (requiredSkills.length === 0) return { score: 1.0, matchedSkills, unmatchedSkills };
  
  const totalSimilarity = matchedSkills.reduce((sum, m) => sum + m.similarity, 0);
  const score = totalSimilarity / requiredSkills.length;
  
  return { score, matchedSkills, unmatchedSkills };
}

/**
 * Generate text embedding using simple TF-IDF-like approach
 * For production, could use actual embeddings from Mistral
 */
export function textToVector(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const vector: number[] = new Array(100).fill(0);
  
  for (const word of words) {
    // Simple hash to index
    const hash = word.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const index = Math.abs(hash) % 100;
    vector[index] += 1;
  }
  
  // Normalize
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }
  }
  
  return vector;
}

/**
 * Calculate text similarity
 */
export function textSimilarity(text1: string, text2: string): number {
  const vec1 = textToVector(text1);
  const vec2 = textToVector(text2);
  return cosineSimilarity(vec1, vec2);
}

/**
 * Get related skills for a given skill (for suggestions)
 */
export function getRelatedSkills(skill: string, topN: number = 5): string[] {
  const targetVec = getSkillVector(skill);
  const similarities: Array<{ skill: string; sim: number }> = [];
  
  for (const [skillName, vec] of Object.entries(SKILL_VECTORS)) {
    if (normalizeSkill(skill) === skillName) continue;
    
    const sim = cosineSimilarity(targetVec, vec);
    if (sim > 0.3) {
      similarities.push({ skill: skillName, sim });
    }
  }
  
  return similarities
    .sort((a, b) => b.sim - a.sim)
    .slice(0, topN)
    .map(s => s.skill);
}
