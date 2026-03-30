<script>
  import { onMount } from 'svelte';
  // Import DB functions from our new file
  import { saveState as saveToDB, loadState, clearState as clearDB } from './lib/db.js';

  let folderStructure = '';
  let aiContext = '';
  let files = [];
  let loading = false;
  let error = '';
  let copyAllText = '📋 Copy All Prompts';
  let copiedMasterText = '🧠 Copy Pro Master Prompt';
  let activeFileIndex = -1; // Track the last copied file
  let initialized = false; // To prevent auto-save before loading

  // Replace with your actual Gemini API key (store in .env)
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  onMount(async () => {
    // App start hote hi DB se purana state load karenge
    const saved = await loadState();
    if (saved) {
      folderStructure = saved.folderStructure || '';
      aiContext = saved.aiContext || '';
      files = saved.files || [];
      activeFileIndex = saved.activeFileIndex ?? -1;
    } else {
      // Agar first time hai, toh default example
      folderStructure = `src/\n  components/\n    Header.svelte\n    Footer.svelte\n  pages/\n    Home.svelte\n    About.svelte\n  lib/\n    api.js\n    store.js\n  App.svelte\n  main.js`;
    }
    initialized = true; // Data load hone ke baad auto-save on karenge
  });

  // Reactive auto-save: Jab bhi inme se koi variable change hoga, DB mein save ho jayega
  $: if (initialized) {
    saveToDB({ folderStructure, aiContext, files, activeFileIndex });
  }

  async function generateOrder() {
    if (!folderStructure.trim()) return;
    loading = true;
    error = '';
    files = [];
    activeFileIndex = -1; // Reset ticks on new generation

    const prompt = `Analyze the following folder structure and return ONLY the list of file paths in the logical order they should be generated. One file per line, no extra text, no numbering.\n\nRules:\n- Utility files (helpers, api, store) should come first\n- Then reusable components\n- Then configuration files (App, main, index)\n- Then pages (which depend on components and utils)\n- Only include actual files (not folders)\n\nFolder structure:\n${folderStructure}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      if (!response.ok) throw new Error('API call failed');

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      
      files = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('```'));
    } catch (err) {
      console.error(err);
      error = 'Gemini se order nahi mila. Phir se try karo.';
      // Fallback
      files = [
        'src/lib/api.js', 'src/lib/store.js', 'src/components/Header.svelte',
        'src/components/Footer.svelte', 'src/App.svelte', 'src/main.js',
        'src/pages/Home.svelte', 'src/pages/About.svelte'
      ];
    } finally {
      loading = false;
    }
  }

  function copyMasterPrompt() {
    const prompt = `Act as an expert Software Architect. I am building a project with the following folder structure:\n\n${folderStructure}\n\nBefore we start writing code, analyze this structure and generate a comprehensive "Master Project Document". It must include:\n1. Core Architecture & Tech Stack assumptions.\n2. Global State Management & Data Flow rules.\n3. Styling & UI/UX Guidelines (Premium/Modern approach).\n4. Key constraints to remember.\n\nProvide this in detailed Markdown. Do not write any file code yet. Just give me the brief.`;
    
    navigator.clipboard.writeText(prompt);
    copiedMasterText = '✅ Pro Prompt Copied!';
    setTimeout(() => { copiedMasterText = '🧠 Copy Pro Master Prompt'; }, 3000);
  }

  function copyFilePrompt(file, index) {
    // This is the ultimate prompt merging Context + Current File
    const prompt = `Here is the Master Context of our project:\n\n---\n${aiContext || 'No context provided yet.'}\n---\n\nBased strictly on the above rules and context, generate the COMPLETE code for this specific file: **${file}**\n\nRules for this generation:\n1. Ensure all imports match the folder structure exactly.\n2. Do not truncate code or use placeholders like "// logic here". Write the full logic.\n3. Keep the premium UI/UX standard in mind.\n4. Output ONLY the code for this single file, no extra chatting.`;
    
    navigator.clipboard.writeText(prompt);
    activeFileIndex = index; // Keep ✅ visible until another file is clicked
  }

  function copyAll() {
    const allPrompts = files.map(f => `bhai ab ${f} de do`).join('\n');
    navigator.clipboard.writeText(allPrompts);
    
    copyAllText = '✅ Copied!';
    setTimeout(() => { copyAllText = '📋 Copy All Prompts'; }, 2000);
  }

  async function clearProject() {
    if (confirm("Are you sure you want to clear the entire project? This will delete saved data.")) {
      folderStructure = '';
      aiContext = '';
      files = [];
      activeFileIndex = -1;
      error = '';
      await clearDB(); // Wipe from IndexedDB
    }
  }
</script>

<svelte:head>
  <link rel="preconnect" href="[https://fonts.googleapis.com](https://fonts.googleapis.com)">
  <link rel="preconnect" href="[https://fonts.gstatic.com](https://fonts.gstatic.com)" crossorigin>
  <link href="[https://fonts.googleapis.com/css2?family=Inter:opsz@14..32&display=swap](https://fonts.googleapis.com/css2?family=Inter:opsz@14..32&display=swap)" rel="stylesheet">
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
        <button class="secondary small" on:click={copyMasterPrompt} disabled={!folderStructure}>
          {copiedMasterText}
        </button>
      </div>
      <textarea
        id="structure"
        bind:value={folderStructure}
        placeholder="Paste your folder structure..."
      ></textarea>
      
      <button class="primary" on:click={generateOrder} disabled={loading}>
        {loading ? '✨ Thinking...' : '🔍 Generate Order'}
      </button>
    </div>

    {#if error}
      <div class="error">⚠️ {error}</div>
    {/if}

    <div class="card">
      <label for="aiContext">🧠 2. Paste AI Project Brief (Master Context)</label>
      <p class="helper-text">Paste the architecture/brief from AI here. This will be injected into every file prompt automatically.</p>
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
          <h2>📋 3. Files in order</h2>
          <button class="secondary" on:click={copyAll}>{copyAllText}</button>
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
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  main {
    min-height: 100vh;
    background: linear-gradient(145deg, #f5f5f7 0%, #e8e8ed 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    padding: 2.5rem 1.5rem;
  }

  .container {
    max-width: 800px;
    width: 100%;
  }

  header {
    text-align: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 3rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #1d1d1f, #434347);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #6e6e73;
    font-size: 1.2rem;
    font-weight: 400;
  }

  .action-bar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
  }

  .card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 32px;
    padding: 2rem;
    box-shadow: 
      0 20px 40px -10px rgba(0, 0, 0, 0.1),
      inset 0 1px 1px rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.5);
    margin-bottom: 2rem;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
  }

  label {
    display: block;
    font-weight: 600;
    color: #1d1d1f;
    font-size: 1.1rem;
  }

  .helper-text {
    font-size: 0.9rem;
    color: #8e8e93;
    margin-bottom: 1rem;
  }

  textarea {
    width: 100%;
    height: 180px;
    padding: 1.2rem;
    border: none;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(10px);
    font-family: 'SF Mono', 'Inter', monospace;
    font-size: 0.9rem;
    line-height: 1.6;
    color: #1d1d1f;
    resize: vertical;
    box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.02);
    transition: all 0.2s ease;
    margin-bottom: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.8);
  }

  .context-area {
    height: 120px;
    background: rgba(245, 245, 247, 0.7);
  }

  textarea:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05), inset 0 2px 4px rgba(0, 0, 0, 0.02);
    border-color: #0071e3;
  }

  button.primary {
    background: #0071e3;
    border: none;
    color: white;
    font-size: 1rem;
    font-weight: 500;
    padding: 0.9rem 2rem;
    border-radius: 980px;
    width: 100%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  button.primary:hover:not(:disabled) {
    background: #0077ed;
    transform: scale(1.02);
    box-shadow: 0 8px 20px rgba(0, 113, 227, 0.4);
  }

  button.primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  button.secondary {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(0, 0, 0, 0.05);
    color: #1d1d1f;
    font-size: 0.95rem;
    font-weight: 500;
    padding: 0.6rem 1.4rem;
    border-radius: 980px;
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;
  }

  button.secondary.small {
    padding: 0.4rem 1rem;
    font-size: 0.85rem;
  }

  button.secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  
  button.secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button.danger {
    background: rgba(255, 59, 48, 0.1);
    color: #ff3b30;
    border: 1px solid rgba(255, 59, 48, 0.2);
    padding: 0.5rem 1rem;
    border-radius: 980px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  button.danger:hover {
    background: rgba(255, 59, 48, 0.15);
  }

  .files-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.8rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  h2 {
    font-size: 1.4rem;
    font-weight: 500;
    color: #1d1d1f;
  }

  .file-list {
    list-style: none;
  }

  .file-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.8rem 1rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 12px;
    animation: fadeIn 0.3s ease;
    transition: all 0.2s ease;
  }

  .file-item:last-child {
    border-bottom: none;
  }

  .file-item.active-row {
    background: rgba(0, 113, 227, 0.05);
    border-color: transparent;
  }

  .file-path {
    font-family: 'SF Mono', 'Inter', monospace;
    font-size: 0.95rem;
    color: #1d1d1f;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .index {
    color: #8e8e93;
    font-weight: 400;
    min-width: 2rem;
  }

  .copy-btn {
    background: rgba(255, 255, 255, 0.8);
    border: none;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    font-size: 1.3rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    transition: all 0.15s ease;
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  }

  .copy-btn:hover {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.08);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  .copy-btn.copied {
    background: #34c759;
    color: white;
    border-color: #34c759;
  }

  .error {
    background: rgba(255, 69, 58, 0.1);
    backdrop-filter: blur(10px);
    color: #ff3b30;
    padding: 1rem 1.8rem;
    border-radius: 980px;
    text-align: center;
    margin-bottom: 2rem;
    border: 1px solid rgba(255, 69, 58, 0.2);
  }

  footer {
    text-align: center;
    color: #8e8e93;
    font-size: 0.9rem;
    margin-top: 2rem;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
