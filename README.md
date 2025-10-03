# 🏠 House App Frontend

This is the **frontend** for the House App — a collaborative household management tool where users can share a house, manage chores, shopping lists, recipes, and items.

The frontend is built with **React + TypeScript**, using **Vite** for development and **React Query** for data fetching.

---

## ✨ Features

- 🔑 **Authentication** (signup & login)
- 🏡 **House management** (create, join, leave a house)
- ✅ **Chores**
  - Create chores with daily/weekly/monthly frequency
  - Assign chores to house members
  - Mark chores as completed
- 🛒 **Shopping lists** (shared within the house)
- 📦 **Global items**
  - Manage items with categories (kitchen, cleaning, etc.) and units (pcs, g, L, etc.)
- 🍽️ **Recipes**
  - Create, edit, delete recipes
  - Add ingredients from the global items list
  - Suggest recipes based on available items
- 👤 **Profile page** with name, email, and house details

---

## 🛠️ Tech Stack

- [React](https://react.dev/) (with [Vite](https://vitejs.dev/))
- [TypeScript](https://www.typescriptlang.org/)
- [React Router](https://reactrouter.com/)
- [React Query](https://tanstack.com/query/latest)
- [Axios](https://axios-http.com/)
- [Bootstrap 5](https://getbootstrap.com/) for styling

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/tikkaaa3/HouseAppFrontend.git
cd <repo-name>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure API

The frontend expects a backend API (Node/Express, etc.) running.
Update the baseURL in src/api/axios.ts:

```js
const api = axios.create({
  baseURL: "http://localhost:3000", // or your backend URL
  withCredentials: true,
});
```

### 4. Run development server

```
npm run dev
```

App will run at:
👉 http://localhost:5173

## 📂 Project Structure

src/
├─ api/ # Axios instance
├─ components/ # Shared UI components
├─ context/ # AuthProvider, global contexts
├─ features/ # Feature-based folders
│ ├─ auth/ # Login & Signup
│ ├─ chores/ # ChoresPage
│ ├─ items/ # ItemsAdminPage
│ ├─ recipes/ # RecipesAdminPage & RecipeSuggestPage
│ └─ shopping/ # Shopping list pages
├─ App.tsx # Main app routes
└─ main.tsx # Entry point

## 🧑‍🤝‍🧑 Contributing

    1.	Fork the repo
    2.	Create a branch: git checkout -b feature/my-feature
    3.	Commit your changes: git commit -m "add my feature"
    4.	Push to branch: git push origin feature/my-feature
    5.	Open a Pull Request

## 📜 License

[MIT License](./LICENSE) © 2025 Emre Tolga Kaptan
