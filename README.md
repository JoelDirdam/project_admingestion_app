# Panadería La Paz - Admin App

SaaS-style admin application for bakery management, starting with client "Panadería La Paz".

## Project Structure

```
project_admingestion_app/
├── api/                    # NestJS backend
│   ├── src/
│   │   ├── prisma/        # Prisma service and module
│   │   ├── app.module.ts
│   │   ├── app.controller.ts
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── package.json
├── frontend/              # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── package.json
├── sql/                   # SQL scripts
│   └── init/
└── README.md
```

## Tech Stack

- **Backend**: NestJS + TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Frontend**: Next.js + TypeScript
- **Hosting**: Amazon Lightsail (Linux instance)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Prisma CLI

### Backend Setup

1. Navigate to the API directory:
```bash
cd api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/panaderia_la_paz?schema=public"
PORT=3000
NODE_ENV=development
```

4. Generate Prisma Client:
```bash
npm run prisma:generate
```

5. Run database migrations:
```bash
npm run prisma:migrate
```

6. Start the development server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```bash
API_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3001`

## Database Schema

The Prisma schema includes the following main entities:

- **Company**: Multi-tenant support
- **Campaign**: Groups all operations for a Rosca season
- **Product & ProductVariant**: Product catalog
- **PriceConfig**: Pricing per campaign
- **Location**: Physical locations (PRODUCTION, WAREHOUSE, STORE, ROUTE)
- **User**: System users
- **ProductionBatch**: Production tracking
- **InventoryMovement**: Stock changes
- **DistributionOrder**: Stock transfers between locations
- **Sale**: Sales transactions
- **Payment**: Payment tracking

See `api/prisma/schema.prisma` for complete schema definition.

## Deployment

For Amazon Lightsail deployment:

1. Upload code to `/panaderia_la_paz/` directory structure
2. Set up environment variables
3. Run Prisma migrations
4. Build and start both services

## License

MIT


