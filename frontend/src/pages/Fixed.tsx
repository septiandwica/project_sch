import React, { useState } from "react";
import { AlertTriangle, Download, Target } from "lucide-react";
import FileUpload from "../components/FileUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import { apiService, FixedConflictResponse } from "../services/api";

const ConflictResolution: React.FC = () => {
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [roomFile, setRoomFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FixedConflictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!scheduleFile || !roomFile) {
      setError("Please select both schedule and room files");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.resolveConflict(scheduleFile, roomFile);

      // Log to verify the response structure
      console.log("Resolve Conflict Response:", response);

      // Check if the conflicts data exists and is in the correct format
      if (response && Array.isArray(response.conflicts)) {
        setResult(response);
      } else {
        setError("Unexpected response structure");
      }
    } catch (err: any) {
      setError("Error resolving conflicts: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (filename: string) => {
    try {
      const blob = await apiService.downloadFile(filename);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError("Failed to download file");
    }
  };

  const canSubmit = scheduleFile && roomFile && !loading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Conflict Resolution
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Resolve and prevent scheduling conflicts in your schedule data
            </p>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upload Schedule and Room Data
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileUpload
            label="Schedule File"
            description="CSV file containing schedule data with Room and Sched. Time columns"
            onFileSelect={setScheduleFile}
            selectedFile={scheduleFile}
          />
          <FileUpload
            label="Room File"
            description="CSV file containing room availability data"
            onFileSelect={setRoomFile}
            selectedFile={roomFile}
          />
        </div>

        <div className="mt-6">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-colors ${
              canSubmit
                ? "bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                : "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Resolving...</span>
              </div>
            ) : (
              "Resolve Conflicts"
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Resolution Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Resolution Status
              </h3>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  Resolution Completed
                </div>
                <div className="text-sm text-green-800 dark:text-green-300 mt-1">
                  Conflict resolution was successfully completed
                </div>
              </div>
            </div>
          </div>

          {/* Download & Table for Conflict Resolution CSV */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Resolution Result
            </h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Resolution CSV
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {result.resolved_schedule}
                </p>
              </div>
              <button
                onClick={() => downloadFile(result.resolved_schedule)}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>

            {/* Displaying the Result Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr>
                  <th className="px-4 py-2 text-left">Subject</th>
                    <th className="px-4 py-2 text-left">Room</th>
                    <th className="px-4 py-2 text-left">Sched. Time</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Check if conflicts are available and map over them */}
                  {(result.conflicts && result.conflicts.length > 0) ? (
                    result.conflicts.map((conflict, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">{conflict.Subject}</td>
                        <td className="px-4 py-2">{conflict.Room}</td>
                        <td className="px-4 py-2">{conflict["Sched. Time"]}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-center text-gray-500">
                        No conflicts found or resolved.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictResolution;
