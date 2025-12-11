# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- npm or yarn package manager

## Step 1: Database Setup

1. Create PostgreSQL database:
```bash
psql -U postgres
CREATE DATABASE panaderia_la_paz;
\q
```

Or use the SQL script:
```bash
psql -U postgres -f sql/init/01_create_database.sql
```

## Step 2: Backend Setup

1. Navigate to API directory:
```bash
cd api
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
# Copy the example file
cp env.example .env

# Edit .env with your database credentials:
# DATABASE_URL="postgresql://user:password@localhost:5432/panaderia_la_paz?schema=public"
```

4. Generate Prisma Client:
```bash
npm run prisma:generate
```

5. Run database migrations:
```bash
npm run prisma:migrate
# When prompted, name your migration: "init"
```

6. Start the API server:
```bash
npm run start:dev
```

The API should now be running at `http://localhost:3000`

## Step 3: Frontend Setup

1. Open a new terminal and navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
# Create .env.local file
echo "API_URL=http://localhost:3000" > .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" >> .env.local
```

4. Start the frontend server:
```bash
npm run dev
```

The frontend should now be running at `http://localhost:3001`

## Verify Installation

1. Check API health: Visit `http://localhost:3000/health`
2. Check frontend: Visit `http://localhost:3001`

## Next Steps

- Explore the Prisma schema in `api/prisma/schema.prisma`
- Use Prisma Studio to view your database: `cd api && npm run prisma:studio`
- Start building your modules in the `api/src` directory
- Build your UI components in `frontend/app`

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in `.env` matches your PostgreSQL credentials
- Ensure database `panaderia_la_paz` exists

### Port Already in Use
- Change PORT in `api/.env` if 3000 is taken
- Change port in `frontend/package.json` scripts if 3001 is taken

### Prisma Migration Issues
- Make sure DATABASE_URL is correct
- Ensure you have proper database permissions
- Try resetting: `cd api && npx prisma migrate reset` (WARNING: deletes all data)


