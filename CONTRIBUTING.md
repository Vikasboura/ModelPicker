# Contributing to ModelPicker

Thank you for your interest in contributing to **ModelPicker**! We welcome contributions from developers, researchers, and LLM enthusiasts.

---

## Code of Conduct

This project adheres to the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## How to Contribute

### 1. Reporting Bugs
- Search existing [Issues](https://github.com/Vikasboura/ModelPicker/issues) to ensure the bug has not already been reported.
- Open a new issue with a clear title and description. Include:
  - Operating system and environment details.
  - Steps to reproduce.
  - Expected vs. actual behavior.
  - Relevant logs or error messages (redacting private tokens or sensitive prompts).

### 2. Suggesting Enhancements
- Open a feature request issue describing:
  - The problem or missing feature.
  - Proposed solution or architecture change.
  - Potential alternatives considered.

### 3. Submitting Pull Requests
1. **Fork** the repository and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/ModelPicker.git
   cd ModelPicker
   ```
2. **Create a topic branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Set up your environment**:
   - Backend:
     ```bash
     cd backend
     python -m venv venv
     source venv/bin/activate  # On Windows: .\venv\Scripts\Activate.ps1
     pip install -r requirements.txt
     ```
   - Frontend:
     ```bash
     cd frontend
     npm install
     ```
4. **Follow code quality standards**:
   - Backend formatting & linting:
     ```bash
     ruff check backend/
     ruff format --check backend/
     pytest backend/tests
     ```
   - Frontend linting & building:
     ```bash
     cd frontend
     npm run lint
     npm run build
     ```
5. **Commit your changes**:
   Write clear, concise commit messages following standard conventions (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
6. **Push and create a Pull Request**:
   Push your branch to GitHub and open a PR against `master` with a detailed explanation of your changes.

---

## Project Structure & Architecture

```
ModelPicker/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # REST API endpoints (FastAPI)
│   │   ├── core/            # Configuration & SQLite/SQLAlchemy setup
│   │   ├── models/          # Database models
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   └── services/        # Ollama client, benchmarking, scoring, evaluation
│   ├── data/                # Default datasets & pricing catalog
│   └── tests/               # Pytest test suite (mocked external calls)
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (Navbar, ModelSelector, BenchmarkRunner)
│   │   ├── pages/           # Landing, Dashboard, Playground, Models, Datasets
│   │   └── services/        # Axios API client
│   └── vercel.json          # Vercel deployment rewrites
└── docker-compose.yml       # Production-ready local container orchestration
```

---

## Contact

For queries, reach out to **Vikas Boura** at [contact@vikasboura.dev](mailto:contact@vikasboura.dev) or connect via [LinkedIn](https://linkedin.com/in/vikas-boura).
