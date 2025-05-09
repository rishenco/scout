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

export interface PostReddit {
  permalink: string;
  score: number;
  num_comments: number;
  subreddit: string;
  comments: any[];
}

export interface Post {
  id: string;
  title: string;
  content: string;
  reddit: PostReddit;
}

export interface Detection {
  id: string;
  profile_id: string;
  post_id: string;
  is_relevant: boolean;
  extracted_properties: Record<string, string>;
  created_at: string;
}

export interface NewUserClassification {
  profile_id: string;
  post_id: string;
  is_relevant: boolean;
}

export interface UserClassification extends NewUserClassification {
  created_at: string;
}

export interface UserClassificationWithPost extends UserClassification {
  post: Post;
}

export interface DetectionWithPost extends Detection {
  post: Post;
  user_classification?: UserClassification;
}

export interface AnalyzePostsRequest {
  profile: ProfileSettings;
  post_ids: string[];
}

export interface AnalyzePostsResponse {
  detections: {
    post_id: string;
    is_relevant: boolean;
    extracted_properties: Record<string, string>;
  }[];
  errors: {
    post_id: number;
    error: string;
  }[];
} 