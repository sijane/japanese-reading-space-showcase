import React, { useState, useRef, useCallback, useEffect } from 'react';
import { type SentenceCard as SentenceCardType } from '../types';
import { generateSpeech } from '../services/geminiService';

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

interface SentenceCardProps {
    card: SentenceCardType;
    onDelete: (cardId: string) => void;
    onPlayAudio: () => void;
    isPlaying: boolean;
}

const FlippableSentenceCard: React.FC<SentenceCardProps> = ({ card, onDelete, onPlayAudio, isPlaying }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const flipTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        // Cleanup timeout on component unmount
        return () => {
            if (flipTimeoutRef.current) {
                clearTimeout(flipTimeoutRef.current);
            }
        };
    }, []);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this sentence?")) {
            onDelete(card.id);
        }
    };

    const handleFlip = () => {
        if (flipTimeoutRef.current) {
            clearTimeout(flipTimeoutRef.current);
            flipTimeoutRef.current = null;
        }

        const newFlippedState = !isFlipped;
        if (newFlippedState) { // Flipping to back
            onPlayAudio();
             flipTimeoutRef.current = window.setTimeout(() => {
                setIsFlipped(false);
            }, 4000); // Auto flip back after 4 seconds
        }
        setIsFlipped(newFlippedState);
    };

    return (
        <div className={`relative group [perspective:1000px] transition-all duration-300 ${isPlaying ? 'ring-2 ring-indigo-500 rounded-xl' : ''}`}>
            <button
                onClick={handleDelete}
                className="absolute top-2 left-2 z-20 flex items-center justify-center w-9 h-9 rounded-full text-slate-400 bg-slate-800/50 hover:bg-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Delete sentence"
                title="Delete sentence"
            >
                <TrashIcon />
            </button>
            <div
                onClick={handleFlip}
                className={`relative grid [grid-template-areas:'card'] rounded-xl shadow-xl transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
            >
                {/* Front */}
                <div className="[grid-area:card] flex flex-col items-center justify-center bg-slate-800 border-2 border-slate-600 text-slate-200 rounded-xl [backface-visibility:hidden] p-6 cursor-pointer text-center min-h-[10rem]">
                    <p className="text-3xl leading-relaxed">{card.japanese}</p>
                </div>
                
                {/* Back */}
                <div className="[grid-area:card] rounded-xl bg-slate-900 border-2 border-indigo-400 text-slate-200 [transform:rotateY(180deg)] [backface-visibility:hidden] p-6 flex flex-col justify-center items-center text-center cursor-pointer min-h-[10rem]">
                    <p className="text-3xl leading-relaxed">{card.chinese}</p>
                </div>
            </div>
        </div>
    );
};

interface SentenceReviewProps {
    cards: SentenceCardType[];
    title: string;
    onDeleteCard: (cardId: string) => void;
}

export const SentenceReview: React.FC<SentenceReviewProps> = ({ cards, title, onDeleteCard }) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [playingCardId, setPlayingCardId] = useState<string | null>(null);

    const playAudio = useCallback(async (text: string, cardId: string) => {
        if (currentSourceRef.current) {
            currentSourceRef.current.onended = null;
            currentSourceRef.current.stop();
            currentSourceRef.current = null;
        }

        if (playingCardId === cardId) {
            setPlayingCardId(null);
            return;
        }

        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioContext = audioContextRef.current;

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        setPlayingCardId(cardId);

        let audioBuffer: AudioBuffer | undefined = audioCacheRef.current.get(text);

        if (!audioBuffer) {
            try {
                audioBuffer = await generateSpeech(text, audioContext);
                audioCacheRef.current.set(text, audioBuffer);
            } catch (error) {
                console.error("Failed to generate speech:", error);
                setPlayingCardId(null);
                return;
            }
        }
        
        if (!audioBuffer) return;

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        currentSourceRef.current = source;
        
        source.onended = () => {
            if (currentSourceRef.current === source) {
                currentSourceRef.current = null;
                setPlayingCardId(null);
            }
        };
    }, [playingCardId]);
    
    if (!cards.length) {
        return (
            <div className="text-center">
                 <h2 className="text-2xl font-bold text-slate-100 mb-4">{title}</h2>
                 <p className="text-slate-400">This deck has no sentences.</p>
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-6">Reviewing Deck</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map(card => (
                    <FlippableSentenceCard 
                        key={card.id} 
                        card={card}
                        onDelete={onDeleteCard}
                        onPlayAudio={() => playAudio(card.japanese, card.id)}
                        isPlaying={playingCardId === card.id}
                    />
                ))}
            </div>
        </div>
    );
};