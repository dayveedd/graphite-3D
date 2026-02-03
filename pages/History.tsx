import React, { useEffect } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight } from 'lucide-react';
import { DocumentPreview } from '../components/DocumentPreview';

export const History = () => {
  const { models, loadModelsFromStorage } = useStore();

  useEffect(() => {
    loadModelsFromStorage();
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 pt-20 pb-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Scan History</h1>
        <p className="text-stone-600 mb-8">Locally stored engineering models.</p>

        {models.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-stone-300">
            <p className="text-stone-500 mb-4">No scans yet.</p>
            <Link to="/scan" className="text-amber-700 font-medium hover:underline">Create your first scan</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {models.map((model) => (
              <Link key={model.id} to={`/studio/${model.id}`} className="group bg-white rounded-xl border border-stone-300 overflow-hidden hover:shadow-lg hover:border-amber-700 transition-all">
                <div className="aspect-square bg-stone-100 relative overflow-hidden">
                  <DocumentPreview src={model.originalImage} alt={model.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-stone-900 truncate">{model.name}</h3>
                  <div className="flex items-center justify-between mt-2 text-xs text-stone-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(model.timestamp).toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-5px] group-hover:translate-x-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
