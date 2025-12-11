import React, { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import { type Word, type Sentence } from '../types';
import { generateSpeech } from '../services/geminiService';

interface AnalyzedTextProps {
    sentences: Sentence[];
    isSimplifiedView: boolean;
    onSaveSentence: (sentence: Sentence, isSaved: boolean) => void;
    savedSentenceKeys: Set<string>;
    showHiragana: boolean;
    showSeparators: boolean;
    isGameActive: boolean;
    onExitGame: () => void;
    dismissedWords: Set<string>;
    isVerticalLayout: boolean; // Prop to control layout
    onGameLoadingChange?: (isLoading: boolean) => void;
}

const getJlptColor = (level: string) => {
    switch (level.toUpperCase()) {
        case 'N5': return 'bg-blue-500';
        case 'N4': return 'bg-green-500';
        case 'N3': return 'bg-yellow-500';
        case 'N2': return 'bg-orange-500';
        case 'N1': return 'bg-red-500';
        default: return 'bg-slate-500';
    }
}

const isPunctuationOrSymbol = (pos: string) => {
    return ['句読点', '記号', 'Linebreak'].includes(pos);
};

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

const SpeakerIcon = ({ isPlaying }: { isPlaying: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${isPlaying ? 'text-indigo-400 animate-pulse' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5 5 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ReplayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 9a9 9 0 0114.13-5.23M20 15a9 9 0 01-14.13 5.23" />
    </svg>
);

const ExitIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

interface WordDisplayProps {
    word: Word;
    isHidden: boolean;
    onClick: (event: React.MouseEvent<HTMLSpanElement>) => void;
    showHiragana: boolean;
    isGameActive: boolean;
    feedbackState?: 'correct' | 'incorrect';
    isVerticalLayout: boolean;
    containerRef: React.RefObject<HTMLDivElement>;
    isTested?: boolean;
    isSentenceSaved: boolean;
}

const WordDisplayAndTooltip: React.FC<WordDisplayProps> = ({ word, isHidden, onClick, showHiragana, isGameActive, feedbackState, isVerticalLayout, containerRef, isTested, isSentenceSaved }) => {
    const wordRef = useRef<HTMLSpanElement>(null);
    const [positionClasses, setPositionClasses] = useState('');
    const [arrowClasses, setArrowClasses] = useState('');

    const handleMouseEnter = () => {
        if (!wordRef.current || !containerRef.current) return;
        const wordRect = wordRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        
        const tooltipApproxWidth = 320; // max-w-xs
        const tooltipApproxHeight = 140; // Estimated
        const margin = 16;

        if (isVerticalLayout) {
            let verticalPosClasses = "top-1/2 -translate-y-1/2";
            let verticalArrowClasses = "top-1/2 -translate-y-1/2";
            
            // Default to the left, but flip to the right if there's no space
            if (wordRect.left - tooltipApproxWidth - margin < containerRect.left) {
                setPositionClasses(`left-full ml-2 ${verticalPosClasses}`);
                setArrowClasses(`right-full -mr-px rotate-45 ${verticalArrowClasses}`);
            } else {
                setPositionClasses(`right-full mr-2 ${verticalPosClasses}`);
                setArrowClasses(`left-full -ml-px -rotate-45 ${verticalArrowClasses}`);
            }
        } else {
            let horizontalPosClasses = "left-1/2 -translate-x-1/2";
            let horizontalArrowClasses = "left-1/2 -translate-x-1/2";

            // Clamp horizontal position
            if (wordRect.left + wordRect.width / 2 < containerRect.left + tooltipApproxWidth / 2 + margin) {
                horizontalPosClasses = "left-0";
                horizontalArrowClasses = "left-4";
            } else if (wordRect.right - wordRect.width / 2 > containerRect.right - tooltipApproxWidth / 2 - margin) {
                horizontalPosClasses = "right-0";
                horizontalArrowClasses = "right-4";
            }
            
            // Flip vertical position
            if (wordRect.top - containerRect.top < tooltipApproxHeight + margin) {
                setPositionClasses(`top-full mt-2 ${horizontalPosClasses}`);
                setArrowClasses(`bottom-full -mb-px -rotate-45 ${horizontalArrowClasses}`);
            } else {
                setPositionClasses(`bottom-full mb-2 ${horizontalPosClasses}`);
                setArrowClasses(`top-full -mt-px rotate-45 ${horizontalArrowClasses}`);
            }
        }
    };

    const displayText = showHiragana && !isPunctuationOrSymbol(word.pos) ? word.reading : word.surface;

    if (isHidden) {
        return (
            <span
                aria-hidden="true"
                className="inline-block whitespace-nowrap text-slate-600 select-none"
            >
                {displayText}
            </span>
        );
    }
    
    const hasFurigana = !showHiragana && !isGameActive && word.surface !== word.reading && !/^[ぁ-んァ-ン]+$/.test(word.surface);
    const jlptColor = getJlptColor(word.jlpt);
    const isPunctuation = isPunctuationOrSymbol(word.pos);

    let contentClass = `transition-colors duration-200 rounded-md -m-1 p-1 ${
        isPunctuation ? 'text-slate-500' : 'text-slate-200'
    }`;
    
    if (!isSentenceSaved) {
         contentClass += ' group-hover:text-indigo-300';
    }

    if (isSentenceSaved && !isPunctuation) {
        contentClass += ' underline decoration-slate-500 underline-offset-4';
    }
    
    if (isTested) {
        contentClass += ' ring-2 ring-cyan-400/70';
    }

    if (feedbackState === 'correct') {
        contentClass += ' bg-green-500/30 text-green-200 ring-2 ring-green-500';
    } else if (feedbackState === 'incorrect') {
        contentClass += ' bg-red-500/30 text-red-200 ring-2 ring-red-500';
    }
    
    const wordElement = (
         <span className="inline-block">
            {hasFurigana ? (
                <ruby>
                    <span className={contentClass}>{displayText}</span>
                    <rt className="text-xs text-cyan-400 select-none">{word.reading}</rt>
                </ruby>
            ) : (
                <span className={contentClass}>{displayText}</span>
            )}
        </span>
    );
    
    const tooltipStyle: React.CSSProperties = isVerticalLayout ? { writingMode: 'horizontal-tb' } : {};

    return (
        <span
            ref={wordRef}
            className="relative group cursor-pointer inline-block whitespace-nowrap"
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
        >
            {wordElement}
            {!isPunctuation && (
                 <div style={tooltipStyle} className={`absolute w-auto max-w-xs p-3 bg-slate-900 border border-slate-600 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 scale-95 group-hover:scale-100 transform-gpu max-h-80 overflow-y-auto ${positionClasses}`}>
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-lg font-bold text-indigo-300">{word.reading}</p>
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold text-white rounded-full ${jlptColor}`}>
                            {word.jlpt}
                        </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-400 capitalize mb-1">{word.pos}</p>
                    <p className="text-slate-300 leading-snug">{word.definition}</p>
                    <div className={`absolute w-3 h-3 bg-slate-900 border-b border-r border-slate-600 ${arrowClasses}`}></div>
                </div>
            )}
        </span>
    );
};

// Groups sentences into paragraphs based on Linebreak words.
const groupSentencesIntoParagraphs = (sentences: Sentence[]): Sentence[][] => {
    if (!sentences || sentences.length === 0) return [];
    
    const paragraphs: Sentence[][] = [];
    let currentParagraph: Sentence[] = [];

    sentences.forEach(sentence => {
        currentParagraph.push(sentence); // Always add the sentence to the current paragraph
        const containsLinebreak = sentence.japaneseWords.some(w => w.pos === 'Linebreak');
        if (containsLinebreak) {
            // If the sentence contains a line break, this paragraph ends here.
            paragraphs.push(currentParagraph);
            currentParagraph = []; // Start a new paragraph
        }
    });

    if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph);
    }
    
    return paragraphs;
};

// Helper to get the true bounding box of a multi-line element
const getCombinedBoundingClientRect = (element: Element): DOMRect => {
    const rects = element.getClientRects();
    if (rects.length === 0) {
        return element.getBoundingClientRect(); // Fallback
    }

    let minX = rects[0].left;
    let minY = rects[0].top;
    let maxX = rects[0].right;
    let maxY = rects[0].bottom;

    for (let i = 1; i < rects.length; i++) {
        const rect = rects[i];
        minX = Math.min(minX, rect.left);
        minY = Math.min(minY, rect.top);
        maxX = Math.max(maxX, rect.right);
        maxY = Math.max(maxY, rect.bottom);
    }

    return new DOMRect(minX, minY, maxX - minX, maxY - minY);
};

export const AnalyzedText: React.FC<AnalyzedTextProps> = ({ sentences, isSimplifiedView, onSaveSentence, savedSentenceKeys, showHiragana, showSeparators, isGameActive, onExitGame, dismissedWords, isVerticalLayout, onGameLoadingChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const [popupData, setPopupData] = useState<{ sentence: Sentence; sentenceId: string; sentenceRect: DOMRect } | null>(null);
    const [translationPopupStyle, setTranslationPopupStyle] = useState<React.CSSProperties>({ opacity: 0, transform: 'scale(0.95)' });
    const hideTimeoutRef = useRef<number | null>(null);

    // Game State
    const [gameQuestions, setGameQuestions] = useState<Word[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [feedback, setFeedback] = useState<{ key: string, type: 'correct' | 'incorrect' } | null>(null);
    const [score, setScore] = useState(0);
    const [isGameFinished, setIsGameFinished] = useState(false);
    const [isGameLoading, setIsGameLoading] = useState(false);
    const [testedWordKeys, setTestedWordKeys] = useState<Set<string>>(new Set());
    const [showTestedHighlights, setShowTestedHighlights] = useState(false);

    // Scroll vertical text to the start (far right)
    useLayoutEffect(() => {
        if (isVerticalLayout && containerRef.current) {
            const container = containerRef.current;
            container.scrollLeft = container.scrollWidth - container.clientWidth;
        }
    }, [sentences, isVerticalLayout]);

    const paragraphs = useMemo(() => groupSentencesIntoParagraphs(sentences), [sentences]);
    const shouldShowSeparators = showSeparators && !isGameActive;

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        return audioContextRef.current;
    }, []);

    const playAudio = useCallback(async (text: string, audioId: string) => {
        if (currentSourceRef.current) {
            currentSourceRef.current.onended = null;
            currentSourceRef.current.stop();
            currentSourceRef.current = null;
        }

        const audioContext = getAudioContext();
        
        // Ensure AudioContext is running
        if (audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
                console.log('AudioContext resumed');
            } catch (error) {
                console.error('Failed to resume AudioContext:', error);
                setPlayingAudioId(null);
                return;
            }
        }

        setPlayingAudioId(audioId);

        let audioBuffer: AudioBuffer | undefined = audioCacheRef.current.get(text);

        if (!audioBuffer) {
            try {
                console.log(`Generating speech for: ${text}`);
                audioBuffer = await generateSpeech(text, audioContext);
                audioCacheRef.current.set(text, audioBuffer);
                console.log(`Audio generated successfully, duration: ${audioBuffer.duration}s, sampleRate: ${audioBuffer.sampleRate}`);
            } catch (error) {
                console.error("Failed to generate speech:", error);
                setPlayingAudioId(null);
                alert(`無法生成音頻：${error instanceof Error ? error.message : String(error)}`);
                return;
            }
        }
        
        if (!audioBuffer) {
            console.error('No audio buffer available');
            setPlayingAudioId(null);
            return;
        }

        try {
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            
            // Add error handler
            source.onerror = (error) => {
                console.error('Audio source error:', error);
                setPlayingAudioId(null);
            };
            
            source.start(0);
            console.log(`Audio playback started for: ${text}`);
            currentSourceRef.current = source;
        } catch (error) {
            console.error('Failed to start audio playback:', error);
            setPlayingAudioId(null);
            alert(`無法播放音頻：${error instanceof Error ? error.message : String(error)}`);
        }
        
        source.onended = () => {
            if (currentSourceRef.current === source) {
                currentSourceRef.current = null;
                setPlayingAudioId(null);
            }
        };
    }, [getAudioContext]);

    // Game Logic
    const startGame = useCallback(async (isRestart = false) => {
        setIsGameLoading(true);
        onGameLoadingChange?.(true);
        setIsGameFinished(false);
        setFeedback(null);
        setTestedWordKeys(new Set());
        setShowTestedHighlights(false);

        const allWords = sentences.flatMap(s => s.japaneseWords);
        const wordsToConsider = isSimplifiedView ? allWords.filter(w => w.isEssential) : allWords;
        const unique = new Map<string, Word>();
        const kanjiRegex = /[\u4e00-\u9faf]/;
        const kanaOnlyRegex = /^[ぁ-んァ-ン]+$/;
        
        wordsToConsider.forEach(word => {
            if (isPunctuationOrSymbol(word.pos)) return;
            const key = `${word.surface}|${word.reading}`;
            if (unique.has(key) || dismissedWords.has(key)) return;

            const hasKanji = kanjiRegex.test(word.surface);
            const isAdvancedKana = kanaOnlyRegex.test(word.surface) && ['N3', 'N2', 'N1', 'UNKNOWN'].includes(word.jlpt.toUpperCase());
            if (hasKanji || isAdvancedKana) {
                unique.set(key, word);
            }
        });

        const baseQuestions = Array.from(unique.values());
        if (baseQuestions.length < 1) {
            setIsGameLoading(false);
            onGameLoadingChange?.(false);
            setIsGameFinished(true);
            setGameQuestions([]);
            return;
        }

        const extraQuestionsCount = Math.floor(baseQuestions.length / 4);
        const extraQuestions: Word[] = [];
        for (let i = 0; i < extraQuestionsCount; i++) {
            extraQuestions.push(baseQuestions[Math.floor(Math.random() * baseQuestions.length)]);
        }
        const questions = shuffleArray([...baseQuestions, ...extraQuestions]);
        
        setGameQuestions(questions);
        setCurrentQuestionIndex(0);
        setScore(0);
        setIsGameLoading(false);
        onGameLoadingChange?.(false);
        
    }, [sentences, isSimplifiedView, dismissedWords, onGameLoadingChange]);

    useEffect(() => {
        if (isGameActive && !isVerticalLayout) {
           startGame();
        } else {
            // Reset game state when the game is no longer active
            setIsGameFinished(false);
            setTestedWordKeys(new Set());
            setShowTestedHighlights(false);
            setCurrentQuestionIndex(0);
            setScore(0);
            setFeedback(null);
            setGameQuestions([]);
        }
    }, [isGameActive, startGame, isVerticalLayout]);
    
    // This new effect centralizes the audio playback for the game.
    useEffect(() => {
        if (isGameActive && !isVerticalLayout && gameQuestions.length > 0 && currentQuestionIndex < gameQuestions.length) {
            const currentQuestion = gameQuestions[currentQuestionIndex];
            // A small delay ensures the UI updates can be perceived before the audio for the new question starts.
            const audioTimeout = setTimeout(() => {
                playAudio(currentQuestion.reading, `game-${currentQuestionIndex}`);
            }, 200);

            return () => clearTimeout(audioTimeout);
        }
    }, [isGameActive, isVerticalLayout, gameQuestions, currentQuestionIndex, playAudio]);

    const handleGameWordClick = useCallback((clickedWord: Word) => {
        if (feedback || isGameFinished || isGameLoading) return;

        const currentQuestion = gameQuestions[currentQuestionIndex];
        const isCorrect = clickedWord.surface === currentQuestion.surface && clickedWord.reading === currentQuestion.reading;
        const clickedWordKey = `${clickedWord.surface}|${clickedWord.reading}`;

        if (isCorrect) {
            setScore(s => s + 1);
            setFeedback({ key: clickedWordKey, type: 'correct' });
            setTimeout(() => {
                const nextIndex = currentQuestionIndex + 1;
                if (nextIndex < gameQuestions.length) {
                    setCurrentQuestionIndex(nextIndex);
                    setFeedback(null);
                } else {
                    setIsGameFinished(true);
                    setTestedWordKeys(new Set(gameQuestions.map(w => `${w.surface}|${w.reading}`)));
                    setShowTestedHighlights(true);
                }
            }, 1500);
        } else {
            setFeedback({ key: clickedWordKey, type: 'incorrect' });
            // After showing feedback, replay the audio for the same question to help the user learn.
            setTimeout(() => {
                setFeedback(null);
                playAudio(currentQuestion.reading, `game-${currentQuestionIndex}-retry`);
            }, 1500);
        }
    }, [feedback, isGameFinished, isGameLoading, gameQuestions, currentQuestionIndex, playAudio]);

    const handleSentenceAudio = useCallback((text: string, id: string) => {
        playAudio(text, id);
    }, [playAudio]);

    const handleWordSingleClick = useCallback((event: React.MouseEvent<HTMLSpanElement>, sentence: Sentence, sentenceId: string) => {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        
        const sentenceWrapper = event.currentTarget.closest('.sentence-wrapper');
        if (!sentenceWrapper || !containerRef.current) return;

        const sentenceRect = getCombinedBoundingClientRect(sentenceWrapper);
        
        setPopupData({ sentence, sentenceId, sentenceRect });
        
        const sentenceText = sentence.japaneseWords.map(w => w.surface).join('');
        handleSentenceAudio(sentenceText, sentenceId);
    }, [handleSentenceAudio]);

    useLayoutEffect(() => {
        if (popupData && popupRef.current && containerRef.current) {
            const popup = popupRef.current;
            const { sentenceRect } = popupData;
            const containerRect = containerRef.current.getBoundingClientRect();

            const popupHeight = popup.offsetHeight;
            const popupWidth = popup.offsetWidth;
            const MARGIN = 8;

            const finalStyle: React.CSSProperties = { opacity: 1, transform: 'scale(1)' };

            const relativeSentenceTop = sentenceRect.top - containerRect.top;
            const relativeSentenceLeft = sentenceRect.left - containerRect.left;

            if (isVerticalLayout) {
                // Position vertically, centered on the sentence and clamped
                let top = relativeSentenceTop + (sentenceRect.height / 2) - (popupHeight / 2);
                top = Math.max(MARGIN, Math.min(top, containerRect.height - popupHeight - MARGIN));
                finalStyle.top = `${top}px`;

                // Position horizontally, preferring left of sentence
                const spaceToLeft = sentenceRect.left - containerRect.left; // This is basically relativeSentenceLeft
                if (spaceToLeft > popupWidth + MARGIN) {
                    finalStyle.left = `${relativeSentenceLeft - popupWidth - MARGIN}px`;
                } else {
                    finalStyle.left = `${relativeSentenceLeft + sentenceRect.width + MARGIN}px`;
                }
            } else { // Horizontal Layout
                // Position vertically, preferring above
                const spaceAbove = sentenceRect.top - containerRect.top;
                if (spaceAbove > popupHeight + MARGIN) {
                    finalStyle.top = `${relativeSentenceTop - popupHeight - MARGIN}px`;
                } else {
                    finalStyle.top = `${relativeSentenceTop + sentenceRect.height + MARGIN}px`;
                }

                // Position horizontally, centered and clamped
                let left = relativeSentenceLeft + (sentenceRect.width / 2) - (popupWidth / 2);
                left = Math.max(MARGIN, Math.min(left, containerRect.width - popupWidth - MARGIN));
                finalStyle.left = `${left}px`;
            }
            setTranslationPopupStyle(finalStyle);
        } else {
            setTranslationPopupStyle({ opacity: 0, transform: 'scale(0.95)' });
        }
    }, [popupData, isVerticalLayout]);

    const hidePopup = useCallback(() => {
        hideTimeoutRef.current = window.setTimeout(() => setPopupData(null), 200);
    }, []);
    
    const renderGameUI = () => {
        if (isGameLoading) {
            return (
                 <div className="flex justify-center items-center p-4 bg-slate-900 rounded-t-md border-b border-slate-700">
                     <p className="text-lg font-semibold text-slate-300">Preparing your game...</p>
                 </div>
            );
        }

        if (isGameFinished) {
            const percentage = gameQuestions.length > 0 ? Math.round((score / gameQuestions.length) * 100) : 100;
            return (
                <div className="text-center p-4 bg-slate-900 rounded-t-md border-b border-slate-700">
                    <h3 className="text-xl font-bold text-slate-100">Practice Complete!</h3>
                    <p className="text-2xl font-bold text-indigo-400 my-2">{percentage}%</p>
                    <p className="text-slate-300">You identified {score} out of {gameQuestions.length} words correctly.</p>
                    <div className="mt-4 flex justify-center gap-4">
                        <button onClick={() => startGame(true)} title="Practice Again" className="flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"><ReplayIcon /></button>
                        <button onClick={onExitGame} title="Exit" className="flex items-center justify-center w-10 h-10 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600"><ExitIcon /></button>
                    </div>
                </div>
            );
        }

        if (gameQuestions.length === 0) {
            return null; // Don't render anything if there are no questions
        }
        
        const currentQuestion = gameQuestions[currentQuestionIndex];
        return (
            <div className="flex justify-between items-center p-2 bg-slate-900 rounded-t-md border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <button onClick={() => playAudio(currentQuestion.reading, `game-${currentQuestionIndex}`)} disabled={playingAudioId?.startsWith('game-')} className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-slate-700 disabled:cursor-wait">
                        <SpeakerIcon isPlaying={playingAudioId?.startsWith('game-') || false} />
                    </button>
                    <p className="text-lg font-semibold text-slate-300">Find this word</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-slate-200">
                       {currentQuestionIndex + 1} / {gameQuestions.length}
                    </p>
                    <p className="text-sm text-slate-400">Score: {score}</p>
                </div>
                 <button onClick={onExitGame} className="absolute top-2 right-2 flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Exit game">
                    <CloseIcon />
                </button>
            </div>
        );
    }
    
    const containerClasses = isVerticalLayout 
        ? "w-full h-[calc(80vh+4.5rem-12.8rem)] overflow-y-hidden overflow-x-auto bg-slate-900 rounded-md border border-slate-700 p-6"
        : "text-2xl leading-loose bg-slate-900 rounded-md border border-slate-700 min-h-[30rem] max-h-[60vh] overflow-y-auto";
    
    const containerStyles: React.CSSProperties = isVerticalLayout ? {
        writingMode: 'vertical-rl', 
        textOrientation: 'mixed',
        fontSize: '1.5rem',
        lineHeight: '3.2rem',
    } : { fontSize: '1.5rem', lineHeight: '2.8rem' };

    return (
        <div 
            ref={containerRef}
            className={`${containerClasses} relative`}
            style={containerStyles}
        >
            {isGameActive && !isVerticalLayout && renderGameUI()}

            <div className={isVerticalLayout ? "h-full" : "p-6"}>
            {paragraphs.length > 0 ? (
                paragraphs.map((paragraph, pIndex) => (
                    <div key={`paragraph-${pIndex}`} className={isVerticalLayout ? 'inline-block h-full align-top ml-8' : 'mb-6'}>
                        {paragraph.map((sentence, sIndex) => {
                            const sentenceId = `p${pIndex}-s${sIndex}`;
                            const sentenceText = sentence.japaneseWords.map(w => w.surface).join('');
                            const isSaved = savedSentenceKeys.has(sentenceText);
                            
                            // Find index of the last word that is not a linebreak.
                            let lastWordIndex = -1;
                            for (let i = sentence.japaneseWords.length - 1; i >= 0; i--) {
                                if (sentence.japaneseWords[i].pos !== 'Linebreak') {
                                    lastWordIndex = i;
                                    break;
                                }
                            }

                            return (
                                <span key={sentenceId}>
                                    <span
                                        className={`sentence-wrapper relative transition-colors duration-300 rounded p-1 -m-1 ${
                                            playingAudioId === sentenceId ? 'bg-indigo-500/20' : ''
                                        }`}
                                        onMouseLeave={hidePopup}
                                    >
                                        {sentence.japaneseWords.map((word, wIndex) => {
                                             if (word.pos === 'Linebreak') {
                                                // Paragraphing is handled by groupSentencesIntoParagraphs and the wrapping div.
                                                // This token is just a marker and should not be rendered itself.
                                                return null;
                                            }
                                            const shouldBeDimmed = isSimplifiedView && !word.isEssential && !isPunctuationOrSymbol(word.pos);
                                            const isLastWordInSentence = lastWordIndex === wIndex;
                                            const thisWordIsPunct = isPunctuationOrSymbol(word.pos);
                                            const nextWordIsPunct = wIndex < sentence.japaneseWords.length - 1 && isPunctuationOrSymbol(sentence.japaneseWords[wIndex + 1].pos);
                                            
                                            let feedbackState: 'correct' | 'incorrect' | undefined = undefined;
                                            if (isGameActive && feedback) {
                                                const wordKey = `${word.surface}|${word.reading}`;
                                                if (wordKey === feedback.key) {
                                                    feedbackState = feedback.type;
                                                }
                                            }
                                            
                                            const wordKey = `${word.surface}|${word.reading}`;
                                            const isTested = showTestedHighlights && testedWordKeys.has(wordKey);

                                            // A word can trigger a save if it's a terminating punctuation mark,
                                            // and every token after it (if any) is also punctuation. This allows
                                            // clicking on '。' in a sentence ending with '。」'.
                                            const isTerminatingPunctuationList = ['。', '！', '？', '♪', '」', '』', '）', '】'];
                                            const currentWordIsTerminatingPunctuation = isTerminatingPunctuationList.includes(word.surface);
                                            
                                            let isSaveTrigger = false;
                                            if (currentWordIsTerminatingPunctuation) {
                                                let allSubsequentArePunctuation = true;
                                                for (let i = wIndex + 1; i <= lastWordIndex; i++) {
                                                    if (!isPunctuationOrSymbol(sentence.japaneseWords[i].pos)) {
                                                        allSubsequentArePunctuation = false;
                                                        break;
                                                    }
                                                }
                                                if (allSubsequentArePunctuation) {
                                                    isSaveTrigger = true;
                                                }
                                            }

                                            return (
                                                <React.Fragment key={`${word.surface}-${pIndex}-${sIndex}-${wIndex}`}>
                                                    <span className={(shouldShowSeparators && !isPunctuationOrSymbol(word.pos)) ? 'border-b border-dotted border-slate-600' : ''}>
                                                        <WordDisplayAndTooltip
                                                            word={word}
                                                            isHidden={shouldBeDimmed}
                                                            onClick={(e) => {
                                                                e.stopPropagation(); 
                                                                if (isGameActive) {
                                                                    handleGameWordClick(word);
                                                                } else if (isSaveTrigger) {
                                                                    onSaveSentence(sentence, isSaved);
                                                                } else {
                                                                    handleWordSingleClick(e, sentence, sentenceId);
                                                                }
                                                            }}
                                                            showHiragana={showHiragana}
                                                            isGameActive={isGameActive}
                                                            feedbackState={feedbackState}
                                                            isVerticalLayout={isVerticalLayout}
                                                            containerRef={containerRef}
                                                            isTested={isTested}
                                                            isSentenceSaved={isSaved}
                                                        />
                                                    </span>
                                                    {(showSeparators && !isLastWordInSentence && !thisWordIsPunct && !nextWordIsPunct) && (
                                                        <span
                                                            className={`text-lg text-slate-500 select-none ${isVerticalLayout ? '' : 'relative bottom-[-0.2em]'}`}
                                                            aria-hidden="true"
                                                        >
                                                            .
                                                        </span>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </span>
                                </span>
                            );
                        })}
                    </div>
                ))
            ) : (
                <span className="text-slate-500">Analysis result will appear here.</span>
            )}
            </div>

            {popupData && (
                <div 
                    ref={popupRef}
                    onMouseEnter={() => { if(hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current) }}
                    onMouseLeave={hidePopup}
                    className={`absolute z-20 w-auto bg-slate-800/80 backdrop-blur-sm p-4 rounded-lg text-2xl leading-loose shadow-lg border border-slate-700 pointer-events-auto transition-all duration-200 ${isVerticalLayout ? 'max-h-[80vh] overflow-x-auto' : 'max-h-80 overflow-y-auto whitespace-nowrap'}`}
                    style={{
                        ...translationPopupStyle,
                        ...(isVerticalLayout ? { writingMode: 'vertical-rl', textOrientation: 'mixed' } : {}),
                    }}
                >
                    <p className={`text-cyan-300 ${isVerticalLayout ? 'whitespace-nowrap' : ''}`}>{popupData.sentence.chineseTranslation}</p>
                </div>
            )}
        </div>
    );
};