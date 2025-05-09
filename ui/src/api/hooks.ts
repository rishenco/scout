import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ProfileSettings,
  Profile,
  NewUserClassification,
  UserClassification,
  AnalyzePostsRequest,
  AnalyzePostsResponse,
  DetectionWithPost,
  UserClassificationWithPost,
  Post,
} from './models';
import {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  getDetections,
  getUserClassifications,
  createUserClassification,
  getUserClassification,
  updateUserClassification,
  deleteUserClassification,
  getPosts,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<Profile, Error, { id: string; settings: ProfileSettings }, string[]>({
    mutationFn: ({ id, settings }) => updateProfile(id, settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

// Detections
export function useDetections(params: {
  profile_id: string;
  is_relevant?: boolean;
  limit?: number;
  offset?: number;
}) {
  return useQuery<DetectionWithPost[], Error, DetectionWithPost[]>({
    queryKey: ['detections', params],
    queryFn: () => getDetections(params),
  });
}

// User Classifications
export function useUserClassifications(params: {
  profile_id?: string;
  post_id?: string;
  is_relevant?: boolean;
  limit?: number;
  offset?: number;
}) {
  return useQuery<UserClassificationWithPost[], Error, UserClassificationWithPost[]>({
    queryKey: ['user_classifications', params],
    queryFn: () => getUserClassifications(params),
  });
}

export function useCreateUserClassification() {
  const queryClient = useQueryClient();
  return useMutation<UserClassification, Error, NewUserClassification>({
    mutationFn: createUserClassification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user_classifications'] }),
  });
}

export function useUserClassification(profileId: string, postId: string) {
  return useQuery<UserClassification, Error, UserClassification>({
    queryKey: ['user_classification', profileId, postId],
    queryFn: () => getUserClassification(profileId, postId),
    enabled: !!profileId && !!postId,
  });
}

export function useUpdateUserClassification() {
  const queryClient = useQueryClient();
  return useMutation<UserClassification, Error, { profileId: string; postId: string; data: NewUserClassification }>({
    mutationFn: ({ profileId, postId, data }) => updateUserClassification(profileId, postId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user_classifications'] }),
  });
}

export function useDeleteUserClassification() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { profileId: string; postId: string }>({
    mutationFn: ({ profileId, postId }) => deleteUserClassification(profileId, postId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user_classifications'] }),
  });
}

// Posts
export function usePosts(ids?: string[]) {
  return useQuery<Post[], Error, Post[]>({
    queryKey: ['posts', ids],
    queryFn: () => getPosts(ids),
    enabled: !!ids,
  });
}

// Analyze Posts
export function useAnalyzePosts() {
  return useMutation<AnalyzePostsResponse, Error, AnalyzePostsRequest>({
    mutationFn: analyzePosts,
  });
} 