import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaGift,
  FaSearch,
  FaSyncAlt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { toast } from "react-toastify";

const API_BASE = import.meta.env.VITE_REACT_APP_BACKEND_API2;

const DailyBonusClaimHistory = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const token = useMemo(() => {
    return localStorage.getItem("token") || localStorage.getItem("adminToken");
  }, []);

  const api = useMemo(() => {
    return axios.create({
      baseURL: API_BASE,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }, [token]);

  const fetchClaims = async (targetPage = page) => {
    try {
      setLoading(true);

      const res = await api.get("/api/daily-bonus/admin/claims", {
        params: {
          page: targetPage,
          limit: 15,
          q: search,
          status,
          from,
          to,
        },
      });

      setClaims(res?.data?.data || []);
      setPagination(
        res?.data?.pagination || {
          page: targetPage,
          limit: 15,
          total: 0,
          totalPages: 1,
        },
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Daily bonus claim history load failed",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims(page);
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchClaims(1);
  };

  const handleReset = () => {
    setSearch("");
    setStatus("");
    setFrom("");
    setTo("");
    setPage(1);

    setTimeout(() => {
      fetchClaims(1);
    }, 0);
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUserName = (claim) => {
    return (
      claim?.user?.username ||
      claim?.userIdentity ||
      claim?.user?.whatsapp ||
      claim?.user?.email ||
      "-"
    );
  };

  const getTitle = (claim) => {
    return (
      claim?.settingTitle?.en ||
      claim?.settingTitle?.bn ||
      claim?.setting?.title?.en ||
      claim?.setting?.title?.bn ||
      "Daily Bonus"
    );
  };

  return (
    <div className="bg-gradient-to-br from-green-950 via-emerald-950 to-black p-4 md:p-8 text-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-b from-green-950 via-emerald-950/90 to-black border border-emerald-800/40 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-emerald-800/50 bg-gradient-to-r from-emerald-900/80 via-green-900/70 to-black/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-900/60">
                <FaGift className="text-2xl text-white" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-white">
                  Daily Bonus Claim History
                </h1>
                <p className="text-sm text-emerald-200/80">
                  View all users daily bonus claim records
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchClaims(page)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-600 hover:to-green-600 text-white font-medium shadow-md shadow-emerald-900/50"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="p-5">
            <form
              onSubmit={handleSearch}
              className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-5"
            >
              <div className="relative md:col-span-2">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300" />
                <input
                  type="text"
                  placeholder="Search username / user identity..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-5 py-3 bg-black/50 border border-emerald-800/60 rounded-xl text-emerald-100 placeholder-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 bg-black/50 border border-emerald-800/60 rounded-xl text-emerald-100 focus:outline-none focus:border-emerald-500"
              >
                <option className="bg-emerald-950" value="">
                  All Status
                </option>
                <option className="bg-emerald-950" value="claimed">
                  Claimed
                </option>
                <option className="bg-emerald-950" value="cancelled">
                  Cancelled
                </option>
              </select>

              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-4 py-3 bg-black/50 border border-emerald-800/60 rounded-xl text-emerald-100 focus:outline-none focus:border-emerald-500"
              />

              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-4 py-3 bg-black/50 border border-emerald-800/60 rounded-xl text-emerald-100 focus:outline-none focus:border-emerald-500"
              />

              <div className="md:col-span-5 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-600 hover:to-green-600 text-white font-semibold"
                >
                  Search
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-3 rounded-xl bg-red-700/70 hover:bg-red-700 text-white font-semibold"
                >
                  Reset
                </button>
              </div>
            </form>

            <div className="mb-4 text-sm text-emerald-200/80">
              Total Claims:{" "}
              <span className="font-bold text-white">{pagination.total}</span>
            </div>

            <div className="overflow-x-auto border border-emerald-800/40 rounded-xl">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-emerald-950/70">
                  <tr>
                    <th className="p-4 text-left text-emerald-200">User</th>
                    <th className="p-4 text-left text-emerald-200">Phone</th>
                    <th className="p-4 text-left text-emerald-200">Title</th>
                    <th className="p-4 text-left text-emerald-200">Amount</th>
                    <th className="p-4 text-left text-emerald-200">Period</th>
                    <th className="p-4 text-left text-emerald-200">
                      Period Start
                    </th>
                    <th className="p-4 text-left text-emerald-200">
                      Period End
                    </th>
                    <th className="p-4 text-left text-emerald-200">
                      Claimed At
                    </th>
                    <th className="p-4 text-left text-emerald-200">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center">
                        <div className="flex items-center justify-center gap-3 text-emerald-300">
                          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : claims.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="p-8 text-center text-emerald-200/70"
                      >
                        No daily bonus claim history found
                      </td>
                    </tr>
                  ) : (
                    claims.map((claim) => (
                      <tr
                        key={claim._id}
                        className="border-t border-emerald-800/30 hover:bg-emerald-950/40 transition"
                      >
                        <td className="p-4 font-semibold">
                          {getUserName(claim)}
                        </td>
                        <td className="p-4">{claim?.user?.whatsapp || "-"}</td>
                        <td className="p-4">{getTitle(claim)}</td>
                        <td className="p-4 font-bold text-emerald-300">
                          ৳ {Number(claim?.claimAmount || 0).toFixed(2)}
                        </td>
                        <td className="p-4">{claim?.periodDays || 1} Days</td>
                        <td className="p-4">
                          {formatDate(claim?.periodStart)}
                        </td>
                        <td className="p-4">{formatDate(claim?.periodEnd)}</td>
                        <td className="p-4">{formatDate(claim?.claimedAt)}</td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                              claim?.status === "cancelled"
                                ? "bg-red-800/40 text-red-200 border-red-600/50"
                                : "bg-emerald-800/50 text-emerald-100 border-emerald-600/50"
                            }`}
                          >
                            {claim?.status || "claimed"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-emerald-200/70">
                Page {pagination.page} of {pagination.totalPages || 1}
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    page <= 1 || loading
                      ? "bg-gray-700/50 text-gray-400"
                      : "bg-emerald-800/70 hover:bg-emerald-700 text-white"
                  }`}
                >
                  <FaChevronLeft />
                  Prev
                </button>

                <span className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold">
                  {pagination.page}
                </span>

                <button
                  disabled={page >= pagination.totalPages || loading}
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(pagination.totalPages || 1, prev + 1),
                    )
                  }
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    page >= pagination.totalPages || loading
                      ? "bg-gray-700/50 text-gray-400"
                      : "bg-emerald-800/70 hover:bg-emerald-700 text-white"
                  }`}
                >
                  Next
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyBonusClaimHistory;
