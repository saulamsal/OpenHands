# Git Management Guide for OpenHands Fork

This guide documents our Git workflow for maintaining a fork of OpenHands with custom modifications.

## 🎯 Our Goal

Maintain a clean separation between:
1. **Upstream OpenHands code** (on `main` branch)
2. **Our custom modifications** (on `sl-custom` branch)

This allows us to:
- Keep receiving updates from the official OpenHands project
- Maintain our custom documentation and modifications
- Avoid merge conflicts
- Have a clear history of what's ours vs. what's upstream

## 📊 Repository Structure

```
GitHub Fork: https://github.com/saulamsal/OpenHands
├── main branch (mirrors upstream/main - NO custom changes here!)
└── sl-custom branch (contains all our customizations)

Upstream: https://github.com/All-Hands-AI/OpenHands
└── main branch (official OpenHands code)
```

## 🔧 Initial Setup (Already Done)

```bash
# 1. Fork was created on GitHub
# 2. Added upstream remote
git remote add upstream https://github.com/All-Hands-AI/OpenHands.git

# 3. Created custom branch
git checkout -b sl-custom

# 4. Added our custom docs to sl-custom branch
git add internal_docs/
git commit -m "Add internal documentation"
git push -u origin sl-custom
```

## 🔄 Regular Maintenance Workflow

### Weekly/Monthly: Sync with Upstream

Run these commands to keep up-to-date with official OpenHands:

```bash
# Step 1: Update main branch with upstream
git checkout main
git fetch upstream
git merge upstream/main
git push origin main

# Step 2: Merge updates into our custom branch
git checkout sl-custom
git merge main
# Resolve any conflicts if they occur
git push origin sl-custom
```

### When Making Custom Changes

Always make changes on `sl-custom` branch:

```bash
# 1. Ensure you're on the right branch
git checkout sl-custom

# 2. Make your changes
# Edit files, add features, update docs, etc.

# 3. Commit and push
git add .
git commit -m "Description of custom changes"
git push origin sl-custom
```

## ⚠️ Important Rules

### NEVER Do This:
- ❌ Don't commit custom changes to `main` branch
- ❌ Don't push directly to upstream repository
- ❌ Don't delete the `sl-custom` branch
- ❌ Don't merge `sl-custom` into `main`

### ALWAYS Do This:
- ✅ Keep `main` as a clean mirror of upstream
- ✅ Make all customizations on `sl-custom`
- ✅ Regularly sync with upstream to avoid conflicts
- ✅ Test after merging upstream changes

## 🚨 Handling Merge Conflicts

If conflicts occur when merging `main` into `sl-custom`:

```bash
# 1. The merge will stop and show conflicts
git status  # Shows conflicted files

# 2. Open conflicted files and resolve manually
# Look for <<<<<<< HEAD and >>>>>>> markers

# 3. After resolving, mark as resolved
git add <resolved-files>

# 4. Complete the merge
git commit
git push origin sl-custom
```

## 📋 Quick Reference Commands

```bash
# Check current branch
git branch --show-current

# Check remotes
git remote -v

# See latest commits on all branches
git log --oneline --graph --all -10

# Check if main is up-to-date with upstream
git checkout main
git fetch upstream
git status

# Compare branches
git diff main..sl-custom --name-only  # See changed files
git log main..sl-custom --oneline     # See commits unique to sl-custom
```

## 🤖 AI Assistant Instructions

When an AI assistant reads this file, it should:

1. **Check current branch**: Ensure work is done on `sl-custom`
2. **Before making changes**: Pull latest from `sl-custom`
3. **For upstream sync**: Follow the "Regular Maintenance Workflow" section
4. **For custom changes**: Only commit to `sl-custom` branch
5. **If conflicts arise**: Help resolve them while preserving custom modifications

### AI Workflow Example:

```bash
# Start of session - check status
git branch --show-current
git status
git fetch --all

# If need to sync with upstream
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
git checkout sl-custom
git merge main
git push origin sl-custom

# For making changes
git checkout sl-custom
# ... make changes ...
git add .
git commit -m "Descriptive message"
git push origin sl-custom
```

## 📊 Current Custom Modifications

As of last update, `sl-custom` branch contains:

1. **internal_docs/** - All internal documentation
   - git_management_guide.md (this file)
   - local_development_guide.md
   - deployment_guide.md
   - architecture_guide.md
   - guide_for_php_react_developers.md
   - README.md

2. **Future modifications** - Add new items here as they're created

## 🔮 Long-term Maintenance

### Monthly Tasks:
1. Sync with upstream (see workflow above)
2. Review and update this guide if needed
3. Check for any deprecated features in our customizations
4. Test that custom features still work after updates

### Quarterly Tasks:
1. Review if our customizations should be contributed upstream
2. Clean up any obsolete custom code
3. Update documentation to reflect any changes

## 💡 Tips for AI Assistants

1. **Always verify branch before changes**: `git branch --show-current`
2. **Use descriptive commit messages**: Include what changed and why
3. **Check for upstream updates**: Before major work sessions
4. **Preserve custom docs**: Never delete internal_docs/ during merges
5. **Test after merges**: Ensure both upstream and custom features work

## 🆘 Emergency Recovery

If something goes wrong:

```bash
# View recent actions
git reflog

# Recover to a previous state
git reset --hard <commit-hash>

# If sl-custom is broken, create from last good state
git checkout main
git checkout -b sl-custom-recovery
git cherry-pick <commits-from-old-sl-custom>
```

---

**Remember**: The goal is to maintain our customizations (`sl-custom`) while staying current with upstream (`main`). This guide ensures we can do both indefinitely!