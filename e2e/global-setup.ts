import { execSync } from 'child_process';

export default async function globalSetup() {
  // Run the schema SQL against the test database before the server starts
  try {
    execSync('psql -h localhost -U safedify_user -d safedify -f server/postgres-schema.sql', {
      stdio: 'inherit',
      env: {
        ...process.env,
        PGPASSWORD: 'safedify_pass',
      },
    });
    // Optionally, seed demo users or other test data here
  } catch (err) {
    console.error('Failed to initialize PostgreSQL schema:', err);
    process.exit(1);
  }
}
