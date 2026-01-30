import type { NextApiRequest, NextApiResponse } from 'next';
import { calculateSkillMatchScore, normalizeSkill, getRelatedSkills } from '../../lib/similarity';
import nodemailer from 'nodemailer';

// Mistral endpoint (local Ollama)
const MISTRAL_ENDPOINT = process.env.MISTRAL_LOCAL_ENDPOINT || 'http://localhost:11434/api/generate';
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral';

interface Candidate {
  name?: string;
  candidate_name?: string;
  score?: number;
  total_score?: number;
  skills?: string[];
  experience?: any[];
  projects?: any[];
  education?: any[];
  breakdown?: any;
  raw_data?: any;
  scores?: any;
}

// Helper to get candidate name from different possible fields
function getCandidateName(candidate: Candidate): string {
  return candidate.candidate_name || candidate.name || candidate.raw_data?.personal_info?.full_name || 'Unknown';
}

// Helper to get candidate score from different possible fields
function getCandidateScore(candidate: Candidate): number {
  return candidate.total_score || candidate.score || 0;
}

interface RecruiterRequest {
  message: string;
  candidates?: Candidate[];
  history?: Array<{ role: string; content: string }>;
  conversationHistory?: Array<{ role: string; content: string }>;
}

interface RecruiterResponse {
  reply: string;
  candidates?: any[];
  action?: string;
  usedMistral?: boolean;
  similarityScores?: any[];
  queryIntent?: any;
  emailSent?: boolean;
  emailRecipients?: string[];
}

/**
 * Query Mistral for intelligent response
 */
async function queryMistral(prompt: string, timeout: number = 30000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(MISTRAL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 500
        }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.response || null;
  } catch (error) {
    console.error('Mistral query failed:', error);
    return null;
  }
}

/**
 * Detect if message is an email sending command
 */
function isEmailCommand(message: string): boolean {
  const lower = message.toLowerCase().trim();
  const emailKeywords = [
    'send email', 'send an email', 'email them', 'email him', 'email her',
    'send mail', 'send a mail', 'mail them', 'mail him', 'mail her',
    'email with context', 'send email with', 'email about'
  ];
  return emailKeywords.some(keyword => lower.includes(keyword));
}

/**
 * Extract email context and candidate names from message
 */
function extractEmailInfo(
  message: string, 
  conversationHistory: Array<{ role: string; content: string }>,
  candidates: Candidate[]
): {
  context: string;
  candidateNames: string[];
} {
  const lower = message.toLowerCase();
  let context = '';
  const candidateNames: string[] = [];

  // Extract context (text after "with context", "about", etc.)
  const contextPatterns = [
    /(?:with context|about|regarding|concerning)\s+(.+?)(?:\s+to|\s+for|$)/i,
    /send email\s+(?:with\s+)?(?:context\s+)?(.+?)(?:\s+to|\s+for|$)/i
  ];
  
  for (const pattern of contextPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      context = match[1].trim();
      break;
    }
  }

  // If no explicit context, try to extract from the message
  if (!context) {
    const contextMatch = message.match(/send\s+(?:an\s+)?email\s+(?:with\s+context\s+)?(.+?)(?:\s+to|\s+for|$)/i);
    if (contextMatch && contextMatch[1]) {
      context = contextMatch[1].trim();
    }
  }

  // Extract candidate names from conversation history (look for candidates shown in previous messages)
  const recentMessages = conversationHistory.slice(-10);
  const allCandidateNames = candidates.map(c => getCandidateName(c).toLowerCase());
  const lowerMessage = message.toLowerCase();
  
  // Check for pronouns FIRST - if "him/her" is used, only get the FIRST candidate from last message
  const isPronounReference = lowerMessage.includes(' send him ') || lowerMessage.includes(' email him ') || 
                            lowerMessage.includes(' send her ') || lowerMessage.includes(' email her ') ||
                            lowerMessage.includes(' send to him ') || lowerMessage.includes(' email to him ') ||
                            lowerMessage.includes(' send to her ') || lowerMessage.includes(' email to her ');
  
  const isPluralReference = lowerMessage.includes(' send them ') || lowerMessage.includes(' email them ') ||
                            lowerMessage.includes(' send to all ') || lowerMessage.includes(' email all ');

  if (isPronounReference) {
    // For pronouns (him/her), only get the FIRST/MOST RECENT candidate from the last assistant message
    const lastAssistantMsg = [...recentMessages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMsg) {
      // Get the FIRST candidate name mentioned (most recent one shown)
      const firstMatch = lastAssistantMsg.content.match(/\*\*([^*]+)\*\*/);
      if (firstMatch) {
        const name = firstMatch[1].trim();
        const nameLower = name.toLowerCase();
        // Skip if it's a header word
        if (name && name.length > 2 && !name.match(/^(Top|Found|Candidate|Candidates|Match|Score|Hello)$/i)) {
          const matchingCandidate = candidates.find(c => {
            const cn = getCandidateName(c).toLowerCase();
            return cn.includes(nameLower) || nameLower.includes(cn);
          });
          if (matchingCandidate) {
            candidateNames.push(getCandidateName(matchingCandidate));
          }
        }
      }
    }
  } else if (isPluralReference) {
    // For "them" or "all", get all candidates from last message
    const lastAssistantMsg = [...recentMessages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMsg) {
      const allNames = lastAssistantMsg.content.match(/\*\*([^*]+)\*\*/g) || [];
      allNames.forEach(match => {
        const name = match.replace(/\*\*/g, '').trim();
        if (name && name.length > 2 && !name.match(/^(Top|Found|Candidate|Candidates|Match|Score|Hello)$/i)) {
          const nameLower = name.toLowerCase();
          const matchingCandidate = candidates.find(c => {
            const cn = getCandidateName(c).toLowerCase();
            return cn.includes(nameLower) || nameLower.includes(cn);
          });
          if (matchingCandidate && !candidateNames.some(n => n.toLowerCase() === getCandidateName(matchingCandidate).toLowerCase())) {
            candidateNames.push(getCandidateName(matchingCandidate));
          }
        }
      });
    }
  } else {
    // For explicit names, extract all mentioned candidates
    for (const msg of recentMessages) {
      if (msg.role === 'assistant') {
        // Extract names from assistant responses (usually formatted as "**Name**" or "Name -")
        const nameMatches = msg.content.match(/\*\*([^*]+)\*\*/g);
        if (nameMatches) {
          nameMatches.forEach(match => {
            const name = match.replace(/\*\*/g, '').trim();
            const nameLower = name.toLowerCase();
            // Check if this name matches any candidate in the database
            if (name && name.length > 2 && !name.match(/^(Top|Found|Candidate|Candidates|Match|Score|Hello)$/i) &&
                allCandidateNames.some(cn => cn.includes(nameLower) || nameLower.includes(cn))) {
              const fullName = candidates.find(c => getCandidateName(c).toLowerCase().includes(nameLower))?.candidate_name || 
                              candidates.find(c => getCandidateName(c).toLowerCase().includes(nameLower))?.name ||
                              name;
              if (!candidateNames.some(n => n.toLowerCase() === fullName.toLowerCase())) {
                candidateNames.push(fullName);
              }
            }
          });
        }
        
        // Also check for "Name -" pattern
        const dashMatches = msg.content.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+-/g);
        if (dashMatches) {
          dashMatches.forEach(match => {
            const name = match.replace(/\s+-.*/, '').trim();
            const nameLower = name.toLowerCase();
            if (allCandidateNames.some(cn => cn.includes(nameLower) || nameLower.includes(cn))) {
              const fullName = candidates.find(c => getCandidateName(c).toLowerCase().includes(nameLower))?.candidate_name ||
                              candidates.find(c => getCandidateName(c).toLowerCase().includes(nameLower))?.name ||
                              name;
              if (!candidateNames.some(n => n.toLowerCase() === fullName.toLowerCase())) {
                candidateNames.push(fullName);
              }
            }
          });
        }
      }
    }
  }

  // Only check current message for candidate names if we haven't found any yet (and not using pronouns)
  if (candidateNames.length === 0 && !isPronounReference && !isPluralReference) {
    const currentNameMatches = message.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
    if (currentNameMatches) {
      currentNameMatches.forEach(name => {
        const nameLower = name.toLowerCase();
        if (name.length > 2 && 
            !name.match(/^(Send|Email|With|Context|To|For|About|Regarding|Concerning|Opportunity|Position|Job)$/i) &&
            allCandidateNames.some(cn => cn.includes(nameLower) || nameLower.includes(cn))) {
          const fullName = candidates.find(c => getCandidateName(c).toLowerCase().includes(nameLower))?.candidate_name ||
                          candidates.find(c => getCandidateName(c).toLowerCase().includes(nameLower))?.name ||
                          name;
          if (!candidateNames.some(n => n.toLowerCase() === fullName.toLowerCase())) {
            candidateNames.push(fullName);
          }
        }
      });
    }
  }

  return { context, candidateNames };
}

/**
 * Generate email content using Mistral
 */
async function generateEmailContent(
  candidateName: string,
  candidateData: any,
  context: string,
  jobTitle?: string
): Promise<{ subject: string; body: string }> {
  const prompt = `You are a professional recruiter writing an email to a candidate.

CANDIDATE INFORMATION:
- Name: ${candidateName}
- Skills: ${getCandidateSkills(candidateData).slice(0, 10).join(', ')}
- CV Score: ${getCandidateScore(candidateData)}/100

${context ? `EMAIL CONTEXT/REASON: ${context}` : 'This is a general recruitment email.'}

${jobTitle ? `JOB POSITION: ${jobTitle}` : ''}

Generate a professional, friendly, and personalized email. Include:
1. A clear subject line
2. A personalized greeting
3. Reference to their skills/qualifications
4. The context/reason for the email
5. A call to action
6. Professional closing

Respond ONLY in this JSON format, no other text:
{
  "subject": "Email subject line",
  "body": "Email body text (use \\n for line breaks)"
}`;

  const response = await queryMistral(prompt, 20000);
  
  if (response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          subject: parsed.subject || `Opportunity: ${jobTitle || 'Position'}`,
          body: parsed.body || `Dear ${candidateName},\n\nWe are interested in your profile.\n\nBest regards,\nCapgemini Smart Hire Team`
        };
      }
    } catch (e) {
      console.error('Failed to parse email response:', e);
    }
  }

  // Fallback
  return {
    subject: `Opportunity: ${jobTitle || 'Position'}`,
    body: `Dear ${candidateName},\n\n${context ? `Regarding: ${context}\n\n` : ''}We are pleased to inform you that your profile matches our requirements.\n\nWe would like to invite you for the next steps in our recruitment process.\n\nBest regards,\nCapgemini Smart Hire Team`
  };
}

/**
 * Send email to candidate(s)
 */
async function sendEmailToCandidates(
  candidates: Candidate[],
  candidateNames: string[],
  context: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<{ success: boolean; sent: number; failed: number; recipients: string[]; errors: string[] }> {
  const recipients: string[] = [];
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  // Find candidates by name
  const candidatesToEmail = candidates.filter(c => {
    const name = getCandidateName(c);
    return candidateNames.length === 0 || candidateNames.some(n => 
      name.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(name.toLowerCase())
    );
  });

  if (candidatesToEmail.length === 0) {
    return { success: false, sent: 0, failed: 0, recipients: [], errors: ['No candidates found with the specified names'] };
  }

  // Generate and send emails
  for (const candidate of candidatesToEmail) {
    const candidateName = getCandidateName(candidate);
    const email = candidate.raw_data?.personal_info?.emails?.[0] || candidate.raw_data?.personal_info?.email;
    
    if (!email) {
      errors.push(`${candidateName}: No email address found`);
      failed++;
      continue;
    }

    try {
      const { subject, body } = await generateEmailContent(candidateName, candidate, context);
      
      const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
      const smtpPort = parseInt(process.env.SMTP_PORT || '587');
      const smtpUser = process.env.SMTP_USER;
      const smtpPassword = process.env.SMTP_PASSWORD;

      if (!smtpUser || !smtpPassword) {
        throw new Error('SMTP not configured');
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      await transporter.sendMail({
        from: `"Capgemini Smart Hire" <${smtpUser}>`,
        to: email,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      });
      
      recipients.push(email);
      sent++;

    } catch (error: any) {
      errors.push(`${candidateName}: ${error.message || 'Error sending email'}`);
      failed++;
    }
  }

  return { success: sent > 0, sent, failed, recipients, errors };
}

/**
 * Detect if message is a recruitment/search query vs casual conversation
 * Returns true if it's casual conversation (NOT a recruitment query)
 */
function isConversational(message: string): boolean {
  const lower = message.toLowerCase().trim();
  
  // Recruitment-specific keywords that indicate a search query
  const recruitmentKeywords = [
    'find', 'search', 'show', 'get', 'list', 'who has', 'who knows', 'who worked',
    'developer', 'engineer', 'expert', 'senior', 'junior', 'candidate', 'candidates',
    'java', 'python', 'javascript', 'react', 'angular', 'vue', 'node',
    'spring', 'django', 'flask', '.net', 'c#', 'c++', 'rust', 'go', 'golang',
    'aws', 'azure', 'gcp', 'cloud', 'devops', 'docker', 'kubernetes',
    'machine learning', 'ml', 'ai', 'data science', 'sql', 'database',
    'frontend', 'backend', 'fullstack', 'full-stack', 'mobile', 'ios', 'android',
    'years experience', 'years of experience', 'yoe', '+ years', '+years',
    'top 5', 'top 10', 'best', 'ranking', 'rank', 'score', 'skill', 'skills',
    'experience', 'project', 'projects', 'resume', 'cv', 'profile'
  ];
  
  // Check if it's a recruitment query
  const isRecruitmentQuery = recruitmentKeywords.some(keyword => lower.includes(keyword));
  
  if (isRecruitmentQuery) {
    return false; // Not conversational, it's a search query
  }
  
  // Everything else is conversational - let Mistral handle it naturally
  return true;
}

/**
 * Extract skills using Mistral AI
 */
async function extractQueryIntent(message: string): Promise<{
  skills: string[];
  experience: number | null;
  companies: string[];
  role: string | null;
  projectKeywords: string[];
  rank?: 'first' | 'best' | 'second' | 'top' | number | null;
  limit?: number;
}> {
  const prompt = `You are a recruitment assistant. Analyze this query and extract:
1. Technical skills mentioned (programming languages, frameworks, tools)
2. Years of experience required (number or null)
3. Company preferences mentioned
4. Role/position type
5. Project-related keywords
6. Ranking preference: is user asking for "best", "second best", "top 5", "first", etc? Return one of: "best", "second", "top", or the number if specific, otherwise null

Query: "${message}"

Respond ONLY in this JSON format, no other text:
{
  "skills": ["skill1", "skill2"],
  "experience": null,
  "companies": [],
  "role": null,
  "projectKeywords": [],
  "rank": null,
  "limit": null
}`;

  let result = {
    skills: [] as string[],
    experience: null as number | null,
    companies: [] as string[],
    role: null as string | null,
    projectKeywords: [] as string[],
    rank: undefined as 'first' | 'best' | 'second' | 'top' | null | undefined,
    limit: undefined as number | undefined
  };

  const mistralResponse = await queryMistral(prompt);
  
  if (mistralResponse) {
    try {
      const jsonMatch = mistralResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          skills: parsed.skills || [],
          experience: typeof parsed.experience === 'number' ? parsed.experience : null,
          companies: parsed.companies || [],
          role: parsed.role || null,
          projectKeywords: parsed.projectKeywords || [],
          rank: parsed.rank || null,
          limit: parsed.limit || null
        };
      }
    } catch (e) {
      console.error('Failed to parse Mistral response:', e);
      // Use fallback extraction on parse failure
      return fallbackExtraction(message);
    }
  } else {
    // Mistral call failed, use fallback
    return fallbackExtraction(message);
  }

  // IMPORTANT: Always apply pattern-based rank/limit detection
  // This ensures "second best", "top2", etc. are caught even if Mistral doesn't detect them
  const patternDetection = detectRankLimitFromPattern(message);
  if (patternDetection.rank || patternDetection.limit) {
    result.rank = patternDetection.rank || result.rank;
    result.limit = patternDetection.limit || result.limit;
  }
  
  return result;
}

/**
 * Detect rank/limit from message patterns
 * Returns { rank, limit } if patterns match, otherwise { rank: null, limit: null }
 */
function detectRankLimitFromPattern(message: string): { rank: 'first' | 'best' | 'second' | 'top' | null; limit: number | null } {
  const lower = message.toLowerCase();
  let rank: 'first' | 'best' | 'second' | 'top' | null = null;
  let limit: number | null = null;
  
  if (lower.includes('best one') || (lower.match(/\bbest\b/) && !lower.includes('best one'))) {
    rank = 'best';
    limit = 1;
  } else if (lower.includes('second best') || lower.includes('second one')) {
    rank = 'second';
    limit = 1;
  } else if (lower.match(/top\s*(\d+)/) || lower.match(/top(\d+)/)) {
    // Match both "top 2" and "top2"
    const topMatch = lower.match(/top\s*(\d+)/) || lower.match(/top(\d+)/);
    if (topMatch) {
      rank = 'top';
      limit = parseInt(topMatch[1]);
    }
  } else if (lower.includes('top ') && lower.match(/top\s+([a-z]+)/)) {
    // Match "top N" where N is spelled out (top three, top five, etc.)
    const numberWords: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
    };
    const topMatch = lower.match(/top\s+([a-z]+)/);
    if (topMatch && numberWords[topMatch[1]]) {
      rank = 'top';
      limit = numberWords[topMatch[1]];
    }
  }
  
  return { rank, limit };
}

/**
 * Fallback pattern-based extraction
 */
function fallbackExtraction(message: string): {
  skills: string[];
  experience: number | null;
  companies: string[];
  role: string | null;
  projectKeywords: string[];
  rank?: 'first' | 'best' | 'second' | 'top' | number | null;
  limit?: number;
} {
  const lower = message.toLowerCase();
  
  // Skills patterns - include common tools, frameworks, methodologies
  const skillPatterns = [
    'java', 'python', 'javascript', 'typescript', 'react', 'angular', 'vue',
    'node', 'nodejs', 'spring', 'django', 'flask', 'sql', 'mysql', 'postgresql',
    'mongodb', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'linux',
    'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala',
    'tensorflow', 'pytorch', 'machine learning', 'ml', 'ai', 'deep learning',
    'devops', 'ci/cd', 'agile', 'scrum', 'microservices', 'rest', 'api',
    'flutter', 'react native', 'mobile', 'frontend', 'backend', 'fullstack',
    'nextjs', 'express', 'fastapi', 'graphql', 'redis', 'elasticsearch',
    // Additional tools and methodologies
    'uvicorn', 'gunicorn', 'nginx', 'apache', 'kanban', 'jira', 'confluence',
    'figma', 'sketch', 'photoshop', 'tailwind', 'bootstrap', 'sass', 'css',
    'html', 'webpack', 'vite', 'babel', 'jest', 'cypress', 'selenium',
    'pandas', 'numpy', 'scikit', 'spark', 'hadoop', 'kafka', 'rabbitmq',
    'celery', 'airflow', 'dbt', 'snowflake', 'bigquery', 'tableau', 'power bi',
    'oauth', 'jwt', 'websocket', 'grpc', 'soap', 'xml', 'json', 'yaml'
  ];
  
  const skills = skillPatterns.filter(skill => {
    const pattern = new RegExp(`\\b${skill.replace(/[+#]/g, '\\$&')}\\b`, 'i');
    return pattern.test(lower);
  });
  
  // Experience patterns
  const expMatch = lower.match(/(\d+)\+?\s*(?:years?|ans?|yrs?)/);
  const experience = expMatch ? parseInt(expMatch[1]) : null;
  
  // Company patterns
  const companyPatterns = [
    'google', 'facebook', 'meta', 'amazon', 'apple', 'microsoft', 'netflix',
    'capgemini', 'accenture', 'deloitte', 'pwc', 'kpmg', 'ey', 'ibm',
    'spotify', 'uber', 'airbnb', 'linkedin', 'twitter', 'stripe', 'salesforce'
  ];
  const companies = companyPatterns.filter(c => lower.includes(c));
  
  // Role patterns
  let role = null;
  if (lower.includes('senior')) role = 'senior';
  else if (lower.includes('junior')) role = 'junior';
  else if (lower.includes('lead')) role = 'lead';
  else if (lower.includes('manager')) role = 'manager';
  else if (lower.includes('architect')) role = 'architect';
  else if (lower.includes('expert')) role = 'expert';
  
  // Ranking patterns - use the dedicated detection function
  const { rank, limit } = detectRankLimitFromPattern(message);
  
  return { 
    skills, 
    experience, 
    companies, 
    role, 
    projectKeywords: [], 
    rank: rank || undefined, 
    limit: limit || undefined
  };
}

/**
 * Extract all skills from a candidate
 */
function getCandidateSkills(candidate: Candidate): string[] {
  const skills: string[] = [];
  
  // Direct skills array
  if (candidate.skills && Array.isArray(candidate.skills)) {
    skills.push(...candidate.skills);
  }
  
  // From raw_data if available
  const raw = candidate.raw_data;
  if (raw?.skills) {
    if (raw.skills.programming_languages) skills.push(...raw.skills.programming_languages);
    if (raw.skills.frameworks) skills.push(...raw.skills.frameworks);
    if (raw.skills.web_technologies) skills.push(...raw.skills.web_technologies);
    if (raw.skills.databases) skills.push(...raw.skills.databases);
    if (raw.skills.devops_tools) skills.push(...raw.skills.devops_tools);
    if (raw.skills.mobile_technologies) skills.push(...raw.skills.mobile_technologies);
    if (raw.skills.cloud_platforms) skills.push(...raw.skills.cloud_platforms);
    if (raw.skills.data_science) skills.push(...raw.skills.data_science);
    if (raw.skills.modeling_design) skills.push(...raw.skills.modeling_design);
    if (raw.skills.other) skills.push(...raw.skills.other);
  }
  
  return Array.from(new Set(skills.map(s => String(s).trim()).filter(s => s.length > 0)));
}

/**
 * Extract project technologies from a candidate
 */
function getCandidateProjectTechs(candidate: Candidate): string[] {
  const techs: string[] = [];
  
  const projects = candidate.projects || candidate.raw_data?.projects || [];
  for (const project of projects) {
    if (project.technologies && Array.isArray(project.technologies)) {
      techs.push(...project.technologies);
    }
  }
  
  return Array.from(new Set(techs.map(t => String(t).trim()).filter(t => t.length > 0)));
}

/**
 * Parent-child skill relationships
 * If someone searches for "sql", it should also match "mysql", "postgresql", etc.
 */
const SKILL_FAMILIES: Record<string, string[]> = {
  'sql': ['mysql', 'postgresql', 'postgres', 'sql server', 'sqlite', 'oracle', 'mariadb', 'mssql'],
  'javascript': ['js', 'nodejs', 'node.js', 'react', 'vue', 'angular', 'typescript', 'nextjs', 'express'],
  'python': ['django', 'flask', 'fastapi', 'pandas', 'numpy', 'pytorch', 'tensorflow'],
  'java': ['spring', 'springboot', 'spring boot', 'hibernate', 'maven', 'gradle', 'j2ee', 'jakarta'],
  'cloud': ['aws', 'azure', 'gcp', 'google cloud', 'amazon web services'],
  'devops': ['docker', 'kubernetes', 'k8s', 'jenkins', 'ci/cd', 'terraform', 'ansible'],
  'mobile': ['react native', 'flutter', 'swift', 'kotlin', 'ios', 'android'],
  'database': ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb'],
  'agile': ['scrum', 'kanban', 'jira', 'sprint', 'standup'],
  'ml': ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'keras', 'scikit-learn'],
  'ai': ['artificial intelligence', 'machine learning', 'deep learning', 'nlp', 'computer vision'],
};

/**
 * Get related skills for a search term
 */
function getRelatedSkillTerms(skill: string): string[] {
  const lower = skill.toLowerCase().trim();
  const related = [lower];
  
  // Check if this skill is a parent category
  if (SKILL_FAMILIES[lower]) {
    related.push(...SKILL_FAMILIES[lower]);
  }
  
  // Check if this skill belongs to a family
  for (const [parent, children] of Object.entries(SKILL_FAMILIES)) {
    if (children.some(child => child.includes(lower) || lower.includes(child))) {
      related.push(parent);
    }
  }
  
  return Array.from(new Set(related));
}

/**
 * Check if candidate has a skill (exact or partial text match)
 * Returns match details including quality score based on where skill was found
 */
function candidateHasSkill(candidate: Candidate, skill: string): { found: boolean; context: string; matchQuality?: number } {
  const searchTerms = getRelatedSkillTerms(skill);
  const skillLower = skill.toLowerCase().trim();
  
  // Check in skills - HIGHEST QUALITY (direct skill list)
  const candidateSkills = getCandidateSkills(candidate);
  for (const s of candidateSkills) {
    const sLower = s.toLowerCase();
    for (const searchTerm of searchTerms) {
      if (sLower === searchTerm) {
        // Exact match in direct skills
        const isRelatedSkill = searchTerm !== skillLower;
        const quality = isRelatedSkill ? 0.8 : 1.0; // Related skills score slightly lower
        return { found: true, context: `Skills: ${s}`, matchQuality: quality };
      } else if (sLower.includes(searchTerm) || searchTerm.includes(sLower)) {
        // Partial match
        const isRelatedSkill = searchTerm !== skillLower;
        const quality = isRelatedSkill ? 0.75 : 0.95;
        return { found: true, context: `Skills: ${s}`, matchQuality: quality };
      }
    }
  }
  
  // Check in project technologies - HIGH QUALITY (project tech list)
  const projects = candidate.projects || candidate.raw_data?.projects || [];
  for (const project of projects) {
    const techs = project.technologies || [];
    for (const tech of techs) {
      const techLower = String(tech).toLowerCase();
      for (const searchTerm of searchTerms) {
        if (techLower === searchTerm) {
          // Exact match in project technologies
          const isRelatedSkill = searchTerm !== skillLower;
          const quality = isRelatedSkill ? 0.75 : 0.9;
          return { found: true, context: `Project tech: ${tech}`, matchQuality: quality };
        } else if (techLower.includes(searchTerm) || searchTerm.includes(techLower)) {
          // Partial match
          const isRelatedSkill = searchTerm !== skillLower;
          const quality = isRelatedSkill ? 0.7 : 0.85;
          return { found: true, context: `Project tech: ${tech}`, matchQuality: quality };
        }
      }
    }
    // Check in project description - MEDIUM QUALITY
    const desc = (project.description || '').toLowerCase();
    for (const searchTerm of searchTerms) {
      if (desc.includes(searchTerm)) {
        const isRelatedSkill = searchTerm !== skillLower;
        const quality = isRelatedSkill ? 0.5 : 0.65;
        return { found: true, context: `Project description`, matchQuality: quality };
      }
    }
    // Check project name
    const name = (project.name || project.title || '').toLowerCase();
    for (const searchTerm of searchTerms) {
      if (name.includes(searchTerm)) {
        const isRelatedSkill = searchTerm !== skillLower;
        const quality = isRelatedSkill ? 0.55 : 0.7;
        return { found: true, context: `Project: ${name}`, matchQuality: quality };
      }
    }
  }
  
  // Check in experience descriptions - MEDIUM-LOW QUALITY
  const experiences = candidate.experience || candidate.raw_data?.experience || [];
  for (const exp of experiences) {
    const desc = exp.description || exp.responsibilities || '';
    const descText = (Array.isArray(desc) ? desc.join(' ') : String(desc)).toLowerCase();
    for (const searchTerm of searchTerms) {
      if (descText.includes(searchTerm)) {
        const isRelatedSkill = searchTerm !== skillLower;
        const quality = isRelatedSkill ? 0.5 : 0.65;
        return { found: true, context: `Experience`, matchQuality: quality };
      }
    }
    // Check in technologies used at job - MEDIUM QUALITY
    const techs = exp.technologies || [];
    for (const tech of techs) {
      const techLower = String(tech).toLowerCase();
      for (const searchTerm of searchTerms) {
        if (techLower === searchTerm) {
          // Exact match in work tech
          const isRelatedSkill = searchTerm !== skillLower;
          const quality = isRelatedSkill ? 0.75 : 0.88;
          return { found: true, context: `Work tech: ${tech}`, matchQuality: quality };
        } else if (techLower.includes(searchTerm)) {
          // Partial match
          const isRelatedSkill = searchTerm !== skillLower;
          const quality = isRelatedSkill ? 0.7 : 0.78;
          return { found: true, context: `Work tech: ${tech}`, matchQuality: quality };
        }
      }
    }
  }
  
  return { found: false, context: '' };
}

/**
 * Score candidates using EXACT TEXT SEARCH + cosine similarity
 */
function scoreCandidatesWithSimilarity(
  candidates: Candidate[],
  queryIntent: {
    skills: string[];
    experience: number | null;
    companies: string[];
    role: string | null;
    projectKeywords: string[];
  }
): Array<Candidate & { matchScore: number; matchDetails: any }> {
  return candidates.map(candidate => {
    let matchScore = 0;
    const matchDetails: any = {
      skillMatch: { score: 0, matched: [], unmatched: [] },
      experienceMatch: 0,
      projectMatch: { score: 0, details: [] }
    };
    
    const candidateSkills = getCandidateSkills(candidate);
    const projectTechs = getCandidateProjectTechs(candidate);
    const cvScore = getCandidateScore(candidate); // Use CV ranking score
    
    // 1. Skill matching - PRIORITIZE EXACT TEXT MATCHES (60% weight)
    if (queryIntent.skills.length > 0) {
      const exactMatches: Array<{ skill: string; context: string; quality: number }> = [];
      const cosineMatches: Array<{ required: string; matched: string; similarity: number }> = [];
      const noMatches: string[] = [];
      
      for (const requestedSkill of queryIntent.skills) {
        // First try EXACT text search in candidate's CV
        const exactMatch = candidateHasSkill(candidate, requestedSkill);
        if (exactMatch.found) {
          exactMatches.push({ 
            skill: requestedSkill, 
            context: exactMatch.context,
            quality: exactMatch.matchQuality || 1.0  // Default to 1.0 if not specified
          });
        } else {
          // Fall back to cosine similarity only if no exact match
          const bestMatch = candidateSkills.find(s => {
            const sim = normalizeSkill(requestedSkill) === normalizeSkill(s);
            return sim;
          });
          
          if (bestMatch) {
            cosineMatches.push({ required: requestedSkill, matched: bestMatch, similarity: 0.8 });
          } else {
            noMatches.push(requestedSkill);
          }
        }
      }
      
      // Calculate skill score: weight exact matches by their quality, cosine = 80%, no match = 0%
      // If searching for 1 skill and found exact match with quality 0.9, score = (0.9 + 0) / 1 = 0.9
      // If searching for 1 skill and found cosine match, score = (0 + 0.8) / 1 = 0.8
      const totalSkills = queryIntent.skills.length;
      let totalScore = 0;
      
      // Sum weighted scores for exact matches
      for (const exactMatch of exactMatches) {
        totalScore += exactMatch.quality;
      }
      
      // Add cosine matches at reduced weight
      totalScore += cosineMatches.length * 0.8;
      
      const skillScore = totalScore / totalSkills;
      
      matchDetails.skillMatch = {
        score: skillScore,
        matched: [
          ...exactMatches.map(m => ({ required: m.skill, matched: m.skill, similarity: 1.0, context: m.context })),
          ...cosineMatches
        ],
        unmatched: noMatches,
        exactMatchCount: exactMatches.length,
        totalRequested: totalSkills
      };
      
      matchScore += skillScore * 60; // 60% weight for skills
    } else {
      // No specific skills requested - use CV score as primary ranking factor
      // Normalize CV score (0-100) to contribute to match score
      matchScore += (cvScore / 100) * 50;
      matchDetails.skillMatch = {
        score: cvScore / 100,
        matched: candidateSkills.slice(0, 5).map(s => ({ matched: s, similarity: 1 })),
        unmatched: [],
        note: 'Ranked by overall CV score'
      };
    }
    
    // 2. Experience matching (20% weight)
    if (queryIntent.experience !== null) {
      const experiences = candidate.experience || candidate.raw_data?.experience || [];
      let totalYears = 0;
      
      for (const exp of experiences) {
        // Try to calculate years from period
        const period = exp.period || '';
        const yearMatch = period.match(/(\d{4})\s*[-–]\s*(\d{4}|present|current|now)/i);
        if (yearMatch) {
          const start = parseInt(yearMatch[1]);
          const end = yearMatch[2].toLowerCase().match(/present|current|now/) 
            ? new Date().getFullYear() 
            : parseInt(yearMatch[2]);
          totalYears += Math.max(0, end - start);
        } else {
          // Estimate 1-2 years per experience entry
          totalYears += 1.5;
        }
      }
      
      if (totalYears >= queryIntent.experience) {
        matchDetails.experienceMatch = 1;
        matchScore += 20;
      } else if (totalYears >= queryIntent.experience * 0.7) {
        matchDetails.experienceMatch = 0.7;
        matchScore += 14;
      } else if (totalYears > 0) {
        matchDetails.experienceMatch = totalYears / queryIntent.experience;
        matchScore += (totalYears / queryIntent.experience) * 20;
      }
    } else {
      // No experience requirement - small bonus based on experience count
      const experiences = candidate.experience || candidate.raw_data?.experience || [];
      const expBonus = Math.min(experiences.length * 4, 20); // Up to 20% based on experience count
      matchScore += expBonus;
      matchDetails.experienceMatch = expBonus / 20;
    }
    
    // 3. Project matching (20% weight) - Also use exact text search
    if (queryIntent.skills.length > 0) {
      let projectMatchCount = 0;
      const projectMatches: string[] = [];
      
      const projects = candidate.projects || candidate.raw_data?.projects || [];
      for (const project of projects) {
        const techs = project.technologies || [];
        const desc = (project.description || '') + ' ' + (project.name || '') + ' ' + (project.title || '');
        
        for (const skill of queryIntent.skills) {
          const skillLower = skill.toLowerCase();
          // Check if skill is in project technologies or description
          const techMatch = techs.some((t: string) => String(t).toLowerCase().includes(skillLower));
          const descMatch = desc.toLowerCase().includes(skillLower);
          
          if (techMatch || descMatch) {
            if (!projectMatches.includes(skill)) {
              projectMatches.push(skill);
              projectMatchCount++;
            }
          }
        }
      }
      
      const projectScore = queryIntent.skills.length > 0 
        ? projectMatchCount / queryIntent.skills.length 
        : 0;
      
      matchDetails.projectMatch = {
        score: projectScore,
        details: projectMatches.map(s => ({ skill: s, found: true })),
        projectCount: projects.length
      };
      
      matchScore += projectScore * 20;
    } else {
      // No skills specified - use project count as bonus
      const projects = candidate.projects || candidate.raw_data?.projects || [];
      const projBonus = Math.min(projects.length * 4, 20); // Up to 20% based on project count
      matchScore += projBonus;
      matchDetails.projectMatch = { 
        score: projBonus / 20, 
        details: [],
        projectCount: projects.length
      };
    }
    
    // TIEBREAKER: Add bonus for candidates with higher overall CV ranking scores
    // This ensures when multiple candidates have the same skill match, the one with
    // better overall qualifications ranks higher
    const cvScoreBonus = Math.min((cvScore / 100) * 5, 5); // Max 5% bonus from CV score
    matchScore += cvScoreBonus;
    matchDetails.cvScoreBonus = cvScoreBonus;
    
    return {
      ...candidate,
      matchScore: Math.round(matchScore * 10) / 10,
      matchDetails
    };
  });
}

/**
 * Generate conversational response using Mistral - ChatGPT-like natural responses
 */
async function generateConversationalResponse(
  message: string,
  candidateCount: number,
  conversationHistory: Array<{ role: string; content: string }> = [],
  candidates: Candidate[] = []
): Promise<string> {
  // Build conversation context from history
  const historyContext = conversationHistory.length > 0
    ? conversationHistory.slice(-8).map(m => 
        `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content.substring(0, 300)}`
      ).join('\n\n')
    : '';

  // Build real candidate list for context (if we have them)
  const candidateContext = candidates.length > 0
    ? `\nREAL CANDIDATES IN DATABASE:\n${candidates.slice(0, 10).map(c => 
        `- ${getCandidateName(c)} (CV Score: ${getCandidateScore(c)}/100, Skills: ${getCandidateSkills(c).slice(0, 3).join(', ')})`
      ).join('\n')}`
    : '';

  const prompt = `You are an intelligent, friendly AI assistant. You can help with recruitment but you're also great at normal conversation.

CRITICAL INSTRUCTIONS - READ CAREFULLY:
- Respond EXACTLY like ChatGPT would - natural, helpful, conversational
- If someone says something random, weird, or nonsensical, respond naturally - maybe with humor, curiosity, or ask what they mean
- If someone seems frustrated or confused, be empathetic and try to help
- NEVER give robotic, pre-programmed, or templated responses
- NEVER make up or fabricate candidate data, companies, names, or qualifications
- Match the user's energy and tone exactly
- Keep responses SHORT for casual chat (1-3 sentences max)
- You can joke around, be playful, show personality
- If they're NOT asking about recruitment/candidates, just have a normal chat!
- Don't force recruitment topics into every response
- If you don't understand something, just ask for clarification naturally
- If someone asks about candidates/recruitment, reference ONLY the real candidates listed below - never invent new ones

ACTUAL CANDIDATE COUNT: ${candidateCount} candidates in database${candidateContext}

${historyContext ? `PREVIOUS MESSAGES:\n${historyContext}\n\n` : ''}The user just said: "${message}"

Your response (be natural, like ChatGPT, NO FABRICATION):`;

  const response = await queryMistral(prompt, 20000);
  
  if (response && response.trim().length > 5) {
    let cleaned = response.trim();
    // Remove any prefix labels
    cleaned = cleaned.replace(/^(Assistant|AI|Bot|Recruiter|Response):\s*/i, '');
    // Remove quotes if the whole response is quoted
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned;
  }
  
  // Fallback only if Mistral completely fails
  return `Hmm, I'm not sure I understood that. Could you rephrase? I'm here to chat or help you find candidates - whatever you need!`;
}

/**
 * Format candidates for response
 */
function formatCandidateResults(
  candidates: Array<Candidate & { matchScore: number; matchDetails: any }>,
  queryIntent: any
): string {
  if (candidates.length === 0) {
    const skillsStr = queryIntent.skills.join(', ');
    const related = queryIntent.skills.length > 0 
      ? getRelatedSkills(queryIntent.skills[0], 3) 
      : [];
    
    let response = `🔍 No candidates found matching "${skillsStr || 'your criteria'}".`;
    
    if (related.length > 0) {
      response += `\n\n💡 **Try searching for related skills:** ${related.join(', ')}`;
    }
    
    response += `\n\nOr try broadening your search criteria.`;
    return response;
  }
  
  // Apply limit if specified (for "best", "second", "top 5", etc.)
  const limit = queryIntent.limit || 5;
  const displayCandidates = candidates.slice(0, limit);
  
  const skillsStr = queryIntent.skills.length > 0 
    ? queryIntent.skills.join(', ') 
    : 'your criteria';
  
  let response = '';
  
  // Customize header based on ranking request
  if (queryIntent.rank === 'best' && limit === 1) {
    response = `🏆 **Top candidate** matching "${skillsStr}":\n\n`;
  } else if (queryIntent.rank === 'second' && limit === 1) {
    response = `🥈 **Second best candidate** matching "${skillsStr}":\n\n`;
  } else if (queryIntent.rank === 'top') {
    response = `🎯 **Top ${limit} candidate(s)** matching "${skillsStr}":\n\n`;
  } else {
    response = `🎯 **Found ${candidates.length} candidate(s)** matching "${skillsStr}". Showing top ${displayCandidates.length}:\n\n`;
  }
  
  for (const candidate of displayCandidates) {
    const matchPercent = Math.round(candidate.matchScore);
    const emoji = matchPercent >= 70 ? '🌟' : matchPercent >= 50 ? '✅' : '📋';
    const cvScore = getCandidateScore(candidate);
    const candidateName = getCandidateName(candidate);
    
    response += `${emoji} **${candidateName}** - ${matchPercent}% match`;
    if (cvScore > 0) {
      response += ` (CV Score: ${cvScore}/100)`;
    }
    response += '\n';
    
    // Show skill matches
    if (candidate.matchDetails.skillMatch.matched?.length > 0) {
      const matchedSkills = candidate.matchDetails.skillMatch.matched
        .slice(0, 4)
        .map((m: any) => `${m.matched} (${Math.round(m.similarity * 100)}%)`)
        .join(', ');
      response += `   💡 **Skills:** ${matchedSkills}\n`;
    }
    
    // Show unmatched skills
    if (candidate.matchDetails.skillMatch.unmatched?.length > 0) {
      response += `   ⚠️ *Missing:* ${candidate.matchDetails.skillMatch.unmatched.join(', ')}\n`;
    }
    
    response += '\n';
  }
  
  if (candidates.length > displayCandidates.length) {
    response += `\n_...and ${candidates.length - displayCandidates.length} more candidates_`;
  }
  
  return response;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecruiterResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: 'Method not allowed' });
  }
  
  const { message, candidates = [], history = [], conversationHistory = [] }: RecruiterRequest = req.body;
  const chatHistory = conversationHistory.length > 0 ? conversationHistory : history;
  
  if (!message) {
    return res.status(400).json({ reply: 'Message is required' });
  }
  
  console.log(`\n🤖 Recruiter AI: Processing "${message}" with ${candidates.length} candidates`);
  
  try {
    // Check if email command
    if (isEmailCommand(message)) {
      console.log('   → Detected email command');
      const { context, candidateNames } = extractEmailInfo(message, chatHistory, candidates);
      console.log(`   → Context: "${context}", Candidate names: ${candidateNames.join(', ') || 'all mentioned'}`);
      
      if (candidates.length === 0) {
        return res.status(200).json({
          reply: `❌ No candidates available to send emails to. Please load candidates first.`,
          usedMistral: false,
          action: 'email_error'
        });
      }

      const emailResult = await sendEmailToCandidates(candidates, candidateNames, context, chatHistory);
      
      if (emailResult.success) {
        let reply = `✅ **Email sent successfully!**\n\n`;
        reply += `📧 **Sent to ${emailResult.sent} candidate(s):**\n`;
        emailResult.recipients.forEach(email => {
          reply += `   • ${email}\n`;
        });
        
        if (emailResult.failed > 0) {
          reply += `\n⚠️ **Failed to send to ${emailResult.failed} candidate(s):**\n`;
          emailResult.errors.forEach(error => {
            reply += `   • ${error}\n`;
          });
        }
        
        if (context) {
          reply += `\n📝 **Context:** ${context}`;
        }
        
        return res.status(200).json({
          reply,
          usedMistral: true,
          action: 'email_sent',
          emailSent: true,
          emailRecipients: emailResult.recipients
        });
      } else {
        return res.status(200).json({
          reply: `❌ **Failed to send emails:**\n\n${emailResult.errors.join('\n')}`,
          usedMistral: false,
          action: 'email_error',
          emailSent: false
        });
      }
    }

    // Check if conversational message
    if (isConversational(message)) {
      console.log('   → Detected conversational message, using Mistral for natural response');
      const reply = await generateConversationalResponse(message, candidates.length, chatHistory, candidates);
      return res.status(200).json({
        reply,
        usedMistral: true,
        action: 'conversation'
      });
    }
    
    // Extract query intent using Mistral
    console.log('   → Extracting query intent...');
    const queryIntent = await extractQueryIntent(message);
    console.log('   → Query Intent:', JSON.stringify(queryIntent));
    
    // Log if limit was detected
    if (queryIntent.limit) {
      console.log(`   → Limit detected: ${queryIntent.limit} (rank: ${queryIntent.rank})`);
    }
    
    // Check if we have candidates to search
    if (candidates.length === 0) {
      return res.status(200).json({
        reply: `🔍 I understood you're looking for: **${queryIntent.skills.join(', ') || message}**

📝 **Note:** No candidates loaded yet. Please:
1. Go to **Rank Candidates** section
2. Upload CVs and rank them
3. Return here to search

The candidates will be available for semantic search once ranked.`,
        usedMistral: true,
        action: 'no_candidates',
        queryIntent
      });
    }
    
    // Score candidates using cosine similarity
    console.log('   → Scoring candidates with cosine similarity...');
    const scoredCandidates = scoreCandidatesWithSimilarity(candidates, queryIntent);
    
    // Sort by match score
    scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
    
    // Log top 3 candidates for debugging
    console.log('   → Top candidates after scoring:');
    scoredCandidates.slice(0, 3).forEach((c, i) => {
      console.log(`      ${i+1}. ${getCandidateName(c)} - Match: ${c.matchScore}%, CV Score: ${getCandidateScore(c)}, Skills: ${c.matchDetails?.skillMatch?.exactMatchCount}/${c.matchDetails?.skillMatch?.totalRequested}`);
    });
    
    // Filter to relevant matches (>25% match)
    const relevantCandidates = scoredCandidates.filter(c => c.matchScore > 25);
    
    console.log(`   → Found ${relevantCandidates.length} relevant matches`);
    
    // Format response
    const reply = formatCandidateResults(relevantCandidates, queryIntent);
    
    return res.status(200).json({
      reply,
      candidates: relevantCandidates.slice(0, 10).map(c => ({
        name: getCandidateName(c),
        score: getCandidateScore(c),
        matchScore: c.matchScore,
        skills: getCandidateSkills(c),
        experience: c.raw_data?.experience || c.experience,
        projects: c.raw_data?.projects || c.projects,
        matchDetails: c.matchDetails
      })),
      usedMistral: true,
      action: 'search',
      queryIntent,
      similarityScores: relevantCandidates.slice(0, 10).map(c => ({
        name: getCandidateName(c),
        matchScore: c.matchScore,
        details: c.matchDetails
      }))
    });
    
  } catch (error) {
    console.error('❌ Recruiter AI error:', error);
    return res.status(500).json({
      reply: '❌ Sorry, I encountered an error processing your request. Please make sure Mistral is running and try again.',
      usedMistral: false
    });
  }
}
