import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import apiClient from './client';
import type {
  Profile,
  ProfileUpdate,
  Detection,
  DetectionFilter,
  DetectionTags,
  DetectionTagsUpdate,
  ListedDetection,
  AnalyzeRequest,
  SubredditSettings
} from './models';

// Profiles
export function useProfiles() {
  return useQuery<Profile[], Error>({
    queryKey: ['profiles'],
    queryFn: () => apiClient.profiles.getProfiles(),
  });
}

export function useProfile(id: number) {
  return useQuery<Profile, Error>({
    queryKey: ['profiles', id],
    queryFn: () => apiClient.profiles.getProfile(id),
    enabled: !!id,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation<number, Error, Profile>({
    mutationFn: (profile) => apiClient.profiles.createProfile(profile),
    onSuccess: (id, profile) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      // queryClient.setQueryData(['profiles', data.id], data);
      // We don't have the complete data, so we just invalidate the cache
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: number; update: ProfileUpdate }>({
    mutationFn: ({ id, update }) => apiClient.profiles.updateProfile(id, update),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', variables.id] });
      // queryClient.setQueryData(['profiles', variables.id], data);
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => apiClient.profiles.deleteProfile(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.removeQueries({ queryKey: ['profiles', id] });
    },
  });
}

// Combines creating a profile and adding it to subreddits
export function useCombinedCreateProfile() {
  const queryClient = useQueryClient();
  let profileId: number;
  return useMutation<number, Error, { profile: Profile; subreddits: string[] }>({
    mutationFn: async ({ profile, subreddits }) => {
      profileId = await apiClient.profiles.createProfile(profile);
      if (subreddits && subreddits.length > 0) {
        await Promise.all(
          subreddits.map(subreddit =>
            apiClient.subreddits.addProfilesToSubreddit(subreddit, [profileId])
          )
        );
      }
      return profileId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['subreddits'] });
    },
    onError: () => {
      // invalidate in case of partial success
      if (profileId) {
        queryClient.invalidateQueries({ queryKey: ['profiles'] });
        queryClient.invalidateQueries({ queryKey: ['subreddits'] });
        queryClient.invalidateQueries({ queryKey: ['profiles', profileId] });
        queryClient.invalidateQueries({ queryKey: ['subreddits', 'profile', profileId] });
      }
    },
  });
}

// Combines updating a profile and its subreddit associations
export function useCombinedUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: number; update: ProfileUpdate; newSubreddits: string[] }>({
    mutationFn: async ({ id, update, newSubreddits }) => {
      await apiClient.profiles.updateProfile(id, update);

      const currentSubredditsSettings = await apiClient.subreddits.getSubredditsForProfile(id);
      const currentSubreddits = currentSubredditsSettings.map(s => s.subreddit);

      const subredditsToAdd = newSubreddits.filter(sr => !currentSubreddits.includes(sr));
      const subredditsToRemove = currentSubreddits.filter(sr => !newSubreddits.includes(sr));

      if (subredditsToAdd.length > 0) {
        await Promise.all(
          subredditsToAdd.map(subreddit =>
            apiClient.subreddits.addProfilesToSubreddit(subreddit, [id])
          )
        );
      }

      if (subredditsToRemove.length > 0) {
        await Promise.all(
          subredditsToRemove.map(subreddit =>
            apiClient.subreddits.removeProfilesFromSubreddit(subreddit, [id])
          )
        );
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['subreddits'] });
      queryClient.invalidateQueries({ queryKey: ['subreddits', 'profile', variables.id] });
    },
    onError: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['subreddits'] });
      queryClient.invalidateQueries({ queryKey: ['subreddits', 'profile', variables.id] });
    },
  });
}

const DETECTION_PAGE_SIZE = 10;

// Detections (replaces useInfiniteFeed)
export function useInfiniteDetections(filter: DetectionFilter) {
  return useInfiniteQuery<ListedDetection[], Error>({
    queryKey: ['detections', filter],
    queryFn: ({ pageParam }) => {
      return apiClient.detections.listDetections({
        lastSeenId: pageParam as number | undefined,
        limit: DETECTION_PAGE_SIZE,
        filter
      });
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < DETECTION_PAGE_SIZE || !lastPage.length) {
        return undefined;
      }
      
      const lastDetection = lastPage[lastPage.length - 1];
      return lastDetection?.detection?.id;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Detection tags (replaces useUpdateUserClassification)
export function useUpdateDetectionTags() {
  const queryClient = useQueryClient();
  return useMutation<DetectionTags, Error, { detectionId: number; tags: DetectionTagsUpdate }>({
    mutationFn: ({ detectionId, tags }) => apiClient.detections.updateTags(detectionId, tags),
    onSuccess: (updatedTags, { detectionId }) => {
      // Update the cached detections that contain this detection
      queryClient.setQueriesData<InfiniteData<ListedDetection[]>>(
        { queryKey: ['detections'] },
        (oldData) => {
          if (!oldData) return oldData;
          
          // Update the tags in all pages that contain this detection
          return {
            ...oldData,
            pages: oldData.pages.map(page => 
              page.map(listedDetection => {
                if (listedDetection.detection && listedDetection.detection.id === detectionId) {
                  return {
                    ...listedDetection,
                    tags: updatedTags
                  };
                }
                return listedDetection;
              })
            )
          };
        }
      );
    },
  });
}

// Analyze post
export function useAnalyzePost() {
  return useMutation<Detection, Error, AnalyzeRequest>({
    mutationFn: (request) => apiClient.analysis.analyzePost(request),
  });
}

// Subreddits
export function useSubreddits() {
  return useQuery<SubredditSettings[], Error>({
    queryKey: ['subreddits'],
    queryFn: () => apiClient.subreddits.getAllSubreddits(),
  });
}

export function useSubredditsForProfile(profileId: number) {
  return useQuery<SubredditSettings[], Error>({
    queryKey: ['subreddits', 'profile', profileId],
    queryFn: async () => {
      if (profileId < 0) {
        return [];
      }
      
      return await apiClient.subreddits.getSubredditsForProfile(profileId)
    },
    enabled: !!profileId,
  });
}

export function useAddProfilesToSubreddit() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { subreddit: string; profileIds: number[] }>({
    mutationFn: ({ subreddit, profileIds }) => apiClient.subreddits.addProfilesToSubreddit(subreddit, profileIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subreddits'] });
    },
  });
}

export function useRemoveProfilesFromSubreddit() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { subreddit: string; profileIds: number[] }>({
    mutationFn: ({ subreddit, profileIds }) => apiClient.subreddits.removeProfilesFromSubreddit(subreddit, profileIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subreddits'] });
    },
  });
} 