import {
  AtSign,
  Building2,
  Cpu,
  Download,
  FileUp,
  Hash,
  MapPin,
  Phone,
  ScanSearch,
  ServerOff,
  Code,
  Bot,
  User,
  type LucideIcon,
} from 'lucide-react'
import { LINKS } from '@/lib/links'

type Item = { icon: LucideIcon; title: string; body: string }

export const STEPS: Item[] = [
  {
    icon: FileUp,
    title: 'Drop your PDF',
    body: 'Pick any text-based PDF. It opens right in your browser. Nothing is uploaded.',
  },
  {
    icon: ScanSearch,
    title: 'Review what was found',
    body: 'Cloak blacks out names, emails, phone numbers and more. Turn any of them on or off before you save.',
  },
  {
    icon: Download,
    title: 'Download a clean copy',
    body: 'Get a PDF with the sensitive text removed, ready to share with ChatGPT, Claude or anyone else.',
  },
]

export const DETECTIONS: { icon: LucideIcon; label: string }[] = [
  { icon: User, label: 'Names' },
  { icon: Building2, label: 'Organizations' },
  { icon: MapPin, label: 'Locations' },
  { icon: AtSign, label: 'Email addresses' },
  { icon: Phone, label: 'Phone numbers' },
  { icon: Hash, label: 'Social Security numbers' },
]

export const FEATURES: (Item & { href?: string })[] = [
  {
    icon: Cpu,
    title: 'Runs on your device',
    body: 'Detection uses an AI model that runs inside your browser, on your GPU with WebGPU or on your CPU as a fallback.',
  },
  {
    icon: ServerOff,
    title: 'Nothing is uploaded',
    body: "There is no server to upload to. Open your browser's network tab while you redact and see for yourself.",
  },
  {
    icon: Code,
    title: 'Open source',
    body: 'Every line of code is on GitHub. Read it, audit it, or run your own copy.',
    href: LINKS.repo,
  },
  {
    icon: Bot,
    title: 'Bring your own model',
    body: 'Already running Ollama? Connect it and use any local LLM for detection. It still never leaves your machine.',
  },
]

export const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is Cloak free?',
    a: 'Yes. Cloak is free and open source. There is no account, no sign-up and no usage limit.',
  },
  {
    q: 'Why is Cloak open source?',
    a: 'I learned most of what I know from free tools, open source code and people who shared their knowledge without asking for anything back. Building free, open tools is my way of giving back. Cloak will always be free, and its code is open for anyone to read, learn from or improve.',
  },
  {
    q: 'Is my PDF uploaded anywhere?',
    a: 'No. Your PDF is read, scanned and redacted entirely inside your browser, so it never leaves your device. The only thing Cloak downloads is the detection model itself.',
  },
  {
    q: 'What personal information (PII) can it find?',
    a: 'Names, organizations, locations, email addresses, phone numbers and US Social Security numbers. You review every detection before downloading, so you stay in control.',
  },
  {
    q: 'Is the redaction permanent?',
    a: 'Yes. The redacted text is removed from the PDF, not just hidden behind a black box, so it cannot be copied, searched or recovered.',
  },
  {
    q: 'Does it work with scanned PDFs?',
    a: 'Not yet. Cloak reads the text inside a PDF, so it works with documents exported from Word, Google Docs and similar tools. Scanned pages that are only images are not supported yet.',
  },
  {
    q: 'Which browsers work best?',
    a: 'Chrome and Edge are fastest because they run the model on your GPU with WebGPU. Safari 18 and newer supports it too. Firefox and other browsers work, just a bit slower. Cloak currently needs a laptop or desktop.',
  },
  {
    q: 'Why is the first run slower?',
    a: 'The first time you use Cloak, your browser downloads the detection model and saves it. After that it loads from your browser cache in seconds.',
  },
]
