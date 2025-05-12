// Data models generated from openapi.yaml

export interface ProfileSettings {
  name: string;
  subreddits: string[];
  relevancy_filter_prompt: string;
  properties_prompts: Record<string, string>;
}

export interface Profile extends ProfileSettings {
  id: string;
}

export interface RedditPost {
  permalink: string;
  score: number;
  num_comments: number;
  subreddit: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  reddit: RedditPost;
}

export interface Detection {
  id: string;
  profile_id: string;
  post_id: string;
  is_relevant: boolean;
  extracted_properties: Record<string, string>;
  created_at: string;
}

export interface UserClassification {
  profile_id: string;
  post_id: string;
  is_relevant: boolean | null;
}

export interface FeedPost {
  detection: Detection;
  post: Post;
  user_classification: UserClassification;
}

export interface FeedFilters {
  is_relevant?: boolean;
  has_user_classification?: boolean;
  user_classification_value?: boolean;
  newer?: string; // date-time
  reddit?: {
    subreddit?: string;
    score_greater?: number;
  };
}

export interface AnalyzePostsRequest {
  profile: ProfileSettings;
  post_ids: string[];
}

export interface AnalyzePostsResponse {
  detections: Detection[];
  errors: {
    post_id: string;
    error: string;
  }[];
} 