import React, { useState, useEffect } from 'react';
import { useGatewayStore } from '../../stores/gateway';

// We'll use a dynamic import or a script-tag based fallback if the package isn't installed
// For now, let's create a placeholder that explains the integration
export const Whiteboard = ({ channelId }: { channelId: string }) => {
  const [elements, setElements] = useState<any[]>([]);
  const sendMessage = useGatewayStore((state) => state.sendMessage);

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <h2 className="text-lg font-semibold text-gray-800">Whiteboard: NEX-Design-System</h2>
        <div className="flex space-x-2">
          <button className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700">
            Save Snapshot
          </button>
          <button className="rounded bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300">
            Export PNG
          </button>
        </div>
      </div>
      
      {/* Excalidraw Container */}
      <div className="relative flex-grow bg-[#f8f9fa]">
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
          <div className="h-24 w-24 rounded-full bg-blue-100 p-6 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Excalidraw Live Canvas</h3>
          <p className="max-w-md text-center text-gray-500">
            Interactive whiteboarding is enabled for this channel. In production, the @excalidraw/excalidraw component renders here with full tool support.
          </p>
          <div className="grid grid-cols-3 gap-4 p-8 opacity-40 grayscale">
             <div className="h-32 w-32 rounded border-2 border-dashed border-gray-400"></div>
             <div className="h-32 w-32 rounded-full border-2 border-dashed border-gray-400"></div>
             <div className="h-32 w-32 rounded border-2 border-dashed border-gray-400 transform rotate-12"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
