# Security Policy

## Supported Versions

Cloak is a website, not a versioned package. Only the live site at
[cloakdoc.app](https://cloakdoc.app) and the latest code on the `master`
branch get security fixes.

## What counts as a security issue

Cloak promises that your document never leaves your browser and that
redacted text is really gone. Please report anything that breaks those
promises, for example:

- Document content or extracted text being sent to any server
- Redacted text that can still be recovered from the downloaded PDF
- Metadata, comments, attachments or form data surviving redaction
- A crafted PDF that can run scripts in the page (XSS) or reach other sites

These are **not** security issues, so please open a normal issue instead:

- The detection model missing a name, number or other value
- Wrong categories on detected values
- Problems with your own Ollama setup

## Reporting a Vulnerability

Please **do not** open a public issue.

Use the **Report a vulnerability** button under this repository's
[Security tab](https://github.com/pulkit-jasti/cloak-document-redactor/security).
Only the maintainer can see your report.

Helpful things to include:

- What you did, step by step
- A sample PDF that shows the problem, if you can share one (please don't
  use real personal documents)
- Browser and operating system

## What to expect

- A reply within 7 days.
- If the issue is confirmed, I'll work on a fix and aim to ship it within
  30 days, depending on how complex it is. I'll keep you updated along the way.
- If it's declined, I'll explain why.
- Once fixed, I'll publish a security advisory and credit you, unless you'd
  rather stay anonymous.

Cloak is maintained by one person in their spare time, so thanks for
your patience.
