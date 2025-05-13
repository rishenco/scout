import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import type {
  ProfileSettings,
  Profile,
  UserClassification,
  AnalyzePostsRequest,
  AnalyzePostsResponse,
  FeedPost,
  FeedFilters
} from './models';
import {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  getFeed,
  updateUserClassification,
  getUserClassification,
  analyzePosts,
} from './services';

// Profiles
export function useProfiles() {
  return useQuery<Profile[], Error, Profile[]>({
    queryKey: ['profiles'],
    queryFn: getProfiles,
  });
}

export function useProfile(id: string) {
  return useQuery<Profile, Error, Profile>({
    queryKey: ['profiles', id],
    queryFn: () => getProfile(id),
    enabled: !!id,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation<Profile, Error, ProfileSettings>({
    mutationFn: createProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.setQueryData(['profiles', data.id], data);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<Profile, Error, { id: string; settings: ProfileSettings }>({
    mutationFn: ({ id, settings }) => updateProfile(id, settings),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.setQueryData(['profiles', variables.id], data);
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteProfile,
    onSuccess: (_, profileId) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.removeQueries({ queryKey: ['profiles', profileId] });
    },
  });
}

const FEED_PAGE_SIZE = 10;

export function useInfiniteFeed(params: {
  profile_id: string;
  filters?: FeedFilters;
  order?: 'new' | 'max_score' | 'relevant';
}) {
  return useInfiniteQuery<FeedPost[], Error, InfiniteData<FeedPost[]>, [string, typeof params], number>({
    queryKey: ['feed', params],
    queryFn: ({ pageParam = 0 }) => getFeed({ ...params, offset: pageParam * FEED_PAGE_SIZE, limit: FEED_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (lastPage.length < FEED_PAGE_SIZE) {
        return undefined;
      }
      return lastPageParam + 1;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateUserClassification() {
  const queryClient = useQueryClient();
  return useMutation<UserClassification, Error, UserClassification>({
    mutationFn: updateUserClassification,
    onSuccess: (data) => {
      queryClient.setQueryData(['user_classification', data.profile_id, data.post_id], data);
      queryClient.setQueryData<InfiniteData<FeedPost[]>>(['feed', { profile_id: data.profile_id }], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map(page => page.map(feedPost => {
            if (feedPost.post.id === data.post_id) {
              return { ...feedPost, user_classification: data };
            }
            return feedPost;
          }))
        };
      });
      queryClient.invalidateQueries({ queryKey: ['feed', { profile_id: data.profile_id }] });
    },
  });
}

export function useUserClassification(profileId: string, postId: string) {
  return useQuery<UserClassification, Error, UserClassification>({
    queryKey: ['user_classification', profileId, postId],
    queryFn: () => getUserClassification(profileId, postId),
    enabled: !!profileId && !!postId,
  });
}

// Analyze Posts
export function useAnalyzePosts() {
  return useMutation<AnalyzePostsResponse, Error, AnalyzePostsRequest>({
    mutationFn: analyzePosts,
  });
} 