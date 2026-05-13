document.addEventListener("DOMContentLoaded", () => {

  chrome.storage.local.get(["researchNotes"], (result) => {
    if (result.researchNotes) {
      document.getElementById("notes").value = result.researchNotes;
    }
  });


  chrome.storage.local.get(["theme"], (result) => {
    if (result.theme === "dark") {
      document.body.classList.add("dark-theme");
      document.getElementById("themeToggleBtn").textContent = "Light";
    } else {
      document.getElementById("themeToggleBtn").textContent = "Dark";
    }
  });


  document.getElementById("summarizedBtn").addEventListener("click", () => {
    summarizeText();
  });

  document.getElementById("suggestBtn").addEventListener("click", () => {
    suggestResearchTopics();
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
    clearResponse();
  });

  document.getElementById("saveNotesBtn").addEventListener("click", () => {
    saveNotes();
  });

  document.getElementById("downloadNotesBtn").addEventListener("click", () => {
    downloadNotes();
  });

  document.getElementById("clearNotesBtn").addEventListener("click", () => {
    clearNotes();
  });

  document.getElementById("themeToggleBtn").addEventListener("click", () => {
    toggleTheme();
  });
});

function toggleTheme() {
  const isDarkTheme = document.body.classList.toggle("dark-theme");
  const themeBtn = document.getElementById("themeToggleBtn");

  if (isDarkTheme) {
    themeBtn.textContent = "Light";
    chrome.storage.local.set({ theme: "dark" });
  } else {
    themeBtn.textContent = "Dark";
    chrome.storage.local.set({ theme: "light" });
  }
}

async function saveNotes() {
  const notes = document.getElementById("notes").value;

  try {
    await chrome.storage.local.set({
      researchNotes: notes,
    });

    alert("Notes saved successfully!");
  } catch (error) {
    alert(`Error saving notes: ${error.message}`);
  }
}

async function clearNotes() {
  try {
    await chrome.storage.local.remove(["researchNotes"]);
    document.getElementById("notes").value = "";
    alert("Notes cleared successfully!");
  } catch (error) {
    alert(`Error clearing notes: ${error.message}`);
  }
}

function downloadNotes() {
  const notes = document.getElementById("notes").value;

  if (!notes.trim()) {
    alert("No notes to download. Please add some notes first.");
    return;
  }

  try {
    const element = document.createElement("a");
    const file = new Blob([notes], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `research-notes-${new Date().getTime()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
    alert("Notes downloaded successfully!");
  } catch (error) {
    alert(`Error downloading notes: ${error.message}`);
  }
}

async function summarizeText() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },

      function: () => window.getSelection().toString(),
    });

    if (!result) {
      showResult("No text selected. Please select text to summarize.");
      return;
    }

    showLoading("Summarizing...");
    const response = await fetch("http://localhost:8080/api/research/process", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        content: result,
        operation: "summarize",
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const text = await response.text();

    showResult(text.replace(/\n/g, "<br>"));
  } catch (error) {
    showResult(`Error: ${error.message}`);
  }
}

async function suggestResearchTopics() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },

      function: () => window.getSelection().toString(),
    });

    if (!result) {
      showResult(
        "No text selected. Please select text to suggest research topics.",
      );
      return;
    }

    showLoading("Finding research topics...");
    const response = await fetch("http://localhost:8080/api/research/process", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        content: result,
        operation: "suggest",
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const text = await response.text();

    showResult(text.replace(/\n/g, "<br>"));
  } catch (error) {
    showResult(`Error: ${error.message}`);
  }
}

function clearResponse() {
  const results = document.getElementById("results");
  results.classList.remove("loading");
  results.innerHTML = "";
}

function showLoading(message) {
  const results = document.getElementById("results");
  results.classList.add("loading");
  results.innerHTML = `<div class="loading-state">${message}<span class="loading-dots"><span></span><span></span><span></span></span></div>`;
}

function stopLoading() {
  document.getElementById("results").classList.remove("loading");
}

function showResult(content) {
  stopLoading();
  document.getElementById("results").innerHTML = `<div class="result-item">
            <div class="result-content">
                ${content}
            </div>
        </div>`;
}
