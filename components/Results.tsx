import React, { useCallback, useEffect, useState } from 'react';
import { type AnalysisResultData, type Word, type Sentence } from '../types';
import { AnalyzedText } from './AnalyzedText';
import { WordCards } from './WordCards';

interface ResultsProps {
    result: AnalysisResultData | null;
    isLoading: boolean;
    error: string | null;
    onSaveAnalysis: () => void;
    isCurrentAnalysisSaved: boolean;
    onSaveSentence: (sentence: Sentence, isSaved: boolean) => void;
    dismissedWords: Set<string>;
    savedWordKeys: Set<string>;
    savedSentenceKeys: Set<string>;
    onSaveWord: (word: Word, isSaved: boolean) => void;
    onDismissWord: (key: string) => void;
    lastDismissedWordKey: string | null;
    onUndoDismiss: () => void;
    isSimplifiedView: boolean;
    setIsSimplifiedView: (value: boolean) => void;
    showHiragana: boolean;
    setShowHiragana: (value: boolean) => void;
    showSeparators: boolean;
    setShowSeparators: (value: boolean) => void;
    isTextGameActive: boolean;
    setIsTextGameActive: (value: boolean) => void;
}

const BookmarkAnalysisIcon = ({ saved }: { saved: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
);

const GameIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const LoadingIndicator = () => (
    <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-800/50 rounded-lg border border-slate-700 shadow-lg">
        <svg className="animate-spin h-12 w-12 text-indigo-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-xl font-semibold text-slate-300">Analyzing your text...</p>
        <p className="text-slate-400 mt-1">This may take a few moments.</p>
    </div>
);

const InitialState = () => (
    <div className="text-center p-10 bg-slate-800/50 rounded-lg border border-slate-700 shadow-lg">
        <p className="text-xl font-semibold text-slate-300">Your analysis will appear here.</p>
        <p className="text-slate-400 mt-1">Enter some Japanese text above and click "Analyze Text" to begin.</p>
    </div>
);

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
    <div className="text-center p-10 bg-red-900/20 rounded-lg border border-red-500/50 shadow-lg">
        <p className="text-xl font-semibold text-red-300">Analysis Failed</p>
        <p className="text-red-400 mt-1">{message}</p>
    </div>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: () => void; title?: string; disabled?: boolean; }> = ({ label, checked, onChange, title, disabled = false }) => (
    <div className={`flex items-center ${disabled ? 'opacity-50' : ''}`} title={title}>
        <span className="text-slate-400 text-sm sm:text-base mr-2">{label}</span>
        <label htmlFor={`toggle-${label}`} className={`flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <div className="relative">
                <input
                    type="checkbox"
                    id={`toggle-${label}`}
                    className="sr-only"
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform transform ${checked ? 'translate-x-full' : ''}`}></div>
            </div>
        </label>
    </div>
);

export const Results: React.FC<ResultsProps> = ({ result, isLoading, error, onSaveAnalysis, isCurrentAnalysisSaved, onSaveSentence, dismissedWords, savedWordKeys, savedSentenceKeys, onSaveWord, onDismissWord, lastDismissedWordKey, onUndoDismiss, isSimplifiedView, setIsSimplifiedView, showHiragana, setShowHiragana, showSeparators, setShowSeparators, isTextGameActive, setIsTextGameActive }) => {
    const [isVerticalLayout, setIsVerticalLayout] = useState(false);
    const [isGameLoading, setIsGameLoading] = useState(false);
    
    if (isLoading) return <LoadingIndicator />;
    if (error) return <ErrorState message={error} />;
    if (!result || !result.sentences) return <InitialState />;

    return (
        <div className="animate-fade-in space-y-8">
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-2xl font-bold text-slate-100">
                        Reading View
                    </h2>
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
                        <Toggle label="Vertical" checked={isVerticalLayout} onChange={() => setIsVerticalLayout(!isVerticalLayout)} title="Switch to vertical reading mode" disabled={isTextGameActive}/>
                        <Toggle label="Dots" checked={showSeparators} onChange={() => setShowSeparators(!showSeparators)} title="Show word separator dots" disabled={isTextGameActive}/>
                        <Toggle label="Hiragana" checked={showHiragana} onChange={() => setShowHiragana(!showHiragana)} title="Show all text in Hiragana" disabled={isTextGameActive}/>
                        <Toggle label="Simplified" checked={isSimplifiedView} onChange={() => setIsSimplifiedView(!isSimplifiedView)} title="Show only essential words" disabled={isTextGameActive}/>
                        <button
                            onClick={() => setIsTextGameActive(!isTextGameActive)}
                            title={isTextGameActive ? "Exit Game" : (isGameLoading ? "Preparing game..." : "Start Listening Game")}
                            disabled={isGameLoading}
                            className={`flex items-center justify-center w-10 h-10 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${isTextGameActive ? 'bg-indigo-600 text-white focus:ring-indigo-500' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 focus:ring-slate-500'}`}
                        >
                            {isGameLoading ? (
                                <svg className="animate-spin h-6 w-6 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <GameIcon />
                            )}
                        </button>
                        <button
                            onClick={onSaveAnalysis}
                            title={isCurrentAnalysisSaved ? "Analysis Saved" : "Save Analysis"}
                            disabled={isCurrentAnalysisSaved}
                             className={`flex items-center justify-center w-10 h-10 font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 bg-slate-700 focus:ring-slate-500 ${
                                isCurrentAnalysisSaved 
                                ? 'text-indigo-400 cursor-default' 
                                : 'text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                            <BookmarkAnalysisIcon saved={isCurrentAnalysisSaved} />
                        </button>
                    </div>
                </div>
                <AnalyzedText 
                    sentences={result.sentences} 
                    isSimplifiedView={isSimplifiedView}
                    onSaveSentence={onSaveSentence}
                    savedSentenceKeys={savedSentenceKeys}
                    showHiragana={showHiragana}
                    showSeparators={showSeparators}
                    isGameActive={isTextGameActive}
                    onExitGame={() => setIsTextGameActive(false)}
                    isVerticalLayout={isVerticalLayout}
                    dismissedWords={dismissedWords}
                    onGameLoadingChange={setIsGameLoading}
                />
            </div>

            <WordCards 
                sourceSentences={result.sentences}
                isSimplifiedView={isSimplifiedView}
                dismissedWords={dismissedWords}
                savedWordKeys={savedWordKeys}
                onSaveWord={onSaveWord}
                onDismissWord={onDismissWord}
            />

            {lastDismissedWordKey && (
                <div className="fixed bottom-6 right-6 bg-slate-800 border border-slate-600 text-slate-200 p-4 rounded-lg shadow-2xl flex items-center gap-4 animate-fade-in z-50">
                    <p>Word dismissed.</p>
                    <button
                        onClick={onUndoDismiss}
                        className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                        aria-label="Undo dismiss"
                    >
                        Undo
                    </button>
                </div>
            )}
        </div>
    );
};
