import React, { useState } from "react";
import { AlertTriangle, Download, Target } from "lucide-react";
import FileUpload from "../components/FileUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import { apiService, ConflictPredictionResponse } from "../services/api";

const ConflictPrediction: React.FC = () => {
  const [trainFile, setTrainFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConflictPredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeader, setCsvHeader] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (!trainFile) {
      setError("Please select a training file");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCsvData([]);
    setCsvHeader([]);

    try {
      const response = await apiService.conflictPrediction(trainFile);
      setResult(response);
      // Fetch and parse the CSV file
      if (response.conflict_file) {
        const blob = await apiService.downloadFile(response.conflict_file);
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
        err.response?.data?.error || "An error occurred during Prediction"
      );
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

  const canSubmit = trainFile && !loading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Conflict Prediction
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Detect and prevent scheduling conflicts in your schedule data
            </p>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upload Schedule Data
        </h2>

        <div className="max-w-md">
          <FileUpload
            label="Schedule File"
            description="CSV file containing schedule data with Room and Sched. Time columns"
            onFileSelect={setTrainFile}
            selectedFile={trainFile}
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
                <span>Predicting...</span>
              </div>
            ) : (
              "Predict"
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
          {/* Model Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Performance
              </h3>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  Finish Predicting
                </div>
                <div className="text-sm text-green-800 dark:text-green-300 mt-1">
                  Status
                </div>
              </div>
            </div>
          </div>

          {/* Download & Table for Conflict Analysis CSV */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Conflict Analysis Result
            </h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Conflict Analysis CSV
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {result.conflict_file}
                </p>
              </div>
              <button
                onClick={() => downloadFile(result.conflict_file)}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
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
                          className="px-2 py-1 border-b font-bold bg-gray-100 dark:bg-gray-700 sticky top-0 z-10"
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
        </div>
      )}

      {/* Instructions */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
        <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-2">
          Requirements
        </h3>
        <ul className="text-sm text-orange-800 dark:text-orange-400 space-y-1">
          <li>
            • <strong> File:</strong> Must contain "Room" and "Sched.
            Time" columns
          </li>
          <li>
            • The model will automatically detect conflicts in your schedule
            data
          </li>
          <li>
            • Higher accuracy indicates better conflict detection capability
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ConflictPrediction;
