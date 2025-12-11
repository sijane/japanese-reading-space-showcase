import React, { useState, useRef, useEffect } from 'react';

interface AnalyzerProps {
    inputText: string;
    setInputText: (text: string) => void;
    imageFile: File | null;
    setImageFile: (file: File | null) => void;
    onAnalyze: () => void;
    onClear: () => void;
    isLoading: boolean;
}

const LoadingSpinner = () => (
    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const ImageDropzone: React.FC<{ onFile: (file: File) => void; file: File | null; title: string; prompt: string }> = ({ onFile, file, title, prompt }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [file]);

    const handleFile = (selectedFile: File) => {
        if (selectedFile && selectedFile.type.startsWith('image/')) {
            onFile(selectedFile);
        } else {
            console.error("Please upload an image file.");
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    };
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleFile(e.target.files[0]);
    };
    
    return (
        <div 
            className={`relative w-full p-4 rounded-lg border-2 border-dashed transition-all duration-200 ${isDragging ? 'border-indigo-500 bg-slate-800' : 'border-slate-600 bg-slate-900'}`}
            onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileInputChange} />
             {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="max-h-32 mx-auto object-contain rounded-md" />
            ) : (
                <div className="text-center text-slate-400">
                    <p className="font-semibold text-slate-300">{title}</p>
                    <p className="text-sm">{prompt}</p>
                </div>
            )}
        </div>
    );
}


export const Analyzer: React.FC<AnalyzerProps> = ({ inputText, setInputText, imageFile, setImageFile, onAnalyze, onClear, isLoading }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setInputText('');
            setImageFile(file);
        }
    };
    
    return (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 shadow-lg space-y-4">
             {imageFile ? (
                <ImageDropzone 
                    file={imageFile} 
                    onFile={(file) => {
                        setInputText('');
                        setImageFile(file);
                    }} 
                    title="Japanese Image"
                    prompt="Click or drag to replace"
                />
            ) : (
                <div 
                    className="relative"
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <textarea
                        value={inputText}
                        onChange={(e) => {
                            if (imageFile) setImageFile(null);
                            setInputText(e.target.value);
                        }}
                        placeholder="Paste text here, or drag & drop a Japanese image to analyze"
                        className={`w-full h-48 p-4 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y text-lg leading-relaxed text-slate-200 placeholder-slate-500 transition-opacity ${isDragging ? 'opacity-30' : 'opacity-100'}`}
                        disabled={isLoading}
                    />
                    {isDragging && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-indigo-500 bg-slate-800/50 rounded-md pointer-events-none">
                            <UploadIcon />
                            <p className="mt-2 text-lg font-semibold text-indigo-300">Drop image to analyze</p>
                        </div>
                    )}
                     <label title="Upload Image" className="absolute bottom-4 left-4 flex items-center gap-2 p-2 bg-slate-700 text-slate-300 font-semibold rounded-full hover:bg-slate-600 disabled:opacity-50 cursor-pointer">
                        <UploadIcon />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                            if (e.target.files?.[0]) {
                                setInputText('');
                                setImageFile(e.target.files[0]);
                            }
                        }}/>
                     </label>
                </div>
            )}
            
            <div className="flex justify-end gap-4">
                 <button
                    onClick={onClear}
                    disabled={isLoading || (!inputText.trim() && !imageFile)}
                    title="Clear"
                    className="flex items-center justify-center p-3 bg-slate-700 text-slate-300 font-semibold rounded-md hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500"
                >
                    <TrashIcon />
                </button>
                <button
                    onClick={onAnalyze}
                    disabled={isLoading || (!inputText.trim() && !imageFile)}
                    title={isLoading ? 'Analyzing...' : (imageFile ? 'Analyze Image(s)' : 'Analyze Text')}
                    className="flex items-center justify-center w-12 h-12 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
                >
                    {isLoading ? <LoadingSpinner /> : <EyeIcon />}
                </button>
            </div>
        </div>
    );
};