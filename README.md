# ORBIT

**Operational Repository Branch Insight Tracker**

Released under the [MIT License](LICENSE).

ORBIT is a self-hosted project-tracking interface. Git branches remain the
canonical owner of tracking YAML; ORBIT reads, validates, reports, and later
updates those sources through the authenticated Git provider user.

## Local start

```bash
npm install
npm run dev
```

The first slice includes a public-safe demo fixture and provider connection
proof of concept. It can authenticate a GitLab OAuth user or a GitHub App
user-to-server flow and fetch the authenticated profile. It does **not** yet
list repositories, read tracking YAML from a remote branch, or create commits.

## Local provider setup

Copy `.env.example` to `.env.local`, set a long random
`ORBIT_SESSION_SECRET`, then add only credentials for test applications you
own. `.env.local` is ignored by Git.

### GitLab OAuth

Create a user-owned OAuth application. For a local instance, use:

```text
Redirect URI: http://localhost:3000/api/connect/gitlab/callback
Scopes: api, read_user
```

Set its application ID and secret in `ORBIT_GITLAB_CLIENT_ID` and
`ORBIT_GITLAB_CLIENT_SECRET`. `api` is necessary for the future Repository
Files API write path; ORBIT will additionally enforce its deployment project
and path allowlists on every request.

### GitHub App

Create a GitHub App, not a classic OAuth App. For local testing, use:

```text
Homepage URL: http://localhost:3000
Callback URL: http://localhost:3000/api/connect/github/callback
Repository permissions: Contents — Read and write
Repository access: Only select repositories
```

Install it only on the isolated test repository, then set the App's client ID
and client secret in `ORBIT_GITHUB_APP_CLIENT_ID` and
`ORBIT_GITHUB_APP_CLIENT_SECRET`. The local proof uses GitHub's user-to-server
authorization flow: the user must authorize the app and the app must be
installed where the target repository lives.

After starting ORBIT, open `http://localhost:3000` and choose the provider.
The page confirms the connected account without exposing the token to browser
JavaScript. Use **Disconnect** to remove the local session.

## Production session storage

Production requires `DATABASE_URL` and a separate
`ORBIT_TOKEN_ENCRYPTION_SECRET`. The browser holds only a random, HTTP-only
session identifier. PostgreSQL holds its expiry, provider identity, and the
provider tokens encrypted with AES-256-GCM; tracking YAML is never copied to
the database.

Apply immutable migrations once the database is provisioned:

```bash
npm run db:migrate
```

For a Vercel deployment, provision a PostgreSQL integration such as Neon, let
it set `DATABASE_URL`, then run the migration against that connection before
adding provider credentials and production callback URLs.

## Docker deployment

The Docker image runs the Next.js standalone server. Supply the same production
environment contract (`ORBIT_APP_URL`, both provider credentials,
`ORBIT_SESSION_SECRET`, `ORBIT_TOKEN_ENCRYPTION_SECRET`, and `DATABASE_URL`) at
runtime; do not copy an environment file into the image.

### Server installation

The target server needs Docker, outbound HTTPS access to the selected
PostgreSQL service, GitHub, and GitLab, plus a reverse proxy that terminates
TLS. ORBIT itself does not clone or mount tracked repositories.

Clone a tagged release or a reviewed commit, then create a root-readable secret
file outside the repository. The example uses `/opt/orbit-tracker`; choose a
different deployment path if required by the host.

```bash
git clone https://github.com/uniqnodes/orbit-tracker.git /opt/orbit-tracker
cd /opt/orbit-tracker
git checkout <release-tag-or-reviewed-commit>
mkdir -p /opt/orbit-tracker/secure
chmod 700 /opt/orbit-tracker/secure
```

Create `/opt/orbit-tracker/secure/orbit.env` with one unquoted `NAME=value`
entry per line. Generate the two application secrets independently and retain
them for future container replacements; changing either one invalidates active
sessions or encrypted provider tokens.

```text
ORBIT_APP_URL=https://orbit.example.com
ORBIT_SESSION_SECRET=<long-random-secret>
ORBIT_TOKEN_ENCRYPTION_SECRET=<different-long-random-secret>
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require

ORBIT_GITLAB_BASE_URL=https://gitlab.com
ORBIT_GITLAB_CLIENT_ID=<production-client-id>
ORBIT_GITLAB_CLIENT_SECRET=<production-client-secret>
ORBIT_GITHUB_APP_CLIENT_ID=<production-client-id>
ORBIT_GITHUB_APP_CLIENT_SECRET=<production-client-secret>

ORBIT_ALLOWED_PROJECTS=gitlab:<namespace>/<project>,github:<owner>/<repository>
ORBIT_TRACKING_PATH=docs/project-tracking
```

Lock down the file before using it:

```bash
chmod 600 /opt/orbit-tracker/secure/orbit.env
```

Register these exact callback URLs in the production provider applications
before opening ORBIT to users:

```text
https://orbit.example.com/api/connect/gitlab/callback
https://orbit.example.com/api/connect/github/callback
```

Build the image, apply the immutable migration, then start the web container.
Binding the application to loopback leaves the public HTTPS entry point under
the reverse proxy's control.

```bash
docker build -t orbit-tracker .
docker run --rm --env-file /opt/orbit-tracker/secure/orbit.env orbit-tracker node db/migrate.mjs
docker run -d --name orbit-tracker --restart unless-stopped \
  --env-file /opt/orbit-tracker/secure/orbit.env \
  -p 127.0.0.1:3000:3000 orbit-tracker
```

Configure the reverse proxy to forward HTTPS traffic for `orbit.example.com`
to `http://127.0.0.1:3000`. Preserve the `Host` and `X-Forwarded-Proto: https`
headers. Verify the deployment through the public HTTPS URL, then complete one
GitLab and one GitHub connection test.

`orbit.env` must use Docker environment-file format: do not pass the quoted
dotenv file produced by `vercel env pull` directly to Docker; Docker treats
those quotes as literal characters. Each deployment needs its own
`ORBIT_APP_URL` and matching provider callback registrations.

### Updating a server deployment

Keep the secret file unchanged, unless a deliberate credential rotation is
being performed. Build the new image, run migrations, then replace the named
container. Check the public URL and provider connection flow after the restart.

```bash
cd /opt/orbit-tracker
git fetch --tags origin
git checkout <next-release-tag-or-reviewed-commit>
docker build -t orbit-tracker .
docker run --rm --env-file /opt/orbit-tracker/secure/orbit.env orbit-tracker node db/migrate.mjs
docker stop orbit-tracker
docker rm orbit-tracker
docker run -d --name orbit-tracker --restart unless-stopped \
  --env-file /opt/orbit-tracker/secure/orbit.env \
  -p 127.0.0.1:3000:3000 orbit-tracker
```

## Core boundaries

- The browser never receives a provider token through page data or browser
  JavaScript. It receives only an opaque, HTTP-only session identifier. In
  local development without `DATABASE_URL`, sessions intentionally use process
  memory; production requires PostgreSQL and encrypted credentials.
- The application will never clone tracked projects to its server.
- PostgreSQL will hold only session, encrypted delegated-token, and audit data;
  tracking records stay in Git YAML.
- GitLab/GitHub project, branch, and path allowlists belong to deployment
  config, not a tracked project's manifest.
