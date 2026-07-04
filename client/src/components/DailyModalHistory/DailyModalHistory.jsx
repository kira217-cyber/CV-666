import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  RefreshCw,
  History,
  CalendarDays,
  Gift,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";
import { AuthContext } from "@/Context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL;

const DailyModalHistory = ({ open = false, onClose }) => {
  const { language } = useContext(AuthContext);

  const isBangla = language === "bn";

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const text = {
    title: isBangla ? "ডেইলি বোনাস হিস্টোরি" : "Daily Bonus History",
    noHistory: isBangla ? "কোনো হিস্টোরি পাওয়া যায়নি" : "No history found",
    loading: isBangla ? "লোড হচ্ছে..." : "Loading...",
    amount: isBangla ? "এমাউন্ট" : "Amount",
    period: isBangla ? "পিরিয়ড" : "Period",
    claimedAt: isBangla ? "ক্লেইম সময়" : "Claimed At",
    status: isBangla ? "স্ট্যাটাস" : "Status",
    claimed: isBangla ? "ক্লেইম হয়েছে" : "Claimed",
    cancelled: isBangla ? "বাতিল" : "Cancelled",
    prev: isBangla ? "আগের" : "Prev",
    next: isBangla ? "পরের" : "Next",
    page: isBangla ? "পৃষ্ঠা" : "Page",
    total: isBangla ? "মোট" : "Total",
    day: isBangla ? "দিন" : "Days",
  };

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("user_token") ||
    localStorage.getItem("authToken");

  const fetchHistory = async (targetPage = page) => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_BASE}/api/daily-bonus/user/history`, {
        params: {
          page: targetPage,
          limit: 10,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setHistory(res?.data?.data || []);

      setPagination(
        res?.data?.pagination || {
          page: targetPage,
          limit: 10,
          total: 0,
          totalPages: 1,
        },
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Daily bonus history load failed",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHistory(page);
    }
  }, [open, page]);

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString(isBangla ? "bn-BD" : "en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTitle = (item) => {
    return (
      item?.settingTitle?.[language] ||
      item?.settingTitle?.en ||
      item?.settingTitle?.bn ||
      item?.setting?.title?.[language] ||
      item?.setting?.title?.en ||
      item?.setting?.title?.bn ||
      (isBangla ? "ডেইলি বোনাস" : "Daily Bonus")
    );
  };

  const handlePrev = () => {
    if (page <= 1) return;
    setPage((prev) => prev - 1);
  };

  const handleNext = () => {
    if (page >= pagination.totalPages) return;
    setPage((prev) => prev + 1);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10001] bg-black/60 flex justify-center sm:items-center">
      <div className="w-full sm:max-w-[430px] h-screen sm:h-[92vh] bg-[#f7f7f7] sm:rounded-2xl overflow-hidden shadow-2xl">
        <div className="relative h-[58px] bg-gradient-to-r from-[#2f2928] to-[#4a403d] flex items-center justify-center text-white">
          <button
            onClick={onClose}
            className="absolute left-4 top-1/2 -translate-y-1/2"
            type="button"
          >
            <ArrowLeft size={28} />
          </button>

          <h2 className="text-lg font-semibold">{text.title}</h2>

          <button
            onClick={() => fetchHistory(page)}
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <RefreshCw size={21} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="h-[calc(100%-58px)] overflow-y-auto pb-24">
          <div className="px-3 pt-3">
            <div className="rounded-[18px] bg-gradient-to-br from-[#fff7e7] via-[#fffdf8] to-[#efe3c8] border border-white shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-[#fff3d9] flex items-center justify-center shadow">
                  <History size={28} className="text-[#d6b76c]" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#333]">
                    {text.title}
                  </h3>
                  <p className="text-sm text-[#777] mt-1">
                    {text.total}: {pagination.total}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-3 mt-4 space-y-3">
            {loading ? (
              <div className="bg-white rounded-2xl p-8 text-center text-[#777] shadow-sm">
                <RefreshCw className="animate-spin mx-auto mb-3" size={26} />
                {text.loading}
              </div>
            ) : history.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-[#777] shadow-sm">
                {text.noHistory}
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-full bg-[#fff3d9] flex items-center justify-center shrink-0">
                          <Gift size={20} className="text-[#d6b76c]" />
                        </div>

                        <div>
                          <h4 className="text-[16px] font-bold text-[#333]">
                            {getTitle(item)}
                          </h4>

                          <p className="text-xs text-[#777] mt-1">
                            {text.period}: {item?.periodDays || 1} {text.day}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[#b89132] font-bold text-[15px]">
                          ৳ {Number(item?.claimAmount || 0).toFixed(2)}
                        </div>

                        <span
                          className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            item?.status === "cancelled"
                              ? "bg-red-100 text-red-600"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {item?.status === "cancelled"
                            ? text.cancelled
                            : text.claimed}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-[#666]">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={15} className="text-[#d6b76c]" />
                        <span>
                          {text.claimedAt}: {formatDate(item?.claimedAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CalendarDays size={15} className="text-[#d6b76c]" />
                        <span>
                          {formatDate(item?.periodStart)} -{" "}
                          {formatDate(item?.periodEnd)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#e5e5e5] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={handlePrev}
              className={`h-10 px-4 rounded-full flex items-center gap-1 text-sm font-semibold ${
                page <= 1 || loading
                  ? "bg-[#eeeeee] text-[#aaa]"
                  : "bg-[#2f2928] text-white"
              }`}
            >
              <ChevronLeft size={17} />
              {text.prev}
            </button>

            <div className="text-sm text-[#777] font-semibold">
              {text.page} {pagination.page} / {pagination.totalPages || 1}
            </div>

            <button
              type="button"
              disabled={page >= pagination.totalPages || loading}
              onClick={handleNext}
              className={`h-10 px-4 rounded-full flex items-center gap-1 text-sm font-semibold ${
                page >= pagination.totalPages || loading
                  ? "bg-[#eeeeee] text-[#aaa]"
                  : "bg-[#2f2928] text-white"
              }`}
            >
              {text.next}
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyModalHistory;
