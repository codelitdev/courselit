"use client";

export default function CourseDashboard() {
    // Sample data for charts
    const viewsData = [
        { name: "Jan", total: 1200 },
        { name: "Feb", total: 2100 },
        { name: "Mar", total: 1800 },
        { name: "Apr", total: 2400 },
        { name: "May", total: 2800 },
        { name: "Jun", total: 3200 },
    ];

    const revenueData = [
        { name: "Jan", total: 900 },
        { name: "Feb", total: 1600 },
        { name: "Mar", total: 1400 },
        { name: "Apr", total: 1900 },
        { name: "May", total: 2200 },
        { name: "Jun", total: 2700 },
    ];

    return (
        <div className="container mx-auto p-6">
            {/* Dashboard content */}
            {/* ... (rest of the dashboard code) ... */}
        </div>
    );
}
