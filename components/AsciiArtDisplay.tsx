/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import type { AsciiArtData } from '../services/geminiService';

interface AsciiArtDisplayProps {
  artData: AsciiArtData | null;
  topic: string;
}

const AsciiArtDisplay: React.FC<AsciiArtDisplayProps> = ({ artData, topic }) => {
  const [visibleContent, setVisibleContent] = useState<string>('*'); // Start with placeholder
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  useEffect(() => {
    let intervalId: number;

    if (artData) {
      setVisibleContent(''); // Clear the initial '*' placeholder
      setIsStreaming(true);

      // Conditionally construct the full text based on whether text data exists.
      const fullText = artData.text ? `${artData.art}\n\n${artData.text}` : artData.art;
      let currentIndex = 0;
      
      intervalId = window.setInterval(() => {
        const char = fullText[currentIndex];
        if (char !== undefined) { // Check if character exists
          setVisibleContent(prev => prev + char);
          currentIndex++;
        } else {
          // Once we're out of characters, stop the interval and cursor.
          window.clearInterval(intervalId);
          setIsStreaming(false);
        }
      }, 5); // A 10ms delay creates a fast, smooth "typing" effect.

    } else {
      // If artData is null (e.g., on a new search), reset to the placeholder.
      setVisibleContent('*');
      setIsStreaming(false);
    }
    
    // The cleanup function is crucial to prevent memory leaks.
    return () => window.clearInterval(intervalId);
  }, [artData]); // This effect re-runs whenever the artData prop changes.

  const accessibilityLabel = `ASCII-Kunst für ${topic}`;

  return (
    <pre className="ascii-art" aria-label={accessibilityLabel}>
      {visibleContent}
      {isStreaming && <span className="blinking-cursor">|</span>}
    </pre>
  );
};

export default AsciiArtDisplay;