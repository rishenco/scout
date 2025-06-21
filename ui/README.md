# Scout

Scout is a project for filtering reddit posts to create a customized reddit feed.
It uses LLMs to check posts with user provided criteria and to categorize them for easier search.

# UI

This project is a web app to visualize results and easily use the tool.

## Main technologies:

- Framework: React, TypeScript, Vite
- Api: TanStack Query (former React Query), Axios
- Navigation: React Router
- Styling: Shadcn, Tailwind (v3)

## Guidelines

- Separate ui into small components that can be composed together
- Always use TanStack Query hooks, never call api service directly in ui code.
- Folder stucture: just group files by types
- Styling: 1) Minimalistic 2) Modern. 
- Do not put any mocks or placeholders in UI code unless explicitly asked.
- Use Shadcn default components where possible

## API

Read openapi.yaml for details. It contains api description with comments and examples.

## Pages

- Home: show a list of profiles, allow to create new one. When profile is selected user goes to it's feed
- NewProfile: inputs for settings and create button.
- ProfileDetectionList - shows detections for a profile in reddit-like interface. Allows to filter them. Each post shows information from reddit and can be labeled as relevant/not relevant by user (user classifications in api).
- EditProfile:
    - left side: profile settings, save button.
    - right side: Similar to tests tab in IDE. List of labeled posts, with visualization of results with current changes. Filters for posts. Buttons to analyze selected/wrong/all posts - when clicked posts are sent for analysis with updated settings. When response is received it should be visualized if the result matches expected one.

## Components

### Home page:

- ProfileList: shows grid of profile cards
    - ProfileCard: shows profile name and subreddits

### NewProfile page:

- ProfileEditor
    - PromptInput - multiline input for prompts
    - PropertiesEditor - input for dict Property Name -> Prompt
    - SubredditSelector - component for selecting subreddits

### ProfileDetectionList page:

- DetectionList - List of detections with filters, infinitely scrolls
    - DetectionFilter - filters for detections
    - DetectionCard - shows detection in reddit style. Does not show comments
    - RedditDetectionCard - specialized card for reddit detections
        - RedditPostBody - displays reddit post content
        - DetectionReaction - allows to like/dislike relevancy of the detection
    - RelevancyBadge - shows relevancy status
    - DetectionDialog - dialog for detection details

### EditProfile page:

- ProfileEditor (initialized with existing profile)
- Playground: Shows testing interface for profiles
    - PlaygroundStats: shows basic stats on current results
    - PlaygroundPostList: List of labeled posts with data table interface
        - Uses data-table component for displaying posts
        - columns.tsx defines table structure
        - models.ts contains type definitions


### Common:

- ExtractedProperties - visualizes properties extracted from a post in readable format

### Cursor/LLM Guidelines

If you encounter a problem with linter, some configs or other tooling that you can't solve right away, stop and report back. Do not try to fix it over and over.solve right away, stop and report back. Do not try to fix it over and over.