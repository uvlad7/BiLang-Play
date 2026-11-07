<!-- Each release replaces this file in uvlad7/BiLang-Play from BiLang Play's sources; edits made there are overwritten. -->

# Changelog

All notable changes to BiLang Play. Versions follow
[Semantic Versioning](https://semver.org); a version with a `-` part, such as
`0.1.0-alpha.1`, is a pre-release. Each version's section is also the
description of its release, and the [site](https://uvlad7.github.io/BiLang-Play/)
shows them all. The Russian translation is in [CHANGELOG.ru.md](CHANGELOG.ru.md).

## [Unreleased]

## [0.1.0-alpha.3] - 2026-11-07

- **Interface languages:** the interface comes in Belarusian, Ukrainian,
  Russian, German, French, Spanish, and Italian as well as English: the
  menus, dialogs, panels, transcripts, word card, notices, and settings,
  with numbers written the language's way (1,5 s). It follows the language
  you speak (your system's language until you choose one), or else the one
  you learn, unless you pick one under Settings → Languages. Only the
  player's own control tooltips stay in English.
- **More languages:** the language you speak and learn, and the preferred
  audio and subtitle languages, can be chosen from 81 more languages.
- **Resuming videos:** reopening a video continues where you stopped, with
  the audio track and subtitles you chose; a moved or copied video keeps
  them. A subtitle's timing correction comes back whenever that subtitle is
  shown with that video again, as primary or secondary subtitles. A
  subtitle file is found beside a moved video, or, with Settings → Player →
  "Find a moved video's subtitles outside its folder", wherever it was
  relative to the video. This is kept on this computer, never in the video
  files, and can be turned off under Settings → Player.
- **Subtitle text selection:** select parts of transcript cues without copying
  timestamps, then refine either end with draggable, line-height handles that
  scroll with the transcript and swap roles when dragged past one another.
  Holding a handle at the transcript's edge scrolls it; Esc clears the
  selection before closing the transcript, and a click in the transcript
  clears it without seeking.
- **Pausing:** the big play button no longer flashes over the picture before
  the transcript on pause appears.
- **Word lookup:** when Google translates a corrected spelling (recieve →
  receive) or reads a clipped word as another term (goin → go in), the word
  card says what it read the word as, and definitions follow that reading.
- **Linux standalone builds:** a copy missing its desktop entry file still
  starts; asking it to add itself to the applications menu explains why it
  can't.
- **Error notices:** an unexpected error in the player shows a notice instead
  of passing silently.
- **Linux file picker:** on desktops with an older file chooser (Ubuntu
  22.04), the picker shows BiLang Play's icon.
- **Update notices:** when a newer version is out, the start screen says so,
  with the steps to update the way this copy was installed (download,
  Homebrew, Scoop, or Chocolatey) and a warning when the new version comes
  under another license, with how to keep the installed one.
- **Subtitle timing shortcuts:** Z and X now move the primary subtitles by a
  second (Shift+Z and Shift+X by a tenth), A and S do the same for the
  secondary subtitles, and Q gives the secondary the primary's timing.
- **Clicking a word while playing** pauses with the subtitles still shown,
  so the word stays under its card, and the transcript on pause opens above
  them.
- **Transcript on pause:** when it shows above the subtitles ("Hide subtitles
  while the pause transcript is shown" off), it no longer overlaps them, nor
  leaves an empty line's gap above a one-line subtitle.
- **Panels and the settings window** make room for longer labels in the
  other interface languages instead of cutting or overlapping them.
- **Keyboard shortcuts:** holding Shift with a key that has no Shift
  shortcut of its own no longer runs the key's shortcut (Shift+K used to
  play, Shift+F to go fullscreen), and Shift+arrows select transcript text
  again instead of seeking. The C key and the Subtitles menu's "Reset
  primary timing" are gone: one stray press next to Ctrl+C lost a timing
  correction. Reset a subtitle's timing with the button beside it in the
  subtitles panel.
- **Subtitle placement:** with both subtitles shown, each keeps its place:
  a line appearing or ending in one no longer moves the other. The
  subtitle position sets where the last line ends; more lines grow upward
  from there, never past the top of the picture. At the lowest positions
  subtitles now end just above the progress bar's time labels instead of
  leaving a gap.
- **macOS:** built on macOS 15 now, and still runs on macOS 14 (Sonoma) or
  later.
- Electron 44.5.0.

## [0.1.0-alpha.2] - 2026-10-27

Packaging and distribution update.

- **Package-manager channels:** personal Homebrew, Scoop, and Chocolatey
  sources now reuse the release artifacts and verify their hashes.
- **Linux Homebrew integration:** the cask installs the command, application
  menu entry, and all supplied hicolor icons; removing the cask removes what
  it owns.
- **Unsigned-build guidance:** clearer Windows Mark-of-the-Web and macOS
  Gatekeeper instructions, including the Finder **Open** option.

## [0.1.0-alpha.1] - 2026-10-26

The first alpha, shared with friends for testing. Expect rough edges, and
please report what breaks. The interface is in English only for now;
translations will come later.

- **Two subtitles at once:** the language you learn and your own, each with
  its own timing.
- **Transcript on pause:** pause and the lines so far appear over the
  picture; click one to jump back to it.
- **Transcript panel** beside or below the video, both languages side by
  side.
- **Click a word** for its translation and definition.
- **Formats:** MP4, WebM, and MKV; AC-3, DTS, and TrueHD audio; SRT and
  WebVTT subtitles, and subtitle tracks inside the video.
- **Configurable look:** style profiles and settings for the subtitles and
  both transcripts.
- Windows, macOS (Apple Silicon), and Linux.
