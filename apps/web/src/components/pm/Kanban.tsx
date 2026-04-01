import React, { useState } from 'react';
import { Plus, MoreHorizontal, User } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high';
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export const Kanban = ({ channelId }: { channelId: string }) => {
  const [columns, setColumns] = useState<Column[]>([
    {
      id: 'todo',
      title: 'To Do',
      tasks: [
        { id: '1', title: 'Implement E2EE middleware', priority: 'high', assignee: 'atreyakamat' },
        { id: '2', title: 'Design mobile navigation', priority: 'medium' },
      ]
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      tasks: [
        { id: '3', title: 'Meilisearch indexing optimization', priority: 'high', assignee: 'nexus-bot' },
      ]
    },
    {
      id: 'done',
      title: 'Done',
      tasks: [
        { id: '4', title: 'Rebrand TeamCord to Nexus', priority: 'high', assignee: 'ai-agent' },
      ]
    }
  ]);

  return (
    <div className="flex h-full w-full flex-col bg-[#f3f4f6]">
      <div className="flex items-center justify-between bg-white px-6 py-3 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800">Project Board: Product Launch</h2>
        <div className="flex items-center space-x-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-xs text-white font-bold">
                U{i}
              </div>
            ))}
          </div>
          <button className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={18} className="mr-1" /> Add Task
          </button>
        </div>
      </div>

      <div className="flex flex-grow space-x-6 overflow-x-auto p-6">
        {columns.map(column => (
          <div key={column.id} className="flex w-80 flex-shrink-0 flex-col rounded-lg bg-gray-200/50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider">{column.title} ({column.tasks.length})</h3>
              <MoreHorizontal size={18} className="text-gray-500 cursor-pointer" />
            </div>
            
            <div className="flex-grow space-y-3 overflow-y-auto">
              {column.tasks.map(task => (
                <div key={task.id} className="rounded-md bg-white p-4 shadow-sm border border-gray-200 hover:border-blue-400 cursor-pointer transition-colors group">
                  <div className="mb-2 flex justify-between items-start">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      task.priority === 'high' ? 'bg-red-100 text-red-600' : 
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{task.title}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center text-gray-400">
                      <User size={14} className="mr-1" />
                      <span className="text-xs">{task.assignee || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>
              ))}
              <button className="flex w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                <Plus size={16} className="mr-1" /> Add Card
              </button>
            </div>
          </div>
        ))}
        
        <button className="flex w-80 flex-shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-transparent p-4 text-gray-500 hover:bg-white/50 transition-colors">
          <Plus size={24} className="mb-2" />
          <span className="font-medium">Add Column</span>
        </button>
      </div>
    </div>
  );
};
