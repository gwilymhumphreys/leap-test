'use client';

import { useState } from 'react';
import { Record } from '@/lib/schema';

interface RecordsListProps {
  records: Record[];
  setRecords: React.Dispatch<React.SetStateAction<Record[]>>;
}

interface EditingRecord {
  id: number;
  title: string;
  description: string;
}

export default function RecordsList({ records, setRecords }: RecordsListProps) {
  const [editingRecord, setEditingRecord] = useState<EditingRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const handleEditStart = (record: Record) => {
    setEditingRecord({
      id: record.id,
      title: record.title,
      description: record.description
    });
  };

  const handleEditCancel = () => {
    setEditingRecord(null);
  };

  const handleEditSave = async () => {
    if (!editingRecord) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/records/${editingRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editingRecord.title.trim(),
          description: editingRecord.description.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        alert(`Failed to update record: ${errorData.detail || 'Unknown error'}`);
        return;
      }

      const { record: updatedRecord } = await response.json();
      
      // Update the record in local state
      setRecords(prevRecords => 
        prevRecords.map(record => 
          record.id === updatedRecord.id ? updatedRecord : record
        )
      );
      
      setEditingRecord(null);
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update record. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (record: Record) => {
    if (!confirm(`Are you sure you want to delete the record "${record.title}"?`)) {
      return;
    }

    setIsDeleting(record.id);
    try {
      const response = await fetch(`/api/records/${record.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
        alert(`Failed to delete record: ${errorData.detail || 'Unknown error'}`);
        return;
      }

      // Remove the record from local state
      setRecords(prevRecords => 
        prevRecords.filter(r => r.id !== record.id)
      );
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete record. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  if (records.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2">No records yet</p>
          <p className="text-sm">Enter a prompt above to generate your first records</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record) => (
        <div 
          key={record.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          {editingRecord?.id === record.id ? (
            // Edit Mode
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title:
                </label>
                <input
                  type="text"
                  value={editingRecord.title}
                  onChange={(e) => setEditingRecord({ ...editingRecord, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={isUpdating}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description:
                </label>
                <textarea
                  value={editingRecord.description}
                  onChange={(e) => setEditingRecord({ ...editingRecord, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-vertical"
                  disabled={isUpdating}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleEditSave}
                  disabled={isUpdating || !editingRecord.title.trim() || !editingRecord.description.trim()}
                  className="flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
                <button
                  onClick={handleEditCancel}
                  disabled={isUpdating}
                  className="px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Display Mode
            <div>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {record.title}
                </h3>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEditStart(record)}
                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    title="Edit record"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(record)}
                    disabled={isDeleting === record.id}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 rounded disabled:opacity-50"
                    title="Delete record"
                  >
                    {isDeleting === record.id ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {record.description}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}