import React, { useState } from 'react';
import { type SavedDeck, type Word, type SentenceCard, isWord, isSentenceCard } from '../types';
import { WordCards } from './WordCards';
import { SentenceReview } from './SentenceReview';

interface DeckReviewProps {
  deck: SavedDeck;
  onClose: () => void;
  savedWordKeys: Set<string>;
  onSaveWord: (word: Word, isSaved: boolean) => void;
  onDismissWord: (key: string) => void;
  dismissedWords: Set<string>;
  lastDismissedWordKey: string | null;
  onUndoDismiss: () => void;
  onDeleteSentenceCard: (cardId: string) => void;
}

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const DeckReview: React.FC<DeckReviewProps> = ({
  deck,
  onClose,
  savedWordKeys,
  onSaveWord,
  onDismissWord,
  dismissedWords,
  lastDismissedWordKey,
  onUndoDismiss,
  onDeleteSentenceCard,
}) => {
  const isSentenceDeck = deck.cards.length > 0 && isSentenceCard(deck.cards[0]);

  const wordCards = deck.cards
    .filter(isWord)
    .filter(word => !dismissedWords.has(`${word.surface}|${word.reading}`));
  
  const sentenceCards = deck.cards.filter(isSentenceCard);

  return (
    <div id="deck-review-section" className="animate-fade-in space-y-8">
        <div className="relative bg-slate-800/50 rounded-lg p-6 border border-slate-700 shadow-lg">
             <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white"
                aria-label="Close review"
            >
                <CloseIcon />
            </button>

            {isSentenceDeck ? (
              <SentenceReview
                cards={sentenceCards}
                title={`Reviewing Deck: ${deck.name}`}
                onDeleteCard={onDeleteSentenceCard}
              />
            ) : (
              <WordCards
                  words={wordCards}
                  title={`Reviewing Deck: ${deck.name}`}
                  savedWordKeys={savedWordKeys}
                  onSaveWord={onSaveWord}
                  onDismissWord={onDismissWord}
              />
            )}
            
        </div>

        {lastDismissedWordKey && !isSentenceDeck && (
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