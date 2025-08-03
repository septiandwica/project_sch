import axios from "axios";

const API_BASE_URL = "http://localhost:8787/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// // Define the headers that should be used for every request
// const getAuthHeaders = () => {
//   const token = localStorage.getItem('access_token');
//   if (!token) {
//     throw new Error('User not authenticated');
//   }
//   return {
//     Authorization: `Bearer ${token}`,
//   };
// };

// Definisi interface yang belum ada
export interface FixedConflictResponse {
  message: string;
  resolved_schedule: string;
  conflicts?: {
    Class: string;
    Cr: number;
    Curriculum: string;
    "Lecturer": string;
    Major: string;
    "Program Session": string;
    Room: string;
    "Sched. Time": string;
    Subject: string;
  }[];
}
interface ScheduleRow {
  "Program Session": string;
  Major: string;
  Curriculum: string;
  Class: string;
  Subject: string;
  Cr: number;
  Room: string;
  "Sched. Time": string;
  Lecturer: string;
}

export interface ScheduleOptimizationResponse {
  message: string;
  file: string;
}

export interface ConflictPredictionResponse {
  message: string;
  accuracy: number;
  model_file: string;
  conflict_file: string;
}

export interface RoomAvailabilityResponse {
  success: boolean;
  message: string;
  model_accuracy: number;
  statistics: {
    total_rooms: number;
    total_sessions: number;
    total_combinations: number;
    total_empty_slots: number;
    empty_percentage: number;
  };
  empty_rooms: Array<{
    Room: string;
    Session_Time: string;
    Status: string;
  }>;
  csv_generated: boolean;
}

export const apiService = {
  // Schedule Optimization
  scheduleOptimization: async (
    roomsFile: File,
    schedFile: File,
    dataFile: File
  ): Promise<ScheduleOptimizationResponse> => {
    const formData = new FormData();
    formData.append("rooms_file", roomsFile);
    formData.append("sched_file", schedFile);
    formData.append("data_file", dataFile);

    const response = await api.post("/schedule/optimize", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        // ...getAuthHeaders(), // Add Authorization header here
      },
    });
    return response.data;
  },

  // Conflict Prediction
  conflictPrediction: async (
    trainFile: File
  ): Promise<ConflictPredictionResponse> => {
    const formData = new FormData();
    formData.append("train_file", trainFile);

    const response = await api.post("/conflict/predict", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        // ...getAuthHeaders(),
      },
    });
    return response.data;
  },

  // Room Availability
  roomAvailability: async (
    roomsFile: File,
    scheduleFile: File
  ): Promise<RoomAvailabilityResponse> => {
    const formData = new FormData();
    formData.append("rooms_file", roomsFile);
    formData.append("schedule_file", scheduleFile);

    const response = await api.post("/room/predict", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        // ...getAuthHeaders(),
      },
    });
    return response.data;
  },

  // Download file
  downloadFile: async (filename: string): Promise<Blob> => {
    const response = await api.get(`/download/${filename}`, {
      headers: {
        // ...getAuthHeaders(),
      },
      responseType: "blob",
    });
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get("/health", {
      headers: {
        // ...getAuthHeaders(),
      },
    });
    return response.data;
  },

  // Lecturer Optimization
  lecturerOptimization: async (
    scheduleFile: File,
    lecturerFile: File
  ): Promise<{
    success: boolean;
    message: string;
    assigned_schedule: any[];
    csv_filename: string;
  }> => {
    const formData = new FormData();
    formData.append("schedule_file", scheduleFile);
    formData.append("lecturer_file", lecturerFile);

    const response = await api.post("/schedule/lecturer", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        // ...getAuthHeaders(),
      },
    });
    return response.data;
  },

  // Resolve Conflict
  resolveConflict: async (
    scheduleFile: File,
    roomFile: File
  ): Promise<FixedConflictResponse> => {
    const formData = new FormData();
    formData.append("schedule_file", scheduleFile);
    formData.append("room_file", roomFile);

    try {
      const response = await api.post("/conflict/resolve", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          // ...getAuthHeaders(),
        },
      });

      // Log the complete response data for debugging
      console.log("API Response:", response.data);

      // Ensure the response contains the expected properties
      if (
        response.data &&
        response.data.message &&
        response.data.resolved_schedule &&
        Array.isArray(response.data.conflicts)
      ) {
        return response.data; // Return the API data if it matches the expected format
      } else {
        console.error("Unexpected response structure", response.data);
        throw new Error("Unexpected response structure");
      }
    } catch (err: any) {
      console.error("Error resolving conflicts:", err);
      throw new Error(err.response?.data?.error || "Failed to resolve conflicts");
    }
  },

  // Upload Schedule CSV
 // Upload Schedule CSV
uploadScheduleCSV: async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);  // File yang akan diupload

  try {
    // Membaca file CSV dan mengonversi nilai Cr menjadi integer
    const csvData = await file.text();
    const rows = csvData.split('\n').map(row => row.split(','));
    const processedRows = rows.map(row => {
      const scheduleRow = {
        "Program Session": row[0],
        Major: row[1],
        Curriculum: row[2],
        Class: row[3],
        Subject: row[4],
        Cr: parseInt(row[5], 10),  // Mengubah Cr menjadi integer
        Room: row[6],
        "Sched. Time": row[7],
        Lecturer: row[8],
      };
      return scheduleRow;
    });

    // Mengirim data ke API
    const response = await api.post("/schedule/save", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        // ...getAuthHeaders(),
      },
    });
    return response.data;  // Mengembalikan data respons dari API
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error uploading schedule CSV:", error.message);
      throw new Error(error.message || "Failed to upload CSV");
    } else {
      console.error("Unknown error occurred:", error);
      throw new Error("Unknown error occurred while uploading CSV");
    }
  }
},
 getSchedule: async (): Promise<any[]> => {
    const response = await api.get('/schedule/calendar');  // Update ke endpoint yang baru
    return response.data;  // Mengembalikan data jadwal
  },

};
