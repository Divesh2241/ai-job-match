/**
 * JobMatch AI — Frontend Script
 * Handles skill search, CV upload, job cards, and job detail page navigation.
 */

const API = 'http://localhost:3000';

// ── State ──────────────────────────────────────────────────────
let lastResults = [];
let lastUserSkills = [];
let previousPage = 'home';

// ── DOM refs ───────────────────────────────────────────────────
const skillsInput      = document.getElementById('skillsInput');
const recommendBtn     = document.getElementById('recommendBtn');
const errorMsg         = document.getElementById('errorMsg');
const loader           = document.getElementById('loader');
const resultsSection   = document.getElementById('resultsSection');
const resultsHeading   = document.getElementById('resultsHeading');
const resultsGrid      = document.getElementById('resultsGrid');
const userSkillsDisplay= document.getElementById('userSkillsDisplay');

const cvFileInput      = document.getElementById('cvFileInput');
const cvTextInput      = document.getElementById('cvTextInput');
const cvSubmitBtn      = document.getElementById('cvSubmitBtn');
const cvLoader         = document.getElementById('cvLoader');
const cvError          = document.getElementById('cvError');
const cvResultsSection = document.getElementById('cvResultsSection');
const cvResultsGrid    = document.getElementById('cvResultsGrid');
const cvResultsHeading = document.getElementById('cvResultsHeading');
const cvExtractedSkills= document.getElementById('cvExtractedSkills');
const cvDropZone       = document.getElementById('cvDropZone');

// ── Navigation ─────────────────────────────────────────────────
function showHome() {
  document.getElementById('homePage').classList.remove('hidden');
  document.getElementById('jobDetailPage').classList.add('hidden');
  document.querySelector('.footer').classList.remove('hidden');
}

function showJobDetail(job, userSkills) {
  previousPage = 'home';
  lastUserSkills = userSkills || lastUserSkills;
  document.getElementById('homePage').classList.add('hidden');
  document.querySelector('.footer').classList.add('hidden');
  const page = document.getElementById('jobDetailPage');
  page.classList.remove('hidden');
  renderJobDetail(job);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
  showHome();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToSection(id) {
  showHome();
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.add('hidden');
}

// Hamburger toggle
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobileMenu').classList.toggle('hidden');
});

// ── Category search ────────────────────────────────────────────
function searchByCategory(skills) {
  skillsInput.value = skills;
  scrollToSection('search-section');
  setTimeout(() => fetchRecommendations(), 400);
}

// ── Quick chips ────────────────────────────────────────────────
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    skillsInput.value = chip.dataset.skills;
    skillsInput.focus();
  });
});

// ── Skill search ───────────────────────────────────────────────
skillsInput.addEventListener('keydown', e => { if (e.key === 'Enter') fetchRecommendations(); });
recommendBtn.addEventListener('click', fetchRecommendations);

async function fetchRecommendations() {
  const raw = skillsInput.value.trim();
  if (!raw) { showError(errorMsg, 'Please enter at least one skill.'); return; }
  hideError(errorMsg);
  setLoader(loader, true);
  resultsSection.classList.add('hidden');

  try {
    const res = await fetch(API + '/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills: raw }),
    });
    const data = await res.json();
    if (!res.ok) { showError(errorMsg, data.error || 'Something went wrong.'); return; }
    const userSkills = raw.split(',').map(s => s.trim().toLowerCase());
    lastUserSkills = userSkills;
    lastResults = data.results || [];
    renderResults(data, userSkills, resultsGrid, resultsHeading, resultsSection, userSkillsDisplay);
  } catch {
    showError(errorMsg, 'Cannot connect to server. Make sure it is running on port 3000.');
  } finally {
    setLoader(loader, false);
  }
}

// ── CV Upload ──────────────────────────────────────────────────
cvSubmitBtn.addEventListener('click', submitCV);

cvFileInput.addEventListener('change', () => {
  if (cvFileInput.files[0]) {
    cvDropZone.querySelector('.upload-title').textContent = cvFileInput.files[0].name;
  }
});

// Drag and drop
cvDropZone.addEventListener('dragover', e => { e.preventDefault(); cvDropZone.classList.add('drag-over'); });
cvDropZone.addEventListener('dragleave', () => cvDropZone.classList.remove('drag-over'));
cvDropZone.addEventListener('drop', e => {
  e.preventDefault();
  cvDropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) {
    cvFileInput.files = e.dataTransfer.files;
    cvDropZone.querySelector('.upload-title').textContent = file.name;
  }
});

async function submitCV() {
  hideError(cvError);
  cvResultsSection.classList.add('hidden');
  setLoader(cvLoader, true);

  try {
    const file = cvFileInput.files[0];
    const text = cvTextInput.value.trim();

    if (!file && !text) {
      showError(cvError, 'Please upload a file or paste your CV text.');
      return;
    }

    let res, data;

    if (file) {
      const form = new FormData();
      form.append('cv', file);
      res = await fetch(API + '/cv-recommend', { method: 'POST', body: form });
    } else {
      res = await fetch(API + '/cv-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: text }),
      });
    }

    data = await res.json();
    if (!res.ok) { showError(cvError, data.error || 'Could not analyze CV.'); return; }

    // Show extracted skills
    cvExtractedSkills.innerHTML = data.extractedSkills
      .map(s => `<span class="skill-tag skill-matched">${s}</span>`)
      .join('');

    lastUserSkills = data.extractedSkills;
    lastResults = data.results || [];
    renderResults(data, data.extractedSkills, cvResultsGrid, cvResultsHeading, cvResultsSection, null);
    cvResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    showError(cvError, 'Cannot connect to server. Make sure it is running on port 3000.');
  } finally {
    setLoader(cvLoader, false);
  }
}

// ── Render results grid ────────────────────────────────────────
function renderResults(data, userSkills, grid, heading, section, skillsDisplay) {
  grid.innerHTML = '';

  if (skillsDisplay) {
    skillsDisplay.innerHTML = userSkills
      .map(s => `<span class="user-skill-tag">${s}</span>`)
      .join('');
  }

  if (!data.results || data.results.length === 0) {
    heading.textContent = 'No matches found';
    grid.innerHTML = `<div class="no-results"><div class="icon">🔍</div><p>${data.message || 'Try adding more relevant skills.'}</p></div>`;
    section.classList.remove('hidden');
    return;
  }

  heading.textContent = `Top ${data.results.length} matches — sorted by AI fit score`;

  data.results.forEach((job, i) => {
    const card = buildCard(job, i + 1, userSkills);
    grid.appendChild(card);
    requestAnimationFrame(() => {
      const fill = card.querySelector('.match-bar-fill');
      if (fill) fill.style.width = fill.dataset.target;
    });
  });

  section.classList.remove('hidden');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Build job card ─────────────────────────────────────────────
function buildCard(job, rank, userSkills) {
  const card = document.createElement('div');
  card.className = 'job-card';

  const tier = job.matchPercent >= 60 ? 'high' : job.matchPercent >= 30 ? 'medium' : 'low';
  const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';

  const skillsHTML = job.requiredSkills.slice(0, 5).map(s => {
    const matched = userSkills.includes(s.toLowerCase());
    return `<span class="skill-tag ${matched ? 'skill-matched' : 'skill-missing'}">${s}</span>`;
  }).join('');

  const missingCount = job.missingSkills ? job.missingSkills.length : 0;
  const missingHint = missingCount > 0
    ? `<p class="missing-hint">💡 Learn ${missingCount} more skill${missingCount > 1 ? 's' : ''} to boost your match</p>`
    : `<p class="missing-hint" style="color:var(--success)">✅ You match all required skills!</p>`;

  card.innerHTML = `
    <div class="card-top">
      <div class="company-logo">${job.companyLogo || '🏢'}</div>
      <div class="card-meta">
        <div class="card-title">${esc(job.title)}</div>
        <div class="card-company">${esc(job.company)} · ${esc(job.industry)}</div>
      </div>
      <div class="rank-badge ${rankClass}">#${rank}</div>
    </div>
    <div class="match-row">
      <div class="match-bar-bg">
        <div class="match-bar-fill fill-${tier}" style="width:0%" data-target="${job.matchPercent}%"></div>
      </div>
      <span class="match-pct pct-${tier}">${job.matchPercent}%</span>
    </div>
    <div class="card-tags">
      <span class="tag tag-type">${esc(job.type)}</span>
      <span class="tag tag-level">${esc(job.level)}</span>
      <span class="tag tag-location">📍 ${esc(job.location)}</span>
    </div>
    <p class="card-desc">${esc(job.description)}</p>
    <div class="card-skills">${skillsHTML}</div>
    ${missingHint}
    <div class="card-footer">
      <span class="card-salary">${esc(job.salary)}</span>
      <button class="card-view-btn">View Details →</button>
    </div>
  `;

  card.querySelector('.card-view-btn').addEventListener('click', e => {
    e.stopPropagation();
    showJobDetail(job, userSkills);
  });
  card.addEventListener('click', () => showJobDetail(job, userSkills));

  return card;
}

// ── Render job detail page ─────────────────────────────────────
function renderJobDetail(job) {
  const tier = job.matchPercent >= 60 ? 'high' : job.matchPercent >= 30 ? 'medium' : 'low';
  const userSkills = lastUserSkills;

  const responsibilitiesHTML = (job.responsibilities || [])
    .map(r => `<li>${esc(r)}</li>`).join('');

  const benefitsHTML = (job.benefits || [])
    .map(b => `<span class="benefit-tag">${esc(b)}</span>`).join('');

  const requiredSkillsHTML = (job.requiredSkills || []).map(s => {
    const matched = userSkills.includes(s.toLowerCase());
    return `<span class="skill-tag ${matched ? 'skill-matched' : 'skill-missing'}">${esc(s)}</span>`;
  }).join('');

  const niceToHaveHTML = (job.niceToHave || []).map(s => {
    const matched = userSkills.includes(s.toLowerCase());
    return `<span class="skill-tag ${matched ? 'skill-matched' : 'skill-missing'}">${esc(s)}</span>`;
  }).join('');

  const missingHTML = job.missingSkills && job.missingSkills.length > 0
    ? `<div class="detail-section">
        <h3>💡 Skills to Learn</h3>
        <p style="font-size:.88rem;color:var(--text-muted);margin-bottom:14px">Add these to significantly improve your match score:</p>
        <div class="skills-section-grid">
          ${job.missingSkills.map(s => `<span class="skill-tag skill-missing">${esc(s)}</span>`).join('')}
        </div>
       </div>`
    : `<div class="detail-section" style="border-color:rgba(52,211,153,.2)">
        <h3 style="color:var(--success)">✅ Perfect Match on Required Skills!</h3>
        <p style="font-size:.88rem;color:var(--text-muted)">You have all the required skills for this role. You're a strong candidate!</p>
       </div>`;

  const matchDisplay = job.matchPercent !== undefined
    ? `<div class="detail-match-block">
        <div class="detail-match-circle ${tier}">
          <span class="detail-match-num">${job.matchPercent}%</span>
          <span class="detail-match-label">Match</span>
        </div>
        <div style="font-size:.75rem;color:var(--text-muted)">AI Score</div>
       </div>`
    : '';

  document.getElementById('jobDetailContent').innerHTML = `
    <div class="detail-hero">
      <div class="detail-top">
        <div class="detail-logo">${job.companyLogo || '🏢'}</div>
        <div class="detail-title-block">
          <div class="detail-title">${esc(job.title)}</div>
          <div class="detail-company">${esc(job.company)} · ${esc(job.industry)}</div>
          <div class="detail-tags">
            <span class="tag tag-type">${esc(job.type)}</span>
            <span class="tag tag-level">${esc(job.level)}</span>
            <span class="tag tag-location">📍 ${esc(job.location)}</span>
            <span class="tag tag-location">🕐 ${esc(job.posted)}</span>
          </div>
        </div>
        ${matchDisplay}
      </div>

      <div class="detail-info-grid">
        <div class="info-item">
          <div class="info-label">Company</div>
          <div class="info-value">${esc(job.company)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Salary</div>
          <div class="info-value" style="color:var(--success)">${esc(job.salary)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Location</div>
          <div class="info-value">${esc(job.location)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Company Size</div>
          <div class="info-value">${esc(job.companySize)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Category</div>
          <div class="info-value">${esc(job.category)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Posted</div>
          <div class="info-value">${esc(job.posted)}</div>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>📋 About the Role</h3>
      <p style="font-size:.92rem;color:var(--text-muted);line-height:1.7">${esc(job.description)}</p>
    </div>

    <div class="detail-section">
      <h3>🎯 Key Responsibilities</h3>
      <ul>${responsibilitiesHTML}</ul>
    </div>

    <div class="detail-section">
      <h3>🛠 Required Skills</h3>
      <div class="skills-section-grid">${requiredSkillsHTML}</div>
      ${niceToHaveHTML ? `<div style="margin-top:14px"><div style="font-size:.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Nice to Have</div><div class="skills-section-grid">${niceToHaveHTML}</div></div>` : ''}
    </div>

    ${missingHTML}

    <div class="detail-section">
      <h3>🎁 Benefits</h3>
      <div class="benefits-grid">${benefitsHTML}</div>
    </div>

    <div class="apply-bar">
      <p>Ready to apply? <strong>${esc(job.company)}</strong> is hiring for this role.</p>
      <button class="apply-btn" onclick="alert('In a real app this would open the application form for ${esc(job.company)}!')">Apply Now</button>
    </div>
  `;
}

// ── Helpers ────────────────────────────────────────────────────
function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function hideError(el) { el.classList.add('hidden'); }
function setLoader(el, show) { el.classList.toggle('hidden', !show); }
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}
