import React, { useState } from "react";
import { Calendar, Download, CheckCircle } from "lucide-react";
import FileUpload from "../components/FileUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import { apiService, ScheduleOptimizationResponse } from "../services/api";

const ScheduleOptimization: React.FC = () => {
  const [roomsFile, setRoomsFile] = useState<File | null>(null);
  const [schedFile, setSchedFile] = useState<File | null>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScheduleOptimizationResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeader, setCsvHeader] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (!roomsFile || !schedFile || !dataFile) {
      setError("Please select all required files");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCsvData([]);
    setCsvHeader([]);

    try {
      const response = await apiService.scheduleOptimization(
        roomsFile,
        schedFile,
        dataFile
      );
      setResult(response);
      // Fetch and parse the CSV file
      if (response.file) {
        const blob = await apiService.downloadFile(response.file);
        const text = await blob.text();
        const rows = text.split(/\r?\n/).filter(Boolean);
        if (rows.length > 0) {
          const header = rows[0].split(",");
          const data = rows.slice(1).map((row) => row.split(","));
          setCsvHeader(header);
          setCsvData(data);
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || "An error occurred during processing"
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    if (result?.file) {
      try {
        const blob = await apiService.downloadFile(result.file);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.file;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        setError("Failed to download file");
      }
    }
  };

  const canSubmit = roomsFile && schedFile && dataFile && !loading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Schedule Optimization
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Optimize room assignments and scheduling for maximum efficiency
            </p>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upload Required Files
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FileUpload
            label="Rooms File"
            description="CSV file containing room information"
            onFileSelect={setRoomsFile}
            selectedFile={roomsFile}
          />

          <FileUpload
            label="Schedule File"
            description="CSV file containing schedule data"
            onFileSelect={setSchedFile}
            selectedFile={schedFile}
          />

          <FileUpload
            label="Data File"
            description="CSV file containing student/course data"
            onFileSelect={setDataFile}
            selectedFile={dataFile}
          />
        </div>

        <div className="mt-6">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-colors ${
              canSubmit
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                : "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Processing...</span>
              </div>
            ) : (
              "Optimize Schedule"
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
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Optimization Complete
            </h2>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <p className="text-green-700 dark:text-green-400">
              {result.message}
            </p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generated file: <span className="font-mono">{result.file}</span>
              </p>
            </div>

            <button
              onClick={downloadFile}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>

          {/* Table Display */}
          {csvHeader.length > 0 && (
            <div className="overflow-auto max-h-96">
              <table className="min-w-full text-xs text-left">
                <thead>
                  <tr>
                    {csvHeader.map((col, idx) => (
                      <th
                        key={idx}
                        className="px-2 py-1 border-b font-bold bg-gray-100 dark:bg-gray-700"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-2 py-1 border-b">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
          File Requirements
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>
            • <strong>Rooms File:</strong> Must contain "Name" and "Notes"
            columns
          </li>
          <li>
            • <strong>Schedule File:</strong> Must contain "Day" and "Session"
            columns
          </li>
          <li>
            • <strong>Data File:</strong> Must contain "Major" column for room
            assignment logic
          </li>
          <li>• All files must be in CSV format</li>
        </ul>
      </div>
    </div>
  );
};

export default ScheduleOptimization;
