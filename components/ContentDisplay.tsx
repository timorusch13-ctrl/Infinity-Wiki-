/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface ContentDisplayProps {
  content: string;
  isLoading: boolean;
  onWordClick: (word: string) => void;
}

const InteractiveContent: React.FC<{
  content: string;
  onWordClick: (word: string) => void;
}> = ({ content, onWordClick }) => {
  const words = content.split(/(\s+)/).filter(Boolean); // Keep whitespace for spacing

  return (
    <p style={{ margin: 0 }}>
      {words.map((word, index) => {
        // Only make non-whitespace words clickable
        if (/\S/.test(word)) {
          const cleanWord = word.replace(/[.,!?;:()"']/g, '');
          if (cleanWord) {
            return (
              <button
                key={index}
                onClick={() => onWordClick(cleanWord)}
                className="interactive-word"
                aria-label={`Erfahre mehr über ${cleanWord}`}
              >
                {word}
              </button>
            );
          }
        }
        // Render whitespace as-is
        return <span key={index}>{word}</span>;
      })}
    </p>
  );
};

const StreamingContent: React.FC<{ content: string }> = ({ content }) => (
  <p style={{ margin: 0 }}>
    {content}
    <span className="blinking-cursor">|</span>
  </p>
);

const ContentDisplay: React.FC<ContentDisplayProps> = ({ content, isLoading, onWordClick }) => {
  if (isLoading) {
    return <StreamingContent content={content} />;
  }
  
  if (content) {
    return <InteractiveContent content={content} onWordClick={onWordClick} />;
  }

  return null;
};

export default ContentDisplay;