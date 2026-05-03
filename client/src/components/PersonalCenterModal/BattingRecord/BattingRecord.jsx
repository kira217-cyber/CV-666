import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/Context/AuthContext";
import axios from "axios";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const BattingRecord = () => {
  const { language, userId } = useContext(AuthContext);

  const [activeMainTab, setActiveMainTab] = useState(0);
  const [activeRadioTab, setActiveRadioTab] = useState(0);
  const [gameHistory, setGameHistory] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterProvider, setFilterProvider] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const API_URL = import.meta.env.VITE_API_URL;
  const itemsPerPage = 10;

  const isBn = language === "bn";

  const fetchGameHistory = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const res = await axios.get(
        `${API_URL}/api/game-history/user/${userId}`,
        {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            provider: filterProvider,
            date: dateFilter,
          },
        },
      );

      if (res.data?.success) {
        setGameHistory(res.data.data || []);
        setProviders(res.data.providers || []);
        setPagination(
          res.data.pagination || {
            page: 1,
            limit: itemsPerPage,
            total: 0,
            totalPages: 0,
          },
        );
      }
    } catch (err) {
      console.error("Failed to fetch game history:", err);
      setGameHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentPage, filterProvider, dateFilter]);

  const data = [
    {
      tabTitle: { en: "ALL", bn: "সকল" },
      radioTabs: [
        { label: { en: "All Records", bn: "সকল রেকর্ড" } },
        { label: { en: "Today", bn: "আজ" } },
      ],
    },
  ];

  const mainTab = data?.[activeMainTab];

  const tableHeaders = [
    { label: { en: "Bet Time", bn: "বেট সময়" } },
    { label: { en: "Type", bn: "টাইপ" } },
    { label: { en: "Bet Amount", bn: "বেট পরিমাণ" } },
    { label: { en: "Valid Bet", bn: "বৈধ বেট" } },
    { label: { en: "Award", bn: "অর্থ পুরস্কার" } },
    { label: { en: "Profit Loss", bn: "লাভ ক্ষতি" } },
    { label: { en: "Game Name", bn: "গেম নাম" } },
    { label: { en: "Game Number", bn: "গেম নম্বর" } },
  ];

  const formatDateTime = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  };

  const money = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getProfitLoss = (row) => {
    const amount = Number(row.amount || 0);

    if (row.bet_type === "BET") return -amount;
    if (row.bet_type === "SETTLE") return amount;
    if (row.status === "won") return amount;
    if (row.status === "lost") return -amount;

    return 0;
  };

  const getAward = (row) => {
    if (row.bet_type === "SETTLE" && Number(row.amount || 0) > 0) {
      return Number(row.amount || 0);
    }

    if (row.status === "won") {
      return Number(row.amount || 0);
    }

    return 0;
  };

  const totalBet = gameHistory.reduce((sum, h) => {
    if (h.bet_type === "BET") return sum + Number(h.amount || 0);
    return sum;
  }, 0);

  const totalAward = gameHistory.reduce((sum, h) => sum + getAward(h), 0);
  const profitLoss = gameHistory.reduce((sum, h) => sum + getProfitLoss(h), 0);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= pagination.totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleRadioChange = (index) => {
    setActiveRadioTab(index);
    setCurrentPage(1);

    if (index === 1) {
      const today = new Date().toISOString().split("T")[0];
      setDateFilter(today);
    } else {
      setDateFilter("");
    }
  };

  return (
    <div className="p-4 space-y-6 bg-gray-50 min-h-screen md:min-h-0 overflow-y-auto h-[500px] [scrollbar-width:none]">
      <div className="flex gap-8 lg:gap-12 text-sm lg:text-lg overflow-x-auto border-b border-gray-300 pb-2">
        {data.map((tab, i) => (
          <button
            key={i}
            onClick={() => {
              setActiveMainTab(i);
              setActiveRadioTab(0);
              setDateFilter("");
              setCurrentPage(1);
            }}
            className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${
              i === activeMainTab
                ? "border-b-4 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            {isBn ? tab.tabTitle.bn : tab.tabTitle.en}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center flex-wrap">
        <div className="flex gap-6 flex-wrap">
          {mainTab?.radioTabs?.map((r, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="radioTab"
                checked={i === activeRadioTab}
                onChange={() => handleRadioChange(i)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm lg:text-base">
                {isBn ? r.label.bn : r.label.en}
              </span>
            </label>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <select
            value={filterProvider}
            onChange={(e) => {
              setFilterProvider(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-400 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-600"
          >
            <option value="all">
              {isBn ? "সকল প্রোভাইডার" : "All Providers"}
            </option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setActiveRadioTab(0);
              setCurrentPage(1);
            }}
            className="border border-gray-400 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-600"
          />

          <button
            onClick={() => {
              setCurrentPage(1);
              fetchGameHistory();
            }}
            className="px-6 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition"
          >
            {isBn ? "খুঁজুন" : "Search"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500">
            {isBn ? "মোট বেট" : "Total Bet"}
          </p>
          <p className="text-lg font-extrabold text-red-600">
            ৳{money(totalBet)}
          </p>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500">
            {isBn ? "মোট পুরস্কার" : "Total Award"}
          </p>
          <p className="text-lg font-extrabold text-green-600">
            ৳{money(totalAward)}
          </p>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500">
            {isBn ? "লাভ/ক্ষতি" : "Profit/Loss"}
          </p>
          <p
            className={`text-lg font-extrabold ${
              profitLoss >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {profitLoss >= 0 ? "+" : "-"}৳{money(Math.abs(profitLoss))}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-sm font-medium text-gray-700">
            {isBn
              ? `মোট ফলাফল: ${pagination.total}`
              : `Total Results: ${pagination.total}`}
          </p>

          <p className="text-sm text-gray-600">
            {isBn
              ? `পেজ ${pagination.page} / ${pagination.totalPages || 1}`
              : `Page ${pagination.page} of ${pagination.totalPages || 1}`}
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <Skeleton height={24} count={5} />
          </div>
        ) : gameHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {isBn ? "কোন রেকর্ড পাওয়া যায়নি" : "No records found"}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto hidden lg:block">
              <table className="w-full min-w-max">
                <thead className="bg-[#063A49] text-white">
                  <tr>
                    {tableHeaders.map((header, i) => (
                      <th key={i} className="text-left p-3 text-sm font-medium">
                        {isBn ? header.label.bn : header.label.en}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {gameHistory.map((row) => {
                    const pl = getProfitLoss(row);
                    const award = getAward(row);

                    return (
                      <tr key={row._id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm">
                          {formatDateTime(row.createdAt)}
                        </td>

                        <td className="p-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              row.bet_type === "BET"
                                ? "bg-red-50 text-red-600"
                                : "bg-green-50 text-green-600"
                            }`}
                          >
                            {row.bet_type}
                          </span>
                        </td>

                        <td className="p-3 text-sm">৳{money(row.amount)}</td>
                        <td className="p-3 text-sm">৳{money(row.amount)}</td>

                        <td className="p-3 text-sm text-green-600">
                          ৳{money(award)}
                        </td>

                        <td
                          className={`p-3 text-sm font-medium ${
                            pl >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {pl >= 0 ? "+" : "-"}৳{money(Math.abs(pl))}
                        </td>

                        <td className="p-3 text-sm">{row.game_code || "-"}</td>
                        <td className="p-3 text-sm">
                          {row.transaction_id || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-4 p-4">
              {gameHistory.map((row) => {
                const pl = getProfitLoss(row);
                const award = getAward(row);

                return (
                  <div
                    key={row._id}
                    className="border rounded-lg p-4 bg-white shadow-sm"
                  >
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">
                          {isBn ? "বেট সময়" : "Bet Time"}
                        </p>
                        <p className="font-medium">
                          {formatDateTime(row.createdAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs">
                          {isBn ? "টাইপ" : "Type"}
                        </p>
                        <p className="font-bold">{row.bet_type}</p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs">
                          {isBn ? "বেট পরিমাণ" : "Bet Amount"}
                        </p>
                        <p className="font-medium">৳{money(row.amount)}</p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs">
                          {isBn ? "পুরস্কার" : "Award"}
                        </p>
                        <p className="font-medium text-green-600">
                          ৳{money(award)}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs">
                          {isBn ? "গেম নাম" : "Game Name"}
                        </p>
                        <p className="font-medium">{row.game_code || "-"}</p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs">
                          {isBn ? "লাভ/ক্ষতি" : "Profit/Loss"}
                        </p>
                        <p
                          className={`font-medium ${
                            pl >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {pl >= 0 ? "+" : "-"}৳{money(Math.abs(pl))}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t">
                <p className="text-sm text-gray-600">
                  {isBn
                    ? `দেখানো হচ্ছে ${
                        (pagination.page - 1) * pagination.limit + 1
                      } - ${Math.min(
                        pagination.page * pagination.limit,
                        pagination.total,
                      )} এর মধ্যে ${pagination.total}`
                    : `Showing ${
                        (pagination.page - 1) * pagination.limit + 1
                      } - ${Math.min(
                        pagination.page * pagination.limit,
                        pagination.total,
                      )} of ${pagination.total}`}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition"
                  >
                    {isBn ? "আগে" : "Prev"}
                  </button>

                  <div className="flex gap-1">
                    {Array.from(
                      { length: pagination.totalPages },
                      (_, i) => i + 1,
                    )
                      .slice(
                        Math.max(0, currentPage - 3),
                        Math.min(pagination.totalPages, currentPage + 2),
                      )
                      .map((page) => (
                        <button
                          key={page}
                          onClick={() => paginate(page)}
                          className={`px-3 py-2 rounded text-sm font-medium ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 hover:bg-gray-200"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                  </div>

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition"
                  >
                    {isBn ? "পরে" : "Next"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BattingRecord;
