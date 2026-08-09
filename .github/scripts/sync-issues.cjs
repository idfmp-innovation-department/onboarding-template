/**
 * Copies labels, milestones and issues from the onboarding template repository
 * into this one.
 *
 * Two modes, set via the MODE env var:
 *   bootstrap — first run. Refuses if this repo already has program issues.
 *   sync      — creates anything new in the template and updates issues whose
 *               text has changed. Never deletes, never closes, never reopens.
 *
 * Issues are matched on the section number at the start of the title ("4.4:"),
 * not on issue number, so the two repos can drift out of numeric alignment
 * without breaking the mapping.
 */

const KEY = /^(\d+\.\d+)\s*[:.]/;

// Issue bodies here are mostly task lists, and ticking a box rewrites the
// body. So checkbox state is the trainee's progress, not part of the spec:
// it never counts as a difference, and it survives an update.
const CB = /^(\s*(?:[-*]|\d+\.)\s*\[)[xX ](\].*)$/;
const isTicked = (line) => /^\s*(?:[-*]|\d+\.)\s*\[[xX]\]/.test(line);
const cbText = (line) => {
  const m = CB.exec(line);
  return m ? m[2].slice(1).trim() : null;
};
const untick = (s) =>
  (s || "")
    .split("\n")
    .map((l) => l.replace(CB, "$1 $2"))
    .join("\n");

/** Re-apply the ticks from `oldBody` onto matching checkbox lines in `newBody`. */
const carryTicks = (newBody, oldBody) => {
  const ticked = new Set(
    (oldBody || "")
      .split(/\r\n?|\n/)
      .filter(isTicked)
      .map(cbText)
      .filter(Boolean)
  );
  if (ticked.size === 0) return newBody;
  return (newBody || "")
    .split("\n")
    .map((l) => {
      const t = cbText(l);
      return t && ticked.has(t) ? l.replace(CB, "$1x$2") : l;
    })
    .join("\n");
};

const norm = (s) => (s || "").replace(/\r\n?/g, "\n").trimEnd();
const normBody = (s) => untick(norm(s));
const keyOf = (title) => {
  const m = KEY.exec(title || "");
  return m ? m[1] : null;
};
const sameLabels = (a, b) => {
  const x = [...a].sort().join("|");
  const y = [...b].sort().join("|");
  return x === y;
};

module.exports = async ({ github, context, core }) => {
  const mode = process.env.MODE || "sync";
  const dryRun = process.env.DRY_RUN === "true";
  const includeClosed = process.env.INCLUDE_CLOSED === "true";
  const templateSlug = process.env.TEMPLATE_REPO;

  if (!templateSlug || !templateSlug.includes("/")) {
    core.setFailed(`TEMPLATE_REPO must be "owner/repo", got "${templateSlug}"`);
    return;
  }

  const [tplOwner, tplRepo] = templateSlug.split("/");
  const { owner, repo } = context.repo;

  if (owner === tplOwner && repo === tplRepo) {
    core.setFailed(
      "This workflow is running inside the template repository itself. " +
        "Run it from your own repository, created via 'Use this template'."
    );
    return;
  }

  const log = [];
  const say = (line) => {
    core.info(line);
    log.push(line);
  };

  say(`Source:      ${templateSlug}`);
  say(`Destination: ${owner}/${repo}`);
  say(`Mode:        ${mode}${dryRun ? " (dry run — nothing will be written)" : ""}`);
  say("");

  // ---------------------------------------------------------------- fetch

  const [tplLabels, tplMilestones, tplIssuesRaw] = await Promise.all([
    github.paginate(github.rest.issues.listLabelsForRepo, {
      owner: tplOwner,
      repo: tplRepo,
      per_page: 100,
    }),
    github.paginate(github.rest.issues.listMilestones, {
      owner: tplOwner,
      repo: tplRepo,
      state: "all",
      per_page: 100,
    }),
    github.paginate(github.rest.issues.listForRepo, {
      owner: tplOwner,
      repo: tplRepo,
      state: "all",
      per_page: 100,
    }),
  ]);

  const tplIssues = tplIssuesRaw
    .filter((i) => !i.pull_request && keyOf(i.title))
    .sort((a, b) => a.number - b.number);

  if (tplIssues.length === 0) {
    core.setFailed(
      `No program issues found in ${templateSlug}. Titles must start with a ` +
        `section number, e.g. "1.1: Environment Setup".`
    );
    return;
  }

  const [ownLabels, ownMilestones, ownIssuesRaw] = await Promise.all([
    github.paginate(github.rest.issues.listLabelsForRepo, {
      owner,
      repo,
      per_page: 100,
    }),
    github.paginate(github.rest.issues.listMilestones, {
      owner,
      repo,
      state: "all",
      per_page: 100,
    }),
    github.paginate(github.rest.issues.listForRepo, {
      owner,
      repo,
      state: "all",
      per_page: 100,
    }),
  ]);

  const ownIssues = ownIssuesRaw.filter((i) => !i.pull_request && keyOf(i.title));
  const byKey = new Map(ownIssues.map((i) => [keyOf(i.title), i]));

  if (mode === "bootstrap" && byKey.size > 0) {
    core.setFailed(
      `This repository already has ${byKey.size} program issues. Bootstrap has ` +
        `already been run — use the "Sync from template" workflow instead.`
    );
    return;
  }

  let created = 0;
  let updated = 0;

  // --------------------------------------------------------------- labels

  const ownLabelByName = new Map(ownLabels.map((l) => [l.name, l]));

  for (const l of tplLabels) {
    const mine = ownLabelByName.get(l.name);
    if (!mine) {
      say(`label + ${l.name}`);
      if (!dryRun) {
        await github.rest.issues.createLabel({
          owner,
          repo,
          name: l.name,
          color: l.color,
          description: l.description || "",
        });
      }
    } else if (
      mine.color !== l.color ||
      (mine.description || "") !== (l.description || "")
    ) {
      say(`label ~ ${l.name}`);
      if (!dryRun) {
        await github.rest.issues.updateLabel({
          owner,
          repo,
          name: l.name,
          color: l.color,
          description: l.description || "",
        });
      }
    }
  }

  // ----------------------------------------------------------- milestones

  const ownMsByTitle = new Map(ownMilestones.map((m) => [m.title, m]));

  for (const m of [...tplMilestones].sort((a, b) => a.number - b.number)) {
    const mine = ownMsByTitle.get(m.title);
    if (!mine) {
      say(`milestone + ${m.title}`);
      if (!dryRun) {
        const { data } = await github.rest.issues.createMilestone({
          owner,
          repo,
          title: m.title,
          description: m.description || "",
        });
        ownMsByTitle.set(m.title, data);
      } else {
        ownMsByTitle.set(m.title, { number: -1, title: m.title });
      }
    } else if ((mine.description || "") !== (m.description || "")) {
      say(`milestone ~ ${m.title}`);
      if (!dryRun) {
        await github.rest.issues.updateMilestone({
          owner,
          repo,
          milestone_number: mine.number,
          description: m.description || "",
        });
      }
    }
  }

  // --------------------------------------------------------------- issues

  for (const t of tplIssues) {
    const key = keyOf(t.title);
    const labels = t.labels.map((l) => (typeof l === "string" ? l : l.name));
    const msTitle = t.milestone ? t.milestone.title : null;
    const ms = msTitle ? ownMsByTitle.get(msTitle) : null;
    const msNumber = ms && ms.number > 0 ? ms.number : undefined;

    if (msTitle && !ms) {
      say(`!! ${key} references milestone "${msTitle}" which does not exist here`);
    }

    const mine = byKey.get(key);

    if (!mine) {
      say(`issue  + ${t.title}`);
      created++;
      if (!dryRun) {
        await github.rest.issues.create({
          owner,
          repo,
          title: t.title,
          body: t.body || "",
          labels,
          milestone: msNumber,
        });
      }
      continue;
    }

    if (mode === "bootstrap") continue;

    if (mine.state === "closed" && !includeClosed) {
      continue;
    }

    const mineLabels = mine.labels.map((l) => (typeof l === "string" ? l : l.name));
    const changes = {};
    if (mine.title !== t.title) changes.title = t.title;
    if (normBody(mine.body) !== normBody(t.body)) {
      changes.body = carryTicks(norm(t.body), mine.body);
    }
    if (!sameLabels(mineLabels, labels)) changes.labels = labels;
    if ((mine.milestone ? mine.milestone.title : null) !== msTitle) {
      changes.milestone = msNumber === undefined ? null : msNumber;
    }

    if (Object.keys(changes).length === 0) continue;

    say(
      `issue  ~ #${mine.number} ${t.title}  [${Object.keys(changes).join(", ")}]` +
        (mine.state === "closed" ? "  (closed)" : "")
    );
    updated++;
    if (!dryRun) {
      await github.rest.issues.update({
        owner,
        repo,
        issue_number: mine.number,
        ...changes,
      });
    }
  }

  // -------------------------------------------------------------- orphans

  const tplKeys = new Set(tplIssues.map((i) => keyOf(i.title)));
  for (const [key, mine] of byKey) {
    if (!tplKeys.has(key)) {
      say(`issue  ? #${mine.number} ${mine.title} — not in the template (left alone)`);
    }
  }

  say("");
  say(`${created} created, ${updated} updated.`);
  if (dryRun) say("Dry run — nothing was written. Re-run with dry run unchecked.");

  await core.summary
    .addHeading(mode === "bootstrap" ? "Bootstrap" : "Sync from template", 2)
    .addCodeBlock(log.join("\n"), "text")
    .write();
};
