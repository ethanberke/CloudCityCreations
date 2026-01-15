# Cloud City Culinary Creations (C3 Creations)

*A Star‑Wars‑inspired recipe sharing app built for my coworkers at Offutt AFB.*

Cloud City Culinary Creations — or **C3 Creations** — is a full‑stack recipe application designed to help my team share dishes for our regular potlucks and chili cookoffs. Inspired by the Star Wars theme at my workplace, the app provides a fun and modern way to browse, contribute, and enjoy recipes from across the squadron.

The project is built with **JavaScript**, **Node/Express**, **React**, **PostgreSQL**, and **Material UI**, with **zero custom CSS** thanks to MUI’s built‑in styling system.

---

## Features

### 🟦 Landing Page  
A responsive grid of recipe tiles.  
Clicking a tile opens a modal showing:

- Recipe name  
- Style  
- Contributor  
- Ingredients  
- Instructions  
- Optional image  

![Selected Recipe](client/images/SelectedRecipe.png)

![Galvanize Opening Screen](client/images/GalvanizeOpening.png)

![Instructions](client/images/Instructions.png)

---

### 🟩 Contribute Recipes  
Users can add their own creations through the Contribute page:

- Contributor name  
- Recipe name  
- Style  
- Optional image URL  
- Dynamic ingredient fields  
- Dynamic instruction fields  

![Contribute Screen](client/images/ContributeScreen.png)

---

## Tech Stack

### Front‑End
- **React.js**
- **Material UI (MUI)** for:
  - Component library  
  - Built‑in styling (no CSS files)  
  - Responsive layout  
  - Dark/light mode support  

### Back‑End
- **Node.js + Express.js**
- **PostgreSQL**
- SQL queries optimized using JSON aggregation for clean recipe retrieval

---

## Project Structure

```text
client/          # React front-end
server/          # Express back-end
database.sql     # Schema definition
migration.sql    # Seed data for recipes, ingredients, instructions
.env             # Environment variables
```

Create a `.env` file in the **client** directory with:
VITE_API_URL=http://localhost:3001/api
### Notes
- `DATABASE_URL` must match your local PostgreSQL credentials  
- `PORT` is the Express server port  
- `VITE_API_URL` must point to your backend API root  

---

## Database Setup

### 1. Create the database
```bash
createdb recipes
```

2. Run the schema

psql -d recipes -f database.sql

3. Seed the database
psql -d recipes -f migration.sql

This populates:
- Recipes
- Ingredients
- Instructions

Running the App
1. Install dependencies
From the root, run:
```bash
npm install
```
Then install client dependencies:
```bash
cd client
npm install
```

2. Start the backend
From the server directory:
```bash
npm start
```
3. Start the frontend
From the client directory:
```bash
npm run dev
```

4. Open the app
Visit:
http://localhost:5173
(or whichever port Vite selects)

How It Works
Landing Page
- Displays all recipes as tiles
- Fully responsive
- Clicking a tile opens a modal with full recipe details
Recipe Modal
Shows all recipe information using MUI components.
Contribute Page
- Add ingredients and instructions dynamically
- Form validation for required fields
- Submits data to the backend
- Backend inserts into multiple tables in a single transaction
- New recipes appear instantly on the landing page

Developer
Ethan Berkebile
Contributions, suggestions, and pull requests are welcome.


## Future Features

Cloud City Culinary Creations is actively evolving. Planned enhancements include:

### 🔐 Authentication & User Accounts (Supabase)
- Full authentication flow powered by **Supabase Auth**
- Users can create accounts and log in to manage their own recipes
- Admin-level permissions for elevated management capabilities

### 🖼 Image Upload Support
- Direct image uploads instead of relying on external URLs
- Secure storage via **Supabase Storage**
- Automatic image optimization and previewing

### ✏️ Edit & Delete Recipes
- Users can edit or delete recipes they have submitted
- Admins can edit or remove any recipe in the system
- UI updates to clearly show ownership and available actions

### 👀 Submission Preview Modal
- When contributing a recipe, users will see a **preview modal** before final submission
- Displays:
  - Recipe name  
  - Style  
  - Contributor  
  - Ingredients  
  - Instructions  
  - Image preview  
- Helps users verify formatting and content before saving to the database

### 📱 Additional UI/UX Enhancements
- Improved mobile layout for recipe modals and forms
- Optional “favorite recipes” feature tied to user accounts
- Sorting and filtering options (by style, contributor, popularity)

These features will continue to expand the app into a fully interactive, community-driven recipe platform.