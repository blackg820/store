# Task Prompt Template

Before editing, read:

- `Skills.sh`
- `.ai/PROJECT_CONTEXT.md`
- `.ai/SKILLS.md`
- `.ai/FILE_INDEX.md`
- `.ai/AGENT_RULES.md`
- `.ai/FEATURE_MAP.md`
- Any related `.ai` file for this task

Task:

`[WRITE TASK HERE]`

Rules:

- Do not re-analyze the whole project.
- Use `.ai/FILE_INDEX.md` to locate relevant files.
- Work only on files related to the task.
- Make minimal safe changes.
- Preserve existing behavior unless explicitly requested.
- Follow project skills and rules from `Skills.sh` and `.ai/SKILLS.md`.
- Check tenant isolation, permissions, validation, and subscription limits.
- Do not add translated owner-input fields.
- Update related `.ai` documentation after changes.
- Add a short note to `.ai/CHANGELOG_AI.md`.
