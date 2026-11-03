<!-- Each release replaces this file in uvlad7/BiLang-Play from BiLang Play's sources; edits made there are overwritten. -->

# Changelog

All notable changes to BiLang Play. Versions follow
[Semantic Versioning](https://semver.org); a version with a `-` part, such as
`0.1.0-alpha.1`, is a pre-release. Each version's section is also the
description of its release, and the [site](https://uvlad7.github.io/BiLang-Play/)
shows them all. The Russian translation is in [CHANGELOG.ru.md](CHANGELOG.ru.md).

## [Unreleased]

## [0.1.0-alpha.3] - 2026-11-03

- **Interface languages:** the interface starts to come in Belarusian,
  Ukrainian, Russian, German, French, Spanish, and Italian. It follows the
  language you speak (or else the one you learn) unless you choose one under
  Settings → Languages. Parts of the player, such as its menus, the
  transcript, and the word card, are still in English.
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
