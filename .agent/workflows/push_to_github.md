---
description: How to push an existing project to GitHub
---

# Push Project to GitHub

This workflow guides you through the process of pushing your local project to a GitHub repository.

## Prerequisites
- You must have a GitHub account.
- You must have Git installed locally.
- You should have created a **new empty repository** on GitHub (without initializing it with README, license, or .gitignore).

## Steps

1.  **Initialize Git** (Already done!)
    - `git init`

2.  **Add Files to Staging**
    - `git add .`

3.  **Commit Changes**
    - `git commit -m "Initial commit"`

4.  **Rename Branch** (Optional but recommended)
    - `git branch -M main`

5.  **Add Remote Repository**
    - Link your local repo to the GitHub repo.
    - `git remote add origin https://github.com/bhanu2191/SLDJ_Institute.git`

6.  **Push to GitHub**
    - `git push -u origin main`

> [!NOTE]
> If you encounter authentication issues, you may need to sign in to GitHub via the browser or use a Personal Access Token (PAT).
