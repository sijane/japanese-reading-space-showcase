import React, { useRef } from 'react';
import { type SavedAnalysis, type SavedDeck } from '../types';

interface SavedItemsProps {
    analyses: SavedAnalysis[];
    decks: SavedDeck[];
    onLoadAnalysis: (analysis: SavedAnalysis) => void;
    onDeleteAnalysis: (id: number) => void;
    onLoadDeck: (deck: SavedDeck) => void;
    onDeleteDeck: (id: number) => void;
    onExport: () => void;
    onImport: (file: File) => void;
    onShowDismissed: () => void;
    hasDismissedWords: boolean;
}

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const ExportIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const ImportIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const DismissedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
);


export const SavedItems: React.FC<SavedItemsProps> = ({ analyses, decks, onLoadAnalysis, onDeleteAnalysis, onLoadDeck, onDeleteDeck, onExport, onImport, onShowDismissed, hasDismissedWords }) => {
    const importInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImport(file);
        }
        // Reset file input to allow importing the same file again
        event.target.value = '';
    };

    return (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 shadow-lg animate-fade-in">
             <input
                type="file"
                ref={importInputRef}
                className="hidden"
                accept=".json"
                onChange={handleFileChange}
            />
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-slate-100">Saved Items</h2>
                <div className="flex items-center gap-3">
                    {hasDismissedWords && (
                         <button 
                            onClick={onShowDismissed}
                            title="Manage Dismissed Words"
                            className="flex items-center justify-center p-3 bg-slate-700 text-slate-300 font-semibold rounded-md hover:bg-slate-600 transition-colors duration-200"
                        >
                           <DismissedIcon />
                        </button>
                    )}
                    <button 
                        onClick={handleImportClick}
                        title="Import Data"
                        className="flex items-center justify-center p-3 bg-slate-700 text-slate-300 font-semibold rounded-md hover:bg-slate-600 transition-colors duration-200"
                    >
                       <ImportIcon />
                    </button>
                     <button
                        onClick={onExport}
                        title="Export Data"
                        className="flex items-center justify-center p-3 bg-slate-700 text-slate-300 font-semibold rounded-md hover:bg-slate-600 transition-colors duration-200"
                    >
                        <ExportIcon />
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Saved Analyses Section */}
                <div>
                    <h3 className="text-xl font-semibold text-indigo-400 mb-4">Saved Analyses</h3>
                    {analyses.length > 0 ? (
                        <ul className="space-y-3">
                            {analyses.map(analysis => (
                                <li key={analysis.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center border border-slate-700 hover:bg-slate-700/50 transition-colors">
                                    <span className="text-slate-300 truncate pr-4">{analysis.title}</span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={() => onLoadAnalysis(analysis)} className="px-3 py-1 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Load</button>
                                        <button onClick={() => onDeleteAnalysis(analysis.id)} className="flex items-center justify-center w-10 h-10 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-md"><TrashIcon /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-400">No saved analyses yet.</p>
                    )}
                </div>

                {/* Saved Decks Section */}
                <div>
                    <h3 className="text-xl font-semibold text-cyan-400 mb-4">Saved Card Decks</h3>
                    {decks.length > 0 ? (
                        <ul className="space-y-3">
                            {decks.map(deck => {
                                return (
                                <li key={deck.id} className="bg-slate-800 rounded-lg flex justify-between items-center border border-slate-700">
                                    <div
                                        onClick={() => onLoadDeck(deck)}
                                        className="flex-grow p-3 cursor-pointer rounded-l-lg transition-colors hover:bg-slate-700/50"
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onLoadDeck(deck); }}
                                        aria-label={`Review deck: ${deck.name}`}
                                    >
                                        <span className="text-slate-300 truncate">{deck.name}：{deck.cards.length}</span>
                                    </div>
                                    <div className="flex items-center flex-shrink-0 pr-3">
                                        <button 
                                            onClick={() => onDeleteDeck(deck.id)} 
                                            className="flex items-center justify-center w-10 h-10 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-md"
                                            aria-label={`Delete deck: ${deck.name}`}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </li>
                            )})}
                        </ul>
                    ) : (
                        <p className="text-slate-400">No saved card decks yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};