/**
 * JavaScript/TypeScript implementation of CV ranking
 * This is a simplified version that can be called directly from Next.js
 * For full accuracy, use the Python version via the /api/rank endpoint
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// Simplified company tiers
const COMPANY_TIERS: Record<string, number> = {
  google: 1.0,
  microsoft: 1.0,
  amazon: 1.0,
  apple: 1.0,
  meta: 1.0,
  facebook: 1.0,
  netflix: 1.0,
  capgemini: 0.8,
  accenture: 0.8,
  atos: 0.8,
  deloitte: 0.8,
};

function getCompanyTier(company: string): number {
  const companyLower = company.toLowerCase();
  for (const [key, score] of Object.entries(COMPANY_TIERS)) {
    if (companyLower.includes(key)) {
      return score;
    }
  }
  return 0.33; // Default tier
}

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().replace(/[.\s]/g, '');
}

// Skill variations for better matching
const SKILL_VARIATIONS: Record<string, string[]> = {
  javascript: ['javascript', 'js', 'ecmascript'],
  java: ['java'], // Explicitly separate from javascript
  typescript: ['typescript', 'ts'],
  python: ['python', 'py'],
  springboot: ['springboot', 'spring'],
  nodejs: ['nodejs', 'node'],
  reactjs: ['reactjs', 'react'],
  vuejs: ['vuejs', 'vue'],
  angularjs: ['angularjs', 'angular'],
};

// Tech stack categories for role inference
const FRONTEND_TECHS = [
  'react', 'reactjs', 'vue', 'vuejs', 'angular', 'angularjs', 'svelte', 'next', 'nextjs',
  'nuxt', 'nuxtjs', 'gatsby', 'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap',
  'jquery', 'redux', 'mobx', 'webpack', 'vite', 'flutter', 'react native', 'reactnative'
];

const BACKEND_TECHS = [
  'node', 'nodejs', 'express', 'expressjs', 'nestjs', 'fastify', 'django', 'flask',
  'fastapi', 'spring', 'springboot', 'java', 'dotnet', '.net', 'asp.net', 'laravel',
  'php', 'ruby', 'rails', 'go', 'golang', 'rust', 'c#', 'csharp'
];

const DATABASE_TECHS = [
  'mongodb', 'mysql', 'postgresql', 'postgres', 'sql', 'oracle', 'redis', 'elasticsearch',
  'dynamodb', 'firebase', 'supabase', 'prisma', 'sequelize', 'typeorm'
];

// Check if a skill matches any in a category
function hasSkillInCategory(skills: string[], category: string[]): boolean {
  const normalizedSkills = skills.map(s => normalizeSkill(s));
  return category.some(cat => 
    normalizedSkills.some(skill => 
      skill.includes(normalizeSkill(cat)) || normalizeSkill(cat).includes(skill)
    )
  );
}

// Infer role from technologies
function inferRoleFromTech(technologies: string[]): string[] {
  const roles: string[] = [];
  
  const hasFrontend = hasSkillInCategory(technologies, FRONTEND_TECHS);
  const hasBackend = hasSkillInCategory(technologies, BACKEND_TECHS);
  const hasDatabase = hasSkillInCategory(technologies, DATABASE_TECHS);
  
  if (hasFrontend && (hasBackend || hasDatabase)) {
    roles.push('fullstack', 'full stack', 'full-stack');
  }
  if (hasFrontend) {
    roles.push('frontend', 'front end', 'front-end');
  }
  if (hasBackend || hasDatabase) {
    roles.push('backend', 'back end', 'back-end');
  }
  
  return roles;
}

function matchSkills(candidateSkills: string[], requiredSkills: string[]): [number, number] {
  if (!requiredSkills || requiredSkills.length === 0) {
    return [0, 0];
  }

  const candidateNorm = candidateSkills.map(normalizeSkill);
  const requiredNorm = requiredSkills.map(normalizeSkill);

  let matched = 0;
  for (const reqSkill of requiredNorm) {
    for (const candSkill of candidateNorm) {
      // Exact match first
      if (reqSkill === candSkill) {
        matched++;
        break;
      }
      
      // Check if they're in the same variation group
      let reqMatched = false;
      for (const [, variations] of Object.entries(SKILL_VARIATIONS)) {
        if (variations.includes(reqSkill) && variations.includes(candSkill)) {
          matched++;
          reqMatched = true;
          break;
        }
      }
      
      if (reqMatched) break;
      
      // Fuzzy match only if similar length to avoid java/javascript
      if (reqSkill.length > 3 && candSkill.length > 3) {
        if ((reqSkill.includes(candSkill) || candSkill.includes(reqSkill)) &&
            Math.abs(reqSkill.length - candSkill.length) <= 4) {
          matched++;
          break;
        }
      }
    }
  }

  return [matched, requiredSkills.length];
}

function extractDurationMonths(period: string, duration?: string): number {
  if (duration) {
    const monthsMatch = duration.match(/(\d+)\s*(?:mois|month|months?)/i);
    if (monthsMatch) {
      return parseFloat(monthsMatch[1]);
    }
  }

  if (!period) return 0;

  const periodLower = period.toLowerCase();
  if (periodLower.includes('present') || periodLower.includes('en cours')) {
    return 6.0;
  }

  const years = period.match(/\b(20\d{2})\b/g);
  if (years && years.length >= 2) {
    const startYear = parseInt(years[0]);
    const endYear = parseInt(years[years.length - 1]);
    return (endYear - startYear) * 12.0;
  }

  return 3.0;
}

function scoreExperience(
  experiences: any[],
  jobRole?: string,
  requiredSkills?: string[]
): [number, any] {
  if (!experiences || experiences.length === 0) {
    return [0, { reason: 'No experience', details: [] }];
  }

  const experienceScores: number[] = [];
  const details: any[] = [];

  for (const exp of experiences) {
    const company = exp.company || '';
    const role = exp.role || '';
    const period = exp.period || '';
    const technologies = exp.technologies || [];

    // Company reputation (15 pts)
    const tierScore = getCompanyTier(company);
    const companyScore = 15.0 * tierScore;

    // Role relevance (10 pts) - JOB-CENTRIC
    let roleScore = 0;
    let techRelevanceBonus = 0;
    let roleTitleMatchBonus = 0;
    let roleInferredFromTech = false;
    
    // PRIMARY: Check if experience uses required technologies
    if (requiredSkills && requiredSkills.length > 0 && technologies.length > 0) {
      const [matched, total] = matchSkills(technologies, requiredSkills);
      if (matched > 0) {
        techRelevanceBonus = 7.0 * (matched / total); // Reduced from 10 to 7 to make room for role matching
        roleScore = techRelevanceBonus;
      }
    }
    
    // ALWAYS check if role title matches target role (even when skills are provided)
    if (jobRole) {
      const roleLower = role.toLowerCase();
      const jobRoleLower = jobRole.toLowerCase();
      
      // Exact or near-exact match (e.g., "Full Stack Developer" matches "Full Stack Developer")
      if (roleLower === jobRoleLower || roleLower.includes(jobRoleLower) || jobRoleLower.includes(roleLower)) {
        roleTitleMatchBonus = 3.0; // High bonus for exact/similar match
      } else {
        // Keyword matching
        const jobKeywords = jobRoleLower.split(/\s+/).filter(kw => kw.length > 3);
        const roleKeywords = roleLower.split(/\s+/).filter(kw => kw.length > 3);
        
        // Count matching keywords
        const matches = jobKeywords.filter(jk => 
          roleKeywords.some(rk => rk.includes(jk) || jk.includes(rk))
        ).length;
        
        if (matches > 0 && jobKeywords.length > 0) {
          roleTitleMatchBonus = 3.0 * (matches / jobKeywords.length);
        }
      }
      
      // SMART ROLE INFERENCE: If no title match, check if technologies imply the role
      // e.g., if target is "Full Stack Developer" and candidate has React + Node.js = Full Stack!
      if (roleTitleMatchBonus < 2.0 && technologies.length > 0) {
        const inferredRoles = inferRoleFromTech(technologies);
        
        // Check if any inferred role matches the job role
        const jobRoleNormalized = jobRoleLower.replace(/[-\s]/g, '');
        const matchesInferredRole = inferredRoles.some(inferredRole => 
          jobRoleNormalized.includes(inferredRole.replace(/[-\s]/g, '')) ||
          inferredRole.replace(/[-\s]/g, '').includes(jobRoleNormalized)
        );
        
        if (matchesInferredRole) {
          // Give bonus for having the right tech stack even if title doesn't match
          roleTitleMatchBonus = Math.max(roleTitleMatchBonus, 2.5);
          roleInferredFromTech = true;
        }
      }
      
      // Add role title match bonus to role score
      roleScore = Math.min(roleScore + roleTitleMatchBonus, 10.0);
    }
    
    // If no job requirements at all, give base score
    if (!requiredSkills && !jobRole) {
      roleScore = 5.0;
    } else if (!requiredSkills && jobRole && roleScore === 0) {
      // If only jobRole provided but no match found, give minimal score
      roleScore = 2.0;
    }

    // Duration (10 pts) - longer experience = better
    const durationMonths = extractDurationMonths(period, exp.duration);
    let durationScore = 2.0;
    if (durationMonths < 3) {
      durationScore = 2.0; // Very short / internship
    } else if (durationMonths >= 3 && durationMonths <= 6) {
      durationScore = 5.0; // Short experience
    } else if (durationMonths > 6 && durationMonths <= 12) {
      durationScore = 7.0; // Decent experience
    } else if (durationMonths > 12 && durationMonths <= 24) {
      durationScore = 9.0; // Good long-term
    } else if (durationMonths > 24) {
      durationScore = 10.0; // Strong long-term
    }
    
    // Recency bonus
    const currentYear = 2026;
    const periodLower = period.toLowerCase();
    let recencyBonus = 0;
    if (periodLower.includes('present') || periodLower.includes('en cours')) {
      recencyBonus = 2.0; // Current position
    } else {
      const years = period.match(/\b(20\d{2})\b/g);
      if (years && years.length > 0) {
        const endYear = parseInt(years[years.length - 1]);
        const yearsAgo = currentYear - endYear;
        if (yearsAgo <= 1) recencyBonus = 1.5;
        else if (yearsAgo <= 2) recencyBonus = 1.0;
        else if (yearsAgo >= 5) recencyBonus = -1.0;
      }
    }
    durationScore = Math.min(durationScore + recencyBonus, 10.0);

    const expScore = companyScore + roleScore + durationScore;
    experienceScores.push(expScore);

    details.push({
      company,
      companyScore: Math.round(companyScore * 100) / 100,
      roleScore: Math.round(roleScore * 100) / 100,
      techRelevance: techRelevanceBonus > 0 ? `+${Math.round(techRelevanceBonus * 100) / 100} (matches job skills)` : null,
      roleTitleMatch: roleTitleMatchBonus > 0 
        ? `+${Math.round(roleTitleMatchBonus * 100) / 100} (${roleInferredFromTech ? 'inferred from tech stack: frontend + backend = fullstack' : 'role title matches target'})` 
        : null,
      durationScore: Math.round(durationScore * 100) / 100,
      experienceScore: Math.round(expScore * 100) / 100,
    });
  }

  // Weighted average
  let finalScore = 0;
  if (experienceScores.length === 1) {
    finalScore = Math.min(experienceScores[0], 35.0);
  } else {
    const sorted = [...experienceScores].sort((a, b) => b - a);
    const best = sorted[0];
    const others = sorted.slice(1);
    const otherAvg = others.length > 0 ? others.reduce((a, b) => a + b, 0) / others.length : 0;
    const weighted = best * 0.5 + otherAvg * 0.5;
    const bonus = Math.min(experienceScores.length - 1, 3) * 1.5;
    finalScore = Math.min(weighted + bonus, 35.0);
  }

  // CROSS-EXPERIENCE ROLE INFERENCE: Check if candidate has fullstack skills across ALL experiences
  // e.g., Frontend dev at Company A + Backend dev at Company B = Full Stack candidate!
  let crossExperienceBonus = 0;
  let crossExperienceNote = '';
  if (jobRole && experiences.length > 1) {
    const allTechs: string[] = [];
    experiences.forEach(exp => {
      allTechs.push(...(exp.technologies || []));
    });
    
    const jobRoleLower = jobRole.toLowerCase().replace(/[-\s]/g, '');
    const inferredRoles = inferRoleFromTech(allTechs);
    
    // If target is fullstack and candidate has frontend + backend across experiences
    const isFullstackTarget = jobRoleLower.includes('fullstack') || jobRoleLower.includes('full');
    const hasFullstackSkills = inferredRoles.some(r => r.includes('fullstack'));
    
    if (isFullstackTarget && hasFullstackSkills) {
      // Check if no single experience already got the fullstack bonus
      const alreadyHasBonus = details.some((d: any) => d.roleTitleMatch?.includes('inferred from tech'));
      if (!alreadyHasBonus) {
        crossExperienceBonus = 2.0;
        crossExperienceNote = 'Cross-experience fullstack: has frontend + backend skills across different roles';
        finalScore = Math.min(finalScore + crossExperienceBonus, 35.0);
      }
    }
  }

  return [
    Math.round(finalScore * 100) / 100, 
    { 
      reason: `Experience at ${experiences.length} company/ies`, 
      details,
      crossExperienceBonus: crossExperienceBonus > 0 ? `+${crossExperienceBonus} pts` : null,
      crossExperienceNote: crossExperienceNote || null
    }
  ];
}

function scoreTechnicalSkills(
  skills: any,
  requiredSkills?: string[],
  experienceTechs: string[] = []
): [number, any] {
  if (!skills) {
    return [0, { reason: 'No skills listed', details: {} }];
  }

  const allSkills: string[] = [
    ...(skills.programming_languages || []),
    ...(skills.frameworks || []),
    ...(skills.web_technologies || []),
    ...(skills.mobile_technologies || []),
    ...(skills.databases || []),
    ...(skills.devops_tools || []),
  ];

  if (allSkills.length === 0) {
    return [0, { reason: 'No technical skills found', details: {} }];
  }

  let score = 0;
  const details: any = {
    coreSkillsMatch: 0,
    depthScore: 0,
    penalty: 0,
    categoryBreakdown: {},
  };

  // JOB-CENTRIC: When required skills are specified, matching is PRIMARY
  if (requiredSkills && requiredSkills.length > 0) {
    const [matched, total] = matchSkills(allSkills, requiredSkills);
    const matchRatio = total > 0 ? matched / total : 0;
    
    // Matching required skills: 20 pts (PRIMARY)
    const matchScore = 20.0 * matchRatio;
    score += matchScore;
    
    // Penalty if NO required skills match at all
    if (matched === 0) {
      score -= 5.0;
    }
    
    details.coreSkillsMatch = Math.round(matchScore * 100) / 100;
    details.matchedSkills = matched;
    details.totalRequired = total;
    details.matchRatio = Math.round(matchRatio * 100) / 100;
    details.noMatchPenalty = matched === 0 ? -5.0 : 0;
    
    // Depth: Check if matched skills are in experience (5 pts)
    let depthScore = 0;
    if (experienceTechs.length > 0) {
      for (const reqSkill of requiredSkills) {
        const reqNorm = normalizeSkill(reqSkill);
        for (const expTech of experienceTechs) {
          if (reqNorm.includes(normalizeSkill(expTech)) || normalizeSkill(expTech).includes(reqNorm)) {
            depthScore += 1.0;
            break;
          }
        }
      }
    }
    depthScore = Math.min(depthScore, 5.0);
    score += depthScore;
    details.depthScore = Math.round(depthScore * 100) / 100;
    
  } else {
    // No required skills - general assessment
    const skillCountScore = Math.min(15.0, allSkills.length * 0.8);
    score += skillCountScore;
    details.coreSkillsMatch = Math.round(skillCountScore * 100) / 100;
    
    // Depth bonus
    if (skills.programming_languages?.length > 0 && skills.frameworks?.length > 0) {
      score += 5.0;
      details.depthScore = 5.0;
    } else {
      details.depthScore = 0;
    }
  }

  // Category breakdown
  Object.entries(skills).forEach(([category, categorySkills]: [string, any]) => {
    if (Array.isArray(categorySkills) && categorySkills.length > 0) {
      details.categoryBreakdown[category] = {
        count: categorySkills.length,
        skills: categorySkills,
      };
    }
  });

  details.penalty = 0;
  score = Math.max(0, Math.min(score, 25.0));
  
  const reason = requiredSkills && requiredSkills.length > 0
    ? `${allSkills.length} technical skills, ${details.matchedSkills}/${requiredSkills.length} required`
    : `${allSkills.length} technical skills`;

  return [Math.round(score * 100) / 100, { reason, details }];
}

function scoreProjects(
  projects: any[],
  experiences: any[],
  requiredSkills?: string[]
): [number, any] {
  if (!projects || projects.length === 0) {
    return [5.0, { reason: 'No projects listed (low score - projects expected)', details: [], relevanceBonus: 0, projectsWithRequiredSkills: 0 }];
  }

  let score = 0;
  let qualityIndicators = 0;
  let relevanceBonus = 0;
  let projectsWithRelevance = 0;
  const projectDetails: any[] = [];

  // Collect experience technologies for realism check
  const expTechs: string[] = [];
  experiences.forEach((exp) => {
    expTechs.push(...(exp.technologies || []));
  });

  for (const project of projects) {
    const desc = project.description || '';
    const techs = project.technologies || [];
    let qualityPoints = 0;

    // Check for fake projects
    const fakeKeywords = ['example', 'demo', 'test', 'tutorial', 'hello world'];
    if (fakeKeywords.some((kw) => desc.toLowerCase().includes(kw) || (project.title || '').toLowerCase().includes(kw))) {
      score -= 2.0;
      projectDetails.push({
        title: project.title || 'Unknown',
        score: -2.0,
        reason: 'Fake project detected',
        qualityPoints: 0,
        relevancePoints: 0,
      });
      continue;
    }

    // Quality indicators
    if (desc.length > 50) {
      qualityIndicators++;
      qualityPoints++;
    }
    if (techs.length >= 3) {
      qualityIndicators++;
      qualityPoints++;
    }

    // Check if project technologies match required skills (RELEVANCE)
    let projectRelevance = 0;
    if (requiredSkills && requiredSkills.length > 0 && techs.length > 0) {
      const [matched] = matchSkills(techs, requiredSkills);
      if (matched > 0) {
        projectsWithRelevance++;
        qualityIndicators++; // Also counts as quality indicator
        if (matched >= 3) {
          projectRelevance = 2.5; // High relevance
        } else if (matched === 2) {
          projectRelevance = 1.5; // Good relevance
        } else {
          projectRelevance = 1.0; // Some relevance
        }
        relevanceBonus += projectRelevance;
      }
    }

    // Check if project technologies match experience (realism)
    if (techs.length > 0 && expTechs.length > 0) {
      const matches = techs.filter((tech: string) =>
        expTechs.some(
          (et) =>
            normalizeSkill(tech).includes(normalizeSkill(et)) ||
            normalizeSkill(et).includes(normalizeSkill(tech))
        )
      ).length;
      if (matches > 0) {
        qualityIndicators++; // Realistic project
      }
    }

    // Calculate individual project score for display
    const projectScore = qualityPoints * 2.5 + projectRelevance;

    projectDetails.push({
      title: project.title || 'Unknown',
      description: desc.substring(0, 100),
      technologies: techs,
      qualityPoints,
      relevancePoints: projectRelevance,
      score: Math.round(projectScore * 100) / 100,
    });
  }

  // Base scoring (max 15 pts to leave room for relevance bonus)
  let baseScore = 6.0;
  if (projects.length >= 3 && qualityIndicators >= projects.length * 2) {
    baseScore = 15.0; // 3+ high quality projects
  } else if (projects.length >= 3 && qualityIndicators >= projects.length) {
    baseScore = 13.0; // 3+ good quality projects
  } else if (projects.length <= 2 && qualityIndicators >= projects.length * 2) {
    baseScore = 12.0; // 1-2 high quality projects
  } else if (projects.length <= 2 && qualityIndicators >= projects.length) {
    baseScore = 10.0; // 1-2 decent quality projects
  } else if (projects.length > 5) {
    baseScore = 8.0; // Many projects - likely shallow
  }

  score += baseScore;

  // Apply relevance bonus (capped at 5pts)
  relevanceBonus = Math.min(relevanceBonus, 5.0);
  score += relevanceBonus;

  // Apply PENALTY if required skills specified but NO projects match
  // This ensures candidates with relevant projects rank higher
  let relevancePenalty = 0;
  if (requiredSkills && requiredSkills.length > 0 && projectsWithRelevance === 0) {
    // Strong penalty: no projects use required skills at all
    relevancePenalty = -6.0;
  } else if (requiredSkills && requiredSkills.length > 0 && projectsWithRelevance < projects.length / 2) {
    // Mild penalty: less than half of projects are relevant
    relevancePenalty = -3.0;
  }
  score += relevancePenalty;

  // Cap score at 20, floor at 0
  score = Math.max(0, Math.min(score, 20.0));

  return [
    Math.round(score * 100) / 100,
    {
      reason: `${projects.length} project(s) with ${qualityIndicators} quality indicators, ${projectsWithRelevance} relevant to job`,
      details: projectDetails,
      baseScore: Math.round(baseScore * 100) / 100,
      relevanceBonus: Math.round(relevanceBonus * 100) / 100,
      relevancePenalty: Math.round(relevancePenalty * 100) / 100,
      projectsWithRequiredSkills: projectsWithRelevance,
    },
  ];
}

function scoreEducation(education: any[], certifications: string[], jobField?: string): [number, any] {
  let score = 0;
  const educationDetails: any[] = [];

  // Helper: get text from education entry (handles string or object)
  const getEduText = (edu: any): string => {
    if (typeof edu === 'string') return edu.toLowerCase();
    return (edu.degree || edu.institution || edu.field || '').toLowerCase();
  };

  // Scan ALL education entries to find best degree and institution
  let bestDegreeScore = 0;
  let bestInstitutionScore = 0;
  
  if (education && education.length > 0) {
    // Check all entries for degree and institution keywords
    education.forEach((edu) => {
      const text = getEduText(edu);
      
      // Check for degree
      let degScore = 0;
      if (text.includes('master') || text.includes('mastère')) {
        degScore = 2.0;
      } else if (text.includes('bachelor') || text.includes('licence')) {
        degScore = 1.5;
      } else if (text.includes('baccalauréat') || text.includes('baccalaureat') || text.includes('bac')) {
        degScore = 0.5;
      }
      if (degScore > bestDegreeScore) bestDegreeScore = degScore;
      
      // Check for institution
      let instScore = 0;
      if (text.includes('esisa') || text.includes('engineering') || 
          text.includes('école') || text.includes('ecole') || 
          text.includes('university') || text.includes('université')) {
        instScore = 1.5;
      }
      if (instScore > bestInstitutionScore) bestInstitutionScore = instScore;
    });

    // If no degree found, give base score
    if (bestDegreeScore === 0) bestDegreeScore = 1.0;

    // Field relevance
    let fieldScore = 0;
    if (jobField) {
      const jobFieldLower = jobField.toLowerCase();
      education.forEach((edu) => {
        const text = getEduText(edu);
        if (text.includes(jobFieldLower.split(' ')[0])) {
          fieldScore = 3.0;
        }
      });
    }

    score = Math.min(bestDegreeScore + fieldScore, 5.0);

    // Build details for display
    education.forEach((edu) => {
      const text = getEduText(edu);
      const isString = typeof edu === 'string';
      
      educationDetails.push({
        degree: isString ? edu : (edu.degree || 'Unknown'),
        institution: isString ? '' : (edu.institution || ''),
        period: isString ? '' : (edu.period || ''),
        field: isString ? '' : (edu.field || ''),
        degreeScore: 0,
        fieldScore: 0,
        institutionScore: 0,
        totalScore: 0,
      });
    });
  }

  // Certifications (2 pts)
  let certScore = 0;
  const certDetails: any[] = [];
  const recognizedCerts = ['aws', 'azure', 'gcp', 'cisco', 'scrum', 'pmp', 'oracle'];
  if (certifications) {
    certifications.forEach((cert) => {
      const isRecognized = recognizedCerts.some((rc) => cert.toLowerCase().includes(rc));
      const certPoint = isRecognized ? 0.5 : 0;
      certScore += certPoint;
      certDetails.push({
        name: cert,
        points: certPoint,
        recognized: isRecognized,
      });
    });
    certScore = Math.min(certScore, 2.0);
  }

  // Final: degree (up to 5) + institution (up to 1.5) + certs (up to 2) = max 8.5
  const finalScore = Math.min(score + bestInstitutionScore + certScore, 10.0);
  
  return [
    Math.round(finalScore * 100) / 100, 
    { 
      reason: `Education: ${education?.length || 0} entry/ies`,
      details: educationDetails,
      certifications: certDetails,
      certificationScore: Math.round(certScore * 100) / 100,
      institutionScore: Math.round(bestInstitutionScore * 100) / 100,
      degreeScore: Math.round(bestDegreeScore * 100) / 100,
      fieldScore: 0,
    }
  ];
}

function scoreSignal(experiences: any[], projects: any[], skills: any): [number, any] {
  let score = 10.0;
  const redFlags: string[] = [];

  const expTechs: string[] = [];
  experiences.forEach((exp) => {
    expTechs.push(...(exp.technologies || []));
  });

  const allSkills: string[] = [
    ...(skills?.programming_languages || []),
    ...(skills?.frameworks || []),
    ...(skills?.web_technologies || []),
  ];

  // Coherence check
  if (expTechs.length > 0 && allSkills.length > 0) {
    const matched = allSkills.filter((skill) =>
      expTechs.some(
        (et) =>
          normalizeSkill(skill).includes(normalizeSkill(et)) ||
          normalizeSkill(et).includes(normalizeSkill(skill))
      )
    ).length;
    const matchRatio = matched / allSkills.length;
    if (matchRatio < 0.3) {
      score -= 2.0;
    } else if (matchRatio < 0.5) {
      score -= 1.0;
    }
  }

  // Red flags
  if (allSkills.length > 10 && experiences.length === 0) {
    score -= 0.5;
    redFlags.push('Many skills listed without experience');
  }

  score = Math.max(0, score);
  return [Math.round(score * 100) / 100, { reason: 'CV coherence check', redFlags }];
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { candidates, jobRequirements, scoringConfig } = req.body;

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: 'Candidates array is required' });
    }

    // Clean skill names (remove "(Nice to Have)", "(Required)", etc.)
    const cleanSkill = (skill: string): string => {
      return skill
        .replace(/\s*\([^)]*\)\s*/g, '')  // Remove parenthetical text
        .replace(/\s*-\s*nice to have\s*/gi, '')
        .replace(/\s*-\s*required\s*/gi, '')
        .trim();
    };
    
    const cleanedJobRequirements = jobRequirements ? {
      ...jobRequirements,
      required_skills: jobRequirements.required_skills?.map(cleanSkill).filter((s: string) => s.length > 0)
    } : undefined;

    // Default weights
    const weights = scoringConfig?.weights || {
      experience: 35,
      technical_skills: 25,
      projects: 20,
      education: 10,
      signal: 10,
    };

    const ranked = candidates.map((candidate) => {
      const candidateName = candidate.candidate_name || candidate.personal_info?.full_name || 'Unknown';
      const experiences = candidate.experience || [];
      const projects = candidate.projects || [];
      const skills = candidate.skills || {};
      const education = candidate.education || [];
      const certifications = candidate.certifications || [];

      // Debug logging
      console.log(`[rank-js] Processing: ${candidateName}`);
      console.log(`[rank-js]   Education entries: ${education.length}`, education.map((e: any) => e.degree || e.institution));
      console.log(`[rank-js]   Certifications: ${certifications.length}`, certifications);

      const expTechs: string[] = [];
      experiences.forEach((exp: any) => {
        expTechs.push(...(exp.technologies || []));
      });

      const [expScore, expExp] = scoreExperience(
        experiences,
        cleanedJobRequirements?.role,
        cleanedJobRequirements?.required_skills
      );
      const [techScore, techExp] = scoreTechnicalSkills(skills, cleanedJobRequirements?.required_skills, expTechs);
      const [projScore, projExp] = scoreProjects(projects, experiences, cleanedJobRequirements?.required_skills);
      const [eduScore, eduExp] = scoreEducation(education, certifications, cleanedJobRequirements?.field);
      const [signalScore, signalExp] = scoreSignal(experiences, projects, skills);

      // Apply custom weights (normalize scores to 0-1 first, then apply weights)
      const weightedExpScore = (expScore / 35) * weights.experience;
      const weightedTechScore = (techScore / 25) * weights.technical_skills;
      const weightedProjScore = (projScore / 20) * weights.projects;
      const weightedEduScore = (eduScore / 10) * weights.education;
      const weightedSignalScore = (signalScore / 10) * weights.signal;

      const totalScore = weightedExpScore + weightedTechScore + weightedProjScore + weightedEduScore + weightedSignalScore;

      // Build explanation
      const explanationParts: string[] = [];
      if (expScore >= 25) {
        const bestExp = expExp.details?.[0];
        if (bestExp) {
          explanationParts.push(`+ Strong experience at ${bestExp.company.substring(0, 30)}`);
        }
      } else if (expScore >= 15) {
        const bestExp = expExp.details?.[0];
        if (bestExp) {
          explanationParts.push(`+ Good experience at ${bestExp.company.substring(0, 30)}`);
        }
      }

      if (techScore >= 18 && cleanedJobRequirements?.required_skills) {
        const skillStr = cleanedJobRequirements.required_skills.slice(0, 2).join('/');
        explanationParts.push(`+ High ${skillStr} relevance`);
      }

      if (projScore >= 15) {
        explanationParts.push('+ Strong projects');
      } else if (projScore < 8) {
        explanationParts.push('- Fewer personal projects');
      }

      return {
        candidate_name: candidate.personal_info?.full_name || 'Unknown',
        total_score: Math.round(totalScore * 100) / 100,
        scores: {
          experience_quality: Math.round(weightedExpScore * 100) / 100,
          technical_skills: Math.round(weightedTechScore * 100) / 100,
          projects_impact: Math.round(weightedProjScore * 100) / 100,
          education_certifications: Math.round(weightedEduScore * 100) / 100,
          signal_consistency: Math.round(weightedSignalScore * 100) / 100,
        },
        explanation: explanationParts.join(' | ') || 'Standard candidate profile',
        detailed_explanations: {
          experience: expExp,
          technical_skills: techExp,
          projects: projExp,
          education: eduExp,
          signal: signalExp,
        },
        raw_data: candidate,
      };
    });

    // Sort by total score
    ranked.sort((a, b) => b.total_score - a.total_score);

    // Add ranks
    ranked.forEach((candidate, index) => {
      candidate.rank = index + 1;
    });

    return res.status(200).json({
      ranking_philosophy:
        'Candidates are ranked using a structured, explainable scoring model inspired by real recruiter decision processes, not AI intuition.',
      ranked_candidates: ranked,
    });
  } catch (error: any) {
    console.error('Ranking error:', error);
    return res.status(500).json({
      error: 'Failed to rank candidates',
      message: error.message,
    });
  }
}
