# backend

## Running the Server

To run the backend server, follow these steps:

1.  **Ensure Database Setup:**
    Before starting the server, make sure your PostgreSQL database is running and configured correctly. You will need to create the necessary tables based on the schema provided in the project documentation (or by running SQL migration scripts if available). Update database connection details in `src/database/db.ts` or via environment variables (`DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT`).

2.  **Install Dependencies (if not already done):**
    ```bash
    yarn install
    ```

3.  **Run the Server:**
    ```bash
    yarn start
    ```
    The server will be accessible at `http://localhost:3000`.

4.  **Run Seed Script (Optional, for test data):**
    To populate the database with test data, run the seed script:
    ```bash
    yarn seed
    ```