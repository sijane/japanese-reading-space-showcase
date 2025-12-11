import { GoogleGenAI, Type, Modality } from "@google/genai";
import { type AnalysisResultData } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const wordSchema = {
  type: Type.OBJECT,
  properties: {
    surface: { type: Type.STRING, description: "The word or punctuation mark as it appears in the text." },
    reading: { type: Type.STRING, description: "The reading of the word in Hiragana. For punctuation, this can be the same as the surface form." },
    pos: { type: Type.STRING, description: "The part of speech (e.g., Noun, Verb, Adjective, Particle, 句読点 for punctuation, Linebreak for newlines)." },
    jlpt: { type: Type.STRING, description: "The JLPT level of the word (N5, N4, N3, N2, N1, or Unknown). For punctuation, use 'Unknown'." },
    definition: { type: Type.STRING, description: "A concise Traditional Chinese (繁體中文) definition. For punctuation, provide its name (e.g., 'Period', 'Comma'). For newlines, this can be empty." },
    sentiment: { type: Type.STRING, description: "The emotional or atmospheric sentiment of the word. Not applicable to punctuation." },
    isEssential: { type: Type.BOOLEAN, description: `Determines if a word is part of the sentence's core grammatical structure. The goal is to isolate a minimal, grammatically complete sentence.
- **ESSENTIAL (isEssential: true):** Subject, object, main verbs, copulas (です, である), and all grammatical particles (e.g., は, が, を, に, へ, で, と, も, の). Also includes interrogative words (e.g., どこ, 何). All punctuation is essential.
- **NON-ESSENTIAL (isEssential: false):** All descriptive adverbs (e.g., とても, ゆっくり, とんと, 全然), descriptive adjectives that modify nouns (e.g., 美しい猫 -> 美しい is non-essential), and interjections unless they form the entire sentence.
The rule is strict: if a word is purely descriptive and the sentence remains grammatically valid without it, it MUST be marked false. For example, in 'とても美しい猫', both 'とても' and '美しい' are non-essential. In 'どこで生れたかとんと見当がつかぬ', the adverb 'とんと' is non-essential.`}
  },
  required: ["surface", "reading", "pos", "jlpt", "definition", "isEssential"]
};

const sentenceSchema = {
    type: Type.OBJECT,
    properties: {
        japaneseWords: {
            type: Type.ARRAY,
            description: "An array of segmented words, punctuation, and newlines for a single Japanese sentence.",
            items: wordSchema,
        },
        chineseTranslation: {
            type: Type.STRING,
            description: "The corresponding Traditional Chinese (繁體中文) translation for this sentence. Must be provided, even if it's an empty string."
        }
    },
    required: ["japaneseWords", "chineseTranslation"],
};

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    sentences: {
      type: Type.ARRAY,
      description: "A list of sentences from the text, each containing its word analysis and optional translation.",
      items: sentenceSchema,
    }
  },
  required: ["sentences"]
};

/**
 * Robustly parses a JSON string from a Gemini response,
 * cleaning up potential markdown code fences.
 */
function parseGeminiJsonResponse(responseText: string): any {
    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith("```json")) {
        cleanedJson = cleanedJson.substring(7, cleanedJson.length - 3).trim();
    } else if (cleanedJson.startsWith("```")) {
        cleanedJson = cleanedJson.substring(3, cleanedJson.length - 3).trim();
    }
    return JSON.parse(cleanedJson);
}

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

export async function analyzeImageWithTranslation(japaneseImageData: { data: string; mimeType: string; }, chineseImageData: { data: string; mimeType: string; }): Promise<AnalysisResultData> {
     const textPart = {
// FIX: Corrected syntax errors in the prompt's template literal.
// Stray backticks and incorrect formatting were causing parsing failures.
// The examples are now correctly formatted as code blocks within the string.
        text: `You will be given two images: one with Japanese text, one with its Chinese translation. Your job is to extract, align, and analyze the text. Follow these rules strictly:

1.  **Extract & Align:** Extract all text from both images and align them sentence by sentence.

2.  **Sentence Segmentation:**
    -   A "sentence" ends with a terminal punctuation mark (e.g., period。) or is the entire content within quotation marks (e.g., 「...」).
    -   Paragraph breaks (newlines) are critical. A newline from the original text MUST be included as a separate token with \`pos: 'Linebreak'\` and \`surface: '\\n'\`. This \`Linebreak\` token must be the **very last token** in the \`japaneseWords\` array for the sentence that precedes the newline.

3.  **Tokenization Rules:** A "token" is a meaningful word or punctuation mark.
    -   **CRITICAL RULE:** Do not split inflected forms of words or compound particles. Treat them as single tokens.
    -   **Example 1:** The word 「叱られる」 is a single passive-form verb. It must be ONE token, \`{ "surface": "叱られる" }\`. It is INCORRECT to split it into \`[{ "surface": "叱ら" }, { "surface": "れる" }]\`.
    -   **Example 2:** The compound particle 「だって」 must be ONE token, \`{ "surface": "だって" }\`. It is INCORRECT to split it into \`[{ "surface": "だ" }, { "surface": "っ" }, { "surface": "て" }]\`.
    -   **Example 3:** 「言うのに」 should be segmented into TWO tokens: the verb \`言う\` and the particle \`のに\`. \`{ "surface": "言う" }\`, \`{ "surface": "のに" }\`.

4.  **Token Analysis (for Japanese text):** For each token (word, punctuation, or newline), provide its surface, reading, part of speech (pos), JLPT level, a concise Traditional Chinese (繁體中文) definition, and an 'isEssential' boolean flag.

5.  **Output Format:** Return a single JSON object that strictly adheres to the provided schema. The root object must have a "sentences" key, containing an array of sentence objects. Each sentence object must have a "japaneseWords" array (the analysis) and a "chineseTranslation" string (from the second image). If a translation cannot be found, return an empty string.
`
    };

    const japaneseImagePart = { inlineData: { mimeType: japaneseImageData.mimeType, data: japaneseImageData.data } };
    const chineseImagePart = { inlineData: { mimeType: chineseImageData.mimeType, data: chineseImageData.data } };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, japaneseImagePart, chineseImagePart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
        }
    });
    
    const parsedJson = parseGeminiJsonResponse(response.text);
    return { sentences: parsedJson.sentences } as AnalysisResultData;
}

export async function analyzeImage(imageData: { data: string; mimeType: string; }): Promise<AnalysisResultData> {
    const textPart = {
// FIX: Corrected syntax errors in the prompt's template literal.
// Stray backticks and incorrect formatting were causing parsing failures.
// The examples are now correctly formatted as code blocks within the string.
        text: `
Extract the Japanese text from this image. Then, perform a detailed sentence-by-sentence, word-by-word analysis. Follow these rules strictly:

1.  **Sentence Segmentation:**
    -   A "sentence" ends with a terminal punctuation mark (e.g., period。) or is the entire content within quotation marks (e.g., 「...」).
    -   Paragraph breaks (newlines) are critical. A newline from the original text MUST be included as a separate token with \`pos: 'Linebreak'\` and \`surface: '\\n'\`. This \`Linebreak\` token must be the **very last token** in the \`japaneseWords\` array for the sentence that precedes the newline.

2.  **Tokenization Rules:** A "token" is a meaningful word or punctuation mark.
    -   **CRITICAL RULE:** Do not split inflected forms of words or compound particles. Treat them as single tokens.
    -   **Example 1:** The word 「叱られる」 is a single passive-form verb. It must be ONE token, \`{ "surface": "叱られる" }\`. It is INCORRECT to split it into \`[{ "surface": "叱ら" }, { "surface": "れる" }]\`.
    -   **Example 2:** The compound particle 「だって」 must be ONE token, \`{ "surface": "だって" }\`. It is INCORRECT to split it into \`[{ "surface": "だ" }, { "surface": "っ" }, { "surface": "て" }]\`.
    -   **Example 3:** 「言うのに」 should be segmented into TWO tokens: the verb \`言う\` and the particle \`のに\`. \`{ "surface": "言う" }\`, \`{ "surface": "のに" }\`.

3.  **Token Analysis:** For each token (word, punctuation, or newline), provide its surface, reading, part of speech (pos), JLPT level, a concise Traditional Chinese (繁體中文) definition, and an 'isEssential' boolean flag.

4.  **Translation:** Provide a corresponding Traditional Chinese (繁體中文) translation for each sentence.

5.  **Output Format:** Return a single JSON object that strictly adheres to the provided schema. The root object must have a "sentences" key, containing an array of sentence objects. Each sentence object must have "japaneseWords" and "chineseTranslation".
`
    };

    const imagePart = {
        inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data,
        },
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, imagePart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
        }
    });

    const parsedJson = parseGeminiJsonResponse(response.text);
    return { sentences: parsedJson.sentences } as AnalysisResultData;
}


export async function analyzeText(text: string): Promise<AnalysisResultData> {
// FIX: Corrected syntax errors in the prompt's template literal.
// Using backticks inside a template literal requires escaping, but in this context,
// they were used for emphasis, leading to syntax errors. They have been removed
// or replaced to ensure the string is valid.
  const prompt = `
Analyze the following Japanese text, performing a detailed sentence-by-sentence, word-by-word analysis. Follow these rules strictly:

1.  **Sentence Segmentation:**
    -   A "sentence" ends with a terminal punctuation mark (e.g., period。) or is the entire content within quotation marks (e.g., 「...」).
    -   Paragraph breaks (newlines) are critical. A newline from the original text MUST be included as a separate token with \`pos: 'Linebreak'\` and \`surface: '\\n'\`. This \`Linebreak\` token must be the **very last token** in the \`japaneseWords\` array for the sentence that precedes the newline.

2.  **Tokenization Rules:** A "token" is a meaningful word or punctuation mark.
    -   **CRITICAL RULE:** Do not split inflected forms of words or compound particles. Treat them as single tokens.
    -   **Example 1:** The word 「叱られる」 is a single passive-form verb. It must be ONE token, \`{ "surface": "叱られる" }\`. It is INCORRECT to split it into \`[{ "surface": "叱ら" }, { "surface": "れる" }]\`.
    -   **Example 2:** The compound particle 「だって」 must be ONE token, \`{ "surface": "だって" }\`. It is INCORRECT to split it into \`[{ "surface": "だ" }, { "surface": "っ" }, { "surface": "て" }]\`.
    -   **Example 3:** 「言うのに」 should be segmented into TWO tokens: the verb \`言う\` and the particle \`のに\`. \`{ "surface": "言う" }\`, \`{ "surface": "のに" }\`.

3.  **Token Analysis:** For each token (word, punctuation, or newline), provide its surface, reading, part of speech (pos), JLPT level, a concise Traditional Chinese (繁體中文) definition, and an 'isEssential' boolean flag.

4.  **Translation:** Provide a corresponding Traditional Chinese (繁體中文) translation for each sentence.

5.  **Output Format:** Return a single JSON object that strictly adheres to the provided schema. The root object must have a "sentences" key, containing an array of sentence objects. Each sentence object must have "japaneseWords" and "chineseTranslation".

Original Text:
"${text}"
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    }
  });

  const parsedJson = parseGeminiJsonResponse(response.text);
  return { sentences: parsedJson.sentences } as AnalysisResultData;
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Convert Uint8Array to Int16Array (little-endian)
  // The audio data from Gemini is 16-bit PCM in little-endian format
  const dataLength = data.length;
  const int16Length = Math.floor(dataLength / 2);
  const dataInt16 = new Int16Array(int16Length);
  
  // Convert bytes to 16-bit signed integers (little-endian)
  for (let i = 0; i < int16Length; i++) {
    const byte1 = data[i * 2];
    const byte2 = data[i * 2 + 1];
    // Little-endian: low byte first, then high byte
    dataInt16[i] = (byte2 << 8) | byte1;
    // Convert to signed 16-bit
    if (dataInt16[i] > 32767) {
      dataInt16[i] -= 65536;
    }
  }
  
  const frameCount = Math.floor(dataInt16.length / numChannels);
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize to -1.0 to 1.0 range
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  
  return buffer;
}

export async function generateSpeech(text: string, audioContext: AudioContext): Promise<AudioBuffer> {
    // Using a more descriptive prompt to ensure the TTS model understands the context,
    // especially for short words.
    const prompt = `Please pronounce the following Japanese text: ${text}`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            console.error("No audio data in response:", JSON.stringify(response, null, 2));
            throw new Error("No audio data received from API. Response: " + JSON.stringify(response));
        }

        console.log("Base64 audio data length:", base64Audio.length);
        const audioBytes = decode(base64Audio);
        console.log("Decoded audio bytes length:", audioBytes.length);
        
        const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
        console.log("AudioBuffer created - duration:", audioBuffer.duration, "sampleRate:", audioBuffer.sampleRate, "numberOfChannels:", audioBuffer.numberOfChannels);
        
        return audioBuffer;
    } catch (error: any) {
        console.error("generateSpeech error:", error);
        
        // Check for quota exceeded error (429)
        if (error?.error?.code === 429 || error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
            throw new Error(`API quota exceeded. Please check your Google Gemini API quota and billing. The free tier has daily limits. Visit https://ai.google.dev/gemini-api/docs/rate-limits for more information.`);
        }
        
        const errorMessage = error?.message || error?.error?.message || String(error);
        throw new Error(`Failed to generate speech for "${text}": ${errorMessage}`);
    }
}