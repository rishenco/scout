import type {
  ProfileSettings, Profile, Detection, UserClassification, Post, AnalyzePostsRequest, AnalyzePostsResponse, FeedPost, FeedFilters, RedditPost
} from './models';

// In-memory data stores
const profiles: Profile[] = [
  {
    id: 'profile-1',
    name: 'Tech News',
    subreddits: ['technology', 'futurology', 'gadgets'],
    relevancy_filter_prompt: 'Is this post about a significant new technology or a major tech event?',
    properties_prompts: {
      'Category': 'What category of tech does this fall into (e.g., AI, Hardware, Software)?',
      'Impact': 'What is the potential impact of this news (Low, Medium, High)?'
    }
  },
  {
    id: 'profile-2',
    name: 'Gaming Updates',
    subreddits: ['gaming', 'games', 'pcgaming'],
    relevancy_filter_prompt: 'Does this post announce a new game, a major update, or significant gaming news?',
    properties_prompts: {
      'Genre': 'What is the genre of the game mentioned?',
      'Platform': 'What platform is this news for (PC, PS5, Xbox, Switch, Mobile)?'
    }
  }
];

const userClassifications: UserClassification[] = [
  // { profile_id: 'profile-1', post_id: 'post-1', is_relevant: true },
  // { profile_id: 'profile-1', post_id: 'post-2', is_relevant: false },
  // { profile_id: 'profile-2', post_id: 'post-3', is_relevant: null },
];

const posts: Post[] = [
  {
    id: 'post-1',
    title: 'Revolutionary AI Model Released',
    content: 'A new AI model that can generate photorealistic images from text has been released by Acme Corp.',
    reddit: {
      permalink: '/r/technology/comments/post1',
      score: 1052,
      num_comments: 234,
      subreddit: 'technology',
    } as RedditPost,
  },
  {
    id: 'post-2',
    title: 'Next-Gen Quantum Computer Unveiled',
    content: 'Innovatech today unveiled its new quantum computer, promising unprecedented processing power.',
    reddit: {
      permalink: '/r/futurology/comments/post2',
      score: 876,
      num_comments: 150,
      subreddit: 'futurology',
    } as RedditPost,
  },
  {
    id: 'post-3',
    title: 'Cyberpunk 2077 Major Expansion "Phantom Liberty" Details',
    content: 'CD Projekt Red has detailed the upcoming major expansion for Cyberpunk 2077, titled Phantom Liberty. ALSO VERY LONG TEXT ABOBOBOOO BAOBOB BABAB AADASDSADS ASDASDS ASDASAS ASDSDAS SDSDASDS DSASDSD SDASDASDAS ASDASD ASDASD ASDASD ASDS DSDASD DSADAS DSADASD ASDSAD ASD ASD SDA SDS DSD SD DSDSSDADAD SDASDASD SASDDADSa ASDA SDASD SD ASDD DAS DSAASD AS DSDAD DASDS  DASD ASD ASDSD ADDDSDASDD DASD',
    reddit: {
      permalink: '/r/gaming/comments/post3',
      score: 2500,
      num_comments: 600,
      subreddit: 'gaming',
    } as RedditPost,
  },
  {
    id: 'post-4',
    title: 'New Open World RPG "Ancient Realms" Announced',
    content: 'Indie studio DreamWeavers announced their debut title, an open-world RPG called "Ancient Realms".',
    reddit: {
      permalink: '/r/games/comments/post4',
      score: 1200,
      num_comments: 300,
      subreddit: 'games',
    } as RedditPost,
  },
  {
    id: 'post-5',
    title: 'The Future of VR Headsets: Lighter and More Powerful',
    content: 'A deep dive into the upcoming generation of VR headsets, focusing on reduced weight and increased FOV.',
    reddit: {
      permalink: '/r/gadgets/comments/post5',
      score: 750,
      num_comments: 120,
      subreddit: 'gadgets',
    } as RedditPost,
  },
  {
    id: 'post-6',
    title: 'Another VR Headset Post',
    content: 'More details on VR.',
    reddit: { permalink: '/r/gadgets/comments/post6', score: 650, num_comments: 90, subreddit: 'gadgets' } as RedditPost,
  },
  {
    id: 'post-7',
    title: 'VR Headsets: The Saga Continues',
    content: 'Even more on VR.',
    reddit: { permalink: '/r/gadgets/comments/post7', score: 550, num_comments: 80, subreddit: 'gadgets' } as RedditPost,
  }
];

const detectionsStore: Detection[] = [
  {
    id: 'det-1',
    profile_id: 'profile-1', // Tech News
    post_id: 'post-1',      // AI Model
    is_relevant: true,
    extracted_properties: { Category: 'AI', Impact: 'High', Summary: 'A new AI model that can generate photorealistic images from text has been released by Acme Corp.' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'det-2',
    profile_id: 'profile-1', // Tech News
    post_id: 'post-2',      // Quantum Computer
    is_relevant: true,
    extracted_properties: { Category: 'Hardware', Impact: 'High' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(), // 1 hour ago
  },
  { // Ensure post_id here matches an actual post
    id: 'det-8', profile_id: 'profile-1', post_id: 'post-3', is_relevant: true, // Tech profile, gaming post, ensure post-3 exists
    extracted_properties: { Mixed: 'Content' }, created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
  },
  {
    id: 'det-9', profile_id: 'profile-1', post_id: 'post-4', is_relevant: false, // ensure post-4 exists
    extracted_properties: {}, created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
  },
  {
    id: 'det-5',
    profile_id: 'profile-1', // Tech News
    post_id: 'post-5',      // VR Headsets
    is_relevant: false, // Example of not relevant
    extracted_properties: { Category: 'Hardware', Impact: 'Medium' },
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
  },
  {
    id: 'det-11', profile_id: 'profile-1', post_id: 'post-6', is_relevant: false, // ensure post-6 exists
    extracted_properties: {}, created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString()
  },
  {
    id: 'det-12', profile_id: 'profile-1', post_id: 'post-7', is_relevant: true, // ensure post-7 exists
    extracted_properties: {}, created_at: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString()
  },
  {
    id: 'det-3',
    profile_id: 'profile-2', // Gaming Updates
    post_id: 'post-3',      // Cyberpunk Expansion
    is_relevant: true,
    extracted_properties: { Genre: 'RPG', Platform: 'PC, PS5, Xbox' },
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
  },
  {
    id: 'det-4',
    profile_id: 'profile-2', // Gaming Updates
    post_id: 'post-4',      // Ancient Realms
    is_relevant: true,
    extracted_properties: { Genre: 'RPG', Platform: 'PC' },
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 mins ago
  },
];

// Profiles
export async function getProfiles(): Promise<Profile[]> {
  return [...profiles];
}

export async function getProfile(id: string): Promise<Profile> {
  const p = profiles.find(p => p.id === id);
  if (!p) throw new Error('Profile not found');
  return { ...p };
}

export async function createProfile(settings: ProfileSettings): Promise<Profile> {
  const id = crypto.randomUUID();
  const newProfile: Profile = { id, ...settings };
  profiles.push(newProfile);
  return { ...newProfile };
}

export async function updateProfile(id: string, settings: ProfileSettings): Promise<Profile> {
  const index = profiles.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Profile not found');
  const updated: Profile = { id, ...settings };
  profiles[index] = updated;
  return { ...updated };
}

export async function deleteProfile(id: string): Promise<void> {
  const index = profiles.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Profile not found');
  profiles.splice(index, 1);
}


export async function getFeed(params: {
  profile_id: string;
  limit?: number;
  offset?: number;
  filters?: FeedFilters;
  order?: 'new' | 'max_score' | 'relevant';
}): Promise<FeedPost[]> {
  const { profile_id, limit = 10, offset = 0, filters = {}, order = 'new' } = params;

  // 1. Filter detections by profile_id
  const detectionsForProfile = detectionsStore.filter(d => d.profile_id === profile_id);

  // 2. Enrich detections with post and user classification data
  const feedPostCandidates: FeedPost[] = [];
  for (const detection of detectionsForProfile) {
    const post = posts.find(p => p.id === detection.post_id);
    if (!post) {
      continue; // Skip detections without a corresponding post
    }

    let userClassification = userClassifications.find(uc => uc.profile_id === profile_id && uc.post_id === detection.post_id);
    if (!userClassification) {
      userClassification = { profile_id, post_id: detection.post_id, is_relevant: null };
    }

    feedPostCandidates.push({
      detection: { ...detection },
      post: { ...post },
      user_classification: { ...userClassification }
    });
  }

  // 3. Apply filters
  const filteredFeedPosts = feedPostCandidates.filter(fp => {
    if (filters.is_relevant !== undefined && fp.detection.is_relevant !== filters.is_relevant) {
      return false;
    }
    if (filters.has_user_classification !== undefined) {
      const hasClassification = fp.user_classification.is_relevant !== null;
      if (hasClassification !== filters.has_user_classification) {
        return false;
      }
    }
    if (filters.user_classification_value !== undefined && fp.user_classification.is_relevant !== filters.user_classification_value) {
      return false;
    }
    if (filters.newer) {
      try {
        if (new Date(fp.detection.created_at) <= new Date(filters.newer)) {
          return false;
        }
      } catch (_) { /* Ignore invalid date format in filter */ }
    }
    if (filters.reddit) {
      if (filters.reddit.subreddit && fp.post.reddit.subreddit !== filters.reddit.subreddit) {
        return false;
      }
      if (filters.reddit.score_greater !== undefined && fp.post.reddit.score < filters.reddit.score_greater) {
        return false;
      }
    }
    return true;
  });

  // 4. Sort
  filteredFeedPosts.sort((a, b) => {
    switch (order) {
      case 'max_score':
        return b.post.reddit.score - a.post.reddit.score;
      case 'relevant':
        // Sort by relevance (true first), then by date (newest first)
        if (a.detection.is_relevant !== b.detection.is_relevant) {
          return a.detection.is_relevant ? -1 : 1;
        }
        return new Date(b.detection.created_at).getTime() - new Date(a.detection.created_at).getTime();
      case 'new':
      default:
        return new Date(b.detection.created_at).getTime() - new Date(a.detection.created_at).getTime();
    }
  });

  // 5. Paginate
  return filteredFeedPosts.slice(offset, offset + limit);
}

export async function updateUserClassification(data: UserClassification): Promise<UserClassification> {
  const { profile_id, post_id, is_relevant } = data;
  const index = userClassifications.findIndex(uc => uc.profile_id === profile_id && uc.post_id === post_id);

  if (index !== -1) { // Existing classification found, update it
    userClassifications[index].is_relevant = is_relevant;
    return { ...userClassifications[index] };
  } else { // No existing classification, create new
    const newClassification: UserClassification = { profile_id, post_id, is_relevant };
    userClassifications.push(newClassification);
    return { ...newClassification };
  }
}

export async function getUserClassification(profileId: string, postId: string): Promise<UserClassification> {
  const classification = userClassifications.find(u => u.profile_id === profileId && u.post_id === postId);
  return classification ? { ...classification } : { profile_id: profileId, post_id: postId, is_relevant: null };
}

// Analyze Posts
export async function analyzePosts(request: AnalyzePostsRequest): Promise<AnalyzePostsResponse> {
  // simulate delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { profile, post_ids } = request; // profile settings are not used in this mock generation

  const detections: Detection[] = post_ids.map((postId, index) => {
    // Find if there's an actual post for this id to make it more realistic
    const existingPost = posts.find(p => p.id === postId);
    const isRelevant = Math.random() > 0.3; // Mock relevancy
    return {
      id: `ana-det-${postId}-${index}-${Date.now()}`, // Generate a unique ID
      profile_id: profile.name, // Using profile name as a placeholder for profile_id as full profile object is not passed
      // Or ideally, if a profile_id was part of AnalyzePostsRequest or context
      post_id: postId,
      is_relevant: existingPost ? isRelevant : false, // If post doesn't exist, mark as not relevant
      extracted_properties: existingPost ? {
        MockProp1: `Value for ${postId}`,
        Source: "AnalysisV2"
      } : {} as Record<string, string>, // Ensure empty object is typed correctly
      created_at: new Date().toISOString(),
    };
  });

  const errors: AnalyzePostsResponse['errors'] = [];
  // Example: Add an error if a post_id doesn't exist in the mock 'posts'
  post_ids.forEach(pid => {
    if (!posts.some(p => p.id === pid)) {
      // The schema for error post_id is number, but our post_ids are strings.
      // This is a mismatch. For now, I'll use 0 or try to parse.
      // The provided openapi.yaml for AnalyzePostsResponse error has `post_id: type: integer`.
      // This is an issue with the schema vs usage. I'll use a placeholder.
      errors.push({ post_id: pid, error: `Mock: Post with id ${pid} not found during analysis.` });
    }
  });


  return {
    detections,
    errors
  };
} 