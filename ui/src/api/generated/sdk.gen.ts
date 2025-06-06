// This file is auto-generated by @hey-api/openapi-ts

import type { Options as ClientOptions, TDataShape, Client } from '@hey-api/client-axios';
import type { GetApiProfilesData, GetApiProfilesResponse, GetApiProfilesError, PostApiProfilesData, PostApiProfilesResponse, PostApiProfilesError, DeleteApiProfilesByIdData, DeleteApiProfilesByIdResponse, DeleteApiProfilesByIdError, GetApiProfilesByIdData, GetApiProfilesByIdResponse, GetApiProfilesByIdError, PutApiProfilesByIdData, PutApiProfilesByIdError, PostApiProfilesByIdJumpstartData, PostApiProfilesByIdJumpstartResponse, PostApiProfilesByIdJumpstartError, PostApiDetectionsListData, PostApiDetectionsListResponse, PostApiDetectionsListError, PutApiDetectionsTagsData, PutApiDetectionsTagsResponse, PutApiDetectionsTagsError, PostApiAnalyzeData, PostApiAnalyzeResponse, PostApiAnalyzeError, GetApiSourcesRedditSubredditsData, GetApiSourcesRedditSubredditsResponse, GetApiSourcesRedditSubredditsError, PostApiSourcesRedditSubredditsBySubredditAddProfilesData, PostApiSourcesRedditSubredditsBySubredditAddProfilesResponse, PostApiSourcesRedditSubredditsBySubredditAddProfilesError, PostApiSourcesRedditSubredditsBySubredditRemoveProfilesData, PostApiSourcesRedditSubredditsBySubredditRemoveProfilesResponse, PostApiSourcesRedditSubredditsBySubredditRemoveProfilesError, GetApiSourcesRedditSubredditsWithProfileData, GetApiSourcesRedditSubredditsWithProfileResponse, GetApiSourcesRedditSubredditsWithProfileError } from './types.gen';
import { client as _heyApiClient } from './client.gen';

export type Options<TData extends TDataShape = TDataShape, ThrowOnError extends boolean = boolean> = ClientOptions<TData, ThrowOnError> & {
    /**
     * You can provide a client instance returned by `createClient()` instead of
     * individual options. This might be also useful if you want to implement a
     * custom client.
     */
    client?: Client;
    /**
     * You can pass arbitrary values through the `meta` object. This can be
     * used to access values that aren't defined as part of the SDK function.
     */
    meta?: Record<string, unknown>;
};

/**
 * Get all profiles
 */
export const getApiProfiles = <ThrowOnError extends boolean = false>(options?: Options<GetApiProfilesData, ThrowOnError>) => {
    return (options?.client ?? _heyApiClient).get<GetApiProfilesResponse, GetApiProfilesError, ThrowOnError>({
        security: [
            {
                scheme: 'basic',
                type: 'http'
            }
        ],
        url: '/api/profiles',
        ...options
    });
};

/**
 * Create a new profile
 */
export const postApiProfiles = <ThrowOnError extends boolean = false>(options: Options<PostApiProfilesData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).post<PostApiProfilesResponse, PostApiProfilesError, ThrowOnError>({
        security: [
            {
                scheme: 'basic',
                type: 'http'
            }
        ],
        url: '/api/profiles',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers
        }
    });
};

/**
 * Delete a profile by ID
 */
export const deleteApiProfilesById = <ThrowOnError extends boolean = false>(options: Options<DeleteApiProfilesByIdData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).delete<DeleteApiProfilesByIdResponse, DeleteApiProfilesByIdError, ThrowOnError>({
        security: [
            {
                scheme: 'basic',
                type: 'http'
            }
        ],
        url: '/api/profiles/{id}',
        ...options
    });
};

/**
 * Get a profile by ID
 */
export const getApiProfilesById = <ThrowOnError extends boolean = false>(options: Options<GetApiProfilesByIdData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).get<GetApiProfilesByIdResponse, GetApiProfilesByIdError, ThrowOnError>({
        security: [
            {
                scheme: 'basic',
                type: 'http'
            }
        ],
        url: '/api/profiles/{id}',
        ...options
    });
};

/**
 * Update a profile by ID
 */
export const putApiProfilesById = <ThrowOnError extends boolean = false>(options: Options<PutApiProfilesByIdData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).put<unknown, PutApiProfilesByIdError, ThrowOnError>({
        security: [
            {
                scheme: 'basic',
                type: 'http'
            }
        ],
        url: '/api/profiles/{id}',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers
        }
    });
};

/**
 * Jumpstart a profile - run analysis on old posts
 */
export const postApiProfilesByIdJumpstart = <ThrowOnError extends boolean = false>(options: Options<PostApiProfilesByIdJumpstartData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).post<PostApiProfilesByIdJumpstartResponse, PostApiProfilesByIdJumpstartError, ThrowOnError>({
        security: [
            {
                scheme: 'basic',
                type: 'http'
            }
        ],
        url: '/api/profiles/{id}/jumpstart',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers
        }
    });
};

/**
 * List detections
 */
export const postApiDetectionsList = <ThrowOnError extends boolean = false>(options: Options<PostApiDetectionsListData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).post<PostApiDetectionsListResponse, PostApiDetectionsListError, ThrowOnError>({
        security: [
            {
                scheme: 'basic',
                type: 'http'
            }
        ],
        url: '/api/detections/list',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers
        }
    });
};

/**
 * Detection tag update
 */
export const putApiDetectionsTags = <ThrowOnError extends boolean = false>(options: Options<PutApiDetectionsTagsData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).put<PutApiDetectionsTagsResponse, PutApiDetectionsTagsError, ThrowOnError>({
        security: [
            {
                scheme: 'basic',
                type: 'http'
            }
        ],
        url: '/api/detections/tags',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers
        }
    });
};

/**
 * Analyze a post
 */
export const postApiAnalyze = <ThrowOnError extends boolean = false>(options: Options<PostApiAnalyzeData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).post<PostApiAnalyzeResponse, PostApiAnalyzeError, ThrowOnError>({
        security: [
            {
                scheme: 'basic',
                type: 'http'
            }
        ],
        url: '/api/analyze',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers
        }
    });
};

/**
 * Get all subreddits
 */
export const getApiSourcesRedditSubreddits = <ThrowOnError extends boolean = false>(options?: Options<GetApiSourcesRedditSubredditsData, ThrowOnError>) => {
    return (options?.client ?? _heyApiClient).get<GetApiSourcesRedditSubredditsResponse, GetApiSourcesRedditSubredditsError, ThrowOnError>({
        security: [
            {
                scheme: 'basic',
                type: 'http'
            }
        ],
        url: '/api/sources/reddit/subreddits',
        ...options
    });
};

/**
 * Add profiles
 */
export const postApiSourcesRedditSubredditsBySubredditAddProfiles = <ThrowOnError extends boolean = false>(options: Options<PostApiSourcesRedditSubredditsBySubredditAddProfilesData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).post<PostApiSourcesRedditSubredditsBySubredditAddProfilesResponse, PostApiSourcesRedditSubredditsBySubredditAddProfilesError, ThrowOnError>({
        security: [
            {
                scheme: 'basic',
                type: 'http'
            }
        ],
        url: '/api/sources/reddit/subreddits/{subreddit}/add_profiles',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers
        }
    });
};

/**
 * Remove profiles
 */
export const postApiSourcesRedditSubredditsBySubredditRemoveProfiles = <ThrowOnError extends boolean = false>(options: Options<PostApiSourcesRedditSubredditsBySubredditRemoveProfilesData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).post<PostApiSourcesRedditSubredditsBySubredditRemoveProfilesResponse, PostApiSourcesRedditSubredditsBySubredditRemoveProfilesError, ThrowOnError>({
        security: [
            {
                scheme: 'basic',
                type: 'http'
            }
        ],
        url: '/api/sources/reddit/subreddits/{subreddit}/remove_profiles',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers
        }
    });
};

/**
 * Get all subreddits by profile
 */
export const getApiSourcesRedditSubredditsWithProfile = <ThrowOnError extends boolean = false>(options: Options<GetApiSourcesRedditSubredditsWithProfileData, ThrowOnError>) => {
    return (options.client ?? _heyApiClient).get<GetApiSourcesRedditSubredditsWithProfileResponse, GetApiSourcesRedditSubredditsWithProfileError, ThrowOnError>({
        security: [
            {
                scheme: 'basic',
                type: 'http'
            }
        ],
        url: '/api/sources/reddit/subreddits_with_profile',
        ...options
    });
};