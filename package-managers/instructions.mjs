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
// Placeholders: `{version}`, `{name:<kind>}`, `{url:<kind>}` (`FILES`).

/** @param {string | string[]} en @param {string | string[]} ru */
const t = (en, ru) => ({ en, ru });

const TO_UPDATE = { text: t("**To update to a newer version:**", "**Обновление до новой версии:**") };

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
        "Не в оболочке администратора? Используйте `sudo` или `gsudo`",
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
            "Or, on any Windows, with [`gsudo`](https://community.chocolatey.org/packages/gsudo):",
            "Или, в любой Windows, через [`gsudo`](https://community.chocolatey.org/packages/gsudo):",
          ),
          commands: prefixed("gsudo"),
        },
      ],
    },
  };
}

const BREW_INSTALL = [
  "brew tap uvlad7/bilang-play https://github.com/uvlad7/BiLang-Play",
  "brew install --cask uvlad7/bilang-play/bilang-play",
];
const BREW_TIP = {
  text: t(
    "If the tap is already installed, do not untap and add it again. If Homebrew still shows an old Cask, run `brew update --force`. Use `brew reinstall --cask bilang-play` to apply a changed Cask at the same version.",
    "Если tap уже установлен, удалять его и добавлять заново не нужно. Если Homebrew всё ещё показывает старый Cask, выполните `brew update --force`. Чтобы применить изменённый Cask с той же версией, используйте `brew reinstall --cask bilang-play`.",
  ),
};

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
        "Получите только этот tap, затем обновите BiLang Play:",
      ),
      commands: ['git -C "$(brew --repository uvlad7/bilang-play)" pull --ff-only', upgrade],
    },
    {
      text: t(
        "Or fetch the newest Homebrew and every tap's package lists (nothing installed is upgraded), then upgrade BiLang Play:",
        "Или получите свежий Homebrew и списки пакетов всех tap'ов (установленное при этом не обновляется), затем обновите BiLang Play:",
      ),
      commands: ["brew update", upgrade],
    },
  ];
}

/**
 * Each way of installing the app, as its update notice tells it: the new
 * version's `download` (a kind of `FILES`), and the `update` steps; a step
 * that is another way of doing the same says so, "Or …".
 */
export const CHANNELS = {
  // Homebrew on macOS and on Linux: the same commands; on macOS the cask
  // clears quarantine, and says so.
  "brew-macos": { warning: WARNINGS["brew-macos"], update: brewUpdate() },
  "brew-linux": { update: brewUpdate() },
  // `scoop update <app>` syncs the buckets only when Scoop itself is old.
  scoop: {
    warning: WARNINGS.scoop,
    update: [
      {
        text: t(
          "Fetch the newest Scoop and its buckets (nothing installed is upgraded), then upgrade BiLang Play:",
          "Получите свежий Scoop и его bucket'ы (установленное при этом не обновляется), затем обновите BiLang Play:",
        ),
        commands: ["scoop update", "scoop update bilang-play"],
      },
    ],
  },
  // Chocolatey keeps its packages in a folder shared by every user
  // (C:\ProgramData\chocolatey), which only an administrator may change.
  chocolatey: {
    warning: WARNINGS.chocolatey,
    update: [
      elevated({
        text: t(
          "In an administrator shell (Chocolatey keeps its packages in a folder shared by every user):",
          "В оболочке администратора (Chocolatey хранит пакеты в общей для всех пользователей папке):",
        ),
        commands: ["choco upgrade bilangplay --source bilangplay --pre -y"],
      }),
    ],
  },
  // No APT repository: download, then install the file. /tmp is readable
  // by APT's sandbox user, so it does not warn.
  deb: {
    download: "deb",
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
  appimage: { download: "appimage" },
  "linux-tar": { download: "linux-tar" },
  nsis: { download: "windows-setup" },
  "windows-zip": { download: "windows-zip" },
  macos: {
    download: "macos-dmg",
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

/** The site's Install tabs, by system. */
export const INSTALL = {
  windows: [
    {
      title: t("Personal package-manager channels", "Личные каналы менеджеров пакетов"),
      text: t(
        "These commands use BiLang Play's own sources; none submits anything to a public catalogue.",
        "Эти команды используют собственные источники BiLang Play; ничего не отправляется в публичный каталог.",
      ),
    },
    {
      title: "Scoop",
      warning: WARNINGS.scoop,
      commands: [
        "scoop bucket add bilang-play https://github.com/uvlad7/BiLang-Play",
        "scoop install bilang-play/bilang-play",
      ],
    },
    TO_UPDATE,
    { updates: "scoop" },
    elevated({
      title: "Chocolatey",
      warning: WARNINGS.chocolatey,
      commands: [
        'choco source add --name bilangplay --source "https://uvlad7.github.io/BiLang-Play/chocolatey/v3/index.json"',
        "choco install bilangplay --source bilangplay --pre -y",
      ],
    }),
    TO_UPDATE,
    { updates: "chocolatey" },
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
        "Unzip it anywhere and run `BiLang Play.exe`. On the first start it offers to add itself to the Start menu and the desktop.",
        "Распакуйте куда угодно и запустите `BiLang Play.exe`. При первом запуске приложение предложит добавить себя в меню «Пуск» и на рабочий стол.",
      ),
    },
    {
      title: t("If Windows blocks it", "Если Windows блокирует запуск"),
      text: t(
        "Windows marks downloaded files, and unsigned apps then get “Windows protected your PC” (choose **More info**, then **Run anyway**) or “The publisher could not be verified” (choose **Run**). To remove the mark beforehand, right-click the downloaded file, choose **Properties**, tick **Unblock**, and choose **OK**; for the zip, do it before unzipping. Or in PowerShell:",
        "Windows помечает скачанные файлы, и для неподписанных программ показывает «Система Windows защитила ваш компьютер» (нажмите **Подробнее**, затем **Выполнить в любом случае**) или «Не удалось проверить издателя» (нажмите **Запустить**). Чтобы снять пометку заранее, щёлкните скачанный файл правой кнопкой, выберите **Свойства**, отметьте **Разблокировать** и нажмите **ОК**; zip — до распаковки. Или в PowerShell:",
      ),
    },
    {
      text: t("The downloaded installer or zip:", "Скачанный установщик или zip:"),
      commands: ['Unblock-File "$env:USERPROFILE\\Downloads\\{name:windows-zip}"'],
    },
    {
      text: t("A folder already unzipped, every file in it:", "Уже распакованная папка, все файлы в ней:"),
      commands: t(
        ['Get-ChildItem -Recurse "<the unzipped folder>" | Unblock-File'],
        ['Get-ChildItem -Recurse "<распакованная папка>" | Unblock-File'],
      ),
    },
    {
      text: t(
        "Where Smart App Control (Windows 11) blocks unsigned apps, unblocking does not help; only turning Smart App Control off does.",
        "Если неподписанные программы блокирует «Интеллектуальное управление приложениями» (Smart App Control, Windows 11), разблокировка не помогает — только его отключение.",
      ),
    },
  ],
  macos: [
    {
      title: "Homebrew",
      text: t("The personal cask installs the app.", "Личный cask устанавливает приложение."),
      warning: WARNINGS["brew-macos"],
      commands: BREW_INSTALL,
    },
    TO_UPDATE,
    { updates: "brew-macos" },
    BREW_TIP,
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
        [
          "Unzip it and move **BiLang Play** to **Applications**. Started anywhere else, the app offers to move itself there.",
          "Or, in Finder, Control-click (or right-click) **BiLang Play**, choose **Open**, then choose **Open** in the warning. Do this only when you trust the download; macOS remembers that approval for this copy of the app.",
        ],
        [
          "Распакуйте и переместите **BiLang Play** в **Программы**. Если запустить его из другого места, приложение само предложит туда переместиться.",
          "Или в Finder нажмите Control и щёлкните (либо щёлкните правой кнопкой) по **BiLang Play**, выберите **Открыть**, затем ещё раз **Открыть** в предупреждении. Делайте это, только если доверяете загрузке: macOS запомнит разрешение для этой копии приложения.",
        ],
      ),
    },
    {
      title: t("If macOS blocks it", "Если macOS блокирует запуск"),
      text: t(
        "On the first start macOS says it cannot verify the app. Choose **Done**, open **System Settings › Privacy & Security**, scroll down to the message about BiLang Play, and choose **Open Anyway**. Or remove the “downloaded from the internet” mark in Terminal:",
        "При первом запуске macOS сообщает, что не может проверить приложение. Нажмите **Готово**, откройте **Системные настройки › Конфиденциальность и безопасность**, прокрутите до сообщения о BiLang Play и нажмите **Всё равно открыть**. Или снимите пометку «загружено из интернета» в Терминале:",
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
  ],
  linux: [
    {
      title: "Homebrew",
      text: t(
        "The personal cask installs the tar.gz build, command, application-menu entry, and icons.",
        "Личный cask устанавливает сборку tar.gz, команду, пункт меню приложений и значки.",
      ),
      commands: BREW_INSTALL,
    },
    TO_UPDATE,
    { updates: "brew-linux" },
    BREW_TIP,
    {
      title: t("App image (.AppImage)", "Образ приложения (.AppImage)"),
      text: t("Make it executable and run it:", "Сделайте файл исполняемым и запустите:"),
      commands: ["chmod +x {name:appimage}", "./{name:appimage}"],
    },
    {
      text: t(
        "Or in the file manager: **Properties › Permissions › Allow executing file as program**. It needs no `libfuse2`. On the first start it offers to add itself to the applications menu. On Ubuntu 24.04 and later the first start shows one `sudo` command that installs an AppArmor profile for it, because Ubuntu restricts the sandbox the app relies on; run it, then start the app again.",
        "Или в файловом менеджере: **Свойства › Права › Разрешить выполнение файла как программы**. `libfuse2` не нужен. При первом запуске приложение предложит добавить себя в меню приложений. В Ubuntu 24.04 и новее первый запуск покажет одну команду с `sudo`, которая ставит для него профиль AppArmor: Ubuntu ограничивает песочницу, на которую опирается приложение. Выполните её и запустите приложение снова.",
      ),
    },
    {
      title: t("Debian/Ubuntu package (.deb)", "Пакет Debian/Ubuntu (.deb)"),
      commands: ["sudo apt install ./{name:deb}"],
    },
    {
      text: t(
        "It adds BiLang Play to the applications menu itself.",
        "Он сам добавляет BiLang Play в меню приложений.",
      ),
    },
    TO_UPDATE,
    { updates: "deb" },
    {
      title: t("Portable app (.tar.gz)", "Портативное приложение (.tar.gz)"),
      text: t(
        "Unpack it anywhere and run `./bilangplay` in the folder. On the first start it offers to add itself to the applications menu. If it exits with a message about the SUID sandbox helper, either install an AppArmor profile for it or let the bundled helper run as root, from that folder:",
        "Распакуйте куда угодно и запустите `./bilangplay` в папке. При первом запуске приложение предложит добавить себя в меню приложений. Если оно завершается с сообщением о SUID sandbox helper, поставьте для него профиль AppArmor или разрешите встроенному помощнику запускаться от root, из этой папки:",
      ),
      commands: ["sudo chown root:root chrome-sandbox && sudo chmod 4755 chrome-sandbox"],
    },
    {
      text: t(
        "On Ubuntu 22.04 and other systems of its age, install `zenity` so file pickers open in the last folder you used:",
        "В Ubuntu 22.04 и других системах того времени поставьте `zenity`, чтобы окна выбора файлов открывались в последней использованной папке:",
      ),
      commands: ["sudo apt install zenity"],
    },
  ],
};

const BREW_UNINSTALL = [
  "brew uninstall --cask uvlad7/bilang-play/bilang-play",
  "brew untap uvlad7/bilang-play",
];

const GSETTINGS_RESET = "reset-recursively io.github.uvlad7.bilangplay:/io/github/uvlad7/bilangplay/";

/** The site's Uninstall tabs, by system. */
export const UNINSTALL = {
  windows: [
    {
      title: "Scoop",
      text: t("Remove the app, then its bucket:", "Удалите приложение, затем его bucket:"),
      commands: ["scoop uninstall bilang-play", "scoop bucket rm bilang-play"],
    },
    elevated({
      title: "Chocolatey",
      text: t(
        "In an administrator shell, remove the app (Chocolatey runs its uninstaller), then its source:",
        "В оболочке администратора удалите приложение (Chocolatey запустит его деинсталлятор), затем его источник:",
      ),
      commands: ["choco uninstall bilangplay -y", "choco source remove --name bilangplay"],
    }),
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
    {
      title: t("App data and settings, in PowerShell", "Данные и настройки, в PowerShell"),
      commands: [
        'Remove-Item -Recurse -Force "$env:APPDATA\\bilangplay"',
        'Remove-Item -Recurse -Force "HKCU:\\Software\\io.github.uvlad7.bilangplay"',
      ],
    },
  ],
  macos: [
    {
      title: "Homebrew",
      text: t("Remove the app, then the tap:", "Удалите приложение, затем tap:"),
      commands: BREW_UNINSTALL,
    },
    {
      title: t("Disk image (.dmg) or app (.app in .zip)", "Образ диска (.dmg) или приложение (.app в .zip)"),
      text: t(
        "Move **BiLang Play** to the Trash from wherever you keep it (usually **Applications**), and the downloaded disk image or zip.",
        "Переместите **BiLang Play** в Корзину оттуда, где оно лежит (обычно из **Программ**), и скачанный образ диска или zip.",
      ),
    },
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
    {
      title: "Homebrew",
      text: t(
        "Remove the app with its command, applications-menu entry, and icons, then the tap:",
        "Удалите приложение вместе с командой, пунктом меню приложений и значками, затем tap:",
      ),
      commands: BREW_UNINSTALL,
    },
    {
      title: t("Debian/Ubuntu package (.deb)", "Пакет Debian/Ubuntu (.deb)"),
      commands: ["sudo apt purge bilangplay"],
    },
    {
      text: t(
        "It removes its AppArmor profile and settings schema too. Then delete the downloaded package.",
        "Заодно удаляет свой профиль AppArmor и схему настроек. Затем удалите скачанный пакет.",
      ),
    },
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
    {
      text: t(
        "If you installed the AppImage's AppArmor profile (Ubuntu 24.04 and later):",
        "Если вы ставили профиль AppArmor для AppImage (Ubuntu 24.04 и новее):",
      ),
      commands: [
        "sudo apparmor_parser -R /etc/apparmor.d/bilangplay-appimage",
        "sudo rm /etc/apparmor.d/bilangplay-appimage",
      ],
    },
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
    {
      text: t(
        [
          "If the `dconf` command is not found, run this instead, **before** deleting the app (`gsettings` needs a file that comes with it):",
          "**Debian/Ubuntu package (.deb):**",
        ],
        [
          "Если команда `dconf` не найдена, выполните вместо неё это, **до** удаления приложения (`gsettings` нужен файл, который идёт с ним):",
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
        "**App image (.AppImage)**, from the folder it is in (this unpacks a temporary copy):",
        "**Образ приложения (.AppImage)**, из папки, где он лежит (это распакует временную копию):",
      ),
      commands: [
        "./{name:appimage} --appimage-extract",
        `gsettings --schemadir squashfs-root/resources/settings-schemas ${GSETTINGS_RESET}`,
        "rm -rf squashfs-root",
      ],
    },
  ],
};
