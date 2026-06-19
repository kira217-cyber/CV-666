import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMoneyBill,
  FaEdit,
  FaUserShield,
  FaChartLine,
  FaSpinner,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaGamepad,
  FaArrowLeft,
  FaChevronLeft,
  FaChevronRight,
  FaSyncAlt,
} from "react-icons/fa";
import UserDetailsEditProfile from "../components/userDetailsEditProfile/userDetailsEditProfile.jsx";
import { baseURL_For_IMG_UPLOAD, API_URL } from "../utils/baseURL";

const money = (value = 0) => {
  const n = Number(value || 0);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const resultBadgeClass = (type = "") => {
  const t = String(type).toLowerCase();

  if (t === "win") return "bg-emerald-700/40 text-emerald-200";
  if (t === "loss") return "bg-rose-700/40 text-rose-200";
  if (t === "push") return "bg-yellow-700/40 text-yellow-200";

  return "bg-gray-700/40 text-gray-200";
};

export default function UserDetails() {
  const navigate = useNavigate();
  const { userId } = useParams();

  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [gameHistory, setGameHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const currentHistoryPage = historyPagination.page || 1;
  const totalHistoryPages = historyPagination.totalPages || 1;

  const fetchUserInfo = async () => {
    if (!userId) {
      setError("No user ID in URL");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await axios.get(`${API_URL}/api/users/${userId}`);
      setUserInfo(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const fetchGameHistory = async (page = currentHistoryPage) => {
    if (!userId) return;

    try {
      setHistoryLoading(true);
      setHistoryError("");

      const { data } = await axios.get(
        `${API_URL}/api/game-history/user/${userId}`,
        {
          params: {
            page,
            limit: historyPagination.limit || 10,
          },
        },
      );

      setGameHistory(data?.data || []);
      setHistoryPagination(
        data?.pagination || {
          page,
          limit: 10,
          total: 0,
          totalPages: 1,
        },
      );
    } catch (err) {
      setHistoryError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to load game history",
      );
      setGameHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (userId) fetchGameHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const goHistoryPage = (page) => {
    const nextPage = Math.min(Math.max(1, page), totalHistoryPages);
    fetchGameHistory(nextPage);
  };

  const handleEditProfile = () => setIsEditing(true);
  const handleCancelEdit = () => setIsEditing(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950/30 to-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="text-emerald-400 text-6xl"
        >
          <FaSpinner />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950/30 to-black flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-red-950/70 to-rose-950/60 backdrop-blur-md border border-red-800/50 rounded-2xl p-8 sm:p-10 max-w-lg text-center shadow-2xl"
        >
          <FaExclamationTriangle className="text-6xl text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
          <p className="text-red-300 text-base sm:text-lg">{error}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950/20 to-black p-4 sm:p-6 md:p-8">
      <motion.div variants={containerVariants} className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer text-lg font-medium"
          >
            <FaArrowLeft className="text-xl" />
            Back
          </motion.button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
                <FaChartLine className="text-emerald-400" />
                User Dashboard
              </h1>
              <p className="text-emerald-300/80 mt-1 text-base sm:text-lg">
                {userInfo?.username ? userInfo.username : "User Profile"}
              </p>
            </div>

            {!isEditing && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleEditProfile}
                className="flex items-center justify-center gap-2 bg-emerald-700/50 hover:bg-emerald-600/70 text-emerald-100 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl border border-emerald-600/50 transition-all cursor-pointer font-medium shadow-lg w-full sm:w-auto"
              >
                <FaEdit className="text-lg" />
                Edit Profile
              </motion.button>
            )}
          </div>
        </div>

        {isEditing ? (
          <UserDetailsEditProfile onCancel={handleCancelEdit} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 sm:gap-6">
            <motion.div
              variants={itemVariants}
              className="lg:col-span-1 space-y-5 sm:space-y-6"
            >
              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md border border-emerald-800/50 rounded-2xl p-5 sm:p-6 shadow-2xl text-center">
                <p className="text-emerald-400 text-sm font-medium mb-3 sm:mb-4">
                  Profile
                </p>

                <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-full overflow-hidden border-4 border-emerald-600/70 shadow-xl">
                  {userInfo?.profileImage ? (
                    <img
                      src={`${baseURL_For_IMG_UPLOAD}s/${userInfo.profileImage}`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) =>
                        (e.target.src =
                          "https://cdn-icons-png.freepik.com/512/8532/8532963.png")
                      }
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <FaUser className="text-4xl sm:text-5xl text-emerald-500/70" />
                    </div>
                  )}
                </div>

                <p className="mt-4 text-xl sm:text-2xl font-bold text-white">
                  {userInfo?.username || "—"}
                </p>
              </div>

              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md border border-emerald-800/50 rounded-2xl p-5 sm:p-6 shadow-2xl text-center">
                <p className="text-emerald-400 text-sm font-medium mb-2">
                  Balance
                </p>
                <p className="text-3xl sm:text-4xl font-bold text-emerald-300">
                  {Number(userInfo?.balance ?? 0).toFixed(2)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md border border-emerald-800/50 rounded-2xl p-5 sm:p-6 shadow-2xl text-center">
                <p className="text-emerald-400 text-sm font-medium mb-3">
                  Status
                </p>
                <span
                  className={`inline-block px-6 sm:px-8 py-2 rounded-full text-sm sm:text-base font-semibold ${
                    userInfo?.isActive
                      ? "bg-emerald-700/50 text-emerald-100 border border-emerald-600/50"
                      : "bg-rose-700/50 text-rose-100 border border-rose-600/50"
                  }`}
                >
                  {userInfo?.isActive ? "Active" : "Deactive"}
                </span>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="lg:col-span-3 space-y-6 sm:space-y-8"
            >
              <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md border border-emerald-800/40 rounded-2xl p-5 sm:p-6 md:p-8 shadow-2xl">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-5 sm:mb-6 flex items-center gap-3">
                  <FaUser className="text-emerald-400" /> Personal Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {[
                    { icon: FaUser, label: "ID", value: userInfo?._id ?? "—" },
                    {
                      icon: FaUser,
                      label: "Username",
                      value: userInfo?.username ?? "—",
                    },
                    {
                      icon: FaUser,
                      label: "Game Play Name",
                      value: userInfo?.userGamePlayName ?? "—",
                    },
                    {
                      icon: FaEnvelope,
                      label: "Email",
                      value: userInfo?.email ?? "—",
                    },
                    {
                      icon: FaPhone,
                      label: "Phone / WhatsApp",
                      value: userInfo?.whatsapp ?? "—",
                    },
                    {
                      icon: FaUserShield,
                      label: "Role",
                      value: userInfo?.role ?? "—",
                    },
                    {
                      icon: FaUserShield,
                      label: "Status",
                      value: userInfo?.isActive ? "Active" : "Inactive",
                    },
                    {
                      icon: FaUser,
                      label: "Referral Code",
                      value: userInfo?.referralCode ?? "—",
                    },
                    {
                      icon: FaUser,
                      label: "Referred By",
                      value: userInfo?.referredBy ?? "—",
                    },
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      variants={itemVariants}
                      className="flex items-center gap-3 sm:gap-4 bg-gray-900/50 p-4 sm:p-5 rounded-xl border border-emerald-900/40 hover:border-emerald-600/60 transition-all group"
                    >
                      <div className="p-3 rounded-xl bg-emerald-900/40 text-emerald-400">
                        <item.icon className="text-xl sm:text-2xl" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-gray-400 font-medium">
                          {item.label}
                        </p>
                        <p className="text-sm sm:text-base md:text-lg text-gray-100 font-semibold break-all">
                          {item.value}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md border border-emerald-800/40 rounded-2xl p-5 sm:p-6 md:p-8 shadow-2xl">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-5 sm:mb-6 flex items-center gap-3">
                    <FaMoneyBill className="text-emerald-400" /> Financial
                  </h2>

                  <div className="space-y-5 sm:space-y-6">
                    <div className="flex justify-between items-center py-3 sm:py-4 border-b border-emerald-900/50">
                      <span className="text-gray-300 text-base sm:text-lg">
                        Main Balance
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-emerald-300">
                        {Number(userInfo?.balance ?? 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3 sm:py-4">
                      <span className="text-gray-300 text-base sm:text-lg">
                        Commission Balance
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-emerald-300">
                        {Number(userInfo?.commissionBalance ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md border border-emerald-800/40 rounded-2xl p-5 sm:p-6 md:p-8 shadow-2xl">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-5 sm:mb-6 flex items-center gap-3">
                    <FaMoneyBill className="text-emerald-400" /> Commissions
                  </h2>

                  <div className="grid grid-cols-2 gap-4 sm:gap-5">
                    {[
                      ["Game Loss", userInfo?.gameLossCommission],
                      ["Game Win", userInfo?.gameWinCommission],
                      ["Deposit", userInfo?.depositCommission],
                      ["Referral", userInfo?.referCommission],
                      ["Game Loss Bal.", userInfo?.gameLossCommissionBalance],
                      ["Game Win Bal.", userInfo?.gameWinCommissionBalance],
                      ["Deposit Bal.", userInfo?.depositCommissionBalance],
                      ["Refer Bal.", userInfo?.referCommissionBalance],
                    ].map(([label, val], idx) => (
                      <div
                        key={idx}
                        className="bg-gray-900/50 p-4 sm:p-5 rounded-xl border border-emerald-900/40"
                      >
                        <p className="text-xs sm:text-sm text-gray-400">
                          {label}
                        </p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-emerald-300 mt-1 sm:mt-2">
                          {Number(val ?? 0).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md border border-emerald-800/40 rounded-2xl p-5 sm:p-6 md:p-8 shadow-2xl">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-5 sm:mb-6 flex items-center gap-3">
                  <FaCalendarAlt className="text-emerald-400" /> Activity
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div className="bg-gray-900/50 p-5 sm:p-6 rounded-xl border border-emerald-900/40">
                    <p className="text-sm sm:text-base text-gray-400">
                      Created At
                    </p>
                    <p className="text-base sm:text-lg text-gray-100 mt-2 font-medium">
                      {fmtDate(userInfo?.createdAt)}
                    </p>
                  </div>

                  <div className="bg-gray-900/50 p-5 sm:p-6 rounded-xl border border-emerald-900/40">
                    <p className="text-sm sm:text-base text-gray-400">
                      Updated At
                    </p>
                    <p className="text-base sm:text-lg text-gray-100 mt-2 font-medium">
                      {fmtDate(userInfo?.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md border border-emerald-800/40 rounded-2xl p-5 sm:p-6 shadow-2xl overflow-hidden">
                <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                    <FaGamepad className="text-emerald-400" /> Game History
                  </h2>

                  <button
                    type="button"
                    onClick={() => fetchGameHistory(currentHistoryPage)}
                    disabled={historyLoading}
                    className="inline-flex items-center justify-center gap-2 bg-emerald-700/50 hover:bg-emerald-600/70 text-emerald-100 px-4 py-2 rounded-xl border border-emerald-600/50 transition-all cursor-pointer font-medium disabled:opacity-60"
                  >
                    <FaSyncAlt
                      className={historyLoading ? "animate-spin" : ""}
                    />
                    Refresh
                  </button>
                </div>

                {historyError && (
                  <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                    {historyError}
                  </div>
                )}

                {historyLoading ? (
                  <div className="text-center py-12 sm:py-16 text-gray-400 text-lg sm:text-xl">
                    <FaSpinner className="mx-auto mb-4 animate-spin text-emerald-400 text-3xl" />
                    Loading game history...
                  </div>
                ) : gameHistory.length > 0 ? (
                  <>
                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full min-w-[1100px] text-left">
                        <thead>
                          <tr className="bg-emerald-950/70 border-b border-emerald-800/60">
                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-emerald-300 font-medium text-sm sm:text-base">
                              Game UID
                            </th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-emerald-300 font-medium text-sm sm:text-base">
                              Result
                            </th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-emerald-300 font-medium text-sm sm:text-base">
                              Bet
                            </th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-emerald-300 font-medium text-sm sm:text-base">
                              Win
                            </th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-emerald-300 font-medium text-sm sm:text-base">
                              Net
                            </th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-emerald-300 font-medium text-sm sm:text-base">
                              Before
                            </th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-emerald-300 font-medium text-sm sm:text-base">
                              After
                            </th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-emerald-300 font-medium text-sm sm:text-base">
                              Serial
                            </th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-emerald-300 font-medium text-sm sm:text-base">
                              Round
                            </th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-emerald-300 font-medium text-sm sm:text-base">
                              Date
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {gameHistory.map((h) => (
                            <tr
                              key={h._id}
                              className="border-b border-emerald-900/50 hover:bg-emerald-950/40 transition-colors"
                            >
                              <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-200 text-sm sm:text-base break-all">
                                {h?.game_uid || h?.game_code || "—"}
                              </td>

                              <td className="px-4 sm:px-6 py-3 sm:py-4">
                                <span
                                  className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium capitalize ${resultBadgeClass(
                                    h?.resultType,
                                  )}`}
                                >
                                  {h?.resultType || "—"}
                                </span>
                              </td>

                              <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-200 text-sm sm:text-base">
                                {money(h?.bet_amount ?? h?.betAmount)}
                              </td>

                              <td className="px-4 sm:px-6 py-3 sm:py-4 text-emerald-400 font-medium text-sm sm:text-base">
                                {money(h?.win_amount ?? h?.winAmount)}
                              </td>

                              <td
                                className={`px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base ${
                                  Number(h?.net_amount ?? h?.netAmount ?? 0) >=
                                  0
                                    ? "text-emerald-400"
                                    : "text-rose-300"
                                }`}
                              >
                                {money(h?.net_amount ?? h?.netAmount)}
                              </td>

                              <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-200 text-sm sm:text-base">
                                {money(h?.balance_before)}
                              </td>

                              <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-200 text-sm sm:text-base">
                                {money(h?.balance_after)}
                              </td>

                              <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-300 break-all text-sm sm:text-base">
                                {h?.serial_number || h?.transaction_id || "—"}
                              </td>

                              <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-300 break-all text-sm sm:text-base">
                                {h?.game_round || h?.verification_key || "—"}
                              </td>

                              <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-400 text-xs sm:text-sm whitespace-nowrap">
                                {fmtDate(h?.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-emerald-900/50 pt-5">
                      <p className="text-sm text-emerald-300/80">
                        Showing page{" "}
                        <span className="font-bold text-white">
                          {currentHistoryPage}
                        </span>{" "}
                        of{" "}
                        <span className="font-bold text-white">
                          {totalHistoryPages}
                        </span>{" "}
                        — Total{" "}
                        <span className="font-bold text-white">
                          {historyPagination.total || 0}
                        </span>{" "}
                        records
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          disabled={currentHistoryPage <= 1 || historyLoading}
                          onClick={() => goHistoryPage(currentHistoryPage - 1)}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-800/50 bg-black/35 px-4 py-3 text-sm font-bold text-emerald-100 hover:bg-emerald-900/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <FaChevronLeft />
                          Prev
                        </button>

                        <span className="rounded-xl border border-emerald-800/50 bg-emerald-950/40 px-4 py-3 text-sm font-black text-white">
                          {currentHistoryPage}
                        </span>

                        <button
                          disabled={
                            currentHistoryPage >= totalHistoryPages ||
                            historyLoading
                          }
                          onClick={() => goHistoryPage(currentHistoryPage + 1)}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-800/50 bg-black/35 px-4 py-3 text-sm font-bold text-emerald-100 hover:bg-emerald-900/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Next
                          <FaChevronRight />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 sm:py-16 text-gray-400 text-lg sm:text-xl">
                    No game history available
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
