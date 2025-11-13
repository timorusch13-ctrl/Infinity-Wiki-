/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback } from 'react';
import { streamDefinition, generateAsciiArt, AsciiArtData } from './services/geminiService';
import ContentDisplay from './components/ContentDisplay';
import SearchBar from './components/SearchBar';
import LoadingSkeleton from './components/LoadingSkeleton';
import AsciiArtDisplay from './components/AsciiArtDisplay';

// A curated list of "banger" words and phrases for the random button, in German.
const PREDEFINED_WORDS = [
  // Liste 1
  'Gleichgewicht', 'Harmonie', 'Zwietracht', 'Einheit', 'Fragmentierung', 'Klarheit', 'Mehrdeutigkeit', 'Anwesenheit', 'Abwesenheit', 'Schöpfung', 'Zerstörung', 'Licht', 'Schatten', 'Anfang', 'Ende', 'Aufstieg', 'Fall', 'Verbindung', 'Isolation', 'Hoffnung', 'Verzweiflung',
  // Komplexe Phrasen aus Liste 1
  'Ordnung und Chaos', 'Licht und Schatten', 'Klang und Stille', 'Form und Formlosigkeit', 'Sein und Nichtsein', 'Präsenz und Absenz', 'Bewegung und Stille', 'Einheit und Vielfalt', 'Endlich und Unendlich', 'Heilig und Profan', 'Erinnerung und Vergessen', 'Frage und Antwort', 'Suche und Entdeckung', 'Reise und Ziel', 'Traum und Wirklichkeit', 'Zeit und Ewigkeit', 'Selbst und Andere', 'Bekannt und Unbekannt', 'Gesprochen und Ungesprochen', 'Sichtbar und Unsichtbar',
  // Liste 2
  'Zickzack', 'Wellen', 'Spirale', 'Abprall', 'Schräge', 'Tropfen', 'Dehnen', 'Quetschen', 'Schweben', 'Fallen', 'Drehen', 'Schmelzen', 'Aufsteigen', 'Verdrehen', 'Explodieren', 'Stapeln', 'Spiegel', 'Echo', 'Vibrieren',
  // Liste 3
  'Schwerkraft', 'Reibung', 'Impuls', 'Trägheit', 'Turbulenz', 'Druck', 'Spannung', 'Oszillieren', 'Fraktal', 'Quantum', 'Entropie', 'Wirbel', 'Resonanz', 'Gleichgewicht', 'Zentrifuge', 'Elastisch', 'Viskos', 'Brechen', 'Diffus', 'Kaskade', 'Levitieren', 'Magnetisieren', 'Polarisieren', 'Beschleunigen', 'Komprimieren', 'Wellen',
  // Liste 4
  'Liminal', 'Ephemer', 'Paradox', 'Zeitgeist', 'Metamorphose', 'Synästhesie', 'Rekursion', 'Emergenz', 'Dialektik', 'Apophänie', 'Limbo', 'Fluss', 'Erhaben', 'Unheimlich', 'Palimpsest', 'Chimäre', 'Leere', 'Transzendieren', 'Unaussprechlich', 'Qualia', 'Gestalt', 'Simulacra', 'Abgründig',
  // Liste 5
  'Existenziell', 'Nihilismus', 'Solipsismus', 'Phänomenologie', 'Hermeneutik', 'Dekonstruktion', 'Postmodern', 'Absurdismus', 'Katharsis', 'Epiphanie', 'Melancholie', 'Nostalgie', 'Sehnsucht', 'Träumerei', 'Pathos', 'Ethos', 'Logos', 'Mythos', 'Anamnese', 'Intertextualität', 'Metafiktion', 'Strom', 'Lakune', 'Zäsur', 'Enjambement'
];
const UNIQUE_WORDS = [...new Set(PREDEFINED_WORDS)];


/**
 * Creates a simple ASCII art bounding box as a fallback.
 * @param topic The text to display inside the box.
 * @returns An AsciiArtData object with the generated art.
 */
const createFallbackArt = (topic: string): AsciiArtData => {
  const displayableTopic = topic.length > 20 ? topic.substring(0, 17) + '...' : topic;
  const paddedTopic = ` ${displayableTopic} `;
  const topBorder = `┌${'─'.repeat(paddedTopic.length)}┐`;
  const middle = `│${paddedTopic}│`;
  const bottomBorder = `└${'─'.repeat(paddedTopic.length)}┘`;
  return {
    art: `${topBorder}\n${middle}\n${bottomBorder}`
  };
};

const App: React.FC = () => {
  const [currentTopic, setCurrentTopic] = useState<string>('Hypertext');
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [asciiArt, setAsciiArt] = useState<AsciiArtData | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);


  useEffect(() => {
    if (!currentTopic) return;

    let isCancelled = false;

    const fetchContentAndArt = async () => {
      // Set initial state for a clean page load
      setIsLoading(true);
      setError(null);
      setContent(''); // Clear previous content immediately
      setAsciiArt(null);
      setGenerationTime(null);
      const startTime = performance.now();

      // Kick off ASCII art generation, but don't wait for it.
      // It will appear when it's ready, without blocking the definition.
      generateAsciiArt(currentTopic)
        .then(art => {
          if (!isCancelled) {
            setAsciiArt(art);
          }
        })
        .catch(err => {
          if (!isCancelled) {
            console.error("Failed to generate ASCII art:", err);
            // Generate a simple fallback ASCII art box on failure
            const fallbackArt = createFallbackArt(currentTopic);
            setAsciiArt(fallbackArt);
          }
        });

      let accumulatedContent = '';
      try {
        for await (const chunk of streamDefinition(currentTopic)) {
          if (isCancelled) break;
          
          if (chunk.startsWith('Error:') || chunk.startsWith('Fehler:')) {
            throw new Error(chunk);
          }
          accumulatedContent += chunk;
          if (!isCancelled) {
            setContent(accumulatedContent);
          }
        }
      } catch (e: unknown) {
        if (!isCancelled) {
          const errorMessage = e instanceof Error ? e.message : 'Ein unbekannter Fehler ist aufgetreten';
          setError(errorMessage);
          setContent(''); // Ensure content is clear on error
          console.error(e);
        }
      } finally {
        if (!isCancelled) {
          const endTime = performance.now();
          setGenerationTime(endTime - startTime);
          setIsLoading(false);
        }
      }
    };

    fetchContentAndArt();
    
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTopic]);

  const handleWordClick = useCallback((word: string) => {
    const newTopic = word.trim();
    if (newTopic && newTopic.toLowerCase() !== currentTopic.toLowerCase()) {
      setCurrentTopic(newTopic);
    }
  }, [currentTopic]);

  const handleSearch = useCallback((topic: string) => {
    const newTopic = topic.trim();
    if (newTopic && newTopic.toLowerCase() !== currentTopic.toLowerCase()) {
      setCurrentTopic(newTopic);
    }
  }, [currentTopic]);

  const handleRandom = useCallback(() => {
    setIsLoading(true); // Disable UI immediately
    setError(null);
    setContent('');
    setAsciiArt(null);

    const randomIndex = Math.floor(Math.random() * UNIQUE_WORDS.length);
    const randomWord = UNIQUE_WORDS[randomIndex];

    // Prevent picking the same word twice in a row
    if (randomWord.toLowerCase() === currentTopic.toLowerCase()) {
      const nextIndex = (randomIndex + 1) % UNIQUE_WORDS.length;
      setCurrentTopic(UNIQUE_WORDS[nextIndex]);
    } else {
      setCurrentTopic(randomWord);
    }
  }, [currentTopic]);


  return (
    <div>
      <SearchBar onSearch={handleSearch} onRandom={handleRandom} isLoading={isLoading} />
      
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          UNENDLICHES WIKI
        </h1>
        <AsciiArtDisplay artData={asciiArt} topic={currentTopic} />
      </header>
      
      <main>
        <div>
          <h2 style={{ marginBottom: '2rem', textTransform: 'capitalize' }}>
            {currentTopic}
          </h2>

          {error && (
            <div style={{ border: '1px solid #cc0000', padding: '1rem', color: '#cc0000' }}>
              <p style={{ margin: 0 }}>Ein Fehler ist aufgetreten</p>
              <p style={{ marginTop: '0.5rem', margin: 0 }}>{error}</p>
            </div>
          )}
          
          {/* Show skeleton loader when loading and no content is yet available */}
          {isLoading && content.length === 0 && !error && (
            <LoadingSkeleton />
          )}

          {/* Show content as it streams or when it's interactive */}
          {content.length > 0 && !error && (
             <ContentDisplay 
               content={content} 
               isLoading={isLoading} 
               onWordClick={handleWordClick} 
             />
          )}

          {/* Show empty state if fetch completes with no content and is not loading */}
          {!isLoading && !error && content.length === 0 && (
            <div style={{ color: '#888', padding: '2rem 0' }}>
              <p>Inhalt konnte nicht generiert werden.</p>
            </div>
          )}
        </div>
      </main>

      <footer className="sticky-footer">
        <p className="footer-text" style={{ margin: 0 }}>
          Unendliches Wiki von <a href="https://x.com/dev_valladares" target="_blank" rel="noopener noreferrer">Dev Valladares</a> · Generiert von Gemini 2.5 Flash Lite
          {generationTime && ` · ${Math.round(generationTime)}ms`}
        </p>
      </footer>
    </div>
  );
};

export default App;