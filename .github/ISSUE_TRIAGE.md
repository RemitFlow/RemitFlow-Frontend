# Issue Triage Process

This document outlines the issue tracking and triage workflow for the RemitFlow Frontend project.

## Triage Cadence

- **Daily**: Check for new issues with `status: needs-triage` label
- **Weekly**: Review `status: awaiting-response` issues (ping reporters if >7 days old)
- **Bi-weekly**: Review `status: accepted` backlog and re-prioritize as needed
- **Monthly**: Close stale `status: awaiting-response` issues (>30 days without response)

## Triage Steps

### 1. Initial Review (within 24-48 hours)

When a new issue is created:

1. **Verify completeness**: Ensure all required information is provided
   - If incomplete, add `status: awaiting-response` and request details
   - If complete, proceed to step 2

2. **Check for duplicates**: Search existing issues
   - If duplicate, add `status: duplicate`, link to original, and close
   - If unique, proceed to step 3

3. **Validate the issue**:
   - For bugs: Can you reproduce it? Does it affect production behavior?
   - For features: Does it align with project goals? Is scope reasonable?
   - If invalid, add `status: wontfix`, explain reasoning, and close
   - If valid, proceed to step 4

4. **Categorize and label**:
   - Add appropriate `type:` label (bug, feature, documentation, etc.)
   - Add `component:` label (UI, routing, wallet, api, testing, build)
   - Add `priority:` label based on impact assessment (see below)
   - Add special labels if applicable (`good first issue`, `help wanted`, `breaking change`)

5. **Change status**: Replace `status: needs-triage` with `status: accepted`

### 2. Priority Assessment

Use this matrix to determine priority:

| Priority | Criteria | Response Time |
|----------|----------|---------------|
| **Critical** | Security vulnerability, data loss, app crash, blocks main features | Immediate (same day) |
| **High** | Significant UX degradation, broken feature, accessibility issue | 1-3 days |
| **Medium** | Minor bugs, feature enhancements, performance improvements | 1-2 weeks |
| **Low** | Nice-to-have features, minor refactors, cosmetic issues | Best effort |

### 3. Assignment

- Auto-assign `good first issue` items to willing contributors
- Assign `priority: critical` and `priority: high` items to core maintainers
- Leave `priority: medium` and `priority: low` unassigned unless someone volunteers

### 4. Monitoring

Track these metrics monthly:
- Time to first triage (target: <48 hours)
- Open issues by priority
- Age of oldest `status: accepted` issue
- Stale issue count

## Label Definitions

### Type Labels

| Label | Description | Usage |
|-------|-------------|-------|
| `type: bug` | Something isn't working | Production bugs, errors, crashes |
| `type: feature` | New functionality | Enhancements, new features |
| `type: documentation` | Documentation updates | README, guides, inline docs |
| `type: chore` | Maintenance tasks | Dependencies, tooling, config |
| `type: performance` | Performance improvements | Optimization, bundle size |
| `type: accessibility` | Accessibility issues | WCAG compliance, a11y |
| `type: refactor` | Code restructuring | No behavior change |

### Priority Labels

| Label | Description | SLA |
|-------|-------------|-----|
| `priority: critical` | Must fix immediately | Same day |
| `priority: high` | Should fix soon | 1-3 days |
| `priority: medium` | Normal priority | 1-2 weeks |
| `priority: low` | Nice to have | Best effort |

### Status Labels

| Label | Description | Next Action |
|-------|-------------|-------------|
| `status: needs-triage` | Awaiting initial review | Triage within 48h |
| `status: awaiting-response` | Waiting for reporter | Ping after 7 days, close after 30 |
| `status: accepted` | Ready to work on | Assign or wait for volunteer |
| `status: in-progress` | Being worked on | Monitor PR progress |
| `status: blocked` | Blocked by dependencies | Document blocker, check weekly |
| `status: wontfix` | Won't be addressed | Explain and close |
| `status: duplicate` | Duplicate issue | Link original and close |

### Component Labels

| Label | Description |
|-------|-------------|
| `component: UI` | User interface components |
| `component: routing` | React Router navigation |
| `component: wallet` | Stellar wallet integration |
| `component: api` | API services, data fetching |
| `component: testing` | Tests and test infrastructure |
| `component: build` | Build process, Vite config |

### Special Labels

| Label | Description |
|-------|-------------|
| `good first issue` | Good for newcomers |
| `help wanted` | Extra help needed |
| `breaking change` | Introduces breaking change |
| `dependencies` | Dependency updates |

## Applying Labels

### Using GitHub CLI

```bash
# Install labels from configuration
gh label create --force -R <owner>/<repo> -f .github/labels.yml

# Apply label to an issue
gh issue edit 123 --add-label "type: bug,priority: high"
```

### Using GitHub UI

1. Navigate to issue
2. Click "Labels" in right sidebar
3. Select appropriate labels from dropdown

## Escalation

For issues requiring immediate attention:
1. Add `priority: critical` label
2. Notify maintainers via Slack/Discord/Email
3. Create incident report if needed
4. Track resolution in dedicated channel

## Closing Issues

Issues should be closed when:
- ✅ Fixed: PR merged addressing the issue
- ✅ Won't fix: Not aligned with project goals (add explanation)
- ✅ Duplicate: Link to original issue
- ✅ Stale: No response after 30 days
- ✅ Invalid: Cannot reproduce, insufficient info after follow-up
- ✅ Resolved: Reporter confirms fix works

Always add a closing comment explaining the reason for closure.

## Review Cycles

### Weekly Triage Meeting (Optional)

For active projects, hold a weekly 30-minute triage meeting:
1. Review new `status: needs-triage` issues
2. Check status of `priority: high` and `priority: critical` items
3. Identify blockers on `status: in-progress` items
4. Reassess priorities if needed

### Monthly Cleanup

Last Friday of each month:
1. Close stale `status: awaiting-response` issues (>30 days)
2. Review and re-prioritize old `status: accepted` items
3. Archive or document blocked items with no path forward
4. Update this triage document based on lessons learned

## Templates and Automation

### Automated Workflows (Future Enhancement)

Consider setting up GitHub Actions for:
- Auto-label based on issue title/content patterns
- Auto-close stale issues after 30 days of inactivity
- Auto-assign to project board based on labels
- Notify team on Slack for `priority: critical` issues

### Response Templates

Use GitHub's saved replies for common scenarios:
- Request for reproduction steps
- Cannot reproduce
- Duplicate issue
- Feature out of scope
- Thanks for contributing

## Questions?

For questions about the triage process, reach out to project maintainers or open a discussion.
