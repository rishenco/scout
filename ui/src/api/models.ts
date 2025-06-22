// Data models from the new API

export interface Error {
    error: string;
}

// Profile-related models
export interface ProfileSettings {
    version: number;
    relevancy_filter: string;
    extracted_properties: Record<string, string>;
    updated_at?: string;
    created_at?: string;
}

export interface Profile {
    id: number;
    name: string;
    active: boolean;
    created_at?: string;
    updated_at?: string;
    default_settings?: ProfileSettings;
    sources_settings?: Record<string, ProfileSettings>;
}

export interface ProfileSettingsUpdate {
    relevancy_filter: string;
    extracted_properties: Record<string, string>;
}

export interface ProfileUpdate {
    name?: string;
    active?: boolean;
    default_settings?: ProfileSettingsUpdate | null;
    sources_settings?: Record<string, ProfileSettingsUpdate | null>;
}

export interface ProfileJumpstartRequest {
    exclude_already_analyzed?: boolean;
    jumpstart_period?: number;
    limit?: number;
}

// Detection-related models
export interface Detection {
    id: number;
    source: string;
    source_id: string;
    profile_id: number;
    is_relevant: boolean;
    properties: Record<string, string>;
    created_at: string;
}

export interface DetectionTags {
    relevancy_detected_correctly?: boolean;
}

export interface DetectionTagsUpdate {
    relevancy_detected_correctly?: boolean | null;
}

export interface ListedDetection {
    detection: Detection;
    source_post?: Record<string, any>; // Generic object for source post
    tags?: DetectionTags;
}

export interface DetectionTagsFilter {
    relevancy_detected_correctly?: boolean[];
}

export interface DetectionFilter {
    profiles?: ProfileFilter[];
    sources?: string[];
    is_relevant?: boolean;
    tags?: DetectionTagsFilter;
}

export interface ProfileFilter {
    profile_id: number;
    source_settings_versions: SourceSettingsVersionsFilter[] | null;
}

export interface SourceSettingsVersionsFilter {
    source?: string;
    versions: number[];
}

export interface DetectionListRequest {
    last_seen_id?: number;
    limit?: number;
    filter?: DetectionFilter;
}

export interface DetectionTagUpdateRequest {
    detection_id: number;
    tags: {
        relevancy_detected_correctly?: boolean | null;
    };
}

// Analyze-related models
export interface AnalyzeRequest {
    source: string;
    source_id: string;
    relevancy_filter: string;
    extracted_properties: Record<string, string>;
}

// Subreddit-related models
export interface SubredditSettings {
    subreddit: string;
    profiles: number[];
}

export interface SubredditProfilesRequest {
    profile_ids: number[];
}

// Statistics-related models
export interface ProfileStatistics {
    manual_tasks: number;
    auto_tasks: number;
}

// Represents the top-level API response
export interface RedditPostAndComments {
    post: RedditPost;
    comments: RedditComment[];
}

// Model for the main post
export interface RedditPost {
    id: string;
    url: string;
    name: string;
    likes: number | null;
    saved: boolean;
    score: number;
    title: string;
    author: string;
    edited: string;                // ISO timestamp
    locked: boolean;
    is_self: boolean;
    over_18: boolean;
    spoiler: boolean;
    selftext: string;
    stickied: boolean;
    permalink: string;
    subreddit: string;
    created_utc: string;           // ISO timestamp
    num_comments: number;
    subreddit_id: string;
    upvote_ratio: number;
    author_fullname: string;
    subreddit_subscribers: number;
    subreddit_name_prefixed: string;
}

// Wrapper for nested replies in a comment
export interface RedditCommentReplies {
    comments?: RedditComment[];          // May be absent or an empty array
}

// Model for each comment, recursive via CommentReplies
export interface RedditComment {
    id: string;
    body: string;
    name: string;
    likes: number | null;
    saved: boolean;
    score: number;
    author: string;
    edited: string;                // ISO timestamp
    locked: boolean;
    link_id: string;
    over_18: boolean;
    replies: RedditCommentReplies;
    can_gild: boolean;
    stickied: boolean;
    parent_id: string;
    permalink: string;
    subreddit: string;
    created_utc: string;           // ISO timestamp
    is_submitter: boolean;
    score_hidden: boolean;
    subreddit_id: string;
    author_fullname: string;
    controversiality: number;
    subreddit_name_prefixed: string;
}