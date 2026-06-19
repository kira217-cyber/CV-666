import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaSearch,
  FaHistory,
  FaDice,
  FaCheckCircle,
  FaEquals,
  FaSyncAlt,
  FaTable,
  FaThLarge,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

const API_URL =
  import.meta.env.VITE_REACT_APP_BACKEND_API2 ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5002";

const resultTypes = ["ALL", "win", "loss", "push"];

const money = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const badgeClass = (type) => {
  const t = String(type || "").toLowerCase();

  if (t === "win")
    return "bg-emerald-500/15 text-emerald-200 border-emerald-400/30";
  if (t === "loss") return "bg-red-500/15 text-red-200 border-red-400/30";
  if (t === "push")
    return "bg-yellow-500/15 text-yellow-200 border-yellow-400/30";

  return "bg-white/10 text-white border-white/20";
};

const SummaryCard = ({ title, count, amount, icon, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
        active
          ? "border-emerald-300/60 bg-emerald-500/20 shadow-xl shadow-emerald-900/40"
          : "border-emerald-800/40 bg-black/35 hover:border-emerald-400/50"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-emerald-200/75">{title}</p>
          <h3 className="mt-2 text-2xl font-black text-white">{count || 0}</h3>
        </div>

        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/50">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-sm text-emerald-100/80">
        Net Amount:{" "}
        <span className="font-bold text-emerald-100">{money(amount)}</span>
      </p>
    </button>
  );
};

const GameHistory = () => {
  const [histories, setHistories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [resultType, setResultType] = useState("ALL");
  const [viewMode, setViewMode] = useState("table");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentPage = pagination.page || 1;
  const totalPages = pagination.totalPages || 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 450);

    return () => clearTimeout(timer);
  }, [search]);

  const params = useMemo(() => {
    const query = {
      page: currentPage,
      limit: 50,
    };

    if (debouncedSearch) query.search = debouncedSearch;
    if (resultType !== "ALL") query.resultType = resultType;

    return query;
  }, [currentPage, debouncedSearch, resultType]);

  const fetchGameHistory = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await axios.get(`${API_URL}/api/game-history`, {
        params,
      });

      setHistories(data?.data || []);
      setSummary(data?.summary || null);
      setPagination(
        data?.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 1,
        },
      );
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "Failed to load history",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const goPage = (page) => {
    const nextPage = Math.min(Math.max(1, page), totalPages);
    setPagination((prev) => ({ ...prev, page: nextPage }));
  };

  const handleFilter = (type) => {
    setResultType(type);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="min-h-screen px-4 md:px-8 pb-10 text-emerald-50">
      <div className="rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-green-950 via-emerald-950 to-black shadow-2xl shadow-emerald-950/50 overflow-hidden">
        <div className="p-5 md:p-7 border-b border-emerald-800/40 bg-black/25">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shadow-lg shadow-emerald-900/60">
                  <FaHistory className="text-xl text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-white">
                    Game History
                  </h1>
                  <p className="text-sm text-emerald-200/75">
                    Search, filter and monitor all game transactions.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={fetchGameHistory}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-700/50 bg-black/35 px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-900/40 transition-all cursor-pointer"
              >
                <FaSyncAlt className={loading ? "animate-spin" : ""} />
                Refresh
              </button>

              <button
                onClick={() =>
                  setViewMode((prev) => (prev === "table" ? "card" : "table"))
                }
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-700/50 bg-black/35 px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-900/40 transition-all cursor-pointer"
              >
                {viewMode === "table" ? <FaThLarge /> : <FaTable />}
                {viewMode === "table" ? "Card View" : "Table View"}
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-7 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <SummaryCard
            title="Total Win"
            count={summary?.win?.count}
            amount={summary?.win?.netAmount}
            icon={<FaCheckCircle />}
            active={resultType === "win"}
            onClick={() => handleFilter(resultType === "win" ? "ALL" : "win")}
          />

          <SummaryCard
            title="Total Loss"
            count={summary?.loss?.count}
            amount={summary?.loss?.netAmount}
            icon={<FaDice />}
            active={resultType === "loss"}
            onClick={() => handleFilter(resultType === "loss" ? "ALL" : "loss")}
          />

          <SummaryCard
            title="Total Push"
            count={summary?.push?.count}
            amount={summary?.push?.netAmount}
            icon={<FaEquals />}
            active={resultType === "push"}
            onClick={() => handleFilter(resultType === "push" ? "ALL" : "push")}
          />
        </div>

        <div className="px-5 md:px-7 pb-5 flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user, member account, game uid, game round, serial number..."
              className="w-full rounded-2xl border border-emerald-800/50 bg-black/45 py-3.5 pl-12 pr-4 text-sm text-white placeholder-emerald-200/40 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/25 transition-all cursor-text"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {resultTypes.map((type) => (
              <button
                key={type}
                onClick={() => handleFilter(type)}
                className={`rounded-xl px-4 py-3 text-sm font-bold border transition-all cursor-pointer uppercase ${
                  resultType === type
                    ? "bg-gradient-to-r from-emerald-600 to-green-700 text-white border-emerald-300/50 shadow-lg shadow-emerald-900/40"
                    : "bg-black/35 text-emerald-100 border-emerald-800/50 hover:bg-emerald-900/40"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-5 md:mx-7 mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        {viewMode === "table" && (
          <div className="hidden md:block px-5 md:px-7 pb-5">
            <div className="overflow-x-auto rounded-2xl border border-emerald-800/45 bg-black/30">
              <table className="min-w-full text-sm">
                <thead className="bg-emerald-950/70 text-emerald-100">
                  <tr>
                    <th className="px-4 py-4 text-left">User</th>
                    <th className="px-4 py-4 text-left">Member</th>
                    <th className="px-4 py-4 text-left">Game UID</th>
                    <th className="px-4 py-4 text-left">Result</th>
                    <th className="px-4 py-4 text-right">Bet</th>
                    <th className="px-4 py-4 text-right">Win</th>
                    <th className="px-4 py-4 text-right">Net</th>
                    <th className="px-4 py-4 text-right">Before</th>
                    <th className="px-4 py-4 text-right">After</th>
                    <th className="px-4 py-4 text-left">Serial</th>
                    <th className="px-4 py-4 text-left">Round</th>
                    <th className="px-4 py-4 text-left">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="12" className="px-4 py-12 text-center">
                        <FaSyncAlt className="mx-auto mb-3 animate-spin text-2xl text-emerald-300" />
                        Loading game history...
                      </td>
                    </tr>
                  ) : histories.length === 0 ? (
                    <tr>
                      <td
                        colSpan="12"
                        className="px-4 py-12 text-center text-emerald-200/70"
                      >
                        No game history found.
                      </td>
                    </tr>
                  ) : (
                    histories.map((item) => (
                      <tr
                        key={item._id}
                        className="border-t border-emerald-900/55 hover:bg-emerald-900/20 transition-colors"
                      >
                        <td className="px-4 py-4 font-semibold text-white">
                          {item.userGamePlayName || item.username || "-"}
                        </td>

                        <td className="px-4 py-4">
                          {item.member_account || "-"}
                        </td>

                        <td className="px-4 py-4">{item.game_uid || "-"}</td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize ${badgeClass(
                              item.resultType,
                            )}`}
                          >
                            {item.resultType || "-"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right font-bold text-emerald-100">
                          {money(item.bet_amount)}
                        </td>

                        <td className="px-4 py-4 text-right font-bold text-emerald-100">
                          {money(item.win_amount)}
                        </td>

                        <td
                          className={`px-4 py-4 text-right font-bold ${
                            Number(item.net_amount || 0) >= 0
                              ? "text-emerald-200"
                              : "text-red-200"
                          }`}
                        >
                          {money(item.net_amount)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {money(item.balance_before)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {money(item.balance_after)}
                        </td>

                        <td className="px-4 py-4 max-w-[180px] truncate">
                          {item.serial_number || "-"}
                        </td>

                        <td className="px-4 py-4 max-w-[180px] truncate">
                          {item.game_round || "-"}
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-emerald-100/80">
                          {fmtDate(item.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(viewMode === "card" || true) && (
          <div
            className={`px-5 md:px-7 pb-5 ${
              viewMode === "table" ? "md:hidden" : ""
            }`}
          >
            {loading ? (
              <div className="rounded-2xl border border-emerald-800/45 bg-black/30 p-10 text-center">
                <FaSyncAlt className="mx-auto mb-3 animate-spin text-2xl text-emerald-300" />
                Loading game history...
              </div>
            ) : histories.length === 0 ? (
              <div className="rounded-2xl border border-emerald-800/45 bg-black/30 p-10 text-center text-emerald-200/70">
                No game history found.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {histories.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-2xl border border-emerald-800/45 bg-black/35 p-5 shadow-lg shadow-emerald-950/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-white">
                          {item.userGamePlayName || item.username || "-"}
                        </h3>
                        <p className="text-sm text-emerald-200/70">
                          {fmtDate(item.createdAt)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${badgeClass(
                          item.resultType,
                        )}`}
                      >
                        {item.resultType || "-"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-emerald-950/35 p-3">
                        <p className="text-emerald-200/60">Bet Amount</p>
                        <p className="font-black text-white">
                          {money(item.bet_amount)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-950/35 p-3">
                        <p className="text-emerald-200/60">Win Amount</p>
                        <p className="font-black text-white">
                          {money(item.win_amount)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-950/35 p-3">
                        <p className="text-emerald-200/60">Net Amount</p>
                        <p
                          className={`font-black ${
                            Number(item.net_amount || 0) >= 0
                              ? "text-emerald-200"
                              : "text-red-200"
                          }`}
                        >
                          {money(item.net_amount)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-950/35 p-3">
                        <p className="text-emerald-200/60">Game UID</p>
                        <p className="font-semibold text-white break-all">
                          {item.game_uid || "-"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-950/35 p-3">
                        <p className="text-emerald-200/60">Balance Before</p>
                        <p className="font-semibold text-white break-all">
                          {money(item.balance_before)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-950/35 p-3">
                        <p className="text-emerald-200/60">Balance After</p>
                        <p className="font-semibold text-white break-all">
                          {money(item.balance_after)}
                        </p>
                      </div>

                      <div className="col-span-2 rounded-xl bg-emerald-950/35 p-3">
                        <p className="text-emerald-200/60">Serial Number</p>
                        <p className="font-semibold text-white break-all">
                          {item.serial_number || "-"}
                        </p>
                      </div>

                      <div className="col-span-2 rounded-xl bg-emerald-950/35 p-3">
                        <p className="text-emerald-200/60">Game Round</p>
                        <p className="font-semibold text-white break-all">
                          {item.game_round || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-5 md:px-7 py-5 border-t border-emerald-800/40 bg-black/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm text-emerald-200/75">
              Showing page{" "}
              <span className="font-bold text-white">{currentPage}</span> of{" "}
              <span className="font-bold text-white">{totalPages}</span> — Total{" "}
              <span className="font-bold text-white">
                {pagination.total || 0}
              </span>{" "}
              records
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1 || loading}
                onClick={() => goPage(currentPage - 1)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-800/50 bg-black/35 px-4 py-3 text-sm font-bold text-emerald-100 hover:bg-emerald-900/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <FaChevronLeft />
                Prev
              </button>

              <span className="rounded-xl border border-emerald-800/50 bg-emerald-950/40 px-4 py-3 text-sm font-black text-white">
                {currentPage}
              </span>

              <button
                disabled={currentPage >= totalPages || loading}
                onClick={() => goPage(currentPage + 1)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-800/50 bg-black/35 px-4 py-3 text-sm font-bold text-emerald-100 hover:bg-emerald-900/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHistory;
