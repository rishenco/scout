export interface TextSegment {
  type: 'text' | 'link';
  content: string;
  href?: string;
}

export const renderMarkdown = (text: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  // Regex to find markdown links and plain URLs
  // Markdown: \[([^\]]+)\]\(([^)]+)\)
  // Plain URL: (\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%?=~_|])
  const combinedRegex = /\[([^\]]+)\]\(([^)]+)\)|(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%?=~_|])/gi;

  let match;
  while ((match = combinedRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const [fullMatch, mdText, mdUrl, plainUrl] = match;

    // Add preceding text segment
    if (matchIndex > lastIndex) {
      segments.push({ type: 'text', content: text.substring(lastIndex, matchIndex) });
    }

    if (mdText && mdUrl) { // Markdown link
      segments.push({ type: 'link', content: mdText, href: mdUrl });
    } else if (plainUrl) { // Plain URL
      segments.push({ type: 'link', content: plainUrl, href: plainUrl });
    }

    lastIndex = combinedRegex.lastIndex;
  }

  // Add any remaining text after the last match
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.substring(lastIndex) });
  }
  
  // If no links were found, return the whole text as a single segment
  if (segments.length === 0 && text.length > 0) {
    segments.push({ type: 'text', content: text });
  }

  return segments;
}; 