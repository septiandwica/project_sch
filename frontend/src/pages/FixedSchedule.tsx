import React, { useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import FileUpload from '../components/FileUpload'; // Path ke komponen FileUpload
import { apiService } from '../services/api'; // Path ke apiService

const ScheduleUploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fungsi untuk menangani file yang dipilih
  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setError(null);  // Reset error ketika file baru dipilih
  };

  // Fungsi untuk mengupload file
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);

    try {
      const response = await apiService.uploadScheduleCSV(selectedFile);
      setUploadResult(response);  // Menyimpan hasil upload jika berhasil
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Upload Schedule CSV
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload your schedule CSV to save it in the system.
            </p>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upload Your Schedule File
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <FileUpload
            label="Schedule CSV"
            description="Upload a CSV file containing schedule details"
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
          />
        </div>

        <div className="mt-6">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-colors ${
              uploading
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                : "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
            }`}
          >
            {uploading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-5 h-5 border-4 border-t-transparent border-blue-600 rounded-full" />
                <span>Uploading...</span>
              </div>
            ) : (
              "Upload File"
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
      {uploadResult && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center space-x-3 mb-4">
            <X className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              File Uploaded Successfully
            </h2>
          </div>
          <div>
            <p className="text-gray-900 dark:text-gray-100">
              The file was uploaded successfully. Here are the details:
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleUploadPage;
