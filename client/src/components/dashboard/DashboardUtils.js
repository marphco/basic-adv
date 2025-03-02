export const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  export const formatBudget = (budget) => {
    if (budget === "unknown") return { text: "Non lo so", className: "budget-unknown" };
    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum)) return { text: "-", className: "budget-unknown" };
    if (budgetNum <= 1000) return { text: "0-1K", className: "budget-0-1k" };
    if (budgetNum <= 5000) return { text: "1-5K", className: "budget-1-5k" };
    if (budgetNum <= 10000) return { text: "5-10K", className: "budget-5-10k" };
    return { text: "10K+", className: "budget-10k-plus" };
  };