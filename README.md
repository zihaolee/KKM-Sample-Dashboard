# KKM Switch Deployment Dashboard

Customer-facing deployment progress tracker for KKM Network Switch Phase 2.

## Files

| File | Purpose |
|---|---|
| `index.html` | Customer dashboard (read-only) |
| `edit.html` | Internal progress editor (password protected) |
| `data.json` | Deployment data — commit this to update the live dashboard |

## Setup (one-time)

### 1. Create GitHub repo

```bash
git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kkm-deployment-tracker.git
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Source: **Deploy from branch** → `main` → `/ (root)`
3. Click Save

Your URLs will be:
- **Customer dashboard:** `https://YOUR_USERNAME.github.io/kkm-deployment-tracker/`
- **Internal editor:** `https://YOUR_USERNAME.github.io/kkm-deployment-tracker/edit.html`

> Default password for edit.html: `boffo2024` — change this in edit.html line 1 before publishing.

---

## Updating progress (daily workflow)

1. Open `edit.html` in your browser
2. Enter the password
3. Update installed counts per site
4. Click **Generate data.json** → **Download data.json**
5. Replace `data.json` in this folder
6. Run:

```bash
git add data.json
git commit -m "Progress update $(date +%Y-%m-%d)"
git push
```

Customer dashboard auto-refreshes within ~60 seconds.

---

## Changing the password

Open `edit.html`, find this line near the top of the `<script>` block:

```js
const ACCESS_PW = '';
```

Change `boffo2024` to whatever you want, then push.
