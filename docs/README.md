# Nexus - All-in-One Retail & Restaurant Management Hub

Nexus is a comprehensive, production-grade management application designed for hybrid retail shops and small-scale restaurants. It provides a unified platform for Point of Sale (POS), inventory management, menu management, and a detailed customer credit system.

## 🚀 Key Features

- **Unified POS System**: Seamlessly handle both retail and restaurant transactions in a single interface.
- **Inventory Management**: Track stock levels, manage variants (SKUs), and handle stock adjustments with ease.
- **Kitchen Display System (KDS)**: Real-time order tracking for restaurant kitchens to improve efficiency.
- **Customer Credit System**: Manage customer accounts, track credit balances, and handle payments on credit.
- **Advanced Analytics**: Gain insights into sales performance, popular items, and customer behavior with detailed reports.
- **Staff Management**: Add and manage staff accounts with different roles and permissions.
- **Promotions & Offers**: Create and manage percentage-based or fixed-amount discounts.
- **Responsive Design**: Optimized for both desktop and mobile devices, ensuring a smooth experience on any screen.
- **Offline-First Architecture**: Designed to work reliably even with intermittent internet connectivity.

## 🛠️ Tech Stack

- **Frontend**: [React 18+](https://reactjs.org/) with [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- **Icons**: [Lucide React](https://lucide.dev/) for a consistent and modern icon set
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for smooth transitions and micro-interactions
- **Charts**: [Recharts](https://recharts.org/) for data visualization
- **State Management**: Custom React Reducer for robust and predictable state handling

## 📦 Installation & Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Setup

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

4. **Build for production**:
   ```bash
   npm run build
   ```

## 📖 Usage

### Demo Mode
The application is configured to run in a standalone demo mode by default. All data is stored in your browser's local storage, allowing you to explore all features without needing a backend server.

### Data Management
- Your session data is saved automatically in your browser's local storage.
- You can export your current state and import it later or on another device using the feature in **Settings > Data Management**.
- To start a fresh session, clear your browser's site data for this page.

## 🔒 Security & Privacy

- **Local Storage**: All data is stored locally in your browser. No data is sent to any external server unless you explicitly configure a backend.
- **Data Export**: You have full control over your data. Export and import your state at any time.
- **Privacy First**: The application is designed to be privacy-centric, ensuring your business data remains on your device.

## 🛠️ Troubleshooting

- **Data Persistence**: If your data is not persisting, ensure that your browser's local storage is not being cleared automatically.
- **Performance**: For large datasets, ensure you are using a modern browser with hardware acceleration enabled.
- **Feature Issues**: If a feature is not working as expected, try clearing your browser's site data and starting a fresh session.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with descriptive messages.
4. Push your changes to your fork.
5. Submit a pull request.

## 📧 Contact & Support

For any questions, feedback, or support, please reach out to the Nexus Team.

---

*Built with ❤️ by the Nexus Team.*
