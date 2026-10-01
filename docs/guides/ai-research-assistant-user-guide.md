# ResearchOS — AI Research Assistant User Guide

> **Document Version:** 1.0  
> **Module:** 08 — AI Research Assistant (Cross-Cutting Subsystem)  
> **Target Audience:** Researchers, Supervisors (PIs), and System Administrators  
> **Active Model Engine:** Google Gemini (`gemini-3.5-flash-lite` inference + `gemini-embedding-001` 768-dim vector embeddings)  

---

## 1. Overview & Core Ethical Principles

The **ResearchOS AI Research Assistant** is an academic intelligence copilot integrated across the entire research lifecycle: literature review, hypothesis exploration, manuscript drafting, and lab supervision.

### Core Architectural Guarantees
1. **Human-in-the-Loop (No Silent Overwrites):** The AI cannot silently mutate your research data. Every suggestion (research gap, methodology, manuscript edit) is created in a `Pending` state with an interactive diff preview. You must explicitly click **Accept** or **Reject**.
2. **Academic Integrity & Transparency Badges:** Whenever an AI suggestion is accepted into a manuscript section, ResearchOS automatically flags `is_ai_assisted = true`. Transparent badges appear in the editor and PDF preview to ensure honest journal disclosures.
3. **Data Privacy & Ownership:** Your unpublished papers and raw experiment data are never shared across unauthorized project boundaries. System administrators cannot view confidential paper content via AI prompts.
4. **Token Quotas & Content Policy:** Every user has a transparent monthly token allowance visible in the sidebar, protected by an administrative prompt policy firewall that blocks prompt injection and academic misconduct.

---

## 2. Feature Matrix: Where, When, How & Purpose

| Feature | Where to Find It | When to Use It | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **Research AI Co-Pilot Hub** | Left Navigation Sidebar &gt; **Research AI Co-Pilot** *(Sparkles icon)* | At any time from anywhere in the app | Quick semantic search, token quota check, and quick-launch shortcuts. |
| **Semantic Literature Search** | `/literature` &gt; **Semantic Search** tab *(or in Co-Pilot Modal)* | When keyword search fails to find conceptually related papers | Natural language discovery across paper abstracts and full-text vector embeddings. |
| **Paper Synthesis & Critique** | `/literature/:id` &gt; Smart Sidebar &gt; **AI Assist** tab &gt; **Synthesis** | When triaging a new paper or conducting literature review | Generate 1-paragraph summaries, comprehensive breakdowns, or scholarly peer critiques. |
| **Structured Field Extraction** | `/literature/:id` &gt; Smart Sidebar &gt; **AI Assist** tab &gt; **Field Suggestions** | When building comparative literature matrices or related-work sections | Automatically extract Research Gap, Methodology, Limitations, and Future Work directly from the PDF. |
| **Manuscript Writing Assistant** | `/manuscripts/:id` &gt; Highlight text &gt; **Floating AI Toolbar** | During drafting, editing, or responding to peer reviewer comments | Paraphrase for academic tone, fix grammar/syntax, or scaffold section outlines with side-by-side diff previews. |
| **Supervisor Progress Synthesis** | `/dashboard` *(Supervisor role)* &gt; Project Overview &gt; **Progress Reports** | Before weekly lab meetings or grant reporting deadlines | Synthesize student task velocity, experiment runs, and draft sections into an executive digest. |
| **AI Governance & Quota Control** | `/admin` *(Admin role)* &gt; **AI Settings** tab | When managing institutional LLM budgets or content rules | Update model providers, configure role token limits, enforce blocked prompt policies, and view cost analytics. |

---

## 3. Step-by-Step Usage Guide

### 3.1. Research AI Co-Pilot Hub (Global Access)
* **Where:** Click **Research AI Co-Pilot** (with the glowing sparkle icon) in the bottom-left navigation sidebar.
* **When:** Use this as your command center to check token allowances or search literature on the fly without navigating away.
* **How:**
  1. Click **Research AI Co-Pilot** in the sidebar.
  2. Use the **Semantic Search** tab to enter natural language research queries (e.g., *"papers using self-supervised learning for genomics"*).
  3. Switch to the **AI Tools & Launchpad** tab to jump directly into Literature, Manuscripts, or Lab Dashboards.
  4. Switch to **Quota & Usage** to inspect your monthly token consumption and reset cycle.

---

### 3.2. Semantic Literature Search
* **Where:** Navigate to **Literature Discovery** (`/literature`) &gt; Click the **Semantic Search** tab.
* **When:** Use when standard title/keyword matching is too rigid to discover papers addressing related scientific concepts or methodologies.
* **How:**
  1. Type your conceptual inquiry into the prompt bar.  
     *Example:* *"Which papers evaluate transformer models on low-resource datasets?"*
  2. *(Optional)* Filter scope to **All My Accessible Papers** or select a specific project workspace.
  3. Click **Search with AI** (or select one of the suggested example queries).
  4. Results return ranked by cosine vector similarity (`<=>`) with matching percentage scores.
  5. Click **Open Paper** to jump directly to the paper reader.

---

### 3.3. Paper Synthesis & Structured Insights
* **Where:** Open any paper from your library (`/literature/:paperId`) &gt; In the right-hand **Smart Research Sidebar**, click the **AI Assist** tab.
* **When:** Use when reading unfamiliar literature to quickly grasp key takeaways, evaluate experimental rigor, or extract citations.
* **How:**
  1. **To Generate a Paper Summary:**
     * Select the **Synthesis** sub-tab.
     * Choose your desired depth:
       * **Quick:** 2–3 sentence executive summary of core contributions.
       * **Comprehensive:** Structured breakdown of background, technical methods, key results, and significance.
       * **Critique:** Balanced academic critique highlighting methodological assumptions and potential weaknesses.
     * Click **Generate Summary**. You can copy the generated markdown with one click.
  2. **To Extract Structured Metadata:**
     * Select the **Field Suggestions** sub-tab.
     * Click **Extract Structured Insights**.
     * Gemini reads the paper text and generates 4 distinct suggestion cards:
       * **Research Gap**
       * **Methodology**
       * **Limitations**
       * **Future Work**
     * Click **Accept** on any card to automatically populate the field in the paper's sidebar, or click **Reject** to dismiss it.

---

### 3.4. Manuscript Writing Assistant & Transparency Badge
* **Where:** Open any manuscript draft (`/manuscripts/:manuscriptId`).
* **When:** Use when drafting new sections, refining academic prose, improving clarity, or outlining technical methodology.
* **How:**
  1. **Inline Enhancement:**
     * Highlight any sentence or paragraph in the Markdown editor.
     * The floating AI action bar appears with three actions:
       * **Paraphrase:** Rewrites in rigorous, publication-ready academic tone.
       * **Improve Grammar:** Fixes grammatical inconsistencies and enhances syntactic flow while preserving meaning.
       * **Suggest Outline:** Outlines logical sub-headings and supporting arguments for the selected topic.
  2. **Diff Review & Acceptance:**
     * Clicking an action opens the **AI Writing Assistant Modal**.
     * Inspect the side-by-side diff: original text on the left, AI suggestion on the right with token cost indicators.
     * Click **Accept Suggestion** to apply changes.
  3. **Academic Transparency:**
     * Accepting an AI suggestion automatically tags the section with an **AI-Assisted** badge.
     * The live LaTeX / PDF preview updates to include transparent disclosure metadata.

---

### 3.5. Supervisor Progress Synthesis
* **Where:** Log in as **Supervisor** &gt; Open **Supervisor Dashboard** (`/dashboard`).
* **When:** Use at the end of each week or ahead of student 1-on-1 research advising meetings.
* **How:**
  1. Select a supervised research project from your lab portfolio.
  2. Click **Generate Weekly Progress Report**.
  3. The system scans student task velocity, newly logged experimental runs, and active manuscript section revisions over the selected time window.
  4. Gemini generates an executive digest summarizing student milestones, blockers, and upcoming publication deadlines.

---

### 3.6. Administrative AI Governance & Firewall
* **Where:** Log in as **Admin** &gt; Navigate to **Admin Console** (`/admin`) &gt; Click the **AI Settings** tab.
* **When:** Use when updating LLM provider keys, setting monthly research budgets, or monitoring platform token expenditures.
* **How:**
  1. **Provider Engine:** Inspect the active adapter (e.g., `Gemini` with `gemini-3.5-flash-lite`). Model names can be reconfigured dynamically without restarting the server.
  2. **Role Quotas:** Set monthly token limits for `Admin`, `Supervisor`, and `Researcher` roles. Users exceeding their quota automatically receive HTTP `429 Too Many Requests`.
  3. **Content Policies (Prompt Firewall):** Add blocked phrase rules (e.g., *"ignore all previous instructions"* or *"write my entire thesis"*). Blocked queries are immediately rejected with HTTP `400 Bad Request` without consuming any LLM tokens.
  4. **Usage Analytics:** Monitor system-wide token volume and estimated USD costs aggregated by feature.

---

## 4. Token Consumption & Best Practices

| Action | Estimated Tokens Used | Recommended Frequency |
| :--- | :--- | :--- |
| **Semantic Search Query** | ~50 – 100 tokens | As needed during literature discovery |
| **Quick Paper Summary** | ~400 – 600 tokens | Standard paper triaging |
| **Comprehensive Summary** | ~1,000 – 1,500 tokens | Deep reading of core benchmark papers |
| **Extract 4 Structured Fields** | ~800 – 1,200 tokens | Once per relevant library paper |
| **Paragraph Paraphrase / Grammar** | ~150 – 350 tokens | Iterative drafting & review refinement |
| **Supervisor Progress Synthesis** | ~1,200 – 2,000 tokens | Weekly lab synchronization |

### Tips to Maximize Efficiency:
* Monitor your remaining allowance via the live token progress gauge in the sidebar.
* Use **Quick Summary** first before generating a **Comprehensive Breakdown**.
* Once structured fields (Research Gap, Methodology) are accepted into a paper, they remain saved in your library permanently and do not need to be regenerated.
