import { Upload, Camera } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface PhotoUploadProps {
    onImageSelect?: (base64: string | null) => void;
}

export function PhotoUpload({ onImageSelect }: PhotoUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setPreview(result);
                onImageSelect?.(result);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200 hover:border-primary/50 transition-colors">
            <div
                className={cn(
                    "w-32 h-32 rounded-full flex items-center justify-center cursor-pointer overflow-hidden relative shadow-sm transition-all hover:shadow-md",
                    preview ? "bg-white" : "bg-slate-100"
                )}
                onClick={() => inputRef.current?.click()}
            >
                {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <Camera className="h-10 w-10 text-slate-400" />
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Upload className="h-6 w-6 text-white" />
                </div>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-600">Upload Photo</p>
            <p className="text-xs text-slate-400">Click or drag image</p>
            <input
                type="file"
                ref={inputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
            />
        </div>
    );
}
