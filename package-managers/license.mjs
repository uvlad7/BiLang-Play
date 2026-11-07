// The licenses versions come under, by id, and the id of the one the next
// release comes under. The update file (`license` in `updates/main.json`)
// names the recorded release's id with its text, and the site's License
// section shows it.
//
// Every copy carries the id it was released under (the app's
// `crates/updates`, `LICENSE`); when a newer version's id differs, its
// update notice warns, with the text and a link to the site's License
// section, before anyone runs the update. The terms change only with a new
// major version: add the new id and its text here, set `LICENSE` to it with
// the app's, and release that major version; `updates.mjs` refuses to record
// a release under another id without one. Fixing a word in a text warns
// nobody. An id is lowercase letters, digits, dots, and dashes.

const t = (en, ru, more = {}) => ({ en, ru, ...more });

export const LICENSES = {
  "proprietary-2026-10-25": t(
    [
      "BiLang Play is proprietary software, not open source. Alpha builds are free, and will stay free.",
      "Its license, and the licenses of the open-source components it includes, are in **Help › Licenses** and in each package's `licenses` folder.",
    ],
    [
      "BiLang Play — проприетарное ПО с закрытым исходным кодом. Альфа-версии бесплатны и останутся бесплатными.",
      "Лицензия приложения и лицензии входящих в него открытых компонентов — в **Help › Licenses** и в папке `licenses` каждого пакета.",
    ],
  ),
};

/** The license the next release comes under: one of `LICENSES`. */
export const LICENSE = "proprietary-2026-10-25";
