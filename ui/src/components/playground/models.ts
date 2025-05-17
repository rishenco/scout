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
