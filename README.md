# CV Ranking System

An AI-powered CV parsing and candidate ranking system built with Python and Next.js. Uses local Mistral AI (via Ollama) for intelligent CV parsing and a structured scoring algorithm for candidate ranking.

## Features

- **AI-Powered CV Parsing**: Extract structured data from CV images/PDFs using Mistral AI
- **Intelligent Ranking**: Score candidates based on experience, skills, projects, and education
- **Modern Web Interface**: Beautiful Next.js frontend with real-time CV upload and ranking
- **AI Recruiter Chatbot**: Natural language interface to search and filter candidates
- **Email Integration**: Send interview invitations directly from the app
- **MongoDB Storage**: Persistent storage for CVs, rankings, and chat history

## Prerequisites

Before you begin, ensure you have the following installed:

### 1. Python 3.8+
Download from [python.org](https://www.python.org/downloads/)

### 2. Node.js 18+
Download from [nodejs.org](https://nodejs.org/)

### 3. Tesseract OCR
Required for extracting text from CV images.

**Windows:**
1. Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Run the installer (choose the 64-bit version)
3. During installation, select additional languages: **French** and **English**
4. Add Tesseract to your PATH:
   - Default install path: `C:\Program Files\Tesseract-OCR`
   - Add this to your system PATH environment variable

**macOS:**
```bash
brew install tesseract
brew install tesseract-lang  # for additional languages
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install tesseract-ocr tesseract-ocr-fra tesseract-ocr-eng
```

### 4. Ollama (for Mistral AI)
Ollama runs AI models locally on your machine.

**Windows:**
1. Download from: https://ollama.com/download/windows
2. Run the installer
3. Ollama will start automatically as a background service

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 5. MongoDB (Optional - for data persistence)
Download from [mongodb.com](https://www.mongodb.com/try/download/community) or use MongoDB Atlas (cloud).

## Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/youssefbenabbou123/SmartHire-NextGen.git
cd Capgemini
```

### Step 2: Set Up Python Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### Step 3: Download Mistral AI Model
```bash
# Start Ollama (if not already running)
ollama serve

# In a new terminal, download the Mistral model
ollama pull mistral
```

### Step 4: Set Up the Frontend
```bash
cd cv-ranking-app

# Install Node.js dependencies
npm install
```

### Step 5: Configure Environment Variables
Create a `.env.local` file in the `cv-ranking-app` folder:

```env
MONGODB_URI=mongodb+srv://deep:12345@cluster0.y7nju.mongodb.net/?appName=Cluster0
MONGODB_DB_NAME=capgemini
# SMTP Configuration (Gmail)
SMTP_USER=youssef.benabbou24@gmail.com
SMTP_PASSWORD=fuwvfbqpbmnrewvn
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

## Running the Application

### Step 1: Start Ollama (if not running)
```bash
ollama serve
```

### Step 2: Start the Development Server
```bash
cd cv-ranking-app
npm run dev
```

### Step 3: Open the Application
Open your browser and navigate to: http://localhost:3000

## Project Structure

```
Capgemini/
├── cv_ranking.py          # Main ranking algorithm
├── parse_cv_image.py      # CV image parser with Mistral AI
├── pdf_converter.py       # PDF/Word to image converter
├── keyword_mappings.py    # Keyword normalization for OCR
├── test_parser3.py        # CV parsing entry point (used by API)
├── requirements.txt       # Python dependencies
├── README.md              # This file
│
└── cv-ranking-app/        # Next.js Frontend
    ├── pages/
    │   ├── index.tsx      # Home page
    │   ├── upload.tsx     # CV upload page
    │   ├── ranking.tsx    # Candidate ranking page
    │   ├── recruiter.tsx  # AI Recruiter chatbot
    │   └── api/           # API routes
    ├── components/        # React components
    ├── contexts/          # React contexts
    ├── hooks/             # Custom hooks
    ├── lib/               # Utility functions
    ├── styles/            # CSS styles
    └── package.json       # Node.js dependencies
```

## Usage Guide

### 1. Upload CVs
- Navigate to the **Upload** page
- Drag and drop or select CV files (PDF, PNG, JPG, DOCX)
- The system will parse CVs using Mistral AI

### 2. Rank Candidates
- Go to the **Ranking** page
- Select uploaded CVs to include in ranking
- Enter job requirements (role, required skills)
- Click "Rank Candidates" to see results

### 3. AI Recruiter Chat
- Navigate to the **Recruiter** page
- Ask natural language questions like:
  - "Show me Java developers"
  - "Find candidates with 5+ years experience"
  - "Who knows React and Node.js?"

### 4. Send Interview Invitations
- From the ranking results, click on a candidate
- Use the email feature to send interview invitations

## Scoring System

The ranking algorithm scores candidates out of 100 points:

| Category | Max Points | Description |
|----------|------------|-------------|
| Experience Quality | 35 | Company reputation, role relevance, duration |
| Technical Skills | 25 | Skill match with requirements, depth indicators |
| Projects & Impact | 20 | Project quality, relevance to job |
| Education & Certs | 10 | Degree relevance, certifications |
| Signal & Consistency | 10 | CV coherence, career logic |

## Troubleshooting

### Tesseract Not Found
```
pytesseract.TesseractNotFoundError
```
**Solution:** Ensure Tesseract is installed and added to your system PATH.

### Ollama Connection Error
```
Error connecting to Ollama
```
**Solution:** Make sure Ollama is running (`ollama serve`) and Mistral is downloaded (`ollama pull mistral`).

### PDF Conversion Fails
```
Failed to convert PDF
```
**Solution:** Ensure PyMuPDF is installed (`pip install pymupdf`).

### MongoDB Connection Error
```
MongoDB connection failed
```
**Solution:** Either start local MongoDB or configure MongoDB Atlas URI in `.env.local`.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/parse-cv` | POST | Parse a CV file |
| `/api/rank` | POST | Rank candidates |
| `/api/save-cv` | POST | Save parsed CV |
| `/api/get-cvs` | GET | Get all saved CVs |
| `/api/recruiter-ai` | POST | AI recruiter chat |
| `/api/send-email` | POST | Send email |

## Technologies Used

**Backend:**
- Python 3.8+
- Tesseract OCR
- Mistral AI (via Ollama)
- PyMuPDF

**Frontend:**
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- MongoDB

## License

This project was created for Capgemini By:
- Youssef Benabbou
- Yassir Houari
- Ghita Ibrahimi
- Nadia Outaleb


