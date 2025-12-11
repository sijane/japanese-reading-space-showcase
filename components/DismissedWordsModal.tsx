import React from 'react';

interface DismissedWordsModalProps {
    dismissedWords: Set<string>;
    onRestoreWord: (wordKey: string) => void;
    onClose: () => void;
}

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const DismissedWordsModal: React.FC<DismissedWordsModalProps> = ({ dismissedWords, onRestoreWord, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-lg w-full max-w-md max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-100">Manage Dismissed Words</h2>
                    <button onClick={onClose} className="flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white">
                        <CloseIcon />
                    </button>
                </div>
                
                {dismissedWords.size > 0 ? (
                    <div className="overflow-y-auto pr-2 flex-grow">
                        <ul className="space-y-3">
                            {Array.from(dismissedWords).sort().map((wordKey: string) => {
                                const [surface, reading] = wordKey.split('|');
                                return (
                                <li key={wordKey} className="bg-slate-900 p-3 rounded-lg flex justify-between items-center border border-slate-700 hover:bg-slate-700/50 transition-colors">
                                    <span className="text-slate-300 truncate pr-4">
                                        {surface}
                                        {reading && reading !== surface && <span className="text-slate-500 text-sm ml-2">({reading})</span>}
                                    </span>
                                    <div className="flex-shrink-0">
                                        <button 
                                            onClick={() => onRestoreWord(wordKey)} 
                                            className="px-3 py-1 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                                            aria-label={`Restore word: ${surface}`}
                                        >
                                            Restore
                                        </button>
                                    </div>
                                </li>
                            )})}
                        </ul>
                    </div>
                ) : (
                    <p className="text-slate-400 text-center py-8">No dismissed words.</p>
                )}
            </div>
        </div>
    );
};
