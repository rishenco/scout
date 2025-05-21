import type { RedditPost } from '@/api/models';
import { renderMarkdown } from '@/utils/renderMarkdown';

interface RedditPostBodyProps {
  post: RedditPost;
  compact?: boolean;
}

export function RedditPostBody({ post, compact }: RedditPostBodyProps) {
  const hasMedia = !post.selftext && post.url;

  if (hasMedia) {
    // Basic media rendering - assuming image or video based on common extensions
    // This could be expanded to be more robust or use a library
    let media_url = post.url;
    const isImage = /.(jpeg|jpg|gif|png)$/.test(media_url);
    let isVideo = /.(mp4|webm)$/.test(media_url) || post.url.includes('v.redd.it');

    if (isImage) {
      return <img src={media_url} alt={post.title} className={`w-full object-contain bg-black ${compact ? 'max-h-72' : 'h-96'}`} />;
    }
    if (isVideo) {
      return <span className="italic text-muted-foreground text-sm">(Can't show video due to reddit restrictions)</span>;
    }
    // Fallback for other media or if we want to show a generic link
    return (
      <a href={media_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
        Unknown media type: {media_url}
      </a>
    );
  }

  const segments = renderMarkdown(post.selftext);

  return (
    <div className={`text-sm ${compact ? 'line-clamp-2' : 'whitespace-pre-wrap'} text-muted-foreground`}>
      {segments.map((segment, index) =>
        segment.type === 'link' && segment.href ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {segment.content}
          </a>
        ) : (
          <span key={index}>{segment.content}</span>
        )
      )}
    </div>
  );
}