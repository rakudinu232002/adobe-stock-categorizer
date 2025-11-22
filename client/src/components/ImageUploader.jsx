import React, { useState, useRef } from 'react';
import { Upload, X, FileImage, AlertCircle } from 'lucide-react';

const ImageUploader = ({ onUpload, isUploading }) => {
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef(null);
    const [error, setError] = useState('');

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const validateFile = (file) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
        if (!validTypes.includes(file.type)) {
            return "Invalid file type. Only JPG, PNG, GIF, WEBP, BMP, TIFF allowed.";
        }
        if (file.size > 100 * 1024 * 1024) { // 100MB
            return "File too large. Max 100MB.";
        }
        return null;
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        setError('');

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = (files) => {
        const validFiles = [];
        let hasError = false;

        Array.from(files).forEach(file => {
            const err = validateFile(file);
            if (err) {
                setError(err);
                hasError = true;
            } else {
                validFiles.push(file);
            }
        });

        if (validFiles.length > 0) {
            onUpload(validFiles);
        }
    };

    const triggerUpload = (e) => {
        // Prevent default only if it's not the input itself (to avoid infinite loop if input was clicked directly, though it's hidden)
        // But here we are triggering it programmatically.
        e.preventDefault();
        e.stopPropagation();

        if (inputRef.current) {
            inputRef.current.click();
        }
    };

    // Handle input change separately to ensure we don't block it
    const onInputChange = (e) => {
        e.stopPropagation(); // Stop bubbling up to the container click
        handleChange(e);
    };

    return (
        <div className="w-full max-w-4xl mx-auto mb-8">
            <div
                className={`relative p-10 border-2 border-dashed rounded-xl text-center transition-all duration-200 ease-in-out cursor-pointer
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={triggerUpload}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only" // Use tailwind sr-only or custom style
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '1px',
                        height: '1px',
                        padding: 0,
                        margin: '-1px',
                        overflow: 'hidden',
                        clip: 'rect(0, 0, 0, 0)',
                        whiteSpace: 'nowrap',
                        border: 0
                    }}
                    onChange={onInputChange}
                    onClick={(e) => e.stopPropagation()} // Prevent triggering parent onClick when input is clicked (if it were visible)
                />

                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-white rounded-full shadow-sm">
                        <Upload size={32} className="text-blue-600" />
                    </div>

                    <div>
                        <p className="text-xl font-semibold text-gray-700">
                            Drag & Drop images here
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            or <button type="button" onClick={triggerUpload} className="text-blue-600 hover:underline font-medium relative z-10">browse files</button> to upload
                        </p>
                        <p className="text-xs text-green-600 font-medium mt-2">
                            ✓ Multiple files supported - Select as many as you want!
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400 mt-4">
                        <span className="px-2 py-1 bg-white rounded border">JPG</span>
                        <span className="px-2 py-1 bg-white rounded border">PNG</span>
                        <span className="px-2 py-1 bg-white rounded border">WEBP</span>
                        <span className="px-2 py-1 bg-white rounded border">TIFF</span>
                        <span className="px-2 py-1 bg-white rounded border">Max 100MB</span>
                    </div>
                </div>

                {dragActive && (
                    <div className="absolute inset-0 w-full h-full bg-blue-50/50 backdrop-blur-sm rounded-xl flex items-center justify-center z-10 pointer-events-none">
                        <p className="text-2xl font-bold text-blue-600">Drop files to upload</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-2 p-3 bg-red-50 text-red-600 rounded-lg flex items-center text-sm animate-fade-in">
                    <AlertCircle size={16} className="mr-2" />
                    {error}
                </div>
            )}
        </div>
    );
};

export default ImageUploader;
