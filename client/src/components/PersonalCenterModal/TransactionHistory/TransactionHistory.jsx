import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "@/Context/AuthContext";
import axios from "axios";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const TransactionHistory = () => {
  const { language, userId } = useContext(AuthContext);

  // 0: Auto Deposit, 1: Withdraw, 2: Manual Deposit
  const [activeMainTab, setActiveMainTab] = useState(0);

  const [depositHistory, setDepositHistory] = useState([]);
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [autoDepositHistory, setAutoDepositHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const API_URL = import.meta.env.VITE_API_URL;
  const isBn = language === "bn";

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchManualDeposits = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/deposit/deposit-transaction`,
        );

        let allDeposits = [];
        if (Array.isArray(res.data)) allDeposits = res.data;
        else if (res.data?.deposits) allDeposits = res.data.deposits;
        else if (res.data?.data) allDeposits = res.data.data;

        const userDeposits = allDeposits.filter((d) => {
          const itemUserId = d.userId?._id || d.userId?.$oid || d.userId;
          return itemUserId === userId;
        });

        userDeposits.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );

        setDepositHistory(userDeposits);
      } catch (err) {
        console.error("Deposit fetch error:", err);
        setDepositHistory([]);
      }
    };

    const fetchWithdraws = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/withdraw-transaction`);

        let allWithdraws = [];
        if (Array.isArray(res.data)) allWithdraws = res.data;
        else if (res.data?.withdraws) allWithdraws = res.data.withdraws;
        else if (res.data?.data) allWithdraws = res.data.data;

        const userWithdraws = allWithdraws.filter((w) => {
          const itemUserId = w.userId?._id || w.userId?.$oid || w.userId;
          return itemUserId === userId;
        });

        userWithdraws.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );

        setWithdrawHistory(userWithdraws);
      } catch (err) {
        console.error("Withdraw fetch error:", err);
        setWithdrawHistory([]);
      }
    };

    const fetchAutoDeposits = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/oraclepay-business/wallet-agent-history/${userId}`,
        );

        const list = res?.data?.data || [];

        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setAutoDepositHistory(list);
      } catch (err) {
        console.error("Auto deposit fetch error:", err);
        setAutoDepositHistory([]);
      }
    };

    const loadAll = async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchAutoDeposits(),
          fetchWithdraws(),
          fetchManualDeposits(),
        ]);
      } catch (err) {
        setError(
          isBn
            ? "লেনদেনের ইতিহাস লোড করতে সমস্যা হয়েছে"
            : "Failed to load transaction history",
        );
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [userId, API_URL, isBn]);

  const tabs = [
    { title: { en: "Auto Deposit History", bn: "অটো ডিপোজিট ইতিহাস" } },
    { title: { en: "Withdraw History", bn: "উত্তোলন ইতিহাস" } },
    { title: { en: "Deposit History", bn: "ডিপোজিট ইতিহাস" } },
  ];

  const currentHistory =
    activeMainTab === 0
      ? autoDepositHistory
      : activeMainTab === 1
        ? withdrawHistory
        : depositHistory;

  const getItemDateForFilter = (item) => {
    const dt =
      activeMainTab === 0 ? item.paidAt || item.createdAt : item.createdAt;
    if (!dt) return "";
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  const filteredHistory = currentHistory.filter((item) => {
    if (!dateFilter) return true;
    return getItemDateForFilter(item) === dateFilter;
  });

  const totalItems = filteredHistory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);

  const tableHeadersManual = [
    { en: "Date & Time", bn: "তারিখ ও সময়" },
    { en: "Method", bn: "পদ্ধতি" },
    { en: "Amount", bn: "পরিমাণ" },
    { en: "Transaction ID / Number", bn: "ট্রানজেকশন আইডি / নম্বর" },
    { en: "Status", bn: "স্ট্যাটাস" },
  ];

  const tableHeadersAuto = [
    { en: "Date & Time", bn: "তারিখ ও সময়" },
    { en: "Amount", bn: "পরিমাণ" },
    { en: "Invoice", bn: "ইনভয়েস" },
    { en: "Trx ID", bn: "ট্রানজেকশন আইডি" },
    { en: "Bank", bn: "ব্যাংক" },
    { en: "Status", bn: "স্ট্যাটাস" },
    { en: "Footprint", bn: "ফুটপ্রিন্ট" },
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

  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();

    if (s === "completed" || s === "paid" || s === "success") {
      return "text-green-600 bg-green-100";
    }

    if (s === "pending") return "text-yellow-600 bg-yellow-100";

    return "text-red-600 bg-red-100";
  };

  const getManualTransactionInfo = (item) => {
    if (activeMainTab === 2) {
      const txn = item.userInputs?.find(
        (i) =>
          i.name?.toLowerCase().includes("transaction") ||
          i.label?.toLowerCase().includes("transaction"),
      );

      const agentWallet = item.paymentMethod?.agentWalletNumber;

      return `${txn?.value || "-"} ${agentWallet ? `/ ${agentWallet}` : ""}`;
    }

    const number = item.userInputs?.find((i) => i.type === "number");
    return number?.value ? `------------- / ${number.value}` : "-";
  };

  const getManualStatusLabel = (status) => {
    const s = String(status || "").toLowerCase();

    if (s === "completed" || s === "success") {
      return isBn ? "সফল" : "Success";
    }

    if (s === "pending") return isBn ? "পেন্ডিং" : "Pending";

    return isBn ? "বাতিল" : "Rejected";
  };

  const getAutoStatusLabel = (status) => {
    const s = String(status || "").toUpperCase();

    if (s === "PAID" || s === "COMPLETED" || s === "SUCCESS") {
      return isBn ? "সফল" : "Paid";
    }

    if (s === "PENDING") return isBn ? "পেন্ডিং" : "Pending";

    return isBn ? "ব্যর্থ" : "Failed";
  };

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleTabChange = (index) => {
    setActiveMainTab(index);
    setCurrentPage(1);
    setDateFilter("");
  };

  return (
    <div className="p-4 space-y-6 bg-gray-50 min-h-screen md:min-h-0 overflow-y-auto max-h-[calc(100vh-320px)] pb-28 lg:pb-6 [scrollbar-width:none]">
      <div className="flex gap-8 overflow-x-auto border-b pb-3 bg-[#063A49] text-white rounded-t-lg">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => handleTabChange(i)}
            className={`pb-3 px-4 font-medium whitespace-nowrap transition-colors ${
              i === activeMainTab
                ? "border-b-4 border-blue-500 text-white"
                : "text-yellow-300 hover:text-white"
            }`}
          >
            {isBn ? tab.title.bn : tab.title.en}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:border-blue-600"
        />

        <button
          onClick={() => setCurrentPage(1)}
          className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
        >
          {isBn ? "খুঁজুন" : "Search"}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="font-medium text-gray-700">
            {isBn
              ? `মোট: ${filteredHistory.length} টি`
              : `Total: ${filteredHistory.length} records`}
          </p>

          <p className="text-sm text-gray-600">
            {isBn
              ? `পেজ ${currentPage} / ${totalPages || 1}`
              : `Page ${currentPage} of ${totalPages || 1}`}
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <Skeleton height={24} count={5} />
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-600">{error}</div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {isBn ? "কোন লেনদেন পাওয়া যায়নি" : "No transactions found"}
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-[#063A49] text-white">
                  <tr>
                    {(activeMainTab === 0
                      ? tableHeadersAuto
                      : tableHeadersManual
                    ).map((h, i) => (
                      <th key={i} className="text-left p-4 text-sm font-medium">
                        {isBn ? h.bn : h.en}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {currentItems.map((item, i) => {
                    if (activeMainTab === 0) {
                      const dt = item.paidAt || item.createdAt;
                      const st = String(item.status || "");
                      const footprint = item.footprint || "";

                      return (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-4 text-sm">{formatDateTime(dt)}</td>

                          <td className="p-4 text-sm font-medium">
                            ৳{money(item.amount)}
                          </td>

                          <td className="p-4 text-sm">
                            {item.invoiceNumber || "-"}
                          </td>

                          <td className="p-4 text-sm">
                            {item.transactionId || "-"}
                          </td>

                          <td className="p-4 text-sm">{item.bank || "-"}</td>

                          <td className="p-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                st,
                              )}`}
                            >
                              {getAutoStatusLabel(st)}
                            </span>
                          </td>

                          <td className="p-4">
                            {footprint ? (
                              <button
                                onClick={() => window.open(footprint, "_blank")}
                                className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                              >
                                {isBn ? "দেখুন" : "View"}
                              </button>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="p-4 text-sm">
                          {formatDateTime(item.createdAt)}
                        </td>

                        <td className="p-4 text-sm">
                          {item.paymentMethod?.methodNameBD ||
                            item.paymentMethod?.methodName ||
                            "-"}
                        </td>

                        <td className="p-4 text-sm font-medium">
                          ৳{money(item.amount)}
                        </td>

                        <td className="p-4 text-sm break-all">
                          {getManualTransactionInfo(item)}
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              item.status,
                            )}`}
                          >
                            {getManualStatusLabel(item.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-4 p-4">
              {currentItems.map((item, i) => {
                if (activeMainTab === 0) {
                  const dt = item.paidAt || item.createdAt;
                  const st = String(item.status || "");
                  const footprint = item.footprint || "";

                  return (
                    <div
                      key={i}
                      className="border rounded-lg p-4 bg-white shadow-sm"
                    >
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">
                            {isBn ? "তারিখ ও সময়" : "Date & Time"}
                          </p>
                          <p className="font-medium">{formatDateTime(dt)}</p>
                        </div>

                        <div>
                          <p className="text-gray-500 text-xs">
                            {isBn ? "পরিমাণ" : "Amount"}
                          </p>
                          <p className="font-medium">৳{money(item.amount)}</p>
                        </div>

                        <div>
                          <p className="text-gray-500 text-xs">
                            {isBn ? "ইনভয়েস" : "Invoice"}
                          </p>
                          <p className="font-medium break-all">
                            {item.invoiceNumber || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500 text-xs">
                            {isBn ? "ট্রানজেকশন আইডি" : "Trx ID"}
                          </p>
                          <p className="font-medium break-all">
                            {item.transactionId || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500 text-xs">
                            {isBn ? "ব্যাংক" : "Bank"}
                          </p>
                          <p className="font-medium">{item.bank || "-"}</p>
                        </div>

                        <div>
                          <p className="text-gray-500 text-xs">
                            {isBn ? "স্ট্যাটাস" : "Status"}
                          </p>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              st,
                            )}`}
                          >
                            {getAutoStatusLabel(st)}
                          </span>
                        </div>

                        <div>
                          <p className="text-gray-500 text-xs">
                            {isBn ? "ফুটপ্রিন্ট" : "Footprint"}
                          </p>

                          {footprint ? (
                            <button
                              onClick={() => window.open(footprint, "_blank")}
                              className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                            >
                              {isBn ? "দেখুন" : "View"}
                            </button>
                          ) : (
                            <p className="font-medium">-</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className="border rounded-lg p-4 bg-white shadow-sm"
                  >
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">
                          {isBn ? "তারিখ ও সময়" : "Date & Time"}
                        </p>
                        <p className="font-medium">
                          {formatDateTime(item.createdAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs">
                          {isBn ? "পদ্ধতি" : "Method"}
                        </p>
                        <p className="font-medium">
                          {item.paymentMethod?.methodNameBD ||
                            item.paymentMethod?.methodName ||
                            "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs">
                          {isBn ? "পরিমাণ" : "Amount"}
                        </p>
                        <p className="font-medium">৳{money(item.amount)}</p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs">
                          {isBn
                            ? "ট্রানজেকশন আইডি / নম্বর"
                            : "Transaction ID / Number"}
                        </p>
                        <p className="font-medium break-all">
                          {getManualTransactionInfo(item)}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs">
                          {isBn ? "স্ট্যাটাস" : "Status"}
                        </p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            item.status,
                          )}`}
                        >
                          {getManualStatusLabel(item.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t pb-8 lg:pb-4">
                <p className="text-sm text-gray-600 text-center sm:text-left">
                  {isBn
                    ? `দেখানো হচ্ছে ${indexOfFirstItem + 1} - ${Math.min(
                        indexOfLastItem,
                        totalItems,
                      )} এর মধ্যে ${totalItems}`
                    : `Showing ${indexOfFirstItem + 1} - ${Math.min(
                        indexOfLastItem,
                        totalItems,
                      )} of ${totalItems}`}
                </p>

                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition"
                  >
                    {isBn ? "আগে" : "Prev"}
                  </button>

                  <div className="flex gap-1 flex-wrap justify-center">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .slice(
                        Math.max(0, currentPage - 3),
                        Math.min(totalPages, currentPage + 2),
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
                    disabled={currentPage === totalPages}
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

export default TransactionHistory;
