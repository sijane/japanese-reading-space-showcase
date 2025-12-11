export interface Word {
  surface: string;
  reading: string;
  pos: string;
  jlpt: string;
  definition: string;
  sentiment?: string;
  isEssential: boolean;
}

export interface Sentence {
  japaneseWords: Word[];
  chineseTranslation?: string;
}

export interface AnalysisResultData {
  sentences: Sentence[];
}

export interface SavedAnalysis {
  id: number;
  title: string;
  inputText: string;
  analysis: AnalysisResultData;
}

export interface SentenceCard {
  id: string;
  japanese: string;
  chinese: string;
}

export interface SavedDeck {
  id: number;
  name: string;
  cards: Array<Word | SentenceCard>;
}

export interface BackupData {
  savedAnalyses: SavedAnalysis[];
  savedCardDecks: SavedDeck[];
  dismissedWords: string[];
}

export interface JlptDistribution {
  n5: number;
  n4: number;
  n3: number;
  n2: number;
  n1: number;
  unknown: number;
}

export interface Statistics {
  totalWords: number;
  uniqueWords: number;
  characterCount: number;
  jlptDistribution: JlptDistribution;
}

export const isWord = (card: Word | SentenceCard): card is Word => {
    return 'surface' in card && 'reading' in card;
};

export const isSentenceCard = (card: Word | SentenceCard): card is SentenceCard => {
    return 'japanese' in card && 'chinese' in card;
};
