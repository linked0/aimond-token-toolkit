# backend

## Running the Server

## API Documentation (Swagger)

The API documentation is available via Swagger UI. Once the backend server is running, you can access the interactive documentation at:

```
http://localhost:3000/api-docs
```

This interface allows you to explore available endpoints, understand request/response structures, and test API calls directly from your browser.

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

## Database Schema

The backend uses a PostgreSQL database with the following tables:

### `user`

This table stores information about users, including their wallet address and referral information.

- `user_id`: A unique identifier for each user.
- `wallet_address`: The user's wallet address.
- `referrer_id`: The `user_id` of the user who referred them.
- `created_at`: The timestamp when the user was created.

```sql
CREATE TABLE "user" (
  user_id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  referrer_id INTEGER REFERENCES "user"(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### `claim`

This table stores information about claims made by users.

- `claim_id`: A unique identifier for each claim.
- `user_id`: The `user_id` of the user who made the claim.
- `amount`: The amount of the claim.
- `total_claimed_amount`: The total amount claimed by the user.
- `transaction_hash`: The transaction hash of the claim.
- `status`: The status of the claim (e.g., pending, completed, failed).
- `claim_date`: The timestamp when the claim was made.

```sql
CREATE TABLE claim (
  claim_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "user"(user_id),
  amount DECIMAL(20, 8) NOT NULL,
  total_claimed_amount DECIMAL(20, 8),
  transaction_hash VARCHAR(255),
  status VARCHAR(50),
  claim_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### `allocation`

This table stores information about allocations of tokens to users.

- `allocation_id`: A unique identifier for each allocation.
- `user_id`: The `user_id` of the user who received the allocation.
- `type`: The type of allocation (e.g., airdrop, referral reward, spending reward).
- `amount`: The amount of the allocation.
- `is_claimed`: A boolean indicating whether the allocation has been claimed.
- `source_info`: Information about the source of the allocation.
- `claim_id`: The `claim_id` of the claim that this allocation is associated with.
- `created_at`: The timestamp when the allocation was created.

```sql
CREATE TABLE allocation (
  allocation_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "user"(user_id),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  is_claimed BOOLEAN DEFAULT FALSE,
  source_info VARCHAR(255),
  claim_id INTEGER REFERENCES claim(claim_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### `merkle_distribution`

This table stores information about Merkle distributions.

- `distribution_id`: A unique identifier for each distribution.
- `distribution_name`: The name of the distribution.
- `is_active`: A boolean indicating whether the distribution is active.
- `created_at`: The timestamp when the distribution was created.
- `merkle_root`: The Merkle root of the distribution.

```sql
CREATE TABLE merkle_distribution (
  distribution_id SERIAL PRIMARY KEY,
  distribution_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  merkle_root VARCHAR(255) NOT NULL
);
```

### `merkle_proof`

This table stores the Merkle proofs for each user in a distribution.

- `proof_id`: A unique identifier for each proof.
- `distribution_id`: The `distribution_id` of the distribution that this proof is associated with.
- `user_id`: The `user_id` of the user that this proof is for.
- `amount`: The amount of the allocation for this user.
- `proof`: The Merkle proof for the user.

```sql
CREATE TABLE merkle_proof (
  proof_id SERIAL PRIMARY KEY,
  distribution_id INTEGER REFERENCES merkle_distribution(distribution_id),
  user_id INTEGER REFERENCES "user"(user_id) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  proof TEXT[] NOT NULL
);
```