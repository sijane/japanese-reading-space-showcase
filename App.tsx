import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Analyzer } from './components/Analyzer';
import { Results } from './components/Results';
import { SavedItems } from './components/SavedItems';
import { DeckReview } from './components/DeckReview';
import { AnalyzedText } from './components/AnalyzedText';
import { DismissedWordsModal } from './components/DismissedWordsModal';
import { analyzeText, analyzeImage, fileToBase64 } from './services/geminiService';
import { type AnalysisResultData, type SavedAnalysis, type SavedDeck, type Word, type BackupData, Sentence, SentenceCard, isSentenceCard, isWord } from './types';

// Helper to format raw text into the structure AnalyzedText expects
const textToSimpleAnalysis = (text: string): AnalysisResultData => {
  const paragraphs = text.split('\n');
  const sentences: Sentence[] = paragraphs.map(p => {
    const words: Word[] = p.split('').map(char => ({
      surface: char,
      reading: char,
      pos: 'Unknown',
      jlpt: 'Unknown',
      definition: '',
      isEssential: true,
    }));
    // Add a linebreak word if this isn't the last paragraph
    if (paragraphs.indexOf(p) < paragraphs.length - 1) {
        words.push({
             surface: '\\n',
             reading: '\\n',
             pos: 'Linebreak',
             jlpt: 'Unknown',
             definition: '',
             isEssential: false,
        });
    }
    return { japaneseWords: words };
  });

  return { sentences };
};


const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>(`吾輩は猫である。名前はまだ無い。
どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。`);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for UI controls, lifted from Results component
  const [isSimplifiedView, setIsSimplifiedView] = useState<boolean>(false);
  const [showHiragana, setShowHiragana] = useState<boolean>(false);
  const [showSeparators, setShowSeparators] = useState<boolean>(true);
  const [isTextGameActive, setIsTextGameActive] = useState<boolean>(false);

  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [deckForReview, setDeckForReview] = useState<SavedDeck | null>(null);
  const [dismissedWords, setDismissedWords] = useState<Set<string>>(new Set());
  const [savedWordKeys, setSavedWordKeys] = useState<Set<string>>(new Set());
  const [savedSentenceKeys, setSavedSentenceKeys] = useState<Set<string>>(new Set());
  const [lastDismissedWordKey, setLastDismissedWordKey] = useState<string | null>(null);
  const [isCurrentAnalysisSaved, setIsCurrentAnalysisSaved] = useState<boolean>(false);
  const [loadedAnalysisId, setLoadedAnalysisId] = useState<number | null>(null);
  const [isDismissModalOpen, setIsDismissModalOpen] = useState(false);
  const undoTimeoutRef = useRef<number | null>(null);
  const prevIsLoadingRef = useRef<boolean>(false);


  useEffect(() => {
    try {
      const analysesFromStorage: any[] = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
      const decks: SavedDeck[] = JSON.parse(localStorage.getItem('savedCardDecks') || '[]');
      const dismissed = JSON.parse(localStorage.getItem('dismissedWords') || '[]');
      
      // Migrate old data structure if necessary
      const migratedAnalyses: SavedAnalysis[] = analysesFromStorage.map(analysis => {
        if (analysis.analysis.words && !analysis.analysis.sentences) {
          const migratedAnalysis: AnalysisResultData = {
            sentences: [{ japaneseWords: analysis.analysis.words }]
          };
          return { ...analysis, analysis: migratedAnalysis };
        }
        return analysis;
      });

      setSavedAnalyses(migratedAnalyses);
      setSavedDecks(decks);
      setDismissedWords(new Set(dismissed));

      const vocabDeck = decks.find(d => d.name === "My Vocabulary");
      if (vocabDeck) {
          const keys = new Set(vocabDeck.cards.filter(isWord).map((c) => `${c.surface}|${c.reading}`));
          setSavedWordKeys(keys);
      }

    } catch (e) {
      console.error("Failed to load from localStorage", e);
    }

    // Cleanup timeout on component unmount
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const vocabDeck = savedDecks.find(d => d.name === "My Vocabulary");
    if (vocabDeck) {
        const keys = new Set(vocabDeck.cards.filter(isWord).map((c) => `${c.surface}|${c.reading}`));
        setSavedWordKeys(keys);
    } else {
        setSavedWordKeys(new Set());
    }

    const sentenceDeck = savedDecks.find(d => d.name === "My Sentences");
    if (sentenceDeck) {
        const keys = new Set(sentenceDeck.cards.filter(isSentenceCard).map((c) => c.japanese));
        setSavedSentenceKeys(keys);
    } else {
        setSavedSentenceKeys(new Set());
    }
  }, [savedDecks]);

  // Effect for playing sound on analysis completion
  useEffect(() => {
    const playCompletionSound = () => {
        // Using a try-catch block in case AudioContext is not supported or fails
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.01);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
            oscillator.frequency.exponentialRampToValueAtTime(1174.66, audioContext.currentTime + 0.1); // D6

            oscillator.start(audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            console.error("Could not play completion sound:", e);
        }
    };

    if (prevIsLoadingRef.current && !isLoading && analysisResult) {
        playCompletionSound();
    }
    
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, analysisResult]);


  const handleAnalyze = useCallback(async () => {
    // Clear previous results
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setDeckForReview(null);
    setIsCurrentAnalysisSaved(false);
    setLoadedAnalysisId(null);
    
    // Reset view options on new analysis
    setIsSimplifiedView(false);
    setShowHiragana(false);
    setIsTextGameActive(false);

    try {
      if (imageFile) {
        const base64Data = await fileToBase64(imageFile);
        const result = await analyzeImage({
            data: base64Data,
            mimeType: imageFile.type,
        });
        const reconstructedText = result.sentences.flatMap(s => s.japaneseWords).map(w => w.surface === '\\n' ? '\n' : w.surface).join('');
        setInputText(reconstructedText);
        setAnalysisResult(result);
      } else if (inputText.trim()) {
        const result = await analyzeText(inputText);
        setAnalysisResult(result);
      } else {
        setError("Please enter some text or upload an image to analyze.");
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during analysis. The model may be unable to parse the content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [inputText, imageFile]);

  const handleClear = useCallback(() => {
    setInputText('');
    setImageFile(null);
    setAnalysisResult(null);
    setError(null);
    setDeckForReview(null);
    setIsCurrentAnalysisSaved(false);
    setLoadedAnalysisId(null);
    setIsSimplifiedView(false);
    setShowHiragana(false);
    setIsTextGameActive(false);
  }, []);

  const handleSaveAnalysis = useCallback(() => {
    if (!analysisResult || !inputText) return;
    const newSave: SavedAnalysis = {
      id: Date.now(),
      title: inputText.substring(0, 40) + (inputText.length > 40 ? '...' : ''),
      inputText: inputText,
      analysis: analysisResult,
    };
    setSavedAnalyses(prevAnalyses => {
        const updatedSaves = [...prevAnalyses, newSave];
        localStorage.setItem('savedAnalyses', JSON.stringify(updatedSaves));
        return updatedSaves;
    });
    setLoadedAnalysisId(newSave.id);
    setIsCurrentAnalysisSaved(true);
  }, [analysisResult, inputText]);

  const handleLoadAnalysis = useCallback((analysis: SavedAnalysis) => {
    setInputText(analysis.inputText);
    setImageFile(null);
    setAnalysisResult(analysis.analysis);
    setDeckForReview(null);
    setIsCurrentAnalysisSaved(true);
    setLoadedAnalysisId(analysis.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDeleteAnalysis = useCallback((id: number) => {
    setSavedAnalyses(prevAnalyses => {
        const updatedSaves = prevAnalyses.filter(a => a.id !== id);
        localStorage.setItem('savedAnalyses', JSON.stringify(updatedSaves));
        return updatedSaves;
    });
    if (loadedAnalysisId === id) {
        setIsCurrentAnalysisSaved(false);
        setLoadedAnalysisId(null);
    }
  }, [loadedAnalysisId]);
  
  const handleLoadDeck = useCallback((deck: SavedDeck) => {
    setDeckForReview(deck);
    // Give it a moment for the state to update, then scroll.
    setTimeout(() => {
      document.getElementById('deck-review-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const handleCloseReview = useCallback(() => {
    setDeckForReview(null);
  }, []);

  const handleDeleteDeck = useCallback((id: number) => {
    setSavedDecks(prevDecks => {
        const updatedDecks = prevDecks.filter(d => d.id !== id);
        localStorage.setItem('savedCardDecks', JSON.stringify(updatedDecks));
        return updatedDecks;
    });
    // If the deleted deck is the one being reviewed, close the review section
    if (deckForReview?.id === id) {
        setDeckForReview(null);
    }
  }, [deckForReview]);

  const handleSaveWord = useCallback((word: Word, isSaved: boolean) => {
    const wordKey = `${word.surface}|${word.reading}`;
    
    setSavedDecks(prevDecks => {
        let updatedDecks = [...prevDecks];
        const deckIndex = updatedDecks.findIndex(deck => deck.name === "My Vocabulary");

        if (isSaved) { // Unsave logic
            if (deckIndex > -1) {
                const deck = updatedDecks[deckIndex];
                const updatedCards = deck.cards.filter(c => !isWord(c) || `${c.surface}|${c.reading}` !== wordKey);
                updatedDecks[deckIndex] = { ...deck, cards: updatedCards };
            }
            
            // Also remove from the currently reviewed deck if it's not "My Vocabulary"
            if (deckForReview && deckForReview.name !== "My Vocabulary") {
                const reviewedDeckIndex = updatedDecks.findIndex(deck => deck.id === deckForReview.id);
                if (reviewedDeckIndex > -1) {
                    const reviewedDeck = updatedDecks[reviewedDeckIndex];
                    const wordExistsInDeck = reviewedDeck.cards.some(c => isWord(c) && `${c.surface}|${c.reading}` === wordKey);
                    if (wordExistsInDeck) {
                        const updatedCards = reviewedDeck.cards.filter(c => !isWord(c) || `${c.surface}|${c.reading}` !== wordKey);
                        updatedDecks[reviewedDeckIndex] = { ...reviewedDeck, cards: updatedCards };
                    }
                }
            }
        } else { // Save logic
            if (deckIndex > -1) {
                const deck = updatedDecks[deckIndex];
                const wordExists = deck.cards.some(c => isWord(c) && `${c.surface}|${c.reading}` === wordKey);
                if (!wordExists) {
                    updatedDecks[deckIndex] = { ...deck, cards: [...deck.cards, word] };
                }
            } else {
                const newVocabDeck: SavedDeck = { id: Date.now(), name: "My Vocabulary", cards: [word] };
                updatedDecks.push(newVocabDeck);
            }
        }
        
        localStorage.setItem('savedCardDecks', JSON.stringify(updatedDecks));
        return updatedDecks;
    });
    
    // Update deckForReview if the word is in the currently reviewed deck
    if (isSaved && deckForReview) {
      const wordExistsInDeck = deckForReview.cards.some(c => isWord(c) && `${c.surface}|${c.reading}` === wordKey);
      if (wordExistsInDeck) {
        setDeckForReview(prevDeck => {
          if (!prevDeck) return null;
          const updatedCards = prevDeck.cards.filter(c => !isWord(c) || `${c.surface}|${c.reading}` !== wordKey);
          return { ...prevDeck, cards: updatedCards };
        });
      }
    }
  }, [deckForReview]);

  const handleSaveSentence = useCallback((sentence: Sentence, isSaved: boolean) => {
    if (!sentence.chineseTranslation) return;
    const japaneseText = sentence.japaneseWords.map(w => w.surface).join('');

    if (isSaved) {
        // Unsave logic
        setSavedDecks(prevDecks => {
            const updatedDecks = prevDecks.map(deck => {
                if (deck.name === "My Sentences") {
                    const updatedCards = deck.cards.filter(c => !isSentenceCard(c) || c.japanese !== japaneseText);
                    return { ...deck, cards: updatedCards };
                }
                return deck;
            });
            localStorage.setItem('savedCardDecks', JSON.stringify(updatedDecks));
            return updatedDecks;
        });
    } else {
        // Save logic
        const newCard: SentenceCard = {
            id: `${Date.now()}-${japaneseText.substring(0, 10)}`,
            japanese: japaneseText,
            chinese: sentence.chineseTranslation
        };

        setSavedDecks(prevDecks => {
            const deckExists = prevDecks.some(deck => deck.name === "My Sentences");
            let updatedDecks;

            if (deckExists) {
                updatedDecks = prevDecks.map(deck => {
                    if (deck.name === "My Sentences") {
                        const cardExists = deck.cards.some(c => isSentenceCard(c) && c.japanese === newCard.japanese);
                        if (!cardExists) {
                            return { ...deck, cards: [...deck.cards, newCard] };
                        }
                    }
                    return deck;
                });
            } else {
                const newDeck: SavedDeck = {
                    id: Date.now(),
                    name: "My Sentences",
                    cards: [newCard]
                };
                updatedDecks = [...prevDecks, newDeck];
            }
            
            localStorage.setItem('savedCardDecks', JSON.stringify(updatedDecks));
            return updatedDecks;
        });
    }
  }, []);
  
  const handleDeleteSentenceCard = useCallback((cardId: string) => {
    setDeckForReview(currentDeck => {
      if (!currentDeck) return null;

      const updatedCards = currentDeck.cards.filter(card => !isSentenceCard(card) || card.id !== cardId);
      const updatedDeck = { ...currentDeck, cards: updatedCards };

      setSavedDecks(allDecks => {
        const newAllDecks = allDecks.map(d => d.id === currentDeck.id ? updatedDeck : d);
        localStorage.setItem('savedCardDecks', JSON.stringify(newAllDecks));
        return newAllDecks;
      });

      return updatedDeck;
    });
  }, []);

  const handleDismissWord = useCallback((wordKey: string) => {
    if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
    }
    setLastDismissedWordKey(wordKey);
    setDismissedWords(prevDismissed => {
        const newDismissed = new Set(prevDismissed);
        newDismissed.add(wordKey);
        localStorage.setItem('dismissedWords', JSON.stringify(Array.from(newDismissed)));
        return newDismissed;
    });

    undoTimeoutRef.current = window.setTimeout(() => {
        setLastDismissedWordKey(null);
    }, 5000); // 5 seconds to undo
  }, []);

  const handleUndoDismiss = useCallback(() => {
    if (!lastDismissedWordKey) return;

    if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
    }

    setDismissedWords(prevDismissed => {
        const newDismissed = new Set(prevDismissed);
        newDismissed.delete(lastDismissedWordKey);
        localStorage.setItem('dismissedWords', JSON.stringify(Array.from(newDismissed)));
        return newDismissed;
    });

    setLastDismissedWordKey(null);
  }, [lastDismissedWordKey]);

  const handleRestoreWord = useCallback((wordKey: string) => {
    setDismissedWords(prevDismissed => {
        const newDismissed = new Set(prevDismissed);
        newDismissed.delete(wordKey);
        localStorage.setItem('dismissedWords', JSON.stringify(Array.from(newDismissed)));
        return newDismissed;
    });
  }, []);

  const handleExportData = useCallback(() => {
    const data: BackupData = {
      savedAnalyses: JSON.parse(localStorage.getItem('savedAnalyses') || '[]'),
      savedCardDecks: JSON.parse(localStorage.getItem('savedCardDecks') || '[]'),
      dismissedWords: JSON.parse(localStorage.getItem('dismissedWords') || '[]'),
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "japanese_analyzer_backup.json";
    link.click();
  }, []);

  const handleImportData = (file: File) => {
    if (!window.confirm("This will merge the backup file with your current data. Are you sure you want to continue?")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        
        // Robust JSON extraction
        const firstBracket = fileContent.indexOf('{');
        const lastBracket = fileContent.lastIndexOf('}');
        if (firstBracket === -1 || lastBracket === -1) {
            throw new Error("Could not find a valid JSON object in the file.");
        }
        const potentialJson = fileContent.substring(firstBracket, lastBracket + 1);
        const importedData = JSON.parse(potentialJson) as BackupData;
        
        if (!importedData.savedAnalyses || !importedData.savedCardDecks || !importedData.dismissedWords) {
          throw new Error("Invalid backup file format. Missing required fields.");
        }
        
        // --- MERGE LOGIC ---
        // 1. Get current data from localStorage
        const currentAnalyses: SavedAnalysis[] = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
        const currentDecks: SavedDeck[] = JSON.parse(localStorage.getItem('savedCardDecks') || '[]');
        const currentDismissed: string[] = JSON.parse(localStorage.getItem('dismissedWords') || '[]');

        // 2. Merge Analyses (de-duplicate by ID)
        const analysesMap = new Map<number, SavedAnalysis>();
        currentAnalyses.forEach(a => analysesMap.set(a.id, a));
        importedData.savedAnalyses.forEach(a => analysesMap.set(a.id, a));
        const mergedAnalyses = Array.from(analysesMap.values());

        // 3. Merge Dismissed Words (Set handles de-duplication)
        const mergedDismissedSet = new Set([...currentDismissed, ...importedData.dismissedWords]);
        const mergedDismissed = Array.from(mergedDismissedSet);
        
        // 4. Merge Decks (special handling for default decks)
        const decksMap = new Map<string, SavedDeck>();
        
        // First, add all current decks to the map
        currentDecks.forEach(deck => {
            decksMap.set(deck.name, { ...deck, cards: [...deck.cards] }); // Deep copy to avoid mutation
        });
        
        // Then, merge imported decks
        importedData.savedCardDecks.forEach(deck => {
            const existingDeck = decksMap.get(deck.name);
            if (existingDeck) {
                // Merge cards, de-duplicating them
                const cardsMap = new Map<string, Word | SentenceCard>();
                
                // Add existing cards
                existingDeck.cards.forEach(card => {
                    if(isWord(card)) cardsMap.set(`${card.surface}|${card.reading}`, card);
                    else if(isSentenceCard(card)) cardsMap.set(card.japanese, card);
                });
                
                // Add imported cards (will overwrite duplicates)
                deck.cards.forEach(card => {
                    if(isWord(card)) cardsMap.set(`${card.surface}|${card.reading}`, card);
                    else if(isSentenceCard(card)) cardsMap.set(card.japanese, card);
                });
                
                // Update the deck with merged cards
                existingDeck.cards = Array.from(cardsMap.values());
            } else {
                // New deck, add it
                decksMap.set(deck.name, { ...deck, cards: [...deck.cards] });
            }
        });
        
        const mergedDecks = Array.from(decksMap.values());


        // 5. Overwrite localStorage with merged data
        localStorage.setItem('savedAnalyses', JSON.stringify(mergedAnalyses));
        localStorage.setItem('savedCardDecks', JSON.stringify(mergedDecks));
        localStorage.setItem('dismissedWords', JSON.stringify(mergedDismissed));

        alert("Data merged successfully! The page will now reload to apply the changes.");
        window.location.reload();

      } catch (e) {
        console.error("Failed to import and merge data:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        alert(`Failed to merge data. The file may be corrupted or in the wrong format.\nError: ${errorMessage}`);
      }
    };
    reader.onerror = () => {
        alert("An error occurred while trying to read the selected file.");
    };
    reader.readAsText(file);
  };
  
  const currentSentences = analysisResult 
    ? analysisResult.sentences 
    : textToSimpleAnalysis(inputText).sentences;


  return (
    <div className="min-h-screen bg-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-[calc(80rem-7.5rem)] mx-auto">
        <Header />
        <main className="mt-8 grid grid-cols-1 gap-8">
          <Analyzer
            inputText={inputText}
            setInputText={setInputText}
            imageFile={imageFile}
            setImageFile={setImageFile}
            onAnalyze={handleAnalyze}
            onClear={handleClear}
            isLoading={isLoading}
          />

          <Results
            result={analysisResult}
            isLoading={isLoading}
            error={error}
            onSaveAnalysis={handleSaveAnalysis}
            isCurrentAnalysisSaved={isCurrentAnalysisSaved}
            onSaveSentence={handleSaveSentence}
            dismissedWords={dismissedWords}
            savedWordKeys={savedWordKeys}
            savedSentenceKeys={savedSentenceKeys}
            onSaveWord={handleSaveWord}
            onDismissWord={handleDismissWord}
            lastDismissedWordKey={lastDismissedWordKey}
            onUndoDismiss={handleUndoDismiss}
            isSimplifiedView={isSimplifiedView}
            setIsSimplifiedView={setIsSimplifiedView}
            showHiragana={showHiragana}
            setShowHiragana={setShowHiragana}
            showSeparators={showSeparators}
            setShowSeparators={setShowSeparators}
            isTextGameActive={isTextGameActive}
            setIsTextGameActive={setIsTextGameActive}
          />
          {(savedAnalyses.length > 0 || savedDecks.length > 0 || dismissedWords.size > 0) && (
            <SavedItems 
              analyses={savedAnalyses}
              decks={savedDecks}
              onLoadAnalysis={handleLoadAnalysis}
              onDeleteAnalysis={handleDeleteAnalysis}
              onLoadDeck={handleLoadDeck}
              onDeleteDeck={handleDeleteDeck}
              onExport={handleExportData}
              onImport={handleImportData}
              onShowDismissed={() => setIsDismissModalOpen(true)}
              hasDismissedWords={dismissedWords.size > 0}
            />
          )}
          {deckForReview && (
              <DeckReview 
                deck={deckForReview}
                onClose={handleCloseReview}
                savedWordKeys={savedWordKeys}
                onSaveWord={handleSaveWord}
                onDismissWord={handleDismissWord}
                dismissedWords={dismissedWords}
                lastDismissedWordKey={lastDismissedWordKey}
                onUndoDismiss={handleUndoDismiss}
                onDeleteSentenceCard={handleDeleteSentenceCard}
              />
          )}
          {isDismissModalOpen && (
            <DismissedWordsModal
              dismissedWords={dismissedWords}
              onRestoreWord={handleRestoreWord}
              onClose={() => setIsDismissModalOpen(false)}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;