import { createClient } from '@hey-api/client-axios';
import {
  getApiSourcesRedditSubreddits,
  getApiSourcesRedditSubredditsWithProfile,
  postApiSourcesRedditSubredditsBySubredditAddProfiles,
  postApiSourcesRedditSubredditsBySubredditRemoveProfiles,
  getApiProfiles,
  getApiProfilesById,
  postApiProfiles,
  putApiProfilesById,
  deleteApiProfilesById,
  postApiDetectionsList,
  putApiDetectionsTags,
  postApiAnalyze,
} from './generated';

import type {
  Profile,
  ProfileUpdate,
  Detection,
  DetectionFilter,
  DetectionTags,
  DetectionTagsUpdate,
  ListedDetection,
  AnalyzeRequest,
  SubredditSettings,
  DetectionListRequest,
  DetectionTagUpdateRequest
} from './models';

const config = {
  baseURL: 'http://localhost:5601',
  headers: {
    // 'Authorization': `Bearer ${token}`,
  },
}

const client = createClient(config);

// Set basic auth credentials
export function setAuthCredentials(token: string) {
  config.headers = {
    'Authorization': `Bearer ${token}`,
  };

  client.setConfig(config);
}



// Profiles API
export const profilesApi = {
  // Get all profiles
  async getProfiles(): Promise<Profile[]> {
    try {
      const response = await getApiProfiles({client});
      
      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching profiles:', error);
      throw error;
    }
  },

  // Get a profile by ID
  async getProfile(id: number): Promise<Profile> {
    try {
      const response = await getApiProfilesById({
        path: {
          id,
        },
        client,
      });

      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching profile ${id}:`, error);
      throw error;
    }
  },

  // Create a new profile
  async createProfile(profile: Profile): Promise<number> {
    try {
      const response = await postApiProfiles({
        body: profile,
        client,
      });

      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data.id;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  },

  // Update a profile
  async updateProfile(id: number, update: ProfileUpdate): Promise<void> {
    try {
      await putApiProfilesById({
        body: update,
        path: {
          id,
        },
        client,
      });
    } catch (error) {
      console.error(`Error updating profile ${id}:`, error);
      throw error;
    }
  },

  // Delete a profile
  async deleteProfile(id: number): Promise<void> {
    try {
      await deleteApiProfilesById({
        path: {
          id,
        },
        client,
      });
    } catch (error) {
      console.error(`Error deleting profile ${id}:`, error);
      throw error;
    }
  },
};

// Detections API
export const detectionsApi = {
  // List detections with pagination and filters
  async listDetections(options: {
    lastSeenId?: number;
    limit?: number;
    filter?: DetectionFilter;
  }): Promise<ListedDetection[]> {
    try {
      const { lastSeenId, limit = 10, filter } = options;
      const request: DetectionListRequest = {
        last_seen_id: lastSeenId,
        limit,
        filter,
      };
      const response = await postApiDetectionsList({
        body: request,
        client,
      });

      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    } catch (error) {
      console.error('Error listing detections:', error);
      throw error;
    }
  },

  // Update detection tags
  async updateTags(detectionId: number, tags: DetectionTagsUpdate): Promise<DetectionTags> {
    try {
      const request: DetectionTagUpdateRequest = {
        detection_id: detectionId,
        tags,
      };
      const response = await putApiDetectionsTags({
        body: request,
        client,
      });
      
      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    } catch (error) {
      console.error(`Error updating tags for detection ${detectionId}:`, error);
      throw error;
    }
  },
};

// Analysis API
export const analysisApi = {
  // Analyze a post
  async analyzePost(request: AnalyzeRequest): Promise<Detection> {
    try {
      const response = await postApiAnalyze({
        body: request,
        client,
      });
      
      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    } catch (error) {
      console.error('Error analyzing post:', error);
      throw error;
    }
  },
};

// Subreddits API
export const subredditsApi = {
  // Get all subreddits
  async getAllSubreddits(): Promise<SubredditSettings[]> {
    try {
      const response = await getApiSourcesRedditSubreddits({
        client,
      });

      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching subreddits:', error);
      throw error;
    }
  },

  // Get subreddits for a profile
  async getSubredditsForProfile(profileId: number): Promise<SubredditSettings[]> {
    try {
      const response = await getApiSourcesRedditSubredditsWithProfile({
        query: {
          profile_id: profileId,
        },
        client,
      });
      
      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching subreddits for profile ${profileId}:`, error);
      throw error;
    }
  },

  // Add profiles to a subreddit
  async addProfilesToSubreddit(subreddit: string, profileIds: number[]): Promise<void> {
    try {
      await postApiSourcesRedditSubredditsBySubredditAddProfiles({
        path: {
          subreddit,
        },
        body: {
          profile_ids: profileIds,
        },
        client,
      });
    } catch (error) {
      console.error(`Error adding profiles to subreddit ${subreddit}:`, error);
      throw error;
    }
  },

  // Remove profiles from a subreddit
  async removeProfilesFromSubreddit(subreddit: string, profileIds: number[]): Promise<void> {
    try {
      const response = await postApiSourcesRedditSubredditsBySubredditRemoveProfiles({
        path: {
          subreddit,
        },
        body: {
          profile_ids: profileIds,
        },
        client,
      });

      if (response.error) {
        throw response.error;
      }
    } catch (error) {
      console.error(`Error removing profiles from subreddit ${subreddit}:`, error);
      throw error;
    }
  },
};

// Export a default client that includes all APIs
export default {
  setAuthCredentials,
  profiles: profilesApi,
  detections: detectionsApi,
  analysis: analysisApi,
  subreddits: subredditsApi,
}; 