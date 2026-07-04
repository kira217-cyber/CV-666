import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Gift,
  RefreshCw,
  Clock,
  CheckCircle,
  History,
} from "lucide-react";
import { toast } from "react-toastify";
import { AuthContext } from "@/Context/AuthContext";
import DailyModalHistory from "../DailyModalHistory/DailyModalHistory";


const API_BASE = import.meta.env.VITE_API_URL;

const DailyBonusModal = ({ open = false, onClose }) => {
  const { language, refreshBalance } = useContext(AuthContext);

  const isBangla = language === "bn";

  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const text = {
    title: isBangla ? "ডেইলি বোনাস" : "Daily Bonus",
    subtitle: isBangla
      ? "আপনার ডেইলি বোনাস ক্লেইম করুন"
      : "Claim your daily bonus",
    history: isBangla ? "ক্লেইম হিস্টোরি" : "Claim History",
    amount: isBangla ? "বোনাস এমাউন্ট" : "Bonus Amount",
    period: isBangla ? "পিরিয়ড" : "Period",
    nextClaim: isBangla ? "পরবর্তী ক্লেইম" : "Next Claim",
    claimNow: isBangla ? "ক্লেইম করুন" : "Claim Now",
    claimedWait: isBangla ? "সময় হয়নি" : "Not Ready",
    noDeposit: isBangla
      ? "বোনাস ক্লেইম করতে অন্তত একবার ডিপোজিট করতে হবে"
      : "You need at least one successful deposit to claim bonus",
    noBonus: isBangla ? "কোনো বোনাস পাওয়া যায়নি" : "No bonus found",
    loading: isBangla ? "লোড হচ্ছে..." : "Loading...",
    day: isBangla ? "দিন" : "Days",
  };

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("user_token") ||
    localStorage.getItem("authToken");

  const fetchBonuses = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${API_BASE}/api/daily-bonus/user/available`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setBonuses(res?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Daily bonus load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchBonuses();
    }
  }, [open]);

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

  const handleClaim = async (settingId) => {
    try {
      setClaimingId(settingId);

      const res = await axios.post(
        `${API_BASE}/api/daily-bonus/user/claim/${settingId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success(
        res?.data?.message ||
          (isBangla
            ? "ডেইলি বোনাস সফলভাবে ক্লেইম হয়েছে"
            : "Daily bonus claimed successfully"),
      );

      await fetchBonuses();

      if (refreshBalance) {
        refreshBalance();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Daily bonus claim failed");
    } finally {
      setClaimingId(null);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[10000] bg-black/60 flex justify-center sm:items-center">
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
              onClick={fetchBonuses}
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <RefreshCw size={21} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="h-[calc(100%-58px)] overflow-y-auto pb-6">
            <div className="px-3 pt-3">
              <div className="rounded-[18px] bg-gradient-to-br from-[#fff7e7] via-[#fffdf8] to-[#efe3c8] border border-white shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#fff3d9] flex items-center justify-center shadow">
                    <Gift size={28} className="text-[#d6b76c]" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-[#333]">
                      {text.title}
                    </h3>
                    <p className="text-sm text-[#777] mt-1">{text.subtitle}</p>
                  </div>
                </div>

                <button
                  onClick={() => setHistoryOpen(true)}
                  type="button"
                  className="mt-5 w-full h-11 rounded-full bg-gradient-to-r from-[#2f2928] to-[#4a403d] text-white font-semibold flex items-center justify-center gap-2"
                >
                  <History size={18} />
                  {text.history}
                </button>
              </div>
            </div>

            <div className="px-3 mt-4 space-y-3">
              {loading ? (
                <div className="bg-white rounded-2xl p-8 text-center text-[#777] shadow-sm">
                  <RefreshCw className="animate-spin mx-auto mb-3" size={26} />
                  {text.loading}
                </div>
              ) : bonuses.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-[#777] shadow-sm">
                  {text.noBonus}
                </div>
              ) : (
                bonuses.map((item) => {
                  const setting = item?.setting || {};
                  const title =
                    setting?.title?.[language] ||
                    setting?.title?.en ||
                    setting?.title?.bn ||
                    text.title;

                  const canClaim = Boolean(item?.canClaim);
                  const depositEligible = Boolean(item?.depositEligible);

                  return (
                    <div
                      key={setting?._id}
                      className="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-[17px] font-bold text-[#333]">
                              {title}
                            </h4>

                            <p className="text-sm text-[#777] mt-1">
                              {text.period}: {setting?.periodDays || 1}{" "}
                              {text.day}
                            </p>
                          </div>

                          <div className="px-3 py-1 rounded-full bg-[#fff3d9] text-[#b89132] font-bold text-sm">
                            ৳ {Number(item?.claimAmount || 0).toFixed(2)}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-[#666]">
                            <Clock size={16} className="text-[#d6b76c]" />
                            <span>
                              {text.nextClaim}: {formatDate(item?.nextClaimAt)}
                            </span>
                          </div>

                          {!depositEligible && (
                            <div className="text-red-500 text-sm font-medium">
                              {text.noDeposit}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={!canClaim || claimingId === setting?._id}
                          onClick={() => handleClaim(setting?._id)}
                          className={`mt-4 w-full h-11 rounded-full font-bold flex items-center justify-center gap-2 ${
                            canClaim
                              ? "bg-gradient-to-r from-[#f2c56b] to-[#d6a946] text-white shadow"
                              : "bg-[#e5e5e5] text-[#999]"
                          }`}
                        >
                          {claimingId === setting?._id ? (
                            <>
                              <RefreshCw size={18} className="animate-spin" />
                              {isBangla ? "ক্লেইম হচ্ছে..." : "Claiming..."}
                            </>
                          ) : canClaim ? (
                            <>
                              <CheckCircle size={18} />
                              {text.claimNow}
                            </>
                          ) : (
                            <>
                              <Clock size={18} />
                              {text.claimedWait}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <DailyModalHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
};

export default DailyBonusModal;
