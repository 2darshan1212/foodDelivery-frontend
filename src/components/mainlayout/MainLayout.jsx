import React from "react";
import Header from "../header/Header";
import Leftsidebar from "../left/Leftsidebar";
import RightSideBar from "../right/RightSideBar";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <div>
      <div className="min-h-screen flex flex-col">
        <Header />
        {/* Main Layout */}
        <div className="flex flex-1 flex-col md:flex-row gap-4 p-4">
          {/* Left Sidebar sticky on md+ */}
          <aside className="hidden md:flex md:flex-col md:w-20 lg:w-64">
            <Leftsidebar />
          </aside>

          {/* Center Content */}
          <Outlet />

          {/* Right Sidebar */}
          <aside className="hidden lg:block lg:w-[310px] mr-5">
            <RightSideBar />
          </aside>
        </div>
        {/* Left Sidebar fixed at bottom on mobile */}
        <div className="fixed bottom-0 left-0 right-0 block md:hidden p-2 shadow-t bg-white border-t">
          <Leftsidebar />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
