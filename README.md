# Procyon Explorer⭐✨

## 🏆 Competition Submission

_2025 NASA Space Apps Challenge - Embiggen Your Eyes!_

## 👥 Team Information

- **Team name:** Procyon
- **Members:**
  - Yaman Adeeb
  - Mahmood Hamad
- **Contact:**
  - its.yamanadeeb.0@gmail.com
  - mhhamad.se@gmail.com

---

## 📖 App Summary

Procyon Explorer is a web-based high-resolution image viewer designed to democratize access to multi-gigabyte astronomical imagery for researchers and enthusiasts alike. Built for the "Embiggen Your Eyes!" challenge, our solution addresses the critical barrier of viewing and analyzing massive telescope images (billions of pixels) directly in a web browser without expensive specialized software.

The platform enables users to seamlessly navigate enormous astronomical datasets using Deep Zoom Image (DZI) tiling technology, create and manage annotations with intelligent filtering, and receive AI-powered assistance through an integrated chat-bot. By breaking down multi-gigabyte images into manageable tiles, Procyon Explorer transforms how scientists, educators, and space enthusiasts explore cosmic phenomena—from the Andromeda Galaxy to distant nebulae—making cutting-edge astronomical research accessible to anyone with an Internet connection.

---

## 🎯 Key Features

- 🔭 High-resolution astronomical image viewing
- 📝 Annotation system with filtering
- 🤖 AI-powered chat assistance
- 🧩 DZI tiling for optimal performance
- 🌙 User-friendly interface for researchers and enthusiasts

---

## 🚀 How to Run This Project Locally

This project is built with the React framework. Follow these steps to get a local development environment running.

### Prerequisites

Make sure you have the following installed on your machine:

- **Node.js** (version 16 or higher recommended)

  - Download from: [https://nodejs.org/](https://nodejs.org/)
  - Check version: `node --version`

- **npm** (comes with Node.js) or **yarn** or **pnpm**
  - Check npm: `npm --version`
  - Check yarn: `yarn --version`

### Installation & Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/mhhamad/Procyon-Explorer.git
   cd Procyon-Explorer
   ```

2. **Install Dependencies**

   ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
   ```

3. **Get The Image Ready**

   1. Add Image(s) to _assets_ file, try (https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-31/#:~:text=In%20January%20of%202025%2C%20NASA&#x27;s,were%20challenging%20to%20stitch%20together.)
   2. Make the tiles

   ```bash
     npm run make-tiles
   ```

4. **Run the Application**

   1. 🖥️ Frontend:

      - 🛠️ Option 1: Development Mode (Recommended for Development)

        ```bash
        npm run dev
        # or
        yarn dev
        # or
        pnpm dev
        ```

      - Use this for: Active development with hot-reload.

      - 🚀 Option 2: Production Build (Recommended for Testing Final Version)

        ```bash
        npm run build
        npm run preview
        # or
        yarn build
        yarn preview
        # or
        pnpm build
        pnpm preview
        ```

        - Use this for: Testing the optimized production version

   2. 🔧 Backend Server:
      - Rune server
      ```bash
        node server.js
      ```
