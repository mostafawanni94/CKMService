# Pro Totaal Service - Admin Dashboard

A modern admin dashboard for managing the Pro Totaal Service business operations.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + SWR for data fetching
- **API Integration**: REST API to Django Backend

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm 9.x or later

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Project Structure

```
src/
├── app/                    # App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   │   ├── employees/     # Employee management
│   │   ├── customers/     # Customer management
│   │   ├── projects/      # Project management
│   │   ├── worklogs/      # Work log approval
│   │   ├── invoices/      # Invoice generation
│   │   └── settings/      # System settings
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   ├── ui/               # UI primitives
│   ├── forms/            # Form components
│   └── tables/           # Data tables
├── lib/                  # Utility functions
│   ├── api/              # API client
│   ├── hooks/            # Custom hooks
│   └── utils/            # Helper functions
├── styles/               # Global styles
└── types/                # TypeScript types
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript check

## Features (To Be Implemented)

- [ ] Admin authentication
- [ ] Employee management (CRUD, approval workflow)
- [ ] Customer management
- [ ] Project management
- [ ] Work log approval
- [ ] Weekly invoice generation
- [ ] Notification center
- [ ] Dashboard analytics
