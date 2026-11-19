# Crystal Bullion backend

See the [project documentation](../README.md) for architecture, setup, API contracts, formulas, Goldyy, Render deployment and verification. Configuration examples are in [.env.example](.env.example).

## Deploy the API on EC2 with Docker

The deployment runs Express, MongoDB and a Caddy HTTPS proxy on one Ubuntu EC2 instance. MongoDB uses a private Docker network and a named volume. Express connects with a database-scoped account. The APK connects to Caddy on port 443.

1. Choose an Ubuntu EC2 instance with a stable public IPv4 address. Create a DNS A record for your API hostname pointing to that address. Allow inbound TCP 80 and 443 for Caddy and restrict SSH (22) to your administrator IP. Keep ports 5000 and 27017 closed to the internet.
2. Install Docker Engine and the Docker Compose plugin on the instance using the [Ubuntu installation guide](https://docs.docker.com/engine/install/ubuntu/). Enable Docker at boot with `sudo systemctl enable --now docker`.
3. Transfer `src/`, `deploy/`, `package.json`, `Dockerfile`, `.dockerignore`, and `compose.yaml` to one backend directory on the instance. Run the following commands there.
4. On the first deployment, generate two independent passwords locally on EC2. This command creates a private file and refuses to overwrite an existing one.

   ```sh
   (umask 077; set -Ce; admin=$(openssl rand -hex 32); app=$(openssl rand -hex 32); printf 'MONGO_ADMIN_PASSWORD=%s\nMONGO_APP_PASSWORD=%s\n' "$admin" "$app" > .env)
   ```

   Edit `.env` on EC2 to add `API_DOMAIN` (public hostname only), `GOLD_API_KEY` for provider-backed quotes and `GROQ_API_KEY` for Goldyy. Compose supplies the MongoDB URI. Keep these generated passwords through redeployments. MongoDB initializes its accounts only on an empty volume. Back up the database separately before replacing the instance or its disk.
5. Validate and start the deployment:

   ```sh
   sudo docker compose config --quiet
   sudo docker compose up -d --build
   sudo docker compose ps
   ```

6. From another device, substitute your actual hostname and verify both endpoints:

   ```sh
   curl --fail https://api.example.com/api/health
   curl --fail 'https://api.example.com/api/prices?currency=INR'
   ```

   Health confirms Express is responding. Inspect the prices' source status to confirm provider availability. Set the Expo build variable `EXPO_PUBLIC_API_BASE_URL` to the verified HTTPS origin before building the APK.

For a subsequent release, update the files and rerun `sudo docker compose up -d --build`. The named Caddy volumes preserve certificate state across container replacements. Caddy needs working public DNS and access to ports 80 and 443 for [automatic HTTPS](https://caddyserver.com/docs/quick-starts/reverse-proxy).
