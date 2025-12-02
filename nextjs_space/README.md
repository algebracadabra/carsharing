# Carsharing App

This is a Next.js 14 carsharing management app backed by PostgreSQL and Prisma.

## 1. Prerequisites

- Node.js (recommended: v18 or v20)
- npm (comes with Node)
- PostgreSQL 14+ running locally
- Git (optional, for version control)

> All commands below are meant to be run from the project root:
>
> ```bash
> /home/dsommer/projects/carsharing/nextjs_space
> ```

---

## 2. Install dependencies

```bash
npm install
```

This installs all Node dependencies defined in `package.json`.

---

## 3. Database setup (PostgreSQL)

### 3.1 Install PostgreSQL (if not installed)

On Ubuntu / WSL:

```bash
sudo apt update
sudo apt install postgresql postgresql-client
```

This will start a local Postgres server (cluster `14/main`) and install the client tools.

### 3.2 Create database

Create the database used by this app (as the `postgres` system user):

```bash
sudo -u postgres createdb carsharing
```

### 3.3 Set password for `postgres` DB user

Set (or update) the password for the `postgres` database role:

```bash
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'yourpassword';"
```

Remember this password; it is used in `DATABASE_URL`.

---

## 4. Environment variables

Environment variables are stored in `.env` in the project root.

Example configuration for local development:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/carsharing?schema=public"
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
AWS_PROFILE=<your-aws-profile>
AWS_REGION=<your-aws-region>
AWS_BUCKET_NAME=<your-bucket-name>
AWS_FOLDER_PREFIX=<your-folder-prefix>/
NEXTAUTH_URL=http://localhost:3000
```

Notes:
- Replace `yourpassword` with the actual Postgres password you set.
- Replace `your_nextauth_secret` with a strong random string (can be generated with `openssl rand -base64 32`).
- The AWS values are only needed if you use S3-related features; otherwise they can stay as placeholders.

---

## 5. Prisma / database schema

Prisma is used as the ORM. The schema is defined in `prisma/schema.prisma` and points to `DATABASE_URL` from `.env`.

### 5.1 Generate Prisma Client

```bash
npx prisma generate
```

### 5.2 Apply schema to the database

For local development, use `db push` to sync the schema to the database:

```bash
npx prisma db push
```

This will create all tables defined in `schema.prisma` in the `carsharing` database.

### 5.3 Seed data (recommended)

The seed script populates the database with sample users, vehicles, bookings, trips, and payments.

```bash
npx prisma db seed
```

The seed command runs `scripts/seed.ts` via `tsx` and uses the same `DATABASE_URL` from `.env`.

---

## 6. Running the app (development)

Start the Next.js dev server:

```bash
npm run dev
```

By default, the app is available at:

```text
http://localhost:3000
```

When you open the root URL, you will typically be redirected to the login page.

### Default test users (from seed script)

The seed script creates some default users; for example:

- Admin user
  - Email: `john@doe.com`
  - Password: `johndoe123`

- Test users
  - Email: `halter@test.de` / `halter2@test.de` (role: HALTER)
  - Email: `fahrer@test.de` / `fahrer2@test.de` (role: FAHRER)
  - Password for all test users: `test123456`

These credentials are defined in `scripts/seed.ts`.

---

## 7. Building and running in production mode

To create an optimized production build:

```bash
npm run build
```

Then start the production server:

```bash
npm start
```

By default it will still listen on `http://localhost:3000` unless configured otherwise via environment variables.

---

## 8. Common issues

- **Prisma P1001 (Cant reach database)**
  - Ensure Postgres is running: `sudo service postgresql status` (or `systemctl status postgresql`)
  - Verify `DATABASE_URL` host/port (`localhost:5432`) and credentials.

- **`@prisma/client did not initialize yet`**
  - Run `npx prisma generate` to regenerate the client.

- **Permission errors related to `/home/ubuntu/.../.prisma/client`**
  - Ensure `generator client` in `prisma/schema.prisma` does **not** use an absolute `output` path; rely on the default.

---

With the steps above, a new developer should be able to clone the repo, configure `.env`, set up Postgres, run Prisma commands, and start the app successfully.
