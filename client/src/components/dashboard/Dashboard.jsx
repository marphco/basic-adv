import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import "./Dashboard.css";
import SearchBar from "./SearchBar";
import ServiceFilter from "./ServiceFilter";
import ConfirmModal from "./ConfirmModal";
import { Cursor } from "../cursor/Cursor";
import DashboardHome from "./DashboardHome";
import RequestList from "./RequestList";
import RequestDetails from "./RequestDetails";
import FileListSection from "./FileListSection";
import Sidebar from "./Sidebar";

const Dashboard = ({ isDark, toggleSidebar, isSidebarOpen }) => {
  const [requests, setRequests] = useState([]);
  const [selectedSection, setSelectedSection] = useState("home");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredServices, setFilteredServices] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [activeKey, setActiveKey] = useState(Date.now());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();

  const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:8080"
  ).replace(/\/$/, "");
  const requestsUrl = `${API_URL}/api/getRequests`;

  // Lista dei microservizi (18 in totale)
  const servicesList = [
    "Logo",
    "Brand Identity",
    "Packaging",
    "Content Creation",
    "Social Media Management",
    "Advertising",
    "Product Photography",
    "Fashion Photography",
    "Event Photography",
    "Promo Video",
    "Corporate Video",
    "Motion Graphics",
    "Website Design",
    "E-commerce",
    "Landing Page",
    "Mobile App",
    "Web App",
    "UI/UX Design",
  ];

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(requestsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sortedRequests = response.data
        .map((req) => ({
          ...req,
          feedback: req.feedback,
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(sortedRequests);
    } catch (err) {
      console.error("Errore nel caricamento delle richieste:", err);
      localStorage.removeItem("token");
      navigate("/login");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchRequests();
    setIsMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchFileList = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/uploads/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFileList(response.data.files);
      setActiveKey(Date.now());
      setSelectedSection("fileList");
      setSelectedRequest(null);
      toggleSidebar();
    } catch (error) {
      console.error("Errore nel recupero della lista dei file:", error);
      alert("Errore nel caricamento della lista dei file");
    }
  };

  const deleteFile = async (filename) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/uploads/delete/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFileList(fileList.filter((file) => file.name !== filename));
      alert(`File ${filename} cancellato con successo!`);
    } catch (error) {
      console.error("Errore nella cancellazione del file:", error);
      alert("Errore nella cancellazione del file");
    }
  };

  const updateFeedback = async (sessionId, newFeedback) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/requests/${sessionId}/feedback`,
        { feedback: newFeedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchRequests();
    } catch (err) {
      console.error("Errore nell'aggiornamento del feedback:", err);
      alert("Errore nell'aggiornamento del feedback");
    }
  };

  const confirmDelete = (sessionId) => {
    setRequestToDelete(sessionId);
    setIsModalOpen(true);
  };

  const deleteRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/requests/${requestToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(requests.filter((req) => req.sessionId !== requestToDelete));
      if (selectedRequest?.sessionId === requestToDelete) {
        setSelectedRequest(null);
      }
    } catch (err) {
      console.error("Errore nella cancellazione della richiesta:", err);
      alert("Errore nella cancellazione della richiesta");
    } finally {
      setIsModalOpen(false);
      setRequestToDelete(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleSectionChange = (section) => {
    setActiveKey(Date.now());
    setSelectedSection(section);
    setSelectedRequest(null);
    if (section === "fileList") {
      fetchFileList();
    } else {
      if (window.innerWidth <= 768 && isSidebarOpen) {
        toggleSidebar();
      }
    }
  };

  const getFilteredRequests = () => {
    let filtered = requests;
    if (selectedSection === "completed") {
      filtered = requests.filter((req) => req.projectPlan);
    } else if (selectedSection === "abandoned") {
      filtered = requests.filter((req) => !req.projectPlan);
    }
    if (searchTerm) {
      filtered = filtered.filter((req) =>
        req.formData.contactInfo.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }
    if (filteredServices.length > 0) {
      filtered = filtered.filter((req) =>
        req.servicesQueue.some((service) => filteredServices.includes(service))
      );
    }
    return filtered.sort((a, b) => {
      if (sortField === "name") {
        const nameA = a.formData.contactInfo.name || "-";
        const nameB = b.formData.contactInfo.name || "-";
        return sortDirection === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else if (sortField === "email") {
        const emailA = a.formData.contactInfo.email || "-";
        const emailB = b.formData.contactInfo.email || "-";
        return sortDirection === "asc"
          ? emailA.localeCompare(emailB)
          : emailB.localeCompare(emailA);
      } else if (sortField === "createdAt") {
        const dateA = a.createdAt
          ? new Date(a.createdAt.$date || a.createdAt)
          : new Date(0);
        const dateB = b.createdAt
          ? new Date(b.createdAt.$date || b.createdAt)
          : new Date(0);
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortField === "status") {
        const statusA = a.projectPlan ? 1 : 0;
        const statusB = b.projectPlan ? 1 : 0;
        return sortDirection === "asc" ? statusA - statusB : statusB - statusA;
      } else if (sortField === "budget") {
        const budgetA =
          a.formData.budget === "unknown"
            ? -1
            : parseFloat(a.formData.budget) || 0;
        const budgetB =
          b.formData.budget === "unknown"
            ? -1
            : parseFloat(b.formData.budget) || 0;
        return sortDirection === "asc" ? budgetA - budgetB : budgetB - budgetA;
      } else if (sortField === "attachment") {
        const attachmentA = a.formData.currentLogo ? 1 : 0;
        const attachmentB = b.formData.currentLogo ? 1 : 0;
        return sortDirection === "asc"
          ? attachmentA - attachmentB
          : attachmentB - attachmentA;
      } else if (sortField === "feedback") {
        const feedbackA = a.feedback ? 1 : 0;
        const feedbackB = b.feedback ? 1 : 0;
        return sortDirection === "asc"
          ? feedbackA - feedbackB
          : feedbackB - feedbackA;
      }
      return 0;
    });
  };

  return (
    <div className={`dashboard ${isDark ? "dark-theme" : "light-theme"}`}>
      {isMounted && <Cursor isDark={isDark} />}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        selectedSection={selectedSection}
        handleSectionChange={handleSectionChange}
        handleLogout={handleLogout}
        activeKey={activeKey}
      />
      <div className="main-area">
        {selectedSection !== "home" &&
          selectedSection !== "fileList" &&
          !selectedRequest && (
            <div className="header-controls">
              <ServiceFilter
                services={servicesList}
                onFilterChange={setFilteredServices}
              />
              <SearchBar onSearch={setSearchTerm} />
            </div>
          )}
        {selectedRequest ? (
          <RequestDetails
            request={selectedRequest}
            setSelectedRequest={setSelectedRequest}
            API_URL={API_URL}
          />
        ) : selectedSection === "home" ? (
          <DashboardHome
            handleSectionChange={handleSectionChange}
            requests={requests}
          />
        ) : selectedSection === "fileList" ? (
          <FileListSection
            fileList={fileList}
            deleteFile={deleteFile}
            API_URL={API_URL}
          />
        ) : (
          <RequestList
            getFilteredRequests={getFilteredRequests}
            setSelectedRequest={setSelectedRequest}
            selectedSection={selectedSection}
            updateFeedback={updateFeedback}
            confirmDelete={confirmDelete}
            sortField={sortField}
            sortDirection={sortDirection}
            handleSort={handleSort}
          />
        )}
      </div>
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={deleteRequest}
        message="Sei sicuro di voler eliminare questa richiesta?"
      />
    </div>
  );
};

Dashboard.propTypes = {
  isDark: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
  isSidebarOpen: PropTypes.bool.isRequired,
};

export default Dashboard;