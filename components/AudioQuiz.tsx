import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { type Word } from '../types';
import { generateSpeech } from '../services/geminiService';

const NUM_OPTIONS = 4;

interface QuizQuestion {
    correctWord: Word;
    options: Word[];
}

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
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 ${isPlaying ? 'text-indigo-400 animate-pulse' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5 5 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ReplayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 9a9 9 0 0114.13-5.23M20 15a9 9 0 01-14.13 5.23" />
    </svg>
);

const ExitIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

interface AudioQuizProps {
    words: Word[];
    onExit: () => void;
    audioCache: Map<string, AudioBuffer>;
    audioContext: AudioContext;
}

export const AudioQuiz: React.FC<AudioQuizProps> = ({ words, onExit, audioCache, audioContext }) => {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswerKey, setSelectedAnswerKey] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    const audioCacheRef = useRef<Map<string, AudioBuffer>>(audioCache);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const retryCountRef = useRef(0); // Tracks attempts on the current question

    useEffect(() => {
        const generateQuestions = (deck: Word[]): QuizQuestion[] => {
            const baseQuestions = deck.map(correctWord => {
                const distractors = shuffleArray(deck.filter(w => w.surface !== correctWord.surface)).slice(0, NUM_OPTIONS - 1);
                const options = shuffleArray([correctWord, ...distractors]);
                return { correctWord, options };
            });

            const extraQuestionsCount = Math.floor(deck.length / 4);
            const extraQuestions: QuizQuestion[] = [];

            for (let i = 0; i < extraQuestionsCount; i++) {
                const correctWord = deck[Math.floor(Math.random() * deck.length)];
                const distractors = shuffleArray(deck.filter(w => w.surface !== correctWord.surface)).slice(0, NUM_OPTIONS - 1);
                const options = shuffleArray([correctWord, ...distractors]);
                extraQuestions.push({ correctWord, options });
            }

            const allQuestions = shuffleArray([...baseQuestions, ...extraQuestions]);

            // Post-process to prevent consecutive duplicates
            if (allQuestions.length < 2) {
                return allQuestions;
            }

            for (let i = 1; i < allQuestions.length; i++) {
                if (allQuestions[i].correctWord.surface === allQuestions[i - 1].correctWord.surface) {
                    // Find a different question to swap with, starting from the next one
                    let swapIndex = -1;
                    for (let j = i + 1; j < allQuestions.length; j++) {
                        if (allQuestions[j].correctWord.surface !== allQuestions[i].correctWord.surface) {
                            swapIndex = j;
                            break;
                        }
                    }

                    // If a suitable swap is found, perform the swap
                    if (swapIndex !== -1) {
                        [allQuestions[i], allQuestions[swapIndex]] = [allQuestions[swapIndex], allQuestions[i]];
                    }
                }
            }
            return allQuestions;
        };
        // By running this only on mount (empty dependency array), we prevent the words from
        // re-shuffling on every re-render of the parent component.
        setQuestions(generateQuestions(words));
    }, []);

    const playAudio = useCallback(async (reading: string) => {
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        if (currentSourceRef.current) {
            currentSourceRef.current.onended = null;
            currentSourceRef.current.stop();
            currentSourceRef.current = null;
        }
        setIsPlayingAudio(true);

        let audioBuffer: AudioBuffer | undefined = audioCacheRef.current.get(reading);

        if (!audioBuffer) {
            console.warn(`Audio for "${reading}" not preloaded. Generating on-the-fly.`);
            try {
                audioBuffer = await generateSpeech(reading, audioContext);
                audioCacheRef.current.set(reading, audioBuffer);
            } catch (error) {
                console.error("Failed to generate speech:", error);
                setIsPlayingAudio(false);
                return;
            }
        }
        
        if (!audioBuffer) {
            setIsPlayingAudio(false);
            return;
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        currentSourceRef.current = source;
        source.onended = () => {
            if (currentSourceRef.current === source) {
                currentSourceRef.current = null;
                setIsPlayingAudio(false);
            }
        };
    }, [audioContext]);

    const currentQuestion = useMemo(() => questions[currentQuestionIndex], [questions, currentQuestionIndex]);

    useEffect(() => {
        if (currentQuestion && !isFinished) {
            const timer = setTimeout(() => {
                playAudio(currentQuestion.correctWord.reading);
            }, 200); // Small delay before playing audio for new question
            return () => clearTimeout(timer);
        }
    }, [currentQuestion, isFinished, playAudio]);


    const handleAnswerSelect = (word: Word) => {
        if (feedback) return; // Prevent clicking while feedback is shown
        const wordKey = `${word.surface}|${word.reading}`;
        setSelectedAnswerKey(wordKey);

        if (wordKey === `${currentQuestion.correctWord.surface}|${currentQuestion.correctWord.reading}`) {
            setFeedback('correct');
            if (retryCountRef.current === 0) {
                 setScore(s => s + 1); // Only score if correct on the first try
            }
           
            // Wait, then advance to the next question
            setTimeout(() => {
                 retryCountRef.current = 0; // Reset for next question
                if (currentQuestionIndex < questions.length - 1) {
                    setCurrentQuestionIndex(i => i + 1);
                    setSelectedAnswerKey(null);
                    setFeedback(null);
                } else {
                    setIsFinished(true);
                }
            }, 1500);
        } else {
            setFeedback('incorrect');
            retryCountRef.current += 1;
            // Show red feedback, then reset and replay audio
            setTimeout(() => {
                setSelectedAnswerKey(null);
                setFeedback(null);
                playAudio(currentQuestion.correctWord.reading);
            }, 1500);
        }
    };

    const handleRetry = () => {
        setQuestions(shuffleArray(questions));
        setCurrentQuestionIndex(0);
        setSelectedAnswerKey(null);
        setFeedback(null);
        setScore(0);
        setIsFinished(false);
        retryCountRef.current = 0;
    };

    if (questions.length === 0) {
        return <p className="text-slate-400">Setting up the quiz...</p>;
    }

    if (isFinished) {
        const percentage = Math.round((score / questions.length) * 100);
        return (
            <div className="text-center py-8">
                <h3 className="text-2xl font-bold text-slate-100">Quiz Complete!</h3>
                <p className="text-4xl font-bold text-indigo-400 my-4">{percentage}%</p>
                <p className="text-lg text-slate-300">You answered {score} out of {questions.length} questions correctly on the first try.</p>
                <div className="mt-8 flex justify-center gap-4">
                    <button onClick={handleRetry} title="Try Again" className="flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        <ReplayIcon />
                    </button>
                    <button onClick={onExit} title="Exit Quiz" className="flex items-center justify-center w-12 h-12 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600">
                        <ExitIcon />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 relative">
             <button
                onClick={onExit}
                className="absolute -top-2 -right-2 z-10 flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white"
                aria-label="Exit quiz"
            >
                <CloseIcon />
            </button>
            <div className="text-center">
                <p className="text-slate-400 mb-2">Question {currentQuestionIndex + 1} of {questions.length}</p>
                <button onClick={() => playAudio(currentQuestion.correctWord.reading)} disabled={isPlayingAudio} className="flex items-center justify-center w-16 h-16 bg-slate-900 rounded-full transition-colors hover:bg-slate-700 disabled:cursor-wait">
                    <SpeakerIcon isPlaying={isPlayingAudio} />
                </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {currentQuestion.options.map(word => {
                    const wordKey = `${word.surface}|${word.reading}`;
                    const correctKey = `${currentQuestion.correctWord.surface}|${currentQuestion.correctWord.reading}`;
                    let borderColor = 'border-slate-600 hover:border-indigo-500';

                    if (feedback && wordKey === selectedAnswerKey) {
                        borderColor = feedback === 'correct' ? 'border-green-500' : 'border-red-500';
                    } else if (feedback) {
                         borderColor = 'border-slate-700 opacity-50';
                    }

                    return (
                        <button
                            key={wordKey}
                            onClick={() => handleAnswerSelect(word)}
                            disabled={!!feedback}
                            className={`flex items-center justify-center h-28 p-4 bg-slate-800 border-2 rounded-lg transition-all duration-300 disabled:cursor-not-allowed ${borderColor}`}
                        >
                            <span className="text-3xl font-bold text-slate-200">{word.surface}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};