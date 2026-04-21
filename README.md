# 🤖 JobMatch AI — AI-Powered Job Recommendation System

## Problem Statement

Job seekers often struggle to identify which roles best match their current skill set. This application solves that by accepting a user's skills as input and using a cosine similarity algorithm to rank and recommend the most relevant job roles — along with suggestions for skills they should learn to improve their chances.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│  frontend/index.html  ←→  style.css  ←→  script.js │
│         │                                           │
│         │  POST /recommend  { skills: "..." }       │
└─────────┼───────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│              Node.js + Express (port 3000)          │
│                   backend/server.js                 │
│                        │                            │
│              Reads  jobs.json dataset               │
│              Runs cosine similarity scoring         │
│              Returns top 3–5 ranked jobs            │
└─────────────────────────────────────────────────────┘
```

- **Frontend** — Pure HTML/CSS/JS, no framework needed. Sends a POST request and renders result cards.
- **Backend** — Express.js REST API. Loads the job dataset, scores each job against user skills, and returns ranked results.

---

## AI/ML Approach

### Algorithm: Cosine Similarity

Each job and the user's input are represented as **binary vectors** over a shared vocabulary of all known skills.

```
User skills:  [python, sql, excel]
Job skills:   [python, sql, excel, power bi, statistics]

Vocabulary:   [python, sql, excel, power bi, statistics]
User vector:  [1, 1, 1, 0, 0]
Job vector:   [1, 1, 1, 1, 1]

Cosine similarity = (dot product) / (|A| × |B|)
                  = 3 / (√3 × √5)
                  = 0.775  →  78% match
```

### Why Cosine Similarity?
- Direction-based: focuses on skill overlap, not raw count
- Scale-invariant: works regardless of how many skills a job requires
- Fast and interpretable

### Additional Logic
- **Missing skills**: any required skill not in the user's input is flagged as a suggestion
- **Sorting**: results are ranked by match % descending
- **Top N**: returns up to 5 results, filters out 0% matches

---

## Project Structure

```
├── frontend/
│   ├── index.html      # App shell and markup
│   ├── style.css       # Dark-theme responsive styles
│   └── script.js       # Fetch API, card rendering, UX logic
│
├── backend/
│   ├── server.js       # Express server + /recommend endpoint
│   ├── jobs.json       # Job dataset (10 roles with required skills)
│   └── package.json    # Node dependencies
│
└── README.md
```

---

## How to Run

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher

### Steps

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Start the server
node server.js
```

Then open your browser at:

```
http://localhost:3000
```

The Express server also serves the frontend, so no separate web server is needed.

### API Usage (direct)

```bash
curl -X POST http://localhost:3000/recommend \
  -H "Content-Type: application/json" \
  -d '{"skills": "python, sql, excel"}'
```

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "title": "Data Analyst",
      "matchPercent": 78,
      "description": "...",
      "requiredSkills": ["python", "sql", "excel", "power bi", "statistics"],
      "missingSkills": ["power bi", "statistics"]
    }
  ]
}
```

---

## Dataset

10 job roles are included in `backend/jobs.json`:

| Role | Key Skills |
|---|---|
| Data Analyst | Python, SQL, Excel, Power BI |
| Business Analyst | Excel, Communication, SQL |
| Software Developer | JavaScript, React, Node.js |
| Product Manager | Communication, Strategy, Leadership |
| Digital Marketer | SEO, Ads, Content |
| Machine Learning Engineer | Python, ML, TensorFlow |
| Frontend Developer | JavaScript, React, HTML, CSS |
| DevOps Engineer | Docker, Kubernetes, AWS |
| UX Designer | Figma, User Research, Wireframing |
| Data Scientist | Python, ML, Statistics, R |

You can extend the dataset by adding more objects to `jobs.json` — no code changes required.
