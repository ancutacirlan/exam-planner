import { Routes, Route } from "react-router-dom";

// Pagini fără navbar
import Landing from "./pages/Landing/Landing";
import Callback from "./pages/Callback/Callback";
import ErrorPage from "./pages/ErrorPage/ErrorPage";

// Pagini cu navbar
import Home from "./pages/Home/Home";
import Courses from "./pages/Courses/Courses";
import CourseDetails from "./pages/Courses/CourseDetails";
import Rooms from "./pages/Rooms/Rooms";
import PropuneExamen from "./pages/Examene/PropuneExamen/PropuneExamen";
import ExameneGrupa from "./pages/Examene/ExameneGrupa/ExameneGrupa";
import Setari from "./pages/Setari/Setari";
import AddPeriod from "./pages/Setari/AddPeriod";
import EditPeriod from "./pages/Setari/EditPeriod";
import Descarcare from "./pages/Descarcare/Descarcare";
import ExameneInAsteptare from './pages/Examene/ExameneInAsteptare/ExameneInAsteptare'
// Layout-uri
import LayoutWithNavbar from "./components/LayoutWithNavbar";
import LayoutWithoutNavbar from "./components/LayoutWithoutNavbar";
import ListaProfesori from "./pages/ListaProfesori/ListaProfesori";
import TeacherDetails from "./pages/ListaProfesori/TeacherDetails";
import ReprogramareExamene from "./pages/Examene/ReprogramareExamene/ReprogramareExamene";
import AdaugaSecretar from "./pages/AdaugaSecretar/AdaugaSecretar";
import Exams from "./pages/ExamList/Exam";
import EditareExamene from "./pages/Examene/EditareExamen/EditareExamen";


function App() {
  const userRole = "ADM"; // În viitor poate fi luat din context/autentificare

  return (
    <Routes>
      {/* Layout fără navbar */}
      <Route element={<LayoutWithoutNavbar />}>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/callback" element={<Callback />} />
        <Route path="/error" element={<ErrorPage />} />
      </Route>

      {/* Layout cu navbar */}
      <Route element={<LayoutWithNavbar userRole={userRole} />}>
        <Route path="/home" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetails />} />
        <Route path="/rooms" element={<Rooms />} />

        {/* Examene */}
        <Route path="/exam/all" element={<Exams />} />
        <Route path="/exam/edit/:id" element={<EditareExamene />} />
        
        <Route path="/exam/by-status" element={<ExameneInAsteptare />} />
        <Route path="/exam/propose" element={<PropuneExamen />} />
        <Route path="/exam/group" element={<ExameneGrupa />} />
        <Route path="/exam/:exam_id/update-date" element ={<ExameneGrupa />} />

        {/* Setări */}
        <Route path="/settings" element={<Setari />} />
        <Route path="/settings/adaugare" element={<AddPeriod />} />
        <Route path="/settings/editare/:id" element={<EditPeriod />} />
        
        {/* Profesori */}
        <Route path="/users/professors" element={<ListaProfesori />} />
        <Route path="/users/:user_id" element={<TeacherDetails />} />
        <Route path="/users/secretary" element={<AdaugaSecretar />} />
        
        
        {/* Descarcare (dacă ai) */}
        <Route path="/descarcare" element={<Descarcare/>} />
      </Route>
    </Routes>
  );
}

export default App;
