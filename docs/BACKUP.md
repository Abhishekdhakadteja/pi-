# Database backup (free plan)

While Clinic Easy runs on the Supabase **Free** plan there are no automatic backups, so the
GitHub Action `.github/workflows/db-backup.yml` makes one twice a day (2 PM and 11 PM IST).

- What it saves: every table in `public` (clinics, patients, visits, medicines, fees, staff...)
  and the login accounts (`auth.users`, `auth.identities`).
- Where: GitHub → Actions → "Database backup" → a run → Artifacts. Each backup is kept 30 days.
- Safety: the file is encrypted with AES-256 using `BACKUP_PASSPHRASE`. Without the passphrase
  nobody can open it, even though the repository is public.
- Side benefit: each run touches the database, so the free project is never paused for inactivity.

Worst case, we lose the entries made since the last backup (at most about 15 hours).
Move to Supabase Pro (daily backups by Supabase, no pause) once about 6 clinics pay.

## One-time setup (5 minutes)

1. Supabase → project `clinicease` → **Connect** → copy the **Session pooler** connection string
   (port 5432). Put the database password in place of `[YOUR-PASSWORD]`.
   (GitHub's servers can't use the direct `db.<ref>.supabase.co` address, which is IPv6-only.)
2. Make a long random passphrase (at least 20 characters). Save it in your phone's password
   manager **and** on paper. If it is lost, the backups can't be opened.
3. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DB_URL` = the connection string from step 1
   - `BACKUP_PASSPHRASE` = the passphrase from step 2
4. GitHub → **Actions → Database backup → Run workflow**. It should turn green in 1-2 minutes
   and show one artifact.

GitHub turns off scheduled workflows in a repository with no activity for 60 days. Any push
(our normal PRs) keeps it on; if it ever stops, press **Enable workflow** on the Actions page.

## Restore (only if data is lost)

On any Linux/Mac/Cloud Shell with Postgres 17 tools (`pg_restore`) and `gpg`:

```bash
# 1. Download the artifact zip from GitHub and unzip it, then decrypt:
gpg -d -o backup.tar.gz backup-YYYY-MM-DD_HHMM.tar.gz.gpg   # asks for BACKUP_PASSPHRASE
tar -xzf backup.tar.gz                                     # gives public.dump and auth.dump

# 2. Restore into a NEW Supabase project (safer than overwriting the old one).
#    Use that project's session pooler URL:
export DB="postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
pg_restore -d "$DB" --no-owner --no-privileges --data-only auth.dump   # logins first
pg_restore -d "$DB" --no-owner --no-privileges public.dump             # tables, policies, data
```

3. In Netlify, change `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY` to the new project's values, then **Trigger deploy**.

Test a restore once into a throwaway free project before the first real clinic goes live.
