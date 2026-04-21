/**
 * Job Recommendation API Server
 * Uses cosine similarity scoring to match user skills against job requirements
 * Supports CV upload and parsing
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const jobs = require('./jobs.json');

const app = express();
const PORT = 3000;

// Configure multer for file uploads (in-memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

/**
 * Build a term-frequency vector from a skill array.
 * Each unique skill across all jobs becomes a dimension.
 * @param {string[]} skills - normalized skill list
 * @param {string[]} vocabulary - all known skills
 * @returns {number[]} vector
 */
function buildVector(skills, vocabulary) {
  return vocabulary.map(term => (skills.includes(term) ? 1 : 0));
}

/**
 * Cosine similarity between two vectors.
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Core scoring function — shared by /recommend and /cv-recommend
 * @param {string[]} userSkills - normalized user skill list
 * @returns {object[]} scored and sorted job list
 */
function scoreJobs(userSkills) {
  const allJobSkills = jobs.flatMap(job => [...job.requiredSkills, ...(job.niceToHave || [])]);
  const vocabulary = [...new Set([...allJobSkills, ...userSkills])];
  const userVector = buildVector(userSkills, vocabulary);

  const scored = jobs.map(job => {
    const allSkills = [...job.requiredSkills, ...(job.niceToHave || [])];
    const jobVector = buildVector(allSkills, vocabulary);
    const similarity = cosineSimilarity(userVector, jobVector);

    // Bonus: extra weight for matching required (vs nice-to-have) skills
    const requiredMatched = job.requiredSkills.filter(s => userSkills.includes(s)).length;
    const requiredBonus = (requiredMatched / job.requiredSkills.length) * 0.2;

    const rawScore = Math.min(similarity + requiredBonus, 1);
    const matchPercent = Math.round(rawScore * 100);
    const missingSkills = job.requiredSkills.filter(s => !userSkills.includes(s));
    const matchedSkills = job.requiredSkills.filter(s => userSkills.includes(s));

    return {
      id: job.id,
      title: job.title,
      category: job.category,
      type: job.type,
      level: job.level,
      salary: job.salary,
      location: job.location,
      company: job.company,
      companyLogo: job.companyLogo,
      companySize: job.companySize,
      industry: job.industry,
      posted: job.posted,
      description: job.description,
      responsibilities: job.responsibilities,
      benefits: job.benefits,
      requiredSkills: job.requiredSkills,
      niceToHave: job.niceToHave || [],
      matchPercent,
      missingSkills,
      matchedSkills,
    };
  });

  return scored
    .filter(j => j.matchPercent > 0)
    .sort((a, b) => b.matchPercent - a.matchPercent);
}

/**
 * POST /recommend
 * Body: { skills: "python, sql, excel" }
 */
app.post('/recommend', (req, res) => {
  const { skills } = req.body;

  if (!skills || typeof skills !== 'string' || skills.trim() === '') {
    return res.status(400).json({ error: 'Please provide at least one skill.' });
  }

  const userSkills = skills.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);

  if (userSkills.length === 0) {
    return res.status(400).json({ error: 'No valid skills detected. Use comma-separated values.' });
  }

  const topJobs = scoreJobs(userSkills).slice(0, 6);

  if (topJobs.length === 0) {
    return res.json({ results: [], message: 'No matching jobs found. Try adding more relevant skills.' });
  }

  return res.json({ results: topJobs });
});

/**
 * GET /job/:id
 * Returns full details for a single job
 */
app.get('/job/:id', (req, res) => {
  const job = jobs.find(j => j.id === parseInt(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  return res.json(job);
});

/**
 * POST /cv-recommend
 * Accepts a CV file (PDF/TXT/DOCX) or raw text, extracts skills, returns matches
 */
app.post('/cv-recommend', upload.single('cv'), (req, res) => {
  let cvText = '';

  if (req.file) {
    // Convert buffer to string — works for plain text and basic PDF text extraction
    cvText = req.file.buffer.toString('utf-8', 0, req.file.buffer.length);
    // Strip non-printable characters that come from binary PDF headers
    cvText = cvText.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
  } else if (req.body && req.body.cvText) {
    cvText = req.body.cvText;
  }

  if (!cvText || cvText.trim().length < 10) {
    return res.status(400).json({ error: 'Could not read CV content. Please paste your CV text instead.' });
  }

  // Extract skills by matching against our known skill vocabulary
  const allKnownSkills = [...new Set(jobs.flatMap(j => [...j.requiredSkills, ...(j.niceToHave || [])]))];
  const cvLower = cvText.toLowerCase();

  const extractedSkills = allKnownSkills.filter(skill => {
    // Match whole word / phrase
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`).test(cvLower);
  });

  if (extractedSkills.length === 0) {
    return res.status(400).json({ error: 'No recognizable skills found in your CV. Try pasting the text directly.' });
  }

  const topJobs = scoreJobs(extractedSkills).slice(0, 6);

  return res.json({
    extractedSkills,
    results: topJobs,
  });
});

// Fallback: serve index.html for any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
