// BiLang Play site: the language switch, the download links and install
// commands of the update file (updates/main.json, embedded by the Pages
// build), install and uninstall tabs, and the changelog.

const REPO = "uvlad7/BiLang-Play";
const RELEASES = `https://github.com/${REPO}/releases`;
const NEW_BUILD_REQUEST = `https://github.com/${REPO}/issues/new`;
const BUILD_REQUEST_EMAIL = "uvlad7@gmail.com";

const TEXT = {
  en: {
    systems: { windows: "Windows", macos: "macOS", linux: "Linux" },
    forSystem: (name) => `For <b>${name}</b>`,
    pickSystem: "Choose your system below.",
    noRelease: "No release is published yet.",
    allReleases: "All releases",
    version: (tag, date) => `Version ${tag}, ${date}`,
    preRelease: "pre-release",
    copy: "Copy",
    copied: "Copied",
    onGitHub: "Release on GitHub",
    locale: "en-GB",
  },
  ru: {
    systems: { windows: "Windows", macos: "macOS", linux: "Linux" },
    forSystem: (name) => `Для <b>${name}</b>`,
    pickSystem: "Выберите систему ниже.",
    noRelease: "Релизов пока нет.",
    allReleases: "Все релизы",
    version: (tag, date) => `Версия ${tag}, ${date}`,
    preRelease: "предварительная",
    copy: "Копировать",
    copied: "Скопировано",
    onGitHub: "Релиз на GitHub",
    locale: "ru-RU",
  },
};

// The update file's packages, by system; the first is the main one.
const KINDS = [
  { os: "windows", id: "windows-setup" },
  { os: "windows", id: "windows-zip" },
  { os: "macos", id: "macos-dmg" },
  { os: "macos", id: "macos-zip" },
  { os: "linux", id: "appimage" },
  { os: "linux", id: "deb" },
  { os: "linux", id: "linux-tar" },
];

const root = document.documentElement;
const SITE_LANGUAGES = ["en", "ru"];
const lang = () => (root.dataset.lang === "ru" ? "ru" : "en");
const t = () => TEXT[lang()];
const system = detectSystem();
const isMobileBrowser =
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  navigator.userAgentData?.mobile === true ||
  window.matchMedia("(pointer: coarse)").matches;
const siteData = window.BILANGPLAY_SITE_DATA;
// The newest version: its files and each channel's commands.
const updates = siteData?.updates ?? null;
// Every published version, newest first: its files and the channels it
// installs through.
const versions = siteData?.versions ?? [];
// The versions the download section offers: the update file's own when the
// list has none.
const downloadVersions = () => {
  const listed = versions.filter((entry) => entry.channels.includes("downloads"));
  return listed.length > 0 || !updates ? listed : [updates];
};
// The download section's version: the newest until the visitor picks one.
let pickedVersion = updates?.version ?? null;
const shownRelease = () =>
  downloadVersions().find((entry) => entry.version === pickedVersion) ?? updates;
// The versions before the newest that install through `channel`, newest first.
const olderVersions = (channel) =>
  versions.filter(
    (entry) => entry.channels.includes(channel) && entry.version !== updates?.version,
  );

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

function buildRequestUrl() {
  const params = new URLSearchParams({ template: "build-request.yml" });
  const detected = system ? t().systems[system] : "Unknown";
  params.set("title", `[Build request]: ${detected}`);
  params.set("system", `Browser reports: ${detected}`);
  params.set("browser-details", navigator.userAgent);
  const languages = navigator.languages?.join(", ") || navigator.language;
  if (languages) params.set("browser-language", languages);
  return `${NEW_BUILD_REQUEST}?${params}`;
}

function buildRequestEmailUrl() {
  const detected = system ? t().systems[system] : "Unknown";
  const languages = navigator.languages?.join(", ") || navigator.language || "Unknown";
  const body = [
    "Hello,",
    "",
    "I would like to request a BiLang Play build for another system.",
    "",
    `System: Browser reports: ${detected}`,
    "Processor architecture:",
    "How I would install and use it:",
    "",
    `Browser details: ${navigator.userAgent}`,
    `Browser language: ${languages}`,
  ].join("\n");
  const params = new URLSearchParams({ subject: `Build request: ${detected}`, body });
  return `mailto:${BUILD_REQUEST_EMAIL}?${params}`;
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

function filesOf(os, release = updates) {
  if (!release) return [];
  return KINDS.filter((kind) => kind.os === os)
    .map((kind) => ({ kind, file: release.files[kind.id] }))
    .filter((entry) => entry.file);
}

/** A version picker's options, the chosen one selected. */
function fillPicker(select, list, chosen) {
  select.replaceChildren(
    ...list.map((entry) => {
      const option = document.createElement("option");
      option.value = option.textContent = entry.version;
      option.selected = entry.version === chosen;
      return option;
    }),
  );
}

function button({ file }, main) {
  const link = document.createElement("a");
  link.className = main ? "button main" : "button";
  link.href = file.url;
  // The file's title as the update file gives it, in the shown language.
  const title = file.title[lang()] ?? file.title.en;
  link.innerHTML = `<span>${escapeHtml(title)}</span><small>${megabytes(file.size)}</small>`;
  return link;
}

function renderDownloads() {
  const text = t();
  const primaryOs = document.querySelector("[data-primary-os]");
  const buttons = document.querySelector("[data-primary-buttons]");
  const meta = document.querySelector("[data-primary-meta]");
  const picker = document.querySelector("[data-download-version]");
  const pickerLabel = document.querySelector("[data-release-picker]");
  const releaseRest = document.querySelector("[data-release-rest]");
  buttons.replaceChildren();
  primaryOs.innerHTML = system ? text.forSystem(text.systems[system]) : text.pickSystem;

  for (const card of document.querySelectorAll("[data-platform]")) {
    card.classList.toggle("detected", card.dataset.platform === system);
  }
  const all = `<a href="${RELEASES}">${text.allReleases}</a>`;
  if (!updates) {
    const message = text.noRelease;
    meta.innerHTML = `${message} ${all}`;
    picker.hidden = pickerLabel.hidden = true;
    releaseRest.innerHTML = meta.innerHTML;
    for (const list of document.querySelectorAll("[data-files]")) {
      list.innerHTML = `<li class="empty">${message}</li>`;
    }
    return;
  }

  const preRelease = (release) => (release.version.includes("-") ? ` · ${text.preRelease}` : "");
  meta.innerHTML = `${text.version(escapeHtml(updates.version), formatDate(updates.published))}${preRelease(updates)} · ${all}`;

  // The download section: "Version [picker], its date · pre-release · its
  // release", and that version's files.
  const shown = shownRelease();
  fillPicker(picker, downloadVersions(), shown.version);
  picker.hidden = pickerLabel.hidden = false;
  releaseRest.innerHTML = `, ${formatDate(shown.published)}${preRelease(shown)} · <a href="${escapeHtml(shown.release)}">${text.onGitHub}</a>`;

  if (system)
    filesOf(system).forEach((entry, index) => buttons.append(button(entry, index === 0)));

  for (const list of document.querySelectorAll("[data-files]")) {
    list.replaceChildren(
      ...filesOf(list.dataset.files, shown).map((entry, index) => {
        const item = document.createElement("li");
        item.append(button(entry, index === 0 && list.dataset.files === system));
        return item;
      }),
    );
  }

  const sources = shown.sources ?? [];
  const sourceLine = document.querySelector("[data-sources]");
  sourceLine.hidden = sources.length === 0;
  document.querySelector("[data-source-links]").innerHTML = sources
    .map((s) => `<a href="${escapeHtml(s.url)}">${escapeHtml(s.name)}</a>`)
    .join(", ");

}

// The install and uninstall tabs, as the update file gives them (the
// channels' update steps are the app's update notice too): each step's
// title, text, warning, commands, and a collapsed part. The version in
// commands and code is marked as the site always has.
function renderSteps() {
  const version = updates?.version;
  const markVersion = (html) =>
    version ? html.split(version).join(`<span class="ver">${version}</span>`) : html;
  const marked = (html) =>
    html.replace(/<code>(.*?)<\/code>/g, (_, code) => `<code>${markVersion(code)}</code>`);
  // The site's languages only; a text the file has in English alone shows
  // in English on the Russian page too, and the app's other languages stay
  // out.
  const own = (value) =>
    Object.fromEntries(
      SITE_LANGUAGES.map((language) => [language, value[language] ?? value.en]).filter(
        ([, lines]) => lines !== undefined,
      ),
    );
  const texts = (tag, value, className) =>
    Object.entries(typeof value === "string" ? { "": value } : own(value ?? {})).flatMap(
      ([language, lines]) =>
        [lines].flat().map((line) => {
          const node = document.createElement(tag);
          if (language) node.lang = language;
          if (className) node.className = className;
          node.innerHTML = marked(inline(line));
          return node;
        }),
    );
  const title = (value) => {
    const heading = document.createElement("h3");
    if (typeof value === "string") heading.textContent = value;
    else heading.append(...texts("span", value));
    return heading;
  };
  const commands = (value) =>
    Object.entries(Array.isArray(value) ? { "": value } : own(value)).map(([language, lines]) => {
      const pre = document.createElement("pre");
      if (language) pre.lang = language;
      const code = document.createElement("code");
      code.innerHTML = markVersion(escapeHtml(lines.join("\n")));
      pre.append(code, copyButton(pre));
      return pre;
    });
  // Every string of `steps` with `<version>` replaced by `version`.
  const withVersion = (value, version) =>
    typeof value === "string"
      ? value.replaceAll("<version>", version)
      : Array.isArray(value)
        ? value.map((item) => withVersion(item, version))
        : value && typeof value === "object"
          ? Object.fromEntries(
              Object.entries(value).map(([key, item]) => [key, withVersion(item, version)]),
            )
          : value;
  // A collapsed part for older versions of a channel: a version picker (the
  // version before the newest at first), and the steps for the picked one.
  // Nothing when no older version installs through the channel.
  const olderPart = (more) => {
    const older = olderVersions(more.versions);
    if (older.length === 0) return [];
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.append(...texts("span", more.summary));
    const pick = document.createElement("p");
    pick.className = "version-pick";
    const label = document.createElement("label");
    const select = document.createElement("select");
    select.className = "version-select";
    select.id = `older-${more.versions}`;
    label.htmlFor = select.id;
    label.append(...texts("span", { en: "Version", ru: "Версия" }));
    fillPicker(select, older, older[0].version);
    pick.append(label, " ", select);
    const body = document.createElement("div");
    const fill = () => body.replaceChildren(...render(withVersion(more.steps, select.value)));
    select.addEventListener("change", fill);
    fill();
    details.append(summary, pick, body);
    return [details];
  };
  const render = (steps) =>
    steps.flatMap((step) => {
      if (step.updates) return render(updates.channels[step.updates]?.update ?? []);
      const nodes = [
        ...(step.title ? [title(step.title)] : []),
        ...texts("p", step.text),
        ...texts("p", step.warning, "warning"),
        ...(step.commands ? commands(step.commands) : []),
      ];
      if (step.more?.versions) {
        nodes.push(...olderPart(step.more));
      } else if (step.more) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.append(...texts("span", step.more.summary));
        details.append(summary, ...render(step.more.steps));
        nodes.push(details);
      }
      return nodes;
    });
  for (const box of document.querySelectorAll("[data-steps]")) {
    const steps = box.dataset.steps.split(".").reduce((node, key) => node?.[key], updates);
    box.replaceChildren(...render(steps ?? []));
  }
  // The license's description, as the app shows it when the terms change.
  for (const box of document.querySelectorAll("[data-license]")) {
    box.replaceChildren(...texts("p", updates?.license?.text));
  }
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

// The screenshot gallery: one slide at a time; buttons, dots, the keyboard's
// arrow keys, and a swipe move it, and it loops at both ends.
function setupGallery() {
  const gallery = document.querySelector("[data-gallery]");
  if (!gallery) return;
  const track = gallery.querySelector("[data-gallery-track]");
  const slides = [...track.children];
  const dots = gallery.querySelector("[data-gallery-dots]");
  let lightboxDots;
  let current = 0;
  const show = (index) => {
    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(${-100 * current}%)`;
    slides.forEach((slide, i) => slide.setAttribute("aria-hidden", String(i !== current)));
    for (const group of [dots, lightboxDots]) {
      if (!group) continue;
      [...group.children].forEach((dot, i) => dot.setAttribute("aria-current", String(i === current)));
    }
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
  lightboxDots = lightbox.querySelector("[data-lightbox-dots]");
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
  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", String(i + 1));
    dot.addEventListener("click", () => {
      show(i);
      fill();
    });
    lightboxDots.append(dot);
  });
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

  // Capturing the pointer lets a swipe complete even when the finger leaves
  // the image. The same gesture works in the full-screen viewer.
  const installSwipe = (target, step, tap) => {
    let start = null;
    const clear = () => (start = null);
    target.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.target.closest("button")) return;
      start = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
        target: event.target,
      };
      target.setPointerCapture?.(event.pointerId);
    });
    target.addEventListener("pointerup", (event) => {
      if (!start || event.pointerId !== start.pointerId) return;
      const movedX = event.clientX - start.x;
      const movedY = event.clientY - start.y;
      const pressed = start;
      clear();
      target.releasePointerCapture?.(event.pointerId);
      if (Math.abs(movedX) > 32 && Math.abs(movedX) > Math.abs(movedY)) {
        step(movedX < 0 ? 1 : -1);
      } else if (Math.abs(movedX) < 8 && Math.abs(movedY) < 8) {
        // Pointer capture makes `event.target` the track on release, so use
        // the element that was actually pressed to keep desktop clicks live.
        tap?.({ target: pressed.target });
      }
    });
    target.addEventListener("pointercancel", clear);
  };
  installSwipe(track, (step) => show(current + step), (event) => {
    if (event.target.closest(".gallery-slide img")) open();
  });
  installSwipe(lightbox, (step) => {
    show(current + step);
    fill();
  });
  show(0);
}

// A copy button copies its command as shown, in the shown language.
function copyButton(pre) {
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
  return copy;
}

function setupBuildRequest() {
  const dialog = document.querySelector("[data-build-request-dialog]");
  const continueLink = document.querySelector("[data-build-request-continue]");
  for (const request of document.querySelectorAll(
    ".build-request-actions [data-build-request], .build-request-actions [data-build-request-email]",
  )) {
    request.addEventListener("click", (event) => {
      if (!isMobileBrowser) return;
      event.preventDefault();
      continueLink.href = request.href;
      dialog.showModal();
    });
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

function renderChangelog() {
  const box = document.querySelector("[data-changelog]");
  const which = lang();
  const changelog = siteData?.changelogs?.[which] ?? "";
  box.innerHTML = releases(changelog)
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
  for (const link of document.querySelectorAll("[data-build-request], [data-build-request-continue]")) {
    link.href = buildRequestUrl();
  }
  for (const link of document.querySelectorAll("[data-build-request-email]")) {
    link.href = buildRequestEmailUrl();
  }
}

for (const b of document.querySelectorAll("[data-set-lang]")) {
  b.addEventListener("click", () => setLanguage(b.dataset.setLang));
}
setupTabs();
setupGallery();
renderSteps();
setupBuildRequest();
document.querySelector("[data-download-version]").addEventListener("change", (event) => {
  pickedVersion = event.target.value;
  renderDownloads();
});
render();
