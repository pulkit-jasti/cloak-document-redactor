# Contributing to Cloak

Thanks for taking the time to contribute! Cloak is a small project run by
one person, so every bug report, test document and pull request helps.

## What I'm looking for

- Bug reports, especially PDFs where redaction fails or text survives
- Better detection: regex patterns, test fixtures, model comparisons
- UI and accessibility fixes
- Documentation improvements

## What I'm not looking for

- **Translations or non-English support.** Cloak is English only by design.
- **Anything that sends data to a server.** Documents must never leave the
  browser. This includes analytics, tracking and error reporting services.
- **Mobile support** for now.

## Ground rules

- Be respectful and welcoming to everyone.
- Open an issue before starting a big change, so we can agree on the
  approach first. Small fixes like typos can go straight to a pull request.
- Keep pull requests small and focused on one thing.
- Ask before adding a new dependency.
- Never commit real personal documents. Test PDFs must be publicly available.

## Making a change

1. Fork the repo and create a branch from `master`.
2. Follow [Run locally](README.md#run-locally) in the README.
3. Make your change. If you touched the PDF pipeline, detection or
   redaction, run `npm run test:smoke`.
4. Open a pull request. CI runs lint and the build automatically.

I review pull requests myself, usually within a week or two.

By submitting a pull request, you agree that your contribution is licensed
under [AGPL-3.0-or-later](LICENSE), the same as the rest of Cloak.

## Bugs and ideas

**Security issue?** Don't open an issue. Follow [SECURITY.md](SECURITY.md).

For bugs and feature ideas, [open an issue](https://github.com/pulkit-jasti/cloak-document-redactor/issues/new/choose).
If a bug happens with a specific PDF, only attach it if it's public or made up.
