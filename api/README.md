# Panadería La Paz - API

NestJS backend API for the bakery admin application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Generate Prisma Client:
```bash
npm run prisma:generate
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

5. Start development server:
```bash
npm run start:dev
```

## Available Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## Project Structure

```
src/
├── prisma/          # Prisma service and module
├── app.module.ts    # Root module
├── app.controller.ts # Root controller
├── app.service.ts   # Root service
└── main.ts          # Application entry point
```

## Database

The database schema is defined in `prisma/schema.prisma`. All migrations are managed through Prisma.


