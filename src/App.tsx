import { BrowserRouter, Routes, Route } from "react-router-dom"
import UploadPage from "@/pages/UploadPage"
import PreviewPage from "@/pages/PreviewPage"
import ReviewPage from "@/pages/ReviewPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/preview" element={<PreviewPage />} />
        <Route path="/review" element={<ReviewPage />} />
      </Routes>
    </BrowserRouter>
  )
}
