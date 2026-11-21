import { LINKS } from '@/lib/links'

export const VERIFY_TITLE = 'Verify Cloak | Check That Your PDF Never Leaves Your Device'
export const VERIFY_DESCRIPTION =
  "Don't take our word for it. Simple tests anyone can run to confirm Cloak never uploads your PDF, plus how to check that redacted text is really gone."

// Describes offline support with the planned service worker (reload works offline). Not shipped yet.
export const OFFLINE_STEPS = [
  'Open Cloak and redact any PDF once while you are online. The sample document works. This saves the app and the detection model in your browser.',
  'Turn off Wi-Fi, or unplug your network cable.',
  'Reload the page, or close it and open cloakdoc.app again, then redact another PDF.',
]

export const NETWORK_STEPS = [
  'Open your browser\'s developer tools: Cmd + Option + I on a Mac, Ctrl + Shift + I or F12 on Windows and Linux. In Safari, first turn on "Show features for web developers" in Settings > Advanced.',
  'Go to the Network tab and turn on "Preserve log" (Firefox calls it "Persist Logs") so the list is not cleared between pages.',
  'Redact a PDF from start to finish while the tab is open.',
  'Go through the list. Every request downloads something to you: the page, scripts, fonts or model files. None of them carries your document.',
]

export const REQUESTS: { host: string; what: string; when: string }[] = [
  {
    host: 'cloakdoc.app',
    what: 'The site itself: pages, scripts, styles, fonts and the PDF engine (MuPDF).',
    when: 'When the page loads and when you pick a file.',
  },
  {
    host: 'cdn.cloakdoc.app',
    what: 'The detection model files. After the first download they are saved in your browser.',
    when: 'The first time you run detection with a model.',
  },
  {
    host: 'cdn.jsdelivr.net',
    what: 'ONNX Runtime, the open source engine that runs the detection model.',
    when: 'When detection starts.',
  },
  {
    host: 'localhost:11434',
    what: 'Your own Ollama server. Page text is sent here for detection, so it goes to the address you set, which is your own computer by default.',
    when: 'Only if you connect Ollama.',
  },
]

export const STORED: { what: string; why: string }[] = [
  {
    what: 'The app itself',
    why: 'Saved by your browser after your first visit, so Cloak opens and works even without an internet connection.',
  },
  {
    what: 'Detection model files',
    why: "Saved in your browser's private storage (the Origin Private File System) so the next run starts in seconds.",
  },
]

export const REDACTION_CHECKS = [
  {
    title: 'Search for it',
    body: 'Open the redacted PDF in any viewer and search (Cmd + F or Ctrl + F) for a word that was blacked out. It should not be found.',
  },
  {
    title: 'Copy around it',
    body: 'Select the text across a black box, copy it and paste it somewhere. The redacted words should be missing, not hidden underneath.',
  },
  {
    title: 'Check the file details',
    body: "Open the document properties in your PDF viewer. Fields like author, title and creator tool should be empty, and comments, attachments and bookmarks should be gone.",
  },
]

export const LINKS_OUT = {
  repo: LINKS.repo,
  licenses: LINKS.thirdPartyLicenses,
}
