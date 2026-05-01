# Contributor’s Guide

This guide is aimed at developers that contribute to **Unwrap**.

Check out [Getting started](./docs/guides/Getting%20started.md) for a detailed guide on getting started with Unwrap.

## Contribution Workflow

We follow a standard **Feature Branch** workflow.

### 1. Find an Issue

Check out the **Issues** tab. If you want to build something new, please open a **Proposal Issue** first.

### 2. Create a Branch

Choose a descriptive name for your branch:
e.g.:

- `feat/add-spotify-sync`
- `fix/worker-lock-timeout`
- `docs/update-readme`

### 3. Coding Standards

- **Style:** We use Prettier for formatting.
- **Testing:** Ensure your changes don’t break existing logic. Run `bun test`.
- **Atomic Commits:** Keep commits small and focused on a single change.

### 4. Open a Pull Request

When you're ready, submit a PR to the `main` branch.

**Your PR should include:**

- A clear description of the changes.
- A link to the related issue (e.g., `Closes #123`).

---

## Testing Guidelines

- **Unit Tests:** For utility functions and business logic.
- **Integration Tests:** For API endpoints and database interactions.
- **Worker Tests:** For BullMQ logic and background processing.

To run the test suite:

```bash
bun run test
```

## Code of Conduct

To maintain a healthy and welcoming community, we expect all contributors to **be kind, professional and respect different viewpoints.**

## Communication

- **Slack** For general questions and brainstorming.
- **Issues:** For bug reports and feature requests.

### Need Help?

If you get stuck at any point, don't hesitate to reach out in the PR comments or open a discussion.

---
