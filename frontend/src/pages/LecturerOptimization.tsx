import React, { useState } from "react";
import { User, CheckCircle } from "lucide-react";
import FileUpload from "../components/FileUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import { apiService } from "../services/api";

const LecturerOptimization: React.FC = () => {
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [lecturerFile, setLecturerFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvHeader, setCsvHeader] = useState<string[]>([]);
  const [csvFilename, setCsvFilename] = useState<string | null>(null);
  const [csvTableData, setCsvTableData] = useState<string[][]>([]);
  const [csvTableHeader, setCsvTableHeader] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (!scheduleFile || !lecturerFile) {
      setError("Please select both required files");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setMessage(null);
    setCsvHeader([]);
    setCsvFilename(null);
    setCsvTableData([]);
    setCsvTableHeader([]);

    try {
      const response = await apiService.lecturerOptimization(
        scheduleFile,
        lecturerFile
      );
      setMessage(response.message);
      setResult(response.assigned_schedule);
      setCsvFilename(response.csv_filename);
      if (response.assigned_schedule && response.assigned_schedule.length > 0) {
        setCsvHeader(Object.keys(response.assigned_schedule[0]));
      }
      // Fetch and parse the CSV file for table display
      if (response.csv_filename) {
        const blob = await apiService.downloadFile(response.csv_filename);
        const text = await blob.text();
        const rows = text.split(/\r?\n/).filter(Boolean);
        if (rows.length > 0) {
          const header = rows[0].split(',');
          const data = rows.slice(1).map(row => row.split(','));
          setCsvTableHeader(header);
          setCsvTableData(data);
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
    if (csvFilename) {
      try {
        const blob = await apiService.downloadFile(csvFilename);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = csvFilename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        setError('Failed to download file');
      }
    }
  };

  const canSubmit = scheduleFile && lecturerFile && !loading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Lecturer Optimization
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Assign lecturers to classes based on preferences and constraints
            </p>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upload Required Files
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileUpload
            label="Schedule File"
            description="CSV file containing schedule data"
            onFileSelect={setScheduleFile}
            selectedFile={scheduleFile}
          />
          <FileUpload
            label="Lecturer File"
            description="CSV file containing lecturer data"
            onFileSelect={setLecturerFile}
            selectedFile={lecturerFile}
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
              "Assign Lecturers"
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
      {message && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {message}
            </h2>
          </div>
        </div>
      )}
      {csvFilename && (
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generated file: <span className="font-mono">{csvFilename}</span>
            </p>
          </div>
          <button
            onClick={downloadFile}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <span>Download</span>
          </button>
        </div>
      )}
      {csvTableHeader.length > 0 && (
        <div className="overflow-auto max-h-96">
          <table className="min-w-full text-xs text-left">
            <thead>
              <tr>
                {csvTableHeader.map((col, idx) => (
                  <th key={idx} className="px-2 py-1 border-b font-bold bg-gray-100 dark:bg-gray-700">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvTableData.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1 border-b">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
          File Requirements
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>
            • <strong>Schedule File:</strong> Must contain columns: Program
            Session, Major, Class, Subject, Room, Sched. Time
          </li>
          <li>
            • <strong>Lecturer File:</strong> Must contain columns: Lecturer
            Name, Lec. Type, Job, Current Work Days, Time Preference, Day
            Preference, Room Preference, Notes
          </li>
          <li>• All files must be in CSV format</li>
        </ul>
      </div>
    </div>
  );
};

export default LecturerOptimization;
