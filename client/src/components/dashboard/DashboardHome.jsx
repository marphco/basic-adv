import PropTypes from "prop-types";

const DashboardHome = ({ handleSectionChange, requests }) => {
  const totalRequests = requests.length;
  const completedRequests = requests.filter((req) => req.projectPlan).length;
  const abandonedRequests = totalRequests - completedRequests;

  return (
    <div className="dashboard-home">
      <div className="stat-card" onClick={() => handleSectionChange("all")}>
        <h3>Totale Richieste</h3>
        <p>{totalRequests}</p>
      </div>
      <div
        className="stat-card"
        onClick={() => handleSectionChange("completed")}
      >
        <h3>Completate</h3>
        <p>{completedRequests}</p>
      </div>
      <div
        className="stat-card"
        onClick={() => handleSectionChange("abandoned")}
      >
        <h3>Abbandonate</h3>
        <p>{abandonedRequests}</p>
      </div>
    </div>
  );
};

DashboardHome.propTypes = {
  handleSectionChange: PropTypes.func.isRequired,
  requests: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default DashboardHome;