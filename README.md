# Color Schemes

## Getting Started

Use Node.js 20, 22, 23, 24, or 25. Then install dependencies and run the
development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

If you switch Node.js versions after installing dependencies, reinstall them so
the native SQLite package is rebuilt for the active Node version:

```bash
npm install
```

## Build

```bash
npm run build
npm run start
```

## Data

Gradient data is stored in `data/gradients.sqlite`. The app also seeds default
gradients from `src/data/gradients-parsed.json` when the database is empty.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
