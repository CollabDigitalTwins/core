# Contributing to Collab Digital Twins

First off, thanks for taking the time to contribute! ❤️

All types of contributions are encouraged and valued. See the [Table of Contents](#table-of-contents) for different ways to help and details about how this project handles them. Please make sure to read the relevant section before making your contribution. It will make it a lot easier for us maintainers and smooth out the experience for all involved. The community looks forward to your contributions. 🎉

> 📖 **This file is the quick reference.** The complete contributor guide — [dev environment setup](https://docs.collabdt.org/docs/contributing/dev-environment), [git workflow](https://docs.collabdt.org/docs/contributing/git-workflow), and commit conventions — lives in the documentation at **[docs.collabdt.org/docs/contributing](https://docs.collabdt.org/docs/contributing/)**.

> And if you like the project, but just don't have time to contribute, that's fine. There are other easy ways to support the project and show your appreciation, which we would also be very happy about:
> - Star the project
> - Tweet about it
> - Refer this project in your project's readme
> - Mention the project at local meetups and tell your friends/colleagues

<!-- omit in toc -->
## Table of Contents

- [I Have a Question](#i-have-a-question)
  - [I Want To Contribute](#i-want-to-contribute)
  - [Contributor Terms](#contributor-terms)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Improving The Documentation](#improving-the-documentation)
- [Styleguides](#styleguides)
  - [Commit Messages](#commit-messages)
- [Join The Project Team](#join-the-project-team)



## I Have a Question

> If you want to ask a question, we assume that you have read the available [documentation](README.md).

Before you ask a question, it is best to search for existing [Issues](/issues) that might help you. In case you have found a suitable issue and still need clarification, you can write your question in this issue. It is also advisable to search the internet for answers first.

If you then still feel the need to ask a question and need clarification, we recommend the following:

- Open an [Issue](/issues/new).
- Provide as much context as you can about what you're running into.
- Provide project and platform versions (nodejs, npm, etc), depending on what seems relevant.

We will then take care of the issue as soon as possible.

<!--
You might want to create a separate issue tag for questions and include it in this description. People should then tag their issues accordingly.

Depending on how large the project is, you may want to outsource the questioning, e.g. to Stack Overflow or Gitter. You may add additional contact and information possibilities:
- IRC
- Slack
- Gitter
- Stack Overflow tag
- Blog
- FAQ
- Roadmap
- E-Mail List
- Forum
-->

## I Want To Contribute

> ### Legal Notice <!-- omit in toc -->
> When contributing to this project, you must agree that you have authored 100% of the content, that you have the necessary rights to the content, and that the content you contribute may be provided under the project's licensing terms. See [Contributor Terms](#contributor-terms) below.

### Contributor Terms

Collab Digital Twins is released under the **AGPL-3.0** license and is also offered to organizations under a separate **Commercial License Agreement** (a standard dual-licensing model). To keep both editions legally consistent, every contributor must agree to our **[Contributor License Agreement (CLA)](CLA.md)** before their contribution can be merged.

Under the CLA, **you keep the copyright in your contribution** and grant Collab Digital Twins a broad license that lets us make your work available under both the AGPL-3.0 and our commercial terms. This is the same approach used by projects such as MongoDB, GitLab, and Grafana.

- **Individuals** — accept **Part A** of the [CLA](CLA.md#part-a--individual-contributor-license-agreement).
- **Organizations** — have an authorized signatory accept **Part B** of the [CLA](CLA.md#part-b--corporate-contributor-license-agreement).

You will be prompted to accept the CLA on your first pull request.

### Reporting Bugs

<!-- omit in toc -->
#### Before Submitting a Bug Report

A good bug report shouldn't leave others needing to chase you up for more information. Therefore, we ask you to investigate carefully, collect information and describe the issue in detail in your report. Please complete the following steps in advance to help us fix any potential bug as fast as possible.

- Make sure that you are using the latest version.
- Determine if your bug is really a bug and not an error on your side e.g. using incompatible environment components/versions (Make sure that you have read the [documentation](README.md). If you are looking for support, you might want to check [this section](#i-have-a-question)).
- To see if other users have experienced (and potentially already solved) the same issue you are having, check if there is not already a bug report existing for your bug or error in the [bug tracker](/issues?q=label%3Abug).
- Also make sure to search the internet (including Stack Overflow) to see if users outside of the GitHub community have discussed the issue.
- Collect information about the bug:
  - Stack trace (Traceback)
  - OS, Platform and Version (Windows, Linux, macOS, x86, ARM)
  - Version of the interpreter, compiler, SDK, runtime environment, package manager, depending on what seems relevant.
  - Possibly your input and the output
  - Can you reliably reproduce the issue? And can you also reproduce it with older versions?

<!-- omit in toc -->
#### How Do I Submit a Good Bug Report?

> You must never report security related issues, vulnerabilities or bugs including sensitive information to the issue tracker, or elsewhere in public. Instead, follow the responsible-disclosure process in our [Security Policy](SECURITY.md) and email **[info@collabdt.org](mailto:info@collabdt.org)**.

We use GitHub issues to track bugs and errors. If you run into an issue with the project:

- Open an [Issue](/issues/new). (Since we can't be sure at this point whether it is a bug or not, we ask you not to talk about a bug yet and not to label the issue.)
- Explain the behavior you would expect and the actual behavior.
- Please provide as much context as possible and describe the *reproduction steps* that someone else can follow to recreate the issue on their own. This usually includes your code. For good bug reports you should isolate the problem and create a reduced test case.
- Provide the information you collected in the previous section.

Once it's filed:

- The project team will label the issue accordingly.
- A team member will try to reproduce the issue with your provided steps. If there are no reproduction steps or no obvious way to reproduce the issue, the team will ask you for those steps and mark the issue as `needs-repro`. Bugs with the `needs-repro` tag will not be addressed until they are reproduced.
- If the team is able to reproduce the issue, it will be marked `needs-fix`, as well as possibly other tags (such as `critical`), and the issue will be left to be [implemented by someone](#your-first-code-contribution).

<!-- You might want to create an issue template for bugs and errors that can be used as a guide and that defines the structure of the information to be included. If you do so, reference it here in the description. -->


### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for Collab Digital Twins, **including completely new features and minor improvements to existing functionality**. Following these guidelines will help maintainers and the community to understand your suggestion and find related suggestions.

<!-- omit in toc -->
#### Before Submitting an Enhancement

- Make sure that you are using the latest version.
- Read the [documentation](README.md) carefully and find out if the functionality is already covered, maybe by an individual configuration.
- Perform a [search](/issues) to see if the enhancement has already been suggested. If it has, add a comment to the existing issue instead of opening a new one.
- Find out whether your idea fits with the scope and aims of the project. It's up to you to make a strong case to convince the project's developers of the merits of this feature. Keep in mind that we want features that will be useful to the majority of our users and not just a small subset. If you're just targeting a minority of users, consider writing an add-on/plugin library.

<!-- omit in toc -->
#### How Do I Submit a Good Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](/issues).

- Use a **clear and descriptive title** for the issue to identify the suggestion.
- Provide a **step-by-step description of the suggested enhancement** in as many details as possible.
- **Describe the current behavior** and **explain which behavior you expected to see instead** and why. At this point you can also tell which alternatives do not work for you.
- You may want to **include screenshots or screen recordings** which help you demonstrate the steps or point out the part which the suggestion is related to. You can use [LICEcap](https://www.cockos.com/licecap/) to record GIFs on macOS and Windows, and the built-in [screen recorder in GNOME](https://help.gnome.org/users/gnome-help/stable/screen-shot-record.html.en) or [SimpleScreenRecorder](https://github.com/MaartenBaert/ssr) on Linux. <!-- this should only be included if the project has a GUI -->
- **Explain why this enhancement would be useful** to most Collab Digital Twins users. You may also want to point out the other projects that solved it better and which could serve as inspiration.

<!-- You might want to create an issue template for enhancement suggestions that can be used as a guide and that defines the structure of the information to be included. If you do so, reference it here in the description. -->

### Your First Code Contribution

The full setup and workflow live in the documentation — see [Dev Environment Setup](https://docs.collabdt.org/docs/contributing/dev-environment) and [Git Workflow](https://docs.collabdt.org/docs/contributing/git-workflow). In short:

1. Set up your local environment (see [Dev Environment Setup](https://docs.collabdt.org/docs/contributing/dev-environment)). Note: this library renders inside the CDT platform — validate your change with the unit test suite (`yarn test:unit`); maintainers exercise every PR inside the platform during review.
2. **Fork** the repository and clone your fork locally; install dependencies with `yarn install`.
3. Create a feature branch off **`dev`** (the integration branch), named after your feature or issue.
4. Make your change, then run the linter and tests before committing:
   - `yarn lint`
   - `yarn test:unit`
5. Commit using the [Conventional Commits convention](#commit-messages), push to your fork, and open a pull request **against `dev`** with a clear description of what changed and why.
6. On your first pull request you will be asked to accept the [Contributor License Agreement](CLA.md) — see [Contributor Terms](#contributor-terms).

`main` is the production branch: only maintainers merge `dev` into `main` and publish releases to npm (release automation via `semantic-release` is being set up — until it lands, maintainers publish manually from `main`). See [TESTING.md](TESTING.md) for the full testing guide.

### Improving The Documentation

Project documentation lives in the docs repository ([github.com/CollabDigitalTwins/docs](https://github.com/CollabDigitalTwins/docs), published at [docs.collabdt.org](https://docs.collabdt.org)). To propose a change, edit or add the relevant `.md` file under `docs/`, follow the existing page templates, and open a pull request against `main`. Small fixes such as typos or broken links don't need a prior issue. In-repo docs (this file, the [README](README.md), and inline comments) follow the same pull-request workflow as code.

## Styleguides
### Commit Messages

CDT follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification, which `semantic-release` uses to determine version bumps automatically. Use a short, imperative subject:

```
<type>(<scope>): <short description>
```

| Type | Version bump | Example |
|---|---|---|
| `fix` | patch | `fix(api): handle null responses from user endpoint` |
| `feat` | minor | `feat(map): add layer opacity control` |
| `perf` | patch | `perf(viewer): reduce re-renders on tile load` |
| `build`, `ci`, `docs`, `refactor`, `test` | no release | `docs(readme): update setup instructions` |
| `BREAKING CHANGE:` in the footer (or `!` after the type) | major | `feat!: migrate auth to Auth.js` |

Keep the subject under ~72 characters and use the body to explain the *why* when it isn't obvious. See [Git Workflow → Commit message convention](https://docs.collabdt.org/docs/contributing/git-workflow#commit-message-convention) for the full reference.

## Join The Project Team

Collab Digital Twins is stewarded by a Canadian not-for-profit. If you would like to take on a larger or ongoing role — maintaining a subsystem, triaging issues, or joining the core team — reach out via [collabdt.org](https://collabdt.org/En/contact) or **[info@collabdt.org](mailto:info@collabdt.org)** after a few merged contributions.

<!-- omit in toc -->
## Attribution
This guide is based on the [contributing.md](https://contributing.md/generator)!
