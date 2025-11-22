import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, Settings, BarChart3 } from 'lucide-react';
import ApiKeySetup from './components/ApiKeySetup';
import ImageUploader from './components/ImageUploader';
import ResultsGrid from './components/ResultsGrid';

import { classifyImage } from './services/localVisionService';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [results, setResults] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState({ processed: 0, activeKeys: 0 });

  useEffect(() => {
    const savedKeys = sessionStorage.getItem('apiKeys');
    if (savedKeys) {
      const parsed = JSON.parse(savedKeys);
      setApiKeys(parsed);
      setStats(prev => ({ ...prev, activeKeys: parsed.length }));
    } else {
      setShowSettings(true);
    }
  }, []);

  const handleSaveKeys = (keys) => {
    setApiKeys(keys);
    setStats(prev => ({ ...prev, activeKeys: keys.length }));
    setShowSettings(false);
  };

  const handleUpload = async (files) => {
    const validKeys = apiKeys.filter(k => k.key && k.key.trim() !== '');
    if (validKeys.length === 0) {
      alert("⚠️ No API keys configured. Please click the settings icon and add at least 1 API key to start categorizing images.");
      setShowSettings(true);
      return;
    }

    setIsUploading(true);
    const newResults = [];

    // Process files sequentially or in small batches to avoid overwhelming the browser/network
    // For simplicity, we'll do one by one here, but could be parallelized.
    for (const file of files) {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('apiKeys', JSON.stringify(apiKeys));

      try {
        // Create a local preview URL
        const previewUrl = URL.createObjectURL(file);

        // Check if we are using Local Device mode
        const localKey = validKeys.find(k => k.provider === 'Local Device');

        if (localKey) {
          console.log("Using Local Device mode for", file.name);
          // Create an image element for TensorFlow.js
          const img = new Image();
          img.src = previewUrl;
          await new Promise(resolve => img.onload = resolve);

          const localResult = await classifyImage(img);

          newResults.push({
            filename: file.name,
            ...localResult,
            previewUrl: previewUrl
          });

        } else {
          // Use Backend API
          const response = await axios.post('http://localhost:5000/api/categorize', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

          newResults.push({
            ...response.data,
            previewUrl: previewUrl
          });
        }

        // Update stats
        setStats(prev => ({ ...prev, processed: prev.processed + 1 }));

      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        // Add error entry
        newResults.push({
          filename: file.name,
          category: 'Error',
          confidence: 0,
          provider: 'Failed',
          reasoning: error.message || "Unknown error occurred",
          previewUrl: URL.createObjectURL(file) // Still show the image
        });
      }
    }

    setResults(prev => [...newResults, ...prev]);
    setIsUploading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Layers className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Adobe Stock Auto-Categorizer</h1>
          </div>

          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <BarChart3 size={16} className="mr-2 text-blue-500" />
                <span>Processed Today: <span className="font-semibold text-gray-700">{stats.processed}</span></span>
              </div>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${stats.activeKeys > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Active Keys: <span className="font-semibold text-gray-700">{stats.activeKeys}/5</span></span>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
              title="API Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showSettings ? (
          <div className="animate-fade-in">
            <ApiKeySetup onSave={handleSaveKeys} />
          </div>
        ) : (
          <div className="space-y-12 animate-fade-in">
            {/* Hero / Upload Section */}
            <div className="text-center space-y-4 mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Categorize your stock photos <span className="text-blue-600">instantly</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Upload your images and let our AI analyze them against Adobe Stock's official categories.
                100% free using your own API keys.
              </p>
            </div>

            <ImageUploader onUpload={handleUpload} isUploading={isUploading} />

            {/* Results Section */}
            {isUploading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent"></div>
                <p className="mt-4 text-gray-600">Analyzing images...</p>
              </div>
            )}

            <ResultsGrid results={results} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
