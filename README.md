# 📅 Appointment Booking System

A modern, full-stack appointment booking application built with Next.js, featuring Google Calendar integration, timezone support, and role-based user management.

# Demo Video
[Demo](https://youtu.be/cjrNAxYdAKU)

## ✨ Features

- **User Authentication** - Google OAuth integration with NextAuth.js
- **Role Management** - Support for buyers, sellers, and dual roles
- **Availability Management** - Set custom availability schedules with timezone support
- **Real-time Booking** - Book appointments with instant calendar integration
- **Google Calendar Sync** - Automatic event creation with Google Meet links
- **Timezone Handling** - Proper timezone conversion for global users
- **Responsive Design** - Mobile-friendly interface with dark/light theme support
- **Database Integration** - PostgreSQL with Drizzle ORM

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google Cloud Console project with Calendar API enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd booking
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/booking_db"

   # NextAuth
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"

   # Google OAuth & Calendar API
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # Encryption (for storing calendar tokens)
   ENCRYPTION_SECRET="your-encryption-secret"
   ```

4. **Database Setup**
   ```bash
   # Generate and run migrations
   pnpm drizzle-kit generate
   pnpm drizzle-kit migrate
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🏗️ Tech Stack

- **Framework**: Next.js 15.5.3 with App Router
- **Authentication**: NextAuth.js v4 with Google OAuth
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with Radix UI components
- **Calendar**: Google Calendar API integration
- **Date Handling**: date-fns with timezone support
- **Type Safety**: TypeScript throughout

## 📱 Usage

### For Sellers
1. **Sign in** with Google account
2. **Set up profile** and select "Seller" role
3. **Configure availability** - set weekly schedule and timezone
4. **Manage appointments** - view bookings and calendar integration

### For Buyers
1. **Sign in** with Google account
2. **Browse sellers** and view their availability
3. **Book appointments** - select date/time and get calendar invite
4. **Manage bookings** - view upcoming appointments

## 🔧 Configuration

### Google Calendar Setup
1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable Calendar API and OAuth 2.0
3. Configure OAuth consent screen
4. Create credentials and add to environment variables

### Database Schema
The application uses the following main tables:
- `users` - User authentication and profiles
- `sellers` - Seller-specific data and settings
- `appointments` - Booking records
- `seller_availability` - Weekly availability schedules
- `user_tokens` - Encrypted OAuth tokens

## 🚀 Deployment

### Build for Production
```bash
pnpm build
pnpm start
```

### Deploy on Vercel
1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

