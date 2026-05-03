import { useEffect, useMemo, useState, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "@/Context/AuthContext";

const AutoDeposit = () => {
  const { userId, user, language } = useContext(AuthContext);

  const [oraclePayEnabled, setOraclePayEnabled] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [minAmount, setMinAmount] = useState(5);
  const [maxAmount, setMaxAmount] = useState(0);
  const [bonuses, setBonuses] = useState([]);
  const [selectedBonusId, setSelectedBonusId] = useState("");

  const [selectedAmount, setSelectedAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("100");
  const [processing, setProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const amounts = useMemo(
    () => [100, 200, 500, 1000, 3000, 5000, 10000, 25000],
    [],
  );

  const checkImage = "https://i.ibb.co.com/6c7zBpFc/deposit.png";
  const isBn = language === "bn";

  const clampNumber = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    return Math.floor(n);
  };

  const money = (value) => {
    const n = Number(value || 0);
    return `৳${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  useEffect(() => {
    const fetchOraclePayStatus = async () => {
      try {
        setLoadingStatus(true);

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/oraclepay-business/status`,
        );

        const data = res?.data?.data || {};

        setOraclePayEnabled(!!data.enabled);
        setMinAmount(clampNumber(data.minAmount || 5));
        setMaxAmount(clampNumber(data.maxAmount || 0));
        setBonuses(Array.isArray(data.bonuses) ? data.bonuses : []);
      } catch {
        setOraclePayEnabled(false);
        setBonuses([]);
      } finally {
        setLoadingStatus(false);
      }
    };

    fetchOraclePayStatus();
  }, []);

  const amountNumber = clampNumber(customAmount || selectedAmount);

  const selectedBonus = useMemo(() => {
    if (!selectedBonusId) return null;
    return (
      bonuses.find((b) => String(b._id) === String(selectedBonusId)) || null
    );
  }, [bonuses, selectedBonusId]);

  const bonusSummary = useMemo(() => {
    const amount = amountNumber;

    if (!selectedBonus || !amount) {
      return {
        bonusAmount: 0,
        totalCredited: amount,
        turnoverMultiplier: 0,
        requiredTurnover: 0,
      };
    }

    const bonusType =
      selectedBonus?.bonusType === "percent" ? "percent" : "fixed";

    const bonusValue = Number(selectedBonus?.bonusValue || 0);
    const turnoverMultiplier = Number(selectedBonus?.turnoverMultiplier || 0);

    const bonusAmount =
      bonusType === "percent" ? (amount * bonusValue) / 100 : bonusValue;

    const totalCredited = amount + bonusAmount;
    const requiredTurnover = totalCredited * turnoverMultiplier;

    return {
      bonusAmount,
      totalCredited,
      turnoverMultiplier,
      requiredTurnover,
    };
  }, [amountNumber, selectedBonus]);

  const handleAmountChange = (a) => {
    setSelectedAmount(a);
    setCustomAmount(String(a));
  };

  const handleCustomAmountChange = (e) => {
    const v = e.target.value.replace(/[^\d]/g, "");
    setCustomAmount(v);
    setSelectedAmount(clampNumber(v) || 0);
  };

  const validateDeposit = () => {
    if (!oraclePayEnabled) {
      toast.error(
        isBn ? "Auto Deposit এখন Available নেই" : "Auto Deposit is disabled",
      );
      return false;
    }

    if (!amountNumber || amountNumber < minAmount) {
      toast.error(
        isBn ? `Minimum amount ${minAmount}` : `Minimum amount is ${minAmount}`,
      );
      return false;
    }

    if (maxAmount > 0 && amountNumber > maxAmount) {
      toast.error(
        isBn ? `Maximum amount ${maxAmount}` : `Maximum amount is ${maxAmount}`,
      );
      return false;
    }

    if (!userId) {
      toast.error(
        isBn ? "Please login again" : "User not found. Please login again.",
      );
      return false;
    }

    return true;
  };

  const openConfirmModal = () => {
    if (!validateDeposit()) return;
    setShowConfirm(true);
  };

  const handleConfirmDeposit = async () => {
    try {
      setProcessing(true);

      const invoiceNumber = `DEP-${userId}-${Date.now()}`;

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/oraclepay-business/create`,
        {
          amount: amountNumber,
          userIdentity: userId,
          invoiceNumber,
          bonusId: selectedBonusId || "",
          checkoutItems: {
            type: "deposit",
            method: "auto",
            gateway: "oraclepay",
            username: user?.username || "",
            selected_bonus_id: selectedBonusId || "",
            selected_bonus_title_bn: selectedBonus?.title?.bn || "",
            selected_bonus_title_en: selectedBonus?.title?.en || "",
          },
        },
      );

      if (res.data?.success && res.data?.payment_page_url) {
        window.location.href = res.data.payment_page_url;
        return;
      }

      toast.error(res.data?.message || "Payment link create failed");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Payment link create failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="p-3 md:p-6">
        <div className="bg-white border rounded-xl p-6 text-center font-bold text-gray-600">
          Loading...
        </div>
      </div>
    );
  }

  if (!oraclePayEnabled) {
    return (
      <div className="p-3 md:p-6 min-h-screen md:min-h-0">
        <div className="bg-white border rounded-xl p-6 text-center">
          <h2 className="text-lg md:text-xl font-extrabold text-gray-900">
            Auto Deposit
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isBn
              ? "এই মুহূর্তে Auto Deposit বন্ধ আছে। পরে চেষ্টা করুন।"
              : "Auto Deposit is currently disabled. Please try later."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 min-h-screen md:min-h-0 md:px-6 md:py-6 w-full">
      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-white border rounded-2xl shadow-sm p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#145252] rounded-lg p-4">
            <div>
              <h2 className="text-lg md:text-2xl font-extrabold text-white">
                Auto Deposit
              </h2>
              <p className="text-xs md:text-sm text-white mt-1">
                {isBn
                  ? "পরিমাণ সিলেক্ট করুন অথবা নিজের মতো টাইপ করুন"
                  : "Select amount or type your own amount"}
              </p>
            </div>

            <div className="sm:text-right">
              <div className="text-xs text-white">User</div>
              <div className="font-extrabold text-white text-base md:text-lg">
                {user?.username || "User"}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-bold text-gray-700 mb-2">
              {isBn ? "ডিপোজিট পরিমাণ" : "Deposit Amount"}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {amounts.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => handleAmountChange(a)}
                  className={`relative px-4 py-2 rounded-lg border-2 font-bold transition-all cursor-pointer ${
                    amountNumber === a
                      ? "border-[#d60000] bg-[#d60000] text-white shadow-lg"
                      : "border-gray-300 bg-white text-black hover:border-gray-500"
                  }`}
                >
                  ৳{a}
                  {amountNumber === a && (
                    <div className="absolute -bottom-1 -right-1">
                      <img src={checkImage} alt="selected" className="w-6" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="w-full">
                <label className="text-xs font-bold text-gray-600">
                  {isBn ? "কাস্টম পরিমাণ (নিজে লিখুন)" : "Custom amount (type)"}
                </label>

                <div className="mt-2 flex items-center gap-2">
                  <div className="px-3 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 font-extrabold">
                    ৳
                  </div>

                  <input
                    inputMode="numeric"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder={isBn ? "যেমন: 250" : "e.g. 250"}
                    className="w-full border-2 border-gray-300 p-3 rounded-lg font-bold text-lg outline-none focus:border-black"
                  />
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  {isBn
                    ? `শুধু সংখ্যা লিখুন। Minimum ${minAmount}.`
                    : `Numbers only. Minimum ${minAmount}.`}
                  {maxAmount > 0 ? ` Maximum ${maxAmount}.` : ""}
                </div>
              </div>

              <div className="w-full">
                <label className="text-xs font-bold text-gray-600">
                  {isBn ? "সিলেক্টেড পরিমাণ" : "Selected Amount"}
                </label>
                <input
                  type="text"
                  readOnly
                  value={`৳${amountNumber || 0}`}
                  className="mt-2 w-full border-2 border-gray-300 p-4 rounded-lg text-center font-extrabold text-2xl bg-gray-50"
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-sm font-bold text-gray-700">
              {isBn ? "ডিপোজিট বোনাস সিলেক্ট করুন" : "Select Deposit Bonus"}
            </label>

            <select
              value={selectedBonusId}
              onChange={(e) => setSelectedBonusId(e.target.value)}
              className="mt-2 w-full border-2 border-gray-300 p-3 rounded-lg font-bold outline-none focus:border-black bg-white"
            >
              <option value="">{isBn ? "কোনো বোনাস নয়" : "No Bonus"}</option>

              {bonuses.map((bonus) => (
                <option key={bonus._id} value={bonus._id}>
                  {isBn
                    ? bonus?.title?.bn || bonus?.title?.en
                    : bonus?.title?.en || bonus?.title?.bn}{" "}
                  -{" "}
                  {bonus?.bonusType === "percent"
                    ? `${bonus?.bonusValue || 0}%`
                    : money(bonus?.bonusValue || 0)}{" "}
                  | Turnover {bonus?.turnoverMultiplier || 0}x
                </option>
              ))}
            </select>

            {bonuses.length === 0 && (
              <p className="mt-2 text-xs text-red-500 font-bold">
                {isBn
                  ? "Bonus list empty. Backend /status route update করা লাগবে।"
                  : "Bonus list empty. Backend /status route needs update."}
              </p>
            )}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={openConfirmModal}
              disabled={processing}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-white border-2 border-black font-extrabold text-xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              style={{ minWidth: "220px", backgroundColor: "#145252" }}
            >
              {isBn ? "Deposit Now" : "Deposit Now"}
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-600 text-center">
            {isBn
              ? "Deposit Now এ ক্লিক করলে আগে summary দেখাবে।"
              : "Click Deposit Now to review the summary first."}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#145252] p-4">
              <h3 className="text-white text-xl font-extrabold">
                {isBn ? "ডিপোজিট কনফার্ম করুন" : "Confirm Deposit"}
              </h3>
              <p className="text-white/80 text-xs mt-1">
                {isBn
                  ? "নিচের তথ্যগুলো দেখে Confirm করুন।"
                  : "Review the details below before confirming."}
              </p>
            </div>

            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-600">
                  {isBn ? "ডিপোজিট এমাউন্ট" : "Deposit Amount"}
                </span>
                <b>{money(amountNumber)}</b>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-gray-600">
                  {isBn ? "বোনাস" : "Bonus"}
                </span>
                <b className="text-green-700">
                  {money(bonusSummary.bonusAmount)}
                </b>
              </div>

              <div className="flex justify-between gap-3 border-t pt-3">
                <span className="text-gray-800 font-bold">
                  {isBn ? "মোট ব্যালেন্সে যোগ হবে" : "Total Credited"}
                </span>
                <b className="text-[#145252] text-lg">
                  {money(bonusSummary.totalCredited)}
                </b>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-gray-600">
                  {isBn ? "টার্নওভার" : "Turnover"}
                </span>
                <b>{bonusSummary.turnoverMultiplier}x</b>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-gray-600">
                  {isBn ? "রিকোয়ার্ড টার্নওভার" : "Required Turnover"}
                </span>
                <b className="text-red-700">
                  {money(bonusSummary.requiredTurnover)}
                </b>
              </div>

              <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs">
                {selectedBonus ? (
                  <b className="text-green-700">
                    {isBn
                      ? `Selected Bonus: ${selectedBonus?.title?.bn || selectedBonus?.title?.en}`
                      : `Selected Bonus: ${selectedBonus?.title?.en || selectedBonus?.title?.bn}`}
                  </b>
                ) : (
                  <span className="text-gray-600">
                    {isBn
                      ? "কোনো বোনাস সিলেক্ট করা হয়নি।"
                      : "No bonus selected."}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={processing}
                className="w-full py-3 rounded-xl border font-extrabold bg-white hover:bg-gray-100 disabled:opacity-60"
              >
                {isBn ? "Cancel" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={handleConfirmDeposit}
                disabled={processing}
                className="w-full py-3 rounded-xl font-extrabold text-white disabled:opacity-60"
                style={{ backgroundColor: "#145252" }}
              >
                {processing
                  ? isBn
                    ? "Processing..."
                    : "Processing..."
                  : isBn
                    ? "Confirm"
                    : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoDeposit;
