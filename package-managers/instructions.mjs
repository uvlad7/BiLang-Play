// The install, update, and uninstall instructions: the one source of the
// site's Install and Uninstall tabs and of the app's update notice
// (`updates.mjs` writes them into the update file). The released app shows
// what the served file says, so a warning or a command can be changed for
// copies already out by changing it here.
//
// A step, shown in this order: `title`, `text` (one paragraph or a list),
// `warning`, `commands`, and `more`, a collapsed part with its own `summary`
// and steps. Texts are one string for every language or one per language
// (`en`, `ru`), in a small markup: **bold**, `code`, and [links](https://…).
// Commands are plain lines, the same in every language or one list per
// language. `elevated` marks commands that need an administrator shell.
// `{ updates: "<channel>" }` stands for that channel's update steps.
// A channel's `warning` is what its manager says each time it installs the
// app, the first time and at every update: the site shows it with the
// install steps, the app's update notice above the update steps.
// Placeholders: `{version}`, `{name:<kind>}`, and `{url:<kind>}` (`FILES`).
// A collapsed part with `versions: "<channel>"` is for older versions: the
// site puts a picker of the channel's versions before the newest in it
// (`versions.json`) and writes the picked one for `<version>` in its steps.
// Commands go in `commands`, never inline in a text.
//
// A system's install and uninstall steps are its methods, `{ method, title,
// steps }`, which the site shows as tabs, the first (the direct download)
// picked at first, with the same method ids in Install and Uninstall, so
// picking one picks both; and any steps after them, shown below the tabs for
// every method.

/** @param {string | string[]} en @param {string | string[]} ru */
/**
 * A text in English and Russian, and in any of the app's other interface
 * languages (`be`, `uk`, `de`, `fr`, `es`, `it`) once translated: the app
 * shows its interface language's, else English; the site shows only `en`
 * and `ru`.
 * @param {string | string[]} en
 * @param {string | string[]} ru
 * @param {Record<string, string | string[]>} [more]
 */
const t = (en, ru, more = {}) => ({ en, ru, ...more });

const TO_HOLD = {
  text: t(
    "**To keep this version when upgrading everything:**",
    "**Чтобы оставить эту версию при обновлении всего:**",
  ),
};

/** One way of installing, a tab under its system. @param {string} id @param {string | object} title @param {object[]} steps */
const method = (id, title, steps) => ({ method: id, title, steps });

/** A collapsed part. @param {object} summary @param {object[]} steps */
const collapsed = (summary, steps) => ({ more: { summary, steps } });

/** A channel's update steps, collapsed. @param {string} channel */
const updating = (channel) =>
  collapsed(t("To update to a newer version", "Обновление до новой версии"), [{ updates: channel }]);

/** Keeping the installed version through upgrades, collapsed. @param {object[]} hold */
const keeping = (hold) =>
  collapsed(
    t("To keep the installed version when upgrading everything", "Как оставить установленную версию при обновлении всего"),
    hold,
  );

const DOWNLOAD = t("Direct download", "Прямая загрузка");

/**
 * An administrator shell's commands, and, collapsed, the same through
 * Windows' own sudo or gsudo from a normal one.
 * @param {object} step
 */
function elevated(step) {
  const prefixed = (prefix) => step.commands.map((line) => `${prefix} ${line}`);
  return {
    ...step,
    elevated: true,
    more: {
      summary: t(
        "Not in an administrator shell? Use `sudo` or `gsudo`",
        "Терминал открыт без прав администратора? Используйте `sudo` или `gsudo`",
      ),
      steps: [
        {
          text: t(
            "Windows 11 24H2 and later have [`sudo`](https://learn.microsoft.com/en-us/windows/advanced-settings/sudo/): turn on **Settings › System › Advanced › Enable sudo** (by default it runs each command in a new window), then:",
            "В Windows 11 24H2 и новее есть [`sudo`](https://learn.microsoft.com/ru-ru/windows/advanced-settings/sudo/): включите **Параметры › Система › Дополнительно › Включить sudo** (по умолчанию он запускает каждую команду в новом окне), затем:",
          ),
          commands: prefixed("sudo"),
        },
        {
          text: t(
            "Or, on any version of Windows, with [`gsudo`](https://community.chocolatey.org/packages/gsudo):",
            "Или, в любой версии Windows, через [`gsudo`](https://community.chocolatey.org/packages/gsudo):",
          ),
          commands: prefixed("gsudo"),
        },
      ],
    },
  };
}

/**
 * The collapsed part under a package manager's install steps: installing an
 * older version, picked on the site from the versions that install through
 * `channel` (`versions.json`). Homebrew and Scoop take it from the tag of the
 * release in this repository, whose sources are the ones of that version (a
 * release's pull request carries them, and its commit is the tag);
 * Chocolatey's feed keeps every version.
 * @param {string} channel @param {object[]} steps
 */
function olderVersion(channel, steps) {
  return {
    more: {
      summary: t("Install an older version", "Установка старой версии"),
      versions: channel,
      steps,
    },
  };
}

/** Uninstalling another installed version first, with these commands. */
const uninstallFirst = (commands) => ({
  text: t(
    "If another version is installed, uninstall it first:",
    "Если установлена другая версия, сначала удалите её:",
  ),
  commands,
});

const BREW_TAP = 'git -C "$(brew --repository uvlad7/bilang-play)"';
const BREW_ADD_TAP = "brew tap uvlad7/bilang-play https://github.com/uvlad7/BiLang-Play";
/** @param {string} channel `brew-macos` or `brew-linux` */
const brewOlder = (channel) =>
  olderVersion(channel, [
    {
      text: t("If the tap is not added yet, add it first:", "Если tap ещё не добавлен, сначала добавьте его:"),
      commands: [BREW_ADD_TAP],
    },
    {
      // Homebrew replaces another installed version itself (tested with 7.0.13).
      // Without HOMEBREW_NO_AUTO_UPDATE its auto-update returns the tap to the
      // newest version first, and installs that.
      text: t(
        "The tap keeps each version's Cask at its tag. Check the tag out, install (this replaces another installed version), and return the tap to the newest version:",
        "Tap хранит Cask каждой версии на её теге. Переключитесь на тег, установите (это заменит другую установленную версию) и верните tap на новейшую версию:",
      ),
      commands: [
        `${BREW_TAP} fetch --tags`,
        `${BREW_TAP} checkout v<version>`,
        "HOMEBREW_NO_AUTO_UPDATE=1 brew install --cask uvlad7/bilang-play/bilang-play",
        `${BREW_TAP} checkout main`,
      ],
    },
    TO_HOLD,
    ...HOLD.brew,
  ]);

const SCOOP_BUCKET = '"$(if ($env:SCOOP) { $env:SCOOP } else { "$HOME\\scoop" })\\buckets\\bilang-play"';
const SCOOP_ADD_BUCKET = "scoop bucket add bilang-play https://github.com/uvlad7/BiLang-Play";
const SCOOP_OLDER = () =>
  olderVersion("scoop", [
    {
      text: t(
        "If the bucket is not added yet, add it first:",
        "Если bucket ещё не добавлен, сначала добавьте его:",
      ),
      commands: [SCOOP_ADD_BUCKET],
    },
    uninstallFirst(["scoop uninstall bilang-play"]),
    {
      text: t(
        "The bucket keeps each version's manifest at its tag. In PowerShell, check the tag out, install, and return the bucket to the newest version:",
        "Bucket хранит манифест каждой версии на её теге. В PowerShell переключитесь на тег, установите и верните bucket на новейшую версию:",
      ),
      commands: [
        `git -C ${SCOOP_BUCKET} fetch --tags`,
        `git -C ${SCOOP_BUCKET} checkout v<version>`,
        "scoop install bilang-play/bilang-play",
        `git -C ${SCOOP_BUCKET} checkout main`,
      ],
    },
    TO_HOLD,
    ...HOLD.scoop,
  ]);

const CHOCOLATEY_ADD_SOURCE =
  'choco source add --name bilangplay --source "https://uvlad7.github.io/BiLang-Play/chocolatey/v3/index.json"';
const CHOCOLATEY_OLDER = () =>
  olderVersion("chocolatey", [
    elevated({
      text: t(
        "If the source is not added yet, add it first, in an administrator shell:",
        "Если источник ещё не добавлен, сначала добавьте его в терминале администратора:",
      ),
      commands: [CHOCOLATEY_ADD_SOURCE],
    }),
    elevated({
      text: t(
        "The feed keeps every version. In an administrator shell, install this one; `--allow-downgrade` replaces a newer installed version:",
        "В источнике есть все версии. В терминале администратора установите эту; `--allow-downgrade` заменит более новую установленную версию:",
      ),
      commands: ["choco install bilangplay --version <version> --source bilangplay --pre --allow-downgrade -y"],
    }),
    TO_HOLD,
    ...HOLD.chocolatey,
  ]);

const BREW_INSTALL = [BREW_ADD_TAP, "brew install --cask uvlad7/bilang-play/bilang-play"];
const BREW_TIP = collapsed(t("If Homebrew shows an old version", "Если Homebrew показывает старую версию"), [
  {
    text: t(
      "Don't remove the tap and add it again; refresh it instead:",
      "Не удаляйте tap и не добавляйте его заново; обновите его:",
    ),
    commands: ["brew update --force"],
  },
  {
    text: t(
      "To apply a changed Cask at the same version:",
      "Чтобы применить изменённый Cask той же версии:",
    ),
    commands: ["brew reinstall --cask bilang-play"],
  },
]);

/**
 * Chromium's sandbox needs unprivileged user namespaces, which Ubuntu 24.04
 * and later allow only to programs with an AppArmor profile; without them it
 * falls back to the setuid `chrome-sandbox`, and when that is not setuid
 * either it exits: "The SUID sandbox helper binary was found, but is not
 * configured correctly…". That message names only the setuid fix. The
 * profile has the shape of the AppImage's (`--apparmor-profile`) and of the
 * ones Ubuntu ships for browsers: unconfined, plus `userns`, attached to the
 * executable's path, which `printf` fills in.
 * @param {string} name the profile's file and name
 * @param {string} path the executable's path, with `%s` for `value`
 * @param {string} value a shell expression for `%s`
 */
const apparmorProfile = (name, path, value) => [
  `printf 'abi <abi/4.0>,\\ninclude <tunables/global>\\n\\nprofile ${name} "${path}" flags=(unconfined) {\\n  userns,\\n\\n  include if exists <local/${name}>\\n}\\n' ${value} | sudo tee /etc/apparmor.d/${name} >/dev/null`,
  `sudo apparmor_parser -r /etc/apparmor.d/${name}`,
];
const SANDBOX_SUMMARY = t(
  "If it exits with a message about the SUID sandbox helper",
  "Если оно завершается с сообщением о SUID sandbox helper",
);
const SANDBOX_WHY = t(
  "Ubuntu 24.04 and later allow the sandbox the app relies on only to programs with an AppArmor profile, and the message names only the other fix, the setuid helper.",
  "Ubuntu 24.04 и новее разрешают песочницу, на которую опирается приложение, только программам с профилем AppArmor, а сообщение называет лишь другой способ — setuid-помощник.",
);

/** What each manager warns about, at the first install and every update. */
const WARNINGS = {
  "brew-macos": t(
    "Homebrew warns before it clears the quarantine mark from this unsigned preview.",
    "Homebrew предупреждает, прежде чем снять карантин с этой неподписанной предварительной версии.",
  ),
  scoop: t(
    "Scoop warns before it clears the download mark from its installed files.",
    "Scoop предупреждает, прежде чем снять метку о скачанном файле со своих установленных файлов.",
  ),
  chocolatey: t(
    "Chocolatey warns before it clears the download mark from the verified installer and the installed files.",
    "Chocolatey предупреждает, прежде чем снять метку о скачанном файле с проверенного установщика и установленных файлов.",
  ),
};

/**
 * Homebrew's update steps. `brew upgrade` fetches the tap first only when
 * Homebrew's auto-update is on and due, so the tap is always fetched here.
 */
function brewUpdate() {
  const upgrade = "brew upgrade --cask uvlad7/bilang-play/bilang-play";
  return [
    {
      text: t(
        "Fetch only this tap, then upgrade BiLang Play:",
        "Обновите только этот tap, затем BiLang Play:",
      ),
      commands: ['git -C "$(brew --repository uvlad7/bilang-play)" pull --ff-only', upgrade],
    },
    {
      text: t(
        "Or fetch the newest Homebrew and every tap's package lists (nothing installed is upgraded), then upgrade BiLang Play:",
        "Или обновите сам Homebrew и списки пакетов всех подключённых tap (установленное при этом не обновляется), затем BiLang Play:",
      ),
      commands: ["brew update", upgrade],
    },
  ];
}

/**
 * How each package manager keeps the installed version when the user
 * upgrades everything (none upgrades on its own): the update notice shows
 * it with a newer version under another license, the site with the install
 * steps.
 */
const HOLD = {
  brew: [
    {
      text: t(
        "Pin it (Homebrew 5.1.12 or later), so `brew upgrade` skips it:",
        "Закрепите BiLang Play (Homebrew 5.1.12 или новее), чтобы `brew upgrade` его пропускал:",
      ),
      commands: ["brew pin --cask bilang-play"],
    },
    { text: t("To unpin it later:", "Чтобы потом открепить его:"), commands: ["brew unpin --cask bilang-play"] },
  ],
  scoop: [
    {
      text: t(
        "Hold it, so `scoop update *` skips it:",
        "Заморозьте BiLang Play, чтобы `scoop update *` его пропускал:",
      ),
      commands: ["scoop hold bilang-play"],
    },
    { text: t("To stop holding it later:", "Чтобы потом снять заморозку:"), commands: ["scoop unhold bilang-play"] },
  ],
  chocolatey: [
    elevated({
      text: t(
        "Pin it, in an administrator shell, so `choco upgrade all` skips it:",
        "Закрепите BiLang Play в терминале администратора, чтобы `choco upgrade all` его пропускал:",
      ),
      commands: ["choco pin add -n bilangplay"],
    }),
    elevated({ text: t("To unpin it later:", "Чтобы потом открепить его:"), commands: ["choco pin remove -n bilangplay"] }),
  ],
};

/**
 * Each way of installing the app, as its update notice tells it: the new
 * version's files to `download` (kinds of `FILES`), and the `update` steps; a step
 * that is another way of doing the same says so, "Or …".
 */
export const CHANNELS = {
  // Homebrew on macOS and on Linux: the same commands; on macOS the cask
  // clears quarantine, and says so.
  "brew-macos": { warning: WARNINGS["brew-macos"], update: brewUpdate(), hold: HOLD.brew },
  "brew-linux": { update: brewUpdate(), hold: HOLD.brew },
  // `scoop update <app>` syncs the buckets only when Scoop itself is old.
  scoop: {
    warning: WARNINGS.scoop,
    update: [
      {
        text: t(
          "Fetch the newest Scoop and its buckets (nothing installed is upgraded), then upgrade BiLang Play:",
          "Обновите сам Scoop и его bucket (установленное при этом не обновляется), затем BiLang Play:",
        ),
        commands: ["scoop update", "scoop update bilang-play"],
      },
    ],
    hold: HOLD.scoop,
  },
  // Chocolatey keeps its packages in a folder shared by every user
  // (C:\ProgramData\chocolatey), which only an administrator may change.
  chocolatey: {
    warning: WARNINGS.chocolatey,
    update: [
      elevated({
        text: t(
          "In an administrator shell (Chocolatey keeps its packages in a folder shared by every user):",
          "В терминале администратора (Chocolatey хранит пакеты в общей для всех пользователей папке):",
        ),
        commands: ["choco upgrade bilangplay --source bilangplay --pre -y"],
      }),
    ],
    hold: HOLD.chocolatey,
  },
  // No APT repository: download, then install the file. /tmp is readable
  // by APT's sandbox user, so it does not warn.
  deb: {
    download: ["deb"],
    update: [
      {
        text: t(
          "Download the new package and install it (there is no APT repository, so `apt upgrade` does not see new versions):",
          "Скачайте новый пакет и установите его (репозитория APT нет, поэтому `apt upgrade` новых версий не видит):",
        ),
        commands: ["wget -O /tmp/bilangplay.deb {url:deb}", "sudo apt install /tmp/bilangplay.deb"],
      },
    ],
  },
  appimage: { download: ["appimage"] },
  "linux-tar": { download: ["linux-tar"] },
  nsis: { download: ["windows-setup"] },
  "windows-zip": { download: ["windows-zip"] },
  macos: {
    // A copy from the disk image and one from the zip are the same app.
    download: ["macos-dmg", "macos-zip"],
    update: [
      {
        text: t(
          "Replace the app in **Applications** with the new one, then remove its download mark:",
          "Замените приложение в **Программах** новым, затем снимите с него пометку о скачивании:",
        ),
        commands: ['xattr -dr com.apple.quarantine "/Applications/BiLang Play.app"'],
      },
    ],
  },
};

/** The site's Install tabs, by system: a tab for each way of installing. */
export const INSTALL = {
  windows: [
    method("download", DOWNLOAD, [
      {
        title: t("NSIS installer (.exe)", "Установщик NSIS (.exe)"),
        text: t(
          "Run `{name:windows-setup}`. It asks whether to install for you only (no administrator rights, by default into `%LOCALAPPDATA%\\Programs\\BiLang Play`) or for everyone on the computer (administrator rights, into `C:\\Program Files\\BiLang Play`), and adds Start menu and desktop shortcuts.",
          "Запустите `{name:windows-setup}`. Он спросит, ставить программу только для вас (без прав администратора, по умолчанию в `%LOCALAPPDATA%\\Programs\\BiLang Play`) или для всех пользователей компьютера (с правами администратора, в `C:\\Program Files\\BiLang Play`), и добавит ярлыки в меню «Пуск» и на рабочий стол.",
        ),
      },
      {
        title: t("Portable app (.zip)", "Портативное приложение (.zip)"),
        text: t(
          "Unzip it anywhere and run `BiLang Play.exe`. On first launch it offers to add itself to the Start menu and the desktop.",
          "Распакуйте куда угодно и запустите `BiLang Play.exe`. При первом запуске приложение предложит добавить себя в меню «Пуск» и на рабочий стол.",
        ),
      },
      collapsed(t("If Windows blocks it", "Если Windows блокирует запуск"), [
        {
          text: t(
            "Windows marks downloaded files, and unsigned apps then get “Windows protected your PC” (choose **More info**, then **Run anyway**) or “The publisher could not be verified” (choose **Run**). To remove the mark beforehand, right-click the downloaded file, choose **Properties**, tick **Unblock**, and choose **OK**; for the zip, do it before unzipping. Or in PowerShell:",
            "Windows помечает скачанные файлы, и для неподписанных программ показывает «Система Windows защитила ваш компьютер» (нажмите **Подробнее**, затем **Выполнить в любом случае**) или «Не удалось проверить издателя» (нажмите **Запустить**). Чтобы снять пометку заранее, щёлкните скачанный файл правой кнопкой, выберите **Свойства**, отметьте **Разблокировать** и нажмите **ОК**; zip — до распаковки. Или в PowerShell:",
          ),
        },
        {
          text: t("The downloaded installer:", "Скачанный установщик:"),
          commands: ['Unblock-File "$env:USERPROFILE\\Downloads\\{name:windows-setup}"'],
        },
        {
          text: t("The downloaded zip, before unzipping it:", "Скачанный zip, до распаковки:"),
          commands: ['Unblock-File "$env:USERPROFILE\\Downloads\\{name:windows-zip}"'],
        },
        {
          // The zip has the app's files at its root, so Explorer's Extract All
          // puts them in a folder named after it, next to it.
          text: t(
            "An unzipped folder, with every file in it (where **Extract All** puts it; change the path if you chose another):",
            "Распакованная папка со всеми файлами в ней (там, куда её кладёт **Извлечь все**; если вы выбрали другую, исправьте путь):",
          ),
          commands: ['Get-ChildItem -Recurse "$env:USERPROFILE\\Downloads\\bilangplay-{version}-windows-x64" | Unblock-File'],
        },
        {
          text: t(
            "Where Smart App Control (Windows 11) blocks unsigned apps, unblocking does not help; only turning Smart App Control off does.",
            "Если неподписанные программы блокирует «Интеллектуальное управление приложениями» (Smart App Control, Windows 11), разблокировка не помогает — только его отключение.",
          ),
        },
      ]),
    ]),
    method("scoop", "Scoop", [
      {
        text: t(
          "From BiLang Play's own bucket (it is not in Scoop's public buckets):",
          "Из собственного bucket BiLang Play (в публичных bucket Scoop его нет):",
        ),
        warning: WARNINGS.scoop,
        commands: [SCOOP_ADD_BUCKET, "scoop install bilang-play/bilang-play"],
      },
      updating("scoop"),
      keeping(HOLD.scoop),
      SCOOP_OLDER(),
    ]),
    method("chocolatey", "Chocolatey", [
      elevated({
        text: t(
          "In an administrator shell, from BiLang Play's own feed (it is not in the Chocolatey Community Repository):",
          "В терминале администратора, из собственного источника BiLang Play (в Chocolatey Community Repository его нет):",
        ),
        warning: WARNINGS.chocolatey,
        commands: [CHOCOLATEY_ADD_SOURCE, "choco install bilangplay --source bilangplay --pre -y"],
      }),
      updating("chocolatey"),
      keeping(HOLD.chocolatey),
      CHOCOLATEY_OLDER(),
    ]),
  ],
  macos: [
    method("download", DOWNLOAD, [
      {
        title: t("Disk image (.dmg)", "Образ диска (.dmg)"),
        text: t(
          "Open `{name:macos-dmg}` and drag **BiLang Play** onto **Applications**.",
          "Откройте `{name:macos-dmg}` и перетащите **BiLang Play** в **Программы** (Applications).",
        ),
      },
      {
        title: t("App (.app in .zip)", "Приложение (.app в .zip)"),
        text: t(
          "Unzip it and move **BiLang Play** to **Applications**. Started anywhere else, the app offers to move itself there.",
          "Распакуйте и переместите **BiLang Play** в **Программы**. Если запустить его из другого места, приложение само предложит туда переместиться.",
        ),
      },
      updating("macos"),
      collapsed(t("If macOS blocks it", "Если macOS блокирует запуск"), [
        {
          text: t(
            [
              "On first launch macOS says it cannot verify the app. Choose **Done**, open **System Settings › Privacy & Security**, scroll down to the message about BiLang Play, and choose **Open Anyway**.",
              "On macOS 14 and earlier you can instead Control-click (or right-click) **BiLang Play** in Finder, choose **Open**, then choose **Open** in the warning; macOS 15 removed that. Do either only when you trust the download: macOS remembers the approval for this copy of the app.",
              "Or remove the “downloaded from the internet” mark in Terminal:",
            ],
            [
              "При первом запуске macOS сообщает, что не может проверить приложение. Нажмите **Готово**, откройте **Системные настройки › Конфиденциальность и безопасность**, прокрутите до сообщения о BiLang Play и нажмите **Всё равно открыть**.",
              "В macOS 14 и старше вместо этого можно в Finder нажать Control и щёлкнуть (либо щёлкнуть правой кнопкой) по **BiLang Play**, выбрать **Открыть**, затем ещё раз **Открыть** в предупреждении; в macOS 15 этого способа нет. Делайте так, только если доверяете загрузке: macOS запомнит разрешение для этой копии приложения.",
              "Или снимите пометку «загружено из интернета» в Терминале:",
            ],
          ),
        },
        {
          text: t("The installed app:", "Установленное приложение:"),
          commands: ['xattr -dr com.apple.quarantine "/Applications/BiLang Play.app"'],
        },
        {
          text: t("Or the zip, before unzipping it:", "Или zip, до распаковки:"),
          commands: ["xattr -d com.apple.quarantine ~/Downloads/{name:macos-zip}"],
        },
      ]),
    ]),
    method("brew", "Homebrew", [
      {
        text: t(
          "From BiLang Play's own tap (it is not in Homebrew's own casks):",
          "Из собственного tap BiLang Play (среди casks самого Homebrew его нет):",
        ),
        warning: WARNINGS["brew-macos"],
        commands: BREW_INSTALL,
      },
      updating("brew-macos"),
      keeping(HOLD.brew),
      brewOlder("brew-macos"),
      BREW_TIP,
    ]),
  ],
  linux: [
    method("download", DOWNLOAD, [
      {
        title: t("App image (.AppImage)", "Образ приложения (.AppImage)"),
        text: t("Make it executable and run it:", "Сделайте файл исполняемым и запустите:"),
        commands: ["chmod +x {name:appimage}", "./{name:appimage}"],
      },
      {
        text: t(
          "Or in the file manager: **Properties › Permissions › Allow executing file as program**. It needs no `libfuse2`. On first launch it offers to add itself to the applications menu. On Ubuntu 24.04 and later the first launch shows one `sudo` command that installs an AppArmor profile for it, because Ubuntu restricts the sandbox the app relies on; run it, then start the app again.",
          "Или в файловом менеджере: **Свойства › Права › Разрешить выполнение файла как программы**. `libfuse2` не нужен. При первом запуске приложение предложит добавить себя в меню приложений. В Ubuntu 24.04 и новее первый запуск покажет одну команду с `sudo`, которая ставит для него профиль AppArmor: Ubuntu ограничивает песочницу, на которую опирается приложение. Выполните её и запустите приложение снова.",
        ),
      },
      {
        title: t("Debian/Ubuntu package (.deb)", "Пакет Debian/Ubuntu (.deb)"),
        text: t(
          "It adds BiLang Play to the applications menu, with its AppArmor profile:",
          "Он добавляет BiLang Play в меню приложений, вместе с его профилем AppArmor:",
        ),
        commands: ["sudo apt install ./{name:deb}"],
      },
      updating("deb"),
      {
        title: t("Portable app (.tar.gz)", "Портативное приложение (.tar.gz)"),
        text: t(
          "Unpack it anywhere and run `./bilangplay` in the folder. On first launch it offers to add itself to the applications menu.",
          "Распакуйте куда угодно и запустите `./bilangplay` в папке. При первом запуске приложение предложит добавить себя в меню приложений.",
        ),
      },
      collapsed(SANDBOX_SUMMARY, [
        {
          text: t(
            [
              SANDBOX_WHY.en,
              "From the app's folder, install a profile for it (moved elsewhere, it needs one for the new place):",
            ],
            [
              SANDBOX_WHY.ru,
              "Из папки приложения поставьте для него профиль (если папку переместить, понадобится профиль для нового места):",
            ],
          ),
          commands: apparmorProfile("bilangplay-portable", "%s/bilangplay", '"$PWD"'),
        },
        {
          text: t(
            "Or let the bundled helper run as root, from the app's folder:",
            "Или разрешите встроенному помощнику запускаться от root, из папки приложения:",
          ),
          commands: ["sudo chown root:root chrome-sandbox && sudo chmod 4755 chrome-sandbox"],
        },
      ]),
    ]),
    method("brew", "Homebrew", [
      {
        text: t(
          "From BiLang Play's own tap: the .tar.gz build, with a command, an applications-menu entry, and icons.",
          "Из собственного tap BiLang Play: сборка .tar.gz с командой, пунктом меню приложений и значками.",
        ),
        commands: BREW_INSTALL,
      },
      updating("brew-linux"),
      keeping(HOLD.brew),
      brewOlder("brew-linux"),
      BREW_TIP,
      collapsed(SANDBOX_SUMMARY, [
        {
          text: t(
            [
              SANDBOX_WHY.en,
              "Install a profile for the app, for this and every later version Homebrew installs:",
            ],
            [
              SANDBOX_WHY.ru,
              "Поставьте профиль для приложения, для этой и всех следующих версий, которые поставит Homebrew:",
            ],
          ),
          commands: apparmorProfile(
            "bilangplay-brew",
            "%s/Caskroom/bilang-play/*/bilangplay-*-linux-x64/bilangplay",
            '"$(brew --prefix)"',
          ),
        },
      ]),
    ]),
    collapsed(
      t(
        "If file pickers don't open in the last folder you used (Ubuntu 22.04 and other older desktops)",
        "Если окна выбора файлов не открываются в последней папке (Ubuntu 22.04 и другие старые системы)",
      ),
      [{ text: t("Install `zenity`:", "Поставьте `zenity`:"), commands: ["sudo apt install zenity"] }],
    ),
  ],
};

const BREW_UNINSTALL = [
  "brew uninstall --cask uvlad7/bilang-play/bilang-play",
  "brew untap uvlad7/bilang-play",
];

/** Removing an AppArmor profile installed for the app. @param {string} name */
const removeProfile = (name) => [
  `sudo apparmor_parser -R /etc/apparmor.d/${name}`,
  `sudo rm /etc/apparmor.d/${name}`,
];

const GSETTINGS_RESET = "reset-recursively io.github.uvlad7.bilangplay:/io/github/uvlad7/bilangplay/";

/** The site's Uninstall tabs, by system: the same tabs as Install, then app data. */
export const UNINSTALL = {
  windows: [
    method("download", DOWNLOAD, [
      {
        title: t("NSIS installer (.exe)", "Установщик NSIS (.exe)"),
        text: t(
          "**Settings › Apps › Installed apps › BiLang Play › Uninstall**, then delete the downloaded installer.",
          "**Параметры › Приложения › Установленные приложения › BiLang Play › Удалить**, затем удалите скачанный установщик.",
        ),
      },
      {
        title: t("Portable app (.zip)", "Портативное приложение (.zip)"),
        text: t(
          "Delete the unzipped folder and the downloaded zip. If you let it add its shortcuts, remove them too (before deleting the folder, the app's start screen also has **Remove from Start menu and desktop**):",
          "Удалите распакованную папку и скачанный zip. Если вы разрешили ему добавить ярлыки, удалите и их (пока папка не удалена, на стартовом экране приложения есть и кнопка **Remove from Start menu and desktop**):",
        ),
        commands: [
          'Remove-Item "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\BiLang Play.lnk"',
          "Remove-Item \"$([Environment]::GetFolderPath('Desktop'))\\BiLang Play.lnk\"",
        ],
      },
    ]),
    method("scoop", "Scoop", [
      {
        text: t("Remove the app, then its bucket:", "Удалите приложение, затем его bucket:"),
        commands: ["scoop uninstall bilang-play", "scoop bucket rm bilang-play"],
      },
    ]),
    method("chocolatey", "Chocolatey", [
      elevated({
        text: t(
          "In an administrator shell, remove the app (Chocolatey runs its uninstaller), then its source:",
          "В терминале администратора удалите приложение (Chocolatey запустит его деинсталлятор), затем его источник:",
        ),
        commands: ["choco uninstall bilangplay -y", "choco source remove --name bilangplay"],
      }),
    ]),
    {
      title: t("App data and settings, in PowerShell", "Данные и настройки, в PowerShell"),
      commands: [
        'Remove-Item -Recurse -Force "$env:APPDATA\\bilangplay"',
        'Remove-Item -Recurse -Force "HKCU:\\Software\\io.github.uvlad7.bilangplay"',
      ],
    },
  ],
  macos: [
    method("download", DOWNLOAD, [
      {
        text: t(
          "Move **BiLang Play** to the Trash from wherever you keep it (usually **Applications**), and the downloaded disk image or zip.",
          "Переместите в Корзину **BiLang Play** (обычно оно лежит в **Программах**) и скачанный образ диска или zip.",
        ),
      },
    ]),
    method("brew", "Homebrew", [
      {
        text: t("Remove the app, then the tap:", "Удалите приложение, затем tap:"),
        commands: BREW_UNINSTALL,
      },
    ]),
    {
      title: t("App data and settings, in Terminal", "Данные и настройки, в Терминале"),
      commands: [
        'rm -rf ~/Library/"Application Support"/bilangplay',
        "defaults delete io.github.uvlad7.bilangplay 2>/dev/null",
        "rm -f ~/Library/Preferences/io.github.uvlad7.bilangplay*.plist",
        'rm -rf ~/Library/"Saved Application State"/io.github.uvlad7.bilangplay*.savedState',
      ],
    },
  ],
  linux: [
    method("download", DOWNLOAD, [
      {
        title: t("Debian/Ubuntu package (.deb)", "Пакет Debian/Ubuntu (.deb)"),
        text: t(
          "Remove the package; this removes its AppArmor profile and settings schema too:",
          "Удалите пакет; вместе с ним удалятся его профиль AppArmor и схема настроек:",
        ),
        commands: ["sudo apt purge bilangplay"],
      },
      { text: t("Then delete the downloaded package.", "Затем удалите скачанный пакет.") },
      {
        title: t(
          "App image (.AppImage) or portable app (.tar.gz)",
          "Образ приложения (.AppImage) или портативное приложение (.tar.gz)",
        ),
        text: t(
          "Delete the AppImage file, or the unpacked folder and the downloaded archive. If you added it to the applications menu, remove the entry and its icons (before deleting it, the app's start screen also has **Remove from applications menu**):",
          "Удалите файл AppImage или распакованную папку и скачанный архив. Если вы добавляли приложение в меню приложений, удалите пункт меню и значки (пока оно не удалено, на стартовом экране приложения есть и кнопка **Remove from applications menu**):",
        ),
        commands: [
          'data="${XDG_DATA_HOME:-$HOME/.local/share}"',
          'rm -f "$data/applications/bilang-play.desktop"',
          "find \"$data/icons/hicolor\" -name 'bilang-play*' -delete",
        ],
      },
      collapsed(t("If you installed an AppArmor profile for it", "Если вы ставили для него профиль AppArmor"), [
        { text: t("The AppImage's:", "Для AppImage:"), commands: removeProfile("bilangplay-appimage") },
        { text: t("The portable app's:", "Для портативного приложения:"), commands: removeProfile("bilangplay-portable") },
      ]),
    ]),
    method("brew", "Homebrew", [
      {
        text: t(
          "Remove the app with its command, applications-menu entry, and icons, then the tap:",
          "Удалите приложение вместе с командой, пунктом меню приложений и значками, затем tap:",
        ),
        commands: BREW_UNINSTALL,
      },
      collapsed(t("If you installed its AppArmor profile", "Если вы ставили для него профиль AppArmor"), [
        { commands: removeProfile("bilangplay-brew") },
      ]),
    ]),
    {
      title: t(
        "App data and settings (settings live in GSettings, stored by dconf on most systems)",
        "Данные и настройки (настройки — в GSettings, на большинстве систем их хранит dconf)",
      ),
      commands: [
        'rm -rf "${XDG_CONFIG_HOME:-$HOME/.config}/bilangplay"',
        "dconf reset -f /io/github/uvlad7/bilangplay/",
      ],
    },
    collapsed(t("If the `dconf` command is not found", "Если команда `dconf` не найдена"), [
      {
        text: t(
          [
            "Run one of these instead, **before** deleting the app (`gsettings` needs a file that comes with it).",
            "**Debian/Ubuntu package (.deb):**",
          ],
          [
            "Выполните вместо неё одну из этих команд, **до** удаления приложения (`gsettings` нужен файл, который идёт с ним).",
            "**Пакет Debian/Ubuntu (.deb):**",
          ],
        ),
        commands: [`gsettings ${GSETTINGS_RESET}`],
      },
      {
        text: t(
          "**Portable app (.tar.gz)**, from the app's folder (the one with `bilangplay` in it):",
          "**Портативное приложение (.tar.gz)**, из папки приложения (той, где лежит `bilangplay`):",
        ),
        commands: [`gsettings --schemadir resources/settings-schemas ${GSETTINGS_RESET}`],
      },
      {
        text: t(
          "**Homebrew**, before uninstalling it:",
          "**Homebrew**, до его удаления:",
        ),
        commands: [
          `gsettings --schemadir "$(echo "$(brew --prefix)"/Caskroom/bilang-play/*/bilangplay-*-linux-x64/resources/settings-schemas)" ${GSETTINGS_RESET}`,
        ],
      },
      {
        text: t(
          "**App image (.AppImage)**, from the folder it is in (this unpacks a temporary copy):",
          "**Образ приложения (.AppImage)**, из папки, где он лежит (это распакует временную копию):",
        ),
        commands: [
          "./{name:appimage} --appimage-extract",
          `gsettings --schemadir squashfs-root/resources/settings-schemas ${GSETTINGS_RESET}`,
          "rm -rf squashfs-root",
        ],
      },
    ]),
  ],
};
