import React from "react";
import { Outlet } from "react-router-dom";

const LayoutWithoutNavbar = () => {
  return (
    <div>
      {/* Restul conținutului paginii */}
      <Outlet />
    </div>
  );
};

export default LayoutWithoutNavbar;
