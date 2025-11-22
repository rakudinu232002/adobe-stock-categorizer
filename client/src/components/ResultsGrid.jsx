import React from 'react';
import { Download, Check, AlertTriangle, XCircle } from 'lucide-react';

const ResultsGrid = ({ results }) => {
    if (!results || results.length === 0) return null;

    const getConfidenceColor = (score) => {
        if (score >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
        if (score >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const getConfidenceIcon = (score) => {
        if (score >= 0.9) return <Check size={16} />;
        if (score >= 0.7) return <AlertTriangle size={16} />;
        return <XCircle size={16} />;
    };

    const downloadCSV = () => {
        const headers = ['Filename', 'Category', 'Confidence', 'Provider', 'Reasoning'];
        const csvContent = [
            headers.join(','),
            ...results.map(r => [
                `"${r.filename}"`,
                `"${r.category}"`,
                (r.confidence * 100).toFixed(2) + '%',
                `"${r.provider}"`,
                `"${r.reasoning || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `adobe_stock_categories_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto mt-12">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Categorization Results ({results.length})</h2>
                <button
                    onClick={downloadCSV}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
                >
                    <Download size={18} className="mr-2" />
                    Export CSV
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {results.map((item, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
                        <div className="h-48 bg-gray-100 relative overflow-hidden group">
                            <img
                                src={item.previewUrl || "https://placehold.co/400x300?text=Image"}
                                alt={item.filename}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                {item.provider}
                            </div>
                        </div>

                        <div className="p-4">
                            <h3 className="font-medium text-gray-900 truncate mb-1" title={item.filename}>
                                {item.filename}
                            </h3>

                            <div className="flex items-center justify-between mt-3">
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Category</p>
                                    <p className="text-lg font-bold text-blue-600">{item.category}</p>
                                </div>
                            </div>

                            <div className={`mt-3 flex items-center justify-between px-3 py-2 rounded-lg border ${getConfidenceColor(item.confidence)}`}>
                                <span className="text-sm font-medium flex items-center gap-2">
                                    {getConfidenceIcon(item.confidence)}
                                    Confidence
                                </span>
                                <span className="font-bold">{(item.confidence * 100).toFixed(1)}%</span>
                            </div>

                            {item.reasoning && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                                    <p className="font-semibold text-gray-700 mb-1">Reasoning:</p>
                                    <p className="text-gray-600 leading-snug text-xs">{item.reasoning}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResultsGrid;
