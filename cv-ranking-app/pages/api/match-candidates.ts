/**
 * Job-based candidate matching API
 * Uses existing cosine similarity and ranking logic (no AI)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

// Skill variations for better matching
const SKILL_VARIATIONS: Record<string, string[]> = {
  // Languages
  javascript: ['javascript', 'js', 'ecmascript', 'es6', 'es2015'],
  java: ['java', 'j2ee', 'jee', 'j2se'],
  typescript: ['typescript', 'ts'],
  python: ['python', 'py', 'python3'],
  'c++': ['c++', 'cpp', 'cplusplus', 'c plus plus'],
  'c#': ['c#', 'csharp', 'c sharp'],
  c: ['c language', 'clang'],
  go: ['go', 'golang'],
  rust: ['rust', 'rustlang'],
  ruby: ['ruby', 'rb'],
  php: ['php', 'php7', 'php8'],
  swift: ['swift', 'swiftui'],
  kotlin: ['kotlin', 'kt'],
  scala: ['scala'],
  r: ['r language', 'rlang'],
  
  // Frameworks - Backend
  springboot: ['springboot', 'spring boot', 'spring-boot'],
  spring: ['spring', 'springframework', 'spring framework'],
  nodejs: ['nodejs', 'node', 'node.js', 'node js'],
  express: ['express', 'expressjs', 'express.js'],
  django: ['django', 'django rest', 'drf'],
  flask: ['flask', 'flask api'],
  fastapi: ['fastapi', 'fast api'],
  dotnet: ['dotnet', '.net', 'dot net', '.net core', 'dotnet core', 'asp.net'],
  rails: ['rails', 'ruby on rails', 'ror'],
  laravel: ['laravel', 'lumen'],
  
  // Frameworks - Frontend
  reactjs: ['reactjs', 'react', 'react.js', 'react js', 'reactdom'],
  reactnative: ['react native', 'reactnative', 'react-native', 'rn'],
  vuejs: ['vuejs', 'vue', 'vue.js', 'vue js', 'vue3', 'nuxt', 'nuxtjs'],
  angularjs: ['angularjs', 'angular', 'angular.js', 'angular js', 'ng'],
  nextjs: ['nextjs', 'next', 'next.js', 'next js'],
  svelte: ['svelte', 'sveltekit'],
  flutter: ['flutter', 'dart flutter'],
  
  // Databases
  mongodb: ['mongodb', 'mongo', 'mongoose'],
  postgresql: ['postgresql', 'postgres', 'psql', 'pg'],
  mysql: ['mysql', 'mariadb', 'maria db'],
  sql: ['sql', 'structured query language'],
  sqlserver: ['sql server', 'sqlserver', 'mssql', 'microsoft sql'],
  oracle: ['oracle', 'oracle db', 'oracledb', 'plsql', 'pl/sql'],
  redis: ['redis', 'redis cache'],
  elasticsearch: ['elasticsearch', 'elastic', 'es', 'elk'],
  
  // Cloud & DevOps
  aws: ['aws', 'amazon web services', 'amazon aws'],
  azure: ['azure', 'microsoft azure', 'ms azure'],
  gcp: ['gcp', 'google cloud', 'google cloud platform'],
  docker: ['docker', 'dockerfile', 'docker compose', 'containerization'],
  kubernetes: ['kubernetes', 'k8s', 'kube'],
  jenkins: ['jenkins', 'jenkins ci'],
  terraform: ['terraform', 'tf'],
  ansible: ['ansible'],
  cicd: ['ci/cd', 'cicd', 'ci cd', 'continuous integration', 'continuous deployment'],
  
  // AI/ML
  machinelearning: ['machine learning', 'ml', 'machinelearning', 'machine-learning'],
  deeplearning: ['deep learning', 'dl', 'deeplearning', 'deep-learning'],
  tensorflow: ['tensorflow', 'tf', 'keras'],
  pytorch: ['pytorch', 'torch'],
  ai: ['ai', 'artificial intelligence'],
  
  // Web Technologies
  html: ['html', 'html5', 'html 5'],
  css: ['css', 'css3', 'css 3', 'scss', 'sass', 'less', 'stylus'],
  xml: ['xml', 'xslt', 'xpath'],
  json: ['json', 'json api'],
  
  // Tools & Version Control
  git: ['git', 'git version control'],
  github: ['github', 'gh'],
  gitlab: ['gitlab', 'gl'],
  bitbucket: ['bitbucket', 'bb'],
  jira: ['jira', 'atlassian jira'],
  
  // Methodologies
  agile: ['agile', 'agile methodology'],
  scrum: ['scrum', 'scrum master', 'scrum methodology'],
  kanban: ['kanban', 'kanban board'],
  
  // APIs
  restapi: ['rest', 'restapi', 'rest api', 'restful', 'rest-api', 'restful api'],
  graphql: ['graphql', 'gql', 'graph ql'],
  api: ['api', 'apis', 'web api', 'web apis'],
  
  // Mobile
  android: ['android', 'android sdk'],
  ios: ['ios', 'iphone', 'ipad', 'swift ios'],
};

// Skill embeddings for cosine similarity (simplified vectors)
const SKILL_EMBEDDINGS: Record<string, number[]> = {
  // Backend languages cluster
  java: [1.0, 0.3, 0.0, 0.0, 0.0, 0.3],
  'c++': [0.8, 0.5, 0.0, 0.0, 0.0, 0.2],
  c: [0.7, 0.5, 0.0, 0.0, 0.0, 0.1],
  'c#': [0.9, 0.3, 0.0, 0.0, 0.2, 0.3],
  python: [0.7, 0.4, 0.0, 0.5, 0.0, 0.4],
  go: [0.8, 0.4, 0.0, 0.0, 0.0, 0.3],
  rust: [0.8, 0.5, 0.0, 0.0, 0.0, 0.2],
  
  // Frontend cluster
  javascript: [0.3, 0.0, 1.0, 0.0, 0.0, 0.3],
  typescript: [0.4, 0.0, 0.95, 0.0, 0.0, 0.4],
  react: [0.2, 0.0, 0.9, 0.0, 0.0, 0.3],
  angular: [0.2, 0.0, 0.85, 0.0, 0.0, 0.3],
  vue: [0.2, 0.0, 0.85, 0.0, 0.0, 0.3],
  html: [0.1, 0.0, 0.8, 0.0, 0.0, 0.1],
  css: [0.1, 0.0, 0.75, 0.0, 0.0, 0.1],
  
  // Data/ML cluster
  machinelearning: [0.3, 0.2, 0.0, 1.0, 0.0, 0.2],
  deeplearning: [0.2, 0.2, 0.0, 0.95, 0.0, 0.2],
  tensorflow: [0.2, 0.1, 0.0, 0.9, 0.0, 0.2],
  pytorch: [0.2, 0.1, 0.0, 0.9, 0.0, 0.2],
  
  // Cloud/DevOps cluster
  aws: [0.2, 0.2, 0.0, 0.0, 1.0, 0.5],
  azure: [0.2, 0.2, 0.0, 0.0, 0.95, 0.5],
  docker: [0.3, 0.3, 0.0, 0.0, 0.8, 0.4],
  kubernetes: [0.2, 0.2, 0.0, 0.0, 0.85, 0.4],
  
  // Database cluster
  sql: [0.4, 0.3, 0.0, 0.0, 0.0, 1.0],
  mongodb: [0.3, 0.2, 0.2, 0.0, 0.0, 0.9],
  postgresql: [0.4, 0.3, 0.0, 0.0, 0.0, 0.95],
  mysql: [0.4, 0.3, 0.0, 0.0, 0.0, 0.95],
};

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().replace(/[.\s\-_]/g, '').trim();
}

function getSkillVariations(skill: string): string[] {
  const normalized = normalizeSkill(skill);
  for (const [key, variations] of Object.entries(SKILL_VARIATIONS)) {
    if (variations.some(v => normalizeSkill(v) === normalized)) {
      return variations.map(normalizeSkill);
    }
  }
  return [normalized];
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getSkillEmbedding(skill: string): number[] | null {
  const normalized = normalizeSkill(skill);
  
  // Direct lookup
  if (SKILL_EMBEDDINGS[normalized]) {
    return SKILL_EMBEDDINGS[normalized];
  }
  
  // Check variations
  for (const [key, embedding] of Object.entries(SKILL_EMBEDDINGS)) {
    const variations = getSkillVariations(key);
    if (variations.includes(normalized)) {
      return embedding;
    }
  }
  
  return null;
}

interface SkillMatch {
  required: string;
  matched: string;
  matchType: 'exact' | 'variation' | 'similar' | 'none';
  similarity: number;
}

function matchSkillWithCosine(requiredSkill: string, candidateSkills: string[]): SkillMatch {
  const reqNorm = normalizeSkill(requiredSkill);
  const reqVariations = getSkillVariations(requiredSkill);
  
  // Ensure candidateSkills is always an array
  const skills = Array.isArray(candidateSkills) ? candidateSkills : [];
  
  // 1. Check for exact match
  for (const candSkill of skills) {
    const candNorm = normalizeSkill(candSkill);
    if (reqNorm === candNorm) {
      return { required: requiredSkill, matched: candSkill, matchType: 'exact', similarity: 1.0 };
    }
  }
  
  // 2. Check for variation match (both directions)
  for (const candSkill of skills) {
    const candNorm = normalizeSkill(candSkill);
    const candVariations = getSkillVariations(candSkill);
    
    // Check if candidate skill is in required skill's variations
    if (reqVariations.includes(candNorm)) {
      return { required: requiredSkill, matched: candSkill, matchType: 'variation', similarity: 0.95 };
    }
    // Check if required skill is in candidate skill's variations
    if (candVariations.includes(reqNorm)) {
      return { required: requiredSkill, matched: candSkill, matchType: 'variation', similarity: 0.95 };
    }
  }
  
  // 3. Cosine similarity matching
  const reqEmbedding = getSkillEmbedding(requiredSkill);
  if (reqEmbedding) {
    let bestMatch = '';
    let bestSimilarity = 0;
    
    for (const candSkill of skills) {
      const candEmbedding = getSkillEmbedding(candSkill);
      if (candEmbedding) {
        const similarity = cosineSimilarity(reqEmbedding, candEmbedding);
        if (similarity > bestSimilarity && similarity >= 0.7) {
          bestSimilarity = similarity;
          bestMatch = candSkill;
        }
      }
    }
    
    if (bestMatch && bestSimilarity >= 0.7) {
      return { required: requiredSkill, matched: bestMatch, matchType: 'similar', similarity: bestSimilarity };
    }
  }
  
  // 4. Substring matching (for compound skills like "react native" containing "react")
  // Be very careful to avoid false positives like html/ml, java/javascript
  for (const candSkill of skills) {
    const candNorm = normalizeSkill(candSkill);
    // Only match if the shorter string is reasonably long and length difference is small
    const minLen = Math.min(reqNorm.length, candNorm.length);
    const maxLen = Math.max(reqNorm.length, candNorm.length);
    
    // Skip if either is too short (less than 4 chars) or length difference is too big
    if (minLen < 4 || (maxLen - minLen) > 3) continue;
    
    // Check if one is a suffix/prefix of the other (e.g., "react" in "reactnative")
    if (candNorm.startsWith(reqNorm) || candNorm.endsWith(reqNorm) ||
        reqNorm.startsWith(candNorm) || reqNorm.endsWith(candNorm)) {
      // Additional check: reject if one is a known different skill
      // e.g., "html" should not match "ml", "java" should not match "javascript"
      const falsePositivePairs = [
        ['html', 'ml'], ['java', 'javascript'], ['c', 'c++'], ['c', 'css'],
        ['go', 'golang'], ['r', 'react'], ['sql', 'mysql'], ['sql', 'nosql']
      ];
      let isFalsePositive = false;
      for (const [a, b] of falsePositivePairs) {
        if ((reqNorm === a && candNorm.includes(b)) || 
            (candNorm === a && reqNorm.includes(b)) ||
            (reqNorm.includes(a) && candNorm === b) ||
            (candNorm.includes(a) && reqNorm === b)) {
          isFalsePositive = true;
          break;
        }
      }
      if (!isFalsePositive) {
        return { required: requiredSkill, matched: candSkill, matchType: 'similar', similarity: 0.75 };
      }
    }
  }
  
  return { required: requiredSkill, matched: '', matchType: 'none', similarity: 0 };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client: MongoClient | null = null;

  try {
    const { jobId, requiredSkills, experienceRequired } = req.body;

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'capgemini';

    if (!mongoUri) {
      return res.status(500).json({ error: 'MongoDB URI not configured' });
    }

    client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(dbName);

    // Get all CVs
    const cvsCollection = db.collection('cvs');
    const allCVs = await cvsCollection.find({}).toArray();

    if (allCVs.length === 0) {
      return res.status(200).json({ candidates: [], total: 0 });
    }

    const skills = requiredSkills || [];
    
    // Score each candidate
    const scoredCandidates = allCVs.map((cv: any) => {
      // Extract candidate name from various possible locations
      const candidateName = cv.candidate_name ||
        cv.name || 
        cv.personal_info?.full_name || 
        cv.personal_info?.name ||
        cv.fullName ||
        'Unknown Candidate';
      
      // Extract email
      const candidateEmail = cv.email || 
        cv.personal_info?.email ||
        (Array.isArray(cv.personal_info?.emails) ? cv.personal_info.emails[0] : null);
      
      // Extract phone
      const candidatePhone = cv.phone || cv.personal_info?.phone;
      
      // Extract location
      const candidateLocation = cv.location || cv.personal_info?.location;
      
      // Flatten skills from various structures
      let candidateSkills: string[] = [];
      
      if (Array.isArray(cv.skills)) {
        // Skills is already an array
        candidateSkills = cv.skills;
      } else if (cv.skills && typeof cv.skills === 'object') {
        // Skills is an object with categories like { programming_languages: [...], frameworks: [...] }
        const skillCategories = [
          'programming_languages', 'frameworks', 'web_technologies', 
          'mobile_technologies', 'databases', 'devops_tools', 
          'data_science', 'modeling_design', 'soft_skills',
          'languages', 'tools', 'technologies', 'cloud', 'other'
        ];
        
        for (const category of skillCategories) {
          if (Array.isArray(cv.skills[category])) {
            candidateSkills.push(...cv.skills[category]);
          }
        }
        
        // Also check for any other arrays in skills object
        for (const key of Object.keys(cv.skills)) {
          if (Array.isArray(cv.skills[key]) && !skillCategories.includes(key)) {
            candidateSkills.push(...cv.skills[key]);
          }
        }
      }
      
      // Also check for technologies from experience/projects
      if (Array.isArray(cv.experience)) {
        cv.experience.forEach((exp: any) => {
          if (Array.isArray(exp.technologies)) {
            candidateSkills.push(...exp.technologies);
          }
        });
      }
      if (Array.isArray(cv.projects)) {
        cv.projects.forEach((proj: any) => {
          if (Array.isArray(proj.technologies)) {
            candidateSkills.push(...proj.technologies);
          }
        });
      }
      
      // Remove duplicates
      candidateSkills = Array.from(new Set(candidateSkills.filter(Boolean)));
      
      // Match each required skill
      const skillMatches: SkillMatch[] = skills.map((skill: string) => 
        matchSkillWithCosine(skill, candidateSkills)
      );
      
      // Calculate scores
      const matchedSkills = skillMatches.filter(m => m.matchType !== 'none');
      const exactMatches = skillMatches.filter(m => m.matchType === 'exact');
      const variationMatches = skillMatches.filter(m => m.matchType === 'variation');
      const similarMatches = skillMatches.filter(m => m.matchType === 'similar');
      const missingSkills = skillMatches.filter(m => m.matchType === 'none');
      
      // Weighted score calculation
      let skillScore = 0;
      if (skills.length > 0) {
        skillScore = (
          exactMatches.length * 1.0 +
          variationMatches.length * 0.95 +
          similarMatches.reduce((sum, m) => sum + m.similarity, 0)
        ) / skills.length * 100;
      }
      
      // Experience bonus
      let experienceBonus = 0;
      const expYears = cv.experience_years || cv.years_experience || 0;
      if (experienceRequired) {
        const reqYears = parseInt(experienceRequired) || 0;
        if (expYears >= reqYears) experienceBonus = 10;
        else if (expYears >= reqYears - 1) experienceBonus = 5;
        else if (expYears >= reqYears - 2) experienceBonus = 2;
      }
      
      // Education bonus
      let educationBonus = 0;
      // Handle education as string, array, or object
      let educationStr = '';
      if (typeof cv.education === 'string') {
        educationStr = cv.education.toLowerCase();
      } else if (Array.isArray(cv.education)) {
        educationStr = cv.education.map((e: any) => 
          typeof e === 'string' ? e : (e.degree || e.field || e.institution || '')
        ).join(' ').toLowerCase();
      } else if (cv.education && typeof cv.education === 'object') {
        educationStr = (cv.education.degree || cv.education.field || cv.education.institution || '').toLowerCase();
      }
      
      if (educationStr.includes('master') || educationStr.includes('phd') || educationStr.includes('doctorate')) {
        educationBonus = 5;
      } else if (educationStr.includes('bachelor') || educationStr.includes('licence') || educationStr.includes('ingénieur')) {
        educationBonus = 3;
      }
      
      const totalScore = Math.min(100, skillScore + experienceBonus + educationBonus);
      
      return {
        id: cv._id?.toString() || cv.id,
        name: candidateName,
        email: candidateEmail,
        phone: candidatePhone,
        location: candidateLocation,
        matchScore: Math.round(totalScore * 10) / 10,
        skillMatches: matchedSkills.map(m => ({
          skill: m.matched || m.required,
          type: m.matchType,
          similarity: m.similarity
        })),
        matchedSkillNames: matchedSkills.map(m => m.matched || m.required),
        missingSkills: missingSkills.map(m => m.required),
        exactMatchCount: exactMatches.length,
        totalMatchCount: matchedSkills.length,
        totalRequired: skills.length,
        experience_years: expYears,
        education: educationStr || undefined,
        summary: cv.summary || cv.professional_summary,
        allSkills: candidateSkills,
      };
    });
    
    // Sort by score descending
    scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
    
    // Add rank
    scoredCandidates.forEach((c, i) => {
      (c as any).rank = i + 1;
    });

    return res.status(200).json({
      candidates: scoredCandidates,
      total: scoredCandidates.length,
      excellentCount: scoredCandidates.filter(c => c.matchScore >= 80).length,
      goodCount: scoredCandidates.filter(c => c.matchScore >= 60 && c.matchScore < 80).length,
      fairCount: scoredCandidates.filter(c => c.matchScore < 60).length,
    });

  } catch (error: any) {
    console.error('Match candidates error:', error);
    return res.status(500).json({ error: error.message || 'Failed to match candidates' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
