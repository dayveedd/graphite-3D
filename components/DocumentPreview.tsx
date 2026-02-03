import React from 'react';
import { FileText } from 'lucide-react';

interface DocumentPreviewProps {
    src: string;
    alt: string;
    className?: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ src, alt, className = '' }) => {
    const isPDF = src.startsWith('data:application/pdf');

    if (isPDF) {
        return (
            <div className={`${className} flex flex-col items-center justify-center bg-stone-100`}>
                <FileText className="w-16 h-16 text-amber-700 mb-3" />
                <p className="text-sm font-bold text-stone-700">PDF Document</p>
                <p className="text-xs text-stone-500 mt-1">Original Blueprint</p>
            </div>
        );
    }

    return <img src={src} alt={alt} className={className} />;
};
