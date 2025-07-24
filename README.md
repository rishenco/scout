<h1 align="center">
  Scout
</h1>

<p align="center">
  <i align="center">AI-based Reddit post aggregator 🚀</i>
</p>

<p align="center">
    <img src="./assets/scout-ui.png" alt="scout-ui"/>
</p>


## Introduction

`Scout` reads subreddits for you and extracts data from "interesting" posts based on your preferences.

## How to run

### Prerequisites

First of all, you need to obtain Reddit and Gemini API credentials.

Reddit API credentials are optional, you can use anonymous mode but it will have lower rate limits.

<details>
<summary>Reddit API credentials</summary>

1. Go to <a href="https://www.reddit.com/prefs/apps/" target="_blank">Reddit Developer</a> and create a new app.
2. Fill in the form:
   - Name: `scout`
   - Type: `script`
   - Redirect URI: `http://example.com`
3. Click `create app`
</details>

<details>
<summary>Gemini API credentials</summary>

If you don't have a Gemini Key create it <a href="https://aistudio.google.com/apikey" target="_blank">here</a>.

Otherwise, you can find your key <a href="https://console.cloud.google.com/apis/credentials" target="_blank">here</a>.

</details>

### Filling the config

Create a `.env.docker` file in the root of the project and fill it with your data.

Template:

```env
POSTGRES_CONN_STRING=postgres://scout:super_secret_password@postgres:5432/scout

GEMINI_API_KEY="<your-gemini-api-key>"

REDDIT_CLIENT_ID="<your-reddit-client-id> or omit to use anonymous mode"
REDDIT_CLIENT_SECRET="<your-reddit-client-secret> or omit to use anonymous mode"
REDDIT_USERNAME="<your-reddit-username> or omit to use anonymous mode"
REDDIT_PASSWORD="<your-reddit-password> or omit to use anonymous mode"
REDDIT_USER_AGENT="<your-reddit-user-agent, e.g. scout/1.0> or omit to use anonymous mode"
```

### Change settings for your use case

If want to use another model or scraping settings, you can do it in [settings.yaml](./settings.yaml)

### Launch

Run `docker compose up` in the root of the project.

Open UI at <a href="http://localhost:5602" target="_blank">localhost:5602</a>.

## Testing Profiles

You can add tests to your profiles to ensure that relevancy prompts work correctly!

<p align="center">
  <img src="./assets/scout-profile-editor.png" alt="scout-profile-editor"/>
</p>

## Architecture

Scout consists of the following components:

- `postgres` - PostgreSQL database for storing posts, analysis results and metadata
- `reddit provider` - Service for interacting with Reddit API (scrapes posts from subreddits, enriches them and schedules them for analysis)
- `analysis tasks queue` - Postgres-based queue for asynchronous processing of posts
- `analyzer` - Service that runs analysis of posts and saves results to the database
- `api` - HTTP API for interacting with `analyzer` and `reddit-provider`
- `ui` - Frontend application

<img src="./assets/scout.drawio.png" alt="scout-architecture"/>



## License

MIT