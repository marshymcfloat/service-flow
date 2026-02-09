# ServiceFlow

ServiceFlow is a comprehensive business management and booking SaaS platform designed to streamline operations for service-based businesses. It handles everything from customer bookings and employee attendance to payroll and sales events.

![ServiceFlow Landing](public/serviceFlow2-logo.png)

## 🚀 Features

- **Business Management**: Manage business profile, operating hours, and multiple locations (in progress).
- **Service & Package Configuration**: Define services, pricing, durations, and bundle them into packages.
- **Dynamic Booking System**:
  - Customer-facing booking flow.
  - Real-time availability checking.
  - Support for Vouchers and Discount codes.
  - Payment method tracking (Cash, QRPH).
- **Employee Portal**:
  - Role-based access (Owner vs. Employee).
  - Attendance tracking (Time-in/Time-out) with location verification.
  - Commission and Salary calculation.
  - Payslip generation.f
- **Sales & Marketing**:
  - Manage "Sale Events" with custom discounts.
  - Create special date configurations (e.g., holiday rates).
- **Modern Tech Stack**: Built with performance and scalability in mind using the latest web technologies.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Components)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) (Radix UI + Lucide Icons)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest)
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/yourusername/service-flow.git
    cd service-flow
    ```

2.  **Install dependencies**

    ```bash
    npm install
    # or
    pnpm install
    ```

3.  **Environment Setup**

    Create a `.env` file in the root directory. You can copy the example if provided, or add the following required variables:

    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/serviceflow?schema=public"
    NEXTAUTH_SECRET="your-super-secret-key"
    NEXTAUTH_URL="http://localhost:3000"
    ```

4.  **Database Setup**

    Push the Prisma schema to your database:

    ```bash
    npx prisma migrate dev --name init
    ```

    (Optional) Seed the database with initial data:

    ```bash
    npx prisma db seed
    ```

5.  **Run the development server**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 🐳 Docker Deployment (Production)

1.  **Build the image**

    ```bash
    docker build -t service-flow .
    ```

2.  **Run the container**
    ```bash
    docker run -p 3000:3000 --env-file .env service-flow
    ```

## 🔒 Security

- **Environment Variables**: Never commit `.env` to version control. Use `.env.example` as a template.
- **Authentication**: Protected routes are secured via `proxy.ts` (Next.js 16 middleware replacement) and NextAuth.js.
- **Validation**: API inputs are validated using Zod schemas.

## 📡 API Documentation

See [API.md](API.md) for details on available endpoints, including health checks and webhooks.

## 📂 Project Structure

```
c:\Programming\service-flow
├── app/                  # Next.js App Router pages and API routes
├── components/           # React components
│   ├── auth/             # Authentication related components
│   ├── landing/          # Landing page sections (Hero, Features, etc.)
│   ├── ui/               # Reusable UI components (Shadcn)
│   └── ...
├── prisma/               # Database schema and seeds
├── public/               # Static assets (images, icons)
└── ...
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
