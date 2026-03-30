<script>
  import { onMount } from 'svelte';

  // State Variables
  let folderStructure = '';
  let aiContext = '';
  let files = [];
  let loading = false;
  let error = '';
  let copyAllText = '📋 Copy All Prompts';
  let copiedMasterText = '🧠 Copy Pro Master Prompt';
  let activeFileIndex = -1; // Tracks which file was last copied

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  // --- IndexedDB Setup ---
  const DB_NAME = 'FileFlowDB';
  const STORE_NAME = 'projectState';
  const STATE_KEY = 'currentState';

  async function getDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('IndexedDB error');
    });
  }

  async function saveState() {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ folderStructure, aiContext, files, activeFileIndex }, STATE_KEY);
    } catch (err) {
      console.error('Failed to save state', err);
    }
  }

  async function loadState() {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(STATE_KEY);
      
      request.onsuccess = () => {
        if (request.result) {
          folderStructure = request.result.folderStructure || '';
          aiContext = request.result.aiContext || '';
          files = request.result.files || [];
          activeFileIndex = request.result.activeFileIndex ?? -1;
        }
      };
    } catch (err) {
      console.error('Failed to load state', err);
    }
  }

  // Auto-save whenever these variables change
  $: if (folderStructure || aiContext || files.length || activeFileIndex > -2) {
    saveState();
  }

  onMount(() => {
    loadState();
  });

  // --- Core Functions ---
  async function generateOrder() {
    if (!folderStructure.trim()) return;
    loading = true;
    error = '';
    files = [];
    activeFileIndex = -1;

    const prompt = `Analyze the following folder structure and return ONLY the list of file paths in the logical order they should be generated. One file per line, no extra text, no numbering.\n\nRules:\n- Utility files (helpers, api, store) should come first\n- Then reusable components\n- Then configuration files (App, main, index)\n- Then pages (which depend on components and utils)\n- Only include actual files (not folders)\n\nFolder structure:\n${folderStructure}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );

      if (!response.ok) throw new Error('API call failed');

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      files = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('```'));
    } catch (err) {
      console.error(err);
      error = 'Gemini API failed. Check your key or internet.';
    } finally {
      loading = false;
      saveState();
    }
  }

  function copyMasterPrompt() {
    const prompt = `Act as an expert Software Architect. I am building a project with the following folder structure:\n\n${folderStructure}\n\nBefore we start writing code, analyze this structure and generate a comprehensive "Master Project Document". It must include:\n1. Core Architecture & Tech Stack assumptions.\n2. Global State Management & Data Flow rules.\n3. Styling & UI/UX Guidelines (Premium/Modern approach).\n4. Key constraints to remember.\n\nProvide this in detailed Markdown. Do not write any file code yet. Just give me the brief.`;
    
    navigator.clipboard.writeText(prompt);
    copiedMasterText = '✅ Pro Prompt Copied!';
    setTimeout(() => { copiedMasterText = '🧠 Copy Pro Master Prompt'; }, 3000);
  }

  function copyFilePrompt(file, index) {
    // The Ultimate Context-Aware Prompt
    const prompt = `Here is the Master Context of our project:\n\n---\n${aiContext || 'No context provided by user.'}\n---\n\nBased strictly on the above rules and context, generate the COMPLETE, production-ready code for this specific file: **${file}**\n\nRules for this generation:\n1. Ensure all imports match the folder structure exactly.\n2. Do not truncate code or use placeholders like "// logic here". Write the full logic.\n3. Keep the premium UI/UX standard in mind.\n4. Only output the code for this single file.`;
    
    navigator.clipboard.writeText(prompt);
    activeFileIndex = index; // This keeps the ✅ active until another is clicked
  }

  function clearProject() {
    if (confirm("Are you sure you want to clear the entire project? This cannot be undone.")) {
      folderStructure = '';
      aiContext = '';
      files = [];
      activeFileIndex = -1;
      error = '';
      saveState(); // Overwrites DB with empty state
    }
  }
</script>

<svelte:head>
  <link rel="preconnect" href="[https://fonts.googleapis.com](https://fonts.googleapis.com)">
  <link rel="preconnect" href="[https://fonts.gstatic.com](https://fonts.gstatic.com)" crossorigin>
  <link href="[https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap](https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap)" rel="stylesheet">
</svelte:head>

<main>
  <div class="container">
    <header>
      <h1>⌘ FileFlow</h1>
      <p class="subtitle">AI files in perfect order — Apple grade</p>
    </header>

    <div class="action-bar">
      <button class="danger" on:click={clearProject}>🗑️ Clear Project</button>
    </div>

    <div class="card">
      <div class="card-header">
        <label for="structure">📁 1. Folder Structure</label>
        <button class="secondary small" on:click={copyMasterPrompt}>{copiedMasterText}</button>
      </div>
      <textarea
        id="structure"
        bind:value={folderStructure}
        placeholder="Paste your folder structure here..."
      ></textarea>
      
      <button class="primary" on:click={generateOrder} disabled={loading || !folderStructure}>
        {loading ? '✨ Thinking...' : '🔍 Generate File Order'}
      </button>
    </div>

    {#if error}
      <div class="error">⚠️ {error}</div>
    {/if}

    <div class="card">
      <label for="aiContext">🧠 2. Paste AI Project Brief (Master Context)</label>
      <p class="helper-text">Paste the response you got from your AI here. This will be injected into every file prompt.</p>
      <textarea
        id="aiContext"
        class="context-area"
        bind:value={aiContext}
        placeholder="Paste the master context/architecture decisions here..."
      ></textarea>
    </div>

    {#if files.length > 0}
      <div class="card files">
        <div class="files-header">
          <h2>📋 3. Files to Generate</h2>
        </div>
        
        <ul class="file-list">
          {#each files as file, index}
            <li class="file-item {activeFileIndex === index ? 'active-row' : ''}">
              <span class="file-path">
                <span class="index">{index + 1}.</span> {file}
              </span>
              <button
                class="copy-btn {activeFileIndex === index ? 'copied' : ''}"
                on:click={() => copyFilePrompt(file, index)}
                aria-label="Copy pro prompt for {file}"
              >
                {activeFileIndex === index ? '✅' : '📋'}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <footer>
      <p>Made with 🫶 for AI developers</p>
    </footer>
  </div>
</main>

<style>
  /* Keeping your awesome premium styles and adding a few new ones */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  main {
    min-height: 100vh;
    background: linear-gradient(145deg, #f5f5f7 0%, #e8e8ed 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', -apple-system, sans-serif;
    padding: 3rem 1.5rem;
  }

  .container { max-width: 800px; width: 100%; }
  
  header { text-align: center; margin-bottom: 2rem; }
  
  h1 {
    font-size: 3rem; font-weight: 600; letter-spacing: -0.02em;
    background: linear-gradient(135deg, #1d1d1f, #434347);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  
  .subtitle { color: #6e6e73; font-size: 1.2rem; }

  .action-bar { display: flex; justify-content: flex-end; margin-bottom: 1rem; }

  .card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px);
    border-radius: 24px;
    padding: 2rem;
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.5);
    margin-bottom: 1.5rem;
  }

  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }

  label { font-weight: 500; color: #1d1d1f; font-size: 1rem; display: block; }
  
  .helper-text { font-size: 0.85rem; color: #8e8e93; margin-bottom: 1rem; }

  textarea {
    width: 100%; height: 150px; padding: 1.2rem;
    border-radius: 16px; background: rgba(255, 255, 255, 0.6);
    font-family: 'SF Mono', 'Inter', monospace; font-size: 0.9rem;
    color: #1d1d1f; border: 1px solid rgba(255, 255, 255, 0.8);
    margin-bottom: 1.5rem; resize: vertical; transition: all 0.2s ease;
  }
  
  .context-area { height: 100px; background: rgba(245, 245, 247, 0.8); }

  textarea:focus { outline: none; background: rgba(255, 255, 255, 0.9); border-color: #0071e3; }

  button { font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.2s ease; }
  
  button.primary {
    background: #0071e3; color: white; padding: 0.9rem; border-radius: 98px;
    width: 100%; font-weight: 500; border: none; font-size: 1rem;
  }
  button.primary:hover:not(:disabled) { background: #0077ed; transform: scale(1.01); }
  button.primary:disabled { opacity: 0.5; cursor: not-allowed; }

  button.secondary {
    background: white; border: 1px solid #d2d2d7; color: #1d1d1f;
    padding: 0.6rem 1.2rem; border-radius: 98px; font-weight: 500; font-size: 0.9rem;
  }
  button.secondary:hover { background: #f5f5f7; }

  button.danger {
    background: rgba(255, 59, 48, 0.1); color: #ff3b30; border: 1px solid rgba(255, 59, 48, 0.2);
    padding: 0.5rem 1rem; border-radius: 98px; font-size: 0.85rem; font-weight: 500;
  }
  button.danger:hover { background: rgba(255, 59, 48, 0.2); }

  .files-header h2 { font-size: 1.2rem; font-weight: 500; margin-bottom: 1rem; }

  .file-list { list-style: none; }

  .file-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.8rem 1rem; border-bottom: 1px solid rgba(0,0,0,0.05); border-radius: 12px;
  }
  .file-item.active-row { background: rgba(0, 113, 227, 0.05); border-color: transparent; }

  .file-path { font-family: 'SF Mono', monospace; font-size: 0.95rem; color: #1d1d1f; }
  .index { color: #8e8e93; margin-right: 0.5rem; }

  .copy-btn {
    background: white; border: 1px solid #d2d2d7; width: 40px; height: 40px;
    border-radius: 50%; font-size: 1.2rem; display: flex; align-items: center; justify-content: center;
  }
  .copy-btn:hover { transform: scale(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .copy-btn.copied { background: #34c759; color: white; border-color: #34c759; }

  .error { background: #ffe5e5; color: #d93025; padding: 1rem; border-radius: 12px; text-align: center; margin-bottom: 1.5rem; }
  footer { text-align: center; color: #8e8e93; font-size: 0.9rem; margin-top: 2rem; }
</style>
