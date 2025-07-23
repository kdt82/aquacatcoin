# Codebase Refactoring Plan

This document outlines the plan to refactor files that exceed the line count limits defined in `development-plan.md`.

## 1. Summary of Files to Refactor

### High Priority (Over 350 lines)
- **`client/views/meme-generator.ejs`**: 3763 lines
- **`client/public/css/style.css`**: 1239 lines
- **`client/views/gallery.ejs`**: 901 lines
- **`server/routes/ai.js`**: 494 lines
- **`server/routes/memes.js`**: 448 lines

### Medium Priority (Over 300 lines)
- **`server/database/seed.js`**: 349 lines
- **`server/routes/social.js`**: 341 lines
- **`server/routes/gallery.js`**: 320 lines
- **`server/models/Meme.js`**: 310 lines

---

## 2. Refactoring Strategy

The primary strategy is to break down large files into smaller, more manageable modules.

- **EJS Files**: For `.ejs` files that contain both a lot of HTML and a lot of `<style>` or `<script>` tags, the internal CSS and JavaScript will be extracted into separate, dedicated files. This will significantly reduce the line count of the EJS files and improve modularity.
- **CSS Files**: Large CSS files will be split into smaller, component-based stylesheets. For example, styles related to the gallery will be moved to `gallery.css`, and styles for the meme generator will go into `meme-generator.css`.
- **JavaScript Route Files**: Express router files in `server/routes` will be refactored by moving business logic into controller modules. This will keep the route files clean and focused on endpoint definitions, while the controllers will handle the application logic.

---

## 3. Detailed Refactoring Plan

### `client/views/meme-generator.ejs` (3763 lines)
- **Problem**: Contains a massive `<style>` block with over 1000 lines and a large `<script>` block with significant client-side logic.
- **Solution**:
    1. Create `public/css/meme-generator.css` and move all styles from the `<style>` tag into this new file.
    2. Create `public/js/meme-generator.js` and move all JavaScript from the `<script>` tag into this file.
    3. The EJS file will then only contain the HTML structure, with links to the new CSS and JS files.

### `client/public/css/style.css` (1239 lines)
- **Problem**: A single stylesheet for the entire application, making it hard to maintain.
- **Solution**:
    1. Create `public/css/main.css` to store the core styles (variables, body, header, footer).
    2. Create component-specific stylesheets like `gallery.css`, `meme-generator.css`, etc.
    3. Distribute the styles from `style.css` into the new, more focused files.

### `client/views/gallery.ejs` (901 lines)
- **Problem**: Similar to the meme generator, this file has large, embedded `<style>` and `<script>` blocks.
- **Solution**:
    1. Create `public/css/gallery.css` and move the styles.
    2. Create `public/js/gallery.js` and move the scripts.
    3. Update the EJS file to link to these new assets.

### `server/routes/ai.js` (494 lines) & `server/routes/memes.js` (448 lines)
- **Problem**: These route files contain too much business logic, making them difficult to read and test.
- **Solution**:
    1. Create `server/controllers/aiController.js` and `server/controllers/memeController.js`.
    2. Move the logic from each route handler in `ai.js` and `memes.js` into corresponding functions within the new controller files.
    3. The route files will then import the controller functions and use them as middleware, cleaning up the route definitions.

### `server/routes/social.js` (341 lines) & `server/routes/gallery.js` (320 lines)
- **Problem**: These files are also becoming bloated with logic.
- **Solution**:
    1. Apply the same controller pattern: create `socialController.js` and `galleryController.js`.
    2. Migrate the business logic to these controllers to keep the route files slim.

### `server/database/seed.js` (349 lines)
- **Problem**: This file is mostly comprised of large data arrays for seeding the database.
- **Solution**:
    1. The data arrays can be moved into separate JSON files (e.g., `seed-data.json`).
    2. The `seed.js` script would then read from these JSON files, which simplifies the script and separates data from logic.

### `server/models/Meme.js` (310 lines)
- **Problem**: The Meme model contains a large number of static methods and virtuals, increasing its complexity.
- **Solution**:
    1. Create a `server/services/memeService.js` module.
    2. Move complex static methods (like analytics or data aggregation) from the model into the new service file. This will keep the model focused on the data schema and basic operations.

This refactoring effort will significantly improve the maintainability, readability, and scalability of the codebase. 