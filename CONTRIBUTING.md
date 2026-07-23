# Contributing to RemitFlow Frontend

Thank you for your interest in contributing to RemitFlow! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Issue Reporting](#issue-reporting)
- [Community](#community)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:
- Be respectful and constructive in all interactions
- Focus on what is best for the community
- Show empathy towards other community members
- Accept constructive criticism gracefully

## Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Git**: Latest stable version

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/RemitFlow-Frontend.git
   cd RemitFlow-Frontend
   ```

3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/RemitFlow-Frontend.git
   ```

### Install Dependencies

```bash
npm install
```

### Run the Development Server

```bash
npm run dev
```

The app will be available at http://localhost:5173

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clear, concise commit messages (see [Commit Message Guidelines](#commit-message-guidelines))
- Keep commits focused and atomic
- Test your changes thoroughly
- Follow the [Coding Standards](#coding-standards)

### 3. Keep Your Branch Updated

Regularly sync with the upstream repository:

```bash
git fetch upstream
git rebase upstream/main
```

### 4. Run Tests

Before submitting, ensure all tests pass:

```bash
npm test                  # Run all tests
npm run test:watch        # Run tests in watch mode
npm run lighthouse        # Run Lighthouse checks
```

### 5. Build the Project

Verify the production build works:

```bash
npm run build
npm run preview
```

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm test`)
- [ ] Code follows project conventions
- [ ] No console errors or warnings
- [ ] Lighthouse checks pass (if UI changes)
- [ ] Documentation updated (if needed)
- [ ] Commits are clean and well-organized

### Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin your-branch-name
   ```

2. Open a Pull Request on GitHub with:
   - **Clear title**: Summarize the change in <70 characters
   - **Description**: Explain what, why, and how
   - **Issue reference**: Link related issues (e.g., "Fixes #123")
   - **Screenshots**: Include before/after for UI changes
   - **Testing notes**: Describe how you tested the changes

3. Respond to review feedback promptly
4. Keep the PR updated with the main branch
5. Once approved, a maintainer will merge your PR

### PR Title Format

Use conventional commit format:

```
type(scope): brief description

Examples:
feat(send-money): add multi-recipient support
fix(transfers): resolve date filter bug
docs(readme): update installation instructions
refactor(components): simplify Button component
test(integration): add transfer filter tests
```

### PR Description Template

```markdown
## Description
Brief summary of changes

## Motivation
Why is this change needed?

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
How were these changes tested?

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No breaking changes (or documented if unavoidable)
- [ ] Lighthouse checks pass (for UI changes)

Fixes #<issue-number>
```

## Coding Standards

### JavaScript/React

- Use **functional components** with hooks
- Follow **React best practices** (proper hook usage, avoid unnecessary re-renders)
- Use **descriptive variable and function names**
- Keep components **small and focused** (single responsibility)
- Add **PropTypes** or comments for component props
- Avoid **inline styles** (use CSS classes)

### CSS

- Use **plain CSS** with theme tokens (no preprocessors)
- Follow **BEM-like naming** for classes: `.component__element--modifier`
- Keep styles **scoped to components** (e.g., `Button.css` for `Button.jsx`)
- Use **CSS custom properties** for theming (see `src/index.css`)
- Ensure **44×44px minimum touch targets** for interactive elements (WCAG 2.5.5)

### File Organization

```
src/
  components/     # Reusable UI components
    Button.jsx
    Button.css
    Button.stories.jsx
  pages/          # Route-level components
  services/       # API, wallet, business logic
  hooks/          # Custom React hooks
  context/        # React Context providers
  utils/          # Pure utility functions
  constants/      # Configuration and constants
```

### Code Formatting

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Line length**: Prefer <100 characters
- **Trailing commas**: Use in multi-line objects/arrays

### Accessibility

All contributions must maintain accessibility standards:
- Semantic HTML elements (`<button>`, `<nav>`, `<main>`, etc.)
- ARIA labels for icon buttons and non-text controls
- Keyboard navigation support
- Sufficient color contrast (WCAG AA minimum)
- Minimum 44×44px touch targets for interactive elements
- Proper focus management

## Testing Requirements

### Unit Tests

- Test **pure functions** in `src/utils/`, `src/lib/`
- Test **custom hooks** with React Testing Library
- Mock external dependencies (API calls, localStorage, etc.)

### Integration Tests

- Test **user flows** (e.g., send money, filter transfers)
- Test **component interactions** with user events
- Verify **state updates** and side effects
- Cover **error scenarios** and edge cases

### Writing Tests

Place tests in `test/` directory:

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from '../src/components/Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Touch Target Tests

For new interactive components, ensure touch target compliance:

```css
/* Button.css */
.button {
  min-width: 44px;
  min-height: 44px;
  /* ... other styles */
}
```

Tests in `test/touch-targets.test.js` will verify this automatically.

## Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, config)
- `perf`: Performance improvements

### Examples

```
feat(send-money): add recipient validation

Validate recipient address format before enabling send button.
Displays inline error message for invalid addresses.

Closes #42
```

```
fix(transfers): correct date range filter logic

The "Last 30 days" filter was incorrectly calculating start date.
Now uses proper UTC date comparison.

Fixes #89
```

## Issue Reporting

Before opening a new issue:

1. **Search existing issues** to avoid duplicates
2. **Use issue templates**: Choose Bug Report or Feature Request
3. **Provide details**: Follow the template prompts
4. **Be responsive**: Reply to questions from maintainers

### Bug Reports Should Include

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Screenshots (if applicable)

### Feature Requests Should Include

- Problem statement (what need does this address?)
- Proposed solution
- Alternative approaches considered
- Mockups or examples (if applicable)

See [Issue Triage Process](.github/ISSUE_TRIAGE.md) for more details.

## Community

### Getting Help

- **GitHub Discussions**: Ask questions and share ideas
- **Issues**: Report bugs and request features
- **Pull Requests**: Contribute code and documentation

### Recognition

Contributors are recognized in:
- GitHub Contributors page
- Release notes (for significant contributions)
- Project README (for major features)

## Questions?

If you have questions about contributing:
1. Check existing documentation (README, this file)
2. Search closed issues and PRs
3. Ask in GitHub Discussions
4. Reach out to maintainers

Thank you for contributing to RemitFlow! 🚀
