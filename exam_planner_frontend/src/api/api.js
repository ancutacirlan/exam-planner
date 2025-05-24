import BASE_URL from "./config";

// Helper comun pentru request-uri cu token
const fetchWithAuth = async (endpoint, { method, body, token, headers = {} } = {}) => {
  if (!method) {
    throw new Error("Method must be specified for the API call.");
  }

  const finalHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };
  
  if (!token) {
    throw new Error("Token de autentificare lipsă");
  }
  // ✅ Adaugă tokenul DOAR dacă există
  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: finalHeaders,
    credentials: "include", // Poate fi eliminat dacă nu folosești cookie-uri
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => null);
    const message = `Eroare ${res.status}: ${errorText || res.statusText}`;
    throw new Error(message);
  }

  return res.json().catch(() => ({}));
};

//
// Courses
//
export const fetchCourses = (token) =>
  fetchWithAuth("/courses", { method: "GET", token });

export const fetchCourseDetails = (id, token) =>
  fetchWithAuth(`/courses/${id}`, { method: "GET", token });

export const updateCourseDetails = (courseId, data, token) =>
  fetchWithAuth(`/courses/${courseId}`, { method: "PUT", body: data, token });

export const setExaminationMethod = (courseId, method, token) =>
  fetchWithAuth(`/courses/${courseId}/set-examination-method`, {
    method: "PUT",
    body: { examination_method: method },
    token,
  });

//
// Exams
//

export const fetchExams = (token) =>
  fetchWithAuth('/exam/all',{method:"GET", token})

//TO DO: exam/all - DONE
//TO DO: exam/by-status
//TO DO: exam/edit/{id} - impelmentat ( TO VERIFY )
export const editExam = (examId, examData, token) =>
  fetchWithAuth(`/exam/edit/${examId}`, { method: "PUT", body: examData, token });

export const getExamsForGroup = (token) =>
  fetchWithAuth("/exam/for/group", { method: "GET", token });

export const proposeExam = (data, token) =>
  fetchWithAuth("/exam/propose", { method: "POST", body: data, token });

export const reviewExamProposal = (data, token) =>
  fetchWithAuth("/exam/review", {method: "PUT",body: data,token });

export const getExamsByStatus = (token) =>    //ExameneInAsteptare
  fetchWithAuth("/exam/by-status",{method: "GET", token})

export const getExamDetails = (examId, token) =>
  fetchWithAuth(`/exam/${examId}`, { method: "GET", token });

export const updateExamDate = (examId, newDate, token) =>
  fetchWithAuth(`/exam/${examId}/update-date`, {
    method: "PATCH",
    body: { exam_date: newDate },
    token
  });

//
// Examination Periods
//
export const fetchExaminationPeriods = (token) =>
  fetchWithAuth("/settings/examination-periods", { method: "GET", token });

export const getExaminationPeriodById = (id, token) =>
  fetchWithAuth(`/settings/examination-periods/${id}`, { method: "GET", token });

export const addExaminationPeriod = (data, token) =>
  fetchWithAuth("/settings/examination-periods", { method: "POST", body: data, token });

export const updateExaminationPeriod = (id, data, token) =>
  fetchWithAuth(`/settings/examination-periods/${id}`, { method: "PUT", body: data, token });

export const deleteExaminationPeriod = (id, token) =>
  fetchWithAuth(`/settings/examination-periods/${id}`, { method: "DELETE", token });

//TO DO: settings/reset
export const handleDatabaseReset = (token) =>
  fetchWithAuth('/settings/reset', {method:"POST", token})

//
// Utilizatori
//
export const fetchProfessors = (token) =>
  fetchWithAuth("/users/professors", { method: "GET", token });

export const updateUserDetails = (userId, data, token) =>
  fetchWithAuth(`/users/${userId}`, { method: "PUT", body: data, token });

export const addSecretary = (token, secretatyData)=> 
  fetchWithAuth('/users/secretary', {method: "POST", body: secretatyData,token})

export const deleteProfessor = async (userId, token) =>
  fetchWithAuth(`/users/${userId}`, {method:"DELETE", token});


//
// Rooms
//
export const fetchRooms = async (token) => {
  try {
    const rooms = await fetchWithAuth("/rooms", { method: "GET", token });
    console.log(rooms);
    return rooms; // ✅ Returnează datele preluate
  } catch (error) {
    console.error("Eroare la obținerea camerelor:", error);
    throw error; // 🔁 Opțional: aruncă eroarea mai departe pentru a o prinde în componentă
  }
};

//
// Auth
//
export const logout = async () => {
  const token = localStorage.getItem("access_token");
  const response = await fetch(`${BASE_URL}/logout`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Logout eșuat: ${errorText}`);
  }
};

//------------------------
//
// Downloads
//
export const downloadPDF = async (token) => {
  const endpoint = "/download/exams-pdf";
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => null);
    const message = `Eroare ${res.status}: ${errorText || res.statusText}`;
    throw new Error(message);
  }

  return res; // Nu json — e fișier!
};

export const downloadExcel = async (token) => {
  const endpoint = "/download/exams-xlsx";
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => null);
    const message = `Eroare ${res.status}: ${errorText || res.statusText}`;
    throw new Error(message);
  }

  return res;
};

export const downloadUserTemplate = async (token) => {
  const endpoint = "/download/user-template";
  console.log("TRIMIT TOKENUL:", token); // <-- Adaugă asta


  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => null);
    const message = `Eroare ${res.status}: ${errorText || res.statusText}`;
    throw new Error(message);
  }

  return res;
};

//
// Uploads
//
export const uploadUsers = async (formData, token) => {
  const endpoint = "/upload-users";

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Nu setăm Content-Type — browserul îl setează automat pentru FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => null);
    throw new Error(`Eroare ${response.status}: ${errorText || response.statusText}`);
  }

  return await response.json();
};


export const syncData = (token) =>
  fetchWithAuth("/sync-data", { method: "POST", token });