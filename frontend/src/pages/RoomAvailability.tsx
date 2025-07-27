import React, { useState } from "react";
import {
  DoorOpen,

} from "lucide-react";
import FileUpload from "../components/FileUpload";
import LoadingSpinner from "../components/LoadingSpinner";
// import { apiService, RoomAvailabilityResponse } from "../services/api";

const RoomAvailability: React.FC = () => {
  const [roomsFile, setRoomsFile] = useState<File | null>(null);
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any>(null); // Untuk menyimpan hasil prediksi
  const [csvDownloadLink, setCsvDownloadLink] = useState<string | null>(null); // Untuk menyimpan link unduhan CSV

  const handleSubmit = async () => {
    if (!roomsFile || !scheduleFile) {
      setError("Please select both required files");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("rooms_file", roomsFile);
      formData.append("schedule_file", scheduleFile);

      const response = await fetch("http://localhost:8787/api/room/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to process prediction");
      }

      const data = await response.json();

      // Menyimpan link unduhan CSV
      if (data.csv_generated) {
        const downloadUrl = `http://localhost:8787/api/download/empty_rooms_predictions.csv`;
        setCsvDownloadLink(downloadUrl);
      }

      // Menyimpan hasil prediksi untuk ditampilkan dalam tabel
      setResultData(data.empty_rooms);

    } catch (err: any) {
      setError(err.message || "An error occurred during prediction");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = roomsFile && scheduleFile && !loading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <DoorOpen className="w-8 h-8 text-green-600 dark:text-green-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Room Availability Prediction
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Predict and analyze room availability patterns using machine
              learning
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
            label="Rooms File"
            description="CSV file containing room information with 'Name' column"
            onFileSelect={setRoomsFile}
            selectedFile={roomsFile}
          />
          <FileUpload
            label="Schedule File"
            description="CSV file containing schedule data with 'Room' and 'Sched. Time' columns"
            onFileSelect={setScheduleFile}
            selectedFile={scheduleFile}
          />
        </div>
        <div className="mt-6">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-colors ${
              canSubmit
                ? "bg-green-600 hover:bg-green-700 text-white shadow-sm"
                : "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Processing...</span>
              </div>
            ) : (
              "Predict & Download CSV"
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

      {/* Result Table */}
      {resultData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Predicted Room Availability
          </h2>
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th className="py-2 px-4 text-left">Room</th>
                <th className="py-2 px-4 text-left">Scheduled Time</th>
                <th className="py-2 px-4 text-left">Availability</th>
              </tr>
            </thead>
            <tbody>
              {resultData.map((row: any, index: number) => (
                <tr key={index}>
                  <td className="py-2 px-4">{row.Room}</td>
                  <td className="py-2 px-4">{row.Session_Time}</td>
                  <td className="py-2 px-4">{row.Status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Download Link */}
      {csvDownloadLink && (
        <div className="mt-4">
          <a
            href={csvDownloadLink}
            className="text-blue-600 dark:text-blue-400 underline"
            download
          >
            Download the prediction results as CSV
          </a>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">
          File Requirements
        </h3>
        <ul className="text-sm text-green-800 dark:text-green-400 space-y-1">
          <li>
            • <strong>Rooms File:</strong> Must contain "Name" column with room
            identifiers
          </li>
          <li>
            • <strong>Schedule File:</strong> Must contain "Room" and "Sched.
            Time" columns
          </li>
          <li>
            • The system will predict which rooms are available during different
            time slots
          </li>
          <li>• Results will be downloaded as CSV for further analysis</li>
        </ul>
      </div>
    </div>
  );
};

export default RoomAvailability;
