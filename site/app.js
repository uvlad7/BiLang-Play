// BiLang Play site: the language switch, the download for this system from
// the newest published release, install and uninstall tabs, and the
// changelog rendered from CHANGELOG.md / CHANGELOG.ru.md.

const REPO = "uvlad7/BiLang-Play";
const RELEASES = `https://github.com/${REPO}/releases`;

const TEXT = {
  en: {
    systems: { windows: "Windows", macos: "macOS", linux: "Linux" },
    forSystem: (name) => `For <b>${name}</b>`,
    pickSystem: "Choose your system below.",
    noRelease: "No release is published yet.",
    failed: "Could not load the releases.",
    allReleases: "All releases",
    version: (tag, date) => `Version ${tag}, ${date}`,
    preRelease: "pre-release",
    copy: "Copy",
    copied: "Copied",
    kinds: {
      "win-setup": "Installer (.exe)",
      "win-zip": "Portable (.zip)",
      "mac-dmg": "Disk image (.dmg)",
      "mac-zip": "Zip",
      appimage: "AppImage",
      deb: ".deb (Debian, Ubuntu)",
      tar: ".tar.gz",
    },
    changelogFailed: "Could not load the changelog.",
    onGitHub: "Release on GitHub",
    locale: "en-GB",
  },
  ru: {
    systems: { windows: "Windows", macos: "macOS", linux: "Linux" },
    forSystem: (name) => `Для <b>${name}</b>`,
    pickSystem: "Выберите систему ниже.",
    noRelease: "Релизов пока нет.",
    failed: "Не удалось загрузить релизы.",
    allReleases: "Все релизы",
    version: (tag, date) => `Версия ${tag}, ${date}`,
    preRelease: "предварительная",
    copy: "Копировать",
    copied: "Скопировано",
    kinds: {
      "win-setup": "Установщик (.exe)",
      "win-zip": "Портативная (.zip)",
      "mac-dmg": "Образ диска (.dmg)",
      "mac-zip": "Zip",
      appimage: "AppImage",
      deb: ".deb (Debian, Ubuntu)",
      tar: ".tar.gz",
    },
    changelogFailed: "Не удалось загрузить историю изменений.",
    onGitHub: "Релиз на GitHub",
    locale: "ru-RU",
  },
};

// The packages `npm run dist` names, by system; the first is the main one.
const KINDS = [
  { os: "windows", id: "win-setup", match: /-windows-x64-setup\.exe$/ },
  { os: "windows", id: "win-zip", match: /-windows-x64\.zip$/ },
  { os: "macos", id: "mac-dmg", match: /-macos-arm64\.dmg$/ },
  { os: "macos", id: "mac-zip", match: /-macos-arm64\.zip$/ },
  { os: "linux", id: "appimage", match: /\.AppImage$/ },
  { os: "linux", id: "deb", match: /\.deb$/ },
  { os: "linux", id: "tar", match: /-linux-x64\.tar\.gz$/ },
];
const SOURCES = [/^ffmpeg-.*\.tar\.xz$/, /^opus-.*\.tar\.gz$/, /^build-ffmpeg\.mjs$/];

const root = document.documentElement;
const lang = () => (root.dataset.lang === "ru" ? "ru" : "en");
const t = () => TEXT[lang()];
const system = detectSystem();
let release; // undefined: loading; null: none or failed
let releaseError = false;

function detectSystem() {
  const ua = navigator.userAgent;
  const platform = (navigator.userAgentData?.platform || navigator.platform || "").toLowerCase();
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return null;
  // iPadOS reports a Mac; a Mac has no touch screen.
  if (/mac/.test(platform) && navigator.maxTouchPoints > 1) return null;
  if (/win/.test(platform) || /Windows/.test(ua)) return "windows";
  if (/mac/.test(platform) || /Mac OS X/.test(ua)) return "macos";
  if (/linux|x11/.test(platform) || /Linux|X11/.test(ua)) return "linux";
  return null;
}

function escapeHtml(text) {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(0)} MB`;
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(t().locale, { year: "numeric", month: "long", day: "numeric" });

function assetsOf(os) {
  if (!release) return [];
  return KINDS.filter((kind) => kind.os === os)
    .map((kind) => ({ kind, asset: release.assets.find((a) => kind.match.test(a.name)) }))
    .filter((entry) => entry.asset);
}

function button({ kind, asset }, main) {
  const link = document.createElement("a");
  link.className = main ? "button main" : "button";
  link.href = asset.browser_download_url;
  link.innerHTML = `<span>${escapeHtml(t().kinds[kind.id])}</span><small>${megabytes(asset.size)}</small>`;
  return link;
}

function renderDownloads() {
  const text = t();
  const primaryOs = document.querySelector("[data-primary-os]");
  const buttons = document.querySelector("[data-primary-buttons]");
  const meta = document.querySelector("[data-primary-meta]");
  const releaseMeta = document.querySelector("[data-release-meta]");
  buttons.replaceChildren();
  primaryOs.innerHTML = system ? text.forSystem(text.systems[system]) : text.pickSystem;

  for (const card of document.querySelectorAll("[data-platform]")) {
    card.classList.toggle("detected", card.dataset.platform === system);
  }
  if (release === undefined) return;

  const all = `<a href="${RELEASES}">${text.allReleases}</a>`;
  if (!release) {
    const message = releaseError ? text.failed : text.noRelease;
    meta.innerHTML = `${message} ${all}`;
    releaseMeta.innerHTML = meta.innerHTML;
    for (const list of document.querySelectorAll("[data-files]")) {
      list.innerHTML = `<li class="empty">${message}</li>`;
    }
    return;
  }

  const tag = escapeHtml(release.tag_name);
  const version = `${text.version(tag, formatDate(release.published_at))}${
    release.prerelease ? ` · ${text.preRelease}` : ""
  }`;
  meta.innerHTML = `${version} · ${all}`;
  releaseMeta.innerHTML = `${version} · <a href="${escapeHtml(release.html_url)}">${text.onGitHub}</a>`;

  if (system)
    assetsOf(system).forEach((entry, index) => buttons.append(button(entry, index === 0)));

  for (const list of document.querySelectorAll("[data-files]")) {
    list.replaceChildren(
      ...assetsOf(list.dataset.files).map((entry, index) => {
        const item = document.createElement("li");
        item.append(button(entry, index === 0 && list.dataset.files === system));
        return item;
      }),
    );
  }

  const sources = release.assets.filter((a) => SOURCES.some((match) => match.test(a.name)));
  const sourceLine = document.querySelector("[data-sources]");
  sourceLine.hidden = sources.length === 0;
  document.querySelector("[data-source-links]").innerHTML = sources
    .map((a) => `<a href="${escapeHtml(a.browser_download_url)}">${escapeHtml(a.name)}</a>`)
    .join(", ");

  // The commands name the files of this release.
  const plain = release.tag_name.replace(/^v/, "");
  for (const node of document.querySelectorAll(".ver")) node.textContent = plain;
}

async function loadRelease() {
  const key = "bilangplay.site.release";
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || "null");
    if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.release;
  } catch {
    // No session storage: fetch every time.
  }
  // The newest published release, pre-releases included; /releases/latest
  // skips pre-releases, and every alpha is one.
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=20`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub API: ${response.status}`);
  const list = await response.json();
  const found = list.find((r) => !r.draft) || null;
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), release: found }));
  } catch {
    // Not cached.
  }
  return found;
}

// Tabs: the visitor's system first.
function setupTabs() {
  for (const tabs of document.querySelectorAll("[data-tabs]")) {
    const buttons = [...tabs.querySelectorAll("[data-tab]")];
    const select = (name) => {
      for (const b of buttons) b.setAttribute("aria-selected", String(b.dataset.tab === name));
      for (const panel of tabs.querySelectorAll("[data-panel]")) {
        panel.hidden = panel.dataset.panel !== name;
      }
    };
    for (const b of buttons) b.addEventListener("click", () => select(b.dataset.tab));
    select(system || "windows");
  }
}

// The screenshot gallery: one slide at a time; the arrows, the dots, the
// keyboard's arrow keys, and a swipe move it, and it loops at both ends.
function setupGallery() {
  const gallery = document.querySelector("[data-gallery]");
  if (!gallery) return;
  const track = gallery.querySelector("[data-gallery-track]");
  const slides = [...track.children];
  const dots = gallery.querySelector("[data-gallery-dots]");
  let current = 0;
  const show = (index) => {
    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(${-100 * current}%)`;
    slides.forEach((slide, i) => slide.setAttribute("aria-hidden", String(i !== current)));
    [...dots.children].forEach((dot, i) => dot.setAttribute("aria-current", String(i === current)));
  };
  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", String(i + 1));
    dot.addEventListener("click", () => show(i));
    dots.append(dot);
  });
  for (const arrow of gallery.querySelectorAll("[data-gallery-step]")) {
    arrow.addEventListener("click", () => show(current + Number(arrow.dataset.galleryStep)));
  }
  gallery.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(current - 1);
    else if (event.key === "ArrowRight") show(current + 1);
    else if (event.key === "Enter" && event.target === gallery) open();
    else return;
    event.preventDefault();
  });
  // The lightbox: the current slide at full size; its arrows move the
  // gallery too, so closing it leaves the gallery on the last one seen.
  const lightbox = document.querySelector("[data-lightbox]");
  const image = lightbox.querySelector("[data-lightbox-image]");
  const caption = lightbox.querySelector("[data-lightbox-caption]");
  const fill = () => {
    const slide = slides[current].querySelector("img");
    image.src = slide.currentSrc || slide.src;
    image.alt = slide.alt;
    caption.innerHTML = slides[current].querySelector("figcaption").innerHTML;
  };
  const open = () => {
    fill();
    lightbox.showModal();
    document.body.style.overflow = "hidden";
  };
  lightbox.addEventListener("close", () => (document.body.style.overflow = ""));
  for (const arrow of lightbox.querySelectorAll("[data-lightbox-step]")) {
    arrow.addEventListener("click", () => {
      show(current + Number(arrow.dataset.lightboxStep));
      fill();
    });
  }
  lightbox.querySelector("[data-lightbox-close]").addEventListener("click", () => lightbox.close());
  // A click outside the picture closes it; Esc does natively.
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox || event.target.classList.contains("lightbox-figure")) {
      lightbox.close();
    }
  });
  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(current - 1);
    else if (event.key === "ArrowRight") show(current + 1);
    else return;
    fill();
    event.preventDefault();
  });

  // A swipe changes the slide; a tap or click without one opens it.
  let startX = null;
  track.addEventListener("pointerdown", (event) => (startX = event.clientX));
  track.addEventListener("pointerup", (event) => {
    if (startX === null) return;
    const moved = event.clientX - startX;
    startX = null;
    if (Math.abs(moved) > 40) show(current + (moved < 0 ? 1 : -1));
    else if (Math.abs(moved) < 8 && event.target.closest(".gallery-slide img")) open();
  });
  show(0);
}

// Copy buttons copy the command as shown, in the shown language.
function setupCopy() {
  for (const pre of document.querySelectorAll("pre")) {
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "copy";
    copy.textContent = t().copy;
    copy.addEventListener("click", async () => {
      const code = pre.querySelector("code").cloneNode(true);
      code.querySelectorAll(`[lang]:not([lang="${lang()}"])`).forEach((n) => n.remove());
      try {
        await navigator.clipboard.writeText(code.textContent);
        copy.textContent = t().copied;
        setTimeout(() => (copy.textContent = t().copy), 1500);
      } catch {
        // The clipboard is unavailable; the text can still be selected.
      }
    });
    pre.append(copy);
  }
}

// The changelog's own small Markdown: `## [version] - date` sections with
// `###` headings, `-` lists (continued by indented lines), paragraphs, and
// inline code, bold, and links.
function inline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

function markdown(lines) {
  const out = [];
  let list = null;
  let paragraph = null;
  const flush = () => {
    if (paragraph) out.push(`<p>${inline(paragraph.join(" "))}</p>`);
    if (list) out.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
    paragraph = null;
    list = null;
  };
  for (const line of lines) {
    if (!line.trim()) {
      flush();
    } else if (line.startsWith("### ")) {
      flush();
      out.push(`<h4>${inline(line.slice(4))}</h4>`);
    } else if (line.startsWith("- ")) {
      if (paragraph) flush();
      list ??= [];
      list.push(line.slice(2));
    } else if (list && /^\s/.test(line)) {
      list[list.length - 1] += ` ${line.trim()}`;
    } else {
      if (list) flush();
      paragraph ??= [];
      paragraph.push(line.trim());
    }
  }
  flush();
  return out.join("");
}

function releases(text) {
  const sections = [];
  let current = null;
  for (const line of text.split("\n")) {
    const heading = /^## \[([^\]]+)\](?: - (\d{4}-\d{2}-\d{2}))?\s*$/.exec(line);
    if (heading) {
      current = { version: heading[1], date: heading[2], lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return sections.filter((s) => s.version !== "Unreleased" && s.date);
}

const changelogs = {};
async function renderChangelog() {
  const box = document.querySelector("[data-changelog]");
  const which = lang();
  try {
    changelogs[which] ??= await fetch(which === "ru" ? "CHANGELOG.ru.md" : "CHANGELOG.md").then(
      (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.text();
      },
    );
  } catch {
    box.innerHTML = `<p class="small">${t().changelogFailed} <a href="https://github.com/${REPO}/blob/main/CHANGELOG.md">CHANGELOG.md</a></p>`;
    return;
  }
  if (which !== lang()) return;
  box.innerHTML = releases(changelogs[which])
    .map((r) => {
      const version = escapeHtml(r.version);
      const pre = r.version.includes("-") ? `<span class="pre">${t().preRelease}</span>` : "";
      return `<article class="card release" id="v${version}">
        <header>
          <h3>${version}</h3>${pre}
          <time datetime="${r.date}">${formatDate(`${r.date}T00:00:00`)}</time>
          <a class="gh" href="${RELEASES}/tag/v${version}">${t().onGitHub}</a>
        </header>
        ${markdown(r.lines)}
      </article>`;
    })
    .join("");
}

function setLanguage(next) {
  root.dataset.lang = next;
  root.lang = next;
  try {
    localStorage.setItem("bilangplay.site.lang", next);
  } catch {
    // Remembered for this page only.
  }
  render();
}

function render() {
  for (const b of document.querySelectorAll("[data-set-lang]")) {
    b.setAttribute("aria-pressed", String(b.dataset.setLang === lang()));
  }
  for (const copy of document.querySelectorAll("pre .copy")) copy.textContent = t().copy;
  renderDownloads();
  renderChangelog();
}

for (const b of document.querySelectorAll("[data-set-lang]")) {
  b.addEventListener("click", () => setLanguage(b.dataset.setLang));
}
setupTabs();
setupGallery();
setupCopy();
render();
loadRelease()
  .then((found) => {
    release = found;
  })
  .catch(() => {
    release = null;
    releaseError = true;
  })
  .finally(renderDownloads);
