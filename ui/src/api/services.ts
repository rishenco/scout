import type {
    ProfileSettings, Profile, DetectionWithPost, Detection, NewUserClassification,
    UserClassification, UserClassificationWithPost, Post, AnalyzePostsRequest, AnalyzePostsResponse
} from './models';

// In-memory data stores
const profiles: Profile[] = [
  {
    id: '1',
    name: 'Programming Updates',
    subreddits: ['programming', 'webdev', 'reactjs'],
    relevancy_filter_prompt: 'Check if the post is related to new programming tools, libraries, or frameworks.',
    properties_prompts: {
      'Technology': 'What technology is mentioned in the post?',
      'Type': 'Is this about a new release, bug fix, or general discussion?',
      'Importance': 'On a scale of Low, Medium, High, how important is this update?'
    }
  }
];
const userClassifications: UserClassification[] = [];
const posts: Post[] = [];
const detectionsStore: Detection[] = [];

// Profiles
export async function getProfiles(): Promise<Profile[]> {
    return profiles;
}

export async function getProfile(id: string): Promise<Profile> {
    const p = profiles.find(p => p.id === id);
    if (!p) throw new Error('Profile not found');
    return p;
}

export async function createProfile(settings: ProfileSettings): Promise<Profile> {
    const id = crypto.randomUUID();
    const newProfile: Profile = { id, ...settings };
    profiles.push(newProfile);
    return newProfile;
}

export async function updateProfile(id: string, settings: ProfileSettings): Promise<Profile> {
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Profile not found');
    const updated: Profile = { id, ...settings };
    profiles[index] = updated;
    return updated;
}

export async function deleteProfile(id: string): Promise<void> {
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Profile not found');
    profiles.splice(index, 1);
}

// Detections
export async function getDetections(params: {
    profile_id: string;
    is_relevant?: boolean;
    limit?: number;
    offset?: number;
}): Promise<DetectionWithPost[]> {
    // Stub implementation: always return empty array
    return [];
}

// User Classifications
export async function getUserClassifications(params: {
    profile_id?: string;
    post_id?: string;
    is_relevant?: boolean;
    limit?: number;
    offset?: number;
}): Promise<UserClassificationWithPost[]> {
    return [];
}

export async function createUserClassification(data: NewUserClassification): Promise<UserClassification> {
    const created_at = new Date().toISOString();
    const newClassification: UserClassification = { ...data, created_at };
    userClassifications.push(newClassification);
    return newClassification;
}

export async function getUserClassification(profileId: string, postId: string): Promise<UserClassification> {
    const u = userClassifications.find(u => u.profile_id === profileId && u.post_id === postId);
    if (!u) throw new Error('Classification not found');
    return u;
}

export async function updateUserClassification(profileId: string, postId: string, data: NewUserClassification): Promise<UserClassification> {
    const index = userClassifications.findIndex(u => u.profile_id === profileId && u.post_id === postId);
    if (index === -1) throw new Error('Classification not found');
    const updated: UserClassification = { ...data, created_at: new Date().toISOString() };
    userClassifications[index] = updated;
    return updated;
}

export async function deleteUserClassification(profileId: string, postId: string): Promise<void> {
    const index = userClassifications.findIndex(u => u.profile_id === profileId && u.post_id === postId);
    if (index === -1) throw new Error('Classification not found');
    userClassifications.splice(index, 1);
}

// Posts
export async function getPosts(ids?: string[]): Promise<Post[]> {
    if (!ids) return posts;
    return posts.filter(p => ids.includes(p.id));
}

// Analyze Posts
export async function analyzePosts(request: AnalyzePostsRequest): Promise<AnalyzePostsResponse> {
    return {
        detections: request.post_ids.map(id => ({ post_id: id, is_relevant: true, extracted_properties: {} })),
        errors: []
    };
} 