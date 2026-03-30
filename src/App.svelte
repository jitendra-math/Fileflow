<script>
  import { onMount } from 'svelte';
  import { saveState as saveToDB, loadState, clearState as clearDB } from './lib/db.js';
  
  // Premium Lucide Icons
  import { 
    Command, FolderTree, BrainCircuit, Sparkles, 
    Copy, CheckCircle2, Trash2, FileCode2, CheckCheck
  } from 'lucide-svelte';

  let folderStructure = '';
  let aiContext = '';
  let files = [];
  let loading = false;
  let error = '';
  let copyAllCopied = false;
  let masterPromptCopied = false;
  let activeFileIndex = -1;
  let initialized = false;

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  onMount(async () => {
    const saved = await loadState();
    if (saved) {
      folderStructure = saved.folderStructure || '';
      aiContext = saved.aiContext || '';
      files = saved.files || [];
      activeFileIndex = saved.activeFileIndex ?? -1;
    } else {
      folderStructure = `src/\n  lib/\n    api.js\n  components/\n    ui/\n      Button.svelte\n  pages/\n    Home.svelte\n  App.svelte\n  main.js`;
    }
    initialized = true;
  });

  $: if (initialized) {
    saveToDB({ folderStructure, aiContext, files, activeFileIndex });
  }

  // --- POWERFUL AI PROMPTS ---

  const PROMPT_ORDER = `Analyze this folder structure. Return ONLY a valid list of actual file paths (no folders), ordered by their logical dependency tree (Utility/Config files FIRST -> Reusable Components SECOND -> Main/App files THIRD -> Pages LAST). 
CRITICAL: Output exactly one file path per line. No numbering, no bullets, no markdown formatting, no conversational text.
Structure:\n`;

  function getMasterPrompt() {
    return `SYSTEM DIRECTIVE: Act as a Principal Software Architect. I am developing a premium, mobile-first application with Apple-level UI/UX standards. 
Here is the project folder structure:
${folderStructure}

Generate a definitive "Master Architecture Document". This will serve as the absolute source of truth for the AI coding engine.
It MUST include:
1. Core Tech Stack & Build Configuration.
2. Global State Management & Data Flow Architecture.
3. Strict UI/UX Rules: Must enforce Apple-level design (Light theme, soft shadows, glassmorphism, fluid typography, mobile-first responsive design).
4. Code Quality Rules: DRY principles, modularity, and explicit import rules.

CRITICAL RULES FOR YOU:
- Output ONLY the Master Architecture Document in valid Markdown.
- DO NOT write any file code.
- ZERO conversational filler (No "Sure!", no "Here is the document").`;
  }

  function getFilePrompt(file) {
    return `SYSTEM DIRECTIVE: You are a strict, elite code-generation engine. 

--- MASTER ARCHITECTURE CONTEXT ---
${aiContext || 'No context provided. Use industry best practices for a premium application.'}
--- END CONTEXT ---

TASK: Generate the COMPLETE, production-ready code for the following file: **${file}**

STRICT CONSTRAINTS:
1. Write 100% of the logic. NEVER use placeholders like "// logic goes here" or "// remaining code".
2. Match all imports perfectly to the provided architecture.
3. Implement the premium UI/UX guidelines defined in the Master Context.
4. Output ONLY the raw code block. 
5. ZERO conversational text. NO greetings, NO explanations, NO follow-up questions. Just the code.`;
  }

  // --- ACTIONS ---

  async function generateOrder() {
    if (!folderStructure.trim()) return;
    loading = true;
    error = '';
    files = [];
    activeFileIndex = -1;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT_ORDER + folderStructure }] }] })
        }
      );

      if (!response.ok) throw new Error('API request failed.');

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      
      files = text.split('\n')
        .map(line => line.replace(/^[-\*\d\.\s]+/, '').trim()) // Strip accidental bullets/numbers
        .filter(line => line && !line.startsWith('```'));
    } catch (err) {
      console.error(err);
      error = 'Failed to fetch the sequence. Check your API key or network.';
    } finally {
      loading = false;
    }
  }

  function copyMasterPrompt() {
    navigator.clipboard.writeText(getMasterPrompt());
    masterPromptCopied = true;
    setTimeout(() => { masterPromptCopied = false; }, 3000);
  }

  function copyFilePrompt(file, index) {
    navigator.clipboard.writeText(getFilePrompt(file));
    activeFileIndex = index;
  }

  function copyAll() {
    const allPrompts = files.map(f => getFilePrompt(f)).join('\n\n---\n\n');
    navigator.clipboard.writeText(allPrompts);
    copyAllCopied = true;
    setTimeout(() => { copyAllCopied = false; }, 3000);
  }

  async function clearProject() {
    if (confirm("Clear this project? All context and files will be removed.")) {
      folderStructure = '';
      aiContext = '';
      files = [];
      activeFileIndex = -1;
      error = '';
      await clearDB();
    }
  }
</script>

<svelte:head>
  <link rel="preconnect" href="[https://fonts.googleapis.com](https://fonts.googleapis.com)">
  <link rel="preconnect" href="[https://fonts.gstatic.com](https://fonts.gstatic.com)" crossorigin>
  <link href="[https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap](https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap)" rel="stylesheet">
</svelte:head>

<main>
  <div class="app-container">
    <header class="app-header">
      <div class="logo-wrapper">
        <Command size={32} color="#1d1d1f" strokeWidth={2.5} />
      </div>
      <h1>FileFlow</h1>
      <p>Apple-Grade AI Sequencing</p>
    </header>

    <div class="toolbar">
      <button class="btn-ghost destructive" on:click={clearProject}>
        <Trash2 size={16} />
        <span>Clear Project</span>
      </button>
    </div>

    <section class="card">
      <div class="card-header">
        <div class="title-group">
          <FolderTree size={20} color="#0071e3" />
          <h2>1. Folder Structure</h2>
        </div>
        <button 
          class="btn-secondary small" 
          on:click={copyMasterPrompt} 
          disabled={!folderStructure}
        >
          {#if masterPromptCopied}
            <CheckCheck size={14} color="#34c759"/> <span class="text-green">Pro Prompt Copied</span>
          {:else}
            <BrainCircuit size={14} /> <span>Copy Pro Prompt</span>
          {/if}
        </button>
      </div>
      
      <textarea
        bind:value={folderStructure}
        placeholder="Paste your component tree here..."
        class="code-input"
        spellcheck="false"
      ></textarea>
      
      <button class="btn-primary w-full mt-4" on:click={generateOrder} disabled={loading || !folderStructure}>
        {#if loading}
          <Sparkles size={18} class="spin" /> <span>Thinking...</span>
        {:else}
          <Sparkles size={18} /> <span>Generate File Sequence</span>
        {/if}
      </button>
    </section>

    {#if error}
      <div class="alert-error">
        <p>{error}</p>
      </div>
    {/if}

    <section class="card">
      <div class="card-header">
        <div class="title-group">
          <BrainCircuit size={20} color="#0071e3" />
          <h2>2. Master Context</h2>
        </div>
      </div>
      <p class="helper-text">Paste the architecture brief generated by your AI here. This strict context acts as the brain for all file generations.</p>
      <textarea
        bind:value={aiContext}
        placeholder="Inject AI Master Context here..."
        class="code-input context-input"
        spellcheck="false"
      ></textarea>
    </section>

    {#if files.length > 0}
      <section class="card files-card">
        <div class="card-header">
          <div class="title-group">
            <FileCode2 size={20} color="#0071e3" />
            <h2>3. Generation Queue</h2>
          </div>
          <button class="btn-secondary small" on:click={copyAll}>
            {#if copyAllCopied}
              <CheckCheck size={14} color="#34c759" /> <span class="text-green">Copied All</span>
            {:else}
              <Copy size={14} /> <span>Copy All</span>
            {/if}
          </button>
        </div>
        
        <div class="file-list">
          {#each files as file, index}
            <div class="file-row {activeFileIndex === index ? 'active' : ''}">
              <div class="file-info">
                <span class="file-number">{index + 1}</span>
                <span class="file-name">{file}</span>
              </div>
              <button 
                class="btn-icon {activeFileIndex === index ? 'copied' : ''}" 
                on:click={() => copyFilePrompt(file, index)}
                aria-label="Copy prompt for {file}"
              >
                {#if activeFileIndex === index}
                  <CheckCircle2 size={18} color="#fff" />
                {:else}
                  <Copy size={18} color="#1d1d1f" />
                {/if}
              </button>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  </div>
</main>

<style>
  /* --- Apple-Grade Mobile-First CSS --- */
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #f5f5f7;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1d1d1f;
    -webkit-font-smoothing: antialiased;
  }

  main {
    min-height: 100vh;
    padding: 1rem; /* Mobile first minimal padding */
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .app-container {
    width: 100%;
    max-width: 700px; /* Optimal reading width */
    margin: 0 auto;
    padding-bottom: 3rem;
  }

  /* Typography & Header */
  .app-header {
    text-align: center;
    margin: 2rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .logo-wrapper {
    background: white;
    padding: 1rem;
    border-radius: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    margin-bottom: 0.5rem;
  }

  h1 {
    font-size: 2.2rem;
    font-weight: 700;
    letter-spacing: -0.04em;
    margin: 0;
    color: #1d1d1f;
  }

  .app-header p {
    font-size: 1rem;
    color: #86868b;
    margin: 0;
    font-weight: 500;
  }

  /* Toolbar */
  .toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
  }

  /* Cards */
  .card {
    background: #ffffff;
    border-radius: 24px;
    padding: 1.5rem; /* Mobile padding */
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.02);
  }

  .card-header {
    display: flex;
    flex-direction: column; /* Stack on mobile */
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.2rem;
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .helper-text {
    font-size: 0.9rem;
    color: #86868b;
    margin-bottom: 1rem;
    line-height: 1.4;
  }

  /* Inputs */
  .code-input {
    width: 100%;
    height: 160px;
    padding: 1rem;
    background: #f5f5f7;
    border: 2px solid transparent;
    border-radius: 16px;
    font-family: 'SF Mono', ui-monospace, Menlo, Monaco, monospace;
    font-size: 0.85rem;
    line-height: 1.6;
    color: #1d1d1f;
    resize: vertical;
    transition: all 0.2s ease;
  }

  .code-input:focus {
    outline: none;
    background: #ffffff;
    border-color: #0071e3;
    box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1);
  }

  .context-input {
    height: 120px;
  }

  /* Buttons */
  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
  }

  button:active {
    transform: scale(0.97);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .btn-primary {
    background: #0071e3;
    color: white;
    font-size: 1.05rem;
    font-weight: 600;
    padding: 1rem 1.5rem;
    border-radius: 980px;
    box-shadow: 0 4px 14px rgba(0, 113, 227, 0.3);
  }

  .btn-primary:hover:not(:disabled) {
    background: #0077ed;
    box-shadow: 0 6px 20px rgba(0, 113, 227, 0.4);
  }

  .w-full {
    width: 100%;
  }

  .mt-4 {
    margin-top: 1rem;
  }

  .btn-secondary {
    background: #f5f5f7;
    color: #1d1d1f;
    font-size: 0.9rem;
    font-weight: 500;
    padding: 0.6rem 1rem;
    border-radius: 980px;
    border: 1px solid rgba(0,0,0,0.05);
  }

  .btn-secondary:hover:not(:disabled) {
    background: #e8e8ed;
  }

  .btn-ghost {
    background: transparent;
    font-size: 0.9rem;
    font-weight: 500;
    padding: 0.5rem 0.8rem;
    border-radius: 980px;
  }

  .btn-ghost.destructive {
    color: #ff3b30;
  }

  .btn-ghost.destructive:hover {
    background: rgba(255, 59, 48, 0.1);
  }

  .text-green { color: #28a745; }

  /* File List */
  .files-card {
    padding: 1rem; /* tighter on mobile */
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .file-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.8rem 1rem;
    background: #fbfbfd;
    border-radius: 16px;
    border: 1px solid rgba(0,0,0,0.03);
    transition: all 0.2s ease;
  }

  .file-row:hover {
    background: #ffffff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  }

  .file-row.active {
    background: #f0f7ff;
    border-color: #cce3fd;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    overflow: hidden;
  }

  .file-number {
    font-size: 0.8rem;
    font-weight: 600;
    color: #86868b;
    background: #e8e8ed;
    min-width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  .file-row.active .file-number {
    background: #0071e3;
    color: white;
  }

  .file-name {
    font-family: 'SF Mono', monospace;
    font-size: 0.9rem;
    color: #1d1d1f;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .btn-icon {
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.08);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    flex-shrink: 0;
  }

  .btn-icon:hover {
    background: #f5f5f7;
    transform: scale(1.05);
  }

  .btn-icon.copied {
    background: #34c759;
    border-color: #34c759;
  }

  .alert-error {
    background: #fff0f0;
    border: 1px solid #ffdbdb;
    color: #d93025;
    padding: 1rem;
    border-radius: 16px;
    margin-bottom: 1.5rem;
    font-weight: 500;
    font-size: 0.95rem;
    text-align: center;
  }

  /* Spinner Animation */
  :global(.spin) {
    animation: spin 1.5s linear infinite;
  }

  @keyframes spin {
    100% { transform: rotate(360deg); }
  }

  /* --- Tablet & Desktop Overrides --- */
  @media (min-width: 640px) {
    main { padding: 3rem 1.5rem; }
    
    h1 { font-size: 3rem; }
    
    .card { padding: 2.5rem; }
    
    .card-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .files-card { padding: 2rem; }
  }
</style>
