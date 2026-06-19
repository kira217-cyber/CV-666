import React, { useEffect, useMemo, useState } from "react";
import {
  FaUsers,
  FaUserCheck,
  FaUserTie,
  FaCrown,
  FaGamepad,
  FaMoneyCheck,
  FaMoneyBillWave,
  FaHourglassHalf,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { API_URL } from "../../utils/baseURL.js";

export default function DashboardLayout() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalActiveUsers: 0,
    totalSuperAffiliates: 0,
    totalMasterAffiliates: 0,
    totalGames: 0,
    totalDeposit: 0,
    totalWithdraw: 0,
    pendingWithdraw: 0,
  });

  const formatNumber = (value) => {
    if (loading) return "Loading...";
    return Number(value || 0).toLocaleString("en-BD");
  };

  const formatCurrency = (value) => {
    if (loading) return "Loading...";

    return `৳ ${Number(value || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);

        const res = await axios.get(`${API_URL}/api/dashboard/stats`);

        if (res.data?.success) {
          setStats({
            totalUsers: res.data.data?.totalUsers || 0,
            totalActiveUsers: res.data.data?.totalActiveUsers || 0,
            totalSuperAffiliates: res.data.data?.totalSuperAffiliates || 0,
            totalMasterAffiliates: res.data.data?.totalMasterAffiliates || 0,
            totalGames: res.data.data?.totalGames || 0,
            totalDeposit: res.data.data?.totalDeposit || 0,
            totalWithdraw: res.data.data?.totalWithdraw || 0,
            pendingWithdraw: res.data.data?.pendingWithdraw || 0,
          });
        }
      } catch (error) {
        console.error("Dashboard stats fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const statCards = useMemo(
    () => [
      {
        title: "Total User",
        value: formatNumber(stats.totalUsers),
        icon: <FaUsers className="text-3xl" />,
        color: "from-emerald-500 to-green-500",
        iconBg: "bg-emerald-500/20",
        textColor: "text-emerald-400",
        route: "/all-user",
        description: "Total registered users",
      },
      {
        title: "Total Active User",
        value: formatNumber(stats.totalActiveUsers),
        icon: <FaUserCheck className="text-3xl" />,
        color: "from-cyan-500 to-blue-500",
        iconBg: "bg-cyan-500/20",
        textColor: "text-cyan-400",
        route: "/all-user",
        description: "Currently active users",
      },
      {
        title: "Total Super Affiliate",
        value: formatNumber(stats.totalSuperAffiliates),
        icon: <FaCrown className="text-3xl" />,
        color: "from-amber-500 to-orange-500",
        iconBg: "bg-amber-500/20",
        textColor: "text-amber-400",
        route: "/super-affiliate",
        description: "Total super affiliates",
      },
      {
        title: "Total Master Affiliate",
        value: formatNumber(stats.totalMasterAffiliates),
        icon: <FaUserTie className="text-3xl" />,
        color: "from-purple-500 to-pink-500",
        iconBg: "bg-purple-500/20",
        textColor: "text-purple-400",
        route: "/master-affiliate",
        description: "Total master affiliates",
      },
      {
        title: "Total Game",
        value: formatNumber(stats.totalGames),
        icon: <FaGamepad className="text-3xl" />,
        color: "from-indigo-500 to-blue-500",
        iconBg: "bg-indigo-500/20",
        textColor: "text-indigo-400",
        route: "/add-games",
        description: "Total active games",
      },
      {
        title: "Total Deposit",
        value: formatCurrency(stats.totalDeposit),
        icon: <FaMoneyCheck className="text-3xl" />,
        color: "from-green-500 to-emerald-500",
        iconBg: "bg-green-500/20",
        textColor: "text-green-400",
        route: "/wallet-agent/history",
        description: "Total successful deposits",
      },
      {
        title: "Total Withdraw",
        value: formatCurrency(stats.totalWithdraw),
        icon: <FaMoneyBillWave className="text-3xl" />,
        color: "from-blue-500 to-indigo-500",
        iconBg: "bg-blue-500/20",
        textColor: "text-blue-400",
        route: "/Withdraw-transaction",
        description: "Total completed withdraws",
      },
      {
        title: "Pending Withdraw",
        value: formatNumber(stats.pendingWithdraw),
        icon: <FaHourglassHalf className="text-3xl" />,
        color: "from-orange-500 to-red-500",
        iconBg: "bg-orange-500/20",
        textColor: "text-orange-400",
        route: "/Withdraw-transaction/filter/pending",
        description: "Withdraw requests waiting",
      },
    ],
    [stats, loading],
  );

  const cardRows = [];
  for (let i = 0; i < statCards.length; i += 4) {
    cardRows.push(statCards.slice(i, i + 4));
  }

  const handleCardClick = (route) => {
    if (route) navigate(route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950/20 to-black p-4 md:p-6">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Dashboard Overview
        </h1>
        <p className="text-emerald-200/70">
          Welcome to your admin dashboard. Here's what's happening today.
        </p>
      </div>

      <div className="space-y-6">
        {cardRows.map((row, rowIndex) => (
          <motion.div
            key={rowIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: rowIndex * 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {row.map((stat, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCardClick(stat.route)}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-5 md:p-6 border border-emerald-800/30 shadow-2xl hover:shadow-emerald-900/30 transition-all duration-300 cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`p-3 rounded-xl ${stat.iconBg} ${stat.textColor}`}
                    >
                      {stat.icon}
                    </div>
                  </div>

                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {stat.value}
                  </h3>

                  <p className="text-gray-300 font-medium mb-1">{stat.title}</p>

                  <p className="text-gray-400 text-sm">{stat.description}</p>

                  <div className="mt-4 pt-3 border-t border-emerald-800/30">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 text-sm font-medium">
                        View Details
                      </span>

                      <div className={`p-1.5 rounded-lg ${stat.iconBg}`}>
                        <div
                          className={`w-5 h-5 rounded-full ${stat.textColor} flex items-center justify-center`}
                        >
                          →
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 md:mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-emerald-800/30">
          <h3 className="text-lg font-semibold text-white mb-4">
            Financial Summary
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-300">Total Deposit</span>
              <span className="text-emerald-400 font-bold">
                {formatCurrency(stats.totalDeposit)}
              </span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-300">Total Withdraw</span>
              <span className="text-blue-400 font-bold">
                {formatCurrency(stats.totalWithdraw)}
              </span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-300">Pending Withdraw</span>
              <span className="text-orange-400 font-bold">
                {formatNumber(stats.pendingWithdraw)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-emerald-800/30">
          <h3 className="text-lg font-semibold text-white mb-4">
            User Statistics
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-300">Total User</span>
              <span className="text-emerald-400 font-bold">
                {formatNumber(stats.totalUsers)}
              </span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-300">Active User</span>
              <span className="text-cyan-400 font-bold">
                {formatNumber(stats.totalActiveUsers)}
              </span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-300">Total Game</span>
              <span className="text-indigo-400 font-bold">
                {formatNumber(stats.totalGames)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-emerald-800/30">
          <h3 className="text-lg font-semibold text-white mb-4">
            Affiliate Summary
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-300">Super Affiliate</span>
              <span className="text-amber-400 font-bold">
                {formatNumber(stats.totalSuperAffiliates)}
              </span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-300">Master Affiliate</span>
              <span className="text-purple-400 font-bold">
                {formatNumber(stats.totalMasterAffiliates)}
              </span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-300">Total Affiliates</span>
              <span className="text-green-400 font-bold">
                {formatNumber(
                  Number(stats.totalSuperAffiliates || 0) +
                    Number(stats.totalMasterAffiliates || 0),
                )}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
