/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import {GoogleGenAI} from '@google/genai';

// This check is for development-time feedback.
if (!process.env.API_KEY) {
  console.error(
    'Die Umgebungsvariable API_KEY ist nicht gesetzt. Die Anwendung kann keine Verbindung zur Gemini-API herstellen.',
  );
}

// The "!" asserts API_KEY is non-null after the check.
const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});
const artModelName = 'gemini-2.5-flash';
const textModelName = 'gemini-2.5-flash-lite';
/**
 * Art-direction toggle for ASCII art generation.
 * `true`: Slower, higher-quality results (allows the model to "think").
 * `false`: Faster, potentially lower-quality results (skips thinking).
 */
const ENABLE_THINKING_FOR_ASCII_ART = false;

/**
 * Art-direction toggle for blocky ASCII text generation.
 * `true`: Generates both creative art and blocky text for the topic name.
 * `false`: Generates only the creative ASCII art.
 */
const ENABLE_ASCII_TEXT_GENERATION = false;

export interface AsciiArtData {
  art: string;
  text?: string; // Text is now optional
}

/**
 * Streams a definition for a given topic from the Gemini API.
 * @param topic The word or term to define.
 * @returns An async generator that yields text chunks of the definition.
 */
export async function* streamDefinition(
  topic: string,
): AsyncGenerator<string, void, undefined> {
  if (!process.env.API_KEY) {
    yield 'Fehler: API_KEY ist nicht konfiguriert. Bitte überprüfen Sie Ihre Umgebungsvariablen, um fortzufahren.';
    return;
  }

  const prompt = `Gib eine prägnante, enzyklopädische Definition in einem einzigen Absatz für den Begriff "${topic}". Sei informativ und neutral. Verwende kein Markdown, keine Titel oder andere spezielle Formatierungen. Antworte nur mit dem Text der Definition selbst.`;

  try {
    const response = await ai.models.generateContentStream({
      model: textModelName,
      contents: prompt,
      config: {
        // Disable thinking for the lowest possible latency, as requested.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error('Fehler beim Streamen von Gemini:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
    yield `Fehler: Inhalt für "${topic}" konnte nicht generiert werden. ${errorMessage}`;
    // Re-throwing allows the caller to handle the error state definitively.
    throw new Error(errorMessage);
  }
}

/**
 * Generates a single random word or concept using the Gemini API.
 * @returns A promise that resolves to a single random word.
 */
export async function getRandomWord(): Promise<string> {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY ist nicht konfiguriert.');
  }

  const prompt = `Generiere ein einzelnes, zufälliges, interessantes deutsches Wort oder ein zweisilbiges Konzept. Es kann ein Substantiv, Verb, Adjektiv oder ein Eigenname sein. Antworte nur mit dem Wort oder Konzept selbst, ohne zusätzlichen Text, Satzzeichen oder Formatierung.`;

  try {
    const response = await ai.models.generateContent({
      model: textModelName,
      contents: prompt,
      config: {
        // Disable thinking for low latency.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    return response.text.trim();
  } catch (error) {
    console.error('Fehler beim Abrufen eines zufälligen Wortes von Gemini:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
    throw new Error(`Konnte kein zufälliges Wort abrufen: ${errorMessage}`);
  }
}

/**
 * Generates ASCII art and optionally text for a given topic.
 * @param topic The topic to generate art for.
 * @returns A promise that resolves to an object with art and optional text.
 */
export async function generateAsciiArt(topic: string): Promise<AsciiArtData> {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY ist nicht konfiguriert.');
  }
  
  const artPromptPart = `1. "art": Meta-ASCII-Visualisierung des Wortes "${topic}":
  - Palette: │─┌┐└┘├┤┬┴┼►◄▲▼○●◐◑░▒▓█▀▄■□▪▫★☆♦♠♣♥⟨⟩/\\_|
  - Die Form spiegelt das Konzept wider - die visuelle Form soll die Essenz des Wortes verkörpern.
  - Beispiele: 
    * "Explosion" → strahlenförmige Linien vom Zentrum ausgehend
    * "Hierarchie" → Pyramidenstruktur
    * "Fluss" → gekrümmte, gerichtete Linien
  - Als einzelnen String mit \\n für Zeilenumbrüche zurückgeben`;


  const keysDescription = `einem Schlüssel: "art"`;
  const promptBody = artPromptPart;

  const prompt = `Erstelle für "${topic}" ein JSON-Objekt mit ${keysDescription}.
${promptBody}

Gib NUR das rohe JSON-Objekt zurück, keinen zusätzlichen Text. Die Antwort muss mit "{" beginnen und mit "}" enden und nur die "art"-Eigenschaft enthalten.`;

  const maxRetries = 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // FIX: Construct config object conditionally to avoid spreading a boolean
      const config: any = {
        responseMimeType: 'application/json',
      };
      if (!ENABLE_THINKING_FOR_ASCII_ART) {
        config.thinkingConfig = { thinkingBudget: 0 };
      }

      const response = await ai.models.generateContent({
        model: artModelName,
        contents: prompt,
        config: config,
      });

      let jsonStr = response.text.trim();
      
      // Debug logging
      console.log(`Versuch ${attempt}/${maxRetries} - Rohe API-Antwort:`, jsonStr);
      
      // Remove any markdown code fences if present
      const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[1]) {
        jsonStr = match[1].trim();
      }

      // Ensure the string starts with { and ends with }
      if (!jsonStr.startsWith('{') || !jsonStr.endsWith('}')) {
        throw new Error('Antwort ist kein gültiges JSON-Objekt');
      }

      const parsedData = JSON.parse(jsonStr) as AsciiArtData;
      
      // Validate the response structure
      if (typeof parsedData.art !== 'string' || parsedData.art.trim().length === 0) {
        throw new Error('Ungültige oder leere ASCII-Kunst in der Antwort');
      }
      
      // If we get here, the validation passed
      const result: AsciiArtData = {
        art: parsedData.art,
      };

      if (ENABLE_ASCII_TEXT_GENERATION && parsedData.text) {
        result.text = parsedData.text;
      }
      
      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unbekannter Fehler');
      console.warn(`Versuch ${attempt}/${maxRetries} fehlgeschlagen:`, lastError.message);
      
      if (attempt === maxRetries) {
        console.error('Alle Wiederholungsversuche zur Generierung von ASCII-Kunst sind fehlgeschlagen');
        throw new Error(`Konnte nach ${maxRetries} Versuchen keine ASCII-Kunst generieren: ${lastError.message}`);
      }
      // Continue to next attempt
    }
  }

  // This should never be reached, but just in case
  throw lastError || new Error('Alle Wiederholungsversuche sind fehlgeschlagen');
}