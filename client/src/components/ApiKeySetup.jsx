import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

const PROVIDERS = [
    { id: 'Local Device', name: 'Local Device (Offline / Free)', placeholder: 'No API Key Required', link: '#' },
    { id: 'Google Cloud Vision', name: 'Google Cloud Vision', placeholder: 'Enter your Google Cloud API Key', link: 'https://cloud.google.com/vision/docs/setup' },
    { id: 'Google Gemini API', name: 'Google Gemini API', placeholder: 'Enter your Gemini API Key', link: 'https://ai.google.dev/' },
    { id: 'OpenRouter', name: 'OpenRouter (Free - Recommended)', placeholder: 'Enter your OpenRouter API Key', link: 'https://openrouter.ai/keys' },
    { id: 'Azure Computer Vision', name: 'Azure Computer Vision', placeholder: 'Enter your Azure API Key', link: 'https://azure.microsoft.com/en-us/services/cognitive-services/computer-vision/' },
    { id: 'Hugging Face', name: 'Hugging Face Inference API', placeholder: 'Enter your Hugging Face Access Token', link: 'https://huggingface.co/settings/tokens' }
];

const ApiKeySetup = ({ onSave }) => {
    const [keys, setKeys] = useState([{ id: 1, provider: 'Local Device', key: 'LOCAL_MODE', visible: false }]);
    const [error, setError] = useState('');

    useEffect(() => {
        const savedKeys = sessionStorage.getItem('apiKeys');
        if (savedKeys) {
            setKeys(JSON.parse(savedKeys));
        }
    }, []);

    const addKey = () => {
        if (keys.length >= 5) return;
        setKeys([...keys, { id: Date.now(), provider: 'Google Cloud Vision', key: '', visible: false }]);
    };

    const removeKey = (id) => {
        if (keys.length <= 1) {
            setError("You must have at least one API key.");
            return;
        }
        setKeys(keys.filter(k => k.id !== id));
        setError('');
    };

    const updateKey = (id, field, value) => {
        setKeys(keys.map(k => {
            if (k.id === id) {
                const updated = { ...k, [field]: value };
                // Auto-fill dummy key for Local Device
                if (field === 'provider' && value === 'Local Device') {
                    updated.key = 'LOCAL_MODE';
                }
                return updated;
            }
            return k;
        }));
    };

    const toggleVisibility = (id) => {
        setKeys(keys.map(k => k.id === id ? { ...k, visible: !k.visible } : k));
    };

    const handleSave = () => {
        const validKeys = keys.filter(k => k.key && k.key.trim() !== '');
        if (validKeys.length === 0) {
            setError("Please enter at least one valid API key or select Local Device.");
            return;
        }

        // Save to session storage
        sessionStorage.setItem('apiKeys', JSON.stringify(validKeys));
        onSave(validKeys);
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">API Configuration</h2>
                <p className="text-gray-600 mt-2">Add your free tier API keys to get started. Keys are stored locally in your browser session.</p>
            </div>

            <div className="space-y-4">
                {keys.map((item, index) => (
                    <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 transition-all hover:shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm text-gray-700">API Key {index + 1}</span>
                            {keys.length > 1 && (
                                <button onClick={() => removeKey(item.id)} className="text-red-500 hover:text-red-700 p-1">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <select
                                    value={item.provider}
                                    onChange={(e) => updateKey(item.id, 'provider', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div className="md:col-span-2 relative">
                                <input
                                    type={item.visible ? "text" : "password"}
                                    value={item.key}
                                    onChange={(e) => updateKey(item.id, 'key', e.target.value)}
                                    placeholder={PROVIDERS.find(p => p.id === item.provider)?.placeholder || "Paste API Key here"}
                                    disabled={item.provider === 'Local Device'}
                                    className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none pr-10 ${item.provider === 'Local Device' ? 'bg-gray-100 text-gray-500' : ''}`}
                                />
                                {item.provider !== 'Local Device' && (
                                    <button
                                        onClick={() => toggleVisibility(item.id)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {item.visible ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* OpenRouter Instructions */}
                        {item.provider === 'OpenRouter' && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800">
                                <p className="font-semibold mb-1">OpenRouter is completely free! Get your API key in 30 seconds:</p>
                                <ol className="list-decimal list-inside space-y-1 ml-1">
                                    <li>Visit: <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline font-medium">openrouter.ai/keys</a></li>
                                    <li>Sign up (no credit card needed)</li>
                                    <li>Create a key and paste it above</li>
                                    <li>You get 200 free image analyses per day!</li>
                                </ol>
                            </div>
                        )}

                        {item.provider !== 'Local Device' && item.provider !== 'OpenRouter' && (
                            <div className="mt-2 text-xs text-right">
                                <a href={PROVIDERS.find(p => p.id === item.provider)?.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                    Get API Key
                                </a>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
                    <AlertCircle size={20} className="mr-2" />
                    {error}
                </div>
            )}

            <div className="mt-6 flex justify-between items-center">
                <button
                    onClick={addKey}
                    disabled={keys.length >= 5}
                    className={`flex items-center px-4 py-2 rounded-md border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 ${keys.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Plus size={18} className="mr-2" />
                    Add Another Key
                </button>

                <button
                    onClick={handleSave}
                    className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-md"
                >
                    <Save size={18} className="mr-2" />
                    Save & Continue
                </button>
            </div>
        </div>
    );
};

export default ApiKeySetup;
