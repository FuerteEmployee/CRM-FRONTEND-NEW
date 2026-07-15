import { apiClient } from "./apiClient";

export interface CreateCoursePayload {
  title: string;
  description?: string;
  category: string;
  contentType?: "video" | "PDF" | "slide_deck" | "article";
  fileUrl?: string;
  thumbnail?: string;
  videoUrl?: string;
  pdfUrl?: string;
  totalLessons: number;
  durationMins?: number;
  duration?: string;
  tags?: string[];
  difficultyLevel?: "Beginner" | "Intermediate" | "Advanced";
  isMandatory?: boolean;
  deadline?: string | null;
  status?: "Draft" | "Published" | "Archived";
  version?: string;
  userId?: string;
  userIds?: string[];
}

export interface CreateModulePayload {
  moduleTitle: string;
  moduleDescription?: string;
  passScore?: number | null;
  status?: "Draft" | "Published" | "Archived";
  trainingItems?: { courseId: string; order: number }[];
  userId?: string;
}

export interface CreateQuizPayload {
  questionText: string;
  options: string[];
  correctAnswer: string;
  marks?: number;
  linkedTo: string;
  linkedType?: "Course" | "TrainingModule";
}

export interface SubmitQuizPayload {
  courseId: string;
  answers: { questionId: string; selectedAnswer: string }[];
}

export const trainingService = {
  // Stats
  getStats: (userId?: string) =>
    apiClient.get("/training/stats", { params: { userId } }),

  // Courses / Training Content
  getCourses: (userId?: string) =>
    apiClient.get("/training/courses", { params: { userId } }),
  createCourse: (data: CreateCoursePayload, files?: Record<string, File | undefined>) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v == null) return;
      fd.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
    });
    if (files) {
      Object.entries(files).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
    }
    return apiClient.post("/training/courses", fd);
  },
  getCourse: (id: string) =>
    apiClient.get(`/training/courses/${id}`),
  updateCourse: (id: string, data: CreateCoursePayload, files?: Record<string, File | undefined>) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v == null) return;
      fd.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
    });
    if (files) {
      Object.entries(files).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
    }
    return apiClient.put(`/training/courses/${id}`, fd);
  },
  deleteCourse: (id: string) =>
    apiClient.delete(`/training/courses/${id}`),
  assignCourse: (id: string, staffIds: string[]) =>
    apiClient.post(`/training/courses/${id}/assign`, { staffIds }),
  getCourseAssignments: (id: string) =>
    apiClient.get(`/training/courses/${id}/assignments`),
  unassignStaff: (courseId: string, staffId: string) =>
    apiClient.delete(`/training/courses/${courseId}/assign/${staffId}`),
  updateProgress: (
    id: string,
    data: { completedLessons?: number; percentComplete?: number; timeSpentMins?: number; quizScore?: number; passed?: boolean }
  ) => apiClient.patch(`/training/courses/${id}/progress`, data),

  // SOPs
  getSOPs: (userId?: string) =>
    apiClient.get("/training/sops", { params: { userId } }),
  createSOP: (data: { title: string; version?: string; fileUrl?: string; userId?: string }) =>
    apiClient.post("/training/sops", data),
  deleteSOP: (id: string) =>
    apiClient.delete(`/training/sops/${id}`),

  // Training Modules
  getModules: (userId?: string) =>
    apiClient.get("/training/modules", { params: { userId } }),
  createModule: (data: CreateModulePayload) =>
    apiClient.post("/training/modules", data),
  deleteModule: (id: string) =>
    apiClient.delete(`/training/modules/${id}`),

  // Quizzes
  getQuizzes: (linkedTo: string) =>
    apiClient.get("/training/quizzes", { params: { linkedTo } }),
  createQuiz: (data: CreateQuizPayload) =>
    apiClient.post("/training/quizzes", data),
  deleteQuiz: (id: string) =>
    apiClient.delete(`/training/quizzes/${id}`),
  submitQuiz: (data: SubmitQuizPayload) =>
    apiClient.post("/training/quizzes/submit", data),
};
