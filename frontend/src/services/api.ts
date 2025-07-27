import axios from 'axios';

const API_BASE_URL = 'http://localhost:8787/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

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
    formData.append('rooms_file', roomsFile);
    formData.append('sched_file', schedFile);
    formData.append('data_file', dataFile);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Conflict Prediction
  conflictPrediction: async (trainFile: File): Promise<ConflictPredictionResponse> => {
    const formData = new FormData();
    formData.append('train_file', trainFile);

    const response = await api.post('/conflict/train', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
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
    formData.append('rooms_file', roomsFile);
    formData.append('schedule_file', scheduleFile);

    const response = await api.post('/room/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Download file
  downloadFile: async (filename: string): Promise<Blob> => {
    const response = await api.get(`/download/${filename}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};