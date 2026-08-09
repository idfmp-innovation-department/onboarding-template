# Onboarding — Setup

This repository is a **template**. Do not work in it, and do not clone it directly. Follow the four steps below to create your own copy, then start with issue 1.1.

Everything here is setup instructions. It gets replaced in issue 1.3 with a real README for the project you are about to build.

---

## 1. Create your repository

Click **Use this template → Create a new repository** at the top of this page.

- **Owner** — the same organization this template lives in.
- **Name** — `todoboard-yourname`, unless your mentor has told you otherwise.
- **Visibility** — Private.

Do not fork, and do not tick "Include all branches."

## 2. Run the bootstrap workflow

"Use this template" copies the files but **not** the issues, and the issues are the program. You have to create them.

In **your new repository** — not this one:

1. Open the **Actions** tab.
2. If you are asked to enable workflows, enable them.
3. Select **Bootstrap onboarding** in the left sidebar.
4. Click **Run workflow**.

It takes a couple of minutes and creates the labels, the milestones, and all 42 issues. When it finishes, open the **Issues** tab and confirm you see issue `1.1: Environment Setup` at the top and `9.6: Checkpoint - Final Review` at the bottom.

Run this once. Running it twice will create everything a second time.

## 3. Clone it

```bash
git clone https://github.com/idfmp-innovation-department/todoboard-yourname.git
cd todoboard-yourname
code .
```

You will not have `git` or VS Code yet if you are starting from scratch — that is what issue 1.1 is for. Come back to this step once you do.

When VS Code opens the folder it will offer to install a set of recommended extensions. Accept. Every extension the program relies on is in that list, including ones you will not need until much later.

## 4. Start

Open issue **1.1** and work down in order. Each issue tells you what to do and what "done" means.

---

## How the work runs

**One branch per issue.** Name it after the issue — `1.3-first-pr`, `4.4-todo-crud`. Branch from `main`, open a pull request back into `main` when the issue is done.

**Never commit directly to `main`.**

**Your mentor closes issues, not you.** Do not write "Closes #12" or "Fixes #12" in a pull request description — it closes the issue automatically on merge, before anyone has reviewed the work against it.

**Expect review comments, and address them before moving on.** Push follow-up commits to the same branch. Do not open the next issue's branch on top of unreviewed work.

**Never force-push a branch that is under review.** It detaches every existing comment from the code it was about.

**Ask.** There are no scheduled meetings and no standing check-ins. That is not an invitation to stay stuck — it means you decide when you need help. Ask as soon as you are genuinely blocked, and ask about anything an issue leaves unclear.

## Pacing

Nine Parts, 42 issues, roughly three months. There are no deadlines and no weekly targets. A Part closes when its checkpoint is done, not when a calendar says so.

The checkpoint issue at the end of each Part is a conversation with your mentor, not a form to tick. It gates the next Part — finish it before moving on.

## A note on AI assistance

This repository ships with Copilot and the built-in editor AI features switched off, and that is deliberate.

Several issues are built around you hitting a problem before you are told what it is — a CORS error, a SQL injection you perform on yourself, an authorization check that turns out to be decorative. An autocomplete that writes the correct answer before you have understood the question removes the only part of those that teaches anything.

The point is not that these tools are bad. It is that you are about to spend three months building the judgement that makes them useful rather than dangerous, and that judgement is built by doing the work.

---

*Delete this file in issue 1.3 and write a real one.*
