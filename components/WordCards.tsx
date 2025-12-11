import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { type Word, type Sentence } from '../types';
import { generateSpeech } from '../services/geminiService';
import { AudioQuiz } from './AudioQuiz';

const getJlptBorderColor = (level: string) => {
    switch (level.toUpperCase()) {
        case 'N5': return 'border-blue-500';
        case 'N4': return 'border-green-500';
        case 'N3': return 'border-yellow-500';
        case 'N2': return 'border-orange-500';
        case 'N1': return 'border-red-500';
        default: return 'border-slate-500';
    }
}

const getJlptBgColor = (level: string) => {
    switch (level.toUpperCase()) {
        case 'N5': return 'bg-blue-500';
        case 'N4': return 'bg-green-500';
        case 'N3': return 'bg-yellow-500';
        case 'N2': return 'bg-orange-500';
        case 'N1': return 'bg-red-500';
        default: return 'bg-slate-500';
    }
}

const BookmarkIcon = ({ saved }: { saved?: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill={saved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
);

const DismissIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
);

const ChevronIcon = ({ collapsed }: { collapsed: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform duration-300 ${!collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
);

const GameIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const SpeakerIcon = ({ isPlaying }: { isPlaying: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isPlaying ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5 5 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
);

const LoadingSpinner = () => (
    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const getFlashcardWords = (words: Word[]): Word[] => {
    const unique = new Map<string, Word>();
    const kanjiRegex = /[\u4e00-\u9faf]/;
    const kanaOnlyRegex = /^[ぁ-んァ-ン]+$/; 
    const punctuationPos = ['句読点', '記号', 'Linebreak'];
    
    words.forEach(word => {
        if (punctuationPos.includes(word.pos)) {
            return;
        }

        const key = `${word.surface}|${word.reading}`;
        if (unique.has(key)) {
            return;
        }
        
        const hasKanji = kanjiRegex.test(word.surface);
        const isAdvancedKana = kanaOnlyRegex.test(word.surface) && ['N3', 'N2', 'N1', 'UNKNOWN'].includes(word.jlpt.toUpperCase());

        if (hasKanji || isAdvancedKana) {
            unique.set(key, word);
        }
    });
    return Array.from(unique.values());
};


interface WordCardProps {
    word: Word;
    onFlip: (reading: string) => void;
    isPlaying?: boolean;
    isSaved?: boolean;
    onSave?: (word: Word, isSaved: boolean) => void;
    onDismiss?: (key: string) => void;
}

const WordCard: React.FC<WordCardProps> = ({ word, onFlip, isPlaying, isSaved, onSave, onDismiss }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const flipTimeoutRef = useRef<number | null>(null);
    const wordKey = `${word.surface}|${word.reading}`;
    
    useEffect(() => {
        // Cleanup timeout on component unmount
        return () => {
            if (flipTimeoutRef.current) {
                clearTimeout(flipTimeoutRef.current);
            }
        };
    }, []);

    const handleFlip = () => {
        if (flipTimeoutRef.current) {
            clearTimeout(flipTimeoutRef.current);
            flipTimeoutRef.current = null;
        }

        const newFlippedState = !isFlipped;
        onFlip(word.reading); // Call onFlip. If it's the same reading, the parent's playAudio will stop/start the sound.

        if (newFlippedState) { // Flipping to back
            flipTimeoutRef.current = window.setTimeout(() => {
                setIsFlipped(false);
            }, 4000); // Auto flip back after 4 seconds
        }
        setIsFlipped(newFlippedState);
    };

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSave?.(word, isSaved || false);
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDismiss?.(wordKey);
    };

    const hasFurigana = word.surface !== word.reading && !/^[ぁ-んァ-ン]+$/.test(word.surface);
    const jlptBorderColor = getJlptBorderColor(word.jlpt);

    return (
        <div className="group [perspective:1000px] w-full h-48" onClick={handleFlip}>
            <div
                className={`relative h-full w-full rounded-xl shadow-xl transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
            >
                {/* Front of the card */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center bg-slate-800 border-2 ${jlptBorderColor} text-slate-200 rounded-xl [backface-visibility:hidden] p-4 cursor-pointer text-center`}>
                    {onDismiss && (
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2 right-2 z-10 w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-700 hover:text-red-400"
                            aria-label="Dismiss word"
                        >
                            <DismissIcon />
                        </button>
                    )}
                    <p className="text-sm text-cyan-400 h-5">{hasFurigana ? word.reading : ''}</p>
                    <p className="text-4xl font-bold">{word.surface}</p>
                </div>
                
                {/* Back of the card */}
                <div className="absolute inset-0 h-full w-full rounded-xl bg-slate-900 border-2 border-indigo-400 text-slate-200 [transform:rotateY(180deg)] [backface-visibility:hidden] p-4 flex flex-col cursor-pointer">
                    <div className="flex justify-between items-start w-full">
                         <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold text-white rounded-full ${getJlptBgColor(word.jlpt)}`}>
                            {word.jlpt}
                        </span>
                        <p className="text-sm font-semibold text-slate-400 capitalize">{word.pos}</p>
                        <div className="w-9 h-9 flex items-center justify-center">
                            {onSave && (
                                <button
                                    onClick={handleSave}
                                    className="z-10 w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-700 hover:text-white disabled:text-indigo-400 disabled:cursor-not-allowed"
                                    aria-label={isSaved ? "Unsave word" : "Save word"}
                                >
                                    <BookmarkIcon saved={isSaved} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex-grow grid place-items-center text-center">
                        <p className="text-3xl text-slate-100 leading-snug">{word.definition}</p>
                    </div>
                     <div className="absolute bottom-2 left-2">
                        <SpeakerIcon isPlaying={!!isPlaying} />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface WordCardsProps {
    words?: Word[];
    sourceSentences?: Sentence[];
    isSimplifiedView?: boolean;
    dismissedWords?: Set<string>;
    savedWordKeys: Set<string>;
    onSaveWord: (word: Word, isSaved: boolean) => void;
    onDismissWord: (key: string) => void;
    title?: string;
}

export const WordCards: React.FC<WordCardsProps> = ({ words, sourceSentences, isSimplifiedView, dismissedWords, savedWordKeys, onSaveWord, onDismissWord, title = "Word Flashcards" }) => {
    const isAnalysisMode = !!sourceSentences;
    
    const [displayedCards, setDisplayedCards] = useState<Word[] | null>(words || null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(isAnalysisMode);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [playingReading, setPlayingReading] = useState<string | null>(null);
    const [isQuizActive, setIsQuizActive] = useState(false);
    const [isPreloadingAudio, setIsPreloadingAudio] = useState(false);
    
    useEffect(() => {
        // Reset state for new analysis
        if (isAnalysisMode) {
            setDisplayedCards(null);
            setIsGenerating(false);
            setIsCollapsed(true);
        }
    }, [sourceSentences]);

    useEffect(() => {
        // Update displayedCards when words prop changes (for non-analysis mode, e.g., DeckReview)
        if (!isAnalysisMode && words) {
            setDisplayedCards(words);
        }
    }, [words, isAnalysisMode]);

    useEffect(() => {
        // Re-generate cards if simplified view changes while cards are displayed
        if (isAnalysisMode && displayedCards !== null && sourceSentences && isSimplifiedView !== undefined) {
            const allWords = sourceSentences.flatMap(s => s.japaneseWords);
            const wordsToConsider = isSimplifiedView ? allWords.filter(w => w.isEssential) : allWords;
            const newCards = getFlashcardWords(wordsToConsider);
            setDisplayedCards(newCards);
        }
    }, [isSimplifiedView, sourceSentences]);


    const handleToggleCollapse = () => {
        if (isAnalysisMode && displayedCards === null && sourceSentences && isSimplifiedView !== undefined) {
            setIsGenerating(true);
            setTimeout(() => {
                const allWords = sourceSentences.flatMap(s => s.japaneseWords);
                const wordsToConsider = isSimplifiedView ? allWords.filter(w => w.isEssential) : allWords;
                const newCards = getFlashcardWords(wordsToConsider);
                setDisplayedCards(newCards);
                setIsGenerating(false);
                setIsCollapsed(false);
            }, 100);
        } else {
            setIsCollapsed(!isCollapsed);
        }
    };
    
    const finalCardsToShow = useMemo(() => {
        return (displayedCards || []).filter(word => !dismissedWords?.has(`${word.surface}|${word.reading}`));
    }, [displayedCards, dismissedWords]);

    const wordsWithKanji = useMemo(() => {
        const kanjiRegex = /[\u4e00-\u9faf]/;
        return (finalCardsToShow || []).filter(word => kanjiRegex.test(word.surface));
    }, [finalCardsToShow]);

    const canStartQuiz = useMemo(() => wordsWithKanji.length >= 4, [wordsWithKanji]);

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        return audioContextRef.current;
    }, []);

    const playAudio = useCallback(async (reading: string) => {
        if (currentSourceRef.current) {
            currentSourceRef.current.onended = null;
            currentSourceRef.current.stop();
            currentSourceRef.current = null;
        }

        if (playingReading === reading) {
            setPlayingReading(null);
            return;
        }

        const audioContext = getAudioContext();
        
        // Ensure AudioContext is running
        if (audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
                console.log('AudioContext resumed');
            } catch (error) {
                console.error('Failed to resume AudioContext:', error);
                setPlayingReading(null);
                return;
            }
        }

        setPlayingReading(reading);

        let audioBuffer: AudioBuffer | undefined = audioCacheRef.current.get(reading);

        if (!audioBuffer) {
            try {
                console.log(`Generating speech for: ${reading}`);
                audioBuffer = await generateSpeech(reading, audioContext);
                audioCacheRef.current.set(reading, audioBuffer);
                console.log(`Audio generated successfully, duration: ${audioBuffer.duration}s, sampleRate: ${audioBuffer.sampleRate}`);
            } catch (error) {
                console.error(`Failed to generate speech for ${reading}:`, error);
                setPlayingReading(null);
                alert(`無法生成音頻：${error instanceof Error ? error.message : String(error)}`);
                return;
            }
        }
        
        if (!audioBuffer) {
            console.error('No audio buffer available');
            setPlayingReading(null);
            return;
        }

        try {
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            
            // Add error handler
            source.onerror = (error) => {
                console.error('Audio source error:', error);
                setPlayingReading(null);
            };
            
            source.start(0);
            console.log(`Audio playback started for: ${reading}`);
            currentSourceRef.current = source;
        } catch (error) {
            console.error('Failed to start audio playback:', error);
            setPlayingReading(null);
            alert(`無法播放音頻：${error instanceof Error ? error.message : String(error)}`);
        }
        
        source.onended = () => {
            if (currentSourceRef.current === source) {
                currentSourceRef.current = null;
                setPlayingReading(null);
            }
        };
    }, [getAudioContext, playingReading]);

    const preloadAudio = useCallback(async () => {
        // Note: isPreloadingAudio state is managed by handleStartQuiz
        const audioContext = getAudioContext();
        const wordsToPreload = wordsWithKanji.filter(word => !audioCacheRef.current.has(word.reading));
        try {
            // Preload audio with better error handling - continue even if some fail
            const results = await Promise.allSettled(wordsToPreload.map(async (word) => {
                try {
                    const audioBuffer = await generateSpeech(word.reading, audioContext);
                    audioCacheRef.current.set(word.reading, audioBuffer);
                    return { word, success: true };
                } catch (error) {
                    console.error(`Failed to preload audio for "${word.reading}":`, error);
                    return { word, success: false, error };
                }
            }));
            
            const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
            if (failures.length > 0) {
                console.warn(`${failures.length} out of ${wordsToPreload.length} audio files failed to preload`);
                
                // Check if all failures are due to quota exceeded
                const quotaErrors = failures.filter(f => {
                    const error = f.status === 'rejected' ? f.reason : f.value?.error;
                    const errorMessage = error?.message || String(error || '');
                    return errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429');
                });
                
                if (quotaErrors.length === failures.length) {
                    throw new Error("API quota exceeded. Your Google Gemini API daily quota has been reached. Please check your quota at https://ai.google.dev/gemini-api/docs/rate-limits or wait until the quota resets.");
                }
                
                // If all failed, throw an error
                if (failures.length === wordsToPreload.length) {
                    throw new Error("All audio files failed to preload. Please check your API key and connection.");
                }
            }
        } catch (error) {
            console.error("An error occurred during audio preload:", error);
            throw error;
        }
    }, [getAudioContext, wordsWithKanji]);

    const handleStartQuiz = async () => {
        if (!canStartQuiz || isPreloadingAudio) return;
        
        // Immediately set loading state so UI updates right away
        setIsPreloadingAudio(true);
        
        try {
            if (audioCacheRef.current.size < wordsWithKanji.length) {
                await preloadAudio();
            } else {
                // Even if no preload needed, show a brief loading state
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            setIsQuizActive(true);
        } catch (error: any) {
            console.error("Failed to prepare audio for quiz:", error);
            const errorMessage = error?.message || String(error);
            alert(`Could not prepare the audio for the quiz.\n\nError: ${errorMessage}\n\nPlease check:\n1. Your API key is set correctly in .env.local\n2. You have restarted the development server after setting the API key\n3. Your internet connection is working`);
        } finally {
            setIsPreloadingAudio(false);
        }
    };
    
    if (isAnalysisMode && sourceSentences) {
        const allWords = sourceSentences.flatMap(s => s.japaneseWords);
        const wordsToConsider = isSimplifiedView ? allWords.filter(w => w.isEssential) : allWords;
        if (getFlashcardWords(wordsToConsider).length === 0) {
            return null;
        }
    }
    
    return (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 shadow-lg" id="flashcard-section">
            {isQuizActive ? (
                <AudioQuiz
                    words={wordsWithKanji}
                    onExit={() => setIsQuizActive(false)}
                    audioCache={audioCacheRef.current}
                    audioContext={getAudioContext()}
                />
            ) : (
                <>
                    <div className="grid grid-cols-[1fr,auto,1fr] items-center mb-6">
                        <div className="justify-self-start">
                            <h2 className="text-2xl font-bold text-slate-100">
                                {title}
                            </h2>
                        </div>
                        
                        <div className="justify-self-center">
                            <button
                                onClick={handleToggleCollapse}
                                className="flex items-center justify-center w-10 h-10 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600"
                                aria-label={isCollapsed ? 'Expand word cards' : 'Collapse word cards'}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <LoadingSpinner /> : <ChevronIcon collapsed={isCollapsed} />}
                            </button>
                        </div>

                        <div className="justify-self-end">
                            <button
                                onClick={handleStartQuiz}
                                disabled={!canStartQuiz || isPreloadingAudio || displayedCards === null}
                                title={!canStartQuiz ? "Need at least 4 words with Kanji for the quiz" : (isPreloadingAudio ? "Preparing audio..." : "Start Listening Quiz")}
                                className="flex items-center justify-center w-10 h-10 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isPreloadingAudio ? (
                                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <GameIcon />
                                )}
                            </button>
                        </div>
                    </div>

                    {!isCollapsed && (
                        finalCardsToShow.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {finalCardsToShow.map((word) => (
                                    <WordCard
                                        key={`${word.surface}|${word.reading}`}
                                        word={word}
                                        onFlip={playAudio}
                                        isPlaying={playingReading === word.reading}
                                        isSaved={savedWordKeys.has(`${word.surface}|${word.reading}`)}
                                        onSave={onSaveWord}
                                        onDismiss={onDismissWord}
                                    />
                                ))}
                            </div>
                        ) : (
                             displayedCards && <p className="text-center text-slate-400 py-8">No flashcard words found for this text.</p>
                        )
                    )}
                </>
            )}
        </div>
    );
};
