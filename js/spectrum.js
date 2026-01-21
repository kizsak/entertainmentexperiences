// 1) Put your CSV somewhere public (GitHub raw, published link, etc.)
const CSV_URL = "CSV_URL_HERE";

// Column names expected in your CSV (from your Notion import):
// Experience, Category, Medium, Immersion Type, Hedonic–Eudaimonic Score (0–100), Description, Link

function parseCSV(text) {
  // Simple CSV parser that handles quoted commas
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') { // escaped quote
      cur += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      row.push(cur);
      cur = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (cur.length || row.length) {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      }
    } else {
      cur += ch;
    }
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter(r => r.some(cell => cell.trim() !== ""));
}

function toNum(x) {
  // tolerate blanks and "85 " or "85.0"
  const n = Number(String(x).trim());
  return Number.isFinite(n) ? n : 0;
}

function render(items) {
  const ul = document.getElementById("lijst");
  ul.innerHTML = "";

  // sort by score so the scroll direction corresponds to the spectrum
  items.sort((a, b) => a.score - b.score);

  for (const it of items) {
    const li = document.createElement("li");
    li.className = "element";

    const safeLink = it.link && it.link.startsWith("http") ? it.link : "";

    li.innerHTML = `
      <div class="topline">
        <div class="title">${it.experience}</div>
        <div class="score">${it.score}/100</div>
      </div>

      <div class="meta">
        <div><strong>${it.category}</strong> · ${it.medium}</div>
        <div>${it.immersion}</div>
      </div>

      <div class="miniBar" aria-label="Hedonic to Eudaimonic bar">
        <div style="width:${it.score}%;"></div>
      </div>

      <p class="desc">${it.description}</p>

      <details>
        <summary>Details</summary>
        ${safeLink ? `<p><a href="${safeLink}" target="_blank" rel="noopener">Open link</a></p>` : ""}
      </details>
    `;

    ul.appendChild(li);
  }
}

async function loadFromURL() {
  const res = await fetch(CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch CSV (${res.status})`);
  const text = await res.text();

  const rows = parseCSV(text);
  const header = rows[0].map(h => h.trim());
  const idx = (name) => header.indexOf(name);

  const items = rows.slice(1).map(r => ({
    experience: r[idx("Experience")]?.trim() || "",
    category: r[idx("Category")]?.trim() || "",
    medium: r[idx("Medium")]?.trim() || "",
    immersion: r[idx("Immersion Type")]?.trim() || "",
    score: toNum(r[idx("Hedonic–Eudaimonic Score (0–100)")] || 0),
    description: r[idx("Description")]?.trim() || "",
    link: r[idx("Link")]?.trim() || ""
  })).filter(x => x.experience);

  render(items);
}

function scrollByOneCard(direction) {
  const container = document.getElementById("container");
  const card = container.querySelector(".element");
  if (!card) return;
  const gap = 12;
  const amount = card.getBoundingClientRect().width + gap;
  container.scrollBy({ left: direction * amount, behavior: "smooth" });
}

document.getElementById("later").addEventListener("click", () => scrollByOneCard(-1));
document.getElementById("vroeger").addEventListener("click", () => scrollByOneCard(1));

// Kick off
loadFromURL().catch(err => {
  console.error(err);
  document.getElementById("lijst").innerHTML = `
    <li class="element">
      <div class="title">CSV Load Error</div>
      <p class="desc">
        This page couldn't fetch your CSV. Most common causes: a non-public link, CORS restrictions,
        or using a non-direct download URL.
      </p>
      <p class="desc"><strong>Error:</strong> ${err.message}</p>
      <p class="desc">If you want, I can help you make a correct GitHub Raw or Google Drive direct link.</p>
    </li>`;
});
