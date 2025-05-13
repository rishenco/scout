import type { Detection } from "@/api/models";

import type { FeedPost } from "@/api/models";

export interface BenchmarkStats {
    total: number;
    analyzed: number;
    correct: number;
    wrong: number;
}

export interface PlaygroundPost {
    originalPost: FeedPost;
    newDetection?: Detection;
}
