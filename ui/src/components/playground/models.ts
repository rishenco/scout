import type { Detection, ListedDetection } from "@/api/models";

export interface BenchmarkStats {
    total: number;
    analyzed: number;
    correct: number;
    wrong: number;
}

export interface PlaygroundPost {
    originalPost: ListedDetection;
    newDetection?: Detection;
}

export function isPostCorrect(post: PlaygroundPost): boolean | undefined {
    const wasCorrect = post.originalPost.tags?.relevancy_detected_correctly
    if (wasCorrect === undefined || post.newDetection === undefined) {
        return undefined
    }
    const sameAsOriginal = post.originalPost.detection.is_relevant === post.newDetection.is_relevant;
    if (wasCorrect) {
        return sameAsOriginal;
    } else {
        return !sameAsOriginal;
    }
}