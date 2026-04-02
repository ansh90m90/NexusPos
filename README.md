# Nexus - All-in-One Retail & Restaurant Management Hub

## Introduction

Nexus is a comprehensive, production-grade management application designed for hybrid retail shops and small-scale restaurants. It provides a unified platform for Point of Sale (POS), inventory management, menu management, and a detailed customer credit system. Whether you're running a boutique, a cafe, or a combined retail-dining space, Nexus streamlines your operations into a single, cohesive interface.

## Detailed Features

- **Unified POS System**: Seamlessly handle both retail and restaurant transactions in a single interface with support for multiple payment methods.
- **Inventory Management**: Track stock levels in real-time, manage product variants (SKUs), and handle stock adjustments with automatic low-stock alerts.
- **Kitchen Display System (KDS)**: Real-time order tracking for restaurant kitchens to improve preparation efficiency and reduce errors.
- **Customer Credit System**: Manage customer accounts, track credit balances, and handle "pay later" transactions with detailed history.
- **Advanced Analytics**: Gain deep insights into sales performance, popular items, and customer behavior with interactive charts and reports.
- **Staff Management**: Role-based access control to manage staff accounts with specific permissions for cashiers, managers, and admins.
- **Promotions & Offers**: Easily create and manage percentage-based or fixed-amount discounts for specific items or entire orders.
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices, ensuring a smooth experience across all your hardware.
- **Offline-First Architecture**: Robust data handling that ensures your business keeps running even during intermittent internet connectivity.

## Local Deployment

To run Nexus on your local machine, follow these steps:

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/nexus.git
   cd nexus
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

4. **Build for production**:
   ```bash
   npm run build
   ```
   The production-ready files will be generated in the `dist/` directory.

## Online Visit (For Demo Only)

You can explore the live demo of Nexus to see all features in action without any local setup:

**[Visit Nexus Live Demo](https://ais-pre-7zumfgylrh2tb6btfdbws4-344656878526.asia-east1.run.app)**

*Note: The demo environment uses local storage for data persistence. Your changes will be saved locally in your browser.*

## Tech Stack

- **Frontend**: React 18+ with Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Charts**: Recharts
- **State Management**: Custom React Reducer

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

*Built by the Nexus Team.*
