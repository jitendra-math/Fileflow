<script>
  import { onMount } from 'svelte';

  let folderStructure = `src/
  components/
    Header.svelte
    Footer.svelte
  pages/
    Home.svelte
    About.svelte
  lib/
    api.js
    store.js
  App.svelte
  main.js`;
  let files = [];
  let loading = false;
  let error = '';
  let copyAllText = '📋 Copy All Prompts';

  // Replace with your actual Gemini API key (store in .env)
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  async function generateOrder() {
    if (!folderStructure.trim()) return;
    loading = true;
    error = '';
    files = [];

    const prompt = `Analyze the following folder structure and return ONLY the list of file paths in the logical order they should be generated. One file per line, no extra text, no numbering.

Rules:
- Utility files (helpers, api, store) should come first
- Then reusable components
- Then configuration files (App, main, index)
- Then pages (which depend on components and utils)
- Only include actual files (not folders)

Folder structure:
${folderStructure}`;

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
      // Split by lines and filter empty lines
      files = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('```'));
    } catch (err) {
      console.error(err);
      error = 'Gemini se order nahi mila. Phir se try karo.';
      // Fallback demo order
      files = [
        'src/lib/api.js',
        'src/lib/store.js',
        'src/components/Header.svelte',
        'src/components/Footer.svelte',
        'src/App.svelte',
        'src/main.js',
        'src/pages/Home.svelte',
        'src/pages/About.svelte'
      ];
    } finally {
      loading = false;
    }
  }

  function copyPrompt(file, event) {
    const btn = event.currentTarget;
    const prompt = `bhai ab ${file} de do`;
    navigator.clipboard.writeText(prompt);
    
    // Button feedback
    btn.classList.add('copied');
    btn.innerHTML = '✅';
    
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '📋';
    }, 2000);
  }

  function copyAll() {
    const allPrompts = files.map(f => `bhai ab ${f} de do`).join('\n');
    navigator.clipboard.writeText(allPrompts);
    
    // Temporary feedback
    copyAllText = '✅ Copied!';
    setTimeout(() => {
      copyAllText = '📋 Copy All Prompts';
    }, 2000);
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz@14..32&display=swap" rel="stylesheet">
</svelte:head>

<main>
  <div class="container">
    <header>
      <h1>⌘ FileFlow</h1>
      <p class="subtitle">AI files in perfect order — Apple grade</p>
    </header>

    <div class="card">
      <label for="structure">📁 Folder Structure</label>
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

    {#if files.length > 0}
      <div class="card files">
        <div class="files-header">
          <h2>📋 Files in order</h2>
          <button class="secondary" on:click={copyAll}>{copyAllText}</button>
        </div>
        
        <ul class="file-list">
          {#each files as file, index}
            <li class="file-item">
              <span class="file-path">
                <span class="index">{index + 1}.</span> {file}
              </span>
              <button
                class="copy-btn"
                on:click={(e) => copyPrompt(file, e)}
                aria-label="Copy prompt for {file}"
              >📋</button>
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
    align-items: center;
    justify-content: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    padding: 1.5rem;
  }

  .container {
    max-width: 800px;
    width: 100%;
  }

  header {
    text-align: center;
    margin-bottom: 2.5rem;
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

  label {
    display: block;
    font-weight: 500;
    color: #1d1d1f;
    margin-bottom: 0.8rem;
    font-size: 1rem;
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

  textarea:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05), inset 0 2px 4px rgba(0, 0, 0, 0.02);
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

  button.secondary:hover {
    background: rgba(255, 255, 255, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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
    padding: 0.8rem 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    animation: fadeIn 0.3s ease;
  }

  .file-item:last-child {
    border-bottom: none;
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
    background: #28a745;
    color: white;
    border-color: #28a745;
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